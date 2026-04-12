from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    plaid_client_id: str | None = None
    plaid_secret: str | None = None
    plaid_environment: str = "sandbox"
    plaid_products: str = "transactions"
    plaid_country_codes: str = "US"
    plaid_client_name: str = "Drift"
    plaid_transactions_days_requested: int = 730

    model_config = SettingsConfigDict(
        env_file=(".env", "apps/api/.env"),
        env_prefix="DRIFT_",
        extra="ignore",
    )

    @property
    def plaid_base_url(self) -> str:
        if self.plaid_environment == "production":
            return "https://production.plaid.com"
        if self.plaid_environment == "development":
            return "https://development.plaid.com"
        return "https://sandbox.plaid.com"

    @property
    def plaid_is_configured(self) -> bool:
        return bool(self.plaid_client_id and self.plaid_secret)


@lru_cache
def get_settings() -> Settings:
    return Settings()
