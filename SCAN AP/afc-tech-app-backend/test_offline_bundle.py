import os
import tempfile

from flask import Flask

from db import db
from models import AHU, Building, Filter, Hospital
from routes.hospital_routes import serialize_offline_bundle


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


def test_bundle_includes_building():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    app = make_app(path)
    with app.app_context():
        hospital = Hospital(name="Centinela", city="Inglewood")
        db.session.add(hospital)
        db.session.flush()
        building = Building(hospital_id=hospital.id, name="Main")
        db.session.add(building)
        db.session.flush()
        ahu = AHU(
            hospital_id=hospital.id,
            building_id=building.id,
            name="AHU-1",
            location="Roof",
        )
        db.session.add(ahu)
        db.session.flush()
        db.session.add(
            Filter(
                ahu_id=ahu.id,
                phase="PRE",
                part_number="PN-1",
                size="24x24x12",
                quantity=4,
                frequency_days=90,
            )
        )
        db.session.commit()
        hospital = db.session.get(Hospital, hospital.id)
        payload = serialize_offline_bundle(hospital)
        assert_eq(payload["hospital"]["name"], "Centinela", "hospital name")
        assert_eq(len(payload["ahus"]), 1, "ahu count")
        row = payload["ahus"][0]
        assert_eq(row["building_id"], building.id, "building_id")
        assert_eq(row["building"], "Main", "building name")
        assert_eq(len(row["filters"]), 1, "filters come along")
    os.unlink(path)


if __name__ == "__main__":
    test_bundle_includes_building()
    print("offline bundle tests passed")
