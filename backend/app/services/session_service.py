"""session_service.py - Manages inspection sessions and crash recovery."""
from datetime import datetime, timezone
import uuid
from typing import Optional
from app.db.repositories import SessionRepository, EventRepository

class SessionService:
    def __init__(self, session_repo: SessionRepository, event_repo: EventRepository):
        self.session_repo = session_repo
        self.event_repo = event_repo
        self.current_session_id: Optional[str] = None
        self.current_session_started_at: Optional[str] = None
        self.current_source_mode: Optional[str] = None

    def recover_on_startup(self) -> None:
        """Close any sessions left open by a crash / unclean shutdown."""
        now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        closed_count = self.session_repo.close_all_open_as_unclean(now_utc)
        if closed_count > 0:
            self.event_repo.insert(
                event_id=str(uuid.uuid4()),
                occurred_at=now_utc,
                severity="warning",
                component="session",
                message=f"Cleaned up {closed_count} session(s) left open by previous unclean shutdown."
            )

    def start_session(self, source_mode: str, notes: Optional[str] = None) -> str:
        """Start a new inspection session."""
        now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        session_id = str(uuid.uuid4())
        self.session_repo.create(session_id, now_utc, source_mode, notes)
        self.current_session_id = session_id
        self.current_session_started_at = now_utc
        self.current_source_mode = source_mode

        self.event_repo.insert(
            event_id=str(uuid.uuid4()),
            occurred_at=now_utc,
            severity="info",
            component="session",
            message=f"Started inspection session ({source_mode})",
            details={"session_id": session_id}
        )
        return session_id

    def end_session(self, end_reason: str = "disconnect") -> None:
        """End current inspection session."""
        if not self.current_session_id:
            return

        now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        self.session_repo.close(self.current_session_id, now_utc, end_reason)

        self.event_repo.insert(
            event_id=str(uuid.uuid4()),
            occurred_at=now_utc,
            severity="info",
            component="session",
            message=f"Ended inspection session: {end_reason}",
            details={"session_id": self.current_session_id}
        )
        self.current_session_id = None
        self.current_session_started_at = None
        self.current_source_mode = None
