"""auth_service.py - PIN authentication, session management, and rate limiting.

Contract requirements:
- Sets an HttpOnly, SameSite=Strict cookie 'rover_session'
- Rate limit: max PIN_MAX_ATTEMPTS_PER_MINUTE wrong attempts -> 429 TOO_MANY_ATTEMPTS
- PIN is never logged and never returned in API responses
- Clear control status: 'unavailable', 'locked', 'ready'
"""
import secrets
import time
from typing import Optional, Dict
from app.config import Config
from app.errors import ApiError

class AuthService:
    def __init__(self, config: Config):
        self.config = config
        self.sessions: Dict[str, float] = {}  # session_token -> last_activity_time
        self.failed_attempts: list[float] = []  # timestamps of failed attempts

    def clean_old_attempts(self) -> None:
        now = time.time()
        self.failed_attempts = [t for t in self.failed_attempts if now - t < 60.0]

    def is_rate_limited(self) -> bool:
        self.clean_old_attempts()
        return len(self.failed_attempts) >= self.config.PIN_MAX_ATTEMPTS_PER_MINUTE

    def unlock(self, pin: Optional[str]) -> str:
        """Unlock controls with PIN. Returns new session token if valid."""
        if not self.config.CONTROL_PIN:
            raise ApiError("PIN_NOT_CONFIGURED", "Control unlock attempted but no CONTROL_PIN is set.", 409)

        if self.is_rate_limited():
            raise ApiError("TOO_MANY_ATTEMPTS", "Too many invalid PIN attempts. Please wait 1 minute.", 429)

        if not pin or str(pin).strip() != self.config.CONTROL_PIN:
            self.failed_attempts.append(time.time())
            raise ApiError("INVALID_PIN", "The PIN provided is incorrect.", 401)

        # Clear failures on success
        self.failed_attempts.clear()
        token = secrets.token_hex(24)
        self.sessions[token] = time.time()
        return token

    def is_unlocked(self, token: Optional[str]) -> bool:
        """Check if session token is valid and not expired."""
        if self.config.ALLOW_CONTROL_WITHOUT_PIN:
            return True
        if not token or token not in self.sessions:
            return False

        last_active = self.sessions[token]
        expiry_seconds = self.config.SESSION_IDLE_MINUTES * 60.0
        if time.time() - last_active > expiry_seconds:
            del self.sessions[token]
            return False

        # Refresh activity timestamp
        self.sessions[token] = time.time()
        return True

    def lock(self, token: Optional[str]) -> None:
        """Invalidate session token."""
        if token and token in self.sessions:
            del self.sessions[token]
