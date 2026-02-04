from flask import Blueprint, jsonify, request
from models import Hospital, AHU, Job, Technician
from db import db
from sqlalchemy.orm import joinedload
import re

admin_bp = Blueprint("admin", __name__)

@admin_bp.route("/overview", methods=["GET"])
def admin_overview():
    hospitals = Hospital.query.all()

    total_hospitals = len(hospitals)
    total_ahus = 0
    overdue = 0
    due_soon = 0
    completed = 0
    pending = 0

    return jsonify({
        "hospitals": total_hospitals,
        "total_ahus": total_ahus,
        "overdue": overdue,
        "due_soon": due_soon,
        "completed": completed,
        "pending": pending
    }), 200


@admin_bp.route("/jobs", methods=["GET"])
def get_all_jobs():
    print("DEBUG: get_all_jobs called with is_inspected support - VERSION 2")  # Debug log
    # Updated to include is_inspected
    jobs = db.session.query(Job).options(
        joinedload(Job.technician),
        joinedload(Job.ahu),
        joinedload(Job.job_filters).joinedload('filter')
    ).all()

    result = []
    for job in jobs:
        result.append({
            "id": job.id,
            "ahu_id": job.ahu_id,
            "ahu_name": job.ahu.name if job.ahu else "Unknown AHU",
            "technician": job.technician.name if job.technician else "Unknown Tech",
            "completed_at": job.completed_at.isoformat() + "Z",
            "overall_notes": job.overall_notes,
            "gps_lat": job.gps_lat,
            "gps_long": job.gps_long,
            "filters": [
                {
                    "phase": jf.filter.phase,
                    "part_number": jf.filter.part_number,
                    "size": jf.filter.size,
                    "is_completed": jf.is_completed,
                    "is_inspected": jf.is_inspected,
                    "note": jf.note
                }
                for jf in job.job_filters
            ]
        })

    return jsonify(result), 200


@admin_bp.route("/ahu", methods=["POST"])
def create_ahu():
    """Create a new AHU manually."""
    try:
        data = request.get_json()
        hospital_id = data.get("hospital_id")
        ahu_name = data.get("ahu_name")
        location = data.get("location")
        notes = data.get("notes")

        if not hospital_id or not ahu_name:
            return jsonify({"error": "Missing hospital_id or ahu_name"}), 400

        # Verify hospital exists
        hospital = Hospital.query.get(hospital_id)
        if not hospital:
            return jsonify({"error": "Hospital not found"}), 404

        # Create canonical AHU ID
        def canonical_ahu_id(h_id: int, raw_name: str):
            s = str(raw_name).strip()
            if s.startswith("#"):
                s = s[1:].strip()
            s = re.sub(r"\s+", "-", s)
            s = re.sub(r"[^A-Za-z0-9\-]+", "-", s)
            s = re.sub(r"-{2,}", "-", s).strip("-")
            return f"H{h_id}-{s.lower()}" if s else None

        ahu_id = canonical_ahu_id(hospital_id, ahu_name)
        if not ahu_id:
            return jsonify({"error": "Invalid AHU name"}), 400

        # Check if AHU already exists
        existing = AHU.query.get(ahu_id)
        if existing:
            return jsonify({"error": f"AHU with ID {ahu_id} already exists"}), 409

        # Create new AHU
        new_ahu = AHU(
            id=ahu_id,
            hospital_id=hospital_id,
            name=ahu_name,
            location=location,
            notes=notes
        )
        db.session.add(new_ahu)
        db.session.commit()

        return jsonify({
            "id": new_ahu.id,
            "hospital_id": new_ahu.hospital_id,
            "name": new_ahu.name,
            "location": new_ahu.location,
            "notes": new_ahu.notes
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error creating AHU: {e}")
        return jsonify({"error": str(e)}), 500
