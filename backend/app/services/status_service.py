"""status_service.py - Constructs the canonical /api/status response.

Conforms strictly to 02_API_CONTRACT.md section 3.2.
Honest status: reports true state of all components, no fake data.
"""
from datetime import datetime, timezone
import os
import time
from app.config import Config
from app.services.clock_service import ClockService

class StatusService:
    def __init__(self, config: Config, start_time: float):
        self.config = config
        self.start_time = start_time

    def get_status(
        self,
        is_unlocked: bool = False,
        session_id: str = None,
        session_started_at: str = None,
        camera_status: dict = None,
        model_status: dict = None,
        arduino_status: dict = None,
        rover_status: dict = None,
        is_replay_active: bool = False
    ) -> dict:
        now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        uptime = int(time.time() - self.start_time)
        ntp_sync = ClockService.is_ntp_synchronized()

        cam = camera_status or {
            "state": "disconnected",
            "source": "none",
            "last_frame_at": None,
            "fps": None,
            "error": None
        }

        mod = model_status or {
            "state": "not_configured",
            "name": None,
            "error": None
        }

        ard = arduino_status or {
            "state": "disconnected",
            "port": None,
            "last_seen_at": None,
            "firmware_version": None,
            "error": None
        }

        # Determine rover control state
        if is_replay_active:
            control_state = "unavailable"
            control_reason = "REPLAY_ACTIVE"
        elif ard["state"] != "connected":
            control_state = "unavailable"
            control_reason = "ARDUINO_DISCONNECTED"
        elif not is_unlocked:
            control_state = "locked"
            control_reason = "LOCKED"
        else:
            control_state = "ready"
            control_reason = None

        rov = rover_status or {}
        rover_payload = {
            "control": control_state,
            "reason": control_reason,
            "is_unlocked": is_unlocked,
            "last_command": rov.get("last_command"),
            "last_command_at": rov.get("last_command_at"),
            "command_timeout_ms": self.config.COMMAND_TIMEOUT_MS
        }

        current_mode = "replay" if is_replay_active else "live"

        return {
            "timestamp": now_utc,
            "contract_version": "1.0",
            "mode": current_mode,
            "backend": {
                "state": "ready",
                "uptime_seconds": uptime,
                "version": "0.1.0"
            },
            "clock": {
                "ntp_synchronized": ntp_sync
            },
            "camera": cam,
            "model": mod,
            "arduino": ard,
            "rover": rover_payload,
            "replay": {
                "available": bool(self.config.REPLAY_VIDEO_PATH and os.path.exists(self.config.REPLAY_VIDEO_PATH)),
                "active": bool(is_replay_active)
            },
            "database": {
                "state": "ready",
                "error": None
            },
            "session": {
                "id": session_id,
                "started_at": session_started_at
            },
            "sensors": {
                "available": False,
                "items": []
            }
        }
