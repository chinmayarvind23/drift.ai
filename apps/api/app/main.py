from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.settings import Settings, get_settings
from app.schemas import (
    HealthResponse,
    PlaidLinkTokenRequest,
    PlaidSyncRequest,
    PlaidTokenExchangeRequest,
    PlaidUnavailableResponse,
    SyntheticUserSummary,
)
from app.services.plaid import PlaidNotConfiguredError, PlaidService
from app.services.synthetic_data import SYNTHETIC_USERS

app = FastAPI(title="Drift API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health(settings: Settings = Depends(get_settings)) -> HealthResponse:
    return HealthResponse(status="ok", plaid_configured=settings.plaid_is_configured)


@app.get("/demo/users", response_model=list[SyntheticUserSummary])
def demo_users() -> list[SyntheticUserSummary]:
    return SYNTHETIC_USERS


@app.post("/plaid/link-token")
async def create_link_token(
    request: PlaidLinkTokenRequest,
    settings: Settings = Depends(get_settings),
):
    plaid = PlaidService(settings)
    try:
        return await plaid.create_link_token(request.user_id)
    except PlaidNotConfiguredError:
        return plaid_unavailable()


@app.post("/plaid/exchange-token")
async def exchange_token(
    request: PlaidTokenExchangeRequest,
    settings: Settings = Depends(get_settings),
):
    plaid = PlaidService(settings)
    try:
        return await plaid.exchange_public_token(request.public_token)
    except PlaidNotConfiguredError:
        return plaid_unavailable()


@app.post("/plaid/sync")
async def sync_transactions(
    request: PlaidSyncRequest,
    settings: Settings = Depends(get_settings),
):
    plaid = PlaidService(settings)
    try:
        return await plaid.sync_transactions(request.access_token, request.cursor)
    except PlaidNotConfiguredError:
        return plaid_unavailable()


def plaid_unavailable() -> JSONResponse:
    payload = PlaidUnavailableResponse(
        message="Set DRIFT_PLAID_CLIENT_ID and DRIFT_PLAID_SECRET to enable Plaid sandbox.",
        required_env=["DRIFT_PLAID_CLIENT_ID", "DRIFT_PLAID_SECRET"],
    )
    return JSONResponse(status_code=503, content=payload.model_dump())
