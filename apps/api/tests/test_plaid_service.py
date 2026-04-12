import asyncio
import json

from app.core.settings import Settings
from app.services.plaid import PlaidProductNotReadyError, PlaidService


def configured_settings() -> Settings:
    return Settings(
        _env_file=None,
        plaid_client_id="client-id",
        plaid_secret="secret",
        plaid_transactions_days_requested=730,
    )


def test_sandbox_public_token_uses_custom_overspend_user():
    captured_payloads = []
    service = PlaidService(configured_settings())

    async def capture_post(path, payload):
        captured_payloads.append((path, payload))
        return {"public_token": "public-token"}

    service._post = capture_post

    response = asyncio.run(service.create_sandbox_public_token())

    assert response == {"public_token": "public-token"}
    path, payload = captured_payloads[0]
    assert path == "/sandbox/public_token/create"
    assert payload["options"]["override_username"] == "user_custom"
    assert payload["options"]["transactions"]["start_date"] < payload["options"]["transactions"]["end_date"]

    custom_user = json.loads(payload["options"]["override_password"])
    account = custom_user["override_accounts"][0]
    transactions = account["transactions"]
    dining = [
        transaction["amount"]
        for transaction in sorted(transactions, key=lambda transaction: transaction["date_posted"])
        if transaction["description"] == "Sweetgreen Restaurant"
    ]
    midpoint = len(dining) // 2

    assert len(transactions) >= 32
    assert sum(dining[midpoint:]) > sum(dining[:midpoint])
    assert "version" not in custom_user
    assert "inflow_model" not in account


def test_sync_transactions_retries_custom_sandbox_until_transactions_are_ready():
    calls = []
    service = PlaidService(configured_settings())

    async def fake_post(path, payload):
        calls.append(path)
        if path == "/transactions/sync":
            return {"added": [], "modified": [], "removed": [], "has_more": False}
        if calls.count("/transactions/get") == 1:
            raise PlaidProductNotReadyError("not ready")
        return {
            "transactions": [
                {
                    "transaction_id": "txn-1",
                    "date": "2026-02-16",
                    "name": "Sweetgreen Restaurant",
                    "amount": 55,
                },
                {
                    "transaction_id": "txn-2",
                    "date": "2026-03-16",
                    "name": "Sweetgreen Restaurant",
                    "amount": 145,
                }
            ]
        }

    async def no_sleep(_seconds):
        return None

    service._post = fake_post
    service._sleep = no_sleep

    response = asyncio.run(service.sync_transactions("access-token"))

    assert response["added"][1]["transaction_id"] == "txn-2"
    assert calls == ["/transactions/sync", "/transactions/get", "/transactions/get"]


def test_initial_sync_uses_full_transaction_range_when_sync_returns_recent_subset():
    calls = []
    service = PlaidService(configured_settings())

    async def fake_post(path, payload):
        calls.append(path)
        if path == "/transactions/sync":
            return {
                "added": [
                    {
                        "transaction_id": "recent-only",
                        "date": "2026-03-16",
                        "name": "Target Store",
                        "amount": 185,
                    }
                ],
                "modified": [],
                "removed": [],
                "has_more": False,
            }
        return {
            "transactions": [
                {
                    "transaction_id": "baseline",
                    "date": "2025-08-05",
                    "name": "Sweetgreen Restaurant",
                    "amount": 55,
                },
                {
                    "transaction_id": "recent",
                    "date": "2026-03-05",
                    "name": "Sweetgreen Restaurant",
                    "amount": 145,
                },
            ]
        }

    service._post = fake_post

    response = asyncio.run(service.sync_transactions("access-token"))

    assert [transaction["transaction_id"] for transaction in response["added"]] == [
        "baseline",
        "recent",
    ]
    assert calls == ["/transactions/sync", "/transactions/get"]


def test_get_transactions_retries_when_sandbox_returns_only_one_month_initially():
    calls = []
    service = PlaidService(configured_settings())

    async def fake_post(path, payload):
        calls.append(path)
        if len(calls) == 1:
            return {
                "transactions": [
                    {
                        "transaction_id": "recent-only",
                        "date": "2026-03-16",
                        "name": "Target Store",
                        "amount": 185,
                    }
                ]
            }
        return {
            "transactions": [
                {
                    "transaction_id": "baseline",
                    "date": "2025-08-05",
                    "name": "Sweetgreen Restaurant",
                    "amount": 55,
                },
                {
                    "transaction_id": "recent",
                    "date": "2026-03-05",
                    "name": "Sweetgreen Restaurant",
                    "amount": 145,
                },
            ]
        }

    async def no_sleep(_seconds):
        return None

    service._post = fake_post
    service._sleep = no_sleep

    response = asyncio.run(service.get_transactions_when_ready("access-token"))

    assert len(response["transactions"]) == 2
    assert calls == ["/transactions/get", "/transactions/get"]
