"""
Database configuration with JSON fallback.

If DATABASE_URL is set and valid, use PostgreSQL.
Otherwise, fall back to JSON file storage (current behavior).

This allows gradual migration without breaking existing functionality.
"""

import os
import json
import logging
from pathlib import Path
from typing import Optional, TypeVar, Type, Any, Dict, List

from sqlalchemy import create_engine, Column, String, Text, Integer, Float, Boolean, DateTime, JSON as SQLJSON
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from sqlalchemy.exc import OperationalError
from datetime import datetime

logger = logging.getLogger(__name__)

T = TypeVar("T")

# ---------------------------------------------------------------------------
# Detect mode
# ---------------------------------------------------------------------------

DATABASE_URL = os.getenv("DATABASE_URL", "")
USE_DB = bool(DATABASE_URL and DATABASE_URL.startswith(("postgresql://", "sqlite://")))

engine = None
SessionLocal = None
Base = declarative_base()

if USE_DB:
    try:
        engine = create_engine(DATABASE_URL, echo=False)
        SessionLocal = sessionmaker(bind=engine)
        logger.info(f"Database mode: USING {DATABASE_URL.split('@')[0].split('//')[1]}@***")
    except Exception as e:
        logger.warning(f"Database connection failed, falling back to JSON: {e}")
        USE_DB = False
        engine = None
        SessionLocal = None
else:
    logger.info("Database mode: JSON fallback (DATABASE_URL not set)")


# ---------------------------------------------------------------------------
# Helpers: JSON fallback read/write
# ---------------------------------------------------------------------------

def _json_load(path: Path) -> dict:
    if not path.exists():
        return {}
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _json_save(path: Path, data: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


# ---------------------------------------------------------------------------
# Generic DB/JSON hybrid repository base
# ---------------------------------------------------------------------------

class HybridRepo:
    """
    Base class for repositories that can read/write from DB or JSON.

    Subclasses should override:
    - table_model: SQLAlchemy model class (for DB mode)
    - pk_field: primary key column name
    - json_file: Path to JSON file
    - to_db_dict(instance_dict) -> dict for DB insert
    - from_db_row(row) -> dict for JSON-compatible output
    """

    table_model = None
    pk_field = "id"
    json_file: Optional[Path] = None

    # --- read ---

    @classmethod
    def get(cls, pk: str) -> Optional[dict]:
        if USE_DB and cls.table_model:
            with SessionLocal() as s:
                row = s.query(cls.table_model).filter(
                    getattr(cls.table_model, cls.pk_field) == pk
                ).first()
                return cls._row_to_dict(row) if row else None
        # JSON fallback
        data = _json_load(cls.json_file)
        return data.get(pk)

    @classmethod
    def list_all(cls) -> List[dict]:
        if USE_DB and cls.table_model:
            with SessionLocal() as s:
                rows = s.query(cls.table_model).all()
                return [cls._row_to_dict(r) for r in rows]
        # JSON fallback
        data = _json_load(cls.json_file)
        return list(data.values())

    @classmethod
    def filter_by(cls, **kwargs) -> List[dict]:
        """Simple filter for JSON fallback. Subclasses can override for DB."""
        items = cls.list_all()
        return [i for i in items if all(i.get(k) == v for k, v in kwargs.items())]

    # --- write ---

    @classmethod
    def save(cls, pk: str, data: dict):
        if USE_DB and cls.table_model:
            with SessionLocal() as s:
                existing = s.query(cls.table_model).filter(
                    getattr(cls.table_model, cls.pk_field) == pk
                ).first()
                if existing:
                    for k, v in data.items():
                        setattr(existing, k, v)
                else:
                    obj = cls.table_model(**data)
                    s.add(obj)
                s.commit()
                return
        # JSON fallback
        all_data = _json_load(cls.json_file)
        all_data[pk] = data
        _json_save(cls.json_file, all_data)

    @classmethod
    def delete(cls, pk: str):
        if USE_DB and cls.table_model:
            with SessionLocal() as s:
                s.query(cls.table_model).filter(
                    getattr(cls.table_model, cls.pk_field) == pk
                ).delete()
                s.commit()
                return
        # JSON fallback
        all_data = _json_load(cls.json_file)
        all_data.pop(pk, None)
        _json_save(cls.json_file, all_data)

    # --- helpers ---

    @classmethod
    def _row_to_dict(cls, row) -> dict:
        if not row:
            return None
        return {c.name: getattr(row, c.name) for c in row.__table__.columns}
