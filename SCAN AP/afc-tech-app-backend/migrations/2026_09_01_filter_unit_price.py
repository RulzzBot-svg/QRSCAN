"""Add filters.unit_price for QuickBooks Rate.

The API also applies this automatically on startup (see app.ensure_schema).
This script is only needed if you want to add the column without redeploying.

From the backend folder:
    PYTHONPATH=. python migrations/2026_09_01_filter_unit_price.py
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from app import create_app
from db import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    try:
        print("Starting migration: filters.unit_price...")
        db.session.execute(text(
            "ALTER TABLE filters ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10, 2);"
        ))
        db.session.commit()
        print("Migration applied: filters.unit_price added.")
    except Exception as e:
        db.session.rollback()
        print(f"Migration failed: {e}")
        raise
