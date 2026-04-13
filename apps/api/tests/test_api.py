from fastapi.testclient import TestClient

from app.core.settings import Settings, get_settings
from app.main import app


client = TestClient(app)


def unconfigured_settings() -> Settings:
    return Settings(_env_file=None, plaid_client_id=None, plaid_secret=None)


def setup_function():
    app.dependency_overrides[get_settings] = unconfigured_settings


def teardown_function():
    app.dependency_overrides.clear()


def test_health_reports_plaid_configuration_state():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["plaid_configured"] is False


def test_plaid_link_token_requires_credentials():
    response = client.post("/plaid/link-token", json={"user_id": "demo-user"})

    assert response.status_code == 503
    assert response.json()["configured"] is False
    assert "DRIFT_PLAID_CLIENT_ID" in response.json()["required_env"]


def test_plaid_status_lists_sandbox_routes():
    response = client.get("/plaid/status")

    assert response.status_code == 200
    assert response.json()["mode"] == "sandbox"
    assert "/plaid/link-token" in response.json()["routes"]
    assert "/plaid/sandbox/public-token" in response.json()["routes"]


def test_plaid_sandbox_public_token_requires_credentials():
    response = client.post("/plaid/sandbox/public-token", json={"user_id": "demo-user"})

    assert response.status_code == 503
    assert response.json()["configured"] is False
    assert "sandbox" in response.json()["message"].lower()


def test_health_reports_configured_plaid_when_keys_are_present():
    app.dependency_overrides[get_settings] = lambda: Settings(
        _env_file=None,
        plaid_client_id="client-id",
        plaid_secret="secret",
    )

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["plaid_configured"] is True


def test_settings_normalizes_cors_origins():
    settings = Settings(
        _env_file=None,
        allowed_origins="https://drift-ai-lime.vercel.app/, http://localhost:3000"
    )

    assert settings.cors_allowed_origins == [
        "https://drift-ai-lime.vercel.app",
        "http://localhost:3000",
    ]
