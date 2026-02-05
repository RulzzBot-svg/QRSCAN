from flask import Blueprint, jsonify, request
from models import Job, SupervisorSignoff
from db import db
from sqlalchemy.orm import joinedload
from datetime import datetime

signature_bp = Blueprint("signature", __name__)


@signature_bp.route("/schedule/<schedule_id>/summary", methods=["GET"])
def get_schedule_summary(schedule_id):
    """
    Get summary of jobs for a schedule.
    For demo purposes, schedule_id can be used to filter jobs.
    Returns jobs with their details for supervisor review.
    """
    try:
        # For this implementation, we'll fetch recent jobs
        # In a real scenario, schedule_id would map to specific jobs
        jobs = (
            Job.query
            .options(
                joinedload(Job.ahu),
                joinedload(Job.technician),
                joinedload(Job.job_filters).joinedload('filter')
            )
            .order_by(Job.completed_at.desc())
            .limit(10)  # Limit to recent 10 jobs for demo
            .all()
        )

        result = []
        for job in jobs:
            result.append({
                "id": job.id,
                "ahu_id": job.ahu_id,
                "ahu_name": job.ahu.name if job.ahu else "Unknown AHU",
                "technician": job.technician.name if job.technician else "Unknown Tech",
                "completed_at": job.completed_at.isoformat() + "Z",
                "overall_notes": job.overall_notes,
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

        return jsonify({
            "schedule_id": schedule_id,
            "jobs": result
        }), 200

    except Exception as e:
        print(f"Error fetching schedule summary: {e}")
        return jsonify({"error": str(e)}), 500


@signature_bp.route("/supervisor_sign", methods=["POST"])
def supervisor_sign():
    """
    Record a supervisor sign-off for a schedule.
    Expected payload:
    {
        "schedule_id": "sample-schedule-1",
        "supervisor_name": "John Doe",
        "jobs": [1, 2, 3],  # list of job IDs
        "signed_at": "2026-02-05T16:00:00Z",
        "signature_image": "data:image/png;base64,..."
    }
    """
    try:
        data = request.get_json()
        
        schedule_id = data.get("schedule_id")
        supervisor_name = data.get("supervisor_name")
        jobs = data.get("jobs", [])
        signed_at_str = data.get("signed_at")
        signature_image = data.get("signature_image")

        if not all([schedule_id, supervisor_name, signature_image]):
            return jsonify({"error": "Missing required fields"}), 400

        # Parse signed_at
        try:
            if signed_at_str:
                signed_at = datetime.fromisoformat(signed_at_str.replace('Z', '+00:00'))
            else:
                signed_at = datetime.utcnow()
        except Exception:
            signed_at = datetime.utcnow()

        # Convert jobs list to comma-separated string
        job_ids_str = ",".join(str(j) for j in jobs) if jobs else ""

        # For this implementation, we'll use hospital_id = 1 as default
        # In a real scenario, schedule_id would be linked to a specific hospital
        new_signoff = SupervisorSignoff(
            hospital_id=1,  # Default hospital for demo
            date=signed_at.date(),
            supervisor_name=supervisor_name,
            summary=f"Supervisor sign-off for schedule {schedule_id}",
            signature_data=signature_image,
            job_ids=job_ids_str
        )
        
        db.session.add(new_signoff)
        db.session.commit()

        return jsonify({
            "id": new_signoff.id,
            "message": "Supervisor signature recorded successfully"
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error recording supervisor signature: {e}")
        return jsonify({"error": str(e)}), 500
