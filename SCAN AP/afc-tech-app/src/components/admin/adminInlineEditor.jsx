// adminInlineEditor.jsx
import { useEffect, useMemo, useState } from "react";
import { API } from "../../api/api";

const FREQUENCY_OPTIONS = [
  { label: "30 Days", value: 30 },
  { label: "60 Days", value: 60 },
  { label: "90 Days", value: 90 },
  { label: "180 Days", value: 180 },
  { label: "365 Days", value: 365 },
  { label: "18 Months", value: 540 },
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

const getRowStatus = (f) => {
  if (f?._inactive) {
    return { key: "inactive", label: "Inactive" };
  }

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
  if (diffDays <= 14) {
    return { key: "dueSoon", label: `Due Soon (${diffDays}d)` };
  }
  return { key: "ok", label: `OK (${diffDays}d)` };
};

const getFrequencyColor = (freqDays) => {
  if (!freqDays && freqDays !== 0) return null;
  const m = Number(freqDays);
  const map = {
    30: "#FFFF99",
    60: "#F2CEEF",
    90: "#CCFFFF",
    120: "#E5A065",
    180: "#C5E0B3",
    365: "#FBE4D5",
    540: "#F3F0D9",
    730: "#49BFBC",
    1095: "#FFD965",
  };

  return map[m] || null;
};

function AdminFilterEditorInline({ ahuId, isOpen, globalFilters, onSelectionChange }) {
  const [filters, setFilters] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState(new Set());
  const [confirmAction, setConfirmAction] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    setFilters([]);
    setLoaded(false);
    setLoading(false);
    setConfirmAction(null);
    setSelectedFilters(new Set());
  }, [ahuId]);

  useEffect(() => {
    if (!isOpen || loaded) return;

    const load = async () => {
      setLoading(true);
      try {
        const res = await API.get(`/admin/ahus/${ahuId}/filters?include_inactive=1`);
        setFilters(
          (Array.isArray(res.data) ? res.data : []).map((f) => ({
            ...f,
            sizeParts: parseSize(f.size),
            _inactive: f.is_active === false,
          }))
        );
        setLoaded(true);
      } catch (e) {
        console.error("Error loading filters:", e);
        showToast("Failed to load filters.", "error");
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

  const toggleFilterSelection = (filterId) => {
    setSelectedFilters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(filterId)) {
        newSet.delete(filterId);
      } else {
        newSet.add(filterId);
      }
      // Report selection change to parent
      if (onSelectionChange) {
        onSelectionChange(newSet);
      }
      return newSet;
    });
  };

  const activeCount = useMemo(
    () => filters.filter((f) => !f._inactive).length,
    [filters]
  );

  const filteredFilters = useMemo(() => {
    if (!globalFilters) return filters;

    return filters.filter((f) => {
      if (globalFilters.frequency !== "all") {
        const selectedFreq = Number(globalFilters.frequency);
        if (f.frequency_days !== selectedFreq) return false;
      }

      if (globalFilters.status !== "all") {
        const status = getRowStatus(f);
        const statusMap = {
          ok: "ok",
          due_soon: "dueSoon",
          overdue: "overdue",
          pending: "pending",
          inactive: "inactive",
        };
        if (status.key !== statusMap[globalFilters.status]) return false;
      }

      if (globalFilters.nextFrom || globalFilters.nextTo) {
        const nextDue = computeNextDueDate(f);
        if (!nextDue) {
          if (globalFilters.status !== "pending") return false;
        } else {
          const nextDueStr = nextDue.toISOString().split("T")[0];
          if (globalFilters.nextFrom && nextDueStr < globalFilters.nextFrom)
            return false;
          if (globalFilters.nextTo && nextDueStr > globalFilters.nextTo)
            return false;
        }
      }

      return true;
    });
  }, [filters, globalFilters]);

  const filteredActiveCount = useMemo(
    () => filteredFilters.filter((f) => !f._inactive).length,
    [filteredFilters]
  );

  if (!isOpen) return null;

  return (
    <div className="bg-base-50">
      {/* Header with counts and action buttons */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="text-xs opacity-70">
          <span className="font-semibold">{filteredActiveCount}</span> active
          <span className="ml-2 opacity-50">/ {filteredFilters.length} shown</span>
          {filteredFilters.length !== filters.length && (
            <span className="ml-2 text-warning">({filters.length} total)</span>
          )}
        </div>

        <div className="flex gap-1">
          <button
            type="button"
            className="btn btn-xs btn-ghost"
            onClick={addFilter}
          >
            + Add
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-4 text-center">
          <span className="loading loading-spinner loading-sm"></span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-xs w-full">
            <thead>
              <tr className="text-xs">
                <th className="px-1">✓</th>
                <th className="px-1">Phase</th>
                <th className="px-1">Part #</th>
                <th className="px-1">Size (inches)</th>
                <th className="px-1">Quantity</th>
                <th className="px-1">Frequency</th>
                <th className="px-1">Last</th>
                <th className="px-1">Next</th>
                <th className="px-1">Status</th>
                <th className="px-1">Save</th>
                <th className="px-1">Remove</th>
              </tr>
            </thead>

            <tbody>
              {filteredFilters.map((f) => {
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

                const freqColor = getFrequencyColor(f.frequency_days);
                const rowStyle = {};
                if (
                  !f._inactive &&
                  st.key !== "overdue" &&
                  st.key !== "dueSoon" &&
                  freqColor
                ) {
                  rowStyle.backgroundColor = freqColor;
                }

                return (
                  <tr key={f.id} className={rowClass} style={rowStyle}>
                    <td className="px-1 py-0.5">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        disabled={f._inactive}
                        checked={isSelected}
                        onChange={() => toggleFilterSelection(f.id)}
                      />
                    </td>

                    <td className="px-1 py-0.5">
                      <input
                        className="input input-xs input-bordered w-10"
                        value={f.phase}
                        onChange={(e) =>
                          updateFilter(f.id, "phase", e.target.value)
                        }
                        disabled={f._inactive}
                      />
                    </td>

                    <td className="px-1 py-0.5">
                      <input
                        className="input input-xs input-bordered w-32"
                        value={f.part_number}
                        onChange={(e) =>
                          updateFilter(f.id, "part_number", e.target.value)
                        }
                        disabled={f._inactive}
                      />
                    </td>

                    <td className="px-1 py-0.5">
                      <div className="flex gap-0.5">
                        {["h", "w", "d"].map((dim) => (
                          <input
                            key={dim}
                            type="number"
                            placeholder={dim.toUpperCase()}
                            className="input input-xs input-bordered w-10"
                            value={f.sizeParts?.[dim] || ""}
                            disabled={f._inactive}
                            onChange={(e) =>
                              updateFilter(f.id, `size.${dim}`, e.target.value)
                            }
                          />
                        ))}
                      </div>
                    </td>

                    <td className="px-1 py-0.5">
                      <input
                        type="number"
                        className="input input-xs input-bordered w-10"
                        value={f.quantity}
                        disabled={f._inactive}
                        onChange={(e) =>
                          updateFilter(f.id, "quantity", e.target.value)
                        }
                      />
                    </td>

                    <td className="px-1 py-0.5">
                      <select
                        className="select select-xs select-bordered w-20 text-xs"
                        value={f.frequency_days}
                        disabled={f._inactive}
                        onChange={(e) =>
                          updateFilter(f.id, "frequency_days", e.target.value)
                        }
                      >
                        {FREQUENCY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.value}d
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-1 py-0.5 text-xs">
                      {f.last_service_date
                        ? new Date(f.last_service_date).toLocaleDateString(
                            "en-US",
                            { month: "2-digit", day: "2-digit", year: "numeric" }
                          )
                        : "—"}
                    </td>

                    <td className="px-1 py-0.5 text-xs">
                      {nextDue
                        ? nextDue.toLocaleDateString("en-US", {
                            month: "2-digit",
                            day: "2-digit",
                            year: "numeric",
                          })
                        : "—"}
                    </td>

                    <td className="px-1 py-0.5">
                      {f._inactive ? (
                        <span className="badge badge-ghost badge-xs">
                          Inactive
                        </span>
                      ) : st.key === "overdue" ? (
                        <span className="badge badge-error badge-xs">
                          {st.label}
                        </span>
                      ) : st.key === "dueSoon" ? (
                        <span className="badge badge-warning badge-xs">
                          {st.label}
                        </span>
                      ) : st.key === "pending" ? (
                        <span className="badge badge-ghost badge-xs">
                          Pending
                        </span>
                      ) : (
                        <span className="badge badge-success badge-xs">
                          {st.label}
                        </span>
                      )}
                    </td>

                    <td className="px-1 py-0.5">
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
                            console.error("Filter save error:", err);
                            showToast("Save failed.", "error");
                          }
                        }}
                      >
                        Save
                      </button>
                    </td>

                    <td className="px-1 py-0.5">
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
                  </tr>
                );
              })}

              {filteredFilters.length === 0 && filters.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-3 opacity-70 text-xs">
                    No filters for this AHU.
                  </td>
                </tr>
              )}

              {filteredFilters.length === 0 && filters.length > 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-3 opacity-70 text-xs">
                    No filters match the current filters. Clear filters to see all{" "}
                    {filters.length} filter(s).
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="mt-1 text-xs opacity-60">
            <span className="badge badge-error badge-xs align-middle">Overdue</span> = past due,{" "}
            <span className="badge badge-warning badge-xs align-middle">Due Soon</span> = within 14 days,{" "}
            <span className="badge badge-info badge-xs align-middle">540 Days</span> = 18 Months
          </div>
        </div>
      )}

      {toast && (
        <div className="toast toast-center toast-middle z-9999">
          <div
            className={`alert text-xs ${
              toast.type === "success"
                ? "alert-success"
                : toast.type === "error"
                  ? "alert-error"
                  : toast.type === "warning"
                    ? "alert-warning"
                    : "alert-info"
            }`}
          >
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
                  Deactivate <strong>{confirmAction.filter.part_number}</strong>? It
                  will stay visible, but won't count for future schedules.
                </>
              ) : (
                <>
                  Reactivate <strong>{confirmAction.filter.part_number}</strong>? It
                  will count again for schedules.
                </>
              )}
            </p>

            <div className="modal-action">
              <button
                className="btn btn-outline"
                onClick={() => setConfirmAction(null)}
              >
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
                    console.error(`${mode} error:`, err);
                    showToast(
                      `${mode} failed. Check server logs.`,
                      "error"
                    );
                  }
                }}
              >
                {confirmAction.mode === "deactivate"
                  ? "Yes, Deactivate"
                  : "Yes, Reactivate"}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}

export default AdminFilterEditorInline;