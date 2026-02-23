import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAHUsForHospital } from "../../api/hospitals";
import { API } from "../../api/api";
import { dbPromise } from "../../offline/db";
import { formatDate } from "../../utils/dates";

function AHUPage() {
  const { hospitalId, buildingId } = useParams();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [visible, setVisible] = useState(6);
  const [ahus, setAhus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all"); // all | Overdue | Due Soon | Completed | Pending
  const [minFilters, setMinFilters] = useState("");
  const [nextFrom, setNextFrom] = useState("");
  const [nextTo, setNextTo] = useState("");

  useEffect(() => {
    setLoading(true);
    // Use ahus endpoint which includes filter counts and status per AHU
    (async () => {
      try {
        const res = await API.get("/ahus");
        const list = Array.isArray(res.data) ? res.data : [];
        let filteredList = list.filter((a) => String(a.hospital_id) === String(hospitalId));
        if (buildingId) {
          filteredList = filteredList.filter((a) => String(a.building_id) === String(buildingId));
        }
        setAhus(filteredList);
      } catch (err) {
        console.warn("Online ahus endpoint failed, falling back to local cache", err);
        try {
          const db = await dbPromise;
          const all = await db.getAll("ahuCache");
          let localList = (all || []).filter((a) => String(a.hospital_id) === String(hospitalId));
          if (buildingId) {
            localList = localList.filter((a) => String(a.building_id) === String(buildingId));
          }
          setAhus(localList);
        } catch (e) {
          console.error("Failed to load AHUs from local cache", e);
          setAhus([]);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [hospitalId, buildingId]);

  // Filter by ID (coerce to string) or location + additional filters
  const filtered = ahus.filter((a) => {
    const idStr = String(a.id || "");
    const loc = String(a.location || "");
    const nameStr = String(a.name || "");
    if (!(idStr.toLowerCase().includes(search.toLowerCase()) || loc.toLowerCase().includes(search.toLowerCase()) || nameStr.toLowerCase().includes(search.toLowerCase()))) return false;

    if (statusFilter !== "all") {
      if (!a.status || String(a.status).toLowerCase() !== String(statusFilter).toLowerCase()) return false;
    }

    if (minFilters) {
      const m = parseInt(minFilters, 10);
      if (!isNaN(m) && (a.filters_count || 0) < m) return false;
    }

    if (nextFrom || nextTo) {
      const nd = a.next_due_date ? new Date(a.next_due_date) : null;
      if (!nd) return false;
      if (nextFrom && nd < new Date(nextFrom)) return false;
      if (nextTo && nd > new Date(nextTo)) return false;
    }

    return true;
  });

  // Prefer the human-friendly name when available; otherwise format id
  const labelFor = (ahu) => {
    if (!ahu) return "";
    if (ahu.name) return ahu.name;
    const idStr = String(ahu.id || "");
    const idx = idStr.indexOf("-");
    return idx >= 0 ? idStr.slice(idx + 1) : idStr;
  };

  const formatDateLocal = (iso) => {
    if (!iso) return "TBD";
    return formatDate(iso, 'en-US');
  };

  const statusBadge = (status) => {
    switch (status) {
      case "Overdue":
        return "badge badge-error";
      case "Due Soon":
        return "badge badge-warning";
      case "Completed":
        return "badge badge-success";
      case "Pending":
        return "badge badge-info";
      default:
        return "badge";
    }
  };

  return (
    <div data-theme="corporate" className="min-h-screen bg-base-200 p-4">
      <div className="max-w-6xl mx-auto">

        {/* Back */}
        <button
          className="btn btn-ghost mb-3"
          onClick={() => buildingId ? navigate(`/buildings/${hospitalId}`) : navigate("/hospitals")}
        >
          {buildingId ? "⬅ Back to Buildings" : "⬅ Back to Hospitals"}
        </button>

        {/* Header */}
        <h1 className="text-3xl font-bold text-primary">
          AHU Units
        </h1>
        <p className="text-sm text-base-content/70">
          Hospital ID: {hospitalId}
        </p>

        {/* Search */}
        <div className="form-control my-4 relative">
          <input
            type="text"
            placeholder="Search by AHU ID or location..."
            className="input input-bordered w-full pr-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/60">
            🔍
          </span>
        </div>

        {/* Extra filters */}
        <div className="flex gap-2 items-center mb-3">
          <select className="select select-sm select-bordered" value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)}>
            <option value="all">Any status</option>
            <option value="Overdue">Overdue</option>
            <option value="Due Soon">Due Soon</option>
            <option value="Completed">Completed</option>
            <option value="Pending">Pending</option>
          </select>
          <input type="number" min="0" className="input input-sm input-bordered w-28" placeholder="Min filters" value={minFilters} onChange={(e)=>setMinFilters(e.target.value)} />
          <input type="date" className="input input-sm input-bordered" value={nextFrom} onChange={(e)=>setNextFrom(e.target.value)} />
          <input type="date" className="input input-sm input-bordered" value={nextTo} onChange={(e)=>setNextTo(e.target.value)} />
          <button className="btn btn-xs btn-ghost ml-auto" onClick={()=>{setStatusFilter('all'); setMinFilters(''); setNextFrom(''); setNextTo(''); setSearch('');}}>Clear</button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center my-10">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        )}

        {/* AHU Cards */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.slice(0, visible).map((ahu) => (
              <div
                key={ahu.id}
                onClick={() => navigate(`/FilterInfo/${ahu.id}`)}
                className="card bg-base-100 border border-base-300 shadow-sm hover:shadow-md hover:border-primary transition-all cursor-pointer"
              >
                <div className="card-body p-4">

                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div>
                        <h2 className="card-title text-lg text-primary">
                          {labelFor(ahu)}
                        </h2>
                        <p className="text-sm text-base-content/70">
                          📍 {ahu.location || "Unknown location"}
                        </p>

                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {ahu.overdue_count > 0 ? (
                          <span className="badge badge-error badge-sm">{ahu.overdue_count} overdue</span>
                        ) : null}

                        {ahu.due_soon_count > 0 ? (
                          <span className="badge badge-warning badge-sm">{ahu.due_soon_count} due soon</span>
                        ) : null}

                        <span className="badge badge-ghost badge-sm">{ahu.filters_count ?? 0} filters</span>
                        {ahu.status ? (
                          <span className={`${statusBadge(ahu.status)} badge-sm ml-1`}>{ahu.status}</span>
                        ) : null}
                      </div>
                    </div>

                    <span className={statusBadge(ahu.status)}>
                      {ahu.status}
                    </span>
                  </div>

                  {/* Status Details */}
                  <div className="mt-3 text-xs text-base-content/60 space-y-1">
                    {ahu.status === "Overdue" && (
                      <p>⚠ Overdue by {ahu.days_overdue} days</p>
                    )}

                    {ahu.status === "Due Soon" && (
                      <p>⏳ Due in {ahu.days_until_due} days</p>
                    )}

                    {ahu.status === "Completed" && ahu.next_due_date && (
                      <p>✅ Next service: {formatDate(ahu.next_due_date)}</p>
                    )}

                    {ahu.status === "Pending" && (
                      <p>🆕 No service history</p>
                    )}
                  </div>

                  <div className="divider my-3"></div>

                  {/* CTA */}
                  <button className="btn btn-primary btn-sm w-full pointer-events-none">
                    Open Checklist
                  </button>

                </div>
              </div>
            ))}

            {/* Empty State */}
            {filtered.length === 0 && (
              <div className="col-span-full text-center text-base-content/60 mt-8">
                No AHUs match your search.
              </div>
            )}
          </div>
        )}

        {/* Load More */}
        {visible < filtered.length && (
          <div className="mt-6 flex justify-center">
            <button
              className="btn btn-outline btn-primary w-full max-w-xs"
              onClick={() => setVisible((v) => v + 6)}
            >
              Load More AHUs
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default AHUPage;
