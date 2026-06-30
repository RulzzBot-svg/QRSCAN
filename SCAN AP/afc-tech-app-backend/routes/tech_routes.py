from flask import Blueprint, request, jsonify
from models import Technician
from db import db
import logging
from extensions import limiter
from middleware.jwt_utils import create_access_token, token_string
from middleware.pin_utils import hash_pin, is_hashed, verify_pin
from middleware.auth import require_admin, require_auth
from utility.http import internal_error

tech_bp = Blueprint("technicians", __name__)
logger = logging.getLogger(__name__)


@tech_bp.route("/technicians", methods=["GET"])
@require_admin
def get_all_tech():
    techs = Technician.query.all()
    result = [
        {
            "id": t.id,
            "name": t.name,
            "active": t.active,
            "role": getattr(t, "role", "technician"),
        }
        for t in techs
    ]
    return jsonify(result), 200


@tech_bp.route("/technicians/login", methods=["POST"])
@limiter.limit("5 per 15 minutes")
def login_technicians():
    try:
        data = request.get_json(silent=True) or {}
        name = (data.get("name") or "").strip()
        pin = data.get("pin")

        if not name or pin is None or pin == "":
            return jsonify({"error": "Missing name or pin"}), 400

        tech = Technician.query.filter_by(name=name, active=True).first()
        if not tech or not verify_pin(str(pin), tech.pin):
            return jsonify({"error": "Invalid credentials"}), 401

        if not is_hashed(tech.pin):
            try:
                tech.pin = hash_pin(str(pin))
                db.session.commit()
            except Exception as hash_err:
                db.session.rollback()
                logger.warning(
                    "Could not persist hashed PIN (run migrations/2026_06_30_widen_technician_pin.py): %s",
                    hash_err,
                )

        role = getattr(tech, "role", "technician")
        token = token_string(create_access_token(tech.id, role))

        return jsonify({
            "id": tech.id,
            "name": tech.name,
            "active": tech.active,
            "role": role,
            "token": token,
        }), 200
    except Exception as e:
        return internal_error(e)


@tech_bp.route("/technicians/me", methods=["GET"])
@require_auth
def get_current_technician():
    from flask import g

    tech = g.current_tech
    return jsonify({
        "id": tech.id,
        "name": tech.name,
        "active": tech.active,
        "role": getattr(tech, "role", "technician"),
    }), 200


@tech_bp.route("/technicians/<int:tech_id>", methods=["GET"])
@require_auth
def get_technician(tech_id):
    from flask import g

    if g.current_tech_id != tech_id and g.current_tech_role != "admin":
        return jsonify({"error": "Forbidden"}), 403

    tech = db.session.get(Technician, tech_id)
    if not tech:
        return jsonify({"error": "Technician not found"}), 404

    return jsonify({
        "id": tech.id,
        "name": tech.name,
        "active": tech.active,
        "role": getattr(tech, "role", "technician"),
    }), 200
