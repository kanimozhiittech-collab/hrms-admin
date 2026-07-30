"""Lightweight idempotent schema upgrade for dev (no Alembic).

Adds columns introduced after the initial release to existing tables.
Safe to run on every startup — it only adds columns that are missing.
"""
from sqlalchemy import inspect, text

from .database import engine

# table -> {column: DDL type clause}
NEW_COLUMNS = {
    "attendance_logs": {
        "status": "VARCHAR(20) DEFAULT 'Present'",
        "work_hours": "FLOAT",
        "overtime_hours": "FLOAT",
        "late_minutes": "INTEGER",
        "early_exit_minutes": "INTEGER",
        "is_regularized": "BOOLEAN DEFAULT FALSE",
        "regularize_note": "VARCHAR(500)",
        "leave_request_id": "VARCHAR(36)",
        "source": "VARCHAR(20) DEFAULT 'web'",
    },
}


# Columns whose NOT NULL constraint must be relaxed (leave days have no punch time).
# (table, column)
DROP_NOT_NULL = [
    ("attendance_logs", "check_in_at"),
]


def run_migrations():
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    is_postgres = engine.dialect.name == "postgresql"
    with engine.begin() as conn:
        for table, columns in NEW_COLUMNS.items():
            if table not in existing_tables:
                continue  # create_all will build it fresh
            present = {c["name"] for c in inspector.get_columns(table)}
            for col, ddl in columns.items():
                if col not in present:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {ddl}"))
                    print(f"[migrate] added {table}.{col}")

        # Relax NOT NULL on columns that became optional (Postgres only;
        # SQLite builds fresh tables from the model so it's already nullable).
        if is_postgres:
            for table, col in DROP_NOT_NULL:
                if table not in existing_tables:
                    continue
                meta = {c["name"]: c for c in inspector.get_columns(table)}
                if col in meta and not meta[col].get("nullable", True):
                    conn.execute(text(f"ALTER TABLE {table} ALTER COLUMN {col} DROP NOT NULL"))
                    print(f"[migrate] dropped NOT NULL on {table}.{col}")
