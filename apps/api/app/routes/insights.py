from fastapi import APIRouter

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("/tags")
def insight_tags() -> dict[str, list[str]]:
    return {
        "tags": [
            "reward_spending",
            "social_pressure",
            "habit_creep",
            "life_event",
            "intentional_upgrade",
            "stress_convenience",
            "unknown",
        ]
    }
