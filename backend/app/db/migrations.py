"""migrations.py - Safe database migration runner.

Ensures schema is initialized idempotently and never deleted on startup.
Tracks schema_version.
"""
import os
import sqlite3

CURRENT_SCHEMA_VERSION = 1

def run_migrations(conn: sqlite3.Connection, schema_path: str = None) -> None:
    if schema_path is None:
        schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")

    with conn:
        cursor = conn.cursor()
        # Check if schema_version exists
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version';"
        )
        has_version_table = cursor.fetchone() is not None

        current_ver = 0
        if has_version_table:
            cursor.execute("SELECT version FROM schema_version ORDER BY version DESC LIMIT 1;")
            row = cursor.fetchone()
            if row:
                current_ver = row[0]

        if current_ver < CURRENT_SCHEMA_VERSION:
            with open(schema_path, "r", encoding="utf-8") as f:
                schema_sql = f.read()
            cursor.executescript(schema_sql)

            # Record version
            if current_ver == 0:
                cursor.execute("INSERT INTO schema_version (version) VALUES (?);", (CURRENT_SCHEMA_VERSION,))
            else:
                cursor.execute("UPDATE schema_version SET version = ?;", (CURRENT_SCHEMA_VERSION,))
