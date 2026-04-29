"""
Tests for audience engine requirements (Pack 02).

Requirement 1: Contact schema includes targeting fields
Requirement 2: Audience preview endpoint  
Requirement 3: Campaign execution with contact selection
Requirement 4: Campaign contact snapshot
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services import contact_service, execution_service
from pathlib import Path

client = TestClient(app)

# Clear data before each test
@pytest.fixture(autouse=True)
def clear_data():
    contact_service._save_contacts({})
    execution_service._save_json(execution_service.EXECUTIONS_FILE, {})
    execution_service._save_json(execution_service.EXECUTION_CONTACTS_FILE, {})
    yield
    contact_service._save_contacts({})
    execution_service._save_json(execution_service.EXECUTIONS_FILE, {})
    execution_service._save_json(execution_service.EXECUTION_CONTACTS_FILE, {})


# ========== Requirement 1: Contact Schema ==========

def test_create_contact_with_targeting_fields():
    """Test contact schema includes all targeting fields."""
    response = client.post("/contacts", json={
        "email": "john@example.com",
        "first_name": "John",
        "dob": "1990-05-15",
        "age_group": "26-35",
        "gender": "male",
        "parish": "Kingston",
        "preferred_channel": "email",
        "engagement_score": 0.85,
        "tags": ["target"],
    })
    assert response.status_code == 200
    data = response.json()
    assert data["dob"] == "1990-05-15"
    assert data["age_group"] == "26-35"
    assert data["gender"] == "male"
    assert data["parish"] == "Kingston"
    assert data["preferred_channel"] == "email"
    assert data["engagement_score"] == 0.85


def test_get_contact_includes_targeting_fields():
    """Test that targeting fields are returned."""
    create_resp = client.post("/contacts", json={
        "email": "jane@example.com",
        "parish": "St. Andrew",
        "gender": "female",
        "engagement_score": 0.92,
    })
    contact_id = create_resp.json()["contact_id"]

    response = client.get(f"/contacts/{contact_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["parish"] == "St. Andrew"
    assert data["gender"] == "female"
    assert data["engagement_score"] == 0.92


def test_update_contact_targeting_fields():
    """Test updating targeting fields."""
    create_resp = client.post("/contacts", json={
        "email": "bob@example.com",
        "age_group": "18-25",
    })
    contact_id = create_resp.json()["contact_id"]

    response = client.put(f"/contacts/{contact_id}", json={
        "age_group": "36-50",
        "parish": "Portland",
        "engagement_score": 0.75,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["age_group"] == "36-50"
    assert data["parish"] == "Portland"
    assert data["engagement_score"] == 0.75


def test_list_contacts_filter_by_parish():
    """Test filtering contacts by parish."""
    client.post("/contacts", json={"email": "a@example.com", "parish": "Kingston"})
    client.post("/contacts", json={"email": "b@example.com", "parish": "St. Andrew"})

    response = client.get("/contacts?parish=Kingston")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["parish"] == "Kingston"


def test_list_contacts_filter_by_preferred_channel():
    """Test filtering by preferred channel."""
    client.post("/contacts", json={"email": "a@example.com", "preferred_channel": "email"})
    client.post("/contacts", json={"email": "b@example.com", "preferred_channel": "sms"})

    response = client.get("/contacts?preferred_channel=email")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1


# ========== Requirement 2: Audience Preview ==========

def test_audience_preview_endpoint():
    """Test that audience preview returns metrics only (no raw contacts)."""
    # Create contacts with various attributes
    client.post("/contacts", json={
        "email": "a@example.com", "parish": "Kingston", 
        "age_group": "26-35", "gender": "male", "preferred_channel": "email",
        "engagement_score": 0.9,
    })
    client.post("/contacts", json={
        "email": "b@example.com", "parish": "Kingston",
        "age_group": "26-35", "gender": "female", "preferred_channel": "sms",
        "engagement_score": 0.8,
    })
    client.post("/contacts", json={
        "email": "c@example.com", "parish": "St. Andrew",
        "age_group": "36-50", "gender": "female",
    })

    response = client.get("/contacts/audience-preview")
    assert response.status_code == 200
    data = response.json()

    # Should return metrics, NOT raw contacts
    assert "total_contacts" in data
    assert "channel_breakdown" in data
    assert "parish_breakdown" in data
    assert "age_group_breakdown" in data
    assert "gender_breakdown" in data
    assert "avg_engagement_score" in data
    assert "filters_applied" in data

    # Verify no raw contact data is returned
    assert "email" not in data
    assert "contact_id" not in data
    assert data["total_contacts"] == 3


def test_audience_preview_with_filters():
    """Test audience preview with filters."""
    client.post("/contacts", json={
        "email": "a@example.com", "parish": "Kingston", "gender": "male",
    })
    client.post("/contacts", json={
        "email": "b@example.com", "parish": "St. Andrew", "gender": "female",
    })

    response = client.get("/contacts/audience-preview?parish=Kingston")
    assert response.status_code == 200
    data = response.json()
    assert data["total_contacts"] == 1
    assert data["filters_applied"]["parish"] == "Kingston"


def test_audience_preview_excludes_opt_out():
    """Test that opt-out contacts are excluded by default."""
    client.post("/contacts", json={
        "email": "a@example.com", "opt_out": False,
    })
    client.post("/contacts", json={
        "email": "b@example.com", "opt_out": True,
    })

    # Default: exclude opt-outs
    response = client.get("/contacts/audience-preview")
    assert response.status_code == 200
    data = response.json()
    assert data["total_contacts"] == 1

    # Include opt-outs
    response = client.get("/contacts/audience-preview?include_opt_out=true")
    assert response.status_code == 200
    data = response.json()
    assert data["total_contacts"] == 2


def test_audience_preview_engagement_filter():
    """Test filtering by minimum engagement score."""
    client.post("/contacts", json={
        "email": "a@example.com", "engagement_score": 0.9,
    })
    client.post("/contacts", json={
        "email": "b@example.com", "engagement_score": 0.5,
    })

    response = client.get("/contacts/audience-preview?engagement_min=0.8")
    assert response.status_code == 200
    data = response.json()
    assert data["total_contacts"] == 1


# ========== Requirement 3: Campaign Execution ==========

def test_campaign_execution_selects_contacts():
    """Test that execution selects contacts properly."""
    # Create contacts
    r1 = client.post("/contacts", json={"email": "a@example.com", "preferred_channel": "email"})
    r2 = client.post("/contacts", json={"email": "b@example.com", "preferred_channel": "sms"})
    r3 = client.post("/contacts", json={"email": "c@example.com", "opt_out": True})  # Should be excluded

    # Create a session with reach limit
    session_resp = client.post("/campaigns/session/start", json={"client_email": "test@example.com"})
    session_id = session_resp.json()["session_id"]

    # Update session with reach limit
    from app.services import campaign_service
    sessions = campaign_service._load_sessions()
    sessions[session_id]["estimated_reachable"] = 2  # Limit to 2 contacts
    sessions[session_id]["channel_split"] = "email:100%"
    campaign_service._save_sessions(sessions)

    # Execute campaign
    exec_resp = client.post(f"/campaigns/{session_id}/execute")
    assert exec_resp.status_code == 200
    exec_data = exec_resp.json()
    assert exec_data["status"] == "executed"

    # Check that contact IDs were stored
    execution_id = exec_data["execution_id"]
    contact_ids = execution_service.get_execution_contacts(execution_id)
    assert contact_ids is not None
    assert len(contact_ids) <= 2  # Respects reach limit


def test_campaign_execution_excludes_opt_outs():
    """Test that opt-out contacts are excluded from execution."""
    client.post("/contacts", json={"email": "a@example.com", "opt_out": False})
    client.post("/contacts", json={"email": "b@example.com", "opt_out": True})

    session_resp = client.post("/campaigns/session/start", json={"client_email": "test@example.com"})
    session_id = session_resp.json()["session_id"]

    sessions = contact_service._load_contacts.__globals__  # Hack to get sessions
    # Actually use campaign_service
    from app.services import campaign_service
    sessions = campaign_service._load_sessions()
    sessions[session_id]["estimated_reachable"] = 100
    campaign_service._save_sessions(sessions)

    exec_resp = client.post(f"/campaigns/{session_id}/execute")
    exec_data = exec_resp.json()
    execution_id = exec_data["execution_id"]

    contact_ids = execution_service.get_execution_contacts(execution_id)
    # Should only include non-opt-out contacts
    assert len(contact_ids) == 1


def test_campaign_execution_avoids_duplicates():
    """Test that duplicate emails are not included."""
    # Create two contacts with same email (shouldn't happen, but test dedup logic)
    client.post("/contacts", json={"email": "same@example.com", "first_name": "A"})
    client.post("/contacts", json={"email": "same@example.com", "first_name": "B"})

    session_resp = client.post("/campaigns/session/start", json={"client_email": "test@example.com"})
    session_id = session_resp.json()["session_id"]

    from app.services import campaign_service
    sessions = campaign_service._load_sessions()
    sessions[session_id]["estimated_reachable"] = 100
    campaign_service._save_sessions(sessions)

    exec_resp = client.post(f"/campaigns/{session_id}/execute")
    exec_data = exec_resp.json()
    execution_id = exec_data["execution_id"]

    contact_ids = execution_service.get_execution_contacts(execution_id)
    # Should deduplicate by email
    assert len(contact_ids) <= 1


# ========== Requirement 4: Contact Snapshot ==========

def test_execution_stores_contact_ids():
    """Test that execution stores exact contact IDs used."""
    r1 = client.post("/contacts", json={"email": "a@example.com"})
    r2 = client.post("/contacts", json={"email": "b@example.com"})
    id1 = r1.json()["contact_id"]
    id2 = r2.json()["contact_id"]

    session_resp = client.post("/campaigns/session/start", json={"client_email": "test@example.com"})
    session_id = session_resp.json()["session_id"]

    from app.services import campaign_service
    sessions = campaign_service._load_sessions()
    sessions[session_id]["estimated_reachable"] = 100
    campaign_service._save_sessions(sessions)

    exec_resp = client.post(f"/campaigns/{session_id}/execute")
    exec_data = exec_resp.json()
    execution_id = exec_data["execution_id"]

    # Verify contact IDs are stored
    contact_ids = execution_service.get_execution_contacts(execution_id)
    assert contact_ids is not None
    assert len(contact_ids) == 2
    assert id1 in contact_ids
    assert id2 in contact_ids


def test_execution_snapshot_persists():
    """Test that the snapshot persists in JSON file."""
    client.post("/contacts", json={"email": "a@example.com"})

    session_resp = client.post("/campaigns/session/start", json={"client_email": "test@example.com"})
    session_id = session_resp.json()["session_id"]

    from app.services import campaign_service
    sessions = campaign_service._load_sessions()
    sessions[session_id]["estimated_reachable"] = 100
    campaign_service._save_sessions(sessions)

    exec_resp = client.post(f"/campaigns/{session_id}/execute")
    execution_id = exec_resp.json()["execution_id"]

    # Reload from file
    loaded = execution_service._load_json(execution_service.EXECUTION_CONTACTS_FILE)
    assert execution_id in loaded
    assert "contact_ids" in loaded[execution_id]
    assert len(loaded[execution_id]["contact_ids"]) == 1


def test_get_execution_history():
    """Test retrieving execution history with contact info."""
    client.post("/contacts", json={"email": "a@example.com"})

    session_resp = client.post("/campaigns/session/start", json={"client_email": "test@example.com"})
    session_id = session_resp.json()["session_id"]

    from app.services import campaign_service
    sessions = campaign_service._load_sessions()
    sessions[session_id]["estimated_reachable"] = 100
    campaign_service._save_sessions(sessions)

    client.post(f"/campaigns/{session_id}/execute")

    response = client.get("/campaigns/executions")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert "contact_ids" not in data[0]  # Should not expose in list

    # Get specific execution contacts
    execution_id = data[0]["execution_id"]
    contacts = execution_service.get_execution_contacts(execution_id)
    assert contacts is not None
