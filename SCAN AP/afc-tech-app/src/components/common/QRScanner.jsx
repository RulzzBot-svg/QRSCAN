import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrowserMultiFormatReader } from "@zxing/browser";

function stopCamera(videoRef) {
  const video = videoRef.current;
  if (!video) return;

  const stream = video.srcObject;
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  }
}

export default function QRScanner() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const scannedRef = useRef(false);

  const [logs, setLogs] = useState([]);
  const [scanning, setScanning] = useState(true); // 🔑 controls video mount

  const log = (msg) => {
    console.log(msg);
    setLogs((prev) => [...prev.slice(-6), msg]);
  };
  useEffect(() => {
    if (!scanning) return;

    log("📷 Starting camera");

    const scanner = new BrowserMultiFormatReader();
    scannerRef.current = scanner;

    scanner
      .decodeFromVideoDevice(null, videoRef.current, (result) => {
        if (result && !scannedRef.current) {
          scannedRef.current = true;

          const value = result.getText();
          log("✅ QR detected");
          log(value);

          // 🛑 HARD STOP CAMERA + ZXING FIRST
          scanner.reset();
          stopCamera(videoRef);

          // 🧹 UNMOUNT VIDEO
          setScanning(false);

          // 🚀 NAVIGATE ON NEXT FRAME
          requestAnimationFrame(() => {
            try {
              const url = new URL(value);
              log("Externadl URL detected");
              window.location.hred = url.href;
            } catch {
              log(`➡️ Navigating to /FilterInfo/${value}`);
              navigate(`/FilterInfo/${value}`, { replace: true });
            }
          });
        }
      })
      .then(() => log("🎥 Camera stream active"))
      .catch((err) => {
        log("❌ Camera failed");
        log(err.message || String(err));
      });

    return () => {
      log("🧹 Scanner cleanup");
      scanner.reset();
      stopCamera(videoRef);
    };
  }, [navigate, scanning]);


  return (
    <div data-theme="corporate" className="p-4 min-h-screen bg-base-200">
      <button className="btn btn-ghost mb-4" onClick={() => navigate(-1)}>
        ⬅ Back
      </button>

      <h1 className="text-2xl font-bold mb-4 text-primary">
        Scan AHU QR Code
      </h1>

      {/* 🔑 CONDITIONAL VIDEO RENDER */}
      {scanning ? (
        <div className="rounded-xl overflow-hidden shadow border border-base-300">
          <video
            ref={videoRef}
            className="w-full"
            style={{ height: "320px", objectFit: "cover" }}
            muted
            playsInline
          />
        </div>
      ) : (
        <div className="flex items-center justify-center h-80 bg-base-100 border border-base-300 rounded">
          <span className="loading loading-spinner loading-lg text-primary" />
          <span className="ml-3 text-sm">Loading AHU…</span>
        </div>
      )}

      {/* 🔍 DEBUG LOGS */}
      <div className="mt-4 bg-base-100 border border-base-300 rounded p-3 text-xs font-mono space-y-1">
        <div className="font-semibold text-primary">Scanner Debug</div>
        {logs.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}
