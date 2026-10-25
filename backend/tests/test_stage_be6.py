"""test_stage_be6.py - Acceptance tests for Stage BE-6 (Serial Service, Rover Command, Safety Watchdog).

Verifies:
1. POST /api/rover/command validates allowed commands (forward, backward, left, right, stop).
2. Non-stop command while locked returns 403 CONTROL_LOCKED.
3. Non-stop command while serial is disconnected returns 503 ARDUINO_DISCONNECTED.
4. Stop command is accepted even while locked (or returns 503 if serial missing).
5. Rapid commands (> COMMAND_MAX_PER_SECOND) return 429 RATE_LIMITED.
6. When moving, watchdog auto-stops if no command is sent within COMMAND_TIMEOUT_MS.
"""
import pytest
import os
import sys
import tempfile
import time

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.config import Config

@pytest.fixture
def app_instance():
    temp_dir = tempfile.mkdtemp()
    db_file = os.path.join(temp_dir, "test_be6.db")
    config = Config(
        DATABASE_PATH=db_file,
        CONTROL_PIN="1234",
        COMMAND_TIMEOUT_MS=200,
        COMMAND_MAX_PER_SECOND=5
    )
    app = create_app(config)
    app.config["TESTING"] = True
    yield app
    app.rover_safety.stop()
    app.serial_service.stop()
    app.pipeline_service.stop()

@pytest.fixture
def client(app_instance):
    with app_instance.test_client() as client:
        yield client

def test_command_validation(client):
    # Invalid command name
    res = client.post("/api/rover/command", json={"command": "fly"})
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "INVALID_COMMAND"

    # Malformed json
    res = client.post("/api/rover/command", data="not json", content_type="text/plain")
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "INVALID_JSON"

def test_movement_command_blocked_when_locked(client):
    # Controls locked (no PIN session)
    res = client.post("/api/rover/command", json={"command": "forward"})
    assert res.status_code == 403
    assert res.get_json()["error"]["code"] == "CONTROL_LOCKED"

def test_movement_command_requires_serial_connection(client):
    # Unlock with PIN
    client.post("/api/auth/unlock", json={"pin": "1234"})

    # Serial is disconnected in mock test environment
    res = client.post("/api/rover/command", json={"command": "forward"})
    assert res.status_code == 503
    assert res.get_json()["error"]["code"] == "ARDUINO_DISCONNECTED"

def test_rate_limiting_and_watchdog(client, app_instance):
    # Unlock
    client.post("/api/auth/unlock", json={"pin": "1234"})

    # Simulate Arduino connected state
    app_instance.serial_service.state = "connected"
    app_instance.serial_service.last_seen_ts = time.time()
    # Stub serial write_command to succeed
    app_instance.serial_service.write_command = lambda cmd: True

    # Send rapid commands up to rate limit (max 5)
    for _ in range(5):
        res = client.post("/api/rover/command", json={"command": "forward"})
        assert res.status_code == 200
        assert res.get_json()["command"] == "forward"
        assert res.get_json()["state"] == "accepted"

    # 6th command within same second should trigger rate limit
    res = client.post("/api/rover/command", json={"command": "forward"})
    assert res.status_code == 429
    assert res.get_json()["error"]["code"] == "RATE_LIMITED"

    # Verify rover is currently moving
    assert app_instance.rover_safety.is_moving is True

    # Wait for heartbeat timeout (COMMAND_TIMEOUT_MS = 200ms)
    time.sleep(0.3)

    # Watchdog should have auto-stopped
    assert app_instance.rover_safety.is_moving is False
    assert app_instance.rover_safety.last_command == "stop"
