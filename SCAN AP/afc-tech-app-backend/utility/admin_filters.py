"""Helpers for admin filter list/bulk payloads."""


AHU_IDS_LIMIT = 150


def yearly_changeouts_for_frequency(frequency_days):
    """Map filter frequency to expected changeouts per year (90→4, 30→12, …)."""
    try:
        days = int(frequency_days or 0)
    except (TypeError, ValueError):
        days = 0
    if days <= 0:
        return 4
    return max(1, int(round(365 / days)))


def parse_ahu_ids(raw, *, limit=AHU_IDS_LIMIT):
    """Parse a comma-separated list of positive integer AHU ids."""
    ids = []
    seen = set()
    for part in str(raw or "").split(","):
        part = part.strip()
        if not part:
            continue
        try:
            n = int(part)
        except (TypeError, ValueError):
            continue
        if n <= 0 or n in seen:
            continue
        seen.add(n)
        ids.append(n)
        if len(ids) >= limit:
            break
    return ids


def json_unit_price(val):
    if val is None:
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def admin_filter_dict(f, completed_by_filter=None):
    """Serialize a Filter row the way the admin editor expects."""
    completed_by_filter = completed_by_filter or {}
    per_year = yearly_changeouts_for_frequency(getattr(f, "frequency_days", None))
    is_active = getattr(f, "is_active", True)
    completed = completed_by_filter.get(f.id, 0) if is_active else 0
    left = None if not is_active else max(0, per_year - completed)
    last = getattr(f, "last_service_date", None)
    return {
        "id": f.id,
        "ahu_id": getattr(f, "ahu_id", None),
        "phase": f.phase,
        "part_number": f.part_number,
        "size": f.size,
        "quantity": f.quantity,
        "unit_price": json_unit_price(getattr(f, "unit_price", None)),
        "frequency_days": f.frequency_days,
        "last_service_date": last.isoformat() if last else None,
        "is_active": is_active,
        "changeouts_per_year": per_year,
        "changeouts_completed": completed_by_filter.get(f.id, 0),
        "changeouts_left": left,
    }
