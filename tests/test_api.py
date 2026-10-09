from app.main import app
from fastapi.testclient import TestClient


def test_dashboard_is_available_to_viewer() -> None:
    with TestClient(app) as client:
        response = client.get(
            "/api/dashboard", headers={"Authorization": "Bearer demo-viewer-token"}
        )
    assert response.status_code == 200
    assert response.json()["synthetic"] is True
    assert len(response.json()["monthly"]) == 12


def test_viewer_cannot_use_analyst_chat() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/chat",
            headers={"Authorization": "Bearer demo-viewer-token"},
            json={"message": "Average revenue?", "session_id": "test"},
        )
    assert response.status_code == 403


def test_analyst_can_use_demo_chat() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/chat",
            headers={"Authorization": "Bearer demo-analyst-token"},
            json={"message": "Add 1200 and 875", "session_id": "test"},
        )
    assert response.status_code == 200
    assert response.json()["mode"] == "demo"
    assert "2,075.00" in response.json()["answer"]
    trajectory = response.json()["trajectory"]
    assert trajectory
    assert trajectory[-1]["kind"] == "final"


def test_built_frontend_is_served_from_root() -> None:
    with TestClient(app) as client:
        response = client.get("/")
    assert response.status_code == 200
    assert "Ledgerline" in response.text
