from flask import Blueprint, request, jsonify, current_app
import time

qbd_bp = Blueprint("qbd", __name__)


@qbd_bp.route("/sales_order", methods=["GET"])
def mock_get_sales_order():
    """Mocked sales order fetch for QuickBooks Pull Assistant.
    Query param: ref (sales order / PO number)
    Returns a fake sales order payload similar to what Conductor would return.
    """
    ref = request.args.get("ref")
    if not ref:
        return jsonify({"error": "ref parameter required"}), 400

    # Fake data - in "mock" mode we return deterministic data for demo
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

    # Simulate small processing delay so UI shows loading state
    time.sleep(0.15)
    return jsonify({"data": so})


@qbd_bp.route("/create_invoice", methods=["POST"])
def mock_create_invoice():
    """Mocked invoice creation endpoint. Echoes payload and returns fake invoice id.
    This endpoint performs minimal validation for demo purposes.
    """
    payload = request.get_json() or {}
    if not payload:
        return jsonify({"error": "JSON body required"}), 400

    # Minimal validation
    if not payload.get("sales_order_id") or not payload.get("lines"):
        return jsonify({"error": "sales_order_id and lines required"}), 400

    # Create fake invoice ref
    invoice_id = f"mock-inv-{int(time.time())}"
    ref_number = f"INV-{invoice_id[-6:]}"

    # Return a structure compatible with frontend expectations
    return jsonify({
        "data": {
            "id": invoice_id,
            "ref_number": ref_number,
            "status": "created",
            "created_at": time.time(),
            "payload_received": payload,
        }
    }), 201
