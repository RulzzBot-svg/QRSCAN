from datetime import date, timedelta

def compute_ahu_status_from_filters(filters, due_soon_days=7):
    """
    Compute AHU status based on its filters.
    - next_due_date = earliest upcoming due date among filters (if any)
    - status is worst-case:
        Overdue > Due Soon > Completed > Pending
    """

    today = date.today()

    # No filters at all -> Pending
    if not filters:
        return {
            "status": "Pending",
            "next_due_date": None,
            "days_until_due": None,
            "days_overdue": None,
        }

    next_due_candidates = []
    any_overdue = False
    any_due_soon = False
    any_scheduled = False

    for f in filters:
        # If a filter doesn't have scheduling info yet -> treat as Pending-ish
        if not f.last_service_date or not f.frequency_days:
            continue

        any_scheduled = True
        next_due = f.last_service_date + timedelta(days=f.frequency_days)
        next_due_candidates.append(next_due)

        if today > next_due:
            any_overdue = True
        elif today >= next_due - timedelta(days=due_soon_days):
            any_due_soon = True

    # If none of the filters have schedule info, overall is Pending
    if not any_scheduled:
        return {
            "status": "Pending",
            "next_due_date": None,
            "days_until_due": None,
            "days_overdue": None,
        }

    closest_due = min(next_due_candidates)
    if today > closest_due:
        return {
            "status": "Overdue",
            "next_due_date": closest_due.isoformat(),
            "days_until_due": 0,
            "days_overdue": (today - closest_due).days,
        }

    if any_overdue:
        # this case shouldn't happen since closest_due would also be overdue
        return {
            "status": "Overdue",
            "next_due_date": closest_due.isoformat(),
            "days_until_due": 0,
            "days_overdue": (today - closest_due).days,
        }

    if any_due_soon:
        return {
            "status": "Due Soon",
            "next_due_date": closest_due.isoformat(),
            "days_until_due": (closest_due - today).days,
            "days_overdue": 0,
        }

    return {
        "status": "Completed",
        "next_due_date": closest_due.isoformat(),
        "days_until_due": (closest_due - today).days,
        "days_overdue": 0,
    }
