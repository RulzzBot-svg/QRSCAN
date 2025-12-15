import qrcode


ahu_id="AHU-4B"

url= f"https://192.168.1.131:5173/FilterInfo/{ahu_id}"

qr=qrcode.QRCode(
    version=2,
    error_correction=qrcode.constants.ERROR_CORRECT_Q,
    box_size=10,
    border=4
)

qr.add_data(url)
qr.make(fit=True)

img = qr.make_image(fill_color="black", back_color="white")
img.save(f"{ahu_id}.png")
print("QR generated succesfully!")