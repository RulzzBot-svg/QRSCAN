import { useEffect, useState } from "react";
import { updateHospitalSettings } from "../../api/admin";

const emptyForm = {
  estimate_number: "",
  po_number: "",
  contract_year_start: "",
  contract_year_end: "",
  contract_notes: "",
};

function HospitalSettingsModal({ hospital, open, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!hospital || !open) return;
    setError(null);
    setForm({
      estimate_number: hospital.estimate_number || "",
      po_number: hospital.po_number || "",
      contract_year_start: hospital.contract_year_start
        ? String(hospital.contract_year_start).slice(0, 10)
        : "",
      contract_year_end: hospital.contract_year_end
        ? String(hospital.contract_year_end).slice(0, 10)
        : "",
      contract_notes: hospital.contract_notes || "",
    });
  }, [hospital, open]);

  if (!open || !hospital) return null;

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        estimate_number: form.estimate_number,
        po_number: form.po_number,
        contract_notes: form.contract_notes,
        contract_year_start: form.contract_year_start || null,
        contract_year_end: form.contract_year_end || null,
      };
      const res = await updateHospitalSettings(hospital.id, payload);
      onSaved?.(res.data);
      onClose?.();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-md">
        <h3 className="font-bold text-lg text-slate-800">{hospital.name}</h3>
        <p className="text-sm text-base-content/60 mb-4">Contract settings</p>

        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="form-control">
              <span className="label-text text-xs">Estimate #</span>
              <input
                className="input input-sm input-bordered"
                value={form.estimate_number}
                onChange={(e) => setField("estimate_number", e.target.value)}
                placeholder="QB estimate"
              />
            </label>
            <label className="form-control">
              <span className="label-text text-xs">PO #</span>
              <input
                className="input input-sm input-bordered"
                value={form.po_number}
                onChange={(e) => setField("po_number", e.target.value)}
                placeholder="Purchase order"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="form-control">
              <span className="label-text text-xs">Start date</span>
              <input
                type="date"
                className="input input-sm input-bordered"
                value={form.contract_year_start}
                onChange={(e) => setField("contract_year_start", e.target.value)}
              />
            </label>
            <label className="form-control">
              <span className="label-text text-xs">End date</span>
              <input
                type="date"
                className="input input-sm input-bordered"
                value={form.contract_year_end}
                onChange={(e) => setField("contract_year_end", e.target.value)}
              />
            </label>
          </div>

          <label className="form-control">
            <span className="label-text text-xs">Notes</span>
            <textarea
              className="textarea textarea-sm textarea-bordered"
              rows={3}
              value={form.contract_notes}
              onChange={(e) => setField("contract_notes", e.target.value)}
              placeholder="Optional notes"
            />
          </label>

          {error && (
            <div className="alert alert-error text-sm py-2">
              <span>{error}</span>
            </div>
          )}

          <div className="modal-action mt-2">
            <button type="button" className="btn btn-sm btn-ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>
              {saving ? <span className="loading loading-spinner loading-xs" /> : "Save"}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}

export default HospitalSettingsModal;
