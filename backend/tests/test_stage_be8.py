"""test_stage_be8.py - Acceptance tests for Stage BE-8 (Replay Mode).

Verifies:
1. Replay start requires unlocked session (401 UNAUTHORIZED if locked).
2. Replay start returns 409 REPLAY_NOT_AVAILABLE if file missing/unconfigured.
3. Replay start with valid video file sets mode='replay', camera.source='replay'.
4. Rover movement is blocked during replay (409 REPLAY_ACTIVE).
5. Status reports replay.active = True and rover.control = 'unavailable' (reason: REPLAY_ACTIVE).
6. Replay stop returns mode to 'live' and ends replay session.
7. Replay stop when not active returns 409 NO_ACTIVE_SOURCE.
"""
import pytest
import cv2
import numpy as np
import os
import sys
import tempfile

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.config import Config

@pytest.fixture
def temp_replay_video():
    temp_dir = tempfile.mkdtemp()
    video_path = os.path.join(temp_dir, "test_replay.mp4")

    # Generate a tiny 1-second test MP4 video using OpenCV
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(video_path, fourcc, 10.0, (320, 240))
    for i in range(10):
        frame = np.zeros((240, 320, 3), dtype=np.uint8)
        cv2.putText(frame, f"Frame {i}", (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        out.write(frame)
    out.release()

    yield video_path

    if os.path.exists(video_path):
        try:
            os.remove(video_path)
        except Exception:
            pass

@pytest.fixture
def app_instance(temp_replay_video):
    temp_dir = tempfile.mkdtemp()
    db_file = os.path.join(temp_dir, "test_be8.db")
    config = Config(
        DATABASE_PATH=db_file,
        CONTROL_PIN="1234",
        REPLAY_VIDEO_PATH=temp_replay_video
    )
    app = create_app(config)
    app.config["TESTING"] = True
    yield app
    app.replay_service.stop() if app.replay_service.is_active() else None
    app.rover_safety.stop()
    app.serial_service.stop()
    app.pipeline_service.stop()

@pytest.fixture
def client(app_instance):
    with app_instance.test_client() as client:
        yield client

def test_replay_auth_and_availability(client):
    # Locked
    res = client.post("/api/replay/start")
    assert res.status_code == 401

    # Unlock
    client.post("/api/auth/unlock", json={"pin": "1234"})

    # Missing file config
    no_file_app = create_app(Config(CONTROL_PIN="1234", REPLAY_VIDEO_PATH=None))
    no_file_client = no_file_app.test_client()
    no_file_client.post("/api/auth/unlock", json={"pin": "1234"})
    res_no = no_file_client.post("/api/replay/start")
    assert res_no.status_code == 409
    assert res_no.get_json()["error"]["code"] == "REPLAY_NOT_AVAILABLE"

def test_replay_lifecycle_and_rover_lock(client, app_instance):
    # Unlock
    client.post("/api/auth/unlock", json={"pin": "1234"})

    # Start replay
    res = client.post("/api/replay/start")
    assert res.status_code == 202
    assert res.get_json()["mode"] == "replay"
    assert app_instance.replay_service.is_active() is True

    # Status check
    status_res = client.get("/api/status")
    status = status_res.get_json()
    assert status["mode"] == "replay"
    assert status["replay"]["active"] is True
    assert status["rover"]["control"] == "unavailable"
    assert status["rover"]["reason"] == "REPLAY_ACTIVE"

    # Attempt rover movement command -> must return 409 REPLAY_ACTIVE
    cmd_res = client.post("/api/rover/command", json={"command": "forward"})
    assert cmd_res.status_code == 409
    assert cmd_res.get_json()["error"]["code"] == "REPLAY_ACTIVE"

    # Stop replay
    stop_res = client.post("/api/replay/stop")
    assert stop_res.status_code == 200
    assert stop_res.get_json()["mode"] == "live"
    assert app_instance.replay_service.is_active() is False

    # Stop replay when not active -> 409 NO_ACTIVE_SOURCE
    stop_again = client.post("/api/replay/stop")
    assert stop_again.status_code == 409
    assert stop_again.get_json()["error"]["code"] == "NO_ACTIVE_SOURCE"
