"""Smoke tests; use MOONSHINE_SKIP_LOAD=1 so Moonshine native models are not required."""

import importlib

import pytest
from fastapi.testclient import TestClient


def test_health_skip_load(monkeypatch):
    monkeypatch.setenv("MOONSHINE_SKIP_LOAD", "1")
    import main

    importlib.reload(main)

    with TestClient(main.app) as client:
        res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is False
    assert body["skip_load"] is True


def test_stt_returns_503_when_not_ready(monkeypatch):
    monkeypatch.setenv("MOONSHINE_SKIP_LOAD", "1")
    import main

    importlib.reload(main)

    with TestClient(main.app) as client:
        res = client.post(
            "/v1/stt",
            files={"audio": ("silence.wav", b"not a wav", "audio/wav")},
            data={"language": "en"},
        )
    assert res.status_code == 503
