from fastapi.testclient import TestClient

try:
    from app.main import app
except ModuleNotFoundError:
    from apps.backend.app.main import app


def test_health_returns_ok() -> None:
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
