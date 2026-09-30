"""Hospital client portal — read-only, one hospital per login."""
from flask import Blueprint, g, jsonify, request
from sqlalchemy.orm import joinedload, selectinload

from db import db
from extensions import limiter
from middleware.auth import require_client
from middleware.jwt_utils import create_access_token, token_string
from middleware.pin_utils import hash_pin, is_hashed, verify_pin
from models import AHU, ClientUser, Hospital
from utility.client_portal import hospital_graphs, public_ahu_detail, public_ahu_summary
from utility.http import internal_error

client_bp = Blueprint("client", __name__)


def _client_dict(client):
    hospital = client.hospital
    return {
        "id": client.id,
        "name": client.name,
        "username": client.username,
        "hospital_id": client.hospital_id,
        "hospital_name": hospital.name if hospital else None,
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
    return (
        AHU.query.options(
            joinedload(AHU.building),
            selectinload(AHU.filters),
        )
        .filter(AHU.hospital_id == hospital_id)
        .order_by(AHU.name.asc())
        .all()
    )


@client_bp.route("/client/hospital", methods=["GET"])
@require_client
def client_hospital():
    hospital = db.session.get(Hospital, g.current_hospital_id)
    if not hospital:
        return jsonify({"error": "Hospital not found"}), 404
    ahus = _hospital_ahus(hospital.id)
    graphs = hospital_graphs(hospital.id, ahus)
    return jsonify({
        "id": hospital.id,
        "name": hospital.name,
        "city": hospital.city,
        "summary": graphs["summary"],
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
@require_client
def client_graphs():
    ahus = _hospital_ahus(g.current_hospital_id)
    return jsonify(hospital_graphs(g.current_hospital_id, ahus)), 200
