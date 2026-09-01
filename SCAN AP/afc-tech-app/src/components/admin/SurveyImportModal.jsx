import { useEffect, useRef, useState } from "react";
import { importSurveyWorkbook } from "../../api/admin";

const ACCEPT =
  ".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12";

function importErrorMessage(err) {
  const data = err?.response?.data;
  if (typeof data?.error === "string" && data.error) return data.error;
  if (err?.code === "ECONNABORTED") return "Import timed out. Try one sheet or a smaller workbook.";
  if (err?.message) return err.message;
  return "Import failed.";
}

export default function SurveyImportModal({
  open,
  onClose,
  hospitals = [],
  selectedHospitalKey,
  onImported,
}) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [hospitalId, setHospitalId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open) return;
    setError("");
    setResult(null);
    setBusy(false);
    setHospitalId(selectedHospitalKey ? String(selectedHospitalKey) : "");
  }, [open, selectedHospitalKey]);

  if (!open) return null;

  const close = () => {
    if (busy) return;
    setFile(null);
    setResult(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose?.();
  };

  const pickFile = (next) => {
    setFile(next || null);
    setResult(null);
    setError("");
  };

  const runImport = async (dryRun) => {
    if (!file) {
      setError("Choose an Excel file from Documents first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await importSurveyWorkbook(file, {
        dryRun,
        hospitalId: hospitalId || undefined,
      });
      setResult(res.data || null);
      if (!dryRun) {
        await onImported?.();
      }
    } catch (err) {
      console.error("Survey import failed", err);
      setResult(null);
      setError(importErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const stats = result;
  const willCreateAhus = (stats?.ahus_created || 0) > 0;
  const applied = stats && stats.dry_run === false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-base-100 border border-base-300 rounded-lg w-full max-w-xl max-h-[90vh] overflow-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Import survey Excel</div>
          <button className="btn btn-sm" onClick={close} type="button" disabled={busy}>
            Close
          </button>
        </div>

        <p className="text-sm opacity-80 mb-3">
          Upload the hospital workbook from Documents. Existing AHUs are matched by name and
          building, and filters by phase, part number, and size. Rows missing from the sheet are
          not deleted.
        </p>

        <div className="space-y-3">
          <div>
            <label className="label py-1">
              <span className="label-text">Hospital to update</span>
            </label>
            <select
              className="select select-sm select-bordered w-full"
              value={hospitalId}
              onChange={(e) => setHospitalId(e.target.value)}
              disabled={busy}
            >
              <option value="">Use name in Excel cell B2</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
            <div className="text-xs opacity-70 mt-1">
              Pick the hospital already in Admin AHUs so B2 cannot create a duplicate.
            </div>
          </div>

          <div>
            <label className="label py-1">
              <span className="label-text">Workbook (.xlsx or .xlsm)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              className="file-input file-input-sm file-input-bordered w-full"
              disabled={busy}
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            {file ? (
              <div className="text-xs mt-1">
                {file.name} ({Math.max(1, Math.round(file.size / 1024))} KB)
              </div>
            ) : null}
          </div>
        </div>

        {error ? <div className="alert alert-error text-sm mt-3 py-2">{error}</div> : null}

        {stats ? (
          <div className="mt-3 p-3 border rounded-lg text-sm space-y-1">
            <div className="font-medium">
              {stats.dry_run ? "Preview (not saved yet)" : "Import saved"}
            </div>
            <div>
              Hospital: {stats.hospital || "—"}
              {stats.excel_hospital_name && stats.excel_hospital_name !== stats.hospital
                ? ` (Excel B2: ${stats.excel_hospital_name})`
                : ""}
            </div>
            <div>
              AHUs updated {stats.ahus_updated ?? 0} · created {stats.ahus_created ?? 0} ·
              filters upserted {stats.filters_upserted ?? 0}
            </div>
            <div className="opacity-70">
              Sheets {stats.sheets_processed ?? 0}
              {(stats.sheets_skipped || []).length
                ? ` · skipped ${(stats.sheets_skipped || []).map((s) => s.sheet).join(", ")}`
                : ""}
              {` · rows ${stats.rows_seen ?? 0}`}
            </div>
            {willCreateAhus ? (
              <div className="text-warning">
                {stats.ahus_created} new AHU{stats.ahus_created === 1 ? "" : "s"} will be added.
                If you expected only updates, check hospital and AHU names.
              </div>
            ) : null}
            {(stats.warnings || []).map((w) => (
              <div key={w} className="text-warning">
                {w}
              </div>
            ))}
            {applied ? (
              <div className="text-success">AHU list refreshed with the new survey data.</div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2 justify-end">
          <button
            className="btn btn-sm"
            type="button"
            disabled={busy || !file}
            onClick={() => runImport(true)}
          >
            {busy ? "Working…" : "Preview"}
          </button>
          <button
            className="btn btn-sm btn-primary"
            type="button"
            disabled={busy || !file}
            onClick={() => runImport(false)}
          >
            Apply import
          </button>
        </div>
      </div>
    </div>
  );
}
