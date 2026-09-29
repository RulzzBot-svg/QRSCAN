"""Hard-delete AHUs and the rows that would block removing them."""
from sqlalchemy import or_

from db import db
from models import AHU, Filter, Job, JobFilter, JobSignature, Notification

AHU_DELETE_LIMIT = 150


def normalize_ahu_ids(raw_ids, *, limit=AHU_DELETE_LIMIT):
    """Keep unique positive integer ids, capped so one request cannot wipe the catalog."""
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
        if len(ids) >= limit:
            break
    return ids


def delete_ahus_by_ids(ahu_ids):
    """
    Remove AHUs plus filters, jobs, job_filters, signatures, and notifications
    tied to those units. Leaves hospitals and buildings in place.

    Returns counts of rows that were targeted. Does not commit.
    """
    ids = normalize_ahu_ids(ahu_ids)
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
