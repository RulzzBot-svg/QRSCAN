from flask import Blueprint, jsonify
from models import Hospital, AHU
from db import db

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
