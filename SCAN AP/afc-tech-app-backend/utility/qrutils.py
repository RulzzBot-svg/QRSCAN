import qrcode
import os
from app import create_app
from db import db
from models import AHU

app = create_app()

with app.app_context():
    ahus = AHU.query.all()
    for ahu in ahus:
        ahu_id = ahu.id
        url = f"https://qrscan-lyart.vercel.app/FilterInfo/{ahu_id}"

        qr = qrcode.QRCode(
            version=2,
            error_correction=qrcode.constants.ERROR_CORRECT_Q,
            box_size=10,
            border=4
        )

        qr.add_data(url)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        img.save(f"qr_codes/{ahu_id}.png")
        print(f"QR generated for {ahu_id}")

print("All QR codes generated successfully!")