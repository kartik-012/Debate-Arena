"""
Async SQLite database layer using aiosqlite.

Provides connection management, schema initialization, and parameterized
query helpers. Every public function logs its operation and uses
parameterized queries exclusively — no string-formatted SQL.
"""

from __future__ import annotations

import sqlite3
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, AsyncIterator

import aiosqlite

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Resolve paths relative to the backend directory (where main.py is run from)
_BACKEND_DIR = Path(__file__).resolve().parent.parent
_SCHEMA_PATH = _BACKEND_DIR / "schema_full.sql"
_DB_PATH = _BACKEND_DIR / settings.DATABASE_URL


def _row_factory(cursor: sqlite3.Cursor, row: tuple) -> dict[str, Any]:
    """Convert raw SQLite rows to dictionaries keyed by column name."""
    columns = [description[0] for description in cursor.description]
    return dict(zip(columns, row))


async def init_db() -> None:
    """
    Read schema_full.sql and execute it against the database.

    This is safe to call repeatedly because every DDL statement in the
    schema uses IF NOT EXISTS.
    """
    logger.info("Initializing database at %s", _DB_PATH)

    if not _SCHEMA_PATH.exists():
        logger.error("Schema file not found: %s", _SCHEMA_PATH)
        raise FileNotFoundError(f"Schema file not found: {_SCHEMA_PATH}")

    schema_sql = _SCHEMA_PATH.read_text(encoding="utf-8")

    async with aiosqlite.connect(str(_DB_PATH)) as db:
        await db.executescript(schema_sql)
        await db.commit()

        # Dynamic migration check to prevent breaking existing databases
        async with db.execute("PRAGMA table_info(debates)") as cursor:
            columns = await cursor.fetchall()
            column_names = [col[1] for col in columns]
            
            if "gemini_calls_used" not in column_names:
                logger.info("Migrating database: adding 'gemini_calls_used' column to 'debates' table")
                await db.execute("ALTER TABLE debates ADD COLUMN gemini_calls_used INTEGER NOT NULL DEFAULT 0")
                await db.commit()
            
            if "autopsy" not in column_names:
                logger.info("Migrating database: adding 'autopsy' column to 'debates' table")
                await db.execute("ALTER TABLE debates ADD COLUMN autopsy TEXT")
                await db.commit()
            
            if "error_message" not in column_names:
                logger.info("Migrating database: adding 'error_message' column to 'debates' table")
                await db.execute("ALTER TABLE debates ADD COLUMN error_message TEXT")
                await db.commit()
            
            if "category" not in column_names:
                logger.info("Migrating database: adding 'category' column to 'debates' table")
                await db.execute("ALTER TABLE debates ADD COLUMN category TEXT")
                await db.commit()

    logger.info("Database initialized successfully")


@asynccontextmanager
async def get_db() -> AsyncIterator[aiosqlite.Connection]:
    """
    Async context manager that yields a database connection with
    row_factory set so every fetch returns dicts instead of tuples.

    Usage::

        async with get_db() as db:
            row = await fetch_one(db, "SELECT * FROM debates WHERE id = ?", (id,))
    """
    db = await aiosqlite.connect(str(_DB_PATH))
    try:
        db.row_factory = _row_factory  # type: ignore[assignment]
        await db.execute("PRAGMA foreign_keys = ON")
        yield db
    except Exception:
        await db.rollback()
        raise
    finally:
        await db.close()


async def execute_query(
    db: aiosqlite.Connection,
    query: str,
    params: tuple[Any, ...] | None = None,
) -> None:
    """
    Execute a write query (INSERT / UPDATE / DELETE) with optional params.

    Args:
        db: Active aiosqlite connection.
        query: Parameterized SQL statement.
        params: Bind values for ``?`` placeholders.
    """
    logger.debug("execute_query: %s | params=%s", query, params)
    try:
        await db.execute(query, params or ())
        await db.commit()
    except aiosqlite.Error as exc:
        logger.error("execute_query failed: %s — %s", query, exc)
        raise


async def execute_insert(
    db: aiosqlite.Connection,
    query: str,
    params: tuple[Any, ...] | None = None,
) -> int:
    """
    Execute an INSERT and return the last inserted rowid.

    Args:
        db: Active aiosqlite connection.
        query: Parameterized INSERT statement.
        params: Bind values for ``?`` placeholders.

    Returns:
        The SQLite ``last_insert_rowid()`` value.
    """
    logger.debug("execute_insert: %s | params=%s", query, params)
    try:
        cursor = await db.execute(query, params or ())
        await db.commit()
        return cursor.lastrowid  # type: ignore[return-value]
    except aiosqlite.Error as exc:
        logger.error("execute_insert failed: %s — %s", query, exc)
        raise


async def fetch_one(
    db: aiosqlite.Connection,
    query: str,
    params: tuple[Any, ...] | None = None,
) -> dict[str, Any] | None:
    """
    Fetch a single row as a dict, or None if no match.

    Args:
        db: Active aiosqlite connection.
        query: Parameterized SELECT statement.
        params: Bind values for ``?`` placeholders.

    Returns:
        A dict of column→value, or ``None``.
    """
    logger.debug("fetch_one: %s | params=%s", query, params)
    try:
        cursor = await db.execute(query, params or ())
        return await cursor.fetchone()  # type: ignore[return-value]
    except aiosqlite.Error as exc:
        logger.error("fetch_one failed: %s — %s", query, exc)
        raise


async def fetch_all(
    db: aiosqlite.Connection,
    query: str,
    params: tuple[Any, ...] | None = None,
) -> list[dict[str, Any]]:
    """
    Fetch all matching rows as a list of dicts.

    Args:
        db: Active aiosqlite connection.
        query: Parameterized SELECT statement.
        params: Bind values for ``?`` placeholders.

    Returns:
        A list of dicts (empty list when no rows match).
    """
    logger.debug("fetch_all: %s | params=%s", query, params)
    try:
        cursor = await db.execute(query, params or ())
        return await cursor.fetchall()  # type: ignore[return-value]
    except aiosqlite.Error as exc:
        logger.error("fetch_all failed: %s — %s", query, exc)
        raise
