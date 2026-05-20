from fastapi.testclient import TestClient

from app.main import app


def test_intake_submit_supports_cors_preflight() -> None:
    client = TestClient(app)

    response = client.options(
        "/intake/submit",
        headers={
            "Origin": "http://127.0.0.1:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") in {
        "http://127.0.0.1:3000",
        "*",
    }
