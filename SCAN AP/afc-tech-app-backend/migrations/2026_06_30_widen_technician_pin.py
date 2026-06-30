"""Widen technicians.pin to store bcrypt hashes (~60 chars)."""
from app import create_app
from db import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    try:
        print("Starting migration: widen technicians.pin column...")
        db.session.execute(text("""
            ALTER TABLE technicians
            ALTER COLUMN pin TYPE VARCHAR(128);
        """))
        db.session.commit()
        print("Migration applied: technicians.pin is now VARCHAR(128).")
    except Exception as e:
        db.session.rollback()
        print(f"Migration failed: {e}")
        raise
