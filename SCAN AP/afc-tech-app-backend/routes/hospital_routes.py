from flask import Blueprint, jsonify
from models import Hospital, AHU, Filter
from sqlalchemy.orm import selectinload
from db import db
from datetime import date, timedelta

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
        # Compute filter counts and due dates if filters are available
        overdue_count = 0
        due_soon_count = 0
        filters_count = 0
        latest_service = None
        next_due_dates = []

        for f in (a.filters or []):
            filters_count += 1
            last = getattr(f, "last_service_date", None)
            freq = getattr(f, "frequency_days", None)

            if last:
                # ensure date object
                last_dt = last if isinstance(last, date) else last
                if latest_service is None or (last_dt and last_dt > latest_service):
                    latest_service = last_dt

            if last and freq:
                try:
                    next_due = last + timedelta(days=int(freq))
                    next_due_dates.append(next_due)
                    delta = (next_due - date.today()).days
                    if delta < 0:
                        overdue_count += 1
                    elif delta <= 7:
                        due_soon_count += 1
                except Exception:
                    pass

        # derive a simple overall status
        if overdue_count > 0:
            status = "Overdue"
        elif due_soon_count > 0:
            status = "Due Soon"
        elif filters_count > 0:
            status = "Completed"
        else:
            status = "Pending"

        # earliest upcoming next_due if available
        next_due_date = min(next_due_dates).isoformat() if next_due_dates else None

        result.append({
            "id": a.id,
            "name": a.name,
            "location": a.location,
            "filters_count": filters_count,
            "overdue_count": overdue_count,
            "due_soon_count": due_soon_count,
            "last_serviced": latest_service.isoformat() if latest_service else None,
            "next_due_date": next_due_date,
            "status": status,
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
