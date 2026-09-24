# seed_from_excel.py
import argparse
import os
import re
import sys
from datetime import datetime, date

import pandas as pd
import openpyxl
from sqlalchemy import func, or_

from db import db
from models import Hospital, AHU, Filter, Building, Job, JobFilter, JobSignature, Notification


EXCEL_PATH = "./excel_data_raw/filter-datasheet.xlsm"


# -----------------------------
# Helpers
# -----------------------------
def clean_str(x):
    """Trim strings safely; treat NaN/None/empty as None."""
    if x is None:
        return None
    try:
        if pd.isna(x):
            return None
    except Exception:
        pass
    s = str(x).strip()
    if not s:
        return None
    # normalize common NaN-ish strings
    if s.strip().lower() in ("nan", "none", "null", "n/a", "na", "-", "empty"):
        return None
    return s


def is_placeholder(s):
    if not s:
        return True
    normalized = str(s).strip().lower()
    return normalized in ["empty", "nan", "n/a", "na", "-", "none", "null"]


def to_date(val):
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
    if val is None:
        return default
    try:
        if pd.isna(val):
            return default
    except Exception:
        pass

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
        return int(m.group(1)) * 30

    m = re.search(r"(\d+)\s*year", s, re.IGNORECASE)
    if m:
        return int(m.group(1)) * 365

    return None


def open_survey_workbook(path):
    return openpyxl.load_workbook(path, data_only=True)


def workbook_sheet(wb, sheet_name=None):
    if sheet_name and sheet_name in wb.sheetnames:
        return wb[sheet_name]
    return wb[wb.sheetnames[0]]


def get_sheet_title_cell(path, sheet_name="MAIN BUILDING", cell="B2", wb=None):
    close = False
    if wb is None:
        wb = open_survey_workbook(path)
        close = True
    try:
        ws = workbook_sheet(wb, sheet_name)
        return clean_str(ws[cell].value)
    finally:
        if close:
            wb.close()


def has_attr(obj, attr: str) -> bool:
    return hasattr(obj, attr)


def _norm_name(s):
    """Case-insensitive, collapsed-whitespace name for matching existing records."""
    s = clean_str(s)
    if not s:
        return None
    return re.sub(r"\s+", " ", s).strip().lower()


_INSTANCE_SUFFIX = re.compile(r"\s*#\d+$")


def _strip_instance_suffix(name):
    s = clean_str(name)
    if not s:
        return None
    return _INSTANCE_SUFFIX.sub("", s).strip() or None


def format_ahu_label(ahu_name, building, instance=1):
    """Pkg Units + HDH → 'Pkg Units — HDH'. Second same-name unit is '… #2'."""
    ahu_name = clean_str(ahu_name)
    building = clean_str(building)
    if not ahu_name:
        base = building
    elif not building or (_norm_name(building) and _norm_name(building) in _norm_name(ahu_name)):
        base = ahu_name
    else:
        base = f"{ahu_name} — {building}"
    try:
        n = int(instance or 1)
    except (TypeError, ValueError):
        n = 1
    if base and n > 1:
        return f"{base} #{n}"
    return base


def ahu_name_matches(stored_name, excel_name, building=None):
    stored = _norm_name(_strip_instance_suffix(stored_name))
    excel = _norm_name(excel_name)
    labeled = _norm_name(format_ahu_label(excel_name, building, instance=1))
    if not stored:
        return False
    if excel and stored == excel:
        return True
    if labeled and stored == labeled:
        return True
    return False


SKIP_SHEET_NAMES = {
    "filter",
    "filters",
    "legend",
    "instructions",
    "readme",
    "index",
    "cover",
    "toc",
}


def is_skip_sheet(name):
    n = (name or "").strip().lower()
    if n in SKIP_SHEET_NAMES:
        return True
    if n.startswith("chart") or n.startswith("pivot"):
        return True
    return False


def _looks_like_ahu_label(val):
    """AH-1, AHU-2, RTU-1, MAU-3, etc."""
    s = clean_str(val)
    if not s:
        return False
    s2 = s.upper()
    if re.search(r"\b(AHU|AH|RTU|MAU|ACU|DOAS)\b", s2):
        return True
    if re.search(r"(AHU|AH|RTU|MAU)[-_ ]?\d+", s2):
        return True
    return False


# Hospital survey workbooks: blank row = next AHU. Columns from the printed sheet.
SURVEY_LETTERS = ("B", "C", "E", "F", "G", "H", "J", "K", "L", "M", "N", "O", "P")


def _survey_cells(ws, row):
    return {letter: ws[f"{letter}{row}"].value for letter in SURVEY_LETTERS}


def _survey_header_row(vals):
    blob = " ".join(str(v).upper() for v in vals.values() if v is not None)
    if "STAGE" in blob and ("AHU" in blob or "PART" in blob):
        return True
    e = clean_str(vals.get("E"))
    f = clean_str(vals.get("F"))
    if e and f and "STAGE" in e.upper() and "AHU" in f.upper():
        return True
    return False


def _survey_filter_row(vals):
    """True when this row has filter data. Building/location alone is still a blank separator."""
    for letter in ("E", "F", "G", "H", "J", "K", "L"):
        v = clean_str(vals.get(letter))
        if not v or is_placeholder(v):
            continue
        if _survey_header_row({letter: v}):
            continue
        return True
    return False


def sheet_uses_survey_letters(path, sheet_name, wb=None):
    close = False
    if wb is None:
        wb = open_survey_workbook(path)
        close = True
    try:
        ws = workbook_sheet(wb, sheet_name)
        last = min(ws.max_row or 1, 20)
        for r in range(1, last + 1):
            if _survey_header_row(_survey_cells(ws, r)):
                return True
        return False
    finally:
        if close:
            wb.close()


def _first_filled(rows, letter):
    for vals in rows:
        raw = clean_str(vals.get(letter))
        if raw and not is_placeholder(raw):
            return raw
    return None


def _stage_kind(val):
    """pre / final / other — PRE after FINAL starts the next physical AHU."""
    s = (clean_str(val) or "").upper()
    if not s:
        return None
    compact = re.sub(r"[^A-Z0-9]", "", s)
    if compact.startswith("PRE") or compact in ("1ST", "FIRST", "PRIMARY"):
        return "pre"
    if compact.startswith("FINAL") or compact in ("FIN", "LAST"):
        return "final"
    return "other"


def _block_has_post_pre_stage(rows):
    for vals in rows:
        if _stage_kind(vals.get("E")) in ("final", "other"):
            return True
    return False


def _should_start_new_ahu(current, vals):
    """
    One physical unit is usually PRE row(s) then FINAL row(s).
    Split on building change, AHU name change, or PRE after FINAL
    (Huntington: two AHU-2s on 6th floor, 12/12 then 4/4).
    """
    if not current:
        return False
    row_building = clean_str(vals.get("B"))
    row_ahu = clean_str(vals.get("F"))
    block_building = _first_filled(current, "B")
    block_ahu = _first_filled(current, "F")
    if row_building and block_building and _norm_name(row_building) != _norm_name(block_building):
        return True
    if row_ahu and block_ahu and _norm_name(row_ahu) != _norm_name(block_ahu):
        return True
    if _stage_kind(vals.get("E")) == "pre" and _block_has_post_pre_stage(current):
        return True
    return False


def assign_block_instances(blocks):
    """Number repeated (building, name) units: first is 1, next same name is 2."""
    counts = {}
    for block in blocks:
        key = (_norm_name(block.get("building")), _norm_name(block.get("display_name")))
        counts[key] = counts.get(key, 0) + 1
        block["instance"] = counts[key]
    return blocks


def read_survey_letter_blocks(path, sheet_name, wb=None):
    """
    One block per physical AHU. Split when:
    - column B building changes (East Building vs MOB vs HDH)
    - column F writes a different AHU name
    - stage goes back to PRE after FINAL (second AHU-2 on the same floor)
    A blank / building-only row does not split PRE from FINAL of the same unit.
    A blank before a new PRE does split (next unit).
    """
    close = False
    if wb is None:
        wb = open_survey_workbook(path)
        close = True
    try:
        return _read_survey_letter_blocks_ws(workbook_sheet(wb, sheet_name))
    finally:
        if close:
            wb.close()


def _read_survey_letter_blocks_ws(ws):
    start = 1
    last = ws.max_row or 1
    for r in range(1, min(last, 25) + 1):
        if _survey_header_row(_survey_cells(ws, r)):
            start = r + 1
            break

    blocks = []
    current = []
    pending_blank = False

    def close_block():
        if not current:
            return
        display_name = None
        building = None
        location = None
        for vals in current:
            if not display_name:
                raw = clean_str(vals.get("F"))
                if raw and not is_placeholder(raw) and not _survey_header_row({"F": raw}):
                    display_name = raw
            if not building:
                building = clean_str(vals.get("B"))
            if not location:
                location = clean_str(vals.get("C"))
        filters = []
        for vals in current:
            phase = clean_str(vals.get("E"))
            if _looks_like_ahu_label(phase):
                phase = None
            size = clean_str(vals.get("J"))
            qty = vals.get("L")
            if qty is None or clean_str(qty) is None:
                qty = vals.get("K")
            part = clean_str(vals.get("H")) or clean_str(vals.get("G"))
            filters.append({
                "phase": phase,
                "size": size,
                "quantity": qty,
                "freq_raw": vals.get("M"),
                "part_number": part,
                "last_service_date": to_date(vals.get("O")),
                "invoice": clean_str(vals.get("N")),
            })
        blocks.append({
            "display_name": display_name,
            "building": building,
            "location": location,
            "filters": filters,
        })
        current.clear()

    for r in range(start, last + 1):
        vals = _survey_cells(ws, r)
        if _survey_header_row(vals):
            continue
        if not _survey_filter_row(vals):
            pending_blank = True
            continue
        start_new = _should_start_new_ahu(current, vals)
        if current and (start_new or (pending_blank and _stage_kind(vals.get("E")) == "pre")):
            close_block()
        pending_blank = False
        current.append(vals)
    close_block()
    return assign_block_instances(blocks)


def normalize_ahu_key(display_name: str, building: str = None, instance=1) -> str:
    """
    Logical grouping key so multiple filter rows map to the same AHU.
    Include building and instance so two AHU-2s on 21 Building stay two units.
    """
    dn = clean_str(display_name) or ""
    b = clean_str(building) or ""
    try:
        inst = int(instance or 1)
    except (TypeError, ValueError):
        inst = 1
    raw = f"{b}::{dn}::{inst}".strip().lower()
    raw = re.sub(r"\s+", " ", raw).strip()
    return raw or "unnamed"


def serialize_seed_stats(stats, dry_run=False):
    """JSON-safe import summary for the admin upload UI and CLI."""
    ahu_ids = stats.get("ahus") or set()
    try:
        touched = len(ahu_ids)
    except TypeError:
        touched = 0
    return {
        "dry_run": bool(dry_run),
        "hospital": stats.get("hospital"),
        "hospital_id": stats.get("hospital_id"),
        "excel_hospital_name": stats.get("excel_hospital_name"),
        "hospital_created": bool(stats.get("hospital_created")),
        "sheets_processed": int(stats.get("sheets_processed") or 0),
        "sheets_skipped": list(stats.get("sheets_skipped") or []),
        "sheets": list(stats.get("sheets") or []),
        "rows_seen": int(stats.get("rows_seen") or 0),
        "ahus_created": int(stats.get("ahus_created") or 0),
        "ahus_updated": int(stats.get("ahus_updated") or 0),
        "ahus_touched": touched,
        "filters_upserted": int(stats.get("filters_upserted") or 0),
        "filters_skipped": int(stats.get("filters_skipped") or 0),
        "replace_existing": bool(stats.get("replace_existing")),
        "ahus_cleared": int(stats.get("ahus_cleared") or 0),
        "filters_cleared": int(stats.get("filters_cleared") or 0),
        "jobs_cleared": int(stats.get("jobs_cleared") or 0),
        "buildings_cleared": int(stats.get("buildings_cleared") or 0),
        "warnings": list(stats.get("warnings") or []),
    }


def make_sequential_ahu_id(seq: int) -> str:
    return f"AHU-{seq:03d}"


# -----------------------------
# Upserts
# -----------------------------
def upsert_hospital(name: str, hospital_id=None):
    """
    Return (hospital, created).
    If hospital_id is set, use that hospital (do not create a duplicate from cell B2).
    Otherwise match by name, case-insensitively.
    """
    if hospital_id is not None:
        try:
            hid = int(hospital_id)
        except (TypeError, ValueError) as exc:
            raise ValueError("hospital_id must be an integer") from exc
        h = db.session.get(Hospital, hid)
        if not h:
            raise ValueError(f"Hospital id {hid} was not found")
        return h, False

    name = clean_str(name)
    if not name:
        raise ValueError("Hospital name is missing (Excel cell B2)")

    h = Hospital.query.filter(func.lower(Hospital.name) == name.lower()).first()
    if h:
        if hasattr(h, "active") and h.active is None:
            h.active = True
        return h, False

    h = Hospital(name=name, active=True)
    db.session.add(h)
    db.session.flush()
    return h, True


def clear_hospital_survey_records(hospital_id):
    """
    Delete AHUs/filters/buildings (and jobs on those AHUs) for one hospital.
    Keeps the hospital row so Import can reload the workbook onto the same site.
    """
    try:
        hid = int(hospital_id)
    except (TypeError, ValueError) as exc:
        raise ValueError("hospital_id must be an integer") from exc

    hospital = db.session.get(Hospital, hid)
    if not hospital:
        raise ValueError(f"Hospital id {hid} was not found")

    building_ids = [r[0] for r in db.session.query(Building.id).filter_by(hospital_id=hid).all()]
    ahu_q = db.session.query(AHU.id).filter(AHU.hospital_id == hid)
    if building_ids:
        ahu_q = db.session.query(AHU.id).filter(
            or_(AHU.hospital_id == hid, AHU.building_id.in_(building_ids))
        )
    ahu_ids = [r[0] for r in ahu_q.all()]
    job_ids = (
        [r[0] for r in db.session.query(Job.id).filter(Job.ahu_id.in_(ahu_ids)).all()]
        if ahu_ids
        else []
    )
    filter_count = (
        db.session.query(Filter.id).filter(Filter.ahu_id.in_(ahu_ids)).count() if ahu_ids else 0
    )

    counts = {
        "ahus": len(ahu_ids),
        "filters": int(filter_count),
        "jobs": len(job_ids),
        "buildings": len(building_ids),
    }

    notif_filters = [Notification.hospital_id == hid]
    if ahu_ids:
        notif_filters.append(Notification.ahu_id.in_(ahu_ids))
    if job_ids:
        notif_filters.append(Notification.job_id.in_(job_ids))
    db.session.query(Notification).filter(or_(*notif_filters)).delete(synchronize_session=False)

    if job_ids:
        db.session.query(JobSignature).filter(JobSignature.job_id.in_(job_ids)).delete(
            synchronize_session=False
        )
        db.session.query(JobFilter).filter(JobFilter.job_id.in_(job_ids)).delete(
            synchronize_session=False
        )
        db.session.query(Job).filter(Job.id.in_(job_ids)).delete(synchronize_session=False)

    if ahu_ids:
        filter_ids = [
            r[0] for r in db.session.query(Filter.id).filter(Filter.ahu_id.in_(ahu_ids)).all()
        ]
        if filter_ids:
            db.session.query(JobFilter).filter(JobFilter.filter_id.in_(filter_ids)).delete(
                synchronize_session=False
            )
            db.session.query(Filter).filter(Filter.id.in_(filter_ids)).delete(
                synchronize_session=False
            )
        db.session.query(AHU).filter(AHU.id.in_(ahu_ids)).delete(synchronize_session=False)

    if building_ids:
        db.session.query(Building).filter(Building.id.in_(building_ids)).delete(
            synchronize_session=False
        )

    db.session.flush()
    db.session.expire_all()
    return counts


def upsert_building(hospital_id: int, name: str, floor_area: str = None):
    name = clean_str(name)
    if not name:
        return None

    b = Building.query.filter(
        Building.hospital_id == hospital_id,
        func.lower(Building.name) == name.lower(),
    ).first()
    if b:
        if floor_area and has_attr(b, "floor_area") and not b.floor_area:
            b.floor_area = floor_area
        return b

    b = Building(hospital_id=hospital_id, name=name, floor_area=floor_area, active=True)
    db.session.add(b)
    db.session.flush()
    return b


def apply_ahu_label(ahu, display_name, building, instance=1):
    """Persist 'AHU — Building' so Admin/QR can tell Pkg Units at HDH from Pkg Units at MOB."""
    if ahu is None:
        return None
    label = format_ahu_label(display_name, building, instance=instance)
    if not label:
        return None
    if ahu.name and _norm_name(ahu.name) == _norm_name(label):
        return ahu.name
    ahu.name = label
    return label


def find_existing_ahu(
    hospital_id,
    name,
    building_id=None,
    building_name=None,
    claimed_ids=None,
    instance=1,
):
    """Match an AHU already in the DB so re-seeding updates instead of duplicating."""
    if not _norm_name(name):
        return None

    claimed = set(claimed_ids or [])
    candidates = (
        AHU.query.filter_by(hospital_id=hospital_id)
        .order_by(AHU.id.asc())
        .all()
    )
    matches = [
        a for a in candidates
        if a.id not in claimed and ahu_name_matches(a.name, name, building_name)
    ]
    if not matches:
        return None

    if building_id is not None:
        usable = [a for a in matches if a.building_id in (None, building_id)]
    else:
        usable = matches
    if not usable:
        return None

    def rank(a):
        same_building = building_id is not None and a.building_id == building_id
        return (
            0 if same_building else 1 if a.building_id is None else 2,
            a.excel_order is None,
            a.excel_order or 0,
            a.id,
        )

    labeled = format_ahu_label(name, building_name, instance=instance)
    for a in usable:
        if _norm_name(a.name) == _norm_name(labeled):
            return a
    usable.sort(key=rank)
    idx = max(0, int(instance or 1) - 1)
    if idx < len(usable):
        return usable[idx]
    # Instance 2+ with only one leftover unlabeled row — take the first unused.
    if usable:
        return usable[0]
    return None


def _excel_name_from_stored(stored_name, building_name=None):
    """'AHU-1 — 21 Building #2' → 'AHU-1'."""
    name = _strip_instance_suffix(stored_name)
    building = clean_str(building_name)
    if name and building:
        suffix = f" — {building}"
        if name.lower().endswith(suffix.lower()):
            return name[: -len(suffix)].strip() or name
    return name


def collapse_unclaimed_ahu_duplicates(hospital_id, claimed_ids):
    """
    Re-import used to leave AHU-1 plus AHU-1 — 21 Building.
    Move leftover same-name filters onto the claimed unit and drop the extra.
    """
    claimed = [i for i in (claimed_ids or []) if i is not None]
    if not claimed:
        return
    keepers = [db.session.get(AHU, i) for i in claimed]
    keepers = [a for a in keepers if a is not None]
    claimed_set = {a.id for a in keepers}

    for keep in keepers:
        building_name = keep.building.name if keep.building else None
        excel_name = _excel_name_from_stored(keep.name, building_name)
        extras = []
        for a in AHU.query.filter_by(hospital_id=hospital_id).all():
            if a.id in claimed_set:
                continue
            if a.building_id not in (None, keep.building_id):
                continue
            if ahu_name_matches(a.name, excel_name, building_name):
                extras.append(a)
        for extra in extras:
            for f in list(Filter.query.filter_by(ahu_id=extra.id).all()):
                existing = find_existing_filter(keep.id, f.phase, f.part_number, f.size)
                if existing:
                    used = (
                        db.session.query(JobFilter.id)
                        .filter(JobFilter.filter_id == f.id)
                        .first()
                    )
                    if used:
                        f.is_active = False
                    else:
                        db.session.delete(f)
                else:
                    f.ahu_id = keep.id
            leftover = Filter.query.filter_by(ahu_id=extra.id).first()
            job = db.session.query(Job.id).filter(Job.ahu_id == extra.id).first()
            if not leftover and not job:
                db.session.delete(extra)
            claimed_set.add(extra.id)


def select_data_sheets(sheet_names, selected_sheet=None):
    """Every tab unless a single sheet is requested. Skip legend/filter/chart tabs."""
    names = list(sheet_names or [])
    if selected_sheet and str(selected_sheet).strip().lower() not in ("", "all"):
        if selected_sheet not in names:
            raise ValueError(f"Sheet '{selected_sheet}' not found. Available: {names}")
        return [selected_sheet]
    data = [s for s in names if not is_skip_sheet(s)]
    if not data:
        raise RuntimeError("No data sheets found.")
    return data


def upsert_ahu(
    ahu_id: str,
    hospital_id: int,
    display_name: str = None,
    location=None,
    notes=None,
    excel_order=None,
    building_id=None
):
    # Accept either an integer AHU id or a logical label. When seeding
    # we generally create AHU records directly and then map logical keys
    # to the assigned integer id. This helper will try to fetch by id
    # when possible; otherwise it will return None (seeding logic will
    # create new AHU records explicitly).
    if ahu_id is None:
        return None
    try:
        aid = int(ahu_id)
    except Exception:
        return None

    a = db.session.get(AHU, aid)
    if a:
        a.hospital_id = hospital_id
        if building_id is not None and has_attr(a, "building_id"):
            a.building_id = building_id
        if display_name:
            a.name = display_name
        a.location = clean_str(location) or a.location
        a.notes = clean_str(notes) or a.notes

        if excel_order is not None and has_attr(a, "excel_order"):
            a.excel_order = int(excel_order)
        return a

    return None


def _fmt_dim(n):
    try:
        f = float(n)
        if f.is_integer():
            return str(int(f))
        return str(f)
    except (TypeError, ValueError):
        return str(n)


def normalize_filter_size(size):
    """24x24x2 HV / 24x24x12 FF → 24x24x2 / 24x24x12."""
    s = clean_str(size)
    if not s:
        return None
    nums = re.findall(r"\d+(?:\.\d+)?", s)
    if len(nums) >= 3:
        return f"{_fmt_dim(nums[0])}x{_fmt_dim(nums[1])}x{_fmt_dim(nums[2])}"
    return re.sub(r"\s+", "", s).lower()


def normalize_part_key(part):
    return re.sub(r"[^A-Z0-9]", "", (clean_str(part) or "").upper())


def part_match_keys(part, size=None):
    """
    Keys so F8V424-GWBB matches F8V42412-GWBB when the size depth is 12.
    Surveys often omit the depth from the catalog number; the app stored it inline.
    """
    raw = clean_str(part) or ""
    base = normalize_part_key(raw)
    keys = set()
    if base:
        keys.add(base)

    size_n = normalize_filter_size(size) if size else None
    depth = None
    if size_n:
        bits = size_n.split("x")
        if len(bits) >= 3:
            depth = bits[2]

    if depth and raw:
        if "-" in raw:
            head, tail = raw.rsplit("-", 1)
            keys.add(normalize_part_key(f"{head}{depth}-{tail}"))
            keys.add(normalize_part_key(f"{head}-{tail}"))
        stripped = re.sub(re.escape(depth) + r"(?=[A-Z]|$)", "", base, count=1)
        if stripped:
            keys.add(stripped)
        keys.add(normalize_part_key(raw + depth))
    return {k for k in keys if k}


def find_matching_filters(ahu_id, phase, part_number, size):
    """All filters on this AHU that are the same logical row. Oldest first."""
    phase_n = _norm_name(phase)
    size_n = normalize_filter_size(size)
    part_keys = part_match_keys(part_number, size)
    if not size_n or not part_keys:
        return []

    candidates = (
        Filter.query.filter_by(ahu_id=ahu_id)
        .order_by(Filter.id.asc())
        .all()
    )
    matches = []
    for f in candidates:
        if phase_n != _norm_name(f.phase):
            continue
        if normalize_filter_size(f.size) != size_n:
            continue
        f_keys = part_match_keys(f.part_number, f.size) | part_match_keys(f.part_number, size)
        if part_keys & f_keys:
            matches.append(f)
    return matches


def find_existing_filter(ahu_id, phase, part_number, size):
    matches = find_matching_filters(ahu_id, phase, part_number, size)
    return matches[0] if matches else None


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
    # ahu_id may be an integer (preferred) or a label string; support both
    if isinstance(ahu_id, str):
        ahu_id_clean = clean_str(ahu_id)
        if not ahu_id_clean:
            return None
        try:
            ahu_id_val = int(ahu_id_clean)
        except Exception:
            # if it's not numeric, abort (we expect numeric AHU IDs now)
            return None
    else:
        ahu_id_val = ahu_id

    phase = clean_str(phase)
    part_number = clean_str(part_number) or ""
    size = normalize_filter_size(size) or clean_str(size)

    if not ahu_id_val or not size:
        return None
    matches = find_matching_filters(ahu_id_val, phase, part_number, size)
    existing = matches[0] if matches else None
    if existing:
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
        existing.size = size

        if excel_order is not None and has_attr(existing, "excel_order"):
            existing.excel_order = int(excel_order)

        # A prior import often created extras because size had "HV"/"FF" or
        # the part number embedded the depth. Keep the oldest row; delete
        # unused copies so they disappear from Admin. Soft-disable if a job used them.
        for extra in matches[1:]:
            used = (
                db.session.query(JobFilter.id)
                .filter(JobFilter.filter_id == extra.id)
                .first()
            )
            if used:
                extra.is_active = False
            else:
                db.session.delete(extra)

        return existing

    if frequency_days is None:
        frequency_days = 90

    kwargs = dict(
        ahu_id=ahu_id_val,
        phase=phase,
        part_number=part_number,
        size=size,
        quantity=parse_quantity(quantity),
        frequency_days=int(frequency_days),
        last_service_date=last_service_date,
        is_active=bool(is_active),
    )

    if excel_order is not None and has_attr(Filter, "excel_order"):
        kwargs["excel_order"] = int(excel_order)

    f = Filter(**kwargs)
    db.session.add(f)
    return f


def seed_parsed_ahu_block(hospital, stats, ahu_key_to_id, next_seq, block, filter_order_map):
    """Create/update one AHU and upsert the filter rows already parsed for it."""
    display_name = block.get("display_name")
    building = clean_str(block.get("building"))
    location = clean_str(block.get("location"))
    if not display_name:
        display_name = f"Unnamed — {location}" if location else f"Unnamed — {next_seq}"

    instance = int(block.get("instance") or 1)
    label = format_ahu_label(display_name, building, instance=instance)
    ahu_key = normalize_ahu_key(display_name, building=building, instance=instance)
    building_id = None
    if building:
        building_obj = upsert_building(hospital.id, building)
        building_id = building_obj.id if building_obj else None

    if ahu_key not in ahu_key_to_id:
        existing = find_existing_ahu(
            hospital.id,
            display_name,
            building_id=building_id,
            building_name=building,
            claimed_ids=ahu_key_to_id.values(),
            instance=instance,
        )
        if existing:
            ahu_id = existing.id
            ahu_key_to_id[ahu_key] = ahu_id
            excel_order = next_seq
            next_seq += 1
            stats["ahus_updated"] += 1
            if building_id and getattr(existing, "building_id", None) != building_id:
                existing.building_id = building_id
            if location:
                existing.location = location
            apply_ahu_label(existing, display_name, building, instance=instance)
        else:
            display_label = make_sequential_ahu_id(next_seq)
            a = AHU(
                hospital_id=hospital.id,
                building_id=building_id,
                name=label or display_name or display_label,
                location=location,
                notes=None,
                excel_order=next_seq,
            )
            db.session.add(a)
            db.session.flush()
            ahu_id = a.id
            ahu_key_to_id[ahu_key] = ahu_id
            excel_order = next_seq
            next_seq += 1
            stats["ahus_created"] += 1
    else:
        ahu_id = ahu_key_to_id[ahu_key]
        existing_ahu = db.session.get(AHU, ahu_id)
        excel_order = getattr(existing_ahu, "excel_order", None) if existing_ahu else None
        apply_ahu_label(existing_ahu, display_name, building, instance=instance)

    notes_parts = [f"Excel AHU block", f"Excel Display: {display_name}"]
    if building:
        notes_parts.append(f"Building: {building}")
    notes = " | ".join(notes_parts)
    ahu_obj = db.session.get(AHU, ahu_id)
    if ahu_obj:
        ahu_obj.notes = notes or ahu_obj.notes
        apply_ahu_label(ahu_obj, display_name, building, instance=instance)
        if excel_order is not None and hasattr(ahu_obj, "excel_order"):
            ahu_obj.excel_order = int(excel_order)
    stats["ahus"].add(ahu_id)

    filter_order_map.setdefault(ahu_id, 1)
    for row in block.get("filters") or []:
        phase = row.get("phase")
        if _looks_like_ahu_label(phase):
            phase = None
        size = row.get("size")
        qty = row.get("quantity")
        freq_raw = row.get("freq_raw")
        freq_days = parse_frequency_to_days(freq_raw)
        part_number = row.get("part_number")
        last_service_date = row.get("last_service_date")
        is_active = True
        if isinstance(freq_raw, str) and freq_raw.strip().lower() == "removed":
            is_active = False
        if not size:
            stats["filters_skipped"] += 1
            continue
        filter_excel_order = filter_order_map[ahu_id]
        filter_order_map[ahu_id] += 1
        upsert_filter(
            ahu_id=ahu_id,
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
    return next_seq


# -----------------------------
# Main seed
# -----------------------------
def seed_from_excel(path, selected_sheet=None, dry_run=False, hospital_id=None, replace_existing=False):
    if not os.path.exists(path):
        raise FileNotFoundError(f"Excel file not found: {path}")

    if replace_existing and hospital_id is None:
        raise ValueError("Pick the hospital in Import before starting fresh.")

    wb = open_survey_workbook(path)
    try:
        return _seed_from_open_workbook(
            path,
            wb,
            selected_sheet=selected_sheet,
            dry_run=dry_run,
            hospital_id=hospital_id,
            replace_existing=replace_existing,
        )
    finally:
        try:
            wb.close()
        except Exception:
            pass


def _seed_from_open_workbook(path, wb, selected_sheet=None, dry_run=False, hospital_id=None, replace_existing=False):
    data_sheets = select_data_sheets(wb.sheetnames, selected_sheet)
    preferred_sheet = "MAIN BUILDING" if "MAIN BUILDING" in data_sheets else data_sheets[0]

    excel_hospital_name = get_sheet_title_cell(path, sheet_name=preferred_sheet, cell="B2", wb=wb) or preferred_sheet.upper().replace("_", " ")
    hospital, hospital_created = upsert_hospital(excel_hospital_name, hospital_id=hospital_id)

    stats = {
        "hospital": hospital.name,
        "hospital_id": hospital.id,
        "excel_hospital_name": excel_hospital_name,
        "hospital_created": hospital_created,
        "sheets_processed": 0,
        "sheets_skipped": [],
        "sheets": [],
        "rows_seen": 0,
        "ahus": set(),
        "ahus_created": 0,
        "ahus_updated": 0,
        "filters_upserted": 0,
        "filters_skipped": 0,
        "replace_existing": bool(replace_existing),
        "ahus_cleared": 0,
        "filters_cleared": 0,
        "jobs_cleared": 0,
        "buildings_cleared": 0,
        "warnings": [],
    }

    if (
        hospital_id is not None
        and _norm_name(excel_hospital_name)
        and _norm_name(hospital.name) != _norm_name(excel_hospital_name)
    ):
        stats["warnings"].append(
            f"Workbook cell B2 says '{excel_hospital_name}' but records were applied to '{hospital.name}'."
        )
    if hospital_created:
        stats["warnings"].append(
            f"Created a new hospital named '{hospital.name}'. Pick an existing hospital in Import if this should have updated one."
        )

    if replace_existing and not hospital_created:
        cleared = clear_hospital_survey_records(hospital.id)
        stats["ahus_cleared"] = cleared["ahus"]
        stats["filters_cleared"] = cleared["filters"]
        stats["jobs_cleared"] = cleared["jobs"]
        stats["buildings_cleared"] = cleared["buildings"]
        stats["warnings"].append(
            f"Started fresh: removed {cleared['ahus']} AHUs, {cleared['filters']} filters"
            + (f", {cleared['jobs']} jobs" if cleared["jobs"] else "")
            + f" from '{hospital.name}'."
        )

    # logical key -> sequential id
    ahu_key_to_id = {}
    next_seq = 1

    for sheet in data_sheets:
        if is_skip_sheet(sheet) and not (
            selected_sheet and str(selected_sheet).strip().lower() not in ("", "all")
        ):
            stats["sheets_skipped"].append({"sheet": sheet, "reason": "skip list"})
            continue

        try:
            uses_letters = sheet_uses_survey_letters(path, sheet, wb=wb)
        except Exception as exc:
            stats["sheets_skipped"].append({"sheet": sheet, "reason": str(exc)})
            stats["warnings"].append(f"Skipped tab '{sheet}': {exc}")
            continue

        if uses_letters:
            try:
                letter_blocks = read_survey_letter_blocks(path, sheet, wb=wb)
            except Exception as exc:
                stats["sheets_skipped"].append({"sheet": sheet, "reason": str(exc)})
                stats["warnings"].append(f"Skipped tab '{sheet}': {exc}")
                continue
            if letter_blocks:
                stats["sheets_processed"] += 1
                stats["sheets"].append(sheet)
                stats["rows_seen"] += sum(len(b.get("filters") or []) for b in letter_blocks)
                filter_order_map = {}
                for block in letter_blocks:
                    next_seq = seed_parsed_ahu_block(
                        hospital, stats, ahu_key_to_id, next_seq, block, filter_order_map
                    )
                collapse_unclaimed_ahu_duplicates(hospital.id, ahu_key_to_id.values())
                continue

        df = pd.read_excel(path, sheet_name=sheet, header=4)
        df.columns = [str(c).strip() for c in df.columns]

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
        col_qty = col("QUANTITY") or col("QTY")

        col_building = col("BUILDING")
        col_floor_area = col("FLOOR/AREA")
        col_part_num = col("PART NUMBER")
        col_filter_type = col("FILTER TYPE")
        col_repl = col("DATE OF REPLACEMENT")

        required = [col_ahu, col_loc, col_stage, col_size, col_qty, col_freq]
        if any(x is None for x in required):
            print(f"Skipping sheet '{sheet}' (missing required columns). Found columns: {list(df.columns)}")
            stats["sheets_skipped"].append({
                "sheet": sheet,
                "reason": "missing required columns",
            })
            continue

        stats["sheets_processed"] += 1
        stats["sheets"].append(sheet)
        stats["rows_seen"] += len(df)

        filter_order_map = {}

        # Build row blocks separated by fully-blank separator rows.
        rows = [r for _, r in df.iterrows()]
        blocks = []
        current_block = []

        def row_has_data(r):
            # Check relevant columns for any non-placeholder data
            for c in (col_ahu, col_stage, col_size, col_qty, col_part_num, col_filter_type, col_freq, col_repl, col_loc, col_building):
                if c:
                    v = clean_str(r.get(c))
                    if v and not is_placeholder(v):
                        return True
            return False

        def looks_like_ahu_label(val):
            """Return True when a cell looks like an AH/AHU/RTU label (e.g. 'AH-1', 'RTU-2')."""
            return _looks_like_ahu_label(val)

        def pandas_as_survey(r):
            return {
                "B": r.get(col_building) if col_building else None,
                "C": r.get(col_loc) if col_loc else None,
                "E": r.get(col_stage) if col_stage else None,
                "F": r.get(col_ahu) if col_ahu else None,
            }

        pending_blank = False
        for r in rows:
            if row_has_data(r):
                survey_row = pandas_as_survey(r)
                current_as_survey = [pandas_as_survey(x) for x in current_block]
                start_new = _should_start_new_ahu(current_as_survey, survey_row)
                if current_block and (
                    start_new or (pending_blank and _stage_kind(survey_row.get("E")) == "pre")
                ):
                    blocks.append(current_block)
                    current_block = []
                pending_blank = False
                current_block.append(r)
            else:
                pending_blank = True

        if current_block:
            blocks.append(current_block)

        # Process each block as a single AHU (rows within a block belong to same AHU)
        for block in blocks:
            # pick display_name: prefer first explicit AHU NO. else use location or unnamed
            display_name = None
            building = None
            floor_area = None
            location = None

            for r in block:
                raw_ahu_no = clean_str(r.get(col_ahu))
                raw_stage = clean_str(r.get(col_stage)) if col_stage else None
                # prefer explicit AHU number in AHU column
                if not is_placeholder(raw_ahu_no):
                    display_name = raw_ahu_no
                    break
                # if the stage column contains an AH label (some sheets put AH names in STAGE), use it
                if looks_like_ahu_label(raw_stage):
                    display_name = raw_stage
                    break

            # fallback: use first row's location if no AHU number provided
            if display_name is None:
                first = block[0]
                location = clean_str(first.get(col_loc)) if col_loc else None
                display_name = f"Unnamed — {location}" if location else f"Unnamed — {next_seq}"

            if location is None and col_loc:
                for r in block:
                    loc = clean_str(r.get(col_loc))
                    if loc:
                        location = loc
                        break

            # building/floor area from first row where present
            for r in block:
                b = clean_str(r.get(col_building)) if col_building else None
                if b:
                    building = b
                    break
            for r in block:
                fa = clean_str(r.get(col_floor_area)) if col_floor_area else None
                if fa:
                    floor_area = fa
                    break

            instance = 1
            for prev in blocks[: blocks.index(block)]:
                prev_name = None
                prev_building = None
                for pr in prev:
                    if prev_name is None:
                        prev_name = clean_str(pr.get(col_ahu))
                    if prev_building is None and col_building:
                        prev_building = clean_str(pr.get(col_building))
                if _norm_name(prev_name) == _norm_name(display_name) and _norm_name(prev_building) == _norm_name(building):
                    instance += 1

            ahu_key = normalize_ahu_key(display_name, building=building, instance=instance)

            # ensure building exists before creating AHU so we can set building_id
            building_obj = None
            building_id = None
            if building:
                building_obj = upsert_building(hospital.id, building, floor_area=floor_area)
                building_id = building_obj.id if building_obj else None

            label = format_ahu_label(display_name, building, instance=instance)

            if ahu_key not in ahu_key_to_id:
                existing = find_existing_ahu(
                    hospital.id,
                    display_name,
                    building_id=building_id,
                    building_name=building,
                    claimed_ids=ahu_key_to_id.values(),
                    instance=instance,
                )
                if existing:
                    ahu_id = existing.id
                    ahu_key_to_id[ahu_key] = ahu_id
                    excel_order = next_seq
                    next_seq += 1
                    stats["ahus_updated"] += 1
                    if building_id and getattr(existing, "building_id", None) != building_id:
                        existing.building_id = building_id
                    loc = clean_str(location)
                    if loc:
                        existing.location = loc
                    apply_ahu_label(existing, display_name, building, instance=instance)
                else:
                    display_label = make_sequential_ahu_id(next_seq)
                    a = AHU(
                        hospital_id=hospital.id,
                        building_id=building_id,
                        name=label or display_name or display_label,
                        location=location,
                        notes=None,
                        excel_order=next_seq,
                    )
                    db.session.add(a)
                    db.session.flush()
                    ahu_id = a.id
                    ahu_key_to_id[ahu_key] = ahu_id
                    excel_order = next_seq
                    next_seq += 1
                    stats["ahus_created"] += 1
            else:
                ahu_id = ahu_key_to_id[ahu_key]
                existing_ahu = db.session.get(AHU, ahu_id)
                excel_order = getattr(existing_ahu, "excel_order", None) if existing_ahu else None

            notes_parts = [f"Excel AHU block", f"Excel Display: {display_name}"]
            if building:
                notes_parts.append(f"Building: {building}")
            if floor_area:
                notes_parts.append(f"Floor/Area: {floor_area}")
            notes = " | ".join(notes_parts)

            ahu_obj = db.session.get(AHU, ahu_id)
            if ahu_obj:
                ahu_obj.notes = notes or ahu_obj.notes
                apply_ahu_label(ahu_obj, display_name, building, instance=instance)
                if excel_order is not None and hasattr(ahu_obj, "excel_order"):
                    ahu_obj.excel_order = int(excel_order)
            stats["ahus"].add(ahu_id)

            # Now process filters rows inside this block
            filter_order_map.setdefault(ahu_id, 1)
            for r in block:
                phase = clean_str(r.get(col_stage))
                # if the stage cell contains an AH label (header), don't treat it as a phase
                if looks_like_ahu_label(phase):
                    phase = None
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

                filter_excel_order = filter_order_map[ahu_id]
                filter_order_map[ahu_id] += 1

                upsert_filter(
                    ahu_id=ahu_id,
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

        collapse_unclaimed_ahu_duplicates(hospital.id, ahu_key_to_id.values())

    collapse_unclaimed_ahu_duplicates(hospital.id, ahu_key_to_id.values())

    if dry_run:
        db.session.rollback()
        print("\nDRY RUN — no changes committed")
    else:
        db.session.commit()

    result = serialize_seed_stats(stats, dry_run=dry_run)

    print("\n✅ Seed complete" if not dry_run else "\n✅ Dry run complete")
    print(f"Hospital: {result['hospital']} (ID {result['hospital_id']})")
    print(f"Sheets processed: {result['sheets_processed']}")
    if result.get("sheets"):
        print(f"Tabs: {', '.join(result['sheets'])}")
    print(f"Rows seen: {result['rows_seen']}")
    print(f"AHUs matched/updated: {result['ahus_updated']}")
    print(f"AHUs created: {result['ahus_created']}")
    print(f"AHUs touched: {result['ahus_touched']}")
    if result.get("replace_existing"):
        print(
            f"Started fresh: cleared {result['ahus_cleared']} AHUs, "
            f"{result['filters_cleared']} filters, {result['jobs_cleared']} jobs"
        )
    print(f"Filters upserted: {result['filters_upserted']}")
    print(f"Filters skipped (missing size): {result['filters_skipped']}")
    for warning in result["warnings"]:
        print(f"Warning: {warning}")

    ordered = sorted(list(stats["ahus"]))
    print("\nExample AHU IDs (first 15):")
    for i, x in enumerate(ordered[:15], start=1):
        print(f"  {i}. AHU-{int(x):03d} (db id: {x})")

    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Seed or update AHUs and filters from a hospital survey workbook."
    )
    parser.add_argument(
        "sheet",
        nargs="?",
        help="Sheet name, or 'all' for every data tab (skips FILTER/legend/chart sheets)",
    )
    parser.add_argument(
        "--path",
        "-p",
        default=EXCEL_PATH,
        help=f"Path to the .xlsx/.xlsm workbook (default: {EXCEL_PATH})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse and match records but do not commit database changes",
    )
    parser.add_argument(
        "--hospital-id",
        type=int,
        default=None,
        help="Apply to this hospital id instead of creating one from cell B2",
    )
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Delete this hospital's current AHUs/filters, then import the workbook fresh",
    )
    args = parser.parse_args()
    workbook = args.path
    from app import app

    if not args.sheet:
        print("Usage: python seed_from_excel.py <sheet_name>|all [--path FILE] [--dry-run]")
        if os.path.exists(workbook):
            print("Available sheets:")
            xls = pd.ExcelFile(workbook)
            for sheet in xls.sheet_names:
                print(f"  - {sheet}")
            print("  - all   (seed every data tab)")
        else:
            print(f"(Workbook not found at {workbook}; pass --path to list sheets)")
        sys.exit(1)

    if not os.path.exists(workbook):
        print(f"Excel file not found: {workbook}")
        sys.exit(1)

    selected = args.sheet
    with app.app_context():
        try:
            seed_from_excel(
                workbook,
                None if str(selected).strip().lower() == "all" else selected,
                dry_run=args.dry_run,
                hospital_id=args.hospital_id,
                replace_existing=args.replace,
            )
        except Exception as e:
            print(f"Error seeding workbook: {e}")
            sys.exit(1)
