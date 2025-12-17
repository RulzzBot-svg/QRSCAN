from datetime import date, timedelta

def compute_filter_status(filter):
    if not filter.last_service_date or not filter.frequency_days:
        return {
            "status": "Pending",
            "next_due_date": None,
            "days_until_due": None,
            "days_overdue": None,
        }

    next_due = filter.last_service_date + timedelta(days=filter.frequency_days)
    today = date.today()

    if today > next_due:
        return {
            "status": "Overdue",
            "next_due_date": next_due.isoformat(),
            "days_until_due": 0,
            "days_overdue": (today - next_due).days,
        }

    if today >= next_due - timedelta(days=7):
        return {
            "status": "Due Soon",
            "next_due_date": next_due.isoformat(),
            "days_until_due": (next_due - today).days,
            "days_overdue": 0,
        }

    return {
        "status": "Completed",
        "next_due_date": next_due.isoformat(),
        "days_until_due": (next_due - today).days,
        "days_overdue": 0,
    }
