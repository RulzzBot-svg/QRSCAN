import random
from datetime import date, timedelta
from app import create_app
from db import db
from models import Hospital, AHU, Filter, Technician


app=create_app()

# -----------------------------
# Helpers
# -----------------------------
def random_date_or_none(max_days_ago=400, chance_none=0.3):
    """Return a random past date or None"""
    if random.random() < chance_none:
        return None
    return date.today() - timedelta(days=random.randint(1, max_days_ago))


def random_filter_frequency(phase):
    """Typical filter frequencies"""
    if phase == "PRE":
        return random.choice([30, 60, 90])
    return random.choice([180, 365, 540])


# -----------------------------
# Seeder
# -----------------------------
def seed():
    with app.app_context():
        print("⚠️  Clearing existing data...")
        db.session.query(Filter).delete()
        db.session.query(AHU).delete()
        db.session.query(Hospital).delete()
        db.session.query(Technician).delete()
        db.session.commit()

        print("🏥 Creating hospitals...")
        hospitals = []
        for i in range(1, 6):
            h = Hospital(
                name=f"Hospital #{i}",
                address=f"{100+i} Main St",
                city=random.choice(["Los Angeles", "Pasadena", "Glendale", "Burbank"]),
                active=True
            )
            db.session.add(h)
            hospitals.append(h)

        print("🧑‍🔧 Creating technicians...")
        techs = []
        for i in range(1, 6):
            t = Technician(
                name=f"Tech {i}",
                pin=str(1000 + i),
                active=True
            )
            db.session.add(t)
            techs.append(t)

        db.session.flush()

        print("🌀 Creating AHUs + Filters...")
        for hospital in hospitals:
            ahu_count = random.randint(3, 6)

            for i in range(ahu_count):
                ahu = AHU(
                    id=f"AHU-{hospital.id}-{i+1}",
                    hospital_id=hospital.id,
                    name=f"AHU {i+1}",
                    location=random.choice(["Roof", "Mechanical Room", "Basement", "Penthouse"]),
                    notes=None
                )
                db.session.add(ahu)
                db.session.flush()

                # Filters per AHU
                for phase in ["PRE", "FINAL"]:
                    filter_count = random.randint(1, 2)

                    for f in range(filter_count):
                        freq = random_filter_frequency(phase)
                        last_done = random_date_or_none()

                        filt = Filter(
                            ahu_id=ahu.id,
                            phase=phase,
                            part_number=f"{phase}-FILT-{random.randint(1000,9999)}",
                            size=random.choice(["12x24x2", "20x24x2", "24x24x2"]),
                            quantity=random.choice([4, 8, 12]),
                            frequency_days=freq,
                            last_service_date=last_done
                        )
                        db.session.add(filt)

        db.session.commit()
        print("✅ Database seeded successfully!")


if __name__ == "__main__":
    seed()
