#!/usr/bin/env python3
"""Hospital client portal: hospital-scoped read-only, no tech/admin crossover."""
import os
import tempfile
from datetime import date, timedelta

from flask import Flask

from db import db
from extensions import limiter
from middleware.jwt_utils import create_access_token, token_string
from middleware.pin_utils import hash_pin
from models import AHU, Building, ClientUser, Filter, Hospital, Job, Technician
from routes.admin import admin_bp
from routes.ahu_routes import ahu_bp
from routes.client_routes import client_bp
from routes.tech_routes import tech_bp
from utility.client_portal import frequency_label, public_filter


def make_app(db_path):
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + db_path.replace("\\", "/")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET"] = "client-portal-test-secret"
    app.config["JWT_EXPIRY_HOURS"] = "12"
    app.config["TESTING"] = True
    db.init_app(app)
    limiter.init_app(app)
    app.register_blueprint(client_bp, url_prefix="/api")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(tech_bp, url_prefix="/api")
    app.register_blueprint(ahu_bp, url_prefix="/api")
    with app.app_context():
        db.create_all()
    return app


def assert_eq(actual, expected, msg):
    if actual != expected:
        raise AssertionError(f"{msg}: expected {expected!r}, got {actual!r}")


def seed(app):
    with app.app_context():
        choc = Hospital(name="CHOC", city="Orange", active=True)
        other = Hospital(name="Huntington", city="Pasadena", active=True)
        db.session.add_all([choc, other])
        db.session.flush()

        south = Building(hospital_id=choc.id, name="South Tower")
        db.session.add(south)
        db.session.flush()

        ahu = AHU(
            hospital_id=choc.id,
            building_id=south.id,
            name="AHU-E2",
            location="Penthouse1 Roof",
        )
        other_ahu = AHU(
            hospital_id=other.id,
            name="AHU-1",
            location="Roof",
        )
        db.session.add_all([ahu, other_ahu])
        db.session.flush()

        db.session.add_all([
            Filter(
                ahu_id=ahu.id,
                phase="PRE",
                part_number="F8V4-2424-GWB",
                size="24x24x12",
                quantity=55,
                unit_price=269.50,
                frequency_days=730,
                last_service_date=date.today() - timedelta(days=10),
            ),
            Filter(
                ahu_id=ahu.id,
                phase="FINAL",
                part_number="SECRET-PN",
                size="24x24x4",
                quantity=20,
                unit_price=293.02,
                frequency_days=365,
                last_service_date=date.today() - timedelta(days=400),
            ),
            Filter(
                ahu_id=other_ahu.id,
                phase="PRE",
                part_number="OTHER",
                size="12x12x1",
                quantity=1,
                frequency_days=90,
                last_service_date=date.today(),
            ),
        ])

        admin = Technician(name="Admin", pin=hash_pin("9999"), role="admin", active=True)
        tech = Technician(name="Tech", pin=hash_pin("1111"), role="technician", active=True)
        client = ClientUser(
            hospital_id=choc.id,
            name="CHOC Facilities",
            username="choc.facilities",
            pin=hash_pin("2468"),
            active=True,
        )
        db.session.add_all([admin, tech, client])
        db.session.flush()
        db.session.add(Job(ahu_id=ahu.id, tech_id=tech.id, overall_notes="internal"))
        db.session.commit()
        return {
            "choc_id": choc.id,
            "other_id": other.id,
            "ahu_id": ahu.id,
            "other_ahu_id": other_ahu.id,
            "admin_id": admin.id,
            "tech_id": tech.id,
            "client_id": client.id,
        }


def auth_header(app, subject_id, role, token_type="tech"):
    with app.app_context():
        token = token_string(create_access_token(subject_id, role, token_type=token_type))
    return {"Authorization": f"Bearer {token}"}


def main():
    assert_eq(frequency_label(730), "2 years", "2yr label")
    assert_eq(frequency_label(1095), "3 years", "3yr label")

    fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    app = make_app(db_path)
    ids = seed(app)
    client = app.test_client()

    bad = client.post("/api/client/login", json={"username": "choc.facilities", "pin": "0000"})
    assert_eq(bad.status_code, 401, "bad pin is 401")

    login = client.post("/api/client/login", json={"username": "CHOC.Facilities", "pin": "2468"})
    assert_eq(login.status_code, 200, "client login")
    token = login.get_json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    assert_eq(login.get_json()["hospital_name"], "CHOC", "login names the hospital")

    me = client.get("/api/client/me", headers=headers)
    assert_eq(me.status_code, 200, "me")
    assert_eq(me.get_json()["username"], "choc.facilities", "username")

    ahus = client.get("/api/client/ahus", headers=headers).get_json()
    assert_eq(len(ahus), 1, "only this hospital's AHUs")
    assert_eq(ahus[0]["name"], "AHU-E2", "E2 listed")
    assert_eq(ahus[0]["building"], "South Tower", "building")
    assert "unit_price" not in ahus[0], "no price on list"

    detail = client.get(f"/api/client/ahus/{ids['ahu_id']}", headers=headers).get_json()
    blob = str(detail)
    assert "269.50" not in blob and "unit_price" not in blob, "no prices in detail"
    assert "SECRET-PN" not in blob, "part numbers stay off the client payload"
    assert "internal" not in blob, "job notes stay off"
    phases = sorted(f["phase"] for f in detail["filters"])
    assert_eq(phases, ["FINAL", "PRE"], "both filters")
    labels = {f["phase"]: f["frequency_label"] for f in detail["filters"]}
    assert_eq(labels["PRE"], "2 years", "2yr on PRE")
    assert_eq(labels["FINAL"], "1 year", "1yr on FINAL")
    assert any(f["status"] == "Overdue" for f in detail["filters"]), "overdue FINAL"

    other = client.get(f"/api/client/ahus/{ids['other_ahu_id']}", headers=headers)
    assert_eq(other.status_code, 404, "other hospital AHU is hidden")

    graphs = client.get("/api/client/graphs", headers=headers).get_json()
    assert_eq(graphs["summary"]["ahus"], 1, "graph ahus")
    assert graphs["summary"]["overdue"] >= 1, "overdue in graphs"
    assert graphs["by_building"][0]["name"] == "South Tower"

    tech_headers = auth_header(app, ids["tech_id"], "technician", "tech")
    blocked = client.get("/api/client/ahus", headers=tech_headers)
    assert_eq(blocked.status_code, 403, "tech token cannot use client routes")

    client_on_tech = client.get("/api/technicians/me", headers=headers)
    assert_eq(client_on_tech.status_code, 401, "client token cannot use tech routes")

    client_on_admin = client.get("/api/admin/hospitals", headers=headers)
    assert_eq(client_on_admin.status_code, 401, "client token cannot use admin routes")

    tech_login = client.post("/api/technicians/login", json={"name": "Tech", "pin": "1111"})
    assert_eq(tech_login.status_code, 200, "tech login still works")
    assert tech_login.get_json().get("token"), "tech token issued"

    admin_headers = auth_header(app, ids["admin_id"], "admin", "tech")
    created = client.post(
        f"/api/admin/hospitals/{ids['choc_id']}/clients",
        headers=admin_headers,
        json={"name": "CHOC Lead", "username": "choc.lead", "pin": "1357"},
    )
    assert_eq(created.status_code, 201, "admin creates portal login")
    listed = client.get(
        f"/api/admin/hospitals/{ids['choc_id']}/clients",
        headers=admin_headers,
    ).get_json()
    assert_eq(len(listed), 2, "two portal logins")

    reset = client.patch(
        f"/api/admin/clients/{created.get_json()['id']}",
        headers=admin_headers,
        json={"pin": "24680"},
    )
    assert_eq(reset.status_code, 200, "admin resets PIN")
    relogin = client.post("/api/client/login", json={"username": "choc.lead", "pin": "24680"})
    assert_eq(relogin.status_code, 200, "new PIN works")

    sample = public_filter(
        type("F", (), {
            "id": 1, "phase": "PRE", "size": "24x24x12", "quantity": 4,
            "frequency_days": 90, "last_service_date": date.today(),
        })()
    )
    assert "part_number" not in sample, "public filter omits catalog PN"
    assert sample["frequency_label"] == "90 days"

    try:
        os.unlink(db_path)
    except OSError:
        pass
    print("client portal tests passed")


if __name__ == "__main__":
    main()
