"""replay_service.py - Prerecorded video replay service.

Conforms strictly to 01_DECISIONS_RULES_AND_FACTS.md (D-07) and 03_BACKEND_SPEC.md (Stage BE-8):
- Reads server-side video file from REPLAY_VIDEO_PATH (client cannot pick file path).
- Feeds frames through the SAME pipeline as live camera.
- 'REPLAY' watermark burned into frames.
- Motors are disabled during replay.
- Detections stored with source_mode='replay'.
- Separate session created with source_mode='replay'.
- NEVER starts automatically, not even if camera drops.
"""
import cv2
from datetime import datetime, timezone
import logging
import os
import threading
import time
from typing import Optional
from app.config import Config
from app.errors import ApiError
from app.services.camera_service import CameraService
from app.services.session_service import SessionService

logger = logging.getLogger(__name__)

class ReplayService:
    def __init__(self, config: Config, camera_service: CameraService, session_service: SessionService):
        self.config = config
        self.camera_service = camera_service
        self.session_service = session_service

        self._active: bool = False
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._lock = threading.Lock()

    def is_available(self) -> bool:
        """Return True only if a replay video file is configured and exists."""
        if not self.config.REPLAY_VIDEO_PATH:
            return False
        return os.path.exists(self.config.REPLAY_VIDEO_PATH)

    def is_active(self) -> bool:
        return self._active

    def start(self) -> None:
        """Start replay mode."""
        if not self.is_available():
            raise ApiError("REPLAY_NOT_AVAILABLE", "Replay video file is not configured or does not exist.", 409)

        with self._lock:
            if self._active:
                return

            # Disconnect live camera first
            self.camera_service.disconnect()

            # End any live session
            if self.session_service.current_session_id:
                self.session_service.end_session("disconnect")

            # Start new replay session
            self.session_service.start_session("replay")

            self._active = True
            self._stop_event.clear()

            # Update camera service status to replay mode
            with self.camera_service._lock:
                self.camera_service.state = "connecting"
                self.camera_service.source = "replay"

            self._thread = threading.Thread(
                target=self._replay_loop,
                daemon=True,
                name="ReplayWorkerThread"
            )
            self._thread.start()

    def stop(self) -> None:
        """Stop replay mode."""
        with self._lock:
            if not self._active:
                raise ApiError("NO_ACTIVE_SOURCE", "Replay mode is not active.", 409)

            self._stop_event.set()
            self._active = False

            # End replay session
            if self.session_service.current_session_id:
                self.session_service.end_session("replay_stop")

            self.camera_service.disconnect()

    def _replay_loop(self) -> None:
        video_path = self.config.REPLAY_VIDEO_PATH
        cap = cv2.VideoCapture(video_path)

        if not cap.isOpened():
            with self.camera_service._lock:
                self.camera_service.state = "error"
                self.camera_service.error = {"code": "REPLAY_READ_ERROR", "message": "Failed to read replay video."}
            self._active = False
            return

        with self.camera_service._lock:
            self.camera_service.state = "connected"

        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_interval = 1.0 / max(1.0, fps if fps > 0 else 10.0)

        while not self._stop_event.is_set():
            ret, frame = cap.read()
            if not ret or frame is None:
                # Loop video from beginning
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue

            h, w = frame.shape[:2]
            if w > self.config.FRAME_MAX_WIDTH:
                scale = self.config.FRAME_MAX_WIDTH / float(w)
                new_w = int(w * scale)
                new_h = int(h * scale)
                frame = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)

            now_ts = time.time()
            now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

            encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), self.config.JPEG_QUALITY]
            success, enc = cv2.imencode(".jpg", frame, encode_param)

            if success:
                with self.camera_service._frame_cond:
                    self.camera_service._raw_frame = frame
                    self.camera_service._latest_jpeg = enc.tobytes()
                    self.camera_service.last_frame_at = now_utc
                    self.camera_service.last_frame_time = now_ts
                    self.camera_service.state = "connected"
                    self.camera_service.source = "replay"
                    self.camera_service._frame_cond.notify_all()

            time.sleep(frame_interval)

        cap.release()
