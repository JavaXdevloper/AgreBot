"""rover_safety.py - Movement command validation, rate limiting, and heartbeat watchdog.

Rules:
- Validates 5 commands: 'forward', 'backward', 'left', 'right', 'stop'.
- Rate limits non-stop commands: max COMMAND_MAX_PER_SECOND (default 10) -> 429 RATE_LIMITED.
- Watchdog thread checks every 50 ms:
  If last movement command is older than COMMAND_TIMEOUT_MS and rover not already stopped ->
  auto-sends STOP and records warning event.
- 'stop' is exempt from rate limiting and lock restrictions.
"""
from datetime import datetime, timezone
import logging
import threading
import time
from typing import Optional
from app.config import Config
from app.errors import ApiError
from app.services.serial_service import SerialService
from app.db.repositories import EventRepository
import uuid

logger = logging.getLogger(__name__)

ALLOWED_COMMANDS = {"forward", "backward", "left", "right", "stop"}

class RoverSafety:
    def __init__(self, config: Config, serial_service: SerialService, event_repo: EventRepository):
        self.config = config
        self.serial_service = serial_service
        self.event_repo = event_repo

        self.last_command: Optional[str] = None
        self.last_command_at: Optional[str] = None
        self.last_movement_ts: float = 0.0
        self.is_moving: bool = False

        self._recent_commands: list[float] = []
        self._lock = threading.Lock()
        self._stop_event = threading.Event()
        self._watchdog_thread: Optional[threading.Thread] = None

    def start(self) -> None:
        self._stop_event.clear()
        self._watchdog_thread = threading.Thread(
            target=self._watchdog_loop,
            daemon=True,
            name="RoverWatchdogThread"
        )
        self._watchdog_thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        self.emergency_stop()

    def execute_command(self, cmd: str, is_unlocked: bool, is_replay_active: bool) -> dict:
        if not isinstance(cmd, str) or cmd.lower() not in ALLOWED_COMMANDS:
            raise ApiError("INVALID_COMMAND", f"Command must be one of: {sorted(list(ALLOWED_COMMANDS))}", 400)

        cmd_lower = cmd.lower()

        # Stop command fast-path (never rate-limited, allowed while locked)
        if cmd_lower == "stop":
            return self._apply_stop()

        # Non-stop commands:
        if is_replay_active:
            raise ApiError("REPLAY_ACTIVE", "Rover movement commands are disabled during replay mode.", 409)

        if not is_unlocked:
            raise ApiError("CONTROL_LOCKED", "Controls are locked. Please unlock with your PIN first.", 403)

        if not self.serial_service.is_connected():
            raise ApiError("ARDUINO_DISCONNECTED", "Serial link to Arduino is disconnected.", 503)

        # Rate limiting check
        now = time.time()
        with self._lock:
            self._recent_commands = [t for t in self._recent_commands if now - t < 1.0]
            if len(self._recent_commands) >= self.config.COMMAND_MAX_PER_SECOND:
                raise ApiError("RATE_LIMITED", "Too many movement commands per second.", 429)
            self._recent_commands.append(now)

        # Write to serial
        success = self.serial_service.write_command(cmd_lower)
        if not success:
            raise ApiError("SERIAL_ERROR", "Failed to write command to Arduino serial port.", 503)

        now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")[:-4] + "Z"
        with self._lock:
            self.last_command = cmd_lower
            self.last_command_at = now_utc
            self.last_movement_ts = now
            self.is_moving = True

        return {
            "ok": True,
            "command": cmd_lower,
            "state": "accepted",
            "sent_at": now_utc
        }

    def emergency_stop(self) -> None:
        """Immediate stop triggered on shutdown or disconnect."""
        self._apply_stop(silent=True)

    def _apply_stop(self, silent: bool = False) -> dict:
        now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")[:-4] + "Z"
        with self._lock:
            self.last_command = "stop"
            self.last_command_at = now_utc
            self.is_moving = False

        if not self.serial_service.is_connected() and not silent:
            # If serial is not connected, stop fails honestly with 503 per 02_API_CONTRACT.md section 3.15
            raise ApiError("ARDUINO_DISCONNECTED", "Stop command could not be sent: Arduino disconnected.", 503)

        self.serial_service.write_command("stop")
        return {
            "ok": True,
            "command": "stop",
            "state": "accepted",
            "sent_at": now_utc
        }

    def _watchdog_loop(self) -> None:
        timeout_sec = self.config.COMMAND_TIMEOUT_MS / 1000.0

        while not self._stop_event.is_set():
            time.sleep(0.05)
            now = time.time()
            with self._lock:
                if self.is_moving and (now - self.last_movement_ts > timeout_sec):
                    # Timeout expired! Auto-send STOP
                    logger.warning("Heartbeat watchdog timeout: auto-stopping rover.")
                    self.is_moving = False
                    self.last_command = "stop"
                    self.last_command_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

                    # Dispatch STOP to serial
                    self.serial_service._send_stop_safe()

                    # Record warning event (rate limited)
                    self.event_repo.insert(
                        event_id=str(uuid.uuid4()),
                        occurred_at=self.last_command_at,
                        severity="warning",
                        component="rover",
                        message=f"Movement heartbeat timed out after {self.config.COMMAND_TIMEOUT_MS}ms. Stopped."
                    )
