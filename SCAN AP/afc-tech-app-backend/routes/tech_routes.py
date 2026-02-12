from flask import Blueprint, request, jsonify
from models import Technician
from db import db

tech_bp = Blueprint("technicians", __name__)


@tech_bp.route("/technicians", methods=["GET"])
def get_all_tech():
    techs= Technician.query.all()
    result=[{
        "id":t.id,
        "name":t.name,
        "active":t.active
    }
    for t in techs
    ]
    return jsonify(result),200

#tech login

@tech_bp.route("/technicians/login",methods=["POST"])
def login_technicians():
    data= request.json
    name = data.get("name")
    pin = data.get("pin")

    tech = Technician.query.filter_by(name=name, pin=pin, active=True).first()

    if not tech:
        return jsonify({"error":"Invalid credentials"}),401
    
    return jsonify({
        "id":tech.id,
        "name":tech.name,
        "active":tech.active,
        "role": getattr(tech, "role", "technician")  # Include role, default to technician for backward compatibility
    }),200


@tech_bp.route("/technicians/<int:tech_id>", methods=["GET"])
def get_technician(tech_id):
    tech = db.session.get(Technician, tech_id)
    if not tech:
        return jsonify({"error":"Technician not found"}),404
    
    return jsonify({
        "id":tech.id,
        "name":tech.name,
        "active":tech.active
    }), 200

