"""api/events.py - System events query endpoint conforming to 02_API_CONTRACT.md 3.11."""
from flask import Blueprint, request, jsonify, current_app
from app.errors import ApiError

events_bp = Blueprint("events", __name__)

@events_bp.route("/events", methods=["GET"])
def list_system_events():
    limit_str = request.args.get("limit", "50")
    offset_str = request.args.get("offset", "0")
    severity = request.args.get("severity")

    try:
        limit = int(limit_str)
        offset = int(offset_str)
        if limit < 1 or offset < 0:
            raise ValueError()
        limit = min(limit, 200)
    except ValueError:
        raise ApiError("INVALID_QUERY", "Query parameters 'limit' and 'offset' must be valid non-negative integers.", 400)

    if severity and severity not in ("info", "warning", "error"):
        raise ApiError("INVALID_QUERY", "Query parameter 'severity' must be one of: 'info', 'warning', 'error'.", 400)

    try:
        events = current_app.event_repo.list_events(limit=limit)
        # Filter in memory if severity provided
        if severity:
            events = [e for e in events if e.get("severity") == severity]

        total = len(events)
        paginated_events = events[offset : offset + limit]

        return jsonify({
            "items": paginated_events,
            "total": total,
            "limit": limit,
            "offset": offset
        }), 200
    except Exception:
        raise ApiError("DATABASE_UNAVAILABLE", "Failed to query system events from database.", 503)
