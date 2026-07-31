"""Add hospital contract / changeout settings columns."""
from app import create_app
from db import db
from sqlalchemy import text

app = create_app()

COLUMNS = [
    ("estimate_number", "VARCHAR(50)"),
    ("po_number", "VARCHAR(100)"),
    ("pricing_notes", "TEXT"),
    ("changeout_interval_days", "INTEGER DEFAULT 90"),
    ("changeouts_per_year", "INTEGER DEFAULT 4"),
    ("changeouts_completed", "INTEGER DEFAULT 0"),
    ("contract_year_start", "DATE"),
    ("contract_year_end", "DATE"),
    ("contract_notes", "TEXT"),
]

with app.app_context():
    try:
        print("Starting migration: hospital contract settings...")
        for name, col_type in COLUMNS:
            db.session.execute(text(
                f"ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS {name} {col_type};"
            ))
        db.session.commit()
        print("Migration applied: hospital contract settings columns added.")
    except Exception as e:
        db.session.rollback()
        print(f"Migration failed: {e}")
        raise
