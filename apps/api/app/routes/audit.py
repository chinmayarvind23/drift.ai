from fastapi import APIRouter

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/status")
def audit_status() -> dict[str, int | str]:
    return {
        "workflow": "private_lifestyle_audit",
        "baseline_months": 3,
        "recent_months": 3,
    }
