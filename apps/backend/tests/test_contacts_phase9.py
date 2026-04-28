"""
Tests for contact management API - Phase 9.

Covers CRUD operations, filtering, tags, and opt-out functionality.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services import contact_service
from pathlib import Path
import json

client = TestClient(app)

# Clear contacts before each test
@pytest.fixture(autouse=True)
def clear_contacts():
    contact_service._save_contacts({})
    yield
    contact_service._save_contacts({})


def test_create_contact():
    """Test creating a single contact."""
    response = client.post("/contacts", json={
        "email": "john@example.com",
        "phone": "+1234567890",
        "first_name": "John",
        "last_name": "Doe",
        "tags": ["customer", "newsletter"],
        "source": "manual",
        "opt_out": False,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "john@example.com"
    assert data["contact_id"].startswith("CNT-")
    assert data["tags"] == ["customer", "newsletter"]
    assert data["opt_out"] is False
    assert data["source"] == "manual"


def test_create_contact_minimal():
    """Test creating contact with only email."""
    response = client.post("/contacts", json={
        "email": "jane@example.com",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "jane@example.com"
    assert data["tags"] == []
    assert data["opt_out"] is False


def test_create_contact_invalid_email():
    """Test creating contact with invalid email."""
    response = client.post("/contacts", json={
        "email": "not-an-email",
    })
    assert response.status_code == 422  # Validation error


def test_list_contacts():
    """Test listing contacts."""
    # Create two contacts
    client.post("/contacts", json={"email": "a@example.com"})
    client.post("/contacts", json={"email": "b@example.com"})

    response = client.get("/contacts")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2


def test_list_contacts_pagination():
    """Test pagination parameters."""
    for i in range(5):
        client.post("/contacts", json={"email": f"user{i}@example.com"})

    # Get first 2
    response = client.get("/contacts?limit=2&offset=0")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2

    # Get next 2
    response = client.get("/contacts?limit=2&offset=2")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2


def test_list_contacts_filter_tags():
    """Test filtering contacts by tags."""
    client.post("/contacts", json={"email": "a@example.com", "tags": ["vip", "customer"]})
    client.post("/contacts", json={"email": "b@example.com", "tags": ["prospect"]})

    response = client.get("/contacts?tags=vip")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["email"] == "a@example.com"


def test_list_contacts_filter_opt_out():
    """Test filtering by opt_out status."""
    client.post("/contacts", json={"email": "a@example.com", "opt_out": False})
    client.post("/contacts", json={"email": "b@example.com", "opt_out": True})

    # Get only opted-out
    response = client.get("/contacts?opt_out=true")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["email"] == "b@example.com"

    # Get only active
    response = client.get("/contacts?opt_out=false")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["email"] == "a@example.com"


def test_list_contacts_filter_source():
    """Test filtering by source."""
    client.post("/contacts", json={"email": "a@example.com", "source": "import"})
    client.post("/contacts", json={"email": "b@example.com", "source": "manual"})

    response = client.get("/contacts?source=import")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["email"] == "a@example.com"


def test_get_contact():
    """Test getting a single contact."""
    create_resp = client.post("/contacts", json={"email": "john@example.com", "first_name": "John"})
    contact_id = create_resp.json()["contact_id"]

    response = client.get(f"/contacts/{contact_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["contact_id"] == contact_id
    assert data["email"] == "john@example.com"
    assert data["first_name"] == "John"


def test_get_contact_not_found():
    """Test getting non-existent contact."""
    response = client.get("/contacts/CNT-NONEXIST")
    assert response.status_code == 404


def test_update_contact():
    """Test updating a contact."""
    create_resp = client.post("/contacts", json={
        "email": "john@example.com",
        "first_name": "John",
        "tags": ["customer"],
    })
    contact_id = create_resp.json()["contact_id"]

    response = client.put(f"/contacts/{contact_id}", json={
        "email": "john.updated@example.com",
        "first_name": "Johnathan",
        "tags": ["customer", "vip"],
    })
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "john.updated@example.com"
    assert data["first_name"] == "Johnathan"
    assert "vip" in data["tags"]


def test_update_contact_not_found():
    """Test updating non-existent contact."""
    response = client.put("/contacts/CNT-NONEXIST", json={"email": "test@example.com"})
    assert response.status_code == 404


def test_delete_contact():
    """Test deleting a contact."""
    create_resp = client.post("/contacts", json={"email": "delete@example.com"})
    contact_id = create_resp.json()["contact_id"]

    response = client.delete(f"/contacts/{contact_id}")
    assert response.status_code == 200
    assert response.json()["deleted"] == contact_id

    # Verify deleted
    get_resp = client.get(f"/contacts/{contact_id}")
    assert get_resp.status_code == 404


def test_delete_contact_not_found():
    """Test deleting non-existent contact."""
    response = client.delete("/contacts/CNT-NONEXIST")
    assert response.status_code == 404


def test_add_tag():
    """Test adding a tag to contact."""
    create_resp = client.post("/contacts", json={"email": "john@example.com", "tags": ["customer"]})
    contact_id = create_resp.json()["contact_id"]

    response = client.post(f"/contacts/{contact_id}/tag?tag=vip")
    assert response.status_code == 200
    data = response.json()
    assert "vip" in data["tags"]
    assert "customer" in data["tags"]


def test_remove_tag():
    """Test removing a tag from contact."""
    create_resp = client.post("/contacts", json={"email": "john@example.com", "tags": ["customer", "vip"]})
    contact_id = create_resp.json()["contact_id"]

    response = client.delete(f"/contacts/{contact_id}/tag/vip")
    assert response.status_code == 200
    data = response.json()
    assert "vip" not in data["tags"]
    assert "customer" in data["tags"]


def test_set_opt_out():
    """Test setting opt-out status."""
    create_resp = client.post("/contacts", json={"email": "john@example.com", "opt_out": False})
    contact_id = create_resp.json()["contact_id"]

    # Opt out
    response = client.put(f"/contacts/{contact_id}/opt-out?opt_out=true")
    assert response.status_code == 200
    assert response.json()["opt_out"] is True

    # Opt back in
    response = client.put(f"/contacts/{contact_id}/opt-out?opt_out=false")
    assert response.status_code == 200
    assert response.json()["opt_out"] is False


def test_import_contacts():
    """Test bulk importing contacts."""
    response = client.post("/contacts/import", json={
        "contacts": [
            {"email": "a@example.com", "first_name": "A", "tags": ["imported"]},
            {"email": "b@example.com", "first_name": "B"},
            {"email": "c@example.com"},
        ]
    })
    assert response.status_code == 200
    data = response.json()
    assert data["imported"] == 3
    assert data["failed"] == 0

    # Verify they were created
    list_resp = client.get("/contacts")
    assert len(list_resp.json()) == 3


def test_import_contacts_with_duplicates():
    """Test import skips duplicate emails."""
    client.post("/contacts", json={"email": "existing@example.com"})

    response = client.post("/contacts/import", json={
        "contacts": [
            {"email": "new@example.com"},
            {"email": "existing@example.com"},  # Duplicate
        ]
    })
    assert response.status_code == 200
    data = response.json()
    assert data["imported"] == 1
    assert data["failed"] == 1


def test_import_contacts_missing_email():
    """Test import handles missing emails."""
    response = client.post("/contacts/import", json={
        "contacts": [
            {"email": "valid@example.com"},
            {"first_name": "No Email"},  # Missing email
        ]
    })
    assert response.status_code == 200
    data = response.json()
    assert data["imported"] == 1
    assert data["failed"] == 1


def test_contact_ordering():
    """Test that contacts are returned newest first."""
    resp1 = client.post("/contacts", json={"email": "first@example.com"})
    resp2 = client.post("/contacts", json={"email": "second@example.com"})

    response = client.get("/contacts")
    data = response.json()
    # Newest should be first
    assert data[0]["email"] == "second@example.com"
    assert data[1]["email"] == "first@example.com"
