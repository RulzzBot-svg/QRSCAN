import { useState } from "react";
import { copyPackingSlipToClipboard } from "../../utils/qbPackingSlip";

export default function QbCopyResultModal({ result, onClose }) {
  const [busy, setBusy] = useState(false);
  if (!result) return null;

  const { itemCount, ahuCount, mode, filtersByAhu } = result;
  const isTabs = mode === "tabs";

  const recopy = async (nextMode) => {
    if (!filtersByAhu) return;
    setBusy(true);
    try {
      await copyPackingSlipToClipboard(filtersByAhu, { mode: nextMode });
      onClose({ ...result, mode: nextMode, filtersByAhu });
    } catch (err) {
      console.error(err);
      alert("Could not copy. Allow clipboard access, then try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-base-100 border border-base-300 rounded-lg shadow-xl w-full max-w-lg p-4">
        <h2 className="text-lg font-bold">Copied {itemCount} line(s) for {ahuCount} AHU(s)</h2>

        {isTabs ? (
          <div className="mt-3 text-sm space-y-2">
            <p>
              Clipboard now has <strong>real Tab characters</strong>. In QuickBooks, click the first{" "}
              <strong>QTY</strong> cell and press <strong>Ctrl+V</strong>.
            </p>
            <p className="opacity-70">
              QuickBooks often still dumps this into one cell. If that happens, copy for Special
              Paste instead and use Ctrl+Alt+V.
            </p>
          </div>
        ) : (
          <div className="mt-3 text-sm space-y-2">
            <p className="text-error font-semibold">
              Do not press Ctrl+V. That pastes one blob into the cell you clicked.
            </p>
            <ol className="list-decimal ml-5 space-y-1">
              <li>Special Paste must be running (the AutoIt tray script)</li>
              <li>In QuickBooks, click the first <strong>QTY</strong> cell</li>
              <li>
                Press <strong>Ctrl+Alt+V</strong> (or Ctrl+Alt+P). That types each field and TABs.
              </li>
            </ol>
            <p className="opacity-70">Stop typing: Esc or Ctrl+Q</p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2 justify-end">
          {isTabs ? (
            <button
              type="button"
              className="btn btn-sm btn-outline"
              disabled={busy}
              onClick={() => recopy("special")}
            >
              Copy for Special Paste instead
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-outline"
              disabled={busy}
              onClick={() => recopy("tabs")}
            >
              Copy with real TABs (Ctrl+V)
            </button>
          )}
          <button type="button" className="btn btn-sm btn-primary" onClick={() => onClose(null)}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
