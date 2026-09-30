"""Create hospital client portal logins."""
from app import create_app
from db import db
from sqlalchemy import text

app = create_app()

SQL = [
    """
    CREATE TABLE IF NOT EXISTS client_users (
        id SERIAL PRIMARY KEY,
        hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        username VARCHAR(80) NOT NULL UNIQUE,
        pin VARCHAR(128) NOT NULL,
        active BOOLEAN DEFAULT TRUE
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_client_users_hospital_id ON client_users (hospital_id)",
]

with app.app_context():
    try:
        print("Starting migration: client_users...")
        for stmt in SQL:
            db.session.execute(text(stmt))
        db.session.commit()
        print("Migration applied: client_users")
    except Exception as e:
        db.session.rollback()
        print(f"Migration failed: {e}")
        raise
