from app import create_app
from db import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    db.session.execute(text('''
    CREATE TABLE IF NOT EXISTS supervisor_signoffs (
        id SERIAL PRIMARY KEY,
        hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
        date DATE NOT NULL,
        supervisor_name VARCHAR(150) NOT NULL,
        summary TEXT,
        signature_data TEXT NOT NULL,
        job_ids TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    '''))
    db.session.commit()
    print("Migration applied: supervisor_signoffs table created.")
