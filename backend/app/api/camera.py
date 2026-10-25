"""api/camera.py - Camera connection and stream control endpoints."""
from flask import Blueprint, request, jsonify, current_app
from app.errors import ApiError
from app.services.validation import validate_stream_url

camera_bp = Blueprint("camera", __name__)

@camera_bp.route("/camera/connect", methods=["POST"])
def connect_camera():
    token = request.cookies.get("rover_session")
    if not current_app.auth_service.is_unlocked(token):
        raise ApiError("UNAUTHORIZED", "Control must be unlocked with a valid PIN to connect the camera.", 401)

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError("INVALID_JSON", "Request body must be a JSON object containing 'stream_url'.", 400)

    raw_url = data.get("stream_url")
    valid_url = validate_stream_url(raw_url)

    # Start camera worker
    current_app.camera_service.connect(valid_url)

    # Automatically start a live session if not already in one
    if not current_app.session_service.current_session_id:
        current_app.session_service.start_session("live")

    return jsonify({"ok": True, "camera": {"state": "connecting"}}), 202


@camera_bp.route("/camera/disconnect", methods=["POST"])
def disconnect_camera():
    token = request.cookies.get("rover_session")
    if not current_app.auth_service.is_unlocked(token):
        raise ApiError("UNAUTHORIZED", "Control must be unlocked with a valid PIN to disconnect the camera.", 401)

    current_app.camera_service.disconnect()

    # End session
    if current_app.session_service.current_session_id:
        current_app.session_service.end_session("disconnect")

    return jsonify({"ok": True, "camera": {"state": "disconnected"}}), 200
