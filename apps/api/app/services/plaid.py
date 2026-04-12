import asyncio
import json
from calendar import monthrange
from typing import Any
from datetime import date, timedelta

import httpx

from app.core.settings import Settings


class PlaidNotConfiguredError(RuntimeError):
    pass


class PlaidProductNotReadyError(RuntimeError):
    pass


class PlaidService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._sleep = asyncio.sleep

    async def create_link_token(self, user_id: str) -> dict[str, Any]:
        self._ensure_configured()
        payload = {
            "client_id": self.settings.plaid_client_id,
            "secret": self.settings.plaid_secret,
            "client_name": self.settings.plaid_client_name,
            "user": {"client_user_id": user_id},
            "products": self.settings.plaid_products.split(","),
            "country_codes": self.settings.plaid_country_codes.split(","),
            "language": "en",
            "transactions": {
                "days_requested": self.settings.plaid_transactions_days_requested,
            },
        }
        return await self._post("/link/token/create", payload)

    async def exchange_public_token(self, public_token: str) -> dict[str, Any]:
        self._ensure_configured()
        return await self._post(
            "/item/public_token/exchange",
            {
                "client_id": self.settings.plaid_client_id,
                "secret": self.settings.plaid_secret,
                "public_token": public_token,
            },
        )

    async def create_sandbox_public_token(self) -> dict[str, Any]:
        self._ensure_configured()
        custom_user = build_overspend_custom_user()
        transactions = custom_user["override_accounts"][0]["transactions"]
        return await self._post(
            "/sandbox/public_token/create",
            {
                "client_id": self.settings.plaid_client_id,
                "secret": self.settings.plaid_secret,
                "institution_id": "ins_109508",
                "initial_products": self.settings.plaid_products.split(","),
                "options": {
                    "override_username": "user_custom",
                    "override_password": json.dumps(custom_user),
                    "transactions": {
                        "start_date": min(
                            transaction["date_posted"] for transaction in transactions
                        ),
                        "end_date": date.today().isoformat(),
                    },
                },
            },
        )

    async def sync_transactions(self, access_token: str, cursor: str | None = None) -> dict[str, Any]:
        self._ensure_configured()
        payload: dict[str, Any] = {
            "client_id": self.settings.plaid_client_id,
            "secret": self.settings.plaid_secret,
            "access_token": access_token,
        }
        if cursor:
            payload["cursor"] = cursor
        sync_response = await self._post("/transactions/sync", payload)

        if cursor:
            return sync_response

        transactions_response = await self.get_transactions_when_ready(access_token)
        return {
            **sync_response,
            "added": transactions_response.get("transactions", []),
            "modified": sync_response.get("modified", []),
            "removed": sync_response.get("removed", []),
        }

    async def get_transactions_when_ready(self, access_token: str) -> dict[str, Any]:
        for attempt in range(3):
            try:
                response = await self.get_transactions(access_token)
                if attempt == 2 or has_enough_months(response.get("transactions", [])):
                    return response
            except PlaidProductNotReadyError:
                if attempt == 2:
                    raise
            await self._sleep(2)

        return {"transactions": []}

    async def get_transactions(self, access_token: str) -> dict[str, Any]:
        self._ensure_configured()
        end_date = date.today()
        start_date = end_date - timedelta(days=self.settings.plaid_transactions_days_requested)
        return await self._post(
            "/transactions/get",
            {
                "client_id": self.settings.plaid_client_id,
                "secret": self.settings.plaid_secret,
                "access_token": access_token,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "options": {
                    "count": 500,
                    "offset": 0,
                },
            },
        )

    async def _post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        async with httpx.AsyncClient(base_url=self.settings.plaid_base_url, timeout=20) as client:
            response = await client.post(path, json=payload)
            if response.status_code == 400:
                try:
                    error_payload = response.json()
                except ValueError:
                    error_payload = {}
                if error_payload.get("error_code") == "PRODUCT_NOT_READY":
                    raise PlaidProductNotReadyError("Plaid Transactions is not ready yet.")
            response.raise_for_status()
            return response.json()

    def _ensure_configured(self) -> None:
        if not self.settings.plaid_is_configured:
            raise PlaidNotConfiguredError("Plaid sandbox credentials are not configured.")


def build_overspend_custom_user() -> dict[str, Any]:
    months = complete_months_before(date.today(), count=8)
    transactions: list[dict[str, Any]] = []

    for index, month in enumerate(months):
        recent = index >= 4
        transactions.extend(
            [
                build_custom_transaction(month, 4, 55 if not recent else 145, "Sweetgreen Restaurant"),
                build_custom_transaction(month, 9, 42 if not recent else 118, "Uber Trip"),
                build_custom_transaction(month, 14, 65 if not recent else 185, "Target Store"),
                build_custom_transaction(month, 19, 110, "Whole Foods Market"),
            ]
        )

    return {
        "override_accounts": [
            {
                "type": "depository",
                "subtype": "checking",
                "starting_balance": 15000,
                "transactions": transactions,
            }
        ]
    }


def complete_months_before(anchor: date, count: int) -> list[date]:
    first_of_current_month = anchor.replace(day=1)
    months = []
    cursor = add_months(first_of_current_month, -count)

    for _ in range(count):
        months.append(cursor)
        cursor = add_months(cursor, 1)

    return months


def add_months(value: date, months: int) -> date:
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    day = min(value.day, monthrange(year, month)[1])

    return date(year, month, day)


def build_custom_transaction(
    month: date,
    day: int,
    amount: int,
    description: str,
) -> dict[str, Any]:
    posted_date = month.replace(day=day + 1)

    return {
        "date_transacted": month.replace(day=day).isoformat(),
        "date_posted": posted_date.isoformat(),
        "currency": "USD",
        "amount": amount,
        "description": description,
    }


def has_enough_months(transactions: list[dict[str, Any]]) -> bool:
    return len({transaction.get("date", "")[:7] for transaction in transactions}) >= 2
