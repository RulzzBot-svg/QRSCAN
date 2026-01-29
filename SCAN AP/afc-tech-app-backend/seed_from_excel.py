# seed_from_excel.py
import os
import re
from datetime import datetime, date

import pandas as pd
import openpyxl

from app import app
from db import db
from models import Hospital, AHU, Filter


# Point this to your file (or build a loop later if you seed multiple hospitals)
EXCEL_PATH = "./excel_data_raw/3 QUEEN OF THE VALLEY (Standard).xlsx"


# -----------------------------
# Helpers
# -----------------------------
def clean_str(x):
    if x is None:
        return None
    s = str(x).strip()
    return s if s else None


def to_date(val):
    """Convert excel/pandas timestamp/string into a python date."""
    if val is None:
        return None
    try:
        if pd.isna(val):
            return None
    except Exception:
        pass

    if isinstance(val, pd.Timestamp):
        return val.date()

    if isinstance(val, datetime):
        return val.date()

    if isinstance(val, date):
        return val

    try:
        return pd.to_datetime(val).date()
    except Exception:
        return None


def parse_quantity(val, default=1):
    """
    Convert excel cell values into an int quantity safely.
    Handles None, NaN, floats, and strings like "10 ea".
    """
    if val is None:
        return default

    try:
        if pd.isna(val):
            return default
    except Exception:
        pass

    # already numeric
    if isinstance(val, (int, float)):
        try:
            return int(val)
        except Exception:
            return default

    s = str(val).strip()
    if not s:
        return default

    m = re.search(r"\d+", s)
    if m:
        try:
            return int(m.group(0))
        except Exception:
            return default

    return default


def parse_frequency_to_days(raw):
    """
    Convert strings like:
      "30 Days", "90 Days", "18 Months", "2 Years", "Removed"
    into an integer day count. If unknown, return None.
    """
    if raw is None:
        return None

    s = str(raw).strip()
    if not s:
        return None

    if s.lower() == "removed":
        return None

    m = re.search(r"(\d+)\s*day", s, re.IGNORECASE)
    if m:
        return int(m.group(1))

    m = re.search(r"(\d+)\s*month", s, re.IGNORECASE)
    if m:
        return int(m.group(1)) * 30  # approximation

    m = re.search(r"(\d+)\s*year", s, re.IGNORECASE)
    if m:
        return int(m.group(1)) * 365

    return None


def get_sheet_title_cell(path, sheet_name="MAIN BUILDING", cell="B2"):
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb[sheet_name] if sheet_name in wb.sheetnames else wb[wb.sheetnames[0]]
    return clean_str(ws[cell].value)


def has_attr(obj, attr: str) -> bool:
    # Works even if attr is a SQLAlchemy column
    return hasattr(obj, attr)


# -----------------------------
# Upserts
# -----------------------------
def upsert_hospital(name: str):
    h = Hospital.query.filter_by(name=name).first()
    if h:
        # keep active True if model supports it
        if hasattr(h, "active") and h.active is None:
            h.active = True
        return h

    h = Hospital(name=name, active=True)
    db.session.add(h)
    db.session.flush()
    return h


def upsert_ahu(ahu_id: str, hospital_id: int, location=None, notes=None, excel_order=None):
    ahu_id = clean_str(ahu_id)
    if not ahu_id:
        return None

    a = db.session.get(AHU, ahu_id)
    if a:
        a.hospital_id = hospital_id
        if location:
            a.location = location
        if notes:
            a.notes = notes
        if not getattr(a, "name", None):
            a.name = ahu_id

        # ✅ preserve Excel order if column exists
        if excel_order is not None and has_attr(a, "excel_order"):
            a.excel_order = int(excel_order)

        return a

    kwargs = dict(
        id=ahu_id,
        hospital_id=hospital_id,
        name=ahu_id,
        location=location,
        notes=notes,
    )

    # ✅ preserve Excel order if column exists
    if excel_order is not None and has_attr(AHU, "excel_order"):
        kwargs["excel_order"] = int(excel_order)

    a = AHU(**kwargs)
    db.session.add(a)
    return a


def find_existing_filter(ahu_id, phase, part_number, size):
    return (
        Filter.query.filter_by(
            ahu_id=ahu_id,
            phase=phase,
            part_number=part_number,
            size=size,
        ).first()
    )


def upsert_filter(
    ahu_id,
    phase,
    part_number,
    size,
    quantity,
    frequency_days,
    last_service_date,
    is_active=True,
    excel_order=None,
):
    ahu_id = clean_str(ahu_id)
    phase = clean_str(phase)
    part_number = clean_str(part_number) or ""
    size = clean_str(size)

    if not ahu_id or not size:
        return None

    existing = find_existing_filter(ahu_id, phase, part_number, size)
    if existing:
        # update mutable fields
        try:
            existing.quantity = parse_quantity(quantity, default=getattr(existing, "quantity", 1) or 1)
        except Exception:
            pass

        if frequency_days is not None:
            try:
                existing.frequency_days = int(frequency_days)
            except Exception:
                pass

        if last_service_date:
            existing.last_service_date = last_service_date

        existing.is_active = bool(is_active)

        # ✅ preserve Excel order if column exists
        if excel_order is not None and has_attr(existing, "excel_order"):
            existing.excel_order = int(excel_order)

        return existing

    if frequency_days is None:
        frequency_days = 90  # default fallback

    kwargs = dict(
        ahu_id=ahu_id,
        phase=phase,
        part_number=part_number,
        size=size,
        quantity=parse_quantity(quantity),
        frequency_days=int(frequency_days),
        last_service_date=last_service_date,
        is_active=bool(is_active),
    )

    # ✅ preserve Excel order if column exists
    if excel_order is not None and has_attr(Filter, "excel_order"):
        kwargs["excel_order"] = int(excel_order)

    f = Filter(**kwargs)
    db.session.add(f)
    return f


# -----------------------------
# Main seed
# -----------------------------
def seed_from_excel(path):
    if not os.path.exists(path):
        raise FileNotFoundError(f"Excel file not found: {path}")

    xls = pd.ExcelFile(path)

    # seed from all sheets except the legend sheet called "Filter"
    data_sheets = [s for s in xls.sheet_names if s.strip().lower() != "filter"]
    if not data_sheets:
        raise RuntimeError("No data sheets found (expected something like 'MAIN BUILDING').")

    preferred_sheet = "MAIN BUILDING" if "MAIN BUILDING" in data_sheets else data_sheets[0]
    hospital_name = get_sheet_title_cell(path, sheet_name=preferred_sheet, cell="B2") or "Unknown Hospital"

    hospital = upsert_hospital(hospital_name)

    stats = {
        "hospital": hospital_name,
        "sheets_processed": 0,
        "rows_seen": 0,
        "ahus": set(),
        "filters_upserted": 0,
        "filters_skipped": 0,
    }

    # ✅ Tracks AHU order across the workbook in encounter order
    ahu_order_map = {}   # { "AHU-1": 1, ... }
    next_ahu_order = 1

    for sheet in data_sheets:
        # your file headers are on row 5 (0-based header=4)
        df = pd.read_excel(path, sheet_name=sheet, header=4)
        df.columns = [str(c).strip() for c in df.columns]

        # normalize matching so "DATE OF \nREPLACEMENT" == "DATE OF REPLACEMENT"
        def col(exact_name):
            target = re.sub(r"\s+", " ", exact_name).strip().lower()
            for c in df.columns:
                c_norm = re.sub(r"\s+", " ", str(c)).strip().lower()
                if c_norm == target:
                    return c
            return None

        col_ahu = col("AHU NO.")
        col_loc = col("LOCATION")
        col_stage = col("STAGE")
        col_size = col("FILTER SIZE")
        col_freq = col("FREQUENCY")

        # ✅ FIX: accept QUANTITY or QTY
        col_qty = col("QUANTITY") or col("QTY")

        col_building = col("BUILDING")
        col_floor_area = col("FLOOR/AREA")
        col_part_num = col("PART NUMBER")
        col_filter_type = col("FILTER TYPE")
        col_repl = col("DATE OF REPLACEMENT")  # matches newline variant automatically

        required = [col_ahu, col_loc, col_stage, col_size, col_qty, col_freq]
        if any(x is None for x in required):
            print(
                f"Skipping sheet '{sheet}' (missing required columns). Found columns: {list(df.columns)}"
            )
            continue

        stats["sheets_processed"] += 1
        stats["rows_seen"] += len(df)

        # ✅ Tracks filter order per-AHU within this sheet's encounter order
        filter_order_map = {}  # { "AHU-1": 1, ... }

        for _, r in df.iterrows():
            ahu_no = clean_str(r.get(col_ahu))
            if not ahu_no:
                continue

            # ✅ assign a stable Excel-order index for this AHU (first time we see it)
            if ahu_no not in ahu_order_map:
                ahu_order_map[ahu_no] = next_ahu_order
                next_ahu_order += 1

            location = clean_str(r.get(col_loc))
            building = clean_str(r.get(col_building)) if col_building else None
            floor_area = clean_str(r.get(col_floor_area)) if col_floor_area else None

            notes_parts = []
            if building:
                notes_parts.append(f"Building: {building}")
            if floor_area:
                notes_parts.append(f"Floor/Area: {floor_area}")
            notes = " | ".join(notes_parts) if notes_parts else None

            upsert_ahu(
                ahu_id=ahu_no,
                hospital_id=hospital.id,
                location=location,
                notes=notes,
                excel_order=ahu_order_map[ahu_no],
            )
            stats["ahus"].add(ahu_no)

            phase = clean_str(r.get(col_stage))
            size = clean_str(r.get(col_size))
            qty = r.get(col_qty)

            freq_raw = r.get(col_freq)
            freq_days = parse_frequency_to_days(freq_raw)

            part_number = clean_str(r.get(col_part_num)) if col_part_num else None
            if not part_number:
                part_number = clean_str(r.get(col_filter_type)) if col_filter_type else None

            last_service_date = to_date(r.get(col_repl)) if col_repl else None

            is_active = True
            if isinstance(freq_raw, str) and freq_raw.strip().lower() == "removed":
                is_active = False

            if not size:
                stats["filters_skipped"] += 1
                continue

            # ✅ assign filter encounter order within the AHU
            filter_order_map.setdefault(ahu_no, 1)
            filter_excel_order = filter_order_map[ahu_no]
            filter_order_map[ahu_no] += 1

            upsert_filter(
                ahu_id=ahu_no,
                phase=phase,
                part_number=part_number,
                size=size,
                quantity=qty,
                frequency_days=freq_days,
                last_service_date=last_service_date,
                is_active=is_active,
                excel_order=filter_excel_order,
            )
            stats["filters_upserted"] += 1

    db.session.commit()

    print("\n✅ Seed complete")
    print(f"Hospital: {stats['hospital']}")
    print(f"Sheets processed: {stats['sheets_processed']}")
    print(f"Rows seen: {stats['rows_seen']}")
    print(f"AHUs upserted: {len(stats['ahus'])}")
    print(f"Filters upserted: {stats['filters_upserted']}")
    print(f"Filters skipped (missing size): {stats['filters_skipped']}")


if __name__ == "__main__":
    with app.app_context():
        seed_from_excel(EXCEL_PATH)
