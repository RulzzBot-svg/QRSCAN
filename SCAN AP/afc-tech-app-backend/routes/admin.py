from flask import Blueprint, jsonify, request
from models import Hospital, AHU, Job, Technician
from models import SupervisorSignoff
from db import db
from sqlalchemy.orm import joinedload
import re
from datetime import datetime

admin_bp = Blueprint("admin", __name__)

@admin_bp.route("/supervisor-signoff", methods=["POST"])
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


@admin_bp.route("/schedule/<schedule_id>", methods=["GET"])
def get_schedule(schedule_id):
    """
    Get schedule summary for a given schedule_id.
    schedule_id can be a hospital_id or a composite identifier.
    Query params: start_date, end_date for filtering jobs.
    """
    try:
        # Get optional date range from query params
        start_date_str = request.args.get("start_date")
        end_date_str = request.args.get("end_date")
        
        # Try to interpret schedule_id as hospital_id (integer)
        try:
            hospital_id = int(schedule_id)
        except ValueError:
            return jsonify({"error": "Invalid schedule_id format"}), 400
        
        # Verify hospital exists
        hospital = Hospital.query.get(hospital_id)
        if not hospital:
            return jsonify({"error": "Hospital not found"}), 404
        
        # Build query for jobs at this hospital
        query = db.session.query(Job).join(AHU).filter(AHU.hospital_id == hospital_id)
        
        # Apply date filters if provided
        if start_date_str:
            try:
                start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
                query = query.filter(Job.completed_at >= start_date)
            except ValueError:
                return jsonify({"error": "Invalid start_date format, should be YYYY-MM-DD"}), 400
        
        if end_date_str:
            try:
                end_date = datetime.strptime(end_date_str, "%Y-%m-%d")
                # Set to end of day
                end_date = end_date.replace(hour=23, minute=59, second=59)
                query = query.filter(Job.completed_at <= end_date)
            except ValueError:
                return jsonify({"error": "Invalid end_date format, should be YYYY-MM-DD"}), 400
        
        # Load jobs with related data
        jobs = query.options(
            joinedload(Job.technician),
            joinedload(Job.ahu),
            joinedload(Job.job_filters)
        ).order_by(Job.completed_at.desc()).all()
        
        # Build response
        job_list = []
        for job in jobs:
            job_list.append({
                "id": job.id,
                "ahu_id": job.ahu_id,
                "ahu_name": job.ahu.name if job.ahu else "Unknown",
                "ahu_location": job.ahu.location if job.ahu else None,
                "technician": job.technician.name if job.technician else "Unknown",
                "technician_id": job.tech_id,
                "completed_at": job.completed_at.isoformat() + "Z",
                "overall_notes": job.overall_notes,
                "filter_count": len(job.job_filters),
                "completed_filters": sum(1 for jf in job.job_filters if jf.is_completed)
            })
        
        # Get AHU count for this hospital
        ahu_count = AHU.query.filter_by(hospital_id=hospital_id).count()
        
        return jsonify({
            "schedule_id": schedule_id,
            "hospital": {
                "id": hospital.id,
                "name": hospital.name,
                "address": hospital.address,
                "city": hospital.city
            },
            "ahu_count": ahu_count,
            "job_count": len(jobs),
            "jobs": job_list,
            "summary": {
                "total_jobs": len(jobs),
                "unique_ahus": len(set(j.ahu_id for j in jobs)),
                "technicians": list(set(j.technician.name for j in jobs if j.technician))
            }
        }), 200
        
    except Exception as e:
        print(f"Error fetching schedule: {e}")
        return jsonify({"error": str(e)}), 500


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
