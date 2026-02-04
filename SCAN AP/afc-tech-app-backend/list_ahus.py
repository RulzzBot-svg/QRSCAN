from app import app
from models import AHU

with app.app_context():
    ahus = AHU.query.filter_by(hospital_id=2).order_by(AHU.excel_order if hasattr(AHU, 'excel_order') else AHU.id).all()
    print(f"Found {len(ahus)} AHUs for hospital_id=2:\n")
    for a in ahus:
        print(f"- id={a.id}, name={a.name}, location={getattr(a, 'location', None)}, excel_order={getattr(a, 'excel_order', None)}")
