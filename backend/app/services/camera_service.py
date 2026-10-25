"""camera_service.py - Camera capture worker, stale detection, and frame publishing.

Conforms to:
- 01_DECISIONS_RULES_AND_FACTS.md (D-10, D-13, D-16)
- 03_BACKEND_SPEC.md (Section 3 Concurrency, Section 9 Status truthfulness)
- 02_API_CONTRACT.md (3.5, 3.6, 3.7)

Design:
- Capture thread: single reader continuously pulling frames, keeping ONLY the latest frame (bounded buffer of 1).
- Publisher slot: thread-safe published frame (JPEG bytes) and timestamp.
- Multiple web viewers read from the shared publisher slot. They never spawn extra capture threads or OpenCV VideoCapture instances.
- Reconnect with capped backoff.
- Stale detection: if no frame arrives within STALE_FRAME_SECONDS -> state becomes 'stale'.
"""
import cv2
import threading
import time
from datetime import datetime, timezone
from typing import Optional, Tuple
from app.config import Config
from app.db.repositories import EventRepository
import uuid

class CameraService:
    def __init__(self, config: Config, event_repo: EventRepository):
        self.config = config
        self.event_repo = event_repo

        # State: disconnected, connecting, connected, stale, error
        self.state: str = "disconnected"
        self.source: str = "none"  # none, phone, replay
        self.stream_url: Optional[str] = None
        self.last_frame_at: Optional[str] = None
        self.last_frame_time: float = 0.0
        self.fps: Optional[float] = None
        self.error: Optional[dict] = None

        # Threading & Capture
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._lock = threading.Lock()

        # Shared publisher slot
        self._latest_jpeg: Optional[bytes] = None
        self._frame_cond = threading.Condition(self._lock)
        self._frame_count: int = 0
        self._last_fps_calc_time: float = time.time()
        self._frames_since_calc: int = 0

    def connect(self, url: str) -> None:
        """Start or restart the camera worker with stream_url."""
        with self._lock:
            # Stop existing thread if running
            if self._thread and self._thread.is_alive():
                self._stop_event.set()

            self.state = "connecting"
            self.source = "phone"
            self.stream_url = url
            self.error = None
            self.fps = None
            self._latest_jpeg = None
            self._stop_event.clear()

            self._thread = threading.Thread(
                target=self._capture_worker,
                args=(url,),
                daemon=True,
                name="CameraCaptureWorker"
            )
            self._thread.start()

    def disconnect(self) -> None:
        """Stop camera capture worker and reset state."""
        with self._lock:
            if self._thread and self._thread.is_alive():
                self._stop_event.set()
            self.state = "disconnected"
            self.source = "none"
            self.stream_url = None
            self.fps = None
            self.error = None
            self._latest_jpeg = None
            self._frame_cond.notify_all()

    def get_status(self) -> dict:
        """Return camera status object for /api/status."""
        with self._lock:
            # Check stale state
            if self.state == "connected" and self.last_frame_time > 0:
                age = time.time() - self.last_frame_time
                if age > self.config.STALE_FRAME_SECONDS:
                    self.state = "stale"
                    self.fps = 0.0

            return {
                "state": self.state,
                "source": self.source,
                "last_frame_at": self.last_frame_at,
                "fps": round(self.fps, 1) if self.fps is not None else None,
                "error": self.error
            }

    def get_latest_frame_bytes(self, timeout: float = 1.0) -> Optional[bytes]:
        """Wait for and retrieve the latest published JPEG frame."""
        with self._frame_cond:
            if self._latest_jpeg is not None:
                return self._latest_jpeg
            self._frame_cond.wait(timeout=timeout)
            return self._latest_jpeg

    def _capture_worker(self, url: str) -> None:
        backoff = 1.0
        max_backoff = self.config.RECONNECT_BACKOFF_MAX_SECONDS

        while not self._stop_event.is_set():
            # Support webcam device index (e.g. 0) or HTTP/RTSP stream URL
            cap_source = int(url) if str(url).isdigit() else url
            cap = cv2.VideoCapture(cap_source)
            # Give OpenCV a reasonable connection timeout if possible
            if not cap.isOpened():
                with self._lock:
                    self.state = "error"
                    self.error = {"code": "CONNECT_FAILED", "message": "Failed to connect to camera stream."}
                cap.release()

                # Exponential backoff retry
                time.sleep(backoff)
                backoff = min(backoff * 1.5, max_backoff)
                continue

            # Connected successfully
            with self._lock:
                self.state = "connected"
                self.error = None
                backoff = 1.0

            while not self._stop_event.is_set():
                ret, frame = cap.read()
                if not ret or frame is None:
                    with self._lock:
                        self.state = "stale"
                    break

                now_ts = time.time()
                now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

                # Frame processing: resize if wider than FRAME_MAX_WIDTH
                h, w = frame.shape[:2]
                if w > self.config.FRAME_MAX_WIDTH:
                    scale = self.config.FRAME_MAX_WIDTH / float(w)
                    new_w = int(w * scale)
                    new_h = int(h * scale)
                    frame = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)

                # Encode to JPEG
                encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), self.config.JPEG_QUALITY]
                success, encoded_img = cv2.imencode(".jpg", frame, encode_param)

                if success:
                    jpeg_bytes = encoded_img.tobytes()
                    with self._frame_cond:
                        self._raw_frame = frame
                        self._latest_jpeg = jpeg_bytes
                        self.last_frame_at = now_utc
                        self.last_frame_time = now_ts
                        self.state = "connected"

                        # Compute FPS
                        self._frames_since_calc += 1
                        time_diff = now_ts - self._last_fps_calc_time
                        if time_diff >= 1.0:
                            self.fps = self._frames_since_calc / time_diff
                            self._frames_since_calc = 0
                            self._last_fps_calc_time = now_ts

                        self._frame_cond.notify_all()

                # Yield control briefly to avoid 100% CPU on capture
                time.sleep(0.01)

            cap.release()
            if not self._stop_event.is_set():
                time.sleep(1.0)
