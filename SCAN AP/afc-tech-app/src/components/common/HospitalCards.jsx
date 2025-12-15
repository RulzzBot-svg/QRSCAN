import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getHospitals } from "../../api/hospitals";

function HospitalCards() {
  const navigate = useNavigate();

  // Temporary hardcoded full list (simulate big data)
  const [hospitals, setHospitals] = useState([]);

  useEffect(() => {
    getHospitals().then((res) => setHospitals(res.data)).catch((err) => console.error("Error Loading", err));
  }, []);

  // Pagination: how many hospitals to show at once
  const [visible, setVisible] = useState(4);

  // Search bar state
  const [search, setSearch] = useState("");

  // Filtered list based on search
  const filtered = hospitals.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div data-theme="corporate" className="min-h-screen bg-base-200 p-4">


      <button
        className="btn btn-ghost mb-3"
        onClick={() => navigate("/")}
      >
        ⬅ Back
      </button>
      {/* Header */}
      <h1 className="text-3xl font-bold mb-2 text-primary">Hospitals</h1>


      {/* Search Bar */}

      <div className="form-control  mb-4 relative">
        <input
          type="text"
          placeholder="Search hospital..."
          className="input input-bordered w-full pr-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/60 pointer-events-none">🔍</span>

      </div>

      {/* Divider */}
      <div className="divider my-2">Hospital List</div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.slice(0, visible).map((hospital) => (
          <div
            key={hospital.id}
            onClick={() => navigate(`/AHU/${hospital.id}`)}
            className="card bg-base-100 shadow-sm border border-base-300 hover:shadow-md hover:bg-base-100 transition-all cursor-pointer"
          >
            <div className="card-body p-5 ">

              <h2 className="card-title text-lg text-primary">
                {hospital.name}
              </h2>

              <p className="text-xs text-base-content/60"> {hospital.city} </p>

              <span className={`badge badge-sm ${hospital.active ? "badge-success" : "badge-ghost"}`}>
                {hospital.active ? "Active" : "Inactive"}
              </span>

              {/* STAT COMPONENT */}
              <div className="stats shadow w-full mb-3 mt-1">
                <div className="stat">
                  <div className="stat-title text-xs">AHUs</div>
                  <div className="stat-value text-primary text-xl">
                    {hospital.ahu_count}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="divider my-1"></div>

              {/* Buttons */}
              <button
                className="btn btn-primary btn-sm w-full mb-2 "
                onClick={() => navigate(`/AHU/${hospital.id}`)}
              >
                Load AHUs
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Show More Button */}
      {visible < filtered.length && (
        <div className="mt-6 flex justify-center">
          <button
            className="btn btn-outline btn-primary w-full max-w-xs"
            onClick={() => setVisible(visible + 4)}
          >
            Show More
          </button>
        </div>
      )}
    </div>
  );
}

export default HospitalCards;
