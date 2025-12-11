from flask import Blueprint, jsonify
from models import AHU, Filter
from db import db

ahu_bp = Blueprint("ahu", __name__)

@ahu_bp.route("/qr/<string:ahu_id>", methods=["GET"])
def get_ahu_by_qr(ahu_id):
    # Look up AHU
    ahu = db.session.get(AHU, ahu_id)
    if not ahu:
        return jsonify({"error": "AHU not found"}), 404

    # Get filter list tied to this AHU
    filters = [
        {
            "id": f.id,
            "phase": f.phase,
            "part_number": f.part_number,
            "size": f.size,
            "quantity": f.quantity
        }
        for f in ahu.filters
    ]

    # Build QR payload response
    payload = {
        "ahu_id": ahu.id,
        "hospital_id": ahu.hospital_id,
        "name": ahu.name,
        "location": ahu.location,
        "frequency_days": ahu.frequency_days,
        "last_service_date": ahu.last_service_date.isoformat() if ahu.last_service_date else None,
        "notes": ahu.notes,
        "filters": filters
    }

    return jsonify(payload), 200
