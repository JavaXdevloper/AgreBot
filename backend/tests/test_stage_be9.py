"""test_stage_be9.py - Tests for Stage BE-9 Production Serving and Startup."""
import os
import pytest
from app import create_app
from app.config import Config
from run import get_reachable_urls

@pytest.fixture
def test_app(tmp_path):
    dist_dir = tmp_path / "dist"
    dist_dir.mkdir()
    index_file = dist_dir / "index.html"
    index_file.write_text("<!doctype html><html><body><h1>Agri Rover Test Dashboard</h1></body></html>")
    
    asset_file = dist_dir / "test.js"
    asset_file.write_text("console.log('asset loaded');")

    cfg = Config(
        FRONTEND_DIST_PATH=str(dist_dir),
        DATABASE_PATH=str(tmp_path / "test.db"),
        LOG_DIR=str(tmp_path / "logs"),
        CONTROL_PIN="1234",
    )
    return create_app(cfg)

def test_frontend_serving_at_root(test_app):
    client = test_app.test_client()
    res = client.get("/")
    assert res.status_code == 200
    assert b"Agri Rover Test Dashboard" in res.data
    assert "text/html" in res.content_type

def test_frontend_static_asset_serving(test_app):
    client = test_app.test_client()
    res = client.get("/test.js")
    assert res.status_code == 200
    assert b"console.log('asset loaded')" in res.data

def test_frontend_spa_fallback_routing(test_app):
    client = test_app.test_client()
    res = client.get("/dashboard/deep-link")
    assert res.status_code == 200
    assert b"Agri Rover Test Dashboard" in res.data

def test_api_route_404_not_swallowed_by_spa_fallback(test_app):
    client = test_app.test_client()
    res = client.get("/api/unknown_endpoint")
    assert res.status_code == 404
    json_data = res.get_json()
    assert json_data["error"]["code"] == "NOT_FOUND"

def test_get_reachable_urls_includes_local_and_loopback():
    urls = get_reachable_urls(5000)
    assert any("127.0.0.1:5000" in u for u in urls)
    assert any(".local:5000" in u for u in urls)
