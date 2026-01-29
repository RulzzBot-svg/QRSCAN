from flask import Blueprint, jsonify, request
from models import AHU, Filter
from db import db
import traceback

from sqlalchemy.orm import joinedload, selectinload
from utility.status import compute_filter_status

ahu_bp = Blueprint("ahu", __name__)


# ---------------------------------------------------
# Helper: Safe filter status wrapper
# ---------------------------------------------------
def safe_filter_status(f):
    """
    compute_filter_status can throw if data is unexpected.
    This wrapper ensures we never crash endpoints.
    """
    try:
        st = compute_filter_status(f) or {}
    except Exception:
        traceback.print_exc()
        st = {}

    return {
        "status": st.get("status"),
        "next_due_date": st.get("next_due_date"),
        "days_until_due": st.get("days_until_due"),
        "days_overdue": st.get("days_overdue"),
    }


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
        st = safe_filter_status(f)

        if st["next_due_date"]:
            next_dues.append(st["next_due_date"])

        if st["days_until_due"] is not None:
            days_until_list.append(st["days_until_due"])

        if st["days_overdue"]:
            overdue_days.append(st["days_overdue"])

    if not next_dues:
        return {
            "status": "Pending",
            "next_due_date": None,
            "days_until_due": None,
            "days_overdue": None,
        }

    if overdue_days:
        return {
            "status": "Overdue",
            "next_due_date": min(next_dues),
            "days_until_due": 0,
            "days_overdue": max(overdue_days),
        }

    if any(d <= 7 for d in days_until_list):
        return {
            "status": "Due Soon",
            "next_due_date": min(next_dues),
            "days_until_due": min(days_until_list) if days_until_list else None,
            "days_overdue": 0,
        }

    # Completed (not overdue, not due soon)
    return {
        "status": "Completed",
        "next_due_date": min(next_dues),
        "days_until_due": min(days_until_list) if days_until_list else None,
        "days_overdue": 0,
    }


# ---------------------------------------------------
# Get AHU details by QR code
# ---------------------------------------------------
@ahu_bp.route("/qr/<string:ahu_id>", methods=["GET"])
def get_ahu_by_qr(ahu_id):
    try:
        ahu = db.session.get(AHU, ahu_id)
        if not ahu:
            return jsonify({"error": "AHU not found"}), 404

        # Only ACTIVE filters should be returned/used for status
        active_filters = (
            db.session.query(Filter)
            .filter(Filter.ahu_id == ahu_id, Filter.is_active.is_(True))
            .order_by(Filter.excel_order.asc(), Filter.id.asc())
            .all()
        )

        filters_payload = []
        for f in active_filters:
            st = safe_filter_status(f)
            filters_payload.append({
                "id": f.id,
                "phase": f.phase,
                "part_number": f.part_number,
                "size": f.size,
                "quantity": f.quantity,
                "frequency_days": f.frequency_days,
                "last_service_date": (
                    f.last_service_date.isoformat()
                    if getattr(f, "last_service_date", None) else None
                ),
                **{k: v for k, v in st.items() if v is not None}
            })

        ahu_status = compute_ahu_status_from_filters(active_filters)

        payload = {
            "ahu_id": ahu.id,
            "hospital_id": ahu.hospital_id,
            "hospital_name": ahu.hospital.name if ahu.hospital else None,
            "name": ahu.name,
            "location": ahu.location,
            "notes": ahu.notes,
            **ahu_status,
            "filters": filters_payload,
        }

        return jsonify(payload), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------
# Admin: Get filters for an AHU (ACTIVE only)
# ---------------------------------------------------
@ahu_bp.route("/admin/ahus/<string:ahu_id>/filters", methods=["GET"])
def get_filters_for_admin(ahu_id):
    try:
        ahu = db.session.get(AHU, ahu_id)
        if not ahu:
            return jsonify({"error": "AHU not found"}), 404
        
        active_only = request.args.get("active_only","0")=="1"

        q = db.session.query(Filter).filter(Filter.ahu_id == ahu_id)
        
        filters = q.order_by(Filter.excel_order.asc(), Filter.id.asc()).all()
        if active_only:
            filters=[f for f in filters if getattr(f, "is_active",True)]


        return jsonify([
            {
                "id": f.id,
                "phase": f.phase,
                "part_number": f.part_number,
                "size": f.size,
                "quantity": f.quantity,
                "frequency_days": f.frequency_days,
                "last_service_date": (
                    f.last_service_date.isoformat()
                    if getattr(f, "last_service_date", None) else None
                ),
                "is_active": f.is_active,
            }
            for f in filters
        ]), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------
# Admin: Add filter
# ---------------------------------------------------
@ahu_bp.route("/admin/ahus/<string:ahu_id>/filters", methods=["POST"])
def add_filter(ahu_id):
    try:
        data = request.json or {}

        # defensive defaults (prevents KeyError 500)
        f = Filter(
            ahu_id=ahu_id,
            phase=data.get("phase", ""),
            part_number=data.get("part_number", ""),
            size=data.get("size", ""),
            quantity=int(data.get("quantity", 1)),
            frequency_days=int(data.get("frequency_days", 90)),
            is_active=True,
        )

        db.session.add(f)
        db.session.commit()

        return jsonify({"message": "Filter added", "id": f.id}), 201

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------
# Admin: Deactivate (soft delete)
# ---------------------------------------------------
@ahu_bp.route("/admin/filters/<int:filter_id>/deactivate", methods=["PATCH"])
def deactivate_filter(filter_id):
    try:
        f = db.session.get(Filter, filter_id)
        if not f:
            return jsonify({"error": "Filter not found"}), 404

        f.is_active = False
        db.session.commit()

        return jsonify({"message": "Filter deactivated", "id": f.id}), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------
# Admin: Update filter
# ---------------------------------------------------
@ahu_bp.route("/admin/filters/<int:filter_id>", methods=["PUT"])
def update_filter(filter_id):
    try:
        f = db.session.get(Filter, filter_id)
        if not f:
            return jsonify({"error": "Filter not found"}), 404

        data = request.json or {}

        # only update known fields (prevents KeyError)
        f.phase = data.get("phase", f.phase)
        f.part_number = data.get("part_number", f.part_number)
        f.size = data.get("size", f.size)
        f.quantity = int(data.get("quantity", f.quantity))
        f.frequency_days = int(data.get("frequency_days", f.frequency_days))

        db.session.commit()
        return jsonify({"message": "Filter updated"}), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------
# Admin: Hard delete (keep if you still want it)
# ---------------------------------------------------
@ahu_bp.route("/admin/filters/<int:filter_id>", methods=["DELETE"])
def delete_filter(filter_id):
    try:
        f = db.session.get(Filter, filter_id)
        if not f:
            return jsonify({"error": "Filter not found"}), 404

        db.session.delete(f)
        db.session.commit()
        return jsonify({"message": "Filter removed"}), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------
# Admin: Get all AHUs
# ---------------------------------------------------
@ahu_bp.route("/admin/ahus", methods=["GET"])
def admin_get_all_ahus():
    try:
        ahus = (
            db.session.query(AHU)
            .options(joinedload(AHU.hospital), selectinload(AHU.filters))
            .order_by(AHU.hospital_id.asc(), AHU.excel_order.asc(), AHU.id.asc())
            .all()
        )

        payload = []
        for a in ahus:
            active_filters = [f for f in a.filters if getattr(f, "is_active", True)]

            status_data = compute_ahu_status_from_filters(active_filters)

            overdue_count = 0
            due_soon_count = 0
            last_serviced_dates = []

            for f in active_filters:
                st = safe_filter_status(f)
                if st.get("status") == "Overdue":
                    overdue_count += 1
                elif st.get("status") == "Due Soon":
                    due_soon_count += 1

                if getattr(f, "last_service_date", None):
                    last_serviced_dates.append(f.last_service_date)

            payload.append({
                "id": a.id,
                "hospital_id": a.hospital_id,
                "hospital": a.hospital.name if a.hospital else None,
                "name": a.name,
                "location": a.location,
                "notes": a.notes,

                "overdue_count": overdue_count,
                "due_soon_count": due_soon_count,
                "last_serviced": (
                    max(last_serviced_dates).isoformat()
                    if last_serviced_dates else None
                ),

                "status": status_data["status"],
                "next_due_date": status_data["next_due_date"],
                "days_until_due": status_data["days_until_due"],
                "days_overdue": status_data["days_overdue"],

                "filters_count": len(active_filters),
            })

        return jsonify(payload), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@ahu_bp.route("/admin/filters/<int:filter_id>/reactivate", methods=["PATCH"])
def reactivate_filter(filter_id):
    f = db.session.get(Filter, filter_id)
    if not f:
        return jsonify({"error": "Filter not found"}), 404

    f.is_active = True
    db.session.commit()

    return jsonify({"message": "Filter reactivated", "id": f.id}), 200
