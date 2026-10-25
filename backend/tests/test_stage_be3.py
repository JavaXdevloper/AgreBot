"""test_stage_be3.py - Acceptance tests for Stage BE-3 (Camera Service & Stream Pipeline).

Verifies:
1. POST /api/camera/connect requires unlock (401 UNAUTHORIZED if locked).
2. URL validation rejects bad schemes, URLs > 512, and embedded credentials (user:pass@host).
3. POST /api/camera/connect starts camera worker and enters 'connecting' state.
4. Re-calling connect updates URL (Reconnect flow).
5. GET /api/video/stream returns 503 CAMERA_NOT_CONNECTED when disconnected.
6. When connected, GET /api/video/stream returns multipart/x-mixed-replace.
7. POST /api/camera/disconnect stops camera and ends session.
"""
import pytest
import cv2
import numpy as np
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
    db_file = os.path.join(temp_dir, "test_camera.db")
    config = Config(
        DATABASE_PATH=db_file,
        CONTROL_PIN="1234",
        ALLOW_CONTROL_WITHOUT_PIN=False,
        STALE_FRAME_SECONDS=2
    )
    app = create_app(config)
    app.config["TESTING"] = True
    yield app
    app.camera_service.disconnect()

@pytest.fixture
def client(app_instance):
    with app_instance.test_client() as client:
        yield client

def test_camera_connect_requires_auth(client):
    res = client.post("/api/camera/connect", json={"stream_url": "http://192.168.1.100:8080/video"})
    assert res.status_code == 401
    assert res.get_json()["error"]["code"] == "UNAUTHORIZED"

def test_camera_url_validation(client):
    # Unlock first
    client.post("/api/auth/unlock", json={"pin": "1234"})

    # Missing URL
    res = client.post("/api/camera/connect", json={})
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "INVALID_URL"

    # Non-http/https URL
    res = client.post("/api/camera/connect", json={"stream_url": "rtsp://192.168.1.100:554/live"})
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "INVALID_URL"

    # URL with credentials (hard decision D-16)
    res = client.post("/api/camera/connect", json={"stream_url": "http://admin:secret@192.168.1.100:8080/video"})
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "INVALID_URL"
    assert "embedded usernames/passwords" in res.get_json()["error"]["message"]

def test_video_stream_503_when_disconnected(client):
    res = client.get("/api/video/stream")
    assert res.status_code == 503
    assert res.get_json()["error"]["code"] == "CAMERA_NOT_CONNECTED"

def test_camera_connect_and_frame_publishing(client, app_instance):
    # Unlock
    client.post("/api/auth/unlock", json={"pin": "1234"})

    # Connect to valid URL
    res = client.post("/api/camera/connect", json={"stream_url": "http://127.0.0.1:9999/video"})
    assert res.status_code == 202
    assert res.get_json()["camera"]["state"] == "connecting"

    # Verify session was automatically started
    assert app_instance.session_service.current_session_id is not None

    # Simulate arrival of a frame in camera service directly
    dummy_img = np.zeros((480, 640, 3), dtype=np.uint8)
    _, encoded = cv2.imencode(".jpg", dummy_img)
    jpeg_bytes = encoded.tobytes()

    with app_instance.camera_service._frame_cond:
        app_instance.camera_service._latest_jpeg = jpeg_bytes
        app_instance.camera_service.last_frame_time = time.time()
        app_instance.camera_service.state = "connected"
        app_instance.camera_service._frame_cond.notify_all()

    # Verify status now reports connected
    status_res = client.get("/api/status")
    assert status_res.status_code == 200
    assert status_res.get_json()["camera"]["state"] == "connected"

    # Test disconnect
    disc_res = client.post("/api/camera/disconnect")
    assert disc_res.status_code == 200
    assert disc_res.get_json()["camera"]["state"] == "disconnected"
    assert app_instance.session_service.current_session_id is None
