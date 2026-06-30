"""HTTP response helpers."""
import logging

from flask import jsonify

logger = logging.getLogger(__name__)

MAX_SIGNATURE_BYTES = 500_000


def internal_error(exc=None):
    if exc is not None:
        logger.exception("Internal server error")
    return jsonify({"error": "Internal server error"}), 500


def validate_signature_payload(value, field_name="signature_data"):
    if value is None:
        return None
    if not isinstance(value, str):
        return f"{field_name} must be a string"
    if len(value) > MAX_SIGNATURE_BYTES:
        return f"{field_name} exceeds maximum allowed size"
    return None
