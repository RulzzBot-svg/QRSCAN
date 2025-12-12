from flask import Blueprint, jsonify
from models import AHU, Filter
from db import db
from datetime import date, timedelta

ahu_bp = Blueprint("ahu", __name__)


def compute_ahu_status(ahu):
    if not ahu.last_service_date:
        return {
            "status": "Pending",
            "next_due_date": None,
            "days_overdue": None,
            "days_until_due": None
        }

    next_due = ahu.last_service_date + timedelta(days=ahu.frequency_days)
    today = date.today()

    if today > next_due:
        return {
            "status": "Overdue",
            "next_due_date": next_due.isoformat(),
            "days_overdue": (today - next_due).days,
            "days_until_due": 0
        }

    if today >= next_due - timedelta(days=7):
        return {
            "status": "Due Soon",
            "next_due_date": next_due.isoformat(),
            "days_overdue": 0,
            "days_until_due": (next_due - today).days
        }

    return {
        "status": "Completed",
        "next_due_date": next_due.isoformat(),
        "days_overdue": 0,
        "days_until_due": (next_due - today).days
    }


@ahu_bp.route("/qr/<string:ahu_id>", methods=["GET"])
def get_ahu_by_qr(ahu_id):
    # Look up AHU
    ahu = db.session.get(AHU, ahu_id)
    if not ahu:
        return jsonify({"error": "AHU not found"}), 404

    # Compute service status
    status_data = compute_ahu_status(ahu)

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
        "filters": filters,
        **status_data  # dynamically injects status, next due date, etc.
    }

    return jsonify(payload), 200
