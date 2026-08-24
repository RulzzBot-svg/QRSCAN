import { printQrLabels } from "../../utils/qrLabels";

export default function QrLabelPrintModal({
  open,
  labels,
  title,
  loading,
  error,
  onClose,
}) {
  if (!open) return null;

  const count = labels?.length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-base-100 border border-base-300 rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between gap-3 p-3 border-b">
          <div>
            <div className="font-semibold">{title || "AHU QR Labels"}</div>
            <div className="text-xs opacity-70">
              {loading
                ? "Generating QR codes…"
                : `${count} label${count === 1 ? "" : "s"} ready to print`}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-sm btn-primary"
              type="button"
              disabled={loading || !count}
              onClick={() => printQrLabels(labels, title)}
            >
              Print
            </button>
            <button className="btn btn-sm" type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="p-3 overflow-auto">
          {loading && (
            <div className="text-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          )}

          {!loading && error && (
            <div className="alert alert-error text-sm">{error}</div>
          )}

          {!loading && !error && count === 0 && (
            <div className="text-center py-12 opacity-70">No AHUs to print.</div>
          )}

          {!loading && !error && count > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {labels.map((label) => (
                <div
                  key={label.id}
                  className="border border-base-300 rounded-lg p-3 text-center bg-white text-black"
                >
                  <img
                    src={label.qrDataUrl}
                    alt={`QR for ${label.name}`}
                    className="mx-auto w-40 h-40"
                  />
                  {(label.hospital || label.building) && (
                    <div className="text-xs opacity-70 mt-2">
                      {[label.hospital, label.building].filter(Boolean).join(" · ")}
                    </div>
                  )}
                  <div className="font-semibold text-sm mt-1">{label.name}</div>
                  {label.location ? (
                    <div className="text-xs mt-0.5">{label.location}</div>
                  ) : null}
                  <div className="text-[10px] opacity-60 mt-1">ID {label.id}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
