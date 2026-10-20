"""Group filters due in the next month for the admin Upcoming tab."""

from datetime import date, datetime

from utility.status import compute_filter_status

WINDOW_DAYS = 30
ASAP_DAYS = 7
SEVERITY_RANK = {"overdue": 0, "soon": 1, "month": 2, "later": 3}


def parse_iso_date(value):
    """Parse YYYY-MM-DD (or a date/datetime). Blank is None. Raise ValueError otherwise."""
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    text = str(value).strip()[:10]
    try:
        return date.fromisoformat(text)
    except ValueError as exc:
        raise ValueError("dates must be YYYY-MM-DD") from exc


def _as_date(value):
    try:
        return parse_iso_date(value)
    except ValueError:
        return None


def due_severity(
    filter_row,
    *,
    window_days=WINDOW_DAYS,
    asap_days=ASAP_DAYS,
    from_date=None,
    to_date=None,
):
    """Return (overdue|soon|month|later|None, status dict) for an active filter.

    Default window is the next `window_days`. When from_date/to_date are set,
    include the filter only if next_due_date falls in that inclusive range.
    """
    if not getattr(filter_row, "is_active", True):
        return None, {}
    st = compute_filter_status(filter_row) or {}
    due = _as_date(st.get("next_due_date"))
    if due is None:
        return None, st

    if from_date is not None or to_date is not None:
        if from_date is not None and due < from_date:
            return None, st
        if to_date is not None and due > to_date:
            return None, st
        if st.get("days_overdue"):
            return "overdue", st
        until = st.get("days_until_due")
        if until is None:
            return None, st
        if until <= asap_days:
            return "soon", st
        if until <= window_days:
            return "month", st
        return "later", st

    if st.get("days_overdue"):
        return "overdue", st
    until = st.get("days_until_due")
    if until is None:
        return None, st
    if until <= asap_days:
        return "soon", st
    if until <= window_days:
        return "month", st
    return None, st


def _hospital_meta(ahu):
    hospital = getattr(ahu, "hospital", None)
    hid = getattr(ahu, "hospital_id", None)
    if hid is None and hospital is not None:
        hid = getattr(hospital, "id", None)
    name = getattr(hospital, "name", None) if hospital is not None else None
    return hid, name or "Unknown Hospital"


def _building_meta(ahu):
    building = getattr(ahu, "building", None)
    bid = getattr(ahu, "building_id", None)
    if bid is None and building is not None:
        bid = getattr(building, "id", None)
    name = getattr(building, "name", None) if building is not None else None
    return bid, name or "(No building)"


def _qty(filter_row):
    try:
        n = int(getattr(filter_row, "quantity", 0) or 0)
    except (TypeError, ValueError):
        n = 0
    return n


def _worst(current, candidate):
    if candidate is None:
        return current
    if current is None:
        return candidate
    return candidate if SEVERITY_RANK[candidate] < SEVERITY_RANK[current] else current


def _sort_key_name(name):
    return str(name or "").lower()


def group_upcoming_ahus(
    ahus,
    *,
    window_days=WINDOW_DAYS,
    asap_days=ASAP_DAYS,
    from_date=None,
    to_date=None,
):
    """Build the Upcoming tab payload from AHU rows with filters loaded."""
    from_date = _as_date(from_date)
    to_date = _as_date(to_date)
    if from_date and to_date and from_date > to_date:
        from_date, to_date = to_date, from_date

    hospitals = {}

    for ahu in ahus or []:
        due_filters = []
        worst = None
        next_due = None
        days_until = None
        days_overdue = 0

        for f in getattr(ahu, "filters", None) or []:
            sev, st = due_severity(
                f,
                window_days=window_days,
                asap_days=asap_days,
                from_date=from_date,
                to_date=to_date,
            )
            if not sev:
                continue
            due_date = st.get("next_due_date")
            try:
                freq = int(getattr(f, "frequency_days", 0) or 0)
            except (TypeError, ValueError):
                freq = 0
            due_filters.append(
                {
                    "id": getattr(f, "id", None),
                    "phase": getattr(f, "phase", None),
                    "size": getattr(f, "size", None),
                    "quantity": _qty(f),
                    "frequency_days": freq or None,
                    "next_due_date": due_date,
                    "days_until_due": st.get("days_until_due"),
                    "days_overdue": st.get("days_overdue") or 0,
                    "severity": sev,
                }
            )
            worst = _worst(worst, sev)
            if due_date and (next_due is None or due_date < next_due):
                next_due = due_date
            until = st.get("days_until_due")
            if until is not None:
                days_until = until if days_until is None else min(days_until, until)
            days_overdue = max(days_overdue, st.get("days_overdue") or 0)

        if not due_filters:
            continue

        hid, hname = _hospital_meta(ahu)
        hkey = str(hid) if hid is not None else "unknown"
        hospital = hospitals.setdefault(
            hkey,
            {
                "id": hid,
                "name": hname,
                "asap_ahus": 0,
                "month_ahus": 0,
                "buildings": {},
            },
        )

        bid, bname = _building_meta(ahu)
        bkey = str(bid) if bid is not None else bname
        building = hospital["buildings"].setdefault(
            bkey,
            {"id": bid, "name": bname, "ahus": []},
        )

        is_asap = worst in ("overdue", "soon")
        if is_asap:
            hospital["asap_ahus"] += 1
        else:
            hospital["month_ahus"] += 1

        building["ahus"].append(
            {
                "id": getattr(ahu, "id", None),
                "name": getattr(ahu, "name", None) or f"AHU {getattr(ahu, 'id', '')}",
                "severity": worst,
                "next_due_date": next_due,
                "days_until_due": 0 if worst == "overdue" else days_until,
                "days_overdue": days_overdue,
                "filters_due": len(due_filters),
                "qty_due": sum(row["quantity"] for row in due_filters),
                "filters": due_filters,
            }
        )

    hospital_list = []
    summary = {
        "hospitals": 0,
        "ahus_asap": 0,
        "ahus_month": 0,
        "filters_asap": 0,
        "filters_month": 0,
    }

    for hospital in hospitals.values():
        buildings = []
        for building in hospital["buildings"].values():
            building["ahus"].sort(
                key=lambda a: (
                    SEVERITY_RANK.get(a["severity"], 9),
                    a.get("next_due_date") or "9999-12-31",
                    _sort_key_name(a.get("name")),
                )
            )
            buildings.append(
                {
                    "id": building["id"],
                    "name": building["name"],
                    "ahus": building["ahus"],
                }
            )
        buildings.sort(key=lambda b: _sort_key_name(b["name"]))
        hospital_list.append(
            {
                "id": hospital["id"],
                "name": hospital["name"],
                "asap_ahus": hospital["asap_ahus"],
                "month_ahus": hospital["month_ahus"],
                "buildings": buildings,
            }
        )
        summary["hospitals"] += 1
        summary["ahus_asap"] += hospital["asap_ahus"]
        summary["ahus_month"] += hospital["month_ahus"]
        for building in buildings:
            for ahu in building["ahus"]:
                asap_n = sum(1 for f in ahu["filters"] if f["severity"] in ("overdue", "soon"))
                summary["filters_asap"] += asap_n
                summary["filters_month"] += ahu["filters_due"] - asap_n

    hospital_list.sort(
        key=lambda h: (
            0 if h["asap_ahus"] else 1,
            _sort_key_name(h["name"]),
        )
    )

    return {
        "window_days": window_days,
        "asap_days": asap_days,
        "from_date": from_date.isoformat() if from_date else None,
        "to_date": to_date.isoformat() if to_date else None,
        "summary": summary,
        "hospitals": hospital_list,
    }
