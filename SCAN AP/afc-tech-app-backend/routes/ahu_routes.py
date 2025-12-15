from flask import Blueprint, jsonify
from models import AHU, Filter
from db import db
from datetime import date, timedelta

ahu_bp = Blueprint("ahu", __name__)


# ---------------------------------------------------
# Helper: Compute AHU service status safely
# ---------------------------------------------------
def compute_ahu_status(ahu):
    """
    Determines service status and derived scheduling data
    based on last_service_date and frequency_days.
    """

    # AHU has never been serviced
    if not ahu.last_service_date or not ahu.frequency_days:
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


# ---------------------------------------------------
# Get AHU details by QR code (primary tech entry point)
# ---------------------------------------------------
@ahu_bp.route("/qr/<string:ahu_id>", methods=["GET"])
def get_ahu_by_qr(ahu_id):
    # Look up AHU
    ahu = db.session.get(AHU, ahu_id)
    if not ahu:
        return jsonify({"error": "AHU not found"}), 404

    # Compute derived scheduling/status data
    status_data = compute_ahu_status(ahu)

    # Filters tied to this AHU
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

    # Build response payload
    payload = {
        "ahu_id": ahu.id,
        "hospital_id": ahu.hospital_id,
        "hospital_name": ahu.hospital.name if ahu.hospital else None,
        "name": ahu.name,
        "location": ahu.location,
        "frequency_days": ahu.frequency_days,
        "last_service_date": (
            ahu.last_service_date.isoformat()
            if ahu.last_service_date
            else None
        ),
        "notes": ahu.notes,
        "filters": filters,

        # ✅ Inject computed fields safely
        **status_data
    }

    return jsonify(payload), 200
