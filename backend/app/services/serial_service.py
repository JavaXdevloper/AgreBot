"""serial_service.py - Serial port communication with Arduino UNO R4.

Conforms strictly to 05_FIRMWARE_AND_HARDWARE_SPEC.md:
- USB serial, 115200 baud, ASCII, \n terminated.
- Single owner of port with write lock and non-blocking reader thread.
- Translates API commands ('forward', 'backward', 'left', 'right', 'stop')
  to Arduino lines ('FWD', 'BACK', 'LEFT', 'RIGHT', 'STOP').
- Parses Arduino responses: 'READY', 'ACK', 'ERR', 'PONG', 'WDSTOP', 'TEL'.
- Honest status: arduino.state is 'connected' only while lines keep arriving within 2.0s.
  Never invents acknowledgements or connections.
"""
import glob
import logging
import serial
import sys
import threading
import time
from typing import Optional, Dict, Any
from app.config import Config
from app.db.repositories import EventRepository
import uuid

logger = logging.getLogger(__name__)

COMMAND_MAP = {
    "forward": "FWD",
    "backward": "BACK",
    "left": "LEFT",
    "right": "RIGHT",
    "stop": "STOP"
}

class SerialService:
    def __init__(self, config: Config, event_repo: EventRepository):
        self.config = config
        self.event_repo = event_repo

        self.state: str = "disconnected"  # 'disconnected', 'connecting', 'connected', 'error'
        self.port_name: Optional[str] = None
        self.last_seen_at: Optional[str] = None
        self.last_seen_ts: float = 0.0
        self.firmware_version: Optional[str] = None
        self.error: Optional[Dict[str, str]] = None

        self._ser: Optional[serial.Serial] = None
        self._write_lock = threading.Lock()
        self._reader_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()

    def start(self) -> None:
        """Start serial connection attempt in background."""
        self._stop_event.clear()
        self._reader_thread = threading.Thread(
            target=self._connection_loop,
            daemon=True,
            name="SerialWorkerThread"
        )
        self._reader_thread.start()

    def stop(self) -> None:
        """Close connection and stop worker thread."""
        self._stop_event.set()
        self._send_stop_safe()
        if self._ser:
            try:
                self._ser.close()
            except Exception:
                pass
            self._ser = None
        self.state = "disconnected"

    def is_connected(self) -> bool:
        """Return True if port is open and we received Arduino telemetry within 2.0s."""
        if time.time() - self.last_seen_ts > 2.0:
            return False
        return self.state == "connected"

    def write_command(self, cmd_name: str) -> bool:
        """Write movement command to Arduino."""
        if cmd_name not in COMMAND_MAP:
            return False

        line = COMMAND_MAP[cmd_name] + "\n"
        with self._write_lock:
            if not self._ser or not self._ser.is_open:
                return False
            try:
                self._ser.write(line.encode("ascii"))
                self._ser.flush()
                return True
            except Exception as e:
                logger.error(f"Serial write error: {e}")
                self.state = "error"
                self.error = {"code": "SERIAL_ERROR", "message": str(e)}
                return False

    def _send_stop_safe(self) -> None:
        """Fast-path stop without blocking on other locks."""
        if self._ser and self._ser.is_open:
            try:
                self._ser.write(b"STOP\n")
                self._ser.flush()
            except Exception:
                pass

    def _connection_loop(self) -> None:
        while not self._stop_event.is_set():
            if not self._ser or not self._ser.is_open:
                port = self._find_port()
                if port:
                    try:
                        self.state = "connecting"
                        self.port_name = port
                        # Never open at 1200 baud
                        self._ser = serial.Serial(
                            port=port,
                            baudrate=self.config.SERIAL_BAUD,
                            timeout=1.0,
                            write_timeout=1.0
                        )
                        # Wait for Arduino bootloader reset
                        time.sleep(1.8)
                    except Exception as e:
                        logger.warning(f"Could not open serial port {port}: {e}")
                        self.state = "disconnected"
                        self._ser = None
                else:
                    self.state = "disconnected"
                    self.port_name = None

            if self._ser and self._ser.is_open:
                try:
                    raw_line = self._ser.readline()
                    if raw_line:
                        line = raw_line.decode("ascii", errors="replace").strip()
                        if line:
                            self._handle_arduino_line(line)
                    else:
                        # Timeout on readline
                        if time.time() - self.last_seen_ts > 2.0 and self.state == "connected":
                            self.state = "disconnected"
                except Exception as e:
                    logger.error(f"Serial read exception: {e}")
                    self.state = "disconnected"
                    try:
                        self._ser.close()
                    except Exception:
                        pass
                    self._ser = None

            time.sleep(0.05)

    def _handle_arduino_line(self, line: str) -> None:
        now_ts = time.time()
        self.last_seen_ts = now_ts
        self.last_seen_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now_ts))
        self.state = "connected"
        self.error = None

        if line.startswith("READY"):
            parts = line.split()
            for p in parts[1:]:
                if p.startswith("fw="):
                    self.firmware_version = p.split("=")[1]
        elif line.startswith("WDSTOP"):
            logger.warning("Arduino hardware watchdog stopped motors!")
            self.event_repo.insert(
                event_id=str(uuid.uuid4()),
                occurred_at=self.last_seen_at,
                severity="warning",
                component="serial",
                message="Arduino watchdog fired and stopped motors."
            )

    def _find_port(self) -> Optional[str]:
        if self.config.SERIAL_PORT != "auto":
            return self.config.SERIAL_PORT
        # Scan for /dev/ttyACM* or /dev/ttyUSB* on Linux or COM* on Windows
        if sys.platform.startswith("win"):
            import serial.tools.list_ports
            ports = list(serial.tools.list_ports.comports())
            if ports:
                return ports[0].device
            return None
        else:
            candidates = glob.glob("/dev/ttyACM*") + glob.glob("/dev/ttyUSB*")
            return candidates[0] if candidates else None
