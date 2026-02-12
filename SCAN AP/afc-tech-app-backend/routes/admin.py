from flask import Blueprint, jsonify, request
from models import Hospital, AHU, Job, Technician
from models import SupervisorSignoff
from db import db
from sqlalchemy.orm import joinedload
import re
from datetime import datetime
from middleware.auth import require_admin

admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/supervisor-signoff", methods=["POST"])
@require_admin
def create_supervisor_signoff():
    """Create a new supervisor signoff record."""
    try:
        data = request.get_json()
        hospital_id = data.get("hospital_id")
        date_str = data.get("date")
        supervisor_name = data.get("supervisor_name")
        summary = data.get("summary")
        signature_data = data.get("signature_data")
        job_ids = data.get("job_ids")  # Should be a comma-separated string or list

        if not (hospital_id and date_str and supervisor_name and signature_data and job_ids):
            return jsonify({"error": "Missing required fields"}), 400

        # Parse date
        try:
            date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except Exception:
            return jsonify({"error": "Invalid date format, should be YYYY-MM-DD"}), 400

        # Accept job_ids as list or comma-separated string
        if isinstance(job_ids, list):
            job_ids_str = ",".join(str(j) for j in job_ids)
        else:
            job_ids_str = str(job_ids)

        new_signoff = SupervisorSignoff(
            hospital_id=hospital_id,
            date=date,
            supervisor_name=supervisor_name,
            summary=summary,
            signature_data=signature_data,
            job_ids=job_ids_str
        )
        db.session.add(new_signoff)
        db.session.commit()
        return jsonify({"id": new_signoff.id}), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error creating supervisor signoff: {e}")
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/supervisor-signoff", methods=["GET"])
@require_admin
def get_supervisor_signoffs():
    """Get supervisor signoff records, optionally filtered by hospital_id and/or date."""
    try:
        hospital_id = request.args.get("hospital_id")
        date_str = request.args.get("date")
        query = SupervisorSignoff.query
        if hospital_id:
            query = query.filter_by(hospital_id=hospital_id)
        if date_str:
            try:
                date = datetime.strptime(date_str, "%Y-%m-%d").date()
                query = query.filter_by(date=date)
            except Exception:
                return jsonify({"error": "Invalid date format, should be YYYY-MM-DD"}), 400
        signoffs = query.order_by(SupervisorSignoff.date.desc()).all()
        result = []
        for s in signoffs:
            result.append({
                "id": s.id,
                "hospital_id": s.hospital_id,
                "date": s.date.isoformat(),
                "supervisor_name": s.supervisor_name,
                "summary": s.summary,
                "signature_data": s.signature_data,
                "job_ids": s.job_ids,
                "created_at": s.created_at.isoformat() if s.created_at else None
            })
        return jsonify(result), 200
    except Exception as e:
        print(f"Error fetching supervisor signoffs: {e}")
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/hospitals", methods=["GET"])
@require_admin
def get_hospitals():
    """Get all hospitals for dropdown selections."""
    try:
        hospitals = Hospital.query.all()
        result = [
            {
                "id": h.id,
                "name": h.name,
                "active": getattr(h, "active", True)
            }
            for h in hospitals
        ]
        return jsonify(result), 200
    except Exception as e:
        print(f"Error fetching hospitals: {e}")
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/overview", methods=["GET"])
@require_admin
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
@require_admin
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
@require_admin
def create_ahu():
    """Create a new AHU manually with sequential AHU-### ids."""
    try:
        data = request.get_json()
        hospital_id = data.get("hospital_id")
        ahu_name_input = data.get("ahu_name")  # we'll store this in notes
        location = data.get("location")
        notes = data.get("notes")

        if not hospital_id:
            return jsonify({"error": "Missing hospital_id"}), 400

        hospital = Hospital.query.get(hospital_id)
        if not hospital:
            return jsonify({"error": "Hospital not found"}), 404

        # Create AHU record and let the database assign a sequential integer ID
        note_bits = []
        if ahu_name_input:
            note_bits.append(f"Manual label: {ahu_name_input}")
        if notes:
            note_bits.append(str(notes))
        final_notes = " | ".join(note_bits) if note_bits else None

        new_ahu = AHU(
            hospital_id=hospital_id,
            name=ahu_name_input or None,
            location=location,
            notes=final_notes,
        )
        db.session.add(new_ahu)
        db.session.commit()  # commit to get autoincremented id

        # If no explicit name provided, set a human-friendly label using the new numeric id
        if not new_ahu.name:
            new_ahu.name = f"AHU-{new_ahu.id:03d}"
        # Keep excel_order aligned with the numeric id for simple sequencing
        if hasattr(new_ahu, "excel_order") and not new_ahu.excel_order:
            new_ahu.excel_order = int(new_ahu.id)
        db.session.commit()

        # Keep whatever user typed as context
        note_bits = []
        if ahu_name_input:
            note_bits.append(f"Manual label: {ahu_name_input}")
        if notes:
            note_bits.append(str(notes))
        final_notes = " | ".join(note_bits) if note_bits else None


        return jsonify({
            "id": new_ahu.id,
            "hospital_id": new_ahu.hospital_id,
            "name": new_ahu.name,
            "location": new_ahu.location,
            "notes": new_ahu.notes,
            "excel_order": new_ahu.excel_order
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
