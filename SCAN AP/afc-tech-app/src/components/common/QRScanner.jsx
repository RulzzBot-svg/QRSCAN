import { useNavigate } from "react-router-dom";
import { Scanner } from "@yudiel/react-qr-scanner";
import { useRef } from "react";

export default function QRScanner() {
  const navigate = useNavigate();
  const scannedRef = useRef(false);

  const handleScan = (results) => {
    if (!results || scannedRef.current) return;

    const result = Array.isArray(results) ? results[0] : results;
    if (!result) return;

    scannedRef.current = true;

    const value = result.rawValue || result.text;
    console.log("QR Detected:", value);

    try {
      const url = new URL(value);
      const ahuId = url.pathname.split("/").pop();
      navigate(`/FilterInfo/${ahuId}`);
    } catch {
      // Fallback: plain text QR
      navigate(`/FilterInfo/${value}`);
    }
  };

  return (
    <div data-theme="corporate" className="p-4 min-h-screen bg-base-200">
      <button className="btn btn-ghost mb-4" onClick={() => navigate(-1)}>
        ⬅ Back
      </button>

      <h1 className="text-2xl font-bold mb-4 text-primary">
        Scan AHU QR Code
      </h1>

      <div className="rounded-xl overflow-hidden shadow border border-base-300">
        <Scanner
          onResult={handleScan}
          constraints={{ facingMode: "environment" }}
          scanDelay={150}
          className="w-full h-auto"
        />
      </div>

      <p className="text-center text-sm text-base-content/70 mt-2">
        Position the QR Code inside the frame
      </p>
    </div>
  );
}
