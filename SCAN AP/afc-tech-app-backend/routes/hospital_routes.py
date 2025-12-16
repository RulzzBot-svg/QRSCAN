from flask import Blueprint, jsonify
from models import Hospital, AHU
from db import db

hospital_bp = Blueprint("hospital", __name__)


@hospital_bp.route("/hospital/all", methods=["GET"])
def get_all_hospitals():
    hospitals = Hospital.query.all()
    result = [
        {
            "id": h.id,
            "name": h.name,
            "city": h.city,
            "active": h.active,
            "ahu_count": len(h.ahus)
        }
        for h in hospitals
    ]
    return jsonify(result)


@hospital_bp.route("/hospital/<int:hospital_id>/ahus", methods=["GET"])
def get_ahus_for_hospital(hospital_id):
    ahus = AHU.query.filter_by(hospital_id=hospital_id).all()

    result = []
    for a in ahus:

        result.append({
            "id": a.id,
            "name": a.name,
            "location": a.location,
        })

    return jsonify(result), 200
