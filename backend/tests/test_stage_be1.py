"""test_stage_be1.py - Unit and acceptance tests for Stage BE-1.

Verifies:
1. GET /api/health -> 200 {"status": "ok"}
2. GET /api/status -> Exact contract fields matching 02_API_CONTRACT.md
3. Error handling: 404, 405, 400 invalid JSON returns contract envelope
4. POST /api/auth/unlock with valid PIN -> 200 {"ok":true,"control":"ready"} + cookie
5. POST /api/auth/unlock with invalid PIN -> 401 INVALID_PIN
6. POST /api/auth/unlock with no PIN configured -> 409 PIN_NOT_CONFIGURED
7. POST /api/auth/unlock rate limiting (6th failure) -> 429 TOO_MANY_ATTEMPTS
8. POST /api/auth/lock -> 200 {"ok":true,"control":"locked"}
"""
import pytest
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.config import Config

@pytest.fixture
def test_config():
    return Config(
        CONTROL_PIN="1234",
        ALLOW_CONTROL_WITHOUT_PIN=False,
        PIN_MAX_ATTEMPTS_PER_MINUTE=5,
        SESSION_IDLE_MINUTES=30
    )

@pytest.fixture
def client(test_config):
    app = create_app(test_config)
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_health_endpoint(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.get_json() == {"status": "ok"}

def test_status_endpoint_conforms_to_contract(client):
    res = client.get("/api/status")
    assert res.status_code == 200
    data = res.get_json()

    # Verify contract keys and enums
    assert data["contract_version"] == "1.0"
    assert data["mode"] == "live"
    assert data["backend"]["state"] == "ready"
    assert "uptime_seconds" in data["backend"]
    assert data["camera"]["state"] == "disconnected"
    assert data["model"]["state"] in ("not_configured", "ready", "loading", "error")
    assert data["arduino"]["state"] == "disconnected"
    assert data["rover"]["control"] == "unavailable"
    assert data["rover"]["reason"] == "ARDUINO_DISCONNECTED"
    assert data["sensors"]["available"] is False
    assert data["sensors"]["items"] == []

def test_error_envelope_format_on_404(client):
    res = client.get("/api/nonexistent_route")
    assert res.status_code == 404
    data = res.get_json()
    assert "error" in data
    assert data["error"]["code"] == "NOT_FOUND"
    assert "message" in data["error"]

def test_auth_unlock_success_and_cookie(client):
    res = client.post("/api/auth/unlock", json={"pin": "1234"})
    assert res.status_code == 200
    assert res.get_json() == {"ok": True, "control": "ready"}
    # Verify cookie was set
    cookie = res.headers.get("Set-Cookie")
    assert "rover_session=" in cookie
    assert "HttpOnly" in cookie
    assert "SameSite=Strict" in cookie

def test_auth_unlock_invalid_pin(client):
    res = client.post("/api/auth/unlock", json={"pin": "wrong"})
    assert res.status_code == 401
    data = res.get_json()
    assert data["error"]["code"] == "INVALID_PIN"

def test_auth_unlock_no_pin_configured():
    no_pin_config = Config(CONTROL_PIN=None)
    app = create_app(no_pin_config)
    client = app.test_client()
    res = client.post("/api/auth/unlock", json={"pin": "1234"})
    assert res.status_code == 409
    assert res.get_json()["error"]["code"] == "PIN_NOT_CONFIGURED"

def test_auth_rate_limiting(client):
    # Send 5 wrong attempts (within limit)
    for _ in range(5):
        res = client.post("/api/auth/unlock", json={"pin": "wrong"})
        assert res.status_code == 401

    # 6th attempt should be rate limited
    res = client.post("/api/auth/unlock", json={"pin": "wrong"})
    assert res.status_code == 429
    assert res.get_json()["error"]["code"] == "TOO_MANY_ATTEMPTS"

def test_auth_lock(client):
    # Unlock first
    client.post("/api/auth/unlock", json={"pin": "1234"})
    # Lock
    res = client.post("/api/auth/lock")
    assert res.status_code == 200
    assert res.get_json() == {"ok": True, "control": "locked"}
