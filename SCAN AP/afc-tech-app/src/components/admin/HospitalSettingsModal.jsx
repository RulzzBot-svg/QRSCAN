import { useEffect, useState } from "react";
import { updateHospitalSettings } from "../../api/admin";

const emptyForm = {
  estimate_number: "",
  po_number: "",
  pricing_notes: "",
  changeout_interval_days: 90,
  changeouts_per_year: 4,
  changeouts_completed: 0,
  contract_year_start: "",
  contract_notes: "",
  city: "",
  address: "",
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
      pricing_notes: hospital.pricing_notes || "",
      changeout_interval_days: hospital.changeout_interval_days ?? 90,
      changeouts_per_year: hospital.changeouts_per_year ?? 4,
      changeouts_completed: hospital.changeouts_completed ?? 0,
      contract_year_start: hospital.contract_year_start
        ? String(hospital.contract_year_start).slice(0, 10)
        : "",
      contract_notes: hospital.contract_notes || "",
      city: hospital.city || "",
      address: hospital.address || "",
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
        ...form,
        changeout_interval_days: Number(form.changeout_interval_days) || 90,
        changeouts_per_year: Number(form.changeouts_per_year) || 4,
        changeouts_completed: Math.max(0, Number(form.changeouts_completed) || 0),
        contract_year_start: form.contract_year_start || null,
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
      <div className="modal-box max-w-lg">
        <h3 className="font-bold text-lg text-slate-800">{hospital.name}</h3>
        <p className="text-sm text-base-content/60 mb-4">Contract & changeout settings</p>

        <form onSubmit={handleSave} className="space-y-4">
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

          <div className="grid grid-cols-3 gap-3">
            <label className="form-control">
              <span className="label-text text-xs">Interval (days)</span>
              <input
                type="number"
                min={1}
                className="input input-sm input-bordered"
                value={form.changeout_interval_days}
                onChange={(e) => setField("changeout_interval_days", e.target.value)}
              />
            </label>
            <label className="form-control">
              <span className="label-text text-xs">Per year</span>
              <input
                type="number"
                min={1}
                className="input input-sm input-bordered"
                value={form.changeouts_per_year}
                onChange={(e) => setField("changeouts_per_year", e.target.value)}
              />
            </label>
            <label className="form-control">
              <span className="label-text text-xs">Completed</span>
              <input
                type="number"
                min={0}
                className="input input-sm input-bordered"
                value={form.changeouts_completed}
                onChange={(e) => setField("changeouts_completed", e.target.value)}
              />
            </label>
          </div>

          <label className="form-control">
            <span className="label-text text-xs">Contract year start</span>
            <input
              type="date"
              className="input input-sm input-bordered"
              value={form.contract_year_start}
              onChange={(e) => setField("contract_year_start", e.target.value)}
            />
          </label>

          <label className="form-control">
            <span className="label-text text-xs">Pricing (admin only)</span>
            <textarea
              className="textarea textarea-sm textarea-bordered"
              rows={2}
              value={form.pricing_notes}
              onChange={(e) => setField("pricing_notes", e.target.value)}
              placeholder="Rates / line pricing — not shown on main table"
            />
          </label>

          <label className="form-control">
            <span className="label-text text-xs">Notes</span>
            <textarea
              className="textarea textarea-sm textarea-bordered"
              rows={2}
              value={form.contract_notes}
              onChange={(e) => setField("contract_notes", e.target.value)}
              placeholder="Optional contract notes"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="form-control">
              <span className="label-text text-xs">City</span>
              <input
                className="input input-sm input-bordered"
                value={form.city}
                onChange={(e) => setField("city", e.target.value)}
              />
            </label>
            <label className="form-control">
              <span className="label-text text-xs">Address</span>
              <input
                className="input input-sm input-bordered"
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
              />
            </label>
          </div>

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
