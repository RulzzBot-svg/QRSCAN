import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { API } from "../../api/api";

function AHU() {
    const navigate = useNavigate();
    const { search } = useLocation();
    const params = new URLSearchParams(search);
    const ahuId = params.get("ahu") || params.get("id");

    const [loading, setLoading] = useState(false);
    const [ahu, setAhu] = useState(null);
    const [counts, setCounts] = useState({ filters: 0, overdue: 0, dueSoon: 0, ok: 0 });
    // Local filter UI state
    const [filterText, setFilterText] = useState("");
    const [filterPhase, setFilterPhase] = useState("");
    const [filterStatus, setFilterStatus] = useState("all"); // all | ok | dueSoon | overdue | pending | inactive
    const [filterNextFrom, setFilterNextFrom] = useState("");
    const [filterNextTo, setFilterNextTo] = useState("");
    const [filterMinQty, setFilterMinQty] = useState("");

    useEffect(() => {
        if (!ahuId) return;
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const res = await API.get(`/ahu/qr/${encodeURIComponent(ahuId)}`);
                if (cancelled) return;
                const data = res.data;
                setAhu(data);

                let filters = data.filters || [];
                let total = filters.length;
                let overdue = 0;
                let dueSoon = 0;
                let ok = 0;

                for (const f of filters) {
                    const s = (f.status || "").toLowerCase();
                    if (s === "overdue") overdue += 1;
                    else if (s === "due soon") dueSoon += 1;
                    else ok += 1;
                }

                setCounts({ filters: total, overdue, dueSoon, ok });
            } catch (err) {
                console.error("Failed to load AHU", ahuId, err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [ahuId]);

    if (!ahuId) {
        return (
            <div className="min-h-screen p-6" data-theme="corporate">
                <div className="card bg-base-100 p-6">
                    <h3 className="text-lg font-semibold">AHU Viewer</h3>
                    <p className="text-sm text-base-content/70 mt-2">Pass an AHU id in the query string, for example <span className="font-mono">/AHU?ahu=H1-ahu-main</span></p>
                    <div className="mt-4 flex gap-2">
                        <button className="btn" onClick={() => navigate('/hospitals')}>Back to Hospitals</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div data-theme="corporate" className="min-h-screen bg-base-200 p-4">
            <div className="max-w-3xl mx-auto">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">AHU: {ahuId}</h1>
                        <div className="text-sm opacity-70">{ahu?.hospital_name || ""} • {ahu?.location || ""}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`badge ${counts.ok > 0 ? 'badge-success' : 'badge-ghost'}`}>{counts.ok} OK</span>
                        {counts.overdue > 0 ? <span className="badge badge-error">{counts.overdue} overdue</span> : null}
                        {counts.dueSoon > 0 ? <span className="badge badge-warning">{counts.dueSoon} due soon</span> : null}
                        <span className="badge badge-ghost">{counts.filters} filters</span>
                    </div>
                </div>

                <div className="card bg-base-100 p-4">
                    {loading ? (
                        <div className="flex justify-center p-8"><span className="loading loading-spinner loading-lg"></span></div>
                    ) : (
                        <div>
                            <h3 className="font-semibold mb-2">Filters</h3>
                            {/* Filter controls */}
                            <div className="mb-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <input className="input input-sm input-bordered" placeholder="Filter by part, phase or size..." value={filterText} onChange={(e)=>setFilterText(e.target.value)} />
                                <input className="input input-sm input-bordered" placeholder="Phase" value={filterPhase} onChange={(e)=>setFilterPhase(e.target.value)} />
                                <select className="select select-sm select-bordered" value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value)}>
                                    <option value="all">Any status</option>
                                    <option value="ok">OK</option>
                                    <option value="dueSoon">Due Soon</option>
                                    <option value="overdue">Overdue</option>
                                    <option value="pending">Pending</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                                <input type="date" className="input input-sm input-bordered" value={filterNextFrom} onChange={(e)=>setFilterNextFrom(e.target.value)} />
                                <input type="date" className="input input-sm input-bordered" value={filterNextTo} onChange={(e)=>setFilterNextTo(e.target.value)} />
                                <input type="number" min="0" className="input input-sm input-bordered" placeholder="Min qty" value={filterMinQty} onChange={(e)=>setFilterMinQty(e.target.value)} />
                            </div>

                            <div className="space-y-2">
                                {((ahu?.filters || []).filter((f) => {
                                    // text filter
                                    const q = (filterText || "").trim().toLowerCase();
                                    if (q) {
                                        const hay = `${f.part_number || ""} ${f.phase || ""} ${f.size || ""}`.toLowerCase();
                                        if (!hay.includes(q)) return false;
                                    }

                                    if (filterPhase && !(String(f.phase || "").toLowerCase().includes(filterPhase.toLowerCase()))) return false;

                                    // status filter
                                    const st = (f.status || "").toLowerCase();
                                    if (filterStatus !== "all") {
                                        if (filterStatus === 'ok' && !(st === 'completed' || st === 'pending' || st === 'ok' || !st)) return false;
                                        if (filterStatus === 'dueSoon' && st !== 'due soon' && st !== 'dueSoon' && st !== 'due_soon') return false;
                                        if (filterStatus === 'overdue' && st !== 'overdue') return false;
                                        if (filterStatus === 'pending' && st !== 'pending') return false;
                                        if (filterStatus === 'inactive' && f.is_active !== false) return false;
                                    }

                                    // next due range
                                    if (filterNextFrom || filterNextTo) {
                                        const next = f.next_due_date ? new Date(f.next_due_date) : null;
                                        if (!next) return false;
                                        if (filterNextFrom && next < new Date(filterNextFrom)) return false;
                                        if (filterNextTo && next > new Date(filterNextTo)) return false;
                                    }

                                    if (filterMinQty) {
                                        const min = parseInt(filterMinQty, 10);
                                        if (!isNaN(min) && (Number(f.quantity) || 0) < min) return false;
                                    }

                                    return true;
                                })).map((f) => (
                                    <div key={f.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded">
                                        <div>
                                            <div className="font-semibold">{f.phase} — {f.part_number}</div>
                                            <div className="text-xs opacity-70">Size: {f.size} • Qty: {f.quantity}</div>
                                        </div>
                                        <div className="text-right mt-2 sm:mt-0">
                                            {f.status === 'Overdue' ? <span className="badge badge-error">Overdue</span> : null}
                                            {f.status === 'Due Soon' ? <span className="badge badge-warning">Due Soon</span> : null}
                                            {(!f.status || f.status === 'Completed' || f.status === 'Pending') ? <span className="badge badge-success">OK</span> : null}
                                            <div className="text-xs opacity-60 mt-1">Next: {f.next_due_date || '—'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AHU;
