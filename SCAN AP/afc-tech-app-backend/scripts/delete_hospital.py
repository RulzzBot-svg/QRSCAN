#!/usr/bin/env python3
"""Safely delete a hospital and related records.

This prints counts for related objects and only deletes when `--force` is provided.

Usage:
  python scripts/delete_hospital.py --name "GARDEN GROVE PRIME HEALTHCARE" [--force]
"""
import argparse
import os
import sys
from sqlalchemy import or_

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from app import create_app
from db import db
from models import (
    Hospital, Building, AHU, Job, JobFilter, JobSignature,
    Filter, Notification, SupervisorSignoff
)


def summarize(session, hospital_name: str):
    hospitals = session.query(Hospital).filter(Hospital.name.ilike(f"%{hospital_name}%")).all()
    if not hospitals:
        print(f"No hospital matched '{hospital_name}'")
        return None
    if len(hospitals) > 1:
        print("Multiple hospitals matched; please be more specific:")
        for h in hospitals:
            print(f"  id={h.id} name={h.name}")
        return None

    hospital = hospitals[0]
    hid = hospital.id

    building_ids = [r[0] for r in session.query(Building.id).filter_by(hospital_id=hid).all()]
    ahu_ids = [r[0] for r in session.query(AHU.id).filter(or_(AHU.hospital_id == hid, AHU.building_id.in_(building_ids))).all()]
    job_ids = [r[0] for r in session.query(Job.id).filter(Job.ahu_id.in_(ahu_ids)).all()]

    counts = {
        'hospital_id': hid,
        'buildings': len(building_ids),
        'ahus': len(ahu_ids),
        'jobs': len(job_ids),
        'job_filters': session.query(JobFilter).filter(JobFilter.job_id.in_(job_ids)).count() if job_ids else 0,
        'job_signatures': session.query(JobSignature).filter(JobSignature.job_id.in_(job_ids)).count() if job_ids else 0,
        'filters': session.query(Filter).filter(Filter.ahu_id.in_(ahu_ids)).count() if ahu_ids else 0,
        'notifications': session.query(Notification).filter(or_(Notification.hospital_id == hid, Notification.ahu_id.in_(ahu_ids), Notification.job_id.in_(job_ids))).count(),
        'supervisor_signoffs': session.query(SupervisorSignoff).filter_by(hospital_id=hid).count()
    }

    return hospital, building_ids, ahu_ids, job_ids, counts


def delete_hospital(session, hospital, building_ids, ahu_ids, job_ids):
    hid = hospital.id

    # Delete notifications tied to hospital/ahu/jobs
    session.query(Notification).filter(or_(Notification.hospital_id == hid,
                                           Notification.ahu_id.in_(ahu_ids) if ahu_ids else False,
                                           Notification.job_id.in_(job_ids) if job_ids else False)).delete(synchronize_session=False)

    # Delete supervisor signoffs for hospital
    session.query(SupervisorSignoff).filter_by(hospital_id=hid).delete(synchronize_session=False)

    # Explicitly delete job_signatures and job_filters (redundant if cascades are configured)
    if job_ids:
        session.query(JobSignature).filter(JobSignature.job_id.in_(job_ids)).delete(synchronize_session=False)
        session.query(JobFilter).filter(JobFilter.job_id.in_(job_ids)).delete(synchronize_session=False)

    # Delete jobs themselves
    if job_ids:
        session.query(Job).filter(Job.id.in_(job_ids)).delete(synchronize_session=False)

    # Delete filters attached to AHUs
    if ahu_ids:
        session.query(Filter).filter(Filter.ahu_id.in_(ahu_ids)).delete(synchronize_session=False)

    # Delete AHUs explicitly (so FK constraints are cleared)
    if ahu_ids:
        session.query(AHU).filter(AHU.id.in_(ahu_ids)).delete(synchronize_session=False)

    # Delete buildings explicitly
    if building_ids:
        session.query(Building).filter(Building.id.in_(building_ids)).delete(synchronize_session=False)

    # Now delete the hospital object; configured ORM cascades should remove AHUs, Jobs, etc.
    session.delete(hospital)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--name", "-n", required=True, help="Hospital name (partial, case-insensitive)")
    parser.add_argument("--force", "-f", action="store_true", help="Perform destructive delete")
    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        session = db.session
        res = summarize(session, args.name)
        if not res:
            return
        hospital, building_ids, ahu_ids, job_ids, counts = res

        print(f"Hospital: {hospital.name} (id={hospital.id})")
        for k, v in counts.items():
            print(f"  {k}: {v}")

        if not args.force:
            print("\nNo changes made. Re-run with --force to delete the above records.")
            return

        # Confirming destructive action
        print("\nDeleting records...")
        delete_hospital(session, hospital, building_ids, ahu_ids, job_ids)
        session.commit()

        # Re-run summary to show remaining counts
        res2 = summarize(session, args.name)
        if res2 is None:
            print("Deletion complete: hospital record removed.")
        else:
            _, _, _, _, counts2 = res2
            print("Post-delete counts:")
            for k, v in counts2.items():
                print(f"  {k}: {v}")


if __name__ == '__main__':
    main()
