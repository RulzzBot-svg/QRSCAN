"""Read-only hospital portal payloads. No prices, invoices, GPS, or tech names."""
from collections import defaultdict
from datetime import date, datetime, timedelta

import re

from models import AHU, Filter, Job, JobFilter
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


_STICKER_FILTER_KEYS = (
    "phase",
    "size",
    "quantity",
    "frequency_label",
    "last_service_date",
    "status",
    "next_due_date",
    "days_until_due",
    "days_overdue",
)


def sticker_filter(f):
    """QR sticker row: status only. No ids, catalog PNs, or prices."""
    row = public_filter(f)
    return {k: row.get(k) for k in _STICKER_FILTER_KEYS}


def walk_sort_key(ahu):
    building = ""
    if getattr(ahu, "building", None) is not None:
        building = (ahu.building.name or "").strip().lower()
    try:
        order = int(ahu.excel_order) if ahu.excel_order is not None else 10**9
    except (TypeError, ValueError):
        order = 10**9
    try:
        aid = int(ahu.id or 0)
    except (TypeError, ValueError):
        aid = 0
    return (building, order, aid)


def walk_sorted_ahus(ahus):
    return sorted(list(ahus or []), key=walk_sort_key)


def sticker_card(ahu):
    """Logged-out QR view. Same status a label implies; nothing writable or priced."""
    filters = active_filters(ahu)
    st = ahu_status_from_filters(filters)
    building = getattr(ahu, "building", None)
    hospital = getattr(ahu, "hospital", None)
    return {
        "hospital": hospital.name if hospital else None,
        "name": ahu.name,
        "location": ahu.location,
        "building": building.name if building else None,
        "status": st["status"],
        "next_due_date": st["next_due_date"],
        "last_service_date": _latest_service(filters),
        "filters": [sticker_filter(f) for f in filters],
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
    payload["comments"] = ahu_service_comments(ahu)
    return payload


def _sanitize_comment(value, max_len=800):
    s = re.sub(r"<[^>]*>", " ", str(value or ""))
    s = re.sub(r"\s+", " ", s).strip()
    if not s:
        return None
    return s[:max_len]


def ahu_service_comments(ahu, limit=20):
    """Tech notes on why a filter was held / not replaced. No tech names, GPS, or prices."""
    if ahu is None or not getattr(ahu, "id", None):
        return []
    from db import db

    rows = (
        db.session.query(JobFilter, Job, Filter)
        .join(Job, Job.id == JobFilter.job_id)
        .join(Filter, Filter.id == JobFilter.filter_id)
        .filter(Job.ahu_id == ahu.id)
        .filter(JobFilter.is_completed.is_(False))
        .filter(JobFilter.note.isnot(None))
        .order_by(Job.completed_at.desc(), JobFilter.id.desc())
        .limit(80)
        .all()
    )
    out = []
    for jf, job, filt in rows:
        text = _sanitize_comment(jf.note)
        if not text:
            continue
        when = job.completed_at
        if when is not None and hasattr(when, "date"):
            when = when.date().isoformat()
        elif when is not None:
            when = str(when)[:10]
        else:
            when = None
        out.append({
            "at": when,
            "filter": filt.phase if filt else None,
            "held": not bool(jf.is_completed),
            "text": text,
        })
        if len(out) >= limit:
            break
    return out


def hospital_overview(ahus):
    """Director dashboard extras: still status-only, no catalog or money."""
    overdue = []
    due_soon = []
    for ahu in ahus or []:
        row = public_ahu_summary(ahu)
        if row["status"] == "Overdue":
            overdue.append(row)
        elif row["status"] == "Due Soon":
            due_soon.append(row)
    ahus_n = len(ahus or [])
    compliant = sum(1 for a in (ahus or []) if public_ahu_summary(a)["status"] == "Completed")
    return {
        "compliance_pct": int(round((100.0 * compliant / ahus_n))) if ahus_n else 0,
        "overdue_units": overdue[:12],
        "due_soon_units": due_soon[:12],
        "recent_changeouts": recent_changeouts(ahus),
    }


def _as_date(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return None


def recent_changeouts(ahus, limit=3):
    """Last completed replacements at this hospital. No tech names, PNs, or prices."""
    buckets = {}

    def add(ahu, when, phase):
        day = _as_date(when)
        if ahu is None or day is None:
            return
        key = (ahu.id, day.isoformat())
        row = buckets.get(key)
        if row is None:
            summary = public_ahu_summary(ahu)
            row = {
                "id": ahu.id,
                "name": ahu.name,
                "building": summary.get("building"),
                "location": ahu.location,
                "serviced_at": day.isoformat(),
                "stages": [],
                "status": summary.get("status"),
            }
            buckets[key] = row
        label = (phase or "Filter").strip() or "Filter"
        if label not in row["stages"]:
            row["stages"].append(label)

    for ahu in ahus or []:
        for filt in active_filters(ahu):
            add(ahu, getattr(filt, "last_service_date", None), getattr(filt, "phase", None))

    hospital_id = None
    for ahu in ahus or []:
        hospital_id = getattr(ahu, "hospital_id", None)
        if hospital_id is not None:
            break
    if hospital_id is not None:
        from db import db

        rows = (
            db.session.query(Job, JobFilter, Filter, AHU)
            .join(JobFilter, JobFilter.job_id == Job.id)
            .join(Filter, Filter.id == JobFilter.filter_id)
            .join(AHU, AHU.id == Job.ahu_id)
            .filter(AHU.hospital_id == hospital_id)
            .filter(JobFilter.is_completed.is_(True))
            .filter(Job.completed_at.isnot(None))
            .order_by(Job.completed_at.desc(), JobFilter.id.desc())
            .limit(80)
            .all()
        )
        for job, _jf, filt, ahu in rows:
            add(ahu, job.completed_at, getattr(filt, "phase", None))

    return sorted(buckets.values(), key=lambda r: r["serviced_at"], reverse=True)[:limit]


def hospital_datasheet(hospital, ahus):
    """Technical equipment sheet: sizes, qty, frequencies. No PNs, prices, or comments."""
    groups = []
    index = {}
    for ahu in ahus or []:
        bname = ahu.building.name if ahu.building else "Unassigned"
        if bname not in index:
            index[bname] = len(groups)
            groups.append({"building": bname, "units": []})
        groups[index[bname]]["units"].append({
            "name": ahu.name,
            "location": ahu.location,
            "status": ahu_status_from_filters(active_filters(ahu))["status"],
            "filters": [
                {
                    "phase": f.phase,
                    "size": f.size,
                    "quantity": f.quantity,
                    "frequency_label": frequency_label(f.frequency_days),
                }
                for f in active_filters(ahu)
            ],
        })
    return {
        "hospital": hospital.name if hospital else None,
        "city": getattr(hospital, "city", None) if hospital else None,
        "buildings": groups,
    }


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
