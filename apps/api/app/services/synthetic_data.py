from app.schemas import SyntheticUserSummary


SYNTHETIC_USERS = [
    SyntheticUserSummary(
        id="maya-new-job",
        name="Maya Chen",
        scenario="New job reward spending",
        income_event="Started a higher-paying product role in January.",
        transaction_count=90,
    ),
    SyntheticUserSummary(
        id="jordan-new-city",
        name="Jordan Ellis",
        scenario="Moved cities",
        income_event="Moved to Chicago after a promotion.",
        transaction_count=90,
    ),
    SyntheticUserSummary(
        id="sam-subscriptions",
        name="Sam Rivera",
        scenario="Subscription creep",
        income_event="Freelance income became steady.",
        transaction_count=90,
    ),
    SyntheticUserSummary(
        id="nina-stress-convenience",
        name="Nina Patel",
        scenario="Stress convenience spending",
        income_event="Started a demanding manager role.",
        transaction_count=90,
    ),
    SyntheticUserSummary(
        id="alex-stable",
        name="Alex Morgan",
        scenario="Mostly stable spender",
        income_event="Got a raise and kept routines mostly unchanged.",
        transaction_count=90,
    ),
]
