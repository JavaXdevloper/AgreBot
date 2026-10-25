"""api/replay.py - Replay mode endpoints conforming to 02_API_CONTRACT.md 3.13-3.14."""
from flask import Blueprint, jsonify, current_app, request
from app.errors import ApiError

replay_bp = Blueprint("replay", __name__)

@replay_bp.route("/replay/start", methods=["POST"])
def start_replay():
    token = request.cookies.get("rover_session")
    if not current_app.auth_service.is_unlocked(token):
        raise ApiError("UNAUTHORIZED", "Control must be unlocked with a valid PIN to start replay.", 401)

    current_app.replay_service.start()
    return jsonify({
        "ok": True,
        "camera": {"state": "connecting"},
        "mode": "replay"
    }), 202


@replay_bp.route("/replay/stop", methods=["POST"])
def stop_replay():
    token = request.cookies.get("rover_session")
    if not current_app.auth_service.is_unlocked(token):
        raise ApiError("UNAUTHORIZED", "Control must be unlocked with a valid PIN to stop replay.", 401)

    current_app.replay_service.stop()
    return jsonify({
        "ok": True,
        "mode": "live",
        "camera": {"state": "disconnected"}
    }), 200
