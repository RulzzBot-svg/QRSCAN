import { useState } from "react";
import {
  buildQbPasteString,
  copyPackingSlipToClipboard,
  countPackingSlipItems,
  qbPasteInstructions,
} from "../../utils/qbPackingSlip";
import { checkQbListenerHealth, pasteToQbListener } from "../../api/qb";

export default function PackingSlipReviewModal({
  open,
  onClose,
  filtersByAhu,
  sourceLabel = "manual selection",
  onSuccess,
}) {
  const [copying, setCopying] = useState(false);
  if (!open) return null;

  const ahuCount = Object.keys(filtersByAhu || {}).length;
  const itemCount = countPackingSlipItems(filtersByAhu || {});
  const pastePreview = itemCount > 0 ? buildQbPasteString(filtersByAhu) : "";

  const flatLines = [];
  for (const [ahuId, ahuData] of Object.entries(filtersByAhu || {})) {
    for (const f of ahuData.filters || []) {
      flatLines.push({
        key: `${ahuId}-${f.id || f.part_number}-${f.job_id || ""}`,
        building: ahuData.building,
        ahu_name: ahuData.ahu_name,
        part_number: f.part_number,
        quantity: f.quantity ?? 1,
        size: f.size,
        phase: f.phase,
        completed_at: f.completed_at,
      });
    }
  }

  const copyToClipboard = async () => {
    if (!itemCount) return;
    setCopying(true);
    try {
      await copyPackingSlipToClipboard(filtersByAhu);
      onSuccess?.("copied");
      alert(qbPasteInstructions(itemCount, ahuCount));
    } catch (err) {
      console.error(err);
      alert("Could not copy. Allow clipboard access for this site, then try again.");
    } finally {
      setCopying(false);
    }
  };

  const autoPaste = async () => {
    if (!itemCount) return;
    const health = await checkQbListenerHealth();
    if (!health.running) {
      alert(
        "QB Listener is not running on this PC.\n\n" +
          "Easiest path: click Copy for QuickBooks, then in QuickBooks click the first QTY cell and press Ctrl+Alt+V (Special Paste must be running)."
      );
      return;
    }
    try {
      const result = await pasteToQbListener(pastePreview);
      onSuccess?.("pasted");
      alert(
        (result.message || "Pasting soon.") +
          "\n\n1. Switch to QuickBooks NOW\n" +
          "2. Click the first QTY cell\n" +
          "3. Wait ~3 seconds — typing starts automatically\n\n" +
          "Manual fallback: Copy for QuickBooks, then Ctrl+Alt+V"
      );
    } catch (e) {
      alert(e.message || "Auto-paste failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-base-100 border border-base-300 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-start gap-4">
          <div>
            <h2 className="text-lg font-bold">Copy packing slip for QuickBooks</h2>
            <p className="text-sm opacity-70 mt-1">
              Source: {sourceLabel} — {ahuCount} AHU(s), {itemCount} line(s). This matches the
              Excel Special Paste format (building → AHU → qty/part).
            </p>
          </div>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="overflow-auto flex-1 p-4">
          {itemCount === 0 ? (
            <p className="text-center opacity-70 py-8">No lines to show.</p>
          ) : (
            <>
              <table className="table table-sm table-zebra w-full">
                <thead>
                  <tr>
                    <th>Building</th>
                    <th>AHU</th>
                    <th>Part #</th>
                    <th className="text-right">Qty</th>
                    <th>Size</th>
                    <th>Phase</th>
                    <th>Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {flatLines.map((row) => (
                    <tr key={row.key}>
                      <td>{row.building || "—"}</td>
                      <td className="font-medium">{row.ahu_name}</td>
                      <td>{row.part_number || "—"}</td>
                      <td className="text-right">{row.quantity}</td>
                      <td>{row.size || "—"}</td>
                      <td>{row.phase || "—"}</td>
                      <td className="text-xs whitespace-nowrap">
                        {row.completed_at
                          ? new Date(row.completed_at).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <details className="mt-3">
                <summary className="text-xs opacity-70 cursor-pointer">Clipboard preview</summary>
                <pre className="mt-2 text-[10px] bg-base-200 p-2 rounded overflow-auto max-h-32 whitespace-pre-wrap break-all">
                  {pastePreview}
                </pre>
              </details>
            </>
          )}
        </div>

        <div className="p-4 border-t flex flex-wrap gap-2 justify-end">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-outline"
            disabled={!itemCount}
            onClick={autoPaste}
          >
            Auto-Paste to QB
          </button>
          <button
            type="button"
            className={`btn btn-accent ${copying ? "loading" : ""}`}
            disabled={!itemCount || copying}
            onClick={copyToClipboard}
          >
            Copy for QuickBooks
          </button>
        </div>
      </div>
    </div>
  );
}
