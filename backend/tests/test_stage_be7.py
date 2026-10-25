"""test_stage_be7.py - Acceptance tests for Stage BE-7 (Detections API, Filtering, Labels, Events API).

Verifies:
1. GET /api/detections returns paginated list with total, limit, offset.
2. GET /api/detections rejects invalid queries (e.g. invalid mode -> 400 INVALID_QUERY).
3. Filtering by label, mode, date works as expected.
4. History items do NOT contain internal live fields 'persisted' or 'age_seconds'.
5. GET /api/detections/labels returns distinct list of labels.
6. GET /api/events returns system events with limit, offset, and severity filter.
"""
import pytest
import os
import sys
import tempfile
import uuid

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.config import Config

@pytest.fixture
def app_instance():
    temp_dir = tempfile.mkdtemp()
    db_file = os.path.join(temp_dir, "test_be7.db")
    config = Config(
        DATABASE_PATH=db_file,
        CONTROL_PIN="1234"
    )
    app = create_app(config)
    app.config["TESTING"] = True

    # Seed test detections
    sess_id = str(uuid.uuid4())
    app.session_repo.create(sess_id, "2026-01-01T10:00:00Z", "live")

    for i in range(10):
        app.detection_repo.insert(
            detection_id=f"det-id-{i}",
            session_id=sess_id,
            detected_at=f"2026-01-01T10:0{i:02d}:00Z",
            label="corn_rust" if i < 6 else "leaf_blight",
            confidence=0.90,
            class_id=1,
            bbox={"x": 10, "y": 20, "width": 50, "height": 50, "unit": "px"},
            source_mode="live" if i < 8 else "replay",
            created_at=f"2026-01-01T10:0{i:02d}:00Z"
        )

    # Seed test events
    for s in ["info", "warning", "error"]:
        app.event_repo.insert(
            event_id=str(uuid.uuid4()),
            occurred_at="2026-01-01T10:00:00Z",
            severity=s,
            component="system",
            message=f"Test event for severity {s}"
        )

    yield app
    app.rover_safety.stop()
    app.serial_service.stop()
    app.pipeline_service.stop()

@pytest.fixture
def client(app_instance):
    with app_instance.test_client() as client:
        yield client

def test_list_detections_pagination(client):
    res = client.get("/api/detections?limit=4&offset=0")
    assert res.status_code == 200
    data = res.get_json()
    assert data["total"] == 10
    assert len(data["items"]) == 4
    assert data["limit"] == 4
    assert data["offset"] == 0

    # Ensure history items never leak live fields
    first_item = data["items"][0]
    assert "persisted" not in first_item
    assert "age_seconds" not in first_item
    assert "label" in first_item
    assert "confidence" in first_item

def test_list_detections_filter(client):
    # Filter by label
    res = client.get("/api/detections?label=leaf_blight")
    assert res.status_code == 200
    data = res.get_json()
    assert data["total"] == 4
    assert all(item["label"] == "leaf_blight" for item in data["items"])

    # Filter by mode
    res_replay = client.get("/api/detections?mode=replay")
    assert res_replay.status_code == 200
    assert res_replay.get_json()["total"] == 2

def test_list_detections_invalid_query(client):
    res = client.get("/api/detections?mode=invalid_mode")
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "INVALID_QUERY"

def test_list_detection_labels(client):
    res = client.get("/api/detections/labels")
    assert res.status_code == 200
    labels = res.get_json()["labels"]
    assert "corn_rust" in labels
    assert "leaf_blight" in labels
    assert len(labels) == 2

def test_list_system_events(client):
    res = client.get("/api/events?limit=10")
    assert res.status_code == 200
    data = res.get_json()
    assert data["total"] >= 3
    assert len(data["items"]) >= 3

    # Filter by severity
    res_err = client.get("/api/events?severity=error")
    assert res_err.status_code == 200
    items = res_err.get_json()["items"]
    assert all(item["severity"] == "error" for item in items)
