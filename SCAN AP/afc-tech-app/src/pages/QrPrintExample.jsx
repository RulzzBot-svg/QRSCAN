import { useEffect, useState } from "react";
import QrLabelPrintModal from "../components/admin/QrLabelPrintModal";
import { buildQrLabels } from "../utils/qrLabels";

const SAMPLE_AHUS = [
  { id: 12, name: "AHU-012", location: "Penthouse mechanical", hospital: "Foothill", building: "Main" },
  { id: 13, name: "AHU-013", location: "OR suite 2", hospital: "Foothill", building: "Surgery" },
  { id: 14, name: "AHU-014", location: "Basement", hospital: "Foothill", building: "East" },
];

export default function QrPrintExample() {
  const [qrPrint, setQrPrint] = useState({
    open: true,
    loading: true,
    labels: [],
    title: "QR Codes — Foothill",
    error: "",
  });

  useEffect(() => {
    let cancelled = false;
    buildQrLabels(SAMPLE_AHUS)
      .then((labels) => {
        if (!cancelled) {
          setQrPrint({
            open: true,
            loading: false,
            labels,
            title: "QR Codes — Foothill",
            error: "",
          });
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          setQrPrint({
            open: true,
            loading: false,
            labels: [],
            title: "QR Codes — Foothill",
            error: "Failed to generate QR labels.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div data-theme="corporate" className="min-h-screen bg-base-200 p-6">
      <h1 className="text-xl font-bold mb-2">QR print preview (dev)</h1>
      <p className="text-sm opacity-70 mb-4">
        Demo of the admin print-label modal. Click Print to open the browser print dialog.
      </p>
      <button className="btn btn-warning" type="button" onClick={() => setQrPrint((s) => ({ ...s, open: true }))}>
        Show labels
      </button>
      <QrLabelPrintModal
        open={qrPrint.open}
        labels={qrPrint.labels}
        title={qrPrint.title}
        loading={qrPrint.loading}
        error={qrPrint.error}
        onClose={() => setQrPrint((s) => ({ ...s, open: false }))}
      />
    </div>
  );
}
