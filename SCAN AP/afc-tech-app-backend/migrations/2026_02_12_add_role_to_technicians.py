from app import create_app
from db import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    # Add role column to technicians table
    db.session.execute(text('''
    ALTER TABLE technicians 
    ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'technician' NOT NULL;
    '''))
    
    # Update any existing NULL roles to 'technician'
    db.session.execute(text('''
    UPDATE technicians 
    SET role = 'technician' 
    WHERE role IS NULL;
    '''))
    
    db.session.commit()
    print("Migration applied: role column added to technicians table with default 'technician'.")
