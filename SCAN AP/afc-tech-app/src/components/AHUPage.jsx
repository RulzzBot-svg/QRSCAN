import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAHUsForHospital } from "../api/hospitals";

function AHUPage() {
  const { hospitalId } = useParams();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [visible, setVisible] = useState(6);
  const [ahus, setAhus] = useState([]);

  useEffect(() => {
    getAHUsForHospital(hospitalId)
      .then((res) => setAhus(res.data))
      .catch((err) => console.error("Error loading AHUs", err));
  }, [hospitalId]);

  // Filter by SEARCH (searches ID + location)
  const filtered = ahus.filter(
    (a) =>
      a.id.toLowerCase().includes(search.toLowerCase()) ||
      (a.location || "").toLowerCase().includes(search.toLowerCase())
  );

  // Convert ISO to readable format (MM/DD/YYYY)
  const formatDate = (iso) => {
    if (!iso) return "TBD";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US");
  };

  // Status badge helper
  const statusBadge = (status) => {
    switch (status) {
      case "Completed": return "badge badge-success";
      case "Due Soon": return "badge badge-warning";
      case "Overdue": return "badge badge-error";
      case "Pending": return "badge badge-info";
      default: return "badge";
    }
  };

  return (
    <div data-theme="corporate" className="min-h-screen bg-base-200 p-4">

      {/* Back Button */}
      <button className="btn btn-ghost mb-4" onClick={() => navigate("/hospitals")}>
        ⬅ Back to Hospitals
      </button>

      <h1 className="text-3xl font-bold text-primary mb-2">
        AHUs for Hospital #{hospitalId}
      </h1>

      {/* Search Input */}
      <div className="form-control my-4 relative">
        <input
          type="text"
          placeholder="Search AHUs..."
          className="input input-bordered w-full pr-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/60">
          🔍
        </span>
      </div>

      {/* AHU Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {filtered.slice(0, visible).map((ahu) => (
          <div
            key={ahu.id}
            className="card bg-base-100 shadow-md border border-base-300 hover:shadow-lg cursor-pointer transition-all"
            onClick={() => navigate(`/FilterInfo/${ahu.id}`)}
          >
            <div className="card-body p-4">

              {/* ID */}
              <h2 className="card-title text-lg text-primary">{ahu.id}</h2>

              {/* Location */}
              <p className="text-sm text-base-content/70">{ahu.location}</p>

              {/* STATUS BADGE */}
              <span className={`mt-2 ${statusBadge(ahu.status)}`}>
                {ahu.status}
              </span>

              {/* Extra status metadata */}
              <div className="text-xs mt-2 text-base-content/60">
                {ahu.status === "Overdue" && (
                  <p>Overdue by {ahu.days_overdue} days</p>
                )}

                {ahu.status === "Due Soon" && (
                  <p>Due in {ahu.days_until_due} days</p>
                )}

                {ahu.status === "Completed" && ahu.next_due_date && (
                  <p>Next changeout: {formatDate(ahu.next_due_date)}</p>
                )}

                {ahu.status === "Pending" && (
                  <p>No service history yet</p>
                )}
              </div>

              <div className="divider my-2"></div>

              {/* VIEW BUTTON */}
              <button className="btn btn-outline btn-sm w-full">
                View Details
              </button>

            </div>
          </div>
        ))}

        {/* No results */}
        {filtered.length === 0 && (
          <div className="alert alert-warning shadow-sm">
            <span>No AHUs match your search.</span>
          </div>
        )}
      </div>

      {/* Load More Button */}
      {visible < filtered.length && (
        <div className="mt-6 flex justify-center">
          <button
            className="btn btn-outline btn-primary w-full max-w-xs"
            onClick={() => setVisible((v) => v + 6)}
          >
            View More
          </button>
        </div>
      )}
    </div>
  );
}

export default AHUPage;
