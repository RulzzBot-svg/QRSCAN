from types import SimpleNamespace
from datetime import date

from utility.admin_filters import (
    parse_ahu_ids,
    yearly_changeouts_for_frequency,
    admin_filter_dict,
    AHU_IDS_LIMIT,
)


def test_parse_ahu_ids_skips_junk_and_dedupes():
    assert parse_ahu_ids("5169, 5170, abc, 5169, -1, 0") == [5169, 5170]
    assert parse_ahu_ids("") == []
    assert parse_ahu_ids(None) == []


def test_parse_ahu_ids_respects_limit():
    raw = ",".join(str(i) for i in range(1, 400))
    ids = parse_ahu_ids(raw)
    assert len(ids) == AHU_IDS_LIMIT
    assert ids[0] == 1
    assert ids[-1] == AHU_IDS_LIMIT


def test_yearly_changeouts():
    assert yearly_changeouts_for_frequency(90) == 4
    assert yearly_changeouts_for_frequency(30) == 12
    assert yearly_changeouts_for_frequency(None) == 4


def test_admin_filter_dict_shape():
    f = SimpleNamespace(
        id=12,
        ahu_id=5169,
        phase="PRE",
        part_number="M13",
        size="24x24x4",
        quantity=2,
        unit_price=12.5,
        frequency_days=90,
        last_service_date=date(2026, 1, 15),
        is_active=True,
    )
    payload = admin_filter_dict(f, {12: 1})
    assert payload["id"] == 12
    assert payload["ahu_id"] == 5169
    assert payload["changeouts_per_year"] == 4
    assert payload["changeouts_completed"] == 1
    assert payload["changeouts_left"] == 3
    assert payload["last_service_date"] == "2026-01-15"
    assert payload["unit_price"] == 12.5


def test_inactive_filter_has_no_left_count():
    f = SimpleNamespace(
        id=9,
        ahu_id=1,
        phase="",
        part_number="X",
        size="",
        quantity=1,
        unit_price=None,
        frequency_days=90,
        last_service_date=None,
        is_active=False,
    )
    payload = admin_filter_dict(f, {9: 2})
    assert payload["changeouts_left"] is None
    assert payload["changeouts_completed"] == 2
    assert payload["last_service_date"] is None
