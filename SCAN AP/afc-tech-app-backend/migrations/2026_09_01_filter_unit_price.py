"""Add filters.unit_price for QuickBooks Rate (admin-only; hidden from tech views).

Run against the production database:
    python migrations/2026_09_01_filter_unit_price.py
"""
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
