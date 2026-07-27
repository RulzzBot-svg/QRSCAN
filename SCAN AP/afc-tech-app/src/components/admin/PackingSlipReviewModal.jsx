import { buildQbPasteString, countPackingSlipItems } from "../../utils/qbPackingSlip";
import { checkQbListenerHealth, pasteToQbListener } from "../../api/qb";

export default function PackingSlipReviewModal({
  open,
  onClose,
  filtersByAhu,
  sourceLabel = "manual selection",
  onSuccess,
}) {
  if (!open) return null;

  const ahuCount = Object.keys(filtersByAhu || {}).length;
  const itemCount = countPackingSlipItems(filtersByAhu || {});
  const pastePreview = itemCount > 0 ? buildQbPasteString(filtersByAhu) : "";

  const flatLines = [];
  for (const [ahuId, ahuData] of Object.entries(filtersByAhu || {})) {
    for (const f of ahuData.filters || []) {
      flatLines.push({
        key: `${ahuId}-${f.id || f.part_number}-${f.job_id || ""}`,
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
    await navigator.clipboard.writeText(pastePreview);
    onSuccess?.("copied");
    alert(
      `Copied ${itemCount} line(s) for ${ahuCount} AHU(s).\n\n` +
        "In QuickBooks: click the first packing slip cell, then Ctrl+Shift+V."
    );
  };

  const autoPaste = async () => {
    if (!itemCount) return;
    const health = await checkQbListenerHealth();
    if (!health.running) {
      alert(
        "QB Listener is not running.\n\n" +
          "On your Windows PC, open PowerShell in afc-tech-app-backend and run:\n" +
          "  python qb_listener.py\n\n" +
          "Then click in QuickBooks and try again."
      );
      return;
    }
    const result = await pasteToQbListener(pastePreview);
    onSuccess?.("pasted");
    alert(
      (result.message || "Data sent to QuickBooks.") +
        "\n\nSwitch to QuickBooks now — paste should run automatically (Ctrl+Shift+V)."
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-base-100 border border-base-300 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-start gap-4">
          <div>
            <h2 className="text-lg font-bold">Review packing slip (before QuickBooks)</h2>
            <p className="text-sm opacity-70 mt-1">
              Source: {sourceLabel} — {ahuCount} AHU(s), {itemCount} line(s). Fix mistakes here;
              QuickBooks is hard to undo after OK.
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
            <table className="table table-sm table-zebra w-full">
              <thead>
                <tr>
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
            onClick={copyToClipboard}
          >
            📋 Copy for QB
          </button>
          <button
            type="button"
            className="btn btn-accent"
            disabled={!itemCount}
            onClick={autoPaste}
          >
            ⚡ Auto-Paste to QB
          </button>
        </div>
      </div>
    </div>
  );
}
