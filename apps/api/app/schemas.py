from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    plaid_configured: bool


class SyntheticUserSummary(BaseModel):
    id: str
    name: str
    scenario: str
    income_event: str
    transaction_count: int = Field(ge=0)


class PlaidLinkTokenRequest(BaseModel):
    user_id: str = Field(min_length=1)


class PlaidTokenExchangeRequest(BaseModel):
    public_token: str = Field(min_length=1)


class PlaidSyncRequest(BaseModel):
    access_token: str = Field(min_length=1)
    cursor: str | None = None


class PlaidUnavailableResponse(BaseModel):
    configured: bool = False
    message: str
    required_env: list[str]


class PlaidStatusResponse(BaseModel):
    configured: bool
    mode: str
    routes: list[str]
