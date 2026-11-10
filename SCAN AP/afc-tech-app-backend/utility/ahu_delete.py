"""Hard-delete AHUs and the rows that would block removing them."""
from sqlalchemy import or_

from db import db
from models import AHU, Building, Filter, Hospital, Job, JobFilter, JobSignature, Notification

AHU_DELETE_LIMIT = 150


def normalize_ahu_ids(raw_ids, *, limit=AHU_DELETE_LIMIT):
    """Keep unique positive integer ids, capped so one request cannot wipe the catalog.

    Pass limit=None for a hospital fresh-start, which must remove every unit.
    """
    ids = []
    seen = set()
    for raw in raw_ids or []:
        try:
            n = int(raw)
        except (TypeError, ValueError):
            continue
        if n <= 0 or n in seen:
            continue
        seen.add(n)
        ids.append(n)
        if limit is not None and len(ids) >= limit:
            break
    return ids


def delete_ahus_by_ids(ahu_ids, *, limit=AHU_DELETE_LIMIT):
    """
    Remove AHUs plus filters, jobs, job_filters, signatures, and notifications
    tied to those units. Leaves hospitals and buildings in place.

    Returns counts of rows that were targeted. Does not commit.
    """
    ids = normalize_ahu_ids(ahu_ids, limit=limit)
    if not ids:
        return {"ahus": 0, "filters": 0, "jobs": 0, "ids": []}

    existing = [r[0] for r in db.session.query(AHU.id).filter(AHU.id.in_(ids)).all()]
    if not existing:
        return {"ahus": 0, "filters": 0, "jobs": 0, "ids": []}

    job_ids = [r[0] for r in db.session.query(Job.id).filter(Job.ahu_id.in_(existing)).all()]
    filter_ids = [
        r[0] for r in db.session.query(Filter.id).filter(Filter.ahu_id.in_(existing)).all()
    ]

    notif_clauses = [Notification.ahu_id.in_(existing)]
    if job_ids:
        notif_clauses.append(Notification.job_id.in_(job_ids))
    db.session.query(Notification).filter(or_(*notif_clauses)).delete(synchronize_session=False)

    if job_ids:
        db.session.query(JobSignature).filter(JobSignature.job_id.in_(job_ids)).delete(
            synchronize_session=False
        )
        db.session.query(JobFilter).filter(JobFilter.job_id.in_(job_ids)).delete(
            synchronize_session=False
        )
        db.session.query(Job).filter(Job.id.in_(job_ids)).delete(synchronize_session=False)

    if filter_ids:
        db.session.query(JobFilter).filter(JobFilter.filter_id.in_(filter_ids)).delete(
            synchronize_session=False
        )
        db.session.query(Filter).filter(Filter.id.in_(filter_ids)).delete(
            synchronize_session=False
        )

    db.session.query(AHU).filter(AHU.id.in_(existing)).delete(synchronize_session=False)
    db.session.flush()

    return {
        "ahus": len(existing),
        "filters": len(filter_ids),
        "jobs": len(job_ids),
        "ids": existing,
    }


def clear_hospital_survey_records(hospital_id):
    """
    Delete AHUs/filters/buildings (and jobs on those AHUs) for one hospital.
    Keeps the hospital row so Import can reload the workbook onto the same site.

    Always deletes every matching AHU (no admin bulk-delete cap). Otherwise
    leftover units still point at buildings and Postgres raises
    ahus_building_id_fkey.
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

    counts = {
        "ahus": 0,
        "filters": 0,
        "jobs": 0,
        "buildings": len(building_ids),
    }

    db.session.query(Notification).filter(Notification.hospital_id == hid).delete(
        synchronize_session=False
    )

    if ahu_ids:
        deleted = delete_ahus_by_ids(ahu_ids, limit=None)
        counts["ahus"] = deleted["ahus"]
        counts["filters"] = deleted["filters"]
        counts["jobs"] = deleted["jobs"]

    if building_ids:
        leftover = (
            db.session.query(AHU.id)
            .filter(or_(AHU.hospital_id == hid, AHU.building_id.in_(building_ids)))
            .all()
        )
        leftover_ids = [r[0] for r in leftover]
        if leftover_ids:
            extra = delete_ahus_by_ids(leftover_ids, limit=None)
            counts["ahus"] += extra["ahus"]
            counts["filters"] += extra["filters"]
            counts["jobs"] += extra["jobs"]
        db.session.query(AHU).filter(AHU.building_id.in_(building_ids)).update(
            {AHU.building_id: None}, synchronize_session=False
        )
        db.session.query(Building).filter(Building.id.in_(building_ids)).delete(
            synchronize_session=False
        )

    db.session.flush()
    db.session.expire_all()
    return counts
