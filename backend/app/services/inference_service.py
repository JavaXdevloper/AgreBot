"""inference_service.py - Manages adapter execution with timing and error isolation."""
import logging
import time
from typing import List, Tuple
import numpy as np
from app.ml.model_adapter import ModelAdapter, RawDetection, ModelStatus
from app.db.repositories import EventRepository
import uuid

logger = logging.getLogger(__name__)

class InferenceService:
    def __init__(self, adapter: ModelAdapter, event_repo: EventRepository):
        self.adapter = adapter
        self.event_repo = event_repo
        self.last_inference_ms: float = 0.0

    def predict(self, frame_bgr: np.ndarray) -> Tuple[List[RawDetection], float]:
        start = time.perf_counter()
        try:
            raw_dets = self.adapter.predict(frame_bgr)
            duration_ms = (time.perf_counter() - start) * 1000.0
            self.last_inference_ms = duration_ms

            # Validate each detection
            valid_dets: List[RawDetection] = []
            h, w = frame_bgr.shape[:2]
            for d in raw_dets:
                if not isinstance(d.label, str) or not d.label.strip():
                    continue
                if not (0.0 <= d.confidence <= 1.0):
                    continue
                if d.bbox is not None:
                    bx, by, bw, bh = d.bbox
                    if bw <= 0 or bh <= 0 or bx < 0 or by < 0 or bx + bw > w or by + bh > h:
                        # Drop out-of-bounds or zero-size box
                        continue
                valid_dets.append(d)

            return valid_dets, duration_ms

        except Exception as e:
            logger.error(f"Inference exception: {e}", exc_info=True)
            self.event_repo.insert(
                event_id=str(uuid.uuid4()),
                occurred_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                severity="error",
                component="model",
                message=f"Inference exception: {str(e)}"
            )
            return [], 0.0

    def get_status(self) -> ModelStatus:
        return self.adapter.status()
