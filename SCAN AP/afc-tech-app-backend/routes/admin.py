from flask import Blueprint, jsonify
from models import Hospital, AHU
from db import db
from utility.status import compute_ahu_status

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

    for hospital in hospitals:
        for ahu in hospital.ahus:
            total_ahus += 1
            status = compute_ahu_status(ahu)["status"]

            if status == "Overdue":
                overdue += 1
            elif status == "Due Soon":
                due_soon += 1
            elif status == "Completed":
                completed += 1
            elif status == "Pending":
                pending += 1

    return jsonify({
        "hospitals": total_hospitals,
        "total_ahus": total_ahus,
        "overdue": overdue,
        "due_soon": due_soon,
        "completed": completed,
        "pending": pending
    }), 200
