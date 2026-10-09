"""Hospital client portal — read-only, one hospital per login."""
import re

from flask import Blueprint, g, jsonify, request
from sqlalchemy.orm import joinedload, selectinload

from db import db
from extensions import limiter
from middleware.auth import require_client, require_director
from middleware.jwt_utils import create_access_token, token_string
from middleware.pin_utils import hash_pin, is_hashed, verify_pin
from models import AHU, ClientInquiry, ClientUser, Hospital
from utility.client_portal import (
    hospital_graphs,
    hospital_overview,
    public_ahu_detail,
    public_ahu_summary,
    sticker_card,
    walk_sorted_ahus,
)
from utility.http import internal_error

client_bp = Blueprint("client", __name__)


def _portal_role(client):
    role = str(getattr(client, "role", None) or "director").strip().lower()
    if role in ("tech", "technician", "staff"):
        return "tech"
    return "director"


def _client_dict(client):
    hospital = client.hospital
    return {
        "id": client.id,
        "name": client.name,
        "username": client.username,
        "hospital_id": client.hospital_id,
        "hospital_name": hospital.name if hospital else None,
        "role": _portal_role(client),
    }


@client_bp.route("/client/login", methods=["POST"])
@limiter.limit("5 per 15 minutes")
def client_login():
    try:
        data = request.get_json(silent=True) or {}
        username = str(data.get("username") or "").strip().lower()
        pin = data.get("pin")
        if not username or pin is None or pin == "":
            return jsonify({"error": "Missing username or pin"}), 400

        client = ClientUser.query.filter_by(username=username, active=True).first()
        if not client or not verify_pin(str(pin), client.pin):
            return jsonify({"error": "Invalid credentials"}), 401

        hospital = db.session.get(Hospital, client.hospital_id)
        if hospital and getattr(hospital, "active", True) is False:
            return jsonify({"error": "This hospital portal is inactive"}), 403

        if not is_hashed(client.pin):
            try:
                client.pin = hash_pin(str(pin))
                db.session.commit()
            except Exception:
                db.session.rollback()

        token = token_string(create_access_token(client.id, "client", token_type="client"))
        payload = _client_dict(client)
        payload["token"] = token
        return jsonify(payload), 200
    except Exception as e:
        return internal_error(e)


@client_bp.route("/client/me", methods=["GET"])
@require_client
def client_me():
    return jsonify(_client_dict(g.current_client)), 200


def _hospital_ahus(hospital_id):
    rows = (
        AHU.query.options(
            joinedload(AHU.building),
            joinedload(AHU.hospital),
            selectinload(AHU.filters),
        )
        .filter(AHU.hospital_id == hospital_id)
        .all()
    )
    return walk_sorted_ahus(rows)


_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _clean_text(value, max_len):
    s = re.sub(r"<[^>]*>", " ", str(value or ""))
    s = re.sub(r"\s+", " ", s).strip()
    if not s:
        return None
    return s[:max_len]


@client_bp.route("/client/hospital", methods=["GET"])
@require_director
def client_hospital():
    hospital = db.session.get(Hospital, g.current_hospital_id)
    if not hospital:
        return jsonify({"error": "Hospital not found"}), 404
    ahus = _hospital_ahus(hospital.id)
    graphs = hospital_graphs(hospital.id, ahus)
    overview = hospital_overview(ahus)
    return jsonify({
        "id": hospital.id,
        "name": hospital.name,
        "city": hospital.city,
        "summary": graphs["summary"],
        "compliance_pct": overview["compliance_pct"],
        "overdue_units": overview["overdue_units"],
        "due_soon_units": overview["due_soon_units"],
        "recent_changeouts": overview["recent_changeouts"],
    }), 200


@client_bp.route("/client/ahus", methods=["GET"])
@require_client
def client_ahus():
    ahus = _hospital_ahus(g.current_hospital_id)
    return jsonify([public_ahu_summary(a) for a in ahus]), 200


def _resolve_ahu(ahu_id, hospital_id):
    ahu = None
    try:
        ahu = (
            AHU.query.options(
                joinedload(AHU.building),
                selectinload(AHU.filters),
            )
            .filter_by(id=int(ahu_id), hospital_id=hospital_id)
            .first()
        )
    except (TypeError, ValueError):
        ahu = (
            AHU.query.options(
                joinedload(AHU.building),
                selectinload(AHU.filters),
            )
            .filter_by(name=str(ahu_id), hospital_id=hospital_id)
            .first()
        )
    return ahu


@client_bp.route("/client/ahus/<string:ahu_id>", methods=["GET"])
@require_client
def client_ahu(ahu_id):
    ahu = _resolve_ahu(ahu_id, g.current_hospital_id)
    if not ahu:
        return jsonify({"error": "AHU not found"}), 404
    return jsonify(public_ahu_detail(ahu)), 200


@client_bp.route("/client/graphs", methods=["GET"])
@require_director
def client_graphs():
    ahus = _hospital_ahus(g.current_hospital_id)
    return jsonify(hospital_graphs(g.current_hospital_id, ahus)), 200


@client_bp.route("/public/units/<int:ahu_id>", methods=["GET"])
@limiter.limit("30 per minute")
def public_unit_sticker(ahu_id):
    """Logged-out QR card. GET only. No jobs, notes, prices, or catalog PNs."""
    ahu = (
        AHU.query.options(
            joinedload(AHU.building),
            joinedload(AHU.hospital),
            selectinload(AHU.filters),
        )
        .filter_by(id=int(ahu_id))
        .first()
    )
    if not ahu:
        return jsonify({"error": "Unit not found"}), 404
    hospital = ahu.hospital
    if hospital is not None and getattr(hospital, "active", True) is False:
        return jsonify({"error": "Unit not found"}), 404
    return jsonify(sticker_card(ahu)), 200


@client_bp.route("/client/contact", methods=["POST"])
@require_director
@limiter.limit("5 per hour")
def client_contact():
    data = request.get_json(silent=True) or {}
    if _clean_text(data.get("website"), 80):
        return jsonify({"ok": True}), 200
    message = _clean_text(data.get("message"), 2000)
    if not message or len(message) < 10:
        return jsonify({"error": "Enter a short message (at least 10 characters)."}), 400
    email = _clean_text(data.get("email"), 200)
    if email and not _EMAIL_RE.match(email):
        return jsonify({"error": "That email does not look valid."}), 400
    inquiry = ClientInquiry(
        hospital_id=g.current_hospital_id,
        client_user_id=g.current_client_id,
        sender_name=_clean_text(data.get("name"), 150) or g.current_client.name,
        sender_email=email,
        sender_phone=_clean_text(data.get("phone"), 40),
        message=message,
    )
    db.session.add(inquiry)
    db.session.commit()
    return jsonify({"ok": True}), 201
