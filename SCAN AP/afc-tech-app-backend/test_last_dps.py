#!/usr/bin/env python3
"""Last-visit DPS is for AFC techs and admins only, never the hospital portal."""
import os
import tempfile
from datetime import datetime, timedelta

from flask import Flask

from db import db
from extensions import limiter
from middleware.jwt_utils import create_access_token, token_string
from models import AHU, ClientUser, Filter, Hospital, Job, JobFilter, Technician
from routes.ahu_routes import ahu_bp
from routes.client_routes import client_bp
from routes.job_routes import job_bp
from routes.tech_routes import tech_bp


def make_app(db_path):
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + db_path.replace("\\", "/")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET"] = "dps-test-secret"
    app.config["JWT_EXPIRY_HOURS"] = "12"
    app.config["TESTING"] = True
    db.init_app(app)
    limiter.init_app(app)
    app.register_blueprint(client_bp, url_prefix="/api")
    app.register_blueprint(tech_bp, url_prefix="/api")
    app.register_blueprint(ahu_bp, url_prefix="/api")
    app.register_blueprint(job_bp, url_prefix="/api")
    with app.app_context():
        db.create_all()
    return app


def assert_eq(actual, expected, msg):
    if actual != expected:
        raise AssertionError(f"{msg}: expected {expected!r}, got {actual!r}")


def header(app, tech_id, role):
    with app.app_context():
        token = token_string(create_access_token(tech_id, role, token_type="tech"))
    return {"Authorization": f"Bearer {token}"}


def main():
    fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    app = make_app(db_path)
    with app.app_context():
        hospital = Hospital(name="Test Hospital", active=True)
        db.session.add(hospital)
        db.session.flush()
        ahu = AHU(hospital_id=hospital.id, name="AHU-1", location="Roof")
        db.session.add(ahu)
        db.session.flush()
        filt = Filter(
            ahu_id=ahu.id,
            phase="PRE",
            part_number="HVP24242",
            size="24x24x2",
            quantity=4,
            frequency_days=90,
            is_active=True,
        )
        db.session.add(filt)
        tech = Technician(name="AFC Tech", pin="1234", role="technician", active=True)
        admin = Technician(name="AFC Admin", pin="9999", role="admin", active=True)
        director = ClientUser(
            hospital_id=hospital.id,
            name="Director",
            username="director.one",
            pin="0000",
            role="director",
            active=True,
        )
        hospital_tech = ClientUser(
            hospital_id=hospital.id,
            name="Hospital Tech",
            username="hospital.tech",
            pin="0000",
            role="tech",
            active=True,
        )
        db.session.add_all([tech, admin, director, hospital_tech])
        db.session.flush()
        older = Job(
            ahu_id=ahu.id,
            tech_id=tech.id,
            completed_at=datetime.utcnow() - timedelta(days=90),
        )
        newer = Job(
            ahu_id=ahu.id,
            tech_id=tech.id,
            completed_at=datetime.utcnow() - timedelta(days=4),
        )
        db.session.add_all([older, newer])
        db.session.flush()
        db.session.add_all([
            JobFilter(
                job_id=older.id,
                filter_id=filt.id,
                is_completed=True,
                initial_resistance=0.42,
                final_resistance=0.18,
            ),
            JobFilter(
                job_id=newer.id,
                filter_id=filt.id,
                is_completed=True,
                initial_resistance=0.51,
                final_resistance=0.22,
            ),
        ])
        db.session.commit()
        ids = {
            "ahu": ahu.id,
            "filter": filt.id,
            "tech": tech.id,
            "admin": admin.id,
            "newer": newer.id,
            "director": director.id,
            "hospital_tech": hospital_tech.id,
        }

    client = app.test_client()
    tech_headers = header(app, ids["tech"], "technician")
    admin_headers = header(app, ids["admin"], "admin")

    qr = client.get(f"/api/qr/{ids['ahu']}", headers=tech_headers)
    assert_eq(qr.status_code, 200, "tech can load FilterInfo AHU")
    row = qr.get_json()["filters"][0]
    assert_eq(row["previous_initial_resistance"], 0.51, "FilterInfo last initial DPS is the newest visit")
    assert_eq(row["previous_final_resistance"], 0.22, "FilterInfo last final DPS is the newest visit")
    assert row.get("previous_dps_at"), "last DPS includes the visit date"

    jobs = client.get("/api/jobs", headers=tech_headers).get_json()
    newest = next(j for j in jobs if j["id"] == ids["newer"])
    filt_row = newest["filters"][0]
    assert_eq(filt_row["initial_resistance"], 0.51, "this job keeps its own initial DPS")
    assert_eq(filt_row["previous_initial_resistance"], 0.42, "admin/tech job shows the visit before")
    assert_eq(filt_row["previous_final_resistance"], 0.18, "admin/tech job shows the visit before final")

    admin_jobs = client.get("/api/admin/jobs", headers=admin_headers)
    assert_eq(admin_jobs.status_code, 200, "admin jobs")
    admin_newest = next(j for j in admin_jobs.get_json() if j["id"] == ids["newer"])
    assert_eq(admin_newest["filters"][0]["previous_initial_resistance"], 0.42, "admin sees last DPS")

    blocked = client.get(f"/api/qr/{ids['ahu']}")
    assert_eq(blocked.status_code, 401, "logged-out cannot read DPS")

    with app.app_context():
        director_headers = {
            "Authorization": f"Bearer {token_string(create_access_token(ids['director'], 'director', token_type='client'))}"
        }
        hospital_tech_headers = {
            "Authorization": f"Bearer {token_string(create_access_token(ids['hospital_tech'], 'tech', token_type='client'))}"
        }
    for who, headers in (("director", director_headers), ("hospital tech", hospital_tech_headers)):
        qr_blocked = client.get(f"/api/qr/{ids['ahu']}", headers=headers)
        jobs_blocked = client.get("/api/jobs", headers=headers)
        admin_blocked = client.get("/api/admin/jobs", headers=headers)
        assert_eq(qr_blocked.status_code, 401, f"{who} cannot load FilterInfo DPS")
        assert_eq(jobs_blocked.status_code, 401, f"{who} cannot load tech jobs DPS")
        assert_eq(admin_blocked.status_code, 401, f"{who} cannot load admin jobs DPS")

    try:
        os.unlink(db_path)
    except OSError:
        pass
    print("last dps tests passed")


if __name__ == "__main__":
    main()
