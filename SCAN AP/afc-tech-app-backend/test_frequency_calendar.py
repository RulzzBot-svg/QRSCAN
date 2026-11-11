"""Admin frequency calendar: 24-month cadence payload, not full filter rows."""
import os
import tempfile
from datetime import date

from test_client_portal import assert_eq, auth_header, make_app, seed
from utility.hospital_frequency_calendar import calendar_window, months_for_filter


def main():
    start, last = calendar_window(date(2026, 11, 11))
    assert_eq(start, date(2026, 1, 1), "window starts this January")
    assert_eq(last, date(2027, 12, 31), "window ends next December")

    thirty = months_for_filter(30, date(2026, 3, 4), start, last)
    assert_eq(len(thirty), 24, "30-day fills every month of the 24-month window")

    ninety = months_for_filter(90, date(2026, 1, 15), start, last)
    assert_eq(
        ninety,
        [
            (2026, 1),
            (2026, 4),
            (2026, 7),
            (2026, 10),
            (2027, 1),
            (2027, 4),
            (2027, 7),
            (2027, 10),
        ],
        "90-day walks quarters across both years",
    )
    yearly = months_for_filter(365, date(2025, 10, 10), start, last)
    assert_eq(yearly, [(2026, 10), (2027, 10)], "365-day lands in October both years")

    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    app = make_app(path)
    ids = seed(app)
    client = app.test_client()
    headers = auth_header(app, ids["admin_id"], "admin", "tech")
    res = client.get("/api/admin/frequency-calendar", headers=headers)
    assert_eq(res.status_code, 200, "admin can load calendar")
    payload = res.get_json() or {}
    assert_eq(len(payload.get("months") or []), 24, "payload is 24 months")
    names = [row["name"] for row in payload.get("hospitals") or []]
    assert "CHOC" in names and "Huntington" in names, f"hospital rows {names}"
    choc = next(row for row in payload["hospitals"] if row["name"] == "CHOC")
    blob = str(payload)
    assert "unit_price" not in blob, "calendar must not dump filter price fields"
    assert "SECRET-PN" not in blob, "calendar must not dump part numbers"
    choc_freqs = {int(f) for vals in (choc.get("cells") or {}).values() for f in vals}
    assert choc_freqs.intersection({90, 365, 730}), f"CHOC cadence missing, got {choc_freqs}"

    blocked = client.get("/api/admin/frequency-calendar")
    assert_eq(blocked.status_code, 401, "calendar requires admin")
    print("frequency calendar tests passed")


if __name__ == "__main__":
    main()
