"""Encode mono float32 PCM (-1..1) as WAV bytes."""

import io
import struct
import wave


def float32_pcm_to_wav_bytes(samples: list[float], sample_rate: int) -> bytes:
    int16_samples: list[int] = []
    for x in samples:
        if x > 1.0:
            x = 1.0
        elif x < -1.0:
            x = -1.0
        int16_samples.append(int(round(x * 32767.0)))

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        if int16_samples:
            wf.writeframes(struct.pack("<" + "h" * len(int16_samples), *int16_samples))
    return buf.getvalue()
