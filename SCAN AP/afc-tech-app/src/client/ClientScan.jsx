import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { extractAhuId } from "./format";

export default function ClientScan() {
  const navigate = useNavigate();
  const scannerRef = useRef(null);
  const handled = useRef(false);
  const [status, setStatus] = useState("Starting camera…");
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");

  useEffect(() => {
    let cancelled = false;
    const scanner = new Html5Qrcode("client-qr-reader");
    scannerRef.current = scanner;

    const openAhu = async (decodedText) => {
      if (handled.current || cancelled) return;
      const ahuId = extractAhuId(decodedText);
      if (!ahuId) {
        setError("Could not read that QR. Try again or type the unit id.");
        setStatus("Try again");
        return;
      }
      handled.current = true;
      setStatus("Opening unit…");
      try {
        if (scanner.isScanning) await scanner.stop();
      } catch {
        /* already stopped */
      }
      if (!cancelled) navigate(`/client/ahu/${encodeURIComponent(ahuId)}`);
    };

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          openAhu(decodedText);
        }
      )
      .then(() => {
        if (!cancelled) setStatus("Point the camera at the AHU label");
      })
      .catch(() => {
        if (!cancelled) {
          setError("Camera could not start. Allow camera access, or type the unit id.");
          setStatus("Camera unavailable");
        }
      });

    return () => {
      cancelled = true;
      const current = scannerRef.current;
      if (!current) return;
      const stop = current.isScanning ? current.stop() : Promise.resolve();
      stop
        .catch(() => {})
        .finally(() => {
          try {
            current.clear();
          } catch {
            /* ignore */
          }
        });
    };
  }, [navigate]);

  const submitManual = (e) => {
    e.preventDefault();
    const ahuId = extractAhuId(manual);
    if (!ahuId) {
      setError("Enter a unit id or paste the QR link.");
      return;
    }
    navigate(`/client/ahu/${encodeURIComponent(ahuId)}`);
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div>
        <h2 className="text-xl font-bold">Scan QR</h2>
        <p className="text-sm text-base-content/60">{status}</p>
      </div>
      <div className="rounded-2xl overflow-hidden border border-base-300 bg-black">
        <div id="client-qr-reader" className="w-full min-h-[280px]" />
      </div>
      {error ? <div className="alert alert-warning text-sm">{error}</div> : null}
      <form onSubmit={submitManual} className="flex gap-2">
        <input
          className="input input-bordered flex-1"
          placeholder="Or paste / type unit id"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
        />
        <button className="btn btn-primary" type="submit">
          Open
        </button>
      </form>
    </div>
  );
}
