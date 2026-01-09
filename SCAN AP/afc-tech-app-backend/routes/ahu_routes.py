from flask import Blueprint, jsonify, request
from models import AHU, Filter
from db import db
from datetime import date, timedelta

from sqlalchemy.orm import joinedload, selectinload
from utility.status import compute_filter_status

ahu_bp = Blueprint("ahu", __name__)


# ---------------------------------------------------
# Helper: Compute AHU service status safely
# ---------------------------------------------------

def compute_ahu_status_from_filters(filters):
    if not filters:
        return {
            "status": "Pending",
            "next_due_date": None,
            "days_until_due": None,
            "days_overdue": None,
        }

    next_dues = []
    days_until_list = []
    overdue_days = []

    for f in filters:
        status = compute_filter_status(f)
        if status["next_due_date"]:
            next_dues.append(status["next_due_date"])
        if status["days_until_due"] is not None:
            days_until_list.append(status["days_until_due"])
        if status["days_overdue"]:
            overdue_days.append(status["days_overdue"])

    if not next_dues:
        return{
            "status":"Pending",
            "next_due_date":None,
            "days_until_due":None,
            "days_overdue":None,
        }

    if overdue_days:
        return {
            "status": "Overdue",
            "next_due_date": min(next_dues),
            "days_until_due": 0,
            "days_overdue": max(overdue_days),
        }

    if any(d <= 7 for d in days_until_list):
        return{
            "status":"Due Soon",
            "next_due_date":min(next_dues),
            "days_until_due":min(days_until_list),
            "days_overdue":0,
        }

    return {
        "status": "Completed",
        "next_due_date": min(next_dues),
        "days_until_due": min(
            compute_filter_status(f)["days_until_due"]
            for f in filters
            if compute_filter_status(f)["days_until_due"] is not None
        ),
        "days_overdue": 0,
    }


# ---------------------------------------------------
# Get AHU details by QR code
# ---------------------------------------------------
@ahu_bp.route("/qr/<string:ahu_id>", methods=["GET"])
def get_ahu_by_qr(ahu_id):
    # Look up AHU
    ahu = db.session.get(AHU, ahu_id)
    if not ahu:
        return jsonify({"error": "AHU not found"}), 404

    # Filters tied to this AHU
    filters = []
    for f in ahu.filters:
        status = compute_filter_status(f)
        filters.append({
            "id": f.id,
            "phase": f.phase,
            "part_number": f.part_number,
            "size": f.size,
            "quantity": f.quantity,
            "frequency_days": f.frequency_days,
            "last_service_date": (
                f.last_service_date.isoformat()
                if f.last_service_date else None
            ),
            **status
        })
    
    ahu_status=compute_ahu_status_from_filters(ahu.filters)

    # Build response payload
    payload = {
        "ahu_id": ahu.id,
        "hospital_id": ahu.hospital_id,
        "hospital_name": ahu.hospital.name if ahu.hospital else None,
        "name": ahu.name,
        "location": ahu.location,
        "notes": ahu.notes,
        **ahu_status,
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

    active_filters = [f for f in ahu.filters if getattr(f, "is_active", True)]

    return jsonify(
        [
            {
                "id": f.id,
                "phase": f.phase,
                "part_number": f.part_number,
                "size": f.size,
                "quantity": f.quantity,
                "frequency_days": f.frequency_days,
                "last_serviced_date":(
                    f.last_serviced_date.isoformat()
                    if f.last_serviced_date else None
                ),
                "is_active":f.is_active,
            }
        for f in ahu.filters
    ]), 200


#add fiters
@ahu_bp.route("/admin/ahus/<string:ahu_id>/filters", methods=["POST"])
def add_filter(ahu_id):
    data = request.json

    f = Filter(
        ahu_id=ahu_id,
        phase=data["phase"],
        part_number=data["part_number"],
        size=data["size"],
        quantity=data["quantity"],
        frequency_days=data["frequency_days"],
        is_active=True,
    )

    db.session.add(f)
    db.session.commit()

    return jsonify({"message": "Filter added"}), 201

@ahu_bp.route("/admin/filter/<int:filter_id>.deactivate", methods=["PATCH"])
def deactive_filter(filter_id):
    f = db.session.get(Filter, filter_id)
    if not f:
        return jsonify({"error":"Filter not found"}),404
    
    f.is_active = False
    db.session_commit()

    return jsonify({"message":"Filter deactivated","id":f.id}),200



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
    f.frequency_days = data["frequency_days"]

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


@ahu_bp.route("/")


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