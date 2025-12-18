import { useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function QRScanner() {
  useEffect(() => {
    const qrCodeRegionId = "qr-reader";
    const html5QrCode = new Html5Qrcode(qrCodeRegionId);

    html5QrCode
      .start(
        { facingMode: "environment" }, // back camera
        {
          fps: 10,
          qrbox: 250,
        },
        (decodedText) => {
          console.log("QR detected:", decodedText);

          // 🛑 Stop scanner FIRST
          html5QrCode
            .stop()
            .then(() => {
              // 🌍 HARD REDIRECT
              window.location.assign(decodedText);
            })
            .catch((err) => console.error("Stop failed", err));
        },
        (errorMessage) => {
          // Optional: console.log(errorMessage);
        }
      )
      .catch((err) => {
        console.error("Camera start failed", err);
      });

    return () => {
      html5QrCode.stop().catch(() => {});
    };
  }, []);

  return (
    <div>
      <h2>Scan QR Code</h2>
      <div id="qr-reader" style={{ width: "100%" }} />
    </div>
  );
}
