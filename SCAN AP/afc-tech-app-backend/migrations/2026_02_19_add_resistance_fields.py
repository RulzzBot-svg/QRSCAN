from app import create_app
from db import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    # Add initial_resistance and final_resistance columns to job_filters table
    db.session.execute(text('''
    ALTER TABLE job_filters 
    ADD COLUMN IF NOT EXISTS initial_resistance FLOAT;
    '''))
    db.session.execute(text('''
    ALTER TABLE job_filters 
    ADD COLUMN IF NOT EXISTS final_resistance FLOAT;
    '''))
    db.session.commit()
    print("Migration applied: initial_resistance and final_resistance columns added to job_filters table.")
