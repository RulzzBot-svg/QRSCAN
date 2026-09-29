import os
import tempfile
from datetime import date, datetime

from flask import Flask

from db import db
from models import (
    AHU,
    Building,
    Filter,
    Hospital,
    Job,
    JobFilter,
    JobSignature,
    Notification,
    Technician,
)
from utility.ahu_delete import AHU_DELETE_LIMIT, delete_ahus_by_ids, normalize_ahu_ids


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


def seed_pair(app):
    with app.app_context():
        hospital = Hospital(name="Test Hospital")
        db.session.add(hospital)
        db.session.flush()
        building = Building(hospital_id=hospital.id, name="East")
        db.session.add(building)
        db.session.flush()
        keep = AHU(
            hospital_id=hospital.id,
            building_id=building.id,
            name="AHU-KEEP",
            location="Roof",
        )
        junk = AHU(
            hospital_id=hospital.id,
            building_id=building.id,
            name="AHU-JUNK",
            location="Notes from Excel",
        )
        db.session.add_all([keep, junk])
        db.session.flush()
        keep_filter = Filter(
            ahu_id=keep.id,
            phase="PRE",
            part_number="KEEP-PN",
            size="12x12x1",
            quantity=1,
            frequency_days=90,
            last_service_date=date(2026, 1, 1),
        )
        junk_filter = Filter(
            ahu_id=junk.id,
            phase="FINAL",
            part_number="JUNK-PN",
            size="24x24x2",
            quantity=4,
            frequency_days=90,
        )
        db.session.add_all([keep_filter, junk_filter])
        tech = Technician(name="Tech", pin="hashed", role="technician")
        db.session.add(tech)
        db.session.flush()
        job = Job(ahu_id=junk.id, tech_id=tech.id, overall_notes="imported junk")
        db.session.add(job)
        db.session.flush()
        db.session.add(
            JobFilter(job_id=job.id, filter_id=junk_filter.id, is_completed=True)
        )
        db.session.add(
            JobSignature(
                job_id=job.id,
                signer_name="X",
                signer_role="tech",
                signature_data="sig",
            )
        )
        db.session.add(
            Notification(
                hospital_id=hospital.id,
                ahu_id=junk.id,
                job_id=job.id,
                comment_text="from junk unit",
            )
        )
        db.session.commit()
        return {
            "hospital_id": hospital.id,
            "building_id": building.id,
            "keep_id": keep.id,
            "junk_id": junk.id,
            "keep_filter_id": keep_filter.id,
            "junk_filter_id": junk_filter.id,
            "job_id": job.id,
        }


def test_normalize_ahu_ids():
    assert_eq(normalize_ahu_ids(["12", 12, "abc", -1, 0, 15]), [12, 15], "dedupe and skip junk")
    assert_eq(normalize_ahu_ids(None), [], "empty")
    too_many = list(range(1, AHU_DELETE_LIMIT + 20))
    assert_eq(len(normalize_ahu_ids(too_many)), AHU_DELETE_LIMIT, "cap")


def test_delete_ahus_by_ids_removes_related_and_keeps_the_rest():
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)
    app = make_app(db_path)
    try:
        ids = seed_pair(app)
        with app.app_context():
            result = delete_ahus_by_ids([ids["junk_id"], "nope", ids["junk_id"]])
            db.session.commit()

            assert_eq(result["ahus"], 1, "one AHU deleted")
            assert_eq(result["filters"], 1, "junk filter deleted")
            assert_eq(result["jobs"], 1, "junk job deleted")
            assert_eq(result["ids"], [ids["junk_id"]], "deleted id reported")

            assert db.session.get(AHU, ids["junk_id"]) is None
            assert db.session.get(Filter, ids["junk_filter_id"]) is None
            assert db.session.get(Job, ids["job_id"]) is None
            assert JobFilter.query.count() == 0
            assert JobSignature.query.count() == 0
            assert Notification.query.count() == 0

            keep = db.session.get(AHU, ids["keep_id"])
            assert keep is not None
            assert keep.name == "AHU-KEEP"
            assert db.session.get(Filter, ids["keep_filter_id"]) is not None
            assert db.session.get(Hospital, ids["hospital_id"]) is not None
            assert db.session.get(Building, ids["building_id"]) is not None

            empty = delete_ahus_by_ids([999999])
            assert_eq(empty["ahus"], 0, "missing id is a no-op")
    finally:
        try:
            os.unlink(db_path)
        except OSError:
            pass


def main():
    test_normalize_ahu_ids()
    test_delete_ahus_by_ids_removes_related_and_keeps_the_rest()
    print("ahu_delete tests passed")


if __name__ == "__main__":
    main()
