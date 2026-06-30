"""Hash all plain-text technician PINs in the database."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import create_app
from db import db
from models import Technician
from middleware.pin_utils import hash_pin, is_hashed


def main():
    app = create_app()
    with app.app_context():
        techs = Technician.query.all()
        updated = 0
        for tech in techs:
            if tech.pin and not is_hashed(tech.pin):
                tech.pin = hash_pin(tech.pin)
                updated += 1
        if updated:
            db.session.commit()
        print(f"Hashed {updated} technician PIN(s) ({len(techs)} total).")


if __name__ == "__main__":
    main()
