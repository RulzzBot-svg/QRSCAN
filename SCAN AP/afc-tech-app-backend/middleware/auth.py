"""
Authentication and authorization middleware for Flask routes.

All protected routes require a valid Bearer JWT issued at login.
Admin routes additionally require role == 'admin' in the token and database.
"""
from functools import wraps

import jwt
from flask import g, jsonify, request

from db import db
from middleware.jwt_utils import decode_access_token
from models import Technician


def _bearer_token():
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:].strip()
    return None


def _authenticate_request():
    token = _bearer_token()
    if not token:
        return jsonify({"error": "Authentication required"}), 401

    try:
        payload = decode_access_token(token)
        tech_id = int(payload["sub"])
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token expired"}), 401
    except (jwt.InvalidTokenError, ValueError, TypeError, KeyError):
        return jsonify({"error": "Invalid token"}), 401

    try:
        tech = db.session.get(Technician, tech_id)
        if not tech or not tech.active:
            return jsonify({"error": "Invalid or inactive account"}), 401

        g.current_tech = tech
        g.current_tech_id = tech.id
        g.current_tech_role = getattr(tech, "role", "technician")
    except Exception:
        return jsonify({"error": "Authentication failed"}), 401

    return None


def require_auth(f):
    """Require a valid JWT for any authenticated technician."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        err = _authenticate_request()
        if err is not None:
            return err
        return f(*args, **kwargs)

    return decorated_function


def require_admin(f):
    """Require JWT + admin role (verified against database, not token alone)."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        err = _authenticate_request()
        if err is not None:
            return err
        if g.current_tech_role != "admin":
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)

    return decorated_function


def current_tech_id():
    return getattr(g, "current_tech_id", None)


def is_admin():
    return getattr(g, "current_tech_role", "") == "admin"
