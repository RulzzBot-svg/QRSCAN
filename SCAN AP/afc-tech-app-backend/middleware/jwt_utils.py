"""JWT creation and validation."""
from datetime import datetime, timedelta, timezone

import jwt
from flask import current_app


def create_access_token(tech_id: int, role: str) -> str:
    secret = current_app.config["JWT_SECRET"]
    hours = int(current_app.config.get("JWT_EXPIRY_HOURS", 12))
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(tech_id),
        "role": role,
        "iat": now,
        "exp": now + timedelta(hours=hours),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def token_string(token) -> str:
    """PyJWT may return str or bytes depending on version."""
    if isinstance(token, bytes):
        return token.decode("utf-8")
    return str(token)


def decode_access_token(token: str) -> dict:
    secret = current_app.config["JWT_SECRET"]
    return jwt.decode(token, secret, algorithms=["HS256"])
