from flask import Blueprint, jsonify, request
from models import AHU, Filter
from db import db
from datetime import date, timedelta
from utility.status import compute_ahu_status_from_filters
from sqlalchemy.orm import joinedload, selectinload

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
        "notes": ahu.notes,
        "filters": filters,

    }

    return jsonify(payload), 200


#admin options

#get ahus
@ahu_bp.route("/admin/ahus/<string:ahu_id>/filters", methods=["GET"])
def get_filters_for_admin(ahu_id):
    ahu = db.session.get(AHU, ahu_id)
    if not ahu:
        return jsonify({"error": "AHU not found"}), 404

    return jsonify([
        {
            "id": f.id,
            "phase": f.phase,
            "part_number": f.part_number,
            "size": f.size,
            "quantity": f.quantity
        }
        for f in ahu.filters
    ])


#add fiters
@ahu_bp.route("/admin/ahus/<string:ahu_id>/filters", methods=["POST"])
def add_filter(ahu_id):
    data = request.json

    f = Filter(
        ahu_id=ahu_id,
        phase=data["phase"],
        part_number=data["part_number"],
        size=data["size"],
        quantity=data["quantity"]
    )

    db.session.add(f)
    db.session.commit()

    return jsonify({"message": "Filter added"}), 201


#update filter
@ahu_bp.route("/admin/filters/<int:filter_id>", methods=["PUT"])
def update_filter(filter_id):
    f = db.session.get(Filter, filter_id)
    if not f:
        return jsonify({"error": "Filter not found"}), 404

    data = request.json

    f.phase = data["phase"]
    f.part_number = data["part_number"]
    f.size = data["size"]
    f.quantity = data["quantity"]

    db.session.commit()

    return jsonify({"message": "Filter updated"})

#delete filter
@ahu_bp.route("/admin/filters/<int:filter_id>", methods=["DELETE"])
def delete_filter(filter_id):
    f = db.session.get(Filter, filter_id)
    if not f:
        return jsonify({"error": "Filter not found"}), 404

    db.session.delete(f)
    db.session.commit()

    return jsonify({"message": "Filter removed"})


@ahu_bp.route("/admin/ahus", methods=["GET"])
def admin_get_all_ahus():

    ahus = (
        db.session.query(AHU)
        .options(
            joinedload(AHU.hospital),
            selectinload(AHU.filters)
        )
        .all()
    )

    payload =[]
    for a in ahus:
        status_data = compute_ahu_status_from_filters(a.filters)

        payload.append({
            "id": a.id,
            "hospital_id": a.hospital_id,
            "hospital": a.hospital.name if a.hospital else None,
            "name": a.name,
            "location": a.location,
            "notes": a.notes,
            "status": status_data["status"],
            "next_due_date": status_data["next_due_date"],
            "days_until_due": status_data["days_until_due"],
            "days_overdue": status_data["days_overdue"],
            "filters_count": len(a.filters),
        })

    return jsonify(payload), 200