"""Last-visit DPS (initial/final resistance) for AFC techs and admins only."""
from sqlalchemy import or_

from db import db
from models import Job, JobFilter


def _has_dps():
    return or_(
        JobFilter.initial_resistance.isnot(None),
        JobFilter.final_resistance.isnot(None),
    )


def last_dps_by_filter_ids(filter_ids, exclude_job_id=None):
    """Most recent DPS reading per filter. Used on FilterInfo before a new job."""
    ids = [fid for fid in (filter_ids or []) if fid is not None]
    if not ids:
        return {}
    rows = (
        db.session.query(JobFilter, Job)
        .join(Job, Job.id == JobFilter.job_id)
        .filter(JobFilter.filter_id.in_(ids))
        .filter(_has_dps())
        .order_by(Job.completed_at.desc(), Job.id.desc())
        .all()
    )
    out = {}
    for jf, job in rows:
        if exclude_job_id is not None and job.id == exclude_job_id:
            continue
        if jf.filter_id in out:
            continue
        out[jf.filter_id] = {
            "initial_resistance": jf.initial_resistance,
            "final_resistance": jf.final_resistance,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        }
    return out


def previous_dps_for_jobs(jobs):
    """DPS from the visit before each job, keyed (job_id, filter_id)."""
    jobs = list(jobs or [])
    filter_ids = {jf.filter_id for j in jobs for jf in (j.job_filters or [])}
    if not filter_ids:
        return {}
    rows = (
        db.session.query(JobFilter, Job)
        .join(Job, Job.id == JobFilter.job_id)
        .filter(JobFilter.filter_id.in_(list(filter_ids)))
        .filter(_has_dps())
        .order_by(Job.completed_at.desc(), Job.id.desc())
        .all()
    )
    history = {}
    for jf, job in rows:
        history.setdefault(jf.filter_id, []).append(
            (job.completed_at, job.id, jf.initial_resistance, jf.final_resistance)
        )
    out = {}
    for job in jobs:
        for jf in job.job_filters or []:
            for completed_at, other_id, initial, final in history.get(jf.filter_id, []):
                if other_id == job.id:
                    continue
                if job.completed_at and completed_at and completed_at > job.completed_at:
                    continue
                if completed_at == job.completed_at and other_id > job.id:
                    continue
                out[(job.id, jf.filter_id)] = {
                    "initial_resistance": initial,
                    "final_resistance": final,
                    "completed_at": completed_at.isoformat() if completed_at else None,
                }
                break
    return out
