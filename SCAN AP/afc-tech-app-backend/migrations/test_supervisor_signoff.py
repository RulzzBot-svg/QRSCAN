from app import create_app
from db import db
from models import SupervisorSignoff, Hospital
from datetime import date

app = create_app()

with app.app_context():
    # Ensure there's at least one hospital
    hospital = Hospital.query.first()
    if not hospital:
        hospital = Hospital(name='Test Hospital')
        db.session.add(hospital)
        db.session.commit()

    s = SupervisorSignoff(
        hospital_id=hospital.id,
        date=date.today(),
        supervisor_name='Automated Test',
        summary='Test insertion after migration',
        signature_data='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ',
        job_ids='1,2'
    )
    db.session.add(s)
    db.session.commit()
    print('Inserted supervisor_signoff id=', s.id)

    # Query back
    fetched = SupervisorSignoff.query.filter_by(id=s.id).first()
    if fetched:
        print('Fetched:', fetched.id, fetched.hospital_id, fetched.supervisor_name, fetched.date.isoformat())
    else:
        print('Failed to fetch inserted record')
