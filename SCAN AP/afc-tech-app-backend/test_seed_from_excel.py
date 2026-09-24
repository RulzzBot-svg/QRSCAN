#!/usr/bin/env python3
"""Create a tiny survey workbook, seed twice, and confirm AHUs update instead of duplicating."""
import os
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

from flask import Flask
from openpyxl import Workbook

from db import db
import models  # noqa: F401 — register tables
from models import Hospital, AHU, Filter
from datetime import date

from seed_from_excel import (
    ahu_name_matches,
    format_ahu_label,
    is_skip_sheet,
    normalize_filter_size,
    part_match_keys,
    read_survey_letter_blocks,
    seed_from_excel,
    serialize_seed_stats,
    sheet_uses_survey_letters,
)


HEADERS = [
    "AHU NO.",
    "LOCATION",
    "STAGE",
    "FILTER SIZE",
    "FREQUENCY",
    "QUANTITY",
    "BUILDING",
    "FLOOR/AREA",
    "PART NUMBER",
    "FILTER TYPE",
    "DATE OF REPLACEMENT",
]


def write_workbook(path, hospital, rows, sheet="MAIN BUILDING"):
    wb = Workbook()
    ws = wb.active
    ws.title = sheet
    ws["B2"] = hospital
    for col, header in enumerate(HEADERS, 1):
        ws.cell(5, col, header)
    for r_i, row in enumerate(rows, start=6):
        for c_i, val in enumerate(row, 1):
            ws.cell(r_i, c_i, val)
    wb.save(path)


LETTER_HEADERS = {
    "B": "BUILDING",
    "C": "LOCATION",
    "E": "STAGE",
    "F": "AHU NO.",
    "G": "FILTER TYPE",
    "H": "PART NUMBER",
    "J": "FILTER SIZE",
    "K": "QUANTITY",
    "L": "QUANTITY X 4",
    "M": "FREQUENCY",
    "N": "INVOICE NUMBER",
    "O": "DATE OF REPLACEMENT",
    "P": "SCHEDULED DATE OF REPLACEMENT",
}


def write_lettered_survey(path, hospital, blocks, sheet="EAST"):
    """blocks: list of list of dicts with keys matching LETTER_HEADERS."""
    wb = Workbook()
    ws = wb.active
    ws.title = sheet
    ws["B2"] = hospital
    for letter, header in LETTER_HEADERS.items():
        ws[f"{letter}5"] = header
    row = 6
    for i, ahu_rows in enumerate(blocks):
        if i:
            # separator may still have building/location — must still split AHUs
            ws[f"B{row}"] = ahu_rows[0].get("B")
            ws[f"C{row}"] = ahu_rows[0].get("C")
            row += 1
        for r in ahu_rows:
            for letter, val in r.items():
                ws[f"{letter}{row}"] = val
            row += 1
    wb.save(path)


def write_lettered_flat(path, hospital, rows, sheet="EAST"):
    """Write consecutive survey rows with no blank separators."""
    wb = Workbook()
    ws = wb.active
    ws.title = sheet
    ws["B2"] = hospital
    for letter, header in LETTER_HEADERS.items():
        ws[f"{letter}5"] = header
    for i, r in enumerate(rows):
        for letter, val in r.items():
            ws[f"{letter}{6 + i}"] = val
    wb.save(path)


def write_lettered_tabs(path, hospital, sheets):
    """sheets: {tab_name: list of row dicts}. Adds a FILTER skip tab."""
    wb = Workbook()
    first = True
    for sheet, rows in sheets.items():
        ws = wb.active if first else wb.create_sheet(sheet)
        if first:
            ws.title = sheet
            first = False
        ws["B2"] = hospital
        for letter, header in LETTER_HEADERS.items():
            ws[f"{letter}5"] = header
        for i, r in enumerate(rows):
            for letter, val in r.items():
                ws[f"{letter}{6 + i}"] = val
    skip = wb.create_sheet("FILTER")
    skip["A1"] = "legend"
    wb.save(path)


def rtu_block(ahu, fill_ahu_every_row=False):
    rows = [
        {"B": "East Building", "C": "Roof", "E": "PRE", "F": ahu, "G": "Pleated", "H": "HVP24242", "J": "24x24x2 HV", "K": 32, "L": 32, "M": "90 Days", "O": date(2026, 8, 25)},
        {"B": "East Building", "C": "Roof", "E": "PRE", "G": "Pleated", "H": "HVP12242", "J": "12x24x2 HV", "K": 8, "L": 8, "M": "90 Days", "O": date(2026, 8, 25)},
        {"B": "East Building", "C": "Roof", "E": "FINAL", "G": "V-Bank", "H": "F8V424-GWBB", "J": "24x24x12 FF", "K": 16, "L": 16, "M": "365 Days", "O": date(2026, 5, 5)},
        {"B": "East Building", "C": "Roof", "E": "FINAL", "G": "V-Bank", "H": "F8V1224-GWBB", "J": "12x24x12 FF", "K": 4, "L": 4, "M": "365 Days", "O": date(2026, 5, 5)},
    ]
    if fill_ahu_every_row:
        for r in rows:
            r["F"] = ahu
    return rows


def sample_rows(qty_pre=2, location="Roof"):
    return [
        ["AH-1", location, "Pre", "12x12x1", "90 days", qty_pre, "Main", "2nd", "PN-1", "Pleat", None],
        ["AH-1", location, "Final", "24x24x2", "180 days", 1, "Main", "2nd", "PN-2", "Bag", None],
    ]


def make_app(db_path):
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + db_path.replace("\\", "/")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    db.init_app(app)
    with app.app_context():
        db.create_all()
    return app


def assert_eq(actual, expected, msg):
    if actual != expected:
        raise AssertionError(f"{msg}: expected {expected!r}, got {actual!r}")


def main():
    payload = serialize_seed_stats(
        {
            "hospital": "X",
            "hospital_id": 1,
            "ahus": {3, 1},
            "ahus_created": 0,
            "ahus_updated": 2,
            "filters_upserted": 4,
        },
        dry_run=True,
    )
    assert_eq(payload["dry_run"], True, "dry_run flag")
    assert_eq(payload["ahus_touched"], 2, "set length is JSON-safe")
    assert_eq(payload["sheets"], [], "sheets list is JSON-safe")
    assert_eq(format_ahu_label("Pkg Units", "HDH"), "Pkg Units — HDH", "building in AHU label")
    assert_eq(format_ahu_label("AH-1 East Building", "East Building"), "AH-1 East Building", "do not double building")
    assert_eq(format_ahu_label("AHU-2", "21 Building", 2), "AHU-2 — 21 Building #2", "second same-name unit")
    assert ahu_name_matches("Pkg Units", "Pkg Units", "HDH"), "plain stored name still matches"
    assert ahu_name_matches("Pkg Units — HDH", "Pkg Units", "HDH"), "labeled stored name matches"
    assert ahu_name_matches("AHU-2 — 21 Building #2", "AHU-2", "21 Building"), "#2 still matches AHU-2"
    assert not ahu_name_matches("Pkg Units — MOB", "Pkg Units", "HDH"), "other building label does not match"
    assert is_skip_sheet("FILTER") and is_skip_sheet("Legend") and not is_skip_sheet("EAST")

    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)
    app = make_app(db_path)
    with app.app_context():
        fd, path = tempfile.mkstemp(suffix=".xlsx")
        os.close(fd)
        try:
            write_workbook(path, "Foothill", sample_rows())
            first = seed_from_excel(path)
            assert_eq(first["hospital_created"], True, "first pass creates hospital")
            assert_eq(first["ahus_created"], 1, "first pass creates AHU")
            assert_eq(first["ahus_updated"], 0, "first pass no updates")
            assert_eq(first["filters_upserted"], 2, "two filters")
            assert_eq(Hospital.query.count(), 1, "one hospital")
            assert_eq(AHU.query.count(), 1, "one AHU")
            assert_eq(Filter.query.count(), 2, "two filters")
            assert_eq(AHU.query.first().name, "AH-1 — Main", "building appended on first import")
            hid = first["hospital_id"]
            ahu_id = AHU.query.first().id
            assert_eq(Filter.query.filter_by(part_number="PN-1").first().quantity, 2, "initial qty")

            write_workbook(
                path,
                "foothill",
                [
                    ["ah-1", "Roof penthouse", "Pre", "12x12x1", "90 days", 5, "MAIN", "2nd", "PN-1", "Pleat", None],
                    ["ah-1", "Roof penthouse", "Final", "24x24x2", "180 days", 1, "MAIN", "2nd", "PN-2", "Bag", None],
                ],
            )
            dry = seed_from_excel(path, dry_run=True)
            assert_eq(dry["dry_run"], True, "dry run flag")
            assert_eq(dry["ahus_created"], 0, "dry run matches existing AHU")
            assert_eq(dry["ahus_updated"], 1, "dry run update")
            assert_eq(AHU.query.count(), 1, "dry run does not commit a second AHU")
            assert_eq(
                Filter.query.filter_by(part_number="PN-1").first().quantity,
                2,
                "dry run does not change qty",
            )

            second = seed_from_excel(path)
            assert_eq(second["hospital_created"], False, "case-insensitive hospital match")
            assert_eq(second["ahus_created"], 0, "update not create")
            assert_eq(second["ahus_updated"], 1, "matched AHU")
            assert_eq(Hospital.query.count(), 1, "still one hospital")
            assert_eq(AHU.query.count(), 1, "still one AHU")
            assert_eq(Filter.query.count(), 2, "still two filters")
            assert_eq(Filter.query.filter_by(part_number="PN-1").first().quantity, 5, "qty updated")
            assert_eq(AHU.query.first().id, ahu_id, "same AHU id")
            assert_eq(AHU.query.first().location, "Roof penthouse", "location updated")
            assert_eq(AHU.query.first().name, "AH-1 — Main", "building appended to AHU name")

            write_workbook(path, "Wrong Name", sample_rows(qty_pre=8, location="Penthouse"))
            third = seed_from_excel(path, hospital_id=hid)
            assert_eq(third["hospital_created"], False, "hospital_id override does not create")
            assert_eq(Hospital.query.count(), 1, "B2 mismatch did not spawn a hospital")
            assert_eq(AHU.query.count(), 1, "still one AHU after override")
            assert_eq(Filter.query.filter_by(part_number="PN-1").first().quantity, 8, "qty updated via override")
            assert any("B2" in w for w in third["warnings"]), "warn when B2 disagrees with selected hospital"

            assert_eq(normalize_filter_size("24x24x2 HV"), "24x24x2", "strip HV from size")
            assert_eq(normalize_filter_size("24x24x12 FF"), "24x24x12", "strip FF from size")
            assert "F8V42412GWBB" in part_match_keys("F8V424-GWBB", "24x24x12"), "part + depth"
            assert part_match_keys("F8V424-GWBB", "24x24x12") & part_match_keys(
                "F8V42412-GWBB", "24x24x12"
            ), "catalog part matches stored part with depth"

            write_workbook(
                path,
                "Foothill",
                [
                    ["AH-1", "Penthouse", "PRE", "24x24x2 HV", "90 days", 32, "MAIN", "Roof", "HVP24242", "Pleated", date(2026, 8, 25)],
                    ["AH-1", "Penthouse", "FINAL", "24x24x12 FF", "365 days", 16, "MAIN", "Roof", "F8V424-GWBB", "V-Bank", date(2026, 5, 5)],
                ],
            )
            # Pretend the app already had these rows under slightly different labels
            ahu = AHU.query.first()
            Filter.query.delete()
            db.session.add(Filter(
                ahu_id=ahu.id, phase="PRE", part_number="HVP24242", size="24x24x2",
                quantity=32, frequency_days=90, last_service_date=date(2025, 10, 22), is_active=True,
            ))
            db.session.add(Filter(
                ahu_id=ahu.id, phase="PRE", part_number="HVP24242", size="24x24x2 HV",
                quantity=32, frequency_days=90, last_service_date=date(2026, 8, 25), is_active=True,
            ))
            db.session.add(Filter(
                ahu_id=ahu.id, phase="FINAL", part_number="F8V42412-GWBB", size="24x24x12",
                quantity=16, frequency_days=365, last_service_date=date(2026, 5, 5), is_active=True,
            ))
            db.session.commit()
            assert_eq(Filter.query.filter_by(is_active=True).count(), 3, "setup: 3 active filters")

            fourth = seed_from_excel(path, hospital_id=hid)
            active = Filter.query.filter_by(ahu_id=ahu.id, is_active=True).all()
            assert_eq(len(active), 2, "survey suffixes do not create extra filters")
            pre = next(f for f in active if normalize_filter_size(f.size) == "24x24x2")
            final = next(f for f in active if normalize_filter_size(f.size) == "24x24x12")
            assert_eq(pre.last_service_date, date(2026, 8, 25), "PRE date updated from survey")
            assert_eq(pre.quantity, 32, "PRE qty kept")
            assert_eq(final.part_number, "F8V42412-GWBB", "keep original part number")
            assert_eq(final.last_service_date, date(2026, 5, 5), "FINAL date from survey")
            assert_eq(fourth["ahus_created"], 0, "AHU still matched")
            assert_eq(Filter.query.filter_by(ahu_id=ahu.id).count(), 2, "unused extra PRE row deleted")

            letter_path = path + ".letters.xlsx"
            write_lettered_survey(letter_path, "Foothill", [rtu_block("RTU-1"), rtu_block("RTU-2")])
            assert sheet_uses_survey_letters(letter_path, "EAST"), "detect printed survey columns"
            parsed = read_survey_letter_blocks(letter_path, "EAST")
            assert_eq(len(parsed), 2, "blank row splits two AHUs even if building stays filled")
            assert_eq(parsed[0]["display_name"], "RTU-1", "AHU name from first row of block")
            assert_eq(parsed[1]["display_name"], "RTU-2", "second block is RTU-2")
            assert_eq(len(parsed[0]["filters"]), 4, "four filters on RTU-1")
            assert_eq(len(parsed[1]["filters"]), 4, "four filters on RTU-2")
            assert_eq(parsed[0]["filters"][0]["quantity"], 32, "qty from column L")

            fifth = seed_from_excel(letter_path, hospital_id=hid)
            names = sorted(a.name for a in AHU.query.filter_by(hospital_id=hid).all())
            rtu1_name = format_ahu_label("RTU-1", "East Building")
            rtu2_name = format_ahu_label("RTU-2", "East Building")
            assert rtu1_name in names and rtu2_name in names, f"created both RTUs, got {names}"
            rtu1 = next(a for a in AHU.query.filter_by(hospital_id=hid).all() if ahu_name_matches(a.name, "RTU-1", "East Building"))
            rtu2 = next(a for a in AHU.query.filter_by(hospital_id=hid).all() if ahu_name_matches(a.name, "RTU-2", "East Building"))
            assert_eq(Filter.query.filter_by(ahu_id=rtu1.id, is_active=True).count(), 4, "RTU-1 has 4 filters")
            assert_eq(Filter.query.filter_by(ahu_id=rtu2.id, is_active=True).count(), 4, "RTU-2 has 4 filters")
            assert_eq(fifth["ahus_created"] >= 2, True, "two new RTUs from lettered sheet")
            assert_eq(rtu1.name, rtu1_name, "RTU name includes building")
            try:
                os.unlink(letter_path)
            except OSError:
                pass

            pkg_path = path + ".pkg.xlsx"
            write_lettered_flat(
                pkg_path,
                "Foothill",
                [
                    {"B": "Charitable Foundation", "C": "Roof", "E": "PRE", "F": "Pkg Units", "G": "Pleated", "H": "ZLP20251", "J": "20x25x1", "K": 1, "L": 4, "M": "90 Days", "O": date(2026, 8, 25)},
                    {"B": "Charitable Foundation", "C": "Roof", "E": "PRE", "F": "Pkg Units", "G": "Pleated", "H": "ZLP10241", "J": "10x24x1", "K": 6, "L": 24, "M": "90 Days", "O": date(2026, 8, 25)},
                    {"B": "HDH", "C": "Roof", "E": "PRE", "F": "Pkg Units", "G": "Pleated", "H": "HVP20242", "J": "20x24x2", "K": 5, "L": 20, "M": "90 Days", "O": date(2026, 8, 25)},
                    {"B": "12780 Hesperia rd", "C": "Roof", "E": "PRE", "F": "Pkg Units", "G": "Pleated", "H": "HVP20302", "J": "20x30x2", "K": 5, "L": 20, "M": "90 Days", "O": date(2026, 8, 25)},
                ],
            )
            pkg_blocks = read_survey_letter_blocks(pkg_path, "EAST")
            assert_eq(len(pkg_blocks), 3, "building change splits Pkg Units with no blank row")
            assert_eq(pkg_blocks[0]["building"], "Charitable Foundation", "first building")
            assert_eq(len(pkg_blocks[0]["filters"]), 2, "two filters stay on Charitable Foundation")
            assert_eq(pkg_blocks[1]["building"], "HDH", "HDH is its own AHU")
            assert_eq(pkg_blocks[2]["building"], "12780 Hesperia rd", "Hesperia is its own AHU")
            seed_from_excel(pkg_path, hospital_id=hid)
            pkg_ahus = [
                a for a in AHU.query.filter_by(hospital_id=hid).all()
                if ahu_name_matches(a.name, "Pkg Units", getattr(a.building, "name", None))
            ]
            assert_eq(len(pkg_ahus), 3, "three Pkg Units AHUs, one per building")
            by_building = {a.building.name: Filter.query.filter_by(ahu_id=a.id, is_active=True).count() for a in pkg_ahus}
            assert_eq(by_building.get("Charitable Foundation"), 2, "Charitable Foundation Pkg Units has 2 filters")
            assert_eq(by_building.get("HDH"), 1, "HDH Pkg Units has 1 filter")
            assert_eq(by_building.get("12780 Hesperia rd"), 1, "Hesperia Pkg Units has 1 filter")
            hdh = next(a for a in pkg_ahus if a.building.name == "HDH")
            assert_eq(hdh.name, "Pkg Units — HDH", "building is in the stored AHU name")
            try:
                os.unlink(pkg_path)
            except OSError:
                pass

            tabs_path = path + ".tabs.xlsx"
            write_lettered_tabs(
                tabs_path,
                "Foothill",
                {
                    "EAST": [
                        {"B": "East Building", "C": "Roof", "E": "PRE", "F": "RTU-9", "G": "Pleated", "H": "HVP24242", "J": "24x24x2", "K": 2, "L": 2, "M": "90 Days"},
                    ],
                    "MOB": [
                        {"B": "MOB", "C": "Roof", "E": "PRE", "F": "RTU-9", "G": "Pleated", "H": "HVP12242", "J": "12x24x2", "K": 4, "L": 4, "M": "90 Days"},
                    ],
                },
            )
            tabs = seed_from_excel(tabs_path, selected_sheet="all", hospital_id=hid)
            assert_eq(sorted(tabs.get("sheets") or []), ["EAST", "MOB"], "both data tabs imported")
            assert "FILTER" not in (tabs.get("sheets") or []), "FILTER tab skipped"
            assert_eq(tabs["sheets_processed"], 2, "two tabs processed")
            tab_ahus = [
                a for a in AHU.query.filter_by(hospital_id=hid).all()
                if ahu_name_matches(a.name, "RTU-9", getattr(a.building, "name", None))
            ]
            assert_eq(len(tab_ahus), 2, "same AHU name on two tabs stays two AHUs")
            tab_names = sorted(a.name for a in tab_ahus)
            assert_eq(tab_names, ["RTU-9 — East Building", "RTU-9 — MOB"], "each tab keeps its building in the name")
            try:
                os.unlink(tabs_path)
            except OSError:
                pass

            def huntington_rows():
                return [
                    {"B": "21 Building", "C": "6th Floor", "E": "PRE", "F": "AHU-1", "G": "HV Pleat", "H": "HVP24242", "J": "24x24x2", "K": 16, "L": 16, "M": "90 Days"},
                    {"B": "21 Building", "C": "6th Floor", "E": "FINAL", "F": "AHU-1", "G": "F84V", "H": "F8V424-GWBB", "J": "24x24x12", "K": 16, "L": 16, "M": "2 Years"},
                    {"B": "21 Building", "C": "6th Floor", "E": "PRE", "F": "AHU-2", "G": "HV Pleat", "H": "HVP24242", "J": "24x24x2", "K": 12, "L": 12, "M": "90 Days"},
                    {"B": "21 Building", "C": "6th Floor", "E": "FINAL", "F": "AHU-2", "G": "F84V", "H": "F8V424-GWBB", "J": "24x24x12", "K": 12, "L": 12, "M": "2 Years"},
                    {"B": "21 Building", "C": "6th Floor", "E": "PRE", "F": "AHU-2", "G": "HV Pleat", "H": "HVP24242", "J": "12x24x2", "K": 4, "L": 4, "M": "90 Days"},
                    {"B": "21 Building", "C": "6th Floor", "E": "FINAL", "F": "AHU-2", "G": "F84V", "H": "F8V424-GWBB", "J": "12x24x12", "K": 4, "L": 4, "M": "2 Years"},
                    {"B": "21 Building", "C": "6th Floor", "E": "PRE", "F": "AHU-3", "G": "HV Pleat", "H": "HVP24242", "J": "24x24x2", "K": 6, "L": 6, "M": "90 Days"},
                    {"B": "21 Building", "C": "6th Floor", "E": "FINAL", "F": "AHU-3", "G": "F84V", "H": "F8V424-GWBB", "J": "24x24x12", "K": 6, "L": 6, "M": "2 Years"},
                ]

            hunt_path = path + ".huntington.xlsx"
            write_lettered_flat(hunt_path, "Huntington Memorial", huntington_rows(), sheet="21 Building")
            hunt_blocks = read_survey_letter_blocks(hunt_path, "21 Building")
            assert_eq(len(hunt_blocks), 4, "Huntington tab 1 is 4 units, not PRE/FINAL split")
            assert_eq(hunt_blocks[0]["display_name"], "AHU-1", "block 1 is AHU-1")
            assert_eq(len(hunt_blocks[0]["filters"]), 2, "AHU-1 keeps 16 PRE + 16 FINAL")
            assert_eq(hunt_blocks[1]["display_name"], "AHU-2", "block 2 is first AHU-2")
            assert_eq([f["quantity"] for f in hunt_blocks[1]["filters"]], [12, 12], "AHU-2 12/12")
            assert_eq(hunt_blocks[2]["display_name"], "AHU-2", "block 3 is second AHU-2")
            assert_eq([f["quantity"] for f in hunt_blocks[2]["filters"]], [4, 4], "AHU-2 4/4 stays its own unit")
            assert_eq(hunt_blocks[3]["display_name"], "AHU-3", "block 4 is AHU-3")
            assert_eq(hunt_blocks[2]["instance"], 2, "second AHU-2 is instance 2")

            hunt_gapped = []
            for i, row in enumerate(huntington_rows()):
                if i:
                    hunt_gapped.append({"B": row["B"], "C": row["C"]})
                hunt_gapped.append(row)
            gapped_path = path + ".huntington-gaps.xlsx"
            write_lettered_flat(gapped_path, "Huntington Memorial", hunt_gapped, sheet="21 Building")
            gapped_blocks = read_survey_letter_blocks(gapped_path, "21 Building")
            assert_eq(len(gapped_blocks), 4, "blank between PRE and FINAL does not make 6/8 blocks")

            hunt_hospital = Hospital(name="Huntington Memorial", active=True)
            db.session.add(hunt_hospital)
            db.session.flush()
            hunt_hid = hunt_hospital.id
            first_hunt = seed_from_excel(hunt_path, hospital_id=hunt_hid)
            hunt_ahus = [a for a in AHU.query.filter_by(hospital_id=hunt_hid).all() if a.building and a.building.name == "21 Building"]
            assert_eq(len(hunt_ahus), 4, "seed creates 4 AHUs for Huntington tab 1")
            names = sorted(a.name for a in hunt_ahus)
            assert_eq(
                names,
                [
                    "AHU-1 — 21 Building",
                    "AHU-2 — 21 Building",
                    "AHU-2 — 21 Building #2",
                    "AHU-3 — 21 Building",
                ],
                "building on the name; second AHU-2 is #2",
            )
            by_name = {a.name: a for a in hunt_ahus}
            assert_eq(Filter.query.filter_by(ahu_id=by_name["AHU-1 — 21 Building"].id, is_active=True).count(), 2, "AHU-1 has PRE+FINAL")
            assert_eq(Filter.query.filter_by(ahu_id=by_name["AHU-2 — 21 Building"].id, is_active=True).count(), 2, "AHU-2 12/12 has 2 filters")
            assert_eq(Filter.query.filter_by(ahu_id=by_name["AHU-2 — 21 Building #2"].id, is_active=True).count(), 2, "AHU-2 4/4 has 2 filters")
            assert_eq(
                sorted(f.quantity for f in Filter.query.filter_by(ahu_id=by_name["AHU-2 — 21 Building"].id).all()),
                [12, 12],
                "first AHU-2 keeps 12s",
            )
            assert_eq(
                sorted(f.quantity for f in Filter.query.filter_by(ahu_id=by_name["AHU-2 — 21 Building #2"].id).all()),
                [4, 4],
                "second AHU-2 keeps 4s",
            )
            assert_eq(first_hunt["ahus_created"], 4, "four new Huntington AHUs")

            second_hunt = seed_from_excel(hunt_path, hospital_id=hunt_hid)
            assert_eq(AHU.query.filter_by(hospital_id=hunt_hid).count(), 4, "re-import does not duplicate to 6")
            assert_eq(second_hunt["ahus_created"], 0, "re-import updates the 4 units")
            assert_eq(second_hunt["ahus_updated"], 4, "all four matched")

            # Pretend an older import left unlabeled + labeled copies (the 6-block case)
            extra = AHU(
                hospital_id=hunt_hid,
                building_id=by_name["AHU-1 — 21 Building"].building_id,
                name="AHU-1",
                location="6th Floor",
            )
            db.session.add(extra)
            db.session.commit()
            assert_eq(AHU.query.filter_by(hospital_id=hunt_hid).count(), 5, "setup extra unlabeled AHU-1")
            seed_from_excel(hunt_path, hospital_id=hunt_hid)
            leftover = [
                a for a in AHU.query.filter_by(hospital_id=hunt_hid).all()
                if a.building and a.building.name == "21 Building"
            ]
            assert_eq(len(leftover), 4, "unlabeled extra AHU-1 is collapsed, not a 5th/6th block")

            try:
                os.unlink(hunt_path)
            except OSError:
                pass
            try:
                os.unlink(gapped_path)
            except OSError:
                pass
        finally:
            try:
                os.unlink(path)
            except OSError:
                pass
            try:
                os.unlink(db_path)
            except OSError:
                pass

    print("seed_from_excel tests passed")


if __name__ == "__main__":
    main()
