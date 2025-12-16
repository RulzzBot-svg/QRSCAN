import { useEffect, useRef, useState } from "react";
import axios from "axios";

function AdminFilterEditor({ ahu, onClose }) {
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [filters, setFilters] = useState([]);

    useEffect(() => {
        axios
            .get(`/api/admin/ahus/${ahu.id}/filters`)
            .then(res => setFilters(res.data));
    }, [ahu.id]);

    const updateFilter = (id, field, value) => {
        setFilters(prev =>
            prev.map(f => {
                if (f.id !== id) return f;

                if (field.startsWith("size.")) {
                    const key = field.split(".")[1];
                    const newSizeParts = { ...f.sizeParts, [key]: value };

                    return {
                        ...f,
                        sizeParts: newSizeParts,
                        size: buildSize(newSizeParts)
                    };
                }

                return { ...f, [field]: value };
            })
        );
    };


    const saveFilter = async (filter) => {
        await axios.put(`/api/admin/filters/${filter.id}`, filter);
    };

    const addFilter = () => {
        setFilters([
            ...filters,
            { id: `new-${Date.now()}`, phase: "", part_number: "", size: "", quantity: 1 }
        ]);
    };

    const saveNew = async (filter) => {
        await axios.post(`/api/admin/ahus/${ahu.id}/filters`, filter);
    };

    const markForDelete = (filter) => {
        setFilters(prev =>
            prev.map(f =>
                f.id === filter.id
                    ? { ...f, _markedForDelete: true }
                    : f
            )
        );
    };


    const parseSize = (size) => {
        if (!size) return { h: "", w: "", d: "" };
        const [h, w, d] = size.split("x");
        return { h: h || "", w: w || "", d: d || "" };
    };

    const buildSize = ({ h, w, d }) => {
        if (!h || !w || !d) return "";
        return `${h}x${w}x${d}`;
    };


    useEffect(() => {
        axios.get(`/api/admin/ahus/${ahu.id}/filters`).then(res => setFilters(res.data.map(f => ({ ...f, sizeParts: parseSize(f.size) }))))
    }, [ahu.id]);


    return (
        <dialog className="modal modal-open">
            <div className="modal-box max-w-4xl">
                <h3 className="font-bold text-lg mb-4">
                    Edit Filters – {ahu.id}
                </h3>

                <table className="table table-sm">
                    <thead>
                        <tr>
                            <th>Phase</th>
                            <th>Part #</th>
                            <th>Size</th>
                            <th>Qty</th>
                            <th> </th>
                        </tr>
                    </thead>
                    <tbody>
                        {filters.map(f => (
                            <tr key={f.id} className={f._markedForDelete ? "opacity-50 line-through" : ""}>
                                <td>
                                    <input
                                        className="input input-xs input-bordered"
                                        value={f.phase}
                                        onChange={e => updateFilter(f.id, "phase", e.target.value)}
                                    />
                                </td>
                                <td>
                                    <input
                                        disabled={f._markedForDelete}
                                        className="input input-xs input-bordered"
                                        value={f.part_number}
                                        onChange={e => updateFilter(f.id, "part_number", e.target.value)}
                                    />
                                </td>
                                <td>
                                    <div className="flex gap-1">
                                        <input
                                            type="number"
                                            placeholder="H"
                                            className="input input-xs input-bordered w-14"
                                            value={f.sizeParts?.h || ""}
                                            disabled={f._markedForDelete}
                                            onChange={e =>
                                                updateFilter(f.id, "size.h", e.target.value)
                                            }
                                        />
                                        <span className="text-xs mt-1">x</span>
                                        <input
                                            type="number"
                                            placeholder="W"
                                            className="input input-xs input-bordered w-14"
                                            value={f.sizeParts?.w || ""}
                                            disabled={f._markedForDelete}
                                            onChange={e =>
                                                updateFilter(f.id, "size.w", e.target.value)
                                            }
                                        />
                                        <span className="text-xs mt-1">x</span>
                                        <input
                                            type="number"
                                            placeholder="D"
                                            className="input input-xs input-bordered w-14"
                                            value={f.sizeParts?.d || ""}
                                            disabled={f._markedForDelete}
                                            onChange={e =>
                                                updateFilter(f.id, "size.d", e.target.value)
                                            }
                                        />
                                    </div>

                                </td>
                                <td>
                                    <input
                                        type="number"
                                        className="input input-xs input-bordered w-16"
                                        value={f.quantity}
                                        onChange={e => updateFilter(f.id, "quantity", e.target.value)}
                                    />
                                </td>
                                <td>
                                    <button
                                        className="btn btn-xs btn-primary"
                                        onClick={() =>
                                            f.id.toString().startsWith("new")
                                                ? saveNew(f)
                                                : saveFilter(f)
                                        }
                                    >
                                        Save
                                    </button>
                                </td>
                                <td>
                                    <button className="btn btn-error btn-xs text-white" disabled={f._markedForDelete} onClick={() => setConfirmDelete(f)}>
                                        Delete 🗑️
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="modal-action">
                    <button className="btn btn-outline" onClick={addFilter}>
                        + Add Filter
                    </button>
                    <button
                        className="btn"
                        onClick={async () => {
                            // 1️⃣ Delete marked filters
                            const toDelete = filters.filter(f => f._markedForDelete && !f.id.toString().startsWith("new"));

                            for (const f of toDelete) {
                                await axios.delete(`/api/admin/filters/${f.id}`);
                            }

                            // 2️⃣ Save new filters that weren't deleted
                            const newOnes = filters.filter(
                                f => f.id.toString().startsWith("new") && !f._markedForDelete
                            );

                            for (const f of newOnes) {
                                await axios.post(`/api/admin/ahus/${ahu.id}/filters`, f);
                            }

                            onClose();
                        }}
                    >
                        Close & Save
                    </button>

                </div>
            </div>


            {confirmDelete && (
                <dialog className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg text-error">
                            Confirm Deletion
                        </h3>

                        <p className="py-3">
                            Are you sure you want to delete filter{" "}
                            <strong>{confirmDelete.part_number}</strong>?
                        </p>

                        <div className="modal-action">
                            <button
                                className="btn btn-outline"
                                onClick={() => setConfirmDelete(null)}
                            >
                                Cancel
                            </button>

                            <button
                                className="btn btn-error text-white"
                                onClick={() => {
                                    markForDelete(confirmDelete);
                                    setConfirmDelete(null);
                                }}
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </dialog>
            )}


        </dialog>







    );
}

export default AdminFilterEditor;
