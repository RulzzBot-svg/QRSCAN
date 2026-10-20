#!/usr/bin/env python3
"""Upcoming tab groups due filters by hospital and building for a 30-day window."""
from datetime import date, timedelta
from types import SimpleNamespace

from utility.upcoming import due_severity, group_upcoming_ahus, parse_iso_date


def assert_eq(actual, expected, msg):
    if actual != expected:
        raise AssertionError(f"{msg}: expected {expected!r}, got {actual!r}")


TODAY = date.today()


def filt(**kwargs):
    row = dict(
        id=1,
        is_active=True,
        phase="PRE",
        size="24x24x4",
        quantity=2,
        frequency_days=90,
        last_service_date=TODAY,
    )
    row.update(kwargs)
    return SimpleNamespace(**row)


def ahu(**kwargs):
    hid = kwargs.get("hospital_id", 1)
    bid = kwargs.get("building_id", 10)
    row = dict(
        id=100,
        name="AHU-1",
        hospital_id=hid,
        building_id=bid,
        hospital=SimpleNamespace(id=hid, name="Huntington"),
        building=SimpleNamespace(id=bid, name="West"),
        filters=[],
    )
    row.update(kwargs)
    return SimpleNamespace(**row)


def test_severity_buckets():
    overdue = filt(last_service_date=TODAY - timedelta(days=100), frequency_days=90)
    soon = filt(last_service_date=TODAY - timedelta(days=86), frequency_days=90)
    month = filt(last_service_date=TODAY - timedelta(days=70), frequency_days=90)
    far = filt(last_service_date=TODAY - timedelta(days=10), frequency_days=90)
    pending = filt(last_service_date=None)
    inactive = filt(
        is_active=False,
        last_service_date=TODAY - timedelta(days=100),
        frequency_days=90,
    )

    assert_eq(due_severity(overdue)[0], "overdue", "past due is overdue")
    assert_eq(due_severity(soon)[0], "soon", "within 7 days is soon")
    assert_eq(due_severity(month)[0], "month", "within 30 days is month")
    assert_eq(due_severity(far)[0], None, "beyond 30 days is omitted")
    assert_eq(due_severity(pending)[0], None, "no service date is omitted")
    assert_eq(due_severity(inactive)[0], None, "inactive is omitted")


def test_grouped_by_hospital_and_building():
    hunt_west = ahu(
        id=1,
        name="AHU-1",
        filters=[
            filt(id=11, last_service_date=TODAY - timedelta(days=100), frequency_days=90, quantity=8),
            filt(id=12, last_service_date=TODAY - timedelta(days=10), frequency_days=90, quantity=4),
        ],
    )
    hunt_east = ahu(
        id=2,
        name="AHU-2",
        building_id=11,
        building=SimpleNamespace(id=11, name="East"),
        filters=[
            filt(id=21, phase="FINAL", last_service_date=TODAY - timedelta(days=70), frequency_days=90, quantity=6),
        ],
    )
    choc = ahu(
        id=3,
        name="AHU-9",
        hospital_id=2,
        building_id=20,
        hospital=SimpleNamespace(id=2, name="CHOC"),
        building=SimpleNamespace(id=20, name="Main"),
        filters=[
            filt(id=31, last_service_date=TODAY - timedelta(days=86), frequency_days=90, quantity=3),
        ],
    )
    later = ahu(
        id=4,
        name="AHU-99",
        hospital_id=3,
        building_id=30,
        hospital=SimpleNamespace(id=3, name="Later Hospital"),
        building=SimpleNamespace(id=30, name="Roof"),
        filters=[
            filt(id=41, last_service_date=TODAY - timedelta(days=10), frequency_days=90, quantity=1),
        ],
    )

    payload = group_upcoming_ahus([hunt_west, hunt_east, choc, later])
    names = [h["name"] for h in payload["hospitals"]]
    assert_eq(names, ["CHOC", "Huntington"], "ASAP hospitals sort first, then name; later hospital omitted")

    hunt = next(h for h in payload["hospitals"] if h["name"] == "Huntington")
    assert_eq(hunt["asap_ahus"], 1, "Huntington has one ASAP AHU")
    assert_eq(hunt["month_ahus"], 1, "Huntington has one this-month AHU")
    assert_eq([b["name"] for b in hunt["buildings"]], ["East", "West"], "buildings sorted by name")

    west = next(b for b in hunt["buildings"] if b["name"] == "West")
    card = west["ahus"][0]
    assert_eq(card["severity"], "overdue", "worst filter wins")
    assert_eq(card["filters_due"], 1, "only in-window filters count")
    assert_eq(card["qty_due"], 8, "qty from due filters only")
    assert_eq(card["filters"][0]["frequency_days"], 90, "due filter keeps frequency")

    summary = payload["summary"]
    assert_eq(summary["hospitals"], 2, "two hospitals with due work")
    assert_eq(summary["ahus_asap"], 2, "overdue + soon AHUs")
    assert_eq(summary["ahus_month"], 1, "one AHU in the rest of the month")
    assert_eq(summary["filters_asap"], 2, "two ASAP filters")
    assert_eq(summary["filters_month"], 1, "one this-month filter")


def test_custom_range_includes_later_due():
    later = ahu(
        filters=[
            filt(id=61, last_service_date=TODAY - timedelta(days=10), frequency_days=90, quantity=4),
        ]
    )
    payload = group_upcoming_ahus(
        [later],
        from_date=TODAY,
        to_date=TODAY + timedelta(days=90),
    )
    card = payload["hospitals"][0]["buildings"][0]["ahus"][0]
    assert_eq(card["filters"][0]["severity"], "later", "due beyond 30 days is later in a custom range")
    assert_eq(payload["from_date"], TODAY.isoformat(), "from_date is echoed")
    assert_eq(payload["to_date"], (TODAY + timedelta(days=90)).isoformat(), "to_date is echoed")


def test_custom_range_excludes_overdue_outside_window():
    overdue = ahu(
        filters=[
            filt(id=71, last_service_date=TODAY - timedelta(days=100), frequency_days=90, quantity=2),
        ]
    )
    payload = group_upcoming_ahus(
        [overdue],
        from_date=TODAY,
        to_date=TODAY + timedelta(days=30),
    )
    assert_eq(payload["hospitals"], [], "past-due date before From is omitted")


def test_custom_range_includes_overdue_inside_window():
    overdue = ahu(
        filters=[
            filt(id=81, last_service_date=TODAY - timedelta(days=100), frequency_days=90, quantity=2),
        ]
    )
    payload = group_upcoming_ahus(
        [overdue],
        from_date=TODAY - timedelta(days=20),
        to_date=TODAY + timedelta(days=10),
    )
    card = payload["hospitals"][0]["buildings"][0]["ahus"][0]
    assert_eq(card["severity"], "overdue", "overdue whose due date falls in From–To is kept")


def test_custom_range_swaps_inverted_dates():
    unit = ahu(
        filters=[
            filt(id=91, last_service_date=TODAY - timedelta(days=10), frequency_days=90, quantity=1),
        ]
    )
    payload = group_upcoming_ahus(
        [unit],
        from_date=TODAY + timedelta(days=90),
        to_date=TODAY,
    )
    assert_eq(len(payload["hospitals"]), 1, "inverted From–To still includes the due date")
    assert_eq(payload["from_date"], TODAY.isoformat(), "inverted range is swapped")
    assert_eq(payload["to_date"], (TODAY + timedelta(days=90)).isoformat(), "inverted range is swapped")


def test_parse_iso_date():
    assert_eq(parse_iso_date(None), None, "blank is None")
    assert_eq(parse_iso_date(""), None, "empty string is None")
    assert_eq(parse_iso_date("2026-11-01"), date(2026, 11, 1), "YYYY-MM-DD")
    try:
        parse_iso_date("not-a-date")
        raise AssertionError("bad date should raise")
    except ValueError:
        pass


def test_frequency_on_overdue_two_year():
    unit = ahu(
        filters=[
            filt(
                id=51,
                phase="FINAL",
                last_service_date=TODAY - timedelta(days=800),
                frequency_days=730,
                quantity=12,
            )
        ]
    )
    payload = group_upcoming_ahus([unit])
    card = payload["hospitals"][0]["buildings"][0]["ahus"][0]
    assert_eq(card["filters"][0]["frequency_days"], 730, "2-year frequency is on the due row")
    assert_eq(card["severity"], "overdue", "elapsed 2-year changeout is overdue")


def main():
    test_severity_buckets()
    test_grouped_by_hospital_and_building()
    test_custom_range_includes_later_due()
    test_custom_range_excludes_overdue_outside_window()
    test_custom_range_includes_overdue_inside_window()
    test_custom_range_swaps_inverted_dates()
    test_parse_iso_date()
    test_frequency_on_overdue_two_year()
    print("ok")


if __name__ == "__main__":
    main()
