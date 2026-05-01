"""
Tests for PostgreSQL migration and hybrid repository layer.

Run with (JSON fallback mode - default):
    cd apps/backend && python -m pytest tests/test_pack_06_postgresql_migration.py -v

Run with DB mode:
    cd apps/backend && $env:DATABASE_URL="sqlite:///./test_migration.db"; python -m pytest tests/test_pack_06_postgresql_migration.py -v
"""

import pytest
import os
import json
import sys
from pathlib import Path

# Ensure app path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Set default: no DB (JSON fallback)
os.environ.setdefault("DATABASE_URL", "")

from app.db import USE_DB
from app.db_schema import Base


@pytest.fixture(scope="module")
def db_session():
    """Create test DB session if DB is enabled."""
    if not USE_DB:
        yield None
        return
    from app.db import engine, SessionLocal
    Base.metadata.create_all(engine)
    session = SessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(engine)
    # Cleanup
    db_file = Path("test_migration.db")
    if db_file.exists():
        db_file.unlink()


class TestJSONFallback:
    """Test that JSON fallback works when DB is disabled."""

    def test_contacts_json_readable(self):
        json_file = Path("data/contacts.json")
        if json_file.exists():
            with open(json_file) as f:
                data = json.load(f)
            assert isinstance(data, dict)

    def test_sessions_json_readable(self):
        json_file = Path("data/campaign_sessions.json")
        if json_file.exists():
            with open(json_file) as f:
                data = json.load(f)
            assert isinstance(data, dict)

    def test_contact_repo_list_all(self):
        from app.repos.contact_repo import ContactRepo
        result = ContactRepo.list_all()
        assert isinstance(result, list)

    def test_contact_repo_get_nonexistent(self):
        from app.repos.contact_repo import ContactRepo
        result = ContactRepo.get("NONEXISTENT-ID")
        assert result is None


class TestDBSchema:
    """Test DB schema - only runs when DATABASE_URL is set."""

    @pytest.fixture(autouse=True)
    def check_db(self):
        if not USE_DB:
            pytest.skip("Database not enabled (set DATABASE_URL to enable)")

    def test_tables_created(self, db_session):
        from app.db import engine
        Base.metadata.create_all(engine)
        assert True

    def test_contact_insert(self, db_session):
        from app.db_schema import Contact, ContactStatus
        from app.db import SessionLocal
        with SessionLocal() as s:
            c = Contact(
                id="TEST-CNT-001",
                email="test@example.com",
                phone="+1234567890",
                status=ContactStatus.ACTIVE,
            )
            s.add(c)
            s.commit()
            found = s.query(Contact).filter(Contact.id == "TEST-CNT-001").first()
            assert found is not None
            assert found.email == "test@example.com"


class TestMigrationScript:
    """Test migration script - only runs when DB is enabled."""

    @pytest.fixture(autouse=True)
    def check_db(self):
        if not USE_DB:
            pytest.skip("Database not enabled (set DATABASE_URL to enable)")

    def test_migration_runs(self):
        from app.migrate_json_to_db import run_migration
        run_migration()
        assert True

    def test_migration_idempotent(self):
        from app.migrate_json_to_db import run_migration
        run_migration()
        run_migration()
        assert True


class TestHybridRepo:
    """Test hybrid repo base class."""

    def test_json_fallback_mode(self):
        """When DB is off, repo uses JSON."""
        from app.repos.contact_repo import ContactRepo
        contacts = ContactRepo.list_all()
        assert isinstance(contacts, list)

    def test_save_and_get(self):
        """Test save/get cycle in JSON mode."""
        from app.repos.contact_repo import ContactRepo
        test_id = "TEST-HYBRID-001"
        test_data = {
            "id": test_id,
            "business_name": "Test Biz",
            "email": "test@hybrid.com",
            "phone": "+1234567890",
            "status": "active",
        }
        ContactRepo.save(test_id, test_data)
        result = ContactRepo.get(test_id)
        assert result is not None
        assert result["id"] == test_id
        # Cleanup
        ContactRepo.delete(test_id)
