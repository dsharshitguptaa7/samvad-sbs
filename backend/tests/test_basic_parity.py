import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import SessionLocal
from backend.app.models.entities import User, WorkflowConfiguration

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["service"] == "SAMVAD FastAPI Backend"

def test_public_departments():
    res = client.get("/api/departments")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0
    # verify department structure
    first = data[0]
    assert "name" in first
    assert "code" in first
    assert "courses" in first

def test_anonymous_track_not_found():
    res = client.get("/api/track?trackingNumber=NON_EXISTENT_REF_99999")
    assert res.status_code == 404

def test_unauthenticated_protected_route():
    res = client.get("/api/auth/me")
    assert res.status_code == 401

def test_workflow_config_unauthenticated():
    res = client.get("/api/admin/workflow")
    assert res.status_code == 401
