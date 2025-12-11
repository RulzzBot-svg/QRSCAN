from flask import Blueprint, jsonify
from models import Hospital, AHU
from db import db


hospital_bp = Blueprint("hospital", __name__)

#Get all hospitals

@hospital_bp.route("/hospital/all", methods=["GET"])
def get_all_hospitals():
    hospitals= Hospital.query.all()
    result=[{
        "id":h.id,
        "name":h.name,
        "city":h.city,
        "active":h.active
    }
        for h in hospitals
    ]
    return jsonify(result)
    

#get all AHU for a hospital

@hospital_bp.route("/hospital/<int:hospital_id>/ahus", methods=["GET"])
def get_ahus_for_hospitals(hospital_id):
    ahus = AHU.query.filter_by(hospital_id=hospital_id).all()

    result=[
        {
            "id":a.id,
            "name":a.name,
            "location":a.location,
            "frequency_days":a.frequency_days,
            "last_service_date":str(a.last_service_date) if a.last_service_date else None
        }
        for a in ahus
    ]

    return jsonify(result)