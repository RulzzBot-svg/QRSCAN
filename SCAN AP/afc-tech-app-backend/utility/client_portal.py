"""Read-only hospital portal payloads. No prices, invoices, GPS, or tech names."""
from collections import defaultdict
from datetime import date, timedelta

from models import AHU, Job
from utility.status import compute_filter_status


FREQUENCY_LABELS = {
    30: "30 days",
    60: "60 days",
    90: "90 days",
    180: "6 months",
    365: "1 year",
    540: "18 months",
    730: "2 years",
    1095: "3 years",
}


def frequency_label(days):
    try:
        n = int(days)
    except (TypeError, ValueError):
        return None
    return FREQUENCY_LABELS.get(n, f"{n} days")


def filter_status(f):
    try:
        st = compute_filter_status(f) or {}
    except Exception:
        st = {}
    return {
        "status": st.get("status") or "Pending",
        "next_due_date": st.get("next_due_date"),
        "days_until_due": st.get("days_until_due"),
        "days_overdue": st.get("days_overdue"),
    }


def ahu_status_from_filters(filters):
    if not filters:
        return {
            "status": "Pending",
            "next_due_date": None,
            "days_until_due": None,
            "days_overdue": None,
        }

    next_dues = []
    days_until_list = []
    overdue_days = []
    for f in filters:
        st = filter_status(f)
        if st["next_due_date"]:
            next_dues.append(st["next_due_date"])
        if st["days_until_due"] is not None:
            days_until_list.append(st["days_until_due"])
        if st["days_overdue"]:
            overdue_days.append(st["days_overdue"])

    if not next_dues:
        return {
            "status": "Pending",
            "next_due_date": None,
            "days_until_due": None,
            "days_overdue": None,
        }
    if overdue_days:
        return {
            "status": "Overdue",
            "next_due_date": min(next_dues),
            "days_until_due": 0,
            "days_overdue": max(overdue_days),
        }
    if any(d <= 7 for d in days_until_list):
        return {
            "status": "Due Soon",
            "next_due_date": min(next_dues),
            "days_until_due": min(days_until_list) if days_until_list else None,
            "days_overdue": 0,
        }
    return {
        "status": "Completed",
        "next_due_date": min(next_dues),
        "days_until_due": min(days_until_list) if days_until_list else None,
        "days_overdue": 0,
    }


def public_filter(f):
    st = filter_status(f)
    return {
        "id": f.id,
        "phase": f.phase,
        "size": f.size,
        "quantity": f.quantity,
        "frequency_days": f.frequency_days,
        "frequency_label": frequency_label(f.frequency_days),
        "last_service_date": (
            f.last_service_date.isoformat() if f.last_service_date else None
        ),
        "status": st["status"],
        "next_due_date": st["next_due_date"],
        "days_until_due": st["days_until_due"],
        "days_overdue": st["days_overdue"],
    }


def active_filters(ahu):
    return [
        f
        for f in (ahu.filters or [])
        if getattr(f, "is_active", True)
    ]


def public_ahu_summary(ahu):
    filters = active_filters(ahu)
    st = ahu_status_from_filters(filters)
    building = getattr(ahu, "building", None)
    return {
        "id": ahu.id,
        "name": ahu.name,
        "location": ahu.location,
        "building": building.name if building else None,
        "filters_count": len(filters),
        "status": st["status"],
        "next_due_date": st["next_due_date"],
        "days_until_due": st["days_until_due"],
        "last_service_date": _latest_service(filters),
    }


def public_ahu_detail(ahu):
    filters = active_filters(ahu)
    payload = public_ahu_summary(ahu)
    payload["filters"] = [public_filter(f) for f in filters]
    return payload


def _latest_service(filters):
    dates = [f.last_service_date for f in filters if f.last_service_date]
    if not dates:
        return None
    return max(dates).isoformat()


def hospital_graphs(hospital_id, ahus):
    summary = {
        "ahus": 0,
        "filters": 0,
        "compliant": 0,
        "due_soon": 0,
        "overdue": 0,
        "pending": 0,
    }
    by_building = {}
    freq_counts = defaultdict(int)
    upcoming = {30: 0, 60: 0, 90: 0}

    for ahu in ahus:
        summary["ahus"] += 1
        filters = active_filters(ahu)
        st = ahu_status_from_filters(filters)
        bname = ahu.building.name if ahu.building else "Unassigned"
        bucket = by_building.setdefault(
            bname, {"name": bname, "ahus": 0, "compliant": 0, "due_soon": 0, "overdue": 0, "pending": 0}
        )
        bucket["ahus"] += 1
        key = {
            "Completed": "compliant",
            "Due Soon": "due_soon",
            "Overdue": "overdue",
            "Pending": "pending",
        }.get(st["status"], "pending")
        summary[key] += 1
        bucket[key] += 1

        for f in filters:
            summary["filters"] += 1
            freq_counts[int(f.frequency_days or 0)] += 1
            fst = filter_status(f)
            days = fst.get("days_until_due")
            if fst.get("status") == "Overdue":
                continue
            if days is None:
                continue
            for window in (30, 60, 90):
                if 0 <= days <= window:
                    upcoming[window] += 1

    visits = _jobs_by_month(hospital_id)

    return {
        "summary": summary,
        "by_building": sorted(by_building.values(), key=lambda r: r["name"].lower()),
        "by_frequency": [
            {"days": days, "label": frequency_label(days) or f"{days} days", "count": count}
            for days, count in sorted(freq_counts.items())
            if days
        ],
        "visits": visits,
        "upcoming": [
            {"days": 30, "filters": upcoming[30]},
            {"days": 60, "filters": upcoming[60]},
            {"days": 90, "filters": upcoming[90]},
        ],
    }


def _jobs_by_month(hospital_id, months=12):
    today = date.today().replace(day=1)
    start = (today - timedelta(days=32 * (months - 1))).replace(day=1)
    rows = (
        Job.query.join(AHU, AHU.id == Job.ahu_id)
        .filter(AHU.hospital_id == hospital_id, Job.completed_at.isnot(None))
        .filter(Job.completed_at >= start)
        .all()
    )
    counts = defaultdict(int)
    for job in rows:
        completed = job.completed_at.date() if hasattr(job.completed_at, "date") else job.completed_at
        key = completed.strftime("%Y-%m")
        counts[key] += 1

    out = []
    cursor = start
    for _ in range(months):
        key = cursor.strftime("%Y-%m")
        out.append({"month": key, "jobs": counts.get(key, 0)})
        if cursor.month == 12:
            cursor = cursor.replace(year=cursor.year + 1, month=1)
        else:
            cursor = cursor.replace(month=cursor.month + 1)
    return out
