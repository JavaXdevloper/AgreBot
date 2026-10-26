"""config.py - Central configuration management for Agri Rover backend.

Reads configuration from environment variables (.env) with strict validation
and defaults matching 01_DECISIONS_RULES_AND_FACTS.md and 03_BACKEND_SPEC.md.
"""
import os
from dataclasses import dataclass
from typing import Optional
from dotenv import load_dotenv

# ── Path roots (computed once at import time) ──────────────────────────────
_THIS_FILE   = os.path.abspath(__file__)          # AgreBot/backend/app/config.py
_APP_DIR     = os.path.dirname(_THIS_FILE)         # AgreBot/backend/app/
_BACKEND_DIR = os.path.dirname(_APP_DIR)           # AgreBot/backend/
_PROJECT_DIR = os.path.dirname(_BACKEND_DIR)       # AgreBot/

# Load .env from backend directory explicitly
_env_path = os.path.join(_BACKEND_DIR, ".env")
if os.path.exists(_env_path):
    load_dotenv(_env_path)
else:
    load_dotenv()


def _resolve_model_path(env_key: str, relative_default: str) -> Optional[str]:
    """Resolve model path from env var or relative default against project root."""
    raw = os.getenv(env_key) or relative_default
    if os.path.isabs(raw):
        return raw
    # Search order: AgreBot/ dir, backend/ dir, workspace root (parent of AgreBot/), cwd
    _workspace = os.path.dirname(_PROJECT_DIR)
    for base in (_PROJECT_DIR, _BACKEND_DIR, _workspace, os.getcwd()):
        cand = os.path.join(base, raw)
        if os.path.exists(cand):
            return os.path.abspath(cand)
    # Return project-root-relative path even if file not found
    return os.path.abspath(os.path.join(_PROJECT_DIR, raw))


@dataclass
class Config:
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "5000"))
    DEBUG: bool = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_DIR: str = os.getenv("LOG_DIR", os.path.join(_BACKEND_DIR, "instance", "logs"))
    DATABASE_PATH: str = os.getenv("DATABASE_PATH", os.path.join(_BACKEND_DIR, "instance", "rover_history.db"))
    FRONTEND_DIST_PATH: str = os.getenv(
        "FRONTEND_DIST_PATH",
        os.path.join(_PROJECT_DIR, "frontend", "dist")
    )

    # Hardware
    SERIAL_PORT: str = os.getenv("SERIAL_PORT", "auto")
    SERIAL_BAUD: int = int(os.getenv("SERIAL_BAUD", "115200"))
    COMMAND_TIMEOUT_MS: int = int(os.getenv("COMMAND_TIMEOUT_MS", "400"))
    COMMAND_MAX_PER_SECOND: int = int(os.getenv("COMMAND_MAX_PER_SECOND", "10"))

    # Security & PIN
    CONTROL_PIN: Optional[str] = os.getenv("CONTROL_PIN") or None
    ALLOW_CONTROL_WITHOUT_PIN: bool = os.getenv("ALLOW_CONTROL_WITHOUT_PIN", "false").lower() in ("true", "1", "yes")
    SESSION_IDLE_MINUTES: int = int(os.getenv("SESSION_IDLE_MINUTES", "30"))
    PIN_MAX_ATTEMPTS_PER_MINUTE: int = int(os.getenv("PIN_MAX_ATTEMPTS_PER_MINUTE", "5"))

    # Model — paths resolved at import time against AgreBot/ project root
    MODEL_ENABLED: bool = os.getenv("MODEL_ENABLED", "false").lower() in ("true", "1", "yes")
    MODEL_PATH: Optional[str] = _resolve_model_path(
        "MODEL_PATH", "ml/Crop_model/models/combined/combined_model.pth"
    )
    MODEL_CLASSES_PATH: Optional[str] = _resolve_model_path(
        "MODEL_CLASSES_PATH", "ml/Crop_model/models/combined/class_names.json"
    )
    MODEL_CONFIDENCE_THRESHOLD: float = float(os.getenv("MODEL_CONFIDENCE_THRESHOLD", "0.50"))
    INFERENCE_ENABLED: bool = os.getenv("INFERENCE_ENABLED", "true").lower() in ("true", "1", "yes")
    INFERENCE_MAX_FPS: int = int(os.getenv("INFERENCE_MAX_FPS", "2"))
    FRAME_MAX_WIDTH: int = int(os.getenv("FRAME_MAX_WIDTH", "640"))
    JPEG_QUALITY: int = int(os.getenv("JPEG_QUALITY", "75"))

    # Camera
    CAMERA_CONNECT_TIMEOUT_SECONDS: int = int(os.getenv("CAMERA_CONNECT_TIMEOUT_SECONDS", "8"))
    STALE_FRAME_SECONDS: int = int(os.getenv("STALE_FRAME_SECONDS", "5"))
    RECONNECT_BACKOFF_MAX_SECONDS: int = int(os.getenv("RECONNECT_BACKOFF_MAX_SECONDS", "15"))
    DETECTION_COOLDOWN_SECONDS: float = float(os.getenv("DETECTION_COOLDOWN_SECONDS", "2.0"))
    REPLAY_VIDEO_PATH: Optional[str] = os.getenv("REPLAY_VIDEO_PATH") or None

    def validate(self) -> None:
        """Validate safety and boundaries."""
        if self.COMMAND_TIMEOUT_MS < 100:
            raise ValueError("COMMAND_TIMEOUT_MS must be >= 100 ms for safety")
        if self.SESSION_IDLE_MINUTES < 1:
            raise ValueError("SESSION_IDLE_MINUTES must be >= 1")
        if self.PIN_MAX_ATTEMPTS_PER_MINUTE < 1:
            raise ValueError("PIN_MAX_ATTEMPTS_PER_MINUTE must be >= 1")
