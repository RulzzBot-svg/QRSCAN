import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAHUsForHospital } from "../../api/hospitals";
import { API } from "../../api/api";

function AHUPage() {
  const { hospitalId } = useParams();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [visible, setVisible] = useState(6);
  const [ahus, setAhus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Use admin endpoint which includes filter counts and status per AHU
    API.get("/admin/ahus")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        const filteredList = list.filter((a) => String(a.hospital_id) === String(hospitalId));
        setAhus(filteredList);
      })
      .catch((err) => {
        console.error("Error loading AHUs via admin endpoint", err);
      })
      .finally(() => setLoading(false));
  }, [hospitalId]);

  // Filter by ID or location
  const filtered = ahus.filter(
    (a) =>
      a.id.toLowerCase().includes(search.toLowerCase()) ||
      (a.location || "").toLowerCase().includes(search.toLowerCase())
  );

  const labelFor = (id) => {
    if (!id) return "";
    const idx = id.indexOf('-');
    return idx >= 0 ? id.slice(idx + 1) : id;
  };

  const formatDate = (iso) => {
    if (!iso) return "TBD";
    return new Date(iso).toLocaleDateString("en-US");
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
          onClick={() => navigate("/hospitals")}
        >
          ⬅ Back to Hospitals
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
                            {labelFor(ahu.id)}
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
