from flask import Blueprint, jsonify, request, abort
import json, os
from datetime import datetime

bp = Blueprint('signature', __name__)

BASE_DIR = os.path.join(os.path.dirname(__file__), 'data')
os.makedirs(BASE_DIR, exist_ok=True)
SCHEDULES_FILE = os.path.join(BASE_DIR, 'schedules.json')
SIGNED_FILE = os.path.join(BASE_DIR, 'signed_records.json')

def load_json(path, default):
    if os.path.exists(path):
        with open(path, 'r') as f:
            return json.load(f)
    return default

def save_json(path, data):
    with open(path, 'w') as f:
        json.dump(data, f, indent=2, default=str)

@bp.route('/api/schedule/<schedule_id>/summary', methods=['GET'])
def schedule_summary(schedule_id):
    schedules = load_json(SCHEDULES_FILE, {})
    if schedule_id not in schedules:
        example_jobs = [
            {"id": "j1", "ahuName": "AHU-1 (Main)", "status": "completed", "filter": "Replaced", "notes": "Good airflow"},
            {"id": "j2", "ahuName": "AHU-2 (ER)", "status": "completed", "filter": "Cleaned", "notes": "No issues"},
            {"id": "j3", "ahuName": "AHU-3 (ICU)", "status": "completed", "filter": "Replaced", "notes": ""}
        ]
        return jsonify({"jobs": example_jobs})
    return jsonify({"jobs": schedules[schedule_id].get('jobs', [])})

@bp.route('/api/supervisor_sign', methods=['POST'])
def supervisor_sign():
    body = request.get_json() or {}
    required = ['schedule_id', 'supervisor_name', 'jobs', 'signed_at']
    if not all(k in body for k in required):
        abort(400, 'Missing required fields')

    signature_image = body.get('signature_image')

    records = load_json(SIGNED_FILE, [])
    record = {
        "id": f"sign_{len(records)+1}",
        "schedule_id": body['schedule_id'],
        "supervisor_name": body['supervisor_name'],
        "jobs": body['jobs'],
        "signed_at": body['signed_at'],
        "signature_image": True if signature_image else False,
        "recorded_at": datetime.utcnow().isoformat()
    }
    records.append(record)
    save_json(SIGNED_FILE, records)

    schedules = load_json(SCHEDULES_FILE, {})
    if body['schedule_id'] in schedules:
        schedules[body['schedule_id']]['signed'] = record
        save_json(SCHEDULES_FILE, schedules)

    return jsonify({"ok": True, "record": record})
