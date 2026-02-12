"""Middleware package for authentication and authorization."""
from .auth import require_admin

__all__ = ["require_admin"]
