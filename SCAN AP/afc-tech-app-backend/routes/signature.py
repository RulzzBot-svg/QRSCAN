from flask import Blueprint, jsonify
from models import Job
from db import db
from sqlalchemy.orm import joinedload
from middleware.auth import require_admin
from utility.http import internal_error

signature_bp = Blueprint("signature", __name__)


@signature_bp.route("/schedule/<schedule_id>/summary", methods=["GET"])
@require_admin
def get_schedule_summary(schedule_id):
    """Admin-only: summary of recent jobs for supervisor review."""
    try:
        jobs = (
            Job.query
            .options(
                joinedload(Job.ahu),
                joinedload(Job.technician),
                joinedload(Job.job_filters).joinedload("filter"),
            )
            .order_by(Job.completed_at.desc())
            .limit(10)
            .all()
        )

        result = []
        for job in jobs:
            result.append({
                "id": job.id,
                "ahu_id": job.ahu_id,
                "hospital_id": job.ahu.hospital_id if job.ahu else None,
                "ahuName": job.ahu.name if job.ahu else "Unknown AHU",
                "technician": job.technician.name if job.technician else "Unknown Tech",
                "completed_at": job.completed_at.isoformat() + "Z",
                "overall_notes": job.overall_notes,
                "status": "Completed",
                "filter": ", ".join(
                    f"{jf.filter.phase or ''} {jf.filter.part_number or ''}".strip()
                    for jf in job.job_filters
                    if jf.filter
                ) or "—",
                "notes": job.overall_notes,
                "filters": [
                    {
                        "phase": jf.filter.phase,
                        "part_number": jf.filter.part_number,
                        "size": jf.filter.size,
                        "is_completed": jf.is_completed,
                        "is_inspected": jf.is_inspected,
                        "note": jf.note,
                    }
                    for jf in job.job_filters
                ],
            })

        return jsonify({
            "schedule_id": schedule_id,
            "jobs": result,
        }), 200

    except Exception as e:
        return internal_error(e)


@signature_bp.route("/supervisor_sign", methods=["POST"])
def supervisor_sign_removed():
    """Legacy endpoint removed — use POST /api/admin/supervisor-signoff instead."""
    return jsonify({
        "error": "This endpoint has been removed. Use POST /api/admin/supervisor-signoff with authentication.",
    }), 410
