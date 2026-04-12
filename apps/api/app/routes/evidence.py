from fastapi import APIRouter

router = APIRouter(prefix="/evidence", tags=["evidence"])


CATEGORIES = [
    "Dining",
    "Delivery",
    "Coffee",
    "Groceries",
    "Shopping",
    "Subscriptions",
    "Software",
    "Travel",
    "Rides",
    "Rent Adjacent",
    "Fitness",
    "Wellness",
    "Health",
    "Education",
    "Entertainment",
    "Home",
    "Utilities",
    "Other",
]


@router.get("/taxonomy")
def evidence_taxonomy() -> dict[str, list[str]]:
    return {"categories": CATEGORIES}
