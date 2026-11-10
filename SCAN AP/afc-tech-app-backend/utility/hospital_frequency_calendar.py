"""Compact Jan–Dec changeout calendar for admin hospitals."""
from collections import defaultdict
from datetime import date

from models import AHU, Filter, Hospital
from utility.client_portal import cadence_dates
from db import db


def months_for_filter(frequency_days, last_service_date, year):
    try:
        freq = int(frequency_days or 0)
    except (TypeError, ValueError):
        freq = 0
    if freq <= 0 or not year:
        return []
    if freq <= 31:
        return list(range(1, 13))

    start = date(year, 1, 1)
    last = date(year, 12, 31)
    anchor = last_service_date or start
    months = {
        visit.month
        for visit in cadence_dates(anchor, freq, start, last, include_forward=True)
    }
    return sorted(months)


def frequency_calendar_payload(year=None):
    y = int(year or date.today().year)
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
        for month in months_for_filter(frequency_days, last_service_date, y):
            try:
                freq = int(frequency_days)
            except (TypeError, ValueError):
                continue
            cells[hospital_id][month].add(freq)
            freq_set.add(freq)

    payload_hospitals = []
    for hospital in hospitals:
        month_map = {}
        for month, freqs in sorted(cells[hospital.id].items()):
            month_map[str(month)] = sorted(freqs)
        payload_hospitals.append(
            {
                "id": hospital.id,
                "name": hospital.name,
                "cells": month_map,
            }
        )

    return {
        "year": y,
        "frequencies": sorted(freq_set),
        "hospitals": payload_hospitals,
    }
