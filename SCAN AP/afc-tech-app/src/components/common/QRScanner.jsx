import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { BrowserMultiFormatReader } from "@zxing/browser";

export default function QRScanner() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const navigatingRef = useRef(false);

  useEffect(() => {
    const startScanner = async () => {
      scannerRef.current = new BrowserMultiFormatReader();

      try {
        await scannerRef.current.decodeFromVideoDevice(
          null,
          videoRef.current,
          (result) => {
            if (!result || navigatingRef.current) return;

            navigatingRef.current = true;

            const value = result.getText();
            console.log("QR Detected:", value);

            // ✅ STOP CAMERA FIRST
            scannerRef.current.reset();

            // ✅ NAVIGATE ON NEXT TICK
            setTimeout(() => {
              try {
                const url = new URL(value);
                const ahuId = url.pathname.split("/").pop();
                navigate(`/FilterInfo/${ahuId}`, { replace: true });
              } catch {
                navigate(`/FilterInfo/${value}`, { replace: true });
              }
            }, 0);
          }
        );
      } catch (err) {
        console.error("Camera start failed:", err);
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.reset();
      }
    };
  }, [navigate]);

  return (
    <div data-theme="corporate" className="p-4 min-h-screen bg-base-200">
      <button className="btn btn-ghost mb-4" onClick={() => navigate(-1)}>
        ⬅ Back
      </button>

      <h1 className="text-2xl font-bold mb-4 text-primary">
        Scan AHU QR Code
      </h1>

      <div className="rounded-xl overflow-hidden shadow border border-base-300">
        <video
          ref={videoRef}
          className="w-full"
          style={{ height: "320px", objectFit: "cover" }}
          muted
          playsInline
        />
      </div>

      <p className="text-center text-sm text-base-content/70 mt-2">
        Position the QR Code inside the frame
      </p>
    </div>
  );
}
