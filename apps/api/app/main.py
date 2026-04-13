from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.settings import Settings, get_settings
from app.schemas import HealthResponse
from app.routes.audit import router as audit_router
from app.routes.evidence import router as evidence_router
from app.routes.insights import router as insights_router
from app.routes.plaid import router as plaid_router
from app.routes.settings import router as settings_router

app = FastAPI(title="Drift API", version="0.1.0")

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(audit_router)
app.include_router(evidence_router)
app.include_router(insights_router)
app.include_router(plaid_router)
app.include_router(settings_router)


@app.get("/health", response_model=HealthResponse)
def health(settings: Settings = Depends(get_settings)) -> HealthResponse:
    return HealthResponse(status="ok", plaid_configured=settings.plaid_is_configured)
