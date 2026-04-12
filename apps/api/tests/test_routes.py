from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_audit_status_route_describes_scan_windows():
    response = client.get("/audit/status")

    assert response.status_code == 200
    assert response.json()["baseline_months"] == 3
    assert response.json()["recent_months"] == 3


def test_evidence_taxonomy_route_returns_stable_categories():
    response = client.get("/evidence/taxonomy")

    assert response.status_code == 200
    assert "Education" in response.json()["categories"]
    assert "Travel" in response.json()["categories"]


def test_settings_privacy_route_explains_storage_boundaries():
    response = client.get("/settings/privacy")

    assert response.status_code == 200
    assert response.json()["raw_transactions"] == "local_only"


def test_insights_tags_route_returns_behavior_tags():
    response = client.get("/insights/tags")

    assert response.status_code == 200
    assert "reward_spending" in response.json()["tags"]
