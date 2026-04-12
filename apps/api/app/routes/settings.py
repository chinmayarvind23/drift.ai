from fastapi import APIRouter

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/privacy")
def privacy_settings() -> dict[str, str]:
    return {
        "raw_transactions": "local_only",
        "local_edits": "local_only",
        "cloud_backup": "opt_in",
        "ai_inputs": "category_summaries_only",
    }
