"""
Migration: 2026_03_13_backfill_filter_last_service_date

Fixes filters whose last_service_date was never updated because the technician
marked them as "Inspected" rather than "Replaced". Previously only "Replaced"
(is_completed=True) would update the date; this backfill ensures that any filter
touched by a job (inspected OR replaced) has its last_service_date set to the
most recent job's completed_at date.

Run once against the production database:
    python migrations/2026_03_13_backfill_filter_last_service_date.py
"""

from app import create_app
from db import db
from models import Filter, Job, JobFilter
from sqlalchemy import func

app = create_app()

with app.app_context():
    # Find the most recent completed_at date per filter across all job_filters
    # where the filter was either inspected or replaced.
    latest_per_filter = (
        db.session.query(
            JobFilter.filter_id,
            func.max(Job.completed_at).label("latest_completed_at")
        )
        .join(Job, Job.id == JobFilter.job_id)
        .filter(
            (JobFilter.is_inspected == True) | (JobFilter.is_completed == True)
        )
        .group_by(JobFilter.filter_id)
        .all()
    )

    updated = 0
    skipped = 0

    for filter_id, latest_completed_at in latest_per_filter:
        f = db.session.get(Filter, filter_id)
        if f is None:
            continue

        latest_date = latest_completed_at.date()

        # Only update if the job date is more recent than the stored date
        if f.last_service_date is None or latest_date > f.last_service_date:
            old_date = f.last_service_date
            f.last_service_date = latest_date
            updated += 1
            print(
                f"  Updated filter {filter_id} (AHU {f.ahu_id}): "
                f"{old_date} → {latest_date}"
            )
        else:
            skipped += 1

    db.session.commit()
    print(f"\nDone. {updated} filter(s) updated, {skipped} already up-to-date.")
