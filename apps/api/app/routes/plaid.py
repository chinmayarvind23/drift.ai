from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.core.settings import Settings, get_settings
from app.schemas import (
    PlaidLinkTokenRequest,
    PlaidStatusResponse,
    PlaidSyncRequest,
    PlaidTokenExchangeRequest,
    PlaidUnavailableResponse,
)
from app.services.plaid import PlaidNotConfiguredError, PlaidService

router = APIRouter(prefix="/plaid", tags=["plaid"])

PLAID_ROUTES = [
    "/plaid/status",
    "/plaid/link-token",
    "/plaid/exchange-token",
    "/plaid/sandbox/public-token",
    "/plaid/sync",
]


@router.get("/status", response_model=PlaidStatusResponse)
def plaid_status(settings: Settings = Depends(get_settings)) -> PlaidStatusResponse:
    return PlaidStatusResponse(
        configured=settings.plaid_is_configured,
        mode=settings.plaid_environment,
        routes=PLAID_ROUTES,
    )


@router.post("/link-token")
async def create_link_token(
    request: PlaidLinkTokenRequest,
    settings: Settings = Depends(get_settings),
):
    plaid = PlaidService(settings)
    try:
        return await plaid.create_link_token(request.user_id)
    except PlaidNotConfiguredError:
        return plaid_unavailable()


@router.post("/exchange-token")
async def exchange_token(
    request: PlaidTokenExchangeRequest,
    settings: Settings = Depends(get_settings),
):
    plaid = PlaidService(settings)
    try:
        return await plaid.exchange_public_token(request.public_token)
    except PlaidNotConfiguredError:
        return plaid_unavailable()


@router.post("/sandbox/public-token")
async def create_sandbox_public_token(
    request: PlaidLinkTokenRequest,
    settings: Settings = Depends(get_settings),
):
    plaid = PlaidService(settings)
    try:
        return await plaid.create_sandbox_public_token()
    except PlaidNotConfiguredError:
        return plaid_unavailable(
            "Set DRIFT_PLAID_CLIENT_ID and DRIFT_PLAID_SECRET to enable Plaid sandbox public tokens."
        )


@router.post("/sync")
async def sync_transactions(
    request: PlaidSyncRequest,
    settings: Settings = Depends(get_settings),
):
    plaid = PlaidService(settings)
    try:
        return await plaid.sync_transactions(request.access_token, request.cursor)
    except PlaidNotConfiguredError:
        return plaid_unavailable()


def plaid_unavailable(
    message: str = "Set DRIFT_PLAID_CLIENT_ID and DRIFT_PLAID_SECRET to enable Plaid sandbox."
) -> JSONResponse:
    payload = PlaidUnavailableResponse(
        message=message,
        required_env=["DRIFT_PLAID_CLIENT_ID", "DRIFT_PLAID_SECRET"],
    )
    return JSONResponse(status_code=503, content=payload.model_dump())
