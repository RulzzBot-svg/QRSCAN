"""
Authentication and authorization middleware for Flask routes.

All protected routes require a valid Bearer JWT issued at login.
Admin routes additionally require role == 'admin' in the token and database.
Hospital client tokens (typ=client) cannot use technician or admin routes.
"""
from functools import wraps

import jwt
from flask import g, jsonify, request

from db import db
from middleware.jwt_utils import decode_access_token
from models import ClientUser, Technician


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
        if str(payload.get("typ") or "tech") == "client":
            return jsonify({"error": "Authentication required"}), 401
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


def _authenticate_client():
    token = _bearer_token()
    if not token:
        return jsonify({"error": "Authentication required"}), 401

    try:
        payload = decode_access_token(token)
        if str(payload.get("typ") or "tech") != "client":
            return jsonify({"error": "Client access required"}), 403
        client_id = int(payload["sub"])
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token expired"}), 401
    except (jwt.InvalidTokenError, ValueError, TypeError, KeyError):
        return jsonify({"error": "Invalid token"}), 401

    try:
        client = db.session.get(ClientUser, client_id)
        if not client or not client.active:
            return jsonify({"error": "Invalid or inactive account"}), 401
        g.current_client = client
        g.current_client_id = client.id
        g.current_hospital_id = client.hospital_id
        role = str(getattr(client, "role", None) or "director").strip().lower()
        g.current_client_role = "tech" if role in ("tech", "technician", "staff") else "director"
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


def require_client(f):
    """Require a hospital-portal JWT. Cannot be used with technician tokens."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        err = _authenticate_client()
        if err is not None:
            return err
        return f(*args, **kwargs)

    return decorated_function


def require_director(f):
    """Hospital director only. Hospital-tech logins cannot use graphs, contact, or exports."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        err = _authenticate_client()
        if err is not None:
            return err
        if getattr(g, "current_client_role", "director") != "director":
            return jsonify({"error": "Director access required"}), 403
        return f(*args, **kwargs)

    return decorated_function


def current_tech_id():
    return getattr(g, "current_tech_id", None)


def current_hospital_id():
    return getattr(g, "current_hospital_id", None)


def is_admin():
    return getattr(g, "current_tech_role", "") == "admin"
