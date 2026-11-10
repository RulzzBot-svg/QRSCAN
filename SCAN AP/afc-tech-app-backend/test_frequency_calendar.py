"""Admin frequency calendar: one compact year payload, not full filter rows."""
import os
import tempfile
from datetime import date

from test_client_portal import assert_eq, auth_header, make_app, seed
from utility.hospital_frequency_calendar import months_for_filter


def main():
    assert_eq(len(months_for_filter(30, date(2026, 3, 4), 2026)), 12, "30-day fills every month")
    ninety = months_for_filter(90, date(2026, 1, 15), 2026)
    assert_eq(ninety, [1, 4, 7, 10], "90-day from mid-Jan walks quarters")
    yearly = months_for_filter(365, date(2025, 10, 10), 2026)
    assert_eq(yearly, [10], "365-day lands in October")

    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    app = make_app(path)
    ids = seed(app)
    client = app.test_client()
    headers = auth_header(app, ids["admin_id"], "admin", "tech")
    year = date.today().year
    res = client.get(f"/api/admin/frequency-calendar?year={year}", headers=headers)
    assert_eq(res.status_code, 200, "admin can load calendar")
    payload = res.get_json() or {}
    assert_eq(payload.get("year"), year, "year echoed")
    names = [row["name"] for row in payload.get("hospitals") or []]
    assert "CHOC" in names and "Huntington" in names, f"hospital rows {names}"
    choc = next(row for row in payload["hospitals"] if row["name"] == "CHOC")
    assert "unit_price" not in str(payload), "calendar must not dump filter price fields"
    assert "SECRET-PN" not in str(payload), "calendar must not dump part numbers"
    oct_freqs = choc.get("cells", {}).get("10") or choc.get("cells", {}).get(10) or []
    assert 365 in oct_freqs or 730 in oct_freqs, f"CHOC October should include annual/2yr, got {oct_freqs}"

    blocked = client.get("/api/admin/frequency-calendar")
    assert_eq(blocked.status_code, 401, "calendar requires admin")
    print("frequency calendar tests passed")


if __name__ == "__main__":
    main()
