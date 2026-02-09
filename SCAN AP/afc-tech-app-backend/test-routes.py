from db import db
from app import create_app
from models import Hospital, AHU, Filter, Technician
from datetime import date, timedelta
import random

app = create_app()


def random_past_date(max_days=600, chance_none=0.25):
    if random.random() < chance_none:
        return None
    return date.today() - timedelta(days=random.randint(1, max_days))


def seed_data():
    with app.app_context():

        print("🔄 Resetting database...")
        db.drop_all()
        db.create_all()

        # -------------------------------------------------
        # HOSPITALS
        # -------------------------------------------------
        hospitals = [
            Hospital(name="Cedars-Sinai Marina del Rey", city="Marina del Rey", active=True),
            Hospital(name="St. Francis Medical Center", city="Lynwood", active=True),
            Hospital(name="California Hospital Medical Center", city="Los Angeles", active=True),
            Hospital(name="Queen of the Valley Hospital", city="West Covina", active=True),
            Hospital(name="Encino Hospital Medical Center", city="Encino", active=True),
            Hospital(name="Glendale Adventist Medical Center", city="Glendale", active=True),
            Hospital(name="Good Samaritan Hospital", city="Downtown LA", active=True),
            Hospital(name="White Memorial Medical Center", city="Boyle Heights", active=True),
        ]

        db.session.add_all(hospitals)
        db.session.flush()

        # -------------------------------------------------
        # AHUs
        # -------------------------------------------------
        ahus = [
            # Cedars
            AHU(hospital_id=hospitals[0].id, name="Surgery Wing AHU 127", location="2nd Floor Mech Room"),
            AHU(hospital_id=hospitals[0].id, name="Main Lobby AHU 210", location="Lobby East"),

            # St Francis
            AHU(hospital_id=hospitals[1].id, name="ICU Block AHU 3A", location="3rd Floor ICU"),
            AHU(hospital_id=hospitals[1].id, name="ER Intake AHU 3B", location="Emergency Dept"),

            # California Hospital
            AHU(hospital_id=hospitals[2].id, name="Radiology AHU 4B", location="Basement"),
            AHU(hospital_id=hospitals[2].id, name="Patient Tower AHU 5A", location="5th Floor"),

            # Queen of the Valley
            AHU(hospital_id=hospitals[3].id, name="OR Suite AHU 1", location="OR Wing"),
            AHU(hospital_id=hospitals[3].id, name="PACU AHU 2", location="Recovery"),

            # Encino
            AHU(hospital_id=hospitals[4].id, name="Lobby AHU 1", location="Main Lobby"),
            AHU(hospital_id=hospitals[4].id, name="Med Surg AHU 2", location="2nd Floor"),

            # Glendale
            AHU(hospital_id=hospitals[5].id, name="ICU AHU 1", location="ICU Wing"),

            # Good Samaritan
            AHU(hospital_id=hospitals[6].id, name="Central Plant AHU 1", location="Roof"),
            AHU(hospital_id=hospitals[6].id, name="Admin Wing AHU 2", location="Admin"),

            # White Memorial
            AHU(hospital_id=hospitals[7].id, name="NICU AHU 1", location="NICU"),
        ]

        db.session.add_all(ahus)
        db.session.flush()

        # -------------------------------------------------
        # FILTERS (frequency & service dates live here)
        # -------------------------------------------------
        filters = []

        for ahu in ahus:
            # PRE FILTER
            filters.append(
                Filter(
                    ahu_id=ahu.id,
                    phase="PRE",
                    part_number="PLEAT-2424",
                    size="24x24x2",
                    quantity=random.choice([6, 8, 10, 12]),
                    frequency_days=random.choice([30, 60, 90]),
                    last_service_date=random_past_date()
                )
            )

            # FINAL FILTER
            filters.append(
                Filter(
                    ahu_id=ahu.id,
                    phase="FINAL",
                    part_number="V-BANK-2424",
                    size="24x24x12",
                    quantity=random.choice([2, 4]),
                    frequency_days=random.choice([365, 540, 730]),
                    last_service_date=random_past_date()
                )
            )

            # OPTIONAL CARBON / HEPA
            if random.random() > 0.5:
                filters.append(
                    Filter(
                        ahu_id=ahu.id,
                        phase="CARBON",
                        part_number="CRB-2424",
                        size="24x24x1",
                        quantity=random.choice([2, 4]),
                        frequency_days=random.choice([180, 270]),
                        last_service_date=random_past_date()
                    )
                )

        db.session.add_all(filters)

        # -------------------------------------------------
        # TECHNICIANS
        # -------------------------------------------------
        techs = [
            Technician(name="John Doe", pin="1234", active=True),
            Technician(name="Maria Sanchez", pin="2222", active=True),
            Technician(name="Kevin Lee", pin="9999", active=True),
            Technician(name="Luis Ramirez", pin="4567", active=True),
            Technician(name="Ana Torres", pin="8888", active=True),
        ]

        db.session.add_all(techs)

        db.session.commit()
        print("✅ Seed data inserted successfully!")


if __name__ == "__main__":
    seed_data()
