import qrcode


ahu_id="work1"

url= f"https://qrscan-4r8pp4dvi-raul-ostorgas-projects.vercel.app/FilterInfo/AHU-EN-2"

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