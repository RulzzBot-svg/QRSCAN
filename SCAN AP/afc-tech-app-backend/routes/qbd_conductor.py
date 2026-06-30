from flask import Blueprint, request, jsonify
import time

from middleware.auth import require_admin

qbd_bp = Blueprint("qbd", __name__)


@qbd_bp.route("/sales_order", methods=["GET"])
@require_admin
def mock_get_sales_order():
    ref = request.args.get("ref")
    if not ref:
        return jsonify({"error": "ref parameter required"}), 400

    so = {
        "id": f"mock-so-{ref}",
        "ref_number": ref,
        "customer_id": "mock-cust-123",
        "customer_name": "Mock Customer Co.",
        "lines": [
            {
                "id": "line-1",
                "item_name": "Pre-Filter 20x20",
                "quantity": 12,
                "balance_remaining": 12,
            },
            {
                "id": "line-2",
                "item_name": "MERV 8 Filter 16x20",
                "quantity": 24,
                "balance_remaining": 24,
            },
            {
                "id": "line-3",
                "item_name": "HEPA Filter",
                "quantity": 6,
                "balance_remaining": 6,
            },
        ],
    }

    time.sleep(0.15)
    return jsonify({"data": so})


@qbd_bp.route("/create_invoice", methods=["POST"])
@require_admin
def mock_create_invoice():
    payload = request.get_json() or {}
    if not payload:
        return jsonify({"error": "JSON body required"}), 400

    if not payload.get("sales_order_id") or not payload.get("lines"):
        return jsonify({"error": "sales_order_id and lines required"}), 400

    invoice_id = f"mock-inv-{int(time.time())}"
    ref_number = f"INV-{invoice_id[-6:]}"

    return jsonify({
        "data": {
            "id": invoice_id,
            "ref_number": ref_number,
            "status": "created",
            "created_at": time.time(),
        }
    }), 201
