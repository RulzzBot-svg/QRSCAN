from flask import Blueprint, jsonify
from models import Hospital, AHU
from db import db
from utility.status import compute_ahu_status   # <-- use your helper

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
        status = compute_ahu_status(a)

        result.append({
            "id": a.id,
            "name": a.name,
            "location": a.location,
            "frequency_days": a.frequency_days,
            "last_service_date": str(a.last_service_date) if a.last_service_date else None,
            "status": status["status"],                # <-- required by frontend
            "next_due_date": status["next_due_date"],  # optional UI
            "days_overdue": status["days_overdue"],    # optional UI
            "days_until_due": status["days_until_due"] # optional UI
        })

    return jsonify(result), 200
