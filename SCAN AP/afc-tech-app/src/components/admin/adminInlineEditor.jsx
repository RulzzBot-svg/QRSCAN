// adminInlineEditor.jsx
import { useEffect, useMemo, useState } from "react";
import { API } from "../../api/api";

const FREQUENCY_OPTIONS = [
  { label: "30 Days", value: 30 },
  { label: "60 Days", value: 60 },
  { label: "90 Days", value: 90 },
  { label: "180 Days", value: 180 },
  { label: "365 Days", value: 365 },
];

const parseSize = (size) => {
  if (!size) return { h: "", w: "", d: "" };
  const [h, w, d] = String(size).split("x");
  return { h: h || "", w: w || "", d: d || "" };
};

const buildSize = ({ h, w, d }) => {
  if (!h || !w || !d) return "";
  return `${h}x${w}x${d}`;
};

// ------------------------------------------------------
// Date/status helpers (frontend-only overdue highlighting)
// ------------------------------------------------------
const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const computeNextDueDate = (f) => {
  if (!f?.last_service_date || !f?.frequency_days) return null;

  const last = new Date(f.last_service_date);
  if (Number.isNaN(last.getTime())) return null;

  const next = new Date(last);
  next.setDate(next.getDate() + Number(f.frequency_days));
  return next;
};

const formatDate = (d) => (d ? d.toLocaleDateString() : "—");

const getRowStatus = (f) => {
  // Inactive always stays muted
  if (f?._inactive) {
    return { key: "inactive", label: "Inactive" };
  }

  // Can't compute due date without last_service_date/frequency_days
  const nextDue = computeNextDueDate(f);
  if (!nextDue) {
    return { key: "pending", label: "Pending" };
  }

  const today = startOfDay(new Date());
  const due = startOfDay(nextDue);
  const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { key: "overdue", label: `Overdue (${Math.abs(diffDays)}d)` };
  }
  if (diffDays <= 7) {
    return { key: "dueSoon", label: `Due Soon (${diffDays}d)` };
  }
  return { key: "ok", label: `OK (${diffDays}d)` };
};

function AdminFilterEditorInline({ ahuId, isOpen }) {
  const [filters, setFilters] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  // { mode: "deactivate" | "reactivate", filter: FilterRow } | null
  const [confirmAction, setConfirmAction] = useState(null);

  const [toast, setToast] = useState(null);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 1600);
  };

  // ✅ IMPORTANT FOR OPTION 3:
  // When selecting a different AHU in the right panel, we must reset and reload.
  useEffect(() => {
    setFilters([]);
    setLoaded(false);
    setLoading(false);
    setConfirmAction(null);
  }, [ahuId]);

  // Lazy-load only when opened
  useEffect(() => {
    if (!isOpen || loaded) return;

    const load = async () => {
      setLoading(true);
      try {
        // NOTE: backend currently doesn't read include_inactive, but it still returns inactive rows
        // because you aren't filtering by active_only=1. Leaving this as-is to avoid backend changes.
        const res = await API.get(`/admin/ahus/${ahuId}/filters?include_inactive=1`);
        setFilters(
          (Array.isArray(res.data) ? res.data : []).map((f) => ({
            ...f,
            sizeParts: parseSize(f.size),
            _inactive: f.is_active === false, // derive UI from DB
          }))
        );
        setLoaded(true);
      } catch (e) {
        console.error(e);
        showToast("Failed to load filters.", "info");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [ahuId, isOpen, loaded]);

  const updateFilter = (id, field, value) => {
    setFilters((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;

        if (field.startsWith("size.")) {
          const key = field.split(".")[1];
          const newSizeParts = { ...f.sizeParts, [key]: value };
          return { ...f, sizeParts: newSizeParts, size: buildSize(newSizeParts) };
        }

        return { ...f, [field]: value };
      })
    );
  };

  const setInactiveUI = (id, inactive) => {
    setFilters((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, _inactive: inactive, is_active: !inactive } : f
      )
    );
  };

  const saveFilter = async (filter) => {
    const payload = {
      phase: filter.phase,
      part_number: filter.part_number,
      size: filter.size,
      quantity: Number(filter.quantity),
      frequency_days: Number(filter.frequency_days),
    };

    await API.put(`/admin/filters/${filter.id}`, payload);
    showToast("Saved.", "success");
  };

  const saveNew = async (filter) => {
    const payload = {
      phase: filter.phase,
      part_number: filter.part_number,
      size: filter.size,
      quantity: Number(filter.quantity),
      frequency_days: Number(filter.frequency_days),
    };

    await API.post(`/admin/ahus/${ahuId}/filters`, payload);
    showToast("Filter added.", "success");

    // Force a reload so we get the real DB id
    setLoaded(false);
  };

  const addFilter = () => {
    setFilters((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        phase: "",
        part_number: "",
        size: "",
        sizeParts: { h: "", w: "", d: "" },
        quantity: 1,
        frequency_days: 90,
        is_active: true,
        _inactive: false,
        _isNew: true,
      },
    ]);
    showToast("New filter row added. Fill it out and hit Save.", "success");
  };

  const deactivateFilter = async (filter) => {
    if (!filter) return;

    // unsaved row? just remove it
    if (String(filter.id).startsWith("new-")) {
      setFilters((prev) => prev.filter((x) => x.id !== filter.id));
      showToast("Unsaved filter removed.", "info");
      return;
    }

    await API.patch(`/admin/filters/${filter.id}/deactivate`);
    setInactiveUI(filter.id, true);
    showToast("Filter deactivated.", "success");
  };

  const reactivateFilter = async (filter) => {
    if (!filter) return;

    await API.patch(`/admin/filters/${filter.id}/reactivate`);
    setInactiveUI(filter.id, false);
    showToast("Filter reactivated.", "success");
  };

  const activeCount = useMemo(
    () => filters.filter((f) => !f._inactive).length,
    [filters]
  );

  if (!isOpen) return null;

  return (
    <div className="bg-base-100 border border-base-300 rounded-lg p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-sm opacity-80">
          Active Filters: <span className="font-semibold">{activeCount}</span>
          <span className="ml-2 opacity-60">/ Total: {filters.length}</span>
        </div>

        <button type="button" className="btn btn-xs btn-outline" onClick={addFilter}>
          + Add Filter
        </button>
      </div>

      {loading ? (
        <div className="py-6 text-center">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm w-full">
            <thead>
              <tr>
                <th>Phase</th>
                <th>Part</th>
                <th>Size</th>
                <th>Qty</th>
                <th>Frequency</th>
                <th>Last Serviced</th>
                <th>Next Due</th>
                <th>Save</th>
                <th>Actions</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filters.map((f) => {
                const st = getRowStatus(f);
                const nextDue = computeNextDueDate(f);

                const rowClass = f._inactive
                  ? "opacity-40 italic"
                  : st.key === "overdue"
                  ? "bg-error/15 border-l-4 border-l-error"
                  : st.key === "dueSoon"
                  ? "bg-warning/10 border-l-4 border-l-warning"
                  : f._isNew
                  ? "bg-primary/5"
                  : "";

                return (
                  <tr key={f.id} className={rowClass}>
                    <td>
                      <input
                        className="input input-xs input-bordered"
                        value={f.phase}
                        onChange={(e) => updateFilter(f.id, "phase", e.target.value)}
                        disabled={f._inactive}
                      />
                    </td>

                    <td>
                      <input
                        className="input input-xs input-bordered"
                        value={f.part_number}
                        onChange={(e) => updateFilter(f.id, "part_number", e.target.value)}
                        disabled={f._inactive}
                      />
                    </td>

                    <td>
                      <div className="flex gap-1">
                        {["h", "w", "d"].map((dim) => (
                          <input
                            key={dim}
                            type="number"
                            placeholder={dim.toUpperCase()}
                            className="input input-xs input-bordered w-14"
                            value={f.sizeParts?.[dim] || ""}
                            disabled={f._inactive}
                            onChange={(e) => updateFilter(f.id, `size.${dim}`, e.target.value)}
                          />
                        ))}
                      </div>
                    </td>

                    <td>
                      <input
                        type="number"
                        className="input input-xs input-bordered w-16"
                        value={f.quantity}
                        disabled={f._inactive}
                        onChange={(e) => updateFilter(f.id, "quantity", e.target.value)}
                      />
                    </td>

                    <td>
                      <select
                        className="select select-xs select-bordered"
                        value={f.frequency_days}
                        disabled={f._inactive}
                        onChange={(e) => updateFilter(f.id, "frequency_days", e.target.value)}
                      >
                        {FREQUENCY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="text-xs">
                      {f.last_service_date
                        ? new Date(f.last_service_date).toLocaleDateString()
                        : "Never"}
                    </td>

                    <td className="text-xs">{formatDate(nextDue)}</td>

                    <td>
                      <button
                        type="button"
                        className="btn btn-xs btn-primary"
                        disabled={f._inactive}
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            if (f._isNew) await saveNew(f);
                            else await saveFilter(f);
                          } catch (err) {
                            console.error(err);
                            showToast("Save failed. Check server logs.", "info");
                          }
                        }}
                      >
                        Save
                      </button>
                    </td>

                    <td>
                      {!f._inactive ? (
                        <button
                          type="button"
                          className="btn btn-xs btn-warning"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmAction({ mode: "deactivate", filter: f });
                          }}
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-xs btn-success text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmAction({ mode: "reactivate", filter: f });
                          }}
                        >
                          Reactivate
                        </button>
                      )}
                    </td>

                    <td>
                      {f._inactive ? (
                        <span className="badge badge-ghost badge-sm text-xs whitespace-nowrap">Inactive</span>
                      ) : st.key === "overdue" ? (
                        <span className="badge badge-error badge-md text-sx whitespace-nowrap">{st.label}</span>
                      ) : st.key === "dueSoon" ? (
                        <span className="badge badge-warning badge-md text-sx whitespace-nowrap">{st.label}</span>
                      ) : st.key === "pending" ? (
                        <span className="badge badge-ghost badge-md text-sx whitespace-nowrap">Pending</span>
                      ) : (
                        <span className="badge badge-success badge-md text-white text-xs whitespace-nowrap">{st.label}</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filters.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-6 opacity-70">
                    No filters found for this AHU.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="mt-3 text-xs opacity-70">
            <div className="mt-1">
              <span className="badge badge-error align-middle">Overdue</span>{" "}
              is any Next Due date before today.{" "}
              <span className="badge badge-warning align-middle">Due Soon</span>{" "}
              is Next Due within 7 days.
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast toast-center toast-middle z-9999">
          <div className={`alert ${toast.type === "success" ? "alert-success" : "alert-info"}`}>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {confirmAction && (
        <dialog open className="modal">
          <div className="modal-box">
            <h3 className="font-bold text-lg">
              {confirmAction.mode === "deactivate" ? (
                <span className="text-warning">Deactivate Filter</span>
              ) : (
                <span className="text-success">Reactivate Filter</span>
              )}
            </h3>

            <p className="py-3">
              {confirmAction.mode === "deactivate" ? (
                <>
                  Deactivate <strong>{confirmAction.filter.part_number}</strong>? It will stay visible,
                  but won’t count for future schedules.
                </>
              ) : (
                <>
                  Reactivate <strong>{confirmAction.filter.part_number}</strong>? It will count again for schedules.
                </>
              )}
            </p>

            <div className="modal-action">
              <button className="btn btn-outline" onClick={() => setConfirmAction(null)}>
                Cancel
              </button>

              <button
                className={
                  confirmAction.mode === "deactivate"
                    ? "btn btn-warning"
                    : "btn btn-success text-white"
                }
                onClick={async () => {
                  const { mode, filter } = confirmAction;
                  setConfirmAction(null);

                  try {
                    if (mode === "deactivate") await deactivateFilter(filter);
                    else await reactivateFilter(filter);
                  } catch (err) {
                    console.error(err);
                    showToast(`${mode} failed. Check server logs.`, "info");
                  }
                }}
              >
                {confirmAction.mode === "deactivate" ? "Yes, Deactivate" : "Yes, Reactivate"}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}

export default AdminFilterEditorInline;
