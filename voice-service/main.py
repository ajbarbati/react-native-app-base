"""
Moonshine STT/TTS HTTP service for the Nest voice orchestrator.

Endpoints:
  GET  /health
  POST /v1/stt   multipart: audio (WAV), optional language
  POST /v1/tts   JSON: { text, language?, voice? }
"""

from __future__ import annotations

import base64
import logging
import os
import tempfile
import threading
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from audio_wav import float32_pcm_to_wav_bytes

logger = logging.getLogger("voice-service")

_lock = threading.Lock()
_state: dict = {
    "ready": False,
    "skip_load": False,
    "load_error": None,
    "transcriber": None,
    "tts": None,
    "tts_language": "en-us",
}


def _env_bool(name: str, default: bool = False) -> bool:
    v = os.environ.get(name)
    if v is None:
        return default
    return v.strip().lower() in ("1", "true", "yes", "on")


def _load_moonshine() -> None:
    global _state
    if _state["skip_load"]:
        _state["ready"] = False
        _state["load_error"] = "MOONSHINE_SKIP_LOAD is set"
        logger.warning("Moonshine load skipped (MOONSHINE_SKIP_LOAD)")
        return

    try:
        from moonshine_voice import (  # type: ignore[import-not-found]
            ModelArch,
            TextToSpeech,
            Transcriber,
            get_model_for_language,
            load_wav_file,
            string_to_model_arch,
        )
    except ImportError as e:
        _state["ready"] = False
        _state["load_error"] = f"moonshine_voice import failed: {e}"
        logger.exception("Failed to import moonshine_voice")
        return

    model_path = os.environ.get("MOONSHINE_MODEL_PATH", "").strip()
    arch_str = os.environ.get("MOONSHINE_MODEL_ARCH", "").strip()
    language = os.environ.get("MOONSHINE_STT_LANGUAGE", "en").strip()
    arch_default = os.environ.get("MOONSHINE_STT_MODEL_ARCH", "tiny").strip()

    try:
        if model_path:
            if not arch_str:
                raise ValueError(
                    "MOONSHINE_MODEL_ARCH is required when MOONSHINE_MODEL_PATH is set "
                    "(integer: 0=tiny, 1=base, 2=tiny-streaming, ...)"
                )
            model_arch = ModelArch(int(arch_str))
            resolved_path = model_path
        else:
            wanted_arch = string_to_model_arch(arch_default)
            resolved_path, model_arch = get_model_for_language(
                language,
                wanted_arch,
            )

        options = {"identify_speakers": "false"}
        transcriber = Transcriber(
            resolved_path,
            model_arch=model_arch,
            options=options,
        )

        tts_language = (
            os.environ.get("MOONSHINE_TTS_LANGUAGE", "en-us").strip().replace("_", "-")
        )
        tts = TextToSpeech(tts_language)

        _state["transcriber"] = transcriber
        _state["tts"] = tts
        _state["tts_language"] = tts_language
        _state["load_error"] = None
        _state["ready"] = True
        logger.info(
            "Moonshine ready (STT path=%s arch=%s, TTS lang=%s)",
            resolved_path,
            model_arch,
            tts_language,
        )
    except Exception as e:
        _state["ready"] = False
        _state["load_error"] = str(e)
        _state["transcriber"] = None
        _state["tts"] = None
        logger.exception("Moonshine initialization failed")


def _require_ready() -> None:
    if not _state["ready"]:
        detail = _state["load_error"] or "Moonshine is not ready"
        raise HTTPException(status_code=503, detail=detail)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _state["skip_load"] = _env_bool("MOONSHINE_SKIP_LOAD", False)
    logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
    _load_moonshine()
    yield
    tr = _state.get("transcriber")
    ts = _state.get("tts")
    if tr is not None:
        try:
            tr.close()
        except Exception:
            logger.exception("Error closing transcriber")
    if ts is not None:
        try:
            ts.close()
        except Exception:
            logger.exception("Error closing TTS")


app = FastAPI(title="Moonshine voice service", lifespan=lifespan)


@app.get("/health")
def health():
    return {
        "ok": _state["ready"],
        "skip_load": _state["skip_load"],
        "error": _state["load_error"],
        "tts_language": _state.get("tts_language"),
    }


@app.post("/v1/stt")
def speech_to_text(
    audio: Annotated[UploadFile, File(description="WAV audio")],
    language: Annotated[str, Form()] = "en",
):
    _require_ready()
    from moonshine_voice import load_wav_file  # type: ignore[import-not-found]

    raw = audio.file.read()
    if len(raw) == 0:
        raise HTTPException(status_code=400, detail="Empty audio upload")

    max_bytes = int(os.environ.get("MOONSHINE_MAX_UPLOAD_BYTES", str(15 * 1024 * 1024)))
    if len(raw) > max_bytes:
        raise HTTPException(status_code=413, detail="Audio file too large")

    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=True) as tmp:
            tmp.write(raw)
            tmp.flush()
            audio_data, sample_rate = load_wav_file(tmp.name)
    except Exception as e:
        logger.warning("Invalid WAV: %s", e)
        raise HTTPException(status_code=400, detail=f"Invalid WAV: {e}") from e

    with _lock:
        transcriber = _state["transcriber"]
        if transcriber is None:
            raise HTTPException(status_code=503, detail="Transcriber not loaded")
        try:
            transcript = transcriber.transcribe_without_streaming(
                audio_data,
                sample_rate,
                0,
            )
        except Exception as e:
            logger.exception("STT failed")
            raise HTTPException(status_code=500, detail=f"STT failed: {e}") from e

    parts: list[str] = []
    for line in transcript.lines:
        if line.text:
            parts.append(line.text.strip())
    text = " ".join(parts).strip()

    return {"text": text, "language": language, "sampleRate": sample_rate}


class TtsRequest(BaseModel):
    text: str = Field(min_length=1, max_length=8000)
    language: str | None = None
    voice: str | None = None


@app.post("/v1/tts")
def text_to_speech(body: TtsRequest):
    _require_ready()
    from moonshine_voice import TextToSpeech  # type: ignore[import-not-found]

    default_lang = str(_state.get("tts_language") or "en-us").replace("_", "-")
    lang = (body.language or default_lang).strip().replace("_", "-")

    use_cached = not body.language and not body.voice
    if use_cached:
        tts = _state["tts"]
        if tts is None:
            raise HTTPException(status_code=503, detail="TTS not loaded")
        with _lock:
            samples, sample_rate = tts.synthesize(body.text)
    else:
        synth = (
            TextToSpeech(lang, voice=body.voice)
            if body.voice
            else TextToSpeech(lang)
        )
        try:
            with _lock:
                samples, sample_rate = synth.synthesize(body.text)
        finally:
            synth.close()

    wav_bytes = float32_pcm_to_wav_bytes(list(samples), int(sample_rate))
    b64 = base64.b64encode(wav_bytes).decode("ascii")
    return {
        "encoding": "wav",
        "sampleRate": int(sample_rate),
        "audioBase64": b64,
    }
