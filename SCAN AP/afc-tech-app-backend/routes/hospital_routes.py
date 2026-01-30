from flask import Blueprint, jsonify
from models import Hospital, AHU, Filter
from sqlalchemy.orm import selectinload
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


@hospital_bp.route("/hospitals/<int:hospital_id>/offline-bundle", methods=["GET"])
def hospital_offline_bundle(hospital_id):
    hospital = (
        db.session.query(Hospital)
        .filter(Hospital.id == hospital_id)
        .options(
            selectinload(Hospital.ahus).selectinload(AHU.filters)
        )
        .first()
    )

    if not hospital:
        return jsonify({"error": "Hospital not found"}), 404

    # Build a lightweight JSON payload
    payload = {
        "hospital": {
            "id": hospital.id,
            "name": hospital.name,
            "address": hospital.address,
            "city": hospital.city,
            "active": hospital.active,
        },
        "ahus": [],
    }

    for a in hospital.ahus:
        payload["ahus"].append({
            "id": a.id,
            "hospital_id": a.hospital_id,
            "name": a.name,
            "location": a.location,
            "notes": getattr(a, "notes", None),
            "filters": [
                {
                    "id": f.id,
                    "ahu_id": f.ahu_id,
                    "phase": f.phase,
                    "part_number": f.part_number,
                    "size": f.size,
                    "quantity": f.quantity,
                    "efficiency": getattr(f, "efficiency", None),
                    "frequency_days": getattr(f, "frequency_days", None),
                    "last_service_date": (
                        f.last_service_date.isoformat()
                        if getattr(f, "last_service_date", None)
                        else None
                    ),
                    "notes": getattr(f, "notes", None),
                }
                for f in (a.filters or [])
            ]
        })

    return jsonify(payload), 200
