import qrcode


ahu_id="work3"

url= f"https://qrscan-lyart.vercel.app/FilterInfo/AHU-5A"

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