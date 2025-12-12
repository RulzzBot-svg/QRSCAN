from db import db
from app import create_app
from models import Hospital, AHU, Filter, Technician


app=create_app()


def seed_data():

    with app.app_context():

        # -------------------------
        # HOSPITALS
        # -------------------------
        h1 = Hospital(name="Cedars-Sinai Marina del Rey", city="Marina del Rey", active=True)
        h2 = Hospital(name="St. Francis Medical Center", city="Lynwood", active=True)
        h3 = Hospital(name="California Hospital Medical Center", city="Los Angeles", active=True)

        db.session.add_all([h1, h2, h3])
        db.session.flush()  # get generated IDs


        # -------------------------
        # AHUs (REALISTIC NAMES)
        # -------------------------
        ahus = [
            AHU(
                id="AHU-127",
                hospital_id=h1.id,
                name="Surgery Wing AHU 127",
                location="2nd Floor Mechanical Room",
                frequency_days=60,
                last_service_date=None,
                notes="Critical OR supply."
            ),
            AHU(
                id="AHU-210",
                hospital_id=h1.id,
                name="Main Lobby AHU 210",
                location="Lobby East Air Handler",
                frequency_days=90,
                last_service_date=None,
                notes=""
            ),
            AHU(
                id="AHU-3A",
                hospital_id=h2.id,
                name="ICU Block AHU 3A",
                location="3rd Floor ICU",
                frequency_days=30,
                last_service_date=None
            ),
            AHU(
                id="AHU-4B",
                hospital_id=h3.id,
                name="Radiology AHU 4B",
                location="Basement Radiology Wing",
                frequency_days=60,
                last_service_date=None
            )
        ]

        db.session.add_all(ahus)
        db.session.flush()


        # -------------------------
        # FILTERS FOR EACH AHU
        # -------------------------
        filters = [
            # AHU-126
            Filter(ahu_id="AHU-127", phase="Pre", part_number="20x24x2-M13", size="20x24x2", quantity=12),
            Filter(ahu_id="AHU-127", phase="Final", part_number="HVP-2424-12", size="24x24x12", quantity=4),

            # AHU-210
            Filter(ahu_id="AHU-210", phase="Pre", part_number="PLEAT-2020", size="20x20x2", quantity=8),
            Filter(ahu_id="AHU-210", phase="Carbon", part_number="CRB-2020", size="20x20x1", quantity=4),

            # AHU-3A
            Filter(ahu_id="AHU-3A", phase="Pre", part_number="PLEAT-1224", size="12x24x2", quantity=6),
            Filter(ahu_id="AHU-3A", phase="Final", part_number="V-BANK-2424", size="24x24x12", quantity=2),

            # AHU-4B
            Filter(ahu_id="AHU-4B", phase="Pre", part_number="PLEAT-2424", size="24x24x2", quantity=10),
            Filter(ahu_id="AHU-4B", phase="HEPA", part_number="HEPA-2424-GS", size="24x24x12", quantity=2),
        ]

        db.session.add_all(filters)


        # -------------------------
        # TECHNICIANS
        # -------------------------
        techs = [
            Technician(name="John Doe", pin="1234", active=True),
            Technician(name="Maria Sanchez", pin="2222", active=True),
            Technician(name="Kevin Lee", pin="9999", active=True)
        ]

        db.session.add_all(techs)

        # Commit all
        db.session.commit()
        print("Seed data inserted successfully!")

seed_data()