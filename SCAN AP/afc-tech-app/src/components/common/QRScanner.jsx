import { useEffect, useRef, useState } from "react";
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
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const scannedRef = useRef(false);

  const [logs, setLogs] = useState([]);
  const [scanning, setScanning] = useState(true);

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
        if (!result || scannedRef.current) return;

        scannedRef.current = true;

        const value = result.getText();
        log("✅ QR detected");
        log(value);

        // 🛑 STOP EVERYTHING FIRST
        scanner.reset();
        stopCamera(videoRef);
        setScanning(false);

        // 🌍 HARD REDIRECT (mobile-safe)
        log("🌍 Redirecting…");
        window.location.assign(value);
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
  }, [scanning]);

  return (
    <div data-theme="corporate" className="p-4 min-h-screen bg-base-200">
      <h1 className="text-2xl font-bold mb-4 text-primary">
        Scan AHU QR Code
      </h1>

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

      <div className="mt-4 bg-base-100 border border-base-300 rounded p-3 text-xs font-mono space-y-1">
        <div className="font-semibold text-primary">Scanner Debug</div>
        {logs.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}
