"""repositories.py - Data access layer for sessions, detections, and system events.

Guarantees:
- Parameterized SQL only.
- Write methods catch operational errors and return success bool, never crashing the caller.
- Full filter and pagination support according to 02_API_CONTRACT.md.
"""
import json
import logging
from typing import Optional, List, Dict, Any, Tuple
from app.db.connection import DatabaseConnectionPool

logger = logging.getLogger(__name__)

class SessionRepository:
    def __init__(self, pool: DatabaseConnectionPool):
        self.pool = pool

    def create(self, session_id: str, started_at: str, source_mode: str, notes: Optional[str] = None) -> bool:
        try:
            conn = self.pool.get_connection()
            with conn:
                conn.execute(
                    """INSERT INTO inspection_sessions (id, started_at, source_mode, notes)
                       VALUES (?, ?, ?, ?);""",
                    (session_id, started_at, source_mode, notes)
                )
            return True
        except Exception as e:
            logger.error(f"Failed to create session {session_id}: {e}")
            return False

    def close(self, session_id: str, ended_at: str, end_reason: str) -> bool:
        try:
            conn = self.pool.get_connection()
            with conn:
                conn.execute(
                    """UPDATE inspection_sessions
                       SET ended_at = ?, end_reason = ?
                       WHERE id = ?;""",
                    (ended_at, end_reason, session_id)
                )
            return True
        except Exception as e:
            logger.error(f"Failed to close session {session_id}: {e}")
            return False

    def get_open_sessions(self) -> List[Dict[str, Any]]:
        conn = self.pool.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """SELECT id, started_at, source_mode FROM inspection_sessions
               WHERE ended_at IS NULL;"""
        )
        return [dict(row) for row in cursor.fetchall()]

    def close_all_open_as_unclean(self, ended_at: str) -> int:
        try:
            conn = self.pool.get_connection()
            with conn:
                cursor = conn.execute(
                    """UPDATE inspection_sessions
                       SET ended_at = ?, end_reason = 'unclean_shutdown'
                       WHERE ended_at IS NULL;""",
                    (ended_at,)
                )
                return cursor.rowcount
        except Exception as e:
            logger.error(f"Failed to clean open sessions: {e}")
            return 0


class DetectionRepository:
    def __init__(self, pool: DatabaseConnectionPool):
        self.pool = pool

    def insert(
        self,
        detection_id: str,
        session_id: Optional[str],
        detected_at: str,
        label: str,
        confidence: float,
        class_id: Optional[int],
        bbox: Optional[Dict[str, Any]],
        source_mode: str,
        created_at: str
    ) -> bool:
        try:
            bbox_str = json.dumps(bbox) if bbox is not None else None
            conn = self.pool.get_connection()
            with conn:
                conn.execute(
                    """INSERT INTO detections
                       (id, session_id, detected_at, label, confidence, class_id, bbox_json, source_mode, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);""",
                    (detection_id, session_id, detected_at, label, confidence, class_id, bbox_str, source_mode, created_at)
                )
            return True
        except Exception as e:
            logger.error(f"Failed to insert detection {detection_id}: {e}")
            return False

    def list_filtered(
        self,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        label: Optional[str] = None,
        source_mode: Optional[str] = None,
        session_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[Dict[str, Any]], int]:
        conn = self.pool.get_connection()
        cursor = conn.cursor()

        where_clauses = []
        params = []

        if start_time:
            where_clauses.append("detected_at >= ?")
            params.append(start_time)
        if end_time:
            where_clauses.append("detected_at <= ?")
            params.append(end_time)
        if label:
            where_clauses.append("label = ?")
            params.append(label)
        if source_mode:
            where_clauses.append("source_mode = ?")
            params.append(source_mode)
        if session_id:
            where_clauses.append("session_id = ?")
            params.append(session_id)

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        # Total count query
        count_sql = f"SELECT COUNT(*) FROM detections {where_sql};"
        cursor.execute(count_sql, params)
        total = cursor.fetchone()[0]

        # Paginated items
        select_sql = f"""
            SELECT id, session_id, detected_at, label, confidence, class_id, bbox_json, source_mode, created_at
            FROM detections
            {where_sql}
            ORDER BY detected_at DESC
            LIMIT ? OFFSET ?;
        """
        cursor.execute(select_sql, params + [limit, offset])

        items = []
        for row in cursor.fetchall():
            item = dict(row)
            if item.get("bbox_json"):
                try:
                    item["bbox"] = json.loads(item["bbox_json"])
                except Exception:
                    item["bbox"] = None
            else:
                item["bbox"] = None
            item.pop("bbox_json", None)
            items.append(item)

        return items, total

    def list_labels(self) -> List[str]:
        conn = self.pool.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT label FROM detections ORDER BY label ASC;")
        return [row[0] for row in cursor.fetchall()]


class EventRepository:
    def __init__(self, pool: DatabaseConnectionPool):
        self.pool = pool

    def insert(
        self,
        event_id: str,
        occurred_at: str,
        severity: str,
        component: str,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ) -> bool:
        try:
            details_str = json.dumps(details) if details is not None else None
            conn = self.pool.get_connection()
            with conn:
                conn.execute(
                    """INSERT INTO system_events
                       (id, occurred_at, severity, component, message, details_json)
                       VALUES (?, ?, ?, ?, ?, ?);""",
                    (event_id, occurred_at, severity, component, message, details_str)
                )
            return True
        except Exception as e:
            logger.error(f"Failed to insert system event: {e}")
            return False

    def list_events(self, limit: int = 20) -> List[Dict[str, Any]]:
        conn = self.pool.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """SELECT id, occurred_at, severity, component, message, details_json
               FROM system_events
               ORDER BY occurred_at DESC
               LIMIT ?;""",
            (limit,)
        )
        events = []
        for row in cursor.fetchall():
            item = dict(row)
            if item.get("details_json"):
                try:
                    item["details"] = json.loads(item["details_json"])
                except Exception:
                    item["details"] = None
            else:
                item["details"] = None
            item.pop("details_json", None)
            events.append(item)
        return events
