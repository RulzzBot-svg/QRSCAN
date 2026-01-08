import { useEffect, useMemo, useState } from "react";
import { API } from "../../api/api";

const FREQUENCY_OPTIONS = [
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

const computeNextDue = (f) => {
    if (!f.last_service_date || !f.frequency_days) return "—";
    const last = new Date(f.last_service_date);
    last.setDate(last.getDate() + Number(f.frequency_days));
    return last.toLocaleDateString();
};

function AdminFilterEditorInline({ ahuId, isOpen }) {
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [filters, setFilters] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [loading, setLoading] = useState(false);

    const [toast, setToast] = useState(null);

    const showToast = (message, type = "info") => {
        setToast({ message, type });
        window.clearTimeout(showToast._t);
        showToast._t = window.setTimeout(() => setToast(null), 1600);
    };


    // Lazy-load only when opened (first time)
    useEffect(() => {
        if (!isOpen || loaded) return;

        const load = async () => {
            setLoading(true);
            const res = await API.get(`/admin/ahus/${ahuId}/filters`);
            setFilters(
                (Array.isArray(res.data) ? res.data : []).map((f) => ({
                    ...f,
                    sizeParts: parseSize(f.size),
                    _inactive: false,
                }))
            );
            setLoaded(true);
            setLoading(false);
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

    const saveFilter = async (filter) => {
        await API.put(`/admin/filters/${filter.id}`, filter);
    };

    const saveNew = async (filter) => {
        await API.post(`/admin/ahus/${ahuId}/filters`, filter);
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
                _isNew: true,
            },
        ]);
        showToast("New Filter row added. Fill it out and hit Save.", "success");
    };

    const markInactive = (filter) => {
        setFilters((prev) => prev.map((f) => (f.id === filter.id ? { ...f, _inactive: true } : f)));
    };

    const activeCount = useMemo(
        () => filters.filter((f) => !f._inactive).length,
        [filters]
    );

    if (!isOpen) return null;

    return (
        <div className="mt-3 bg-base-100 border border-base-300 rounded-lg p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="text-sm opacity-80">
                    Filters: <span className="font-semibold">{activeCount}</span>
                </div>

                <button className="btn btn-xs btn-outline" onClick={addFilter}>
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
                                <th>Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filters.map((f) => (
                                <tr
                                    key={f.id}
                                    className={
                                        f._inactive ? "opacity-40 italic" : f._isNew ? "bg-primary/5" : ""
                                    }
                                >
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
                                        {f.last_service_date ? new Date(f.last_service_date).toLocaleDateString() : "Never"}
                                    </td>

                                    <td className="text-xs">{computeNextDue(f)}</td>

                                    <td>
                                        <button
                                            className="btn btn-xs btn-primary"
                                            disabled={f._inactive}
                                            onClick={() => (f._isNew ? saveNew(f) : saveFilter(f))}
                                        >
                                            Save
                                        </button>
                                    </td>

                                    <td>
                                        {f._inactive ? (
                                            <span className="badge badge-ghost">Inactive</span>
                                        ) : (
                                            <button
                                                className="btn btn-xs btn-error text-white"
                                                onClick={() => setConfirmDelete(f)}
                                            >
                                                Deactivate
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}

                            {filters.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="text-center py-6 opacity-70">
                                        No filters found for this AHU.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {toast && (
                <div className="toast toast-center toast-middle z-9999">
                    <div className={`alert ${toast.type === "success" ? "alert-success" : "alert-info"}`}>
                        <span>{toast.message}</span>
                    </div>
                </div>
            )}

            {confirmDelete && (
                <dialog className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg text-warning">Deactivate Filter</h3>

                        <p className="py-3">
                            This will remove <strong>{confirmDelete.part_number}</strong> from future schedules but keep historical data.
                        </p>

                        <div className="modal-action">
                            <button className="btn btn-outline" onClick={() => setConfirmDelete(null)}>
                                Cancel
                            </button>

                            <button
                                className="btn btn-warning"
                                onClick={() => {
                                    markInactive(confirmDelete);
                                    setConfirmDelete(null);
                                }}
                            >
                                Deactivate
                            </button>
                        </div>
                    </div>
                </dialog>
            )}


        </div>
    );
}

export default AdminFilterEditorInline;
