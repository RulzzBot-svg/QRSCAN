"""Compact 24-month changeout calendar for admin hospitals."""
from collections import defaultdict
from datetime import date, timedelta

from models import AHU, Filter, Hospital
from db import db

CALENDAR_MONTHS = 24
MONTH_SHORT = (
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
)


def calendar_window(today=None):
    """This January through December of next year — 24 months, not an open-ended year pager."""
    today = today or date.today()
    start = date(today.year, 1, 1)
    last = date(today.year + 1, 12, 31)
    return start, last


def iter_months(start, last):
    year, month = start.year, start.month
    while date(year, month, 1) <= last:
        yield year, month
        month += 1
        if month > 12:
            month = 1
            year += 1


def month_key(year, month):
    return f"{int(year):04d}-{int(month):02d}"


def _first_visit_on_or_after(anchor, step, start):
    cursor = anchor
    delta = timedelta(days=step)
    if cursor >= start:
        while cursor - delta >= start:
            cursor -= delta
        return cursor
    guard = 0
    while cursor < start and guard < 400:
        cursor += delta
        guard += 1
    return cursor


def months_for_filter(frequency_days, last_service_date, start, last):
    """Cadence months that land inside the 24-month window only."""
    try:
        freq = int(frequency_days or 0)
    except (TypeError, ValueError):
        freq = 0
    if freq <= 0 or start is None or last is None or start > last:
        return []
    if freq <= 31:
        return list(iter_months(start, last))

    anchor = last_service_date or start
    cursor = _first_visit_on_or_after(anchor, freq, start)
    found = []
    seen = set()
    delta = timedelta(days=freq)
    guard = 0
    while cursor <= last and guard < 80:
        if cursor >= start:
            key = (cursor.year, cursor.month)
            if key not in seen:
                seen.add(key)
                found.append(key)
        cursor += delta
        guard += 1
    return found


def frequency_calendar_payload(today=None):
    start, last = calendar_window(today)
    months = [
        {
            "year": year,
            "month": month,
            "key": month_key(year, month),
            "label": MONTH_SHORT[month - 1],
        }
        for year, month in iter_months(start, last)
    ]
    hospitals = Hospital.query.order_by(Hospital.name).all()
    cells = defaultdict(lambda: defaultdict(set))
    freq_set = set()

    rows = (
        db.session.query(Filter.frequency_days, Filter.last_service_date, AHU.hospital_id)
        .join(AHU, Filter.ahu_id == AHU.id)
        .filter(Filter.is_active.is_(True))
        .all()
    )
    for frequency_days, last_service_date, hospital_id in rows:
        try:
            freq = int(frequency_days)
        except (TypeError, ValueError):
            continue
        if freq <= 0:
            continue
        hits = months_for_filter(frequency_days, last_service_date, start, last)
        if not hits:
            continue
        freq_set.add(freq)
        for year, month in hits:
            cells[hospital_id][month_key(year, month)].add(freq)

    payload_hospitals = []
    for hospital in hospitals:
        month_map = {
            key: sorted(freqs) for key, freqs in sorted(cells[hospital.id].items())
        }
        payload_hospitals.append(
            {
                "id": hospital.id,
                "name": hospital.name,
                "cells": month_map,
            }
        )

    years = sorted({item["year"] for item in months})
    return {
        "start": month_key(start.year, start.month),
        "end": month_key(last.year, last.month),
        "years": years,
        "months": months,
        "frequencies": sorted(freq_set),
        "hospitals": payload_hospitals,
    }
