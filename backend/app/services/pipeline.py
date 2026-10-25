"""pipeline.py - Frame-to-inference pipeline wiring.

Ties together:
1. Camera capture frame
2. Inference service (runs adapter)
3. Annotation (annotates the exact inferred frame)
4. Detection service (updates latest in memory and applies cooldown persistence)
5. Publishes annotated JPEG bytes to CameraService shared slot
"""
import cv2
import threading
import time
from app.config import Config
from app.services.camera_service import CameraService
from app.services.inference_service import InferenceService
from app.services.detection_service import DetectionService
from app.services.session_service import SessionService
from app.ml.annotate import annotate_frame

class PipelineService:
    def __init__(
        self,
        config: Config,
        camera_service: CameraService,
        inference_service: InferenceService,
        detection_service: DetectionService,
        session_service: SessionService
    ):
        self.config = config
        self.camera_service = camera_service
        self.inference_service = inference_service
        self.detection_service = detection_service
        self.session_service = session_service

        self._thread: threading.Thread = None
        self._stop_event = threading.Event()

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(
            target=self._run_loop,
            daemon=True,
            name="InferencePipelineThread"
        )
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()

    def _run_loop(self) -> None:
        target_delay = 1.0 / max(1, self.config.INFERENCE_MAX_FPS)

        while not self._stop_event.is_set():
            loop_start = time.perf_counter()

            # Check if camera has raw frame available
            cam_status = self.camera_service.get_status()
            if cam_status["state"] == "connected":
                # Get latest frame directly from camera worker
                with self.camera_service._lock:
                    raw_frame = getattr(self.camera_service, "_raw_frame", None)

                if raw_frame is not None:
                    # 1. Run inference
                    dets, _ = self.inference_service.predict(raw_frame)

                    # 2. Update detection service if any detections found
                    active_session = self.session_service.current_session_id
                    source_mode = self.camera_service.source if self.camera_service.source != "none" else "live"
                    for d in dets:
                        self.detection_service.process_detection(d, active_session, source_mode)

                    # 3. Annotate that same frame
                    annotated = annotate_frame(raw_frame, dets, source_mode=source_mode)

                    # 4. Encode to JPEG and publish to shared slot
                    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), self.config.JPEG_QUALITY]
                    success, enc = cv2.imencode(".jpg", annotated, encode_param)
                    if success:
                        with self.camera_service._frame_cond:
                            self.camera_service._latest_jpeg = enc.tobytes()
                            self.camera_service._frame_cond.notify_all()

            elapsed = time.perf_counter() - loop_start
            sleep_time = max(0.01, target_delay - elapsed)
            time.sleep(sleep_time)
