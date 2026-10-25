"""api/rover.py - Rover command execution endpoint."""
from flask import Blueprint, request, jsonify, current_app
from app.errors import ApiError

rover_bp = Blueprint("rover", __name__)

@rover_bp.route("/rover/command", methods=["POST"])
def post_rover_command():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError("INVALID_JSON", "Request body must be a JSON object containing 'command'.", 400)

    cmd = data.get("command")
    token = request.cookies.get("rover_session")
    is_unlocked = current_app.auth_service.is_unlocked(token)

    # Replay active check
    is_replay_active = current_app.replay_service.is_active()

    result = current_app.rover_safety.execute_command(
        cmd=cmd,
        is_unlocked=is_unlocked,
        is_replay_active=bool(is_replay_active)
    )
    return jsonify(result), 200
