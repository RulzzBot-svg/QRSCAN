import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrowserMultiFormatReader } from "@zxing/browser";

export default function QRScanner() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const hasScannedRef = useRef(false);

  const [logs, setLogs] = useState([]);

  const log = (msg) => {
    console.log(msg);
    setLogs((prev) => [...prev.slice(-6), msg]);
  };

  useEffect(() => {
    log("🔵 Scanner component mounted");

    scannerRef.current = new BrowserMultiFormatReader();

    scannerRef.current
      .decodeFromVideoDevice(
        null,
        videoRef.current,
        (result, error) => {
          if (result && !hasScannedRef.current) {
            hasScannedRef.current = true;

            const value = result.getText();
            log("✅ QR detected");
            log(value);

            // 🔑 STEP 1: Navigate FIRST
            try {
              const url = new URL(value);
              const ahuId = url.pathname.split("/").pop();
              log(`➡️ Navigating to /FilterInfo/${ahuId}`);
              navigate(`/FilterInfo/${ahuId}`);
            } catch {
              log(`➡️ Navigating to /FilterInfo/${value}`);
              navigate(`/FilterInfo/${value}`);
            }

            // 🔑 STEP 2: Clean up AFTER navigation
            setTimeout(() => {
              log("🧹 Cleaning up camera");
              scannerRef.current?.reset();
            }, 300);
          }

          if (error) {
            // ZXing throws frequent "not found" errors — log only occasionally
            // log("🔍 scanning...");
          }
        }
      )
      .then(() => log("📷 Camera stream started"))
      .catch((err) => {
        log("❌ Camera failed to start");
        log(err.message || String(err));
      });

    return () => {
      log("🔴 Scanner unmounting");
      scannerRef.current?.reset();
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

      {/* 🔍 ON-SCREEN DEBUG LOGS */}
      <div className="mt-4 bg-base-100 border border-base-300 rounded p-3 text-xs font-mono space-y-1">
        <div className="font-semibold text-primary">Scanner Debug</div>
        {logs.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}
