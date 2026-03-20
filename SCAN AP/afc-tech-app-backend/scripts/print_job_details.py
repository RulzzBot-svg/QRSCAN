#!/usr/bin/env python3
"""Print job and job_signature details for a hospital.

Usage:
  python scripts/print_job_details.py --name "GARDEN GROVE PRIME HEALTHCARE"
"""
import argparse
import os
import sys

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
        hospital = session.query(Hospital).filter(Hospital.name.ilike(f"%{hospital_name}%")).first()
        if not hospital:
            print(f"No hospital matched '{hospital_name}'")
            return
        hid = hospital.id
        print(f"Hospital: {hospital.name} (id={hid})")

        # AHUs
        ahus = session.query(AHU).filter(AHU.hospital_id == hid).all()
        print(f"AHUs directly under hospital ({len(ahus)}):")
        for a in ahus[:50]:
            print(f"  AHU id={a.id} name={a.name} building_id={a.building_id}")

        # AHUs via buildings
        blds = session.query(Building).filter_by(hospital_id=hid).all()
        print(f"Buildings ({len(blds)}):")
        for b in blds[:50]:
            print(f"  Building id={b.id} name={b.name}")

        # Jobs for AHUs (both direct hospital and building AHUs)
        building_ids = [b.id for b in blds]
        ahu_ids = [a.id for a in session.query(AHU).filter((AHU.hospital_id == hid) | (AHU.building_id.in_(building_ids))).all()]
        jobs = session.query(Job).filter(Job.ahu_id.in_(ahu_ids)).all()
        print(f"Jobs found: {len(jobs)}")
        for j in jobs[:200]:
            print(f"  Job id={j.id} ahu_id={j.ahu_id} tech_id={j.tech_id} completed_at={j.completed_at}")

        # job_signatures
        jids = [j.id for j in jobs]
        jss = session.query(JobSignature).filter(JobSignature.job_id.in_(jids)).all()
        print(f"JobSignatures found: {len(jss)}")
        for js in jss[:200]:
            print(f"  JS id={js.id} job_id={js.job_id} signer_name={js.signer_name} created_at={js.created_at}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--name", "-n", required=True)
    args = parser.parse_args()
    run(args.name)


if __name__ == '__main__':
    main()
