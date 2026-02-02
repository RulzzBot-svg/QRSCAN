from flask import Blueprint, jsonify
from models import Hospital, AHU, Job, Technician
from db import db
from sqlalchemy.orm import joinedload

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
            "completed_at": job.completed_at.isoformat(),
            "overall_notes": job.overall_notes,
            "gps_lat": job.gps_lat,
            "gps_long": job.gps_long,
            "filters": [
                {
                    "phase": jf.filter.phase,
                    "part_number": jf.filter.part_number,
                    "size": jf.filter.size,
                    "is_completed": jf.is_completed,
                    "note": jf.note
                }
                for jf in job.job_filters
            ]
        })

    return jsonify(result), 200
