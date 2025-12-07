import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

function AHUPage() {
  const { hospitalId } = useParams();
  const navigate = useNavigate();

  // SEARCH state
  const [search, setSearch] = useState("");

  // PAGINATION state
  const [visible, setVisible] = useState(6);

  // AHU MOCK DATA
  const ahuDataByHospital = {
    1: [
      { id: "AHU-1A", location: "East Wing – 1st Floor", status: "Due Soon" },
      { id: "AHU-1B", location: "Surgery Floor – OR Hallway", status: "Overdue" },
      { id: "AHU-1C", location: "Main Lobby", status: "Completed" },
      { id: "AHU-1D", location: "Radiology – CT Scan Room", status: "Pending" },
      { id: "AHU-1E", location: "Cafeteria – Back Room", status: "Completed" },
      { id: "AHU-2A", location: "East Wing – 2nd Floor", status: "Due Soon" },
      { id: "AHU-2B", location: "ICU – North Wing", status: "Overdue" },
      { id: "AHU-3A", location: "Mechanical Room 3A", status: "Completed" },
      { id: "AHU-4A", location: "Emergency Dept – Triage", status: "Pending" },
      { id: "AHU-4B", location: "ER Trauma Bay", status: "Due Soon" },
      { id: "AHU-5A", location: "Maternity Floor – Recovery", status: "Completed" },
      { id: "AHU-5B", location: "Maternity Floor – Hallway", status: "Pending" },
    ],
    2: [
      { id: "AHU-201", location: "Tower 2 – West Side", status: "Pending" },
      { id: "AHU-202", location: "Tower 4 – East Wing", status: "Due Soon" },
      { id: "AHU-203", location: "Basement Mechanical Room", status: "Overdue" },
      { id: "AHU-204", location: "Radiology – X-Ray", status: "Completed" },
      { id: "AHU-205", location: "MRI Lab", status: "Pending" },
      { id: "AHU-206", location: "Operating Room – Prep Area", status: "Due Soon" },
      { id: "AHU-207", location: "Operating Room – Main Air", status: "Overdue" },
      { id: "AHU-208", location: "Cafeteria – Main Floor", status: "Completed" },
      { id: "AHU-209", location: "Neonatal ICU", status: "Pending" },
      { id: "AHU-210", location: "West Tower – Floor 8", status: "Due Soon" },
    ],
    3: [
      { id: "AHU-310", location: "Basement B1 – Main Room", status: "Completed" },
      { id: "AHU-311", location: "East Ventilation Area", status: "Pending" },
      { id: "AHU-312", location: "1st Floor Hallway", status: "Due Soon" },
      { id: "AHU-313", location: "Pharmacy Clean Room", status: "Overdue" },
      { id: "AHU-314", location: "Elevator Shaft Area", status: "Completed" },
      { id: "AHU-315", location: "Cafeteria – Back Hall", status: "Pending" },
      { id: "AHU-316", location: "Fire Pump Room", status: "Completed" },
      { id: "AHU-317", location: "ICU Block A", status: "Due Soon" },
    ],
    4: [
      { id: "AHU-401", location: "Critical Care Ward", status: "Overdue" },
      { id: "AHU-402", location: "OR Hallway – Prep Area", status: "Due Soon" },
      { id: "AHU-403", location: "Radiology – MRI Room", status: "Completed" },
      { id: "AHU-404", location: "Emergency Wing – Entrance", status: "Pending" },
      { id: "AHU-405", location: "Surgery Block B", status: "Overdue" },
      { id: "AHU-406", location: "Mechanical Room 2", status: "Completed" },
    ],
  };

  // Load AHUs for this hospital
  const ahus = ahuDataByHospital[hospitalId] || [];

  // Filter by SEARCH (searches ID + location)
  const filtered = ahus.filter(
    (a) =>
      a.id.toLowerCase().includes(search.toLowerCase()) ||
      a.location.toLowerCase().includes(search.toLowerCase())
  );

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

      <h1 className="text-3xl font-bold text-primary">
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
              <h2 className="card-title text-lg text-primary">{ahu.id}</h2>
              <p className="text-sm text-base-content/70">{ahu.location}</p>
              <span className={`mt-2 ${statusBadge(ahu.status)}`}>{ahu.status}</span>

              <div className="divider my-2"></div>
              <button className="btn btn-outline btn-sm w-full">
                View Details
              </button>
            </div>
          </div>
        ))}

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
