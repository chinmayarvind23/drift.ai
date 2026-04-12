from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_reports_plaid_configuration_state():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["plaid_configured"] is False


def test_demo_users_return_multiple_dummy_profiles():
    response = client.get("/demo/users")

    assert response.status_code == 200
    users = response.json()
    assert len(users) >= 5
    assert users[0]["transaction_count"] >= 90


def test_plaid_link_token_requires_credentials():
    response = client.post("/plaid/link-token", json={"user_id": "demo-user"})

    assert response.status_code == 503
    assert response.json()["configured"] is False
    assert "DRIFT_PLAID_CLIENT_ID" in response.json()["required_env"]
