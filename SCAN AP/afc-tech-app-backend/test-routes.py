from app import create_app
from db import db
from models import Hospital, AHU, Filter


app = create_app()
with app.app_context():
    #h = Hospital(name="Cedars Sinai", city="Los Angeles", address="4650 Lincoln Blvd")
    #db.session.add(h)
    #db.session.commit()
    #print("Hospital added!")

    ahu=AHU(
        id="AHU-126",
        hospital_id=1,
        name="Main Lobby AHU",
        location="Roof",
        frequency_days=90
    )
    db.session.add(ahu)

    f1 = Filter(
        id=3,
        ahu_id="AHU-126",
        phase="PRE",
        part_number="ZLP20242",
        size="20x24x2",
        quantity=12
    )
    db.session.add(f1)
    db.session.commit()
    print(f"Added succesfully {f1.ahu_id}")