"""api/status.py - System status endpoint."""
from flask import Blueprint, jsonify, current_app, request

status_bp = Blueprint("status", __name__)

@status_bp.route("/status", methods=["GET"])
def get_status():
    token = request.cookies.get("rover_session")
    is_unlocked = current_app.auth_service.is_unlocked(token)
    session_id = current_app.session_service.current_session_id
    session_started_at = current_app.session_service.current_session_started_at
    camera_status = current_app.camera_service.get_status()
    mod_status = current_app.inference_service.get_status()
    model_status_dict = {
        "state": mod_status.state,
        "name": mod_status.name,
        "error": mod_status.error
    }

    # Arduino status
    arduino_status_dict = {
        "state": current_app.serial_service.state,
        "port": current_app.serial_service.port_name,
        "last_seen_at": current_app.serial_service.last_seen_at,
        "firmware_version": current_app.serial_service.firmware_version,
        "error": current_app.serial_service.error
    }

    # Rover status
    rover_status_dict = {
        "last_command": current_app.rover_safety.last_command,
        "last_command_at": current_app.rover_safety.last_command_at
    }

    is_replay_active = current_app.replay_service.is_active()

    status_payload = current_app.status_service.get_status(
        is_unlocked=is_unlocked,
        session_id=session_id,
        session_started_at=session_started_at,
        camera_status=camera_status,
        model_status=model_status_dict,
        arduino_status=arduino_status_dict,
        rover_status=rover_status_dict,
        is_replay_active=is_replay_active
    )
    return jsonify(status_payload), 200
