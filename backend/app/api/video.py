"""api/video.py - MJPEG streaming endpoint."""
import time
from flask import Blueprint, Response, current_app
from app.errors import ApiError

video_bp = Blueprint("video", __name__)

def generate_mjpeg_stream(camera_service):
    while True:
        status = camera_service.get_status()
        if status["state"] not in ("connected", "stale"):
            break

        frame_bytes = camera_service.get_latest_frame_bytes(timeout=0.5)
        if frame_bytes:
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
            )
        else:
            time.sleep(0.05)


@video_bp.route("/video/stream", methods=["GET"])
def stream_video():
    status = current_app.camera_service.get_status()
    if status["state"] not in ("connected", "stale"):
        raise ApiError("CAMERA_NOT_CONNECTED", "No active camera stream is connected.", 503)

    return Response(
        generate_mjpeg_stream(current_app.camera_service),
        mimetype="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )
