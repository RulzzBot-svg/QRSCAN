import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { getCachedAHU } from "../../offline/ahuCache";

// If your QR codes sometimes contain a URL, this extracts the AHU id reliably.
function extractAhuId(decodedText) {
  const s = (decodedText || "").trim();

  // Case 1: plain "AHU-12" etc
  if (!s.includes("http")) return s;

  // Case 2: URL — try to take last path segment
  try {
    const u = new URL(s);
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || s;
  } catch {
    return s;
  }
}

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

  // 📷 Start QR scanner (DO NOT BLOCK WHEN OFFLINE)
  useEffect(() => {
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    setStatus(offline ? "Offline mode: scanning from downloads…" : "Starting camera…");

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          if (scanned) return;

          setScanned(true);
          setStatus("QR detected ✓");

          const ahuId = extractAhuId(decodedText);

          // stop camera first to avoid repeated triggers
          try {
            await scanner.stop();
          } catch {}

          try {
            if (!ahuId) {
              setError("Invalid QR code");
              setStatus("Scan error");
              setScanned(false);
              return;
            }

            // ✅ OFFLINE: require the AHU to exist in cache
            if (!navigator.onLine) {
              setStatus("Checking offline downloads…");
              const cached = await getCachedAHU(ahuId);

              if (cached) {
                setStatus("Opening cached AHU…");
                // IMPORTANT: replace with your real route
                window.location.assign(`/FilterInfo/${encodeURIComponent(ahuId)}`);
              } else {
                setStatus("Not downloaded for offline use.");
                window.location.assign(`/offline-not-downloaded/${encodeURIComponent(ahuId)}`);
              }
              return;
            }

            // ✅ ONLINE: just go to AHU route
            setStatus("Opening AHU…");
            window.location.assign(`/FilterInfo/${encodeURIComponent(ahuId)}`);
          } catch (e) {
            console.error(e);
            setError("Failed to open scanned AHU");
            setStatus("Scan error");
          }
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
        <h1 className="text-xl font-bold text-primary text-center">
          Scan AHU QR Code
        </h1>

        {/* Offline Banner (now informational, not blocking) */}
        {offline && (
          <div className="rounded-lg bg-warning/20 border border-warning px-3 py-2 text-sm text-warning">
            📶 You are offline. Scanning will work only for AHUs you’ve downloaded.
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-error/20 border border-error px-3 py-2 text-sm text-error">
            ❌ {error}
          </div>
        )}

        <div className="relative rounded-lg overflow-hidden border border-base-300">
          <div id="qr-reader" className="w-full" />
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-56 h-56 border-2 border-primary rounded-lg" />
          </div>
        </div>

        <div className="text-center text-sm text-base-content/70">
          {status}
        </div>

        {(error) && (
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
