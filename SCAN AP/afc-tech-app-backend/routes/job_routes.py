from flask import Blueprint, request, jsonify, g
from models import Job, JobFilter, Filter, AHU, Technician
from models import JobSignature, Notification
from db import db
from datetime import datetime, timezone
from dateutil.parser import isoparse
from sqlalchemy.orm import joinedload
from middleware.auth import require_admin, require_auth, is_admin
from utility.http import internal_error, validate_signature_payload

job_bp = Blueprint("jobs", __name__)


def _job_query_with_relations():
    return (
        Job.query
        .options(
            joinedload(Job.ahu).joinedload(AHU.hospital),
            joinedload(Job.ahu).joinedload(AHU.building),
            joinedload(Job.technician),
            joinedload(Job.job_filters).joinedload(JobFilter.filter),
        )
    )


def _serialize_job_summary(j):
    return {
        "id": j.id,
        "ahu_id": j.ahu_id,
        "ahu_name": j.ahu.name if j.ahu else None,
        "building_id": j.ahu.building.id if j.ahu and j.ahu.building else None,
        "building_name": j.ahu.building.name if j.ahu and j.ahu.building else None,
        "hospital_id": j.ahu.hospital.id if j.ahu and j.ahu.hospital else None,
        "hospital_name": j.ahu.hospital.name if j.ahu and j.ahu.hospital else None,
        "technician": j.technician.name if j.technician else None,
        "completed_at": j.completed_at.isoformat(),
        "filters": [
            {
                "filter_id": jf.filter_id,
                "phase": jf.filter.phase,
                "part_number": jf.filter.part_number,
                "size": jf.filter.size,
                "is_completed": jf.is_completed,
                "note": jf.note,
                "initial_resistance": jf.initial_resistance,
                "final_resistance": jf.final_resistance,
            }
            for jf in j.job_filters
        ],
    }


@job_bp.route("/jobs", methods=["POST"])
@require_auth
def create_job():
    try:
        data = request.json or {}

        ahu_id_raw = data.get("ahu_id")
        if ahu_id_raw is None:
            return jsonify({"error": "Missing AHU ID"}), 400

        try:
            ahu_id = int(ahu_id_raw)
        except Exception:
            ahu_obj = AHU.query.filter_by(name=str(ahu_id_raw)).first()
            if not ahu_obj:
                return jsonify({"error": "Invalid AHU ID"}), 400
            ahu_id = ahu_obj.id

        tech_id = g.current_tech_id
        overall_notes = data.get("overall_notes")
        gps_lat = data.get("gps_lat")
        gps_long = data.get("gps_long")
        filter_results = data.get("filters", [])

        ahu = db.session.get(AHU, ahu_id)
        if not ahu:
            return jsonify({"error": "Invalid AHU ID"}), 400

        incoming_completed = data.get("completed_at")
        if incoming_completed:
            try:
                dt = isoparse(incoming_completed)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                completed_at_val = dt.astimezone(timezone.utc).replace(tzinfo=None)
            except Exception:
                completed_at_val = datetime.utcnow()
        else:
            completed_at_val = datetime.utcnow()

        job = Job(
            ahu_id=ahu_id,
            tech_id=tech_id,
            overall_notes=overall_notes,
            gps_lat=gps_lat,
            gps_long=gps_long,
            completed_at=completed_at_val,
        )
        db.session.add(job)
        db.session.flush()

        for f in filter_results:
            filter_id = f.get("filter_id")
            filter_obj = db.session.get(Filter, filter_id)
            if not filter_obj:
                return jsonify({"error": f"Invalid filter ID: {filter_id}"}), 400

            jf = JobFilter(
                job_id=job.id,
                filter_id=filter_id,
                is_completed=f.get("is_completed", False),
                is_inspected=f.get("is_inspected", False),
                note=f.get("note", ""),
                initial_resistance=f.get("initial_resistance"),
                final_resistance=f.get("final_resistance"),
            )
            db.session.add(jf)

            if jf.is_completed or jf.is_inspected:
                filter_obj.last_service_date = completed_at_val.date()

            if jf.note and str(jf.note).strip():
                db.session.add(
                    Notification(
                        hospital_id=ahu.hospital_id,
                        ahu_id=ahu.id,
                        job_id=job.id,
                        technician_id=tech_id,
                        comment_text=str(jf.note).strip(),
                        status="pending",
                    )
                )

        if job.overall_notes and str(job.overall_notes).strip():
            db.session.add(
                Notification(
                    hospital_id=ahu.hospital_id,
                    ahu_id=ahu.id,
                    job_id=job.id,
                    technician_id=tech_id,
                    comment_text=str(job.overall_notes).strip(),
                    status="pending",
                )
            )

        db.session.commit()
        return jsonify({"message": "Job recorded", "job_id": job.id}), 201
    except Exception as e:
        db.session.rollback()
        return internal_error(e)


@job_bp.route("/jobs/<int:job_id>", methods=["GET"])
@require_auth
def get_job(job_id):
    job = db.session.get(Job, job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404

    if not is_admin() and job.tech_id != g.current_tech_id:
        return jsonify({"error": "Forbidden"}), 403

    filters = [
        {
            "job_filter_id": jf.id,
            "filter_id": jf.filter_id,
            "phase": jf.filter.phase,
            "part_number": jf.filter.part_number,
            "size": jf.filter.size,
            "is_completed": jf.is_completed,
            "note": jf.note,
            "initial_resistance": jf.initial_resistance,
            "final_resistance": jf.final_resistance,
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
        "filters": filters,
    }), 200


@job_bp.route("/jobs", methods=["GET"])
@require_auth
def get_all_jobs():
    q = _job_query_with_relations()
    if not is_admin():
        q = q.filter(Job.tech_id == g.current_tech_id)

    jobs = q.order_by(Job.completed_at.desc()).all()
    return jsonify([_serialize_job_summary(j) for j in jobs]), 200


@job_bp.route("/admin/jobs", methods=["GET"])
@require_admin
def admin_get_all_jobs():
    ahu_id = request.args.get("ahu_id")
    q = _job_query_with_relations()
    if ahu_id:
        try:
            q = q.filter_by(ahu_id=int(ahu_id))
        except Exception:
            pass

    jobs = q.order_by(Job.completed_at.desc()).all()
    return jsonify([_serialize_job_summary(j) for j in jobs]), 200


@job_bp.route("/technicians/<int:tech_id>/jobs", methods=["GET"])
@require_auth
def get_jobs_for_tech(tech_id):
    if not is_admin() and g.current_tech_id != tech_id:
        return jsonify({"error": "Forbidden"}), 403

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


@job_bp.route("/jobs/<int:job_id>/signature", methods=["POST"])
@require_auth
def save_job_signature(job_id):
    data = request.json or {}

    signature_data = data.get("signature_data")
    signer_name = data.get("signer_name")
    signer_role = data.get("signer_role")

    sig_err = validate_signature_payload(signature_data)
    if sig_err:
        return jsonify({"error": sig_err}), 400
    if not signature_data:
        return jsonify({"error": "Signature required"}), 400

    job = db.session.get(Job, job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404

    if not is_admin() and job.tech_id != g.current_tech_id:
        return jsonify({"error": "Forbidden"}), 403

    if job.signature:
        return jsonify({"error": "Job already signed"}), 409

    signature = JobSignature(
        job_id=job.id,
        signer_name=signer_name,
        signer_role=signer_role,
        signature_data=signature_data,
    )

    db.session.add(signature)
    db.session.commit()

    return jsonify({"message": "Signature saved"}), 201
