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
from models import AHU, Building, ClientInquiry, ClientUser, Filter, Hospital, Job, JobFilter, Technician
from routes.admin import admin_bp
from routes.ahu_routes import ahu_bp
from routes.client_routes import client_bp
from routes.job_routes import job_bp
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
    app.register_blueprint(job_bp, url_prefix="/api")
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

        main = Building(hospital_id=choc.id, name="MAIN BLDG")
        db.session.add(main)
        db.session.flush()

        ahu = AHU(
            hospital_id=choc.id,
            building_id=south.id,
            name="AHU-E2",
            location="Penthouse1 Roof",
            excel_order=5,
        )
        ahu9 = AHU(
            hospital_id=choc.id,
            building_id=south.id,
            name="AHU-9",
            location="1ST FLOOR",
            excel_order=1,
        )
        ahu_main = AHU(
            hospital_id=choc.id,
            building_id=main.id,
            name="AH-10",
            location="Roof",
            excel_order=16,
        )
        other_ahu = AHU(
            hospital_id=other.id,
            name="AHU-1",
            location="Roof",
        )
        db.session.add_all([ahu, ahu9, ahu_main, other_ahu])
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
            role="director",
        )
        floor = ClientUser(
            hospital_id=choc.id,
            name="CHOC Floor",
            username="choc.floor",
            pin=hash_pin("1357"),
            active=True,
            role="tech",
        )
        db.session.add_all([admin, tech, client, floor])
        db.session.flush()
        job = Job(ahu_id=ahu.id, tech_id=tech.id, overall_notes="internal")
        db.session.add(job)
        db.session.flush()
        pre = Filter.query.filter_by(ahu_id=ahu.id, phase="PRE").first()
        db.session.add(
            JobFilter(
                job_id=job.id,
                filter_id=pre.id,
                is_completed=False,
                is_inspected=True,
                note="No access — held for next visit.",
            )
        )
        db.session.commit()
        return {
            "choc_id": choc.id,
            "other_id": other.id,
            "ahu_id": ahu.id,
            "ahu9_id": ahu9.id,
            "ahu_main_id": ahu_main.id,
            "other_ahu_id": other_ahu.id,
            "admin_id": admin.id,
            "tech_id": tech.id,
            "client_id": client.id,
            "floor_id": floor.id,
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
    assert_eq(login.get_json()["role"], "director", "facilities login is director")

    me = client.get("/api/client/me", headers=headers)
    assert_eq(me.status_code, 200, "me")
    assert_eq(me.get_json()["username"], "choc.facilities", "username")

    ahus = client.get("/api/client/ahus", headers=headers).get_json()
    assert_eq(len(ahus), 3, "only this hospital's AHUs")
    assert_eq(
        [a["name"] for a in ahus],
        ["AH-10", "AHU-9", "AHU-E2"],
        "grouped by building, then walk order",
    )
    assert_eq(ahus[0]["building"], "MAIN BLDG", "Main first alphabetically")
    assert_eq(ahus[1]["building"], "South Tower", "South walk: AHU-9 before E2")
    assert "unit_price" not in ahus[0], "no price on list"
    assert "excel_order" not in ahus[0], "excel_order stays internal"

    detail = client.get(f"/api/client/ahus/{ids['ahu_id']}", headers=headers).get_json()
    blob = str(detail)
    assert "269.50" not in blob and "unit_price" not in blob, "no prices in detail"
    assert "SECRET-PN" not in blob, "part numbers stay off the client payload"
    assert "internal" not in blob, "job notes stay off"
    comments = detail.get("comments") or []
    assert comments, "held-filter comments are on the unit page"
    assert any("No access" in (c.get("text") or "") for c in comments), "skip reason is visible"
    assert all("tech_id" not in c and "technician" not in c for c in comments), "comments hide tech identity"
    phases = sorted(f["phase"] for f in detail["filters"])
    assert_eq(phases, ["FINAL", "PRE"], "both filters")
    labels = {f["phase"]: f["frequency_label"] for f in detail["filters"]}
    assert_eq(labels["PRE"], "2 years", "2yr on PRE")
    assert_eq(labels["FINAL"], "1 year", "1yr on FINAL")
    assert any(f["status"] == "Overdue" for f in detail["filters"]), "overdue FINAL"

    other = client.get(f"/api/client/ahus/{ids['other_ahu_id']}", headers=headers)
    assert_eq(other.status_code, 404, "other hospital AHU is hidden")

    graphs = client.get("/api/client/graphs", headers=headers).get_json()
    assert_eq(graphs["summary"]["ahus"], 3, "graph ahus")
    assert graphs["summary"]["overdue"] >= 1, "overdue in graphs"
    buildings = [b["name"] for b in graphs["by_building"]]
    assert "South Tower" in buildings and "MAIN BLDG" in buildings

    sticker = client.get(f"/api/public/units/{ids['ahu_id']}")
    assert_eq(sticker.status_code, 200, "logged-out QR card")
    card = sticker.get_json()
    blob = str(card)
    assert "SECRET-PN" not in blob and "F8V4-2424-GWB" not in blob, "sticker hides catalog PNs"
    assert "269.50" not in blob and "unit_price" not in blob, "sticker hides prices"
    assert "internal" not in blob, "sticker hides job notes"
    assert "No access" not in blob, "sticker hides skip comments"
    assert "comments" not in card, "sticker has no comment list"
    assert "hospital_id" not in card, "sticker hides hospital id"
    assert card["hospital"] == "CHOC", "sticker hospital name"
    assert card["name"] == "AHU-E2", "sticker AHU name"
    assert all("id" not in f for f in card["filters"]), "sticker filters have no db ids"

    missing = client.get("/api/public/units/999999")
    assert_eq(missing.status_code, 404, "unknown sticker id is 404")
    named = client.get("/api/public/units/AHU-E2")
    assert named.status_code in (404, 405), "no lookup by name"
    wrote = client.post(f"/api/public/units/{ids['ahu_id']}", json={"status": "Completed"})
    assert_eq(wrote.status_code, 405, "public sticker is GET only")
    patched = client.patch(f"/api/client/ahus/{ids['ahu_id']}", headers=headers, json={"name": "hacked"})
    assert_eq(patched.status_code, 405, "client cannot PATCH units")

    contact = client.post(
        "/api/client/contact",
        headers=headers,
        json={
            "message": "Please call about AHU-9 filters this week.",
            "phone": "714-555-0100",
            "hospital_id": ids["other_id"],
        },
    )
    assert_eq(contact.status_code, 201, "portal contact form")
    with app.app_context():
        stored = ClientInquiry.query.order_by(ClientInquiry.id.desc()).first()
        assert stored is not None, "inquiry stored"
        assert_eq(stored.hospital_id, ids["choc_id"], "inquiry hospital comes from the login, not the body")
        inquiry_count = ClientInquiry.query.count()
    spam = client.post(
        "/api/client/contact",
        headers=headers,
        json={"message": "hack the units", "website": "https://spam.test"},
    )
    assert_eq(spam.status_code, 200, "honeypot accepted without storing as a real send")
    with app.app_context():
        assert_eq(ClientInquiry.query.count(), inquiry_count, "honeypot does not create a row")
    anon_contact = client.post("/api/client/contact", json={"message": "please help us today now"})
    assert_eq(anon_contact.status_code, 401, "contact requires portal login")

    qr_anon = client.get(f"/api/qr/{ids['ahu_id']}")
    assert_eq(qr_anon.status_code, 401, "tech QR payload is never public")
    qr_as_client = client.get(f"/api/qr/{ids['ahu_id']}", headers=headers)
    assert qr_as_client.status_code in (401, 403), "client token cannot load tech QR payload"
    qr_blob = str(qr_as_client.get_json() or {})
    assert "SECRET-PN" not in qr_blob and "269.50" not in qr_blob, "failed QR probe leaks nothing"

    job_try = client.post(
        "/api/jobs",
        headers=headers,
        json={"ahu_id": ids["ahu_id"], "filters": [{"filter_id": 1, "is_completed": True}]},
    )
    assert job_try.status_code in (401, 403), "client cannot submit jobs"
    deleted = client.delete(f"/api/client/ahus/{ids['ahu_id']}", headers=headers)
    assert_eq(deleted.status_code, 405, "client cannot DELETE units")
    put_try = client.put(f"/api/client/ahus/{ids['ahu_id']}", headers=headers, json={"name": "hacked"})
    assert_eq(put_try.status_code, 405, "client cannot PUT units")
    assert "id" not in card, "sticker omits database ids"
    assert "excel_order" not in card, "sticker omits walk-order internals"

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
    assert_eq(len(listed), 3, "director, floor tech, and new login")

    staff_login = client.post("/api/client/login", json={"username": "choc.floor", "pin": "1357"})
    assert_eq(staff_login.status_code, 200, "hospital tech login")
    assert_eq(staff_login.get_json()["role"], "tech", "floor login is hospital tech")
    staff_headers = {"Authorization": f"Bearer {staff_login.get_json()['token']}"}
    staff_ahus = client.get("/api/client/ahus", headers=staff_headers)
    assert_eq(staff_ahus.status_code, 200, "hospital tech can list units")
    staff_detail = client.get(f"/api/client/ahus/{ids['ahu_id']}", headers=staff_headers)
    assert_eq(staff_detail.status_code, 200, "hospital tech can open a unit")
    assert any("No access" in (c.get("text") or "") for c in staff_detail.get_json().get("comments") or []), "hospital tech sees skip comments"
    assert_eq(client.get("/api/client/graphs", headers=staff_headers).status_code, 403, "hospital tech cannot graphs")
    assert_eq(client.get("/api/client/hospital", headers=staff_headers).status_code, 403, "hospital tech cannot director home")
    assert_eq(client.get("/api/client/datasheet", headers=staff_headers).status_code, 404, "no portal datasheet dump")
    staff_contact = client.post(
        "/api/client/contact",
        headers=staff_headers,
        json={"message": "please let me change the filters now"},
    )
    assert_eq(staff_contact.status_code, 403, "hospital tech cannot send director contact")
    assert_eq(client.get("/api/client/datasheet", headers=headers).status_code, 404, "director has no datasheet dump")
    home = client.get("/api/client/hospital", headers=headers)
    assert_eq(home.status_code, 200, "director hospital payload")
    assert "datasheet" not in home.get_json(), "hospital home does not include a full datasheet dump"

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
