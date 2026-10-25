"""connection.py - SQLite connection management.

Rules from 03_BACKEND_SPEC.md:
- PRAGMA foreign_keys = ON
- PRAGMA busy_timeout = 5000
- PRAGMA journal_mode = WAL
- Connection-per-thread factory
- Parameterized SQL only
"""
import os
import sqlite3
import threading

class DatabaseConnectionPool:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._local = threading.local()
        # Ensure parent directory exists
        db_dir = os.path.dirname(os.path.abspath(db_path))
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)

    def get_connection(self) -> sqlite3.Connection:
        if not hasattr(self._local, "connection") or self._local.connection is None:
            conn = sqlite3.connect(self.db_path, timeout=5.0)
            conn.row_factory = sqlite3.Row
            # Enforce Pragmas
            conn.execute("PRAGMA foreign_keys = ON;")
            conn.execute("PRAGMA busy_timeout = 5000;")
            try:
                conn.execute("PRAGMA journal_mode = WAL;")
            except sqlite3.OperationalError:
                # WAL mode might be restricted in some read-only test contexts
                pass
            self._local.connection = conn
        return self._local.connection

    def close(self) -> None:
        if hasattr(self._local, "connection") and self._local.connection:
            try:
                self._local.connection.close()
            except Exception:
                pass
            self._local.connection = None
