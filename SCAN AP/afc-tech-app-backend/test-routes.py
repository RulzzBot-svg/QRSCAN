from app import create_app
from db import db
from models import Hospital, AHU, Filter

app = create_app()

with app.app_context():
    # 1️⃣ Create hospital
    hospital = Hospital(
        name="Cedars Sinai",
        city="Los Angeles",
        address="4650 Lincoln Blvd"
    )
    db.session.add(hospital)
    db.session.commit()   # <-- MUST commit to get ID

    print(f"Hospital created with id={hospital.id}")

    # 2️⃣ Create AHU using the real hospital.id
    ahu = AHU(
        id="AHU-126",
        hospital_id=hospital.id,   # ✅ SAFE
        name="Main Lobby AHU",
        location="Roof",
        frequency_days=90
    )
    db.session.add(ahu)

    # 3️⃣ Create filter
    f1 = Filter(
        id=3,
        ahu_id=ahu.id,
        phase="PRE",
        part_number="ZLP20242",
        size="20x24x2",
        quantity=12
    )
    db.session.add(f1)

    db.session.commit()
    print(f"Added successfully {ahu.id}")
