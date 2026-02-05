from flask import Blueprint, jsonify, request
from models import Job, AHU, Hospital, Filter, JobFilter
from db import db
from sqlalchemy.orm import joinedload
from datetime import datetime, timedelta

schedule_bp = Blueprint("schedule", __name__)


@schedule_bp.route("/schedule/<int:schedule_id>", methods=["GET"])
def get_schedule_summary(schedule_id):
    """
    Get schedule summary for a given schedule_id.
    
    Schedule ID format interpretation:
    - Can represent a hospital_id combined with a date range
    - For simplicity, we'll use schedule_id as hospital_id for now
    - Query params can specify date range
    
    Query params:
    - start_date: YYYY-MM-DD (optional, defaults to 30 days ago)
    - end_date: YYYY-MM-DD (optional, defaults to today)
    """
    try:
        # Use schedule_id as hospital_id for this implementation
        hospital_id = schedule_id
        
        # Get date range from query params
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        
        # Default to last 30 days if not specified
        if not end_date_str:
            end_date = datetime.now().date()
        else:
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
            
        if not start_date_str:
            start_date = end_date - timedelta(days=30)
        else:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        
        # Get hospital info
        hospital = db.session.get(Hospital, hospital_id)
        if not hospital:
            return jsonify({"error": "Hospital/Schedule not found"}), 404
        
        # Get all AHUs for this hospital
        ahus = AHU.query.filter_by(hospital_id=hospital_id).all()
        ahu_ids = [ahu.id for ahu in ahus]
        
        # Get all jobs for these AHUs within the date range
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())
        
        jobs = (
            Job.query
            .filter(Job.ahu_id.in_(ahu_ids))
            .filter(Job.completed_at >= start_datetime)
            .filter(Job.completed_at <= end_datetime)
            .options(
                joinedload(Job.ahu),
                joinedload(Job.technician),
                joinedload(Job.job_filters).joinedload(JobFilter.filter)
            )
            .order_by(Job.completed_at.desc())
            .all()
        )
        
        # Build summary
        job_list = []
        unique_ahus = set()
        total_filters_serviced = 0
        
        for job in jobs:
            unique_ahus.add(job.ahu_id)
            
            filters_data = []
            for jf in job.job_filters:
                if jf.is_completed:
                    total_filters_serviced += 1
                    
                filters_data.append({
                    "filter_id": jf.filter_id,
                    "phase": jf.filter.phase,
                    "part_number": jf.filter.part_number,
                    "size": jf.filter.size,
                    "is_completed": jf.is_completed,
                    "is_inspected": jf.is_inspected,
                    "note": jf.note
                })
            
            job_list.append({
                "job_id": job.id,
                "ahu_id": job.ahu_id,
                "ahu_name": job.ahu.name if job.ahu else None,
                "ahu_location": job.ahu.location if job.ahu else None,
                "technician": job.technician.name if job.technician else None,
                "completed_at": job.completed_at.isoformat(),
                "overall_notes": job.overall_notes,
                "filters": filters_data
            })
        
        summary = {
            "schedule_id": schedule_id,
            "hospital_id": hospital_id,
            "hospital_name": hospital.name,
            "hospital_address": hospital.address,
            "hospital_city": hospital.city,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "total_jobs": len(jobs),
            "unique_ahus_serviced": len(unique_ahus),
            "total_filters_serviced": total_filters_serviced,
            "jobs": job_list
        }
        
        return jsonify(summary), 200
        
    except ValueError as e:
        return jsonify({"error": f"Invalid date format: {str(e)}"}), 400
    except Exception as e:
        print(f"Error fetching schedule summary: {e}")
        return jsonify({"error": str(e)}), 500
