"""api/detections.py - Detections query endpoints conforming to 02_API_CONTRACT.md 3.8-3.10."""
from flask import Blueprint, request, jsonify, current_app
from app.errors import ApiError

detections_bp = Blueprint("detections", __name__)

@detections_bp.route("/detections/latest", methods=["GET"])
def get_latest_detection():
    payload = current_app.detection_service.get_latest_payload()
    return jsonify(payload), 200


@detections_bp.route("/detections", methods=["GET"])
def list_detections():
    # Query parameters: limit (1..200), offset, start, end, label, mode, session_id
    limit_str = request.args.get("limit", "50")
    offset_str = request.args.get("offset", "0")

    try:
        limit = int(limit_str)
        offset = int(offset_str)
        if limit < 1 or offset < 0:
            raise ValueError()
        limit = min(limit, 200)  # clamp to max 200
    except ValueError:
        raise ApiError("INVALID_QUERY", "Query parameters 'limit' and 'offset' must be non-negative integers.", 400)

    start_time = request.args.get("start")
    end_time = request.args.get("end")
    label = request.args.get("label")
    mode = request.args.get("mode")
    session_id = request.args.get("session_id")

    if mode and mode not in ("live", "replay"):
        raise ApiError("INVALID_QUERY", "Query parameter 'mode' must be 'live' or 'replay'.", 400)

    try:
        items, total = current_app.detection_repo.list_filtered(
            start_time=start_time,
            end_time=end_time,
            label=label,
            source_mode=mode,
            session_id=session_id,
            limit=limit,
            offset=offset
        )
    except Exception as e:
        raise ApiError("DATABASE_UNAVAILABLE", "Failed to query detections from database.", 503)

    return jsonify({
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset
    }), 200


@detections_bp.route("/detections/labels", methods=["GET"])
def list_detection_labels():
    try:
        labels = current_app.detection_repo.list_labels()
        return jsonify({"labels": labels}), 200
    except Exception:
        raise ApiError("DATABASE_UNAVAILABLE", "Failed to query labels from database.", 503)
