import { useNavigate } from "react-router-dom";
import { Scanner } from "@yudiel/react-qr-scanner";
import { useRef } from "react";

export default function QRScanner() {
  const navigate = useNavigate();
  const scannedRef = useRef(false);

  const handleScan = (result) => {
    if (!result || scannedRef.current) return;

    scannedRef.current = true;

    const value = result.rawValue || result.text || result;
    console.log("QR Detected:", value);

    const ahuId = value.split("/").pop().trim();
    navigate(`/FilterInfo/${ahuId}`);
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
          constraints={{ facingMode: { exact: "environment" } }}
          scanDelay={300}
          className="w-full h-auto"
        />
      </div>

      <p className="text-center text-sm text-base-content/70 mt-2">
        Position the QR Code inside the frame
      </p>
    </div>
  );
}
