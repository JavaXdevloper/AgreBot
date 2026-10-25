"""detection_service.py - In-memory latest detection, cooldown policy, and age calculation.

Rules:
- 01_DECISIONS_RULES_AND_FACTS.md (D-09):
  Cooldown policy: Same label is not stored again within DETECTION_COOLDOWN_SECONDS (default 2.0).
  Suppressed detections still update live 'latest detection' in memory (with persisted=False).
- age_seconds computed live on read.
- Database writing is decoupled and non-blocking.
"""
from dataclasses import dataclass
from datetime import datetime, timezone
import time
from typing import Optional, Dict, Any
import uuid
from app.config import Config
from app.db.repositories import DetectionRepository
from app.ml.model_adapter import RawDetection

@dataclass
class LatestDetectionEntry:
    id: str
    session_id: Optional[str]
    detected_at: str
    timestamp_ts: float
    label: str
    confidence: float
    class_id: Optional[int]
    bbox: Optional[Dict[str, Any]]
    source_mode: str
    persisted: bool

class DetectionService:
    def __init__(self, config: Config, detection_repo: DetectionRepository):
        self.config = config
        self.detection_repo = detection_repo
        self.latest_in_memory: Optional[LatestDetectionEntry] = None
        self.last_persisted_time_by_label: Dict[str, float] = {}

    def process_detection(
        self,
        raw_det: RawDetection,
        session_id: Optional[str],
        source_mode: str = "live"
    ) -> LatestDetectionEntry:
        now_ts = time.time()
        now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        det_id = str(uuid.uuid4())

        bbox_dict = None
        if raw_det.bbox is not None:
            bx, by, bw, bh = raw_det.bbox
            bbox_dict = {
                "x": float(bx),
                "y": float(by),
                "width": float(bw),
                "height": float(bh),
                "unit": "px"
            }

        # Check cooldown policy
        last_stored = self.last_persisted_time_by_label.get(raw_det.label, 0.0)
        should_persist = (now_ts - last_stored) >= self.config.DETECTION_COOLDOWN_SECONDS

        if should_persist:
            self.last_persisted_time_by_label[raw_det.label] = now_ts
            # Persist to database
            self.detection_repo.insert(
                detection_id=det_id,
                session_id=session_id,
                detected_at=now_utc,
                label=raw_det.label,
                confidence=raw_det.confidence,
                class_id=raw_det.class_id,
                bbox=bbox_dict,
                source_mode=source_mode,
                created_at=now_utc
            )

        entry = LatestDetectionEntry(
            id=det_id,
            session_id=session_id,
            detected_at=now_utc,
            timestamp_ts=now_ts,
            label=raw_det.label,
            confidence=raw_det.confidence,
            class_id=raw_det.class_id,
            bbox=bbox_dict,
            source_mode=source_mode,
            persisted=should_persist
        )
        self.latest_in_memory = entry
        return entry

    def get_latest_payload(self) -> dict:
        """Construct /api/detections/latest JSON envelope."""
        if self.latest_in_memory is None:
            return {"detection": None}

        age = round(time.time() - self.latest_in_memory.timestamp_ts, 1)
        entry = self.latest_in_memory

        return {
            "detection": {
                "id": entry.id,
                "session_id": entry.session_id,
                "detected_at": entry.detected_at,
                "label": entry.label,
                "confidence": round(entry.confidence, 4),
                "class_id": entry.class_id,
                "bbox": entry.bbox,
                "source_mode": entry.source_mode,
                "persisted": entry.persisted,
                "age_seconds": max(0.0, age)
            }
        }
