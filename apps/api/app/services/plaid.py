from typing import Any

import httpx

from app.core.settings import Settings


class PlaidNotConfiguredError(RuntimeError):
    pass


class PlaidService:
    def __init__(self, settings: Settings):
        self.settings = settings

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

    async def sync_transactions(self, access_token: str, cursor: str | None = None) -> dict[str, Any]:
        self._ensure_configured()
        payload: dict[str, Any] = {
            "client_id": self.settings.plaid_client_id,
            "secret": self.settings.plaid_secret,
            "access_token": access_token,
        }
        if cursor:
            payload["cursor"] = cursor
        return await self._post("/transactions/sync", payload)

    async def _post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        async with httpx.AsyncClient(base_url=self.settings.plaid_base_url, timeout=20) as client:
            response = await client.post(path, json=payload)
            response.raise_for_status()
            return response.json()

    def _ensure_configured(self) -> None:
        if not self.settings.plaid_is_configured:
            raise PlaidNotConfiguredError("Plaid sandbox credentials are not configured.")
