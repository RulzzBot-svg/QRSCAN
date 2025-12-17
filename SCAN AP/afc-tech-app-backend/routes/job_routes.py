from flask import Blueprint, request, jsonify
from models import Job, JobFilter, Filter, AHU, Technician
from db import db
from datetime import datetime
from sqlalchemy.orm import joinedload

job_bp = Blueprint("jobs", __name__)


# -----------------------------
# Create a new job (after checklist)
# -----------------------------
@job_bp.route("/jobs", methods=["POST"])
def create_job():
    data = request.json

    ahu_id = data.get("ahu_id")
    tech_id = data.get("tech_id")
    overall_notes = data.get("overall_notes")
    gps_lat = data.get("gps_lat")
    gps_long = data.get("gps_long")
    filter_results = data.get("filters", [])

    # Validate AHU
    ahu = db.session.get(AHU, ahu_id)
    if not ahu:
        return jsonify({"error": "Invalid AHU ID"}), 400

    # Validate technician
    tech = db.session.get(Technician, tech_id)
    if not tech:
        return jsonify({"error": "Invalid technician ID"}), 400
    
    #ahu.last_service_date = datetime.utcnow()

    # Create job record
    job = Job(
        ahu_id=ahu_id,
        tech_id=tech_id,
        overall_notes=overall_notes,
        gps_lat=gps_lat,
        gps_long=gps_long,
        completed_at=datetime.utcnow()
    )
    db.session.add(job)
    db.session.flush()  # get job.id before committing

    # Add JobFilter entries
    for f in filter_results:
        jf = JobFilter(
            job_id=job.id,
            filter_id=f.get("filter_id"),
            is_completed=f.get("is_completed", False),
            note=f.get("note", "")
        )
        db.session.add(jf)

        if jf.is_completed:
            filter_obj = db.session.get(Filter, jf.filter_id)
            if filter_obj:
                filter_obj.last_service_date = datetime.utcnow().date()

    db.session.commit()

    return jsonify({"message": "Job recorded", "job_id": job.id}), 201


# -----------------------------
# Get job details
# -----------------------------
@job_bp.route("/jobs/<int:job_id>", methods=["GET"])
def get_job(job_id):
    job = db.session.get(Job, job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404

    filters = [
        {
            "job_filter_id": jf.id,
            "filter_id": jf.filter_id,
            "phase": jf.filter.phase,
            "part_number": jf.filter.part_number,
            "size": jf.filter.size,
            "is_completed": jf.is_completed,
            "note": jf.note
        }
        for jf in job.job_filters

    ]

    return jsonify({
        "job_id": job.id,
        "ahu_id": job.ahu_id,
        "technician_id": job.tech_id,
        "completed_at": job.completed_at.isoformat(),
        "overall_notes": job.overall_notes,
        "gps_lat": job.gps_lat,
        "gps_long": job.gps_long,
        "filters": filters
    }), 200


# -----------------------------
# Get all jobs
# -----------------------------

@job_bp.route("/admin/jobs", methods=["GET"])
def admin_get_all_jobs():
    jobs = (
        Job.query
        .options(
            joinedload(Job.ahu),
            joinedload(Job.technician),
            joinedload(Job.job_filters).joinedload(JobFilter.filter)
        )
        .order_by(Job.completed_at.desc())
        .all()
    )

    payload = []

    for j in jobs:
        payload.append({
            "id": j.id,
            "ahu_id": j.ahu_id,
            "ahu_name": j.ahu.name if j.ahu else None,
            "technician": j.technician.name if j.technician else None,
            "completed_at": j.completed_at.isoformat(),
            "filters": [
                {
                    "filter_id": jf.filter_id,
                    "phase": jf.filter.phase,
                    "part_number": jf.filter.part_number,
                    "size": jf.filter.size,
                    "is_completed": jf.is_completed,
                    "note": jf.note
                }
                for jf in j.job_filters
            ]
        })

    return jsonify(payload), 200

# -----------------------------
# Get all jobs for a technician
# -----------------------------
@job_bp.route("/technicians/<int:tech_id>/jobs", methods=["GET"])
def get_jobs_for_tech(tech_id):
    jobs = Job.query.filter_by(tech_id=tech_id).all()

    result = [
        {
            "id": j.id,
            "ahu_id": j.ahu_id,
            "completed_at": j.completed_at.isoformat(),
        }
        for j in jobs
    ]

    return jsonify(result), 200
