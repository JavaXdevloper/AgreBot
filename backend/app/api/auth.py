"""api/auth.py - Auth endpoints for unlocking and locking control."""
from flask import Blueprint, request, jsonify, current_app, make_response
from app.errors import ApiError

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/auth/unlock", methods=["POST"])
def unlock():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError("INVALID_JSON", "Request body must be a JSON object containing 'pin'.", 400)

    pin = data.get("pin")
    token = current_app.auth_service.unlock(pin)

    # Return success response and set HttpOnly, SameSite=Strict cookie
    resp = make_response(jsonify({"ok": True, "control": "ready"}))
    resp.set_cookie(
        "rover_session",
        token,
        httponly=True,
        samesite="Strict",
        max_age=current_app.config_obj.SESSION_IDLE_MINUTES * 60
    )
    return resp, 200


@auth_bp.route("/auth/lock", methods=["POST"])
def lock():
    token = request.cookies.get("rover_session")
    current_app.auth_service.lock(token)

    resp = make_response(jsonify({"ok": True, "control": "locked"}))
    resp.delete_cookie("rover_session")
    return resp, 200
