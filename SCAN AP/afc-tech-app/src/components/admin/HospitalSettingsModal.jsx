import { useEffect, useState } from "react";
import {
  createHospitalClient,
  getHospitalClients,
  updateHospitalClient,
  updateHospitalSettings,
} from "../../api/admin";

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
  const [clients, setClients] = useState([]);
  const [clientsError, setClientsError] = useState(null);
  const [newClient, setNewClient] = useState({ name: "", username: "", pin: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!hospital || !open) return;
    setError(null);
    setClientsError(null);
    setNewClient({ name: "", username: "", pin: "" });
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
    getHospitalClients(hospital.id)
      .then((res) => setClients(Array.isArray(res.data) ? res.data : []))
      .catch(() => setClientsError("Could not load portal logins"));
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

  const handleCreateClient = async (e) => {
    e.preventDefault();
    setCreating(true);
    setClientsError(null);
    try {
      const res = await createHospitalClient(hospital.id, newClient);
      setClients((prev) => [...prev, res.data]);
      setNewClient({ name: "", username: "", pin: "" });
    } catch (err) {
      setClientsError(err?.response?.data?.error || "Could not create portal login");
    } finally {
      setCreating(false);
    }
  };

  const toggleClient = async (row) => {
    try {
      const res = await updateHospitalClient(row.id, { active: !row.active });
      setClients((prev) => prev.map((c) => (c.id === row.id ? res.data : c)));
    } catch (err) {
      setClientsError(err?.response?.data?.error || "Could not update portal login");
    }
  };

  const resetClientPin = async (row) => {
    const pin = window.prompt(`New PIN for ${row.username} (4+ characters)`);
    if (pin == null) return;
    if (String(pin).trim().length < 4) {
      setClientsError("PIN must be at least 4 characters");
      return;
    }
    try {
      const res = await updateHospitalClient(row.id, { pin: String(pin).trim() });
      setClients((prev) => prev.map((c) => (c.id === row.id ? res.data : c)));
      setClientsError(null);
    } catch (err) {
      setClientsError(err?.response?.data?.error || "Could not update PIN");
    }
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-lg">
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

        <div className="divider my-4">Hospital portal</div>
        <p className="text-xs text-base-content/60 mb-3">
          These logins see this hospital only: unit status, next due, and graphs. No prices or invoices.
          Share <code className="text-[11px]">/client/login</code> with them.
        </p>

        {clientsError ? (
          <div className="alert alert-warning text-xs py-2 mb-3">{clientsError}</div>
        ) : null}

        <ul className="space-y-1 mb-3">
          {clients.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-2 text-sm">
              <div>
                <span className="font-medium">{row.name}</span>
                <span className="text-base-content/50 ml-2">{row.username}</span>
              </div>
              <div className="flex gap-1 shrink-0">
                <button type="button" className="btn btn-xs btn-ghost" onClick={() => resetClientPin(row)}>
                  Reset PIN
                </button>
                <button
                  type="button"
                  className={`btn btn-xs ${row.active ? "btn-ghost" : "btn-success"}`}
                  onClick={() => toggleClient(row)}
                >
                  {row.active ? "Deactivate" : "Reactivate"}
                </button>
              </div>
            </li>
          ))}
          {clients.length === 0 ? (
            <li className="text-xs text-base-content/50">No portal logins yet.</li>
          ) : null}
        </ul>

        <form onSubmit={handleCreateClient} className="grid grid-cols-2 gap-2">
          <input
            className="input input-xs input-bordered col-span-2"
            placeholder="Contact name"
            value={newClient.name}
            onChange={(e) => setNewClient((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <input
            className="input input-xs input-bordered"
            placeholder="username"
            value={newClient.username}
            onChange={(e) => setNewClient((p) => ({ ...p, username: e.target.value }))}
            required
          />
          <input
            className="input input-xs input-bordered"
            placeholder="PIN (4+)"
            value={newClient.pin}
            onChange={(e) => setNewClient((p) => ({ ...p, pin: e.target.value }))}
            required
          />
          <button type="submit" className="btn btn-xs btn-outline col-span-2" disabled={creating}>
            {creating ? "Saving…" : "Add portal login"}
          </button>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}

export default HospitalSettingsModal;
