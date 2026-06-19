# Moonshine voice service

Small **FastAPI** service that wraps [Moonshine](https://github.com/moonshine-ai/moonshine) for **speech-to-text** and **text-to-speech**. The Nest `server` calls this over HTTP.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | `{ ok, skip_load, error, tts_language }` |
| `POST` | `/v1/stt` | `multipart/form-data`: field `audio` (WAV), optional `language` (default `en`) → `{ text, language, sampleRate }` |
| `POST` | `/v1/tts` | JSON `{ "text": "...", "language"?: "en-us", "voice"?: "..." }` → `{ encoding, sampleRate, audioBase64 }` |

## Setup

Python 3.10+ recommended.

```bash
cd voice-service
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # Linux/macOS
pip install -r requirements.txt
```

### Models

On first request the STT stack uses `get_model_for_language` and may **download** weights (needs network). You can also download explicitly:

```bash
python -m moonshine_voice.download --language en
```

To pin a downloaded folder and architecture (see Moonshine `ModelArch` integers in their docs):

- `MOONSHINE_MODEL_PATH` — directory with `encoder_model.ort`, etc.
- `MOONSHINE_MODEL_ARCH` — e.g. `0` for tiny, `1` for base.

### Run

```bash
uvicorn main:app --host 0.0.0.0 --port 8765
```

### Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `MOONSHINE_SKIP_LOAD` | unset | If `1`, do not load models (health `ok: false`; for CI smoke tests) |
| `MOONSHINE_STT_LANGUAGE` | `en` | Language code for model lookup |
| `MOONSHINE_STT_MODEL_ARCH` | `tiny` | Architecture name: `tiny`, `base`, `tiny-streaming`, … |
| `MOONSHINE_TTS_LANGUAGE` | `en-us` | Default TTS locale |
| `MOONSHINE_MAX_UPLOAD_BYTES` | `15728640` | Max WAV upload size (~15 MiB) |
| `LOG_LEVEL` | `INFO` | Logging level |

## Tests

```bash
cd voice-service
pip install -r requirements.txt
pytest tests -v
```

## Docker

The included `Dockerfile` installs Python dependencies; **Moonshine’s native wheels may require extra OS packages** on some platforms. If the container fails to load ONNX/Moonshine, compare with [Moonshine’s build docs](https://github.com/moonshine-ai/moonshine) and extend the image as needed.

## License note

Non-English Moonshine models may be under the **Moonshine Community License** (non-commercial). See [Moonshine licensing](https://www.moonshine.ai/license) before using in production.
