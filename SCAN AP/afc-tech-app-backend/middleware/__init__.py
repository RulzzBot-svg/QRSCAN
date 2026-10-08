"""Middleware package for authentication and authorization."""
from .auth import (
    current_hospital_id,
    current_tech_id,
    is_admin,
    require_admin,
    require_auth,
    require_client,
    require_director,
)

__all__ = [
    "require_auth",
    "require_admin",
    "require_client",
    "require_director",
    "current_tech_id",
    "current_hospital_id",
    "is_admin",
]
