from datetime import date, timedelta

def compute_ahu_status(ahu):
    if not ahu.last_service_date:
        return {
            "status": "Pending",
            "next_due_date": None,
            "days_overdue": None,
            "days_until_due": None
        }

    next_due = ahu.last_service_date + timedelta(days=ahu.frequency_days)
    today = date.today()

    if today > next_due:
        return {
            "status": "Overdue",
            "next_due_date": next_due.isoformat(),
            "days_overdue": (today - next_due).days,
            "days_until_due": 0
        }

    if today >= next_due - timedelta(days=7):
        return {
            "status": "Due Soon",
            "next_due_date": next_due.isoformat(),
            "days_overdue": 0,
            "days_until_due": (next_due - today).days
        }

    return {
        "status": "Completed",
        "next_due_date": next_due.isoformat(),
        "days_overdue": 0,
        "days_until_due": (next_due - today).days
    }
