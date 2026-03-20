#!/usr/bin/env python3
"""Delete job_signatures for a hospital and print results.

Usage:
    python scripts/delete_job_signatures.py --name "GARDEN GROVE PRIME HEALTHCARE"
"""
import argparse
import os
import sys
from sqlalchemy import or_

# Ensure project root is on sys.path so imports like `from app import create_app` work
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
        sys.path.insert(0, ROOT)

from app import create_app
from db import db
from models import Hospital, AHU, Building, Job, JobSignature


def run(hospital_name: str):
    app = create_app()
    with app.app_context():
        session = db.session

        hospitals = session.query(Hospital).filter(Hospital.name.ilike(f"%{hospital_name}%")).all()
        if not hospitals:
            print(f"No hospital found matching '{hospital_name}'")
            return
        if len(hospitals) > 1:
            print(f"Multiple hospitals matched; using first: {hospitals[0].name} (id={hospitals[0].id})")

        hospital = hospitals[0]
        hid = hospital.id

        # Building ids for this hospital
        building_ids = [r[0] for r in session.query(Building.id).filter_by(hospital_id=hid).all()]

        # AHU ids either directly under hospital or in buildings for that hospital
        ahu_conditions = [AHU.hospital_id == hid]
        if building_ids:
            ahu_conditions.append(AHU.building_id.in_(building_ids))

        ahu_ids = [r[0] for r in session.query(AHU.id).filter(or_(*ahu_conditions)).all()]

        if not ahu_ids:
            print(f"No AHUs found for hospital id={hid} name='{hospital.name}'")
            return

        # Job ids attached to those AHUs
        job_ids = [r[0] for r in session.query(Job.id).filter(Job.ahu_id.in_(ahu_ids)).all()]

        if not job_ids:
            print(f"No jobs found for hospital id={hid} (ahu count={len(ahu_ids)})")
            return

        # Counts before
        js_count_before = session.query(JobSignature).filter(JobSignature.job_id.in_(job_ids)).count()
        print(f"Hospital: {hospital.name} (id={hid})")
        print(f"AHUs found: {len(ahu_ids)}; Jobs found: {len(job_ids)}")
        print(f"JobSignatures before delete: {js_count_before}")

        if js_count_before == 0:
            print("Nothing to delete.")
            return

        # Delete job_signatures by job_id
        deleted = session.query(JobSignature).filter(JobSignature.job_id.in_(job_ids)).delete(synchronize_session=False)
        session.commit()

        js_count_after = session.query(JobSignature).filter(JobSignature.job_id.in_(job_ids)).count()
        print(f"Deleted job_signatures (rows affected reported by ORM.delete): {deleted}")
        print(f"JobSignatures after delete: {js_count_after}")


def main():
    parser = argparse.ArgumentParser(description="Delete job_signatures for a hospital")
    parser.add_argument("--name", "-n", required=True, help="Hospital name (partial match, case-insensitive)")
    args = parser.parse_args()
    run(args.name)


if __name__ == "__main__":
    main()
