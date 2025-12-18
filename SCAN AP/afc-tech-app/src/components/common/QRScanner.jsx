import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function QRScanner() {
  const scannerRef = useRef(null);
  const [status, setStatus] = useState("Initializing camera…");
  const [error, setError] = useState(null);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [scanned, setScanned] = useState(false);

  // 📶 Online / Offline detection
  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // 📷 Start QR scanner
  useEffect(() => {
    if (offline) {
      setStatus("Offline — connect to the internet");
      return;
    }

    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    setStatus("Starting camera…");

    scanner
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          if (scanned) return;

          setScanned(true);
          setStatus("QR detected ✓");

          scanner
            .stop()
            .then(() => {
              setStatus("Redirecting…");
              window.location.assign(decodedText);
            })
            .catch(() => {
              window.location.assign(decodedText);
            });
        }
      )
      .then(() => setStatus("Point camera at QR code"))
      .catch((err) => {
        console.error(err);
        setError("Camera access failed");
        setStatus("Camera error");
      });

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [offline, scanned]);

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-base-100 rounded-xl shadow-lg p-4 space-y-4">

        {/* Title */}
        <h1 className="text-xl font-bold text-primary text-center">
          Scan AHU QR Code
        </h1>

        {/* Offline Banner */}
        {offline && (
          <div className="rounded-lg bg-warning/20 border border-warning px-3 py-2 text-sm text-warning">
            📶 You are offline. Connect to the internet to scan.
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="rounded-lg bg-error/20 border border-error px-3 py-2 text-sm text-error">
            ❌ {error}
          </div>
        )}

        {/* Scanner */}
        <div className="relative rounded-lg overflow-hidden border border-base-300">
          <div id="qr-reader" className="w-full" />

          {/* Scan Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-56 h-56 border-2 border-primary rounded-lg" />
          </div>
        </div>

        {/* Status */}
        <div className="text-center text-sm text-base-content/70">
          {status}
        </div>

        {/* Retry Button */}
        {(offline || error) && (
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary btn-sm w-full"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
