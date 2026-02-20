import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getBuildingsForHospital } from "../../api/hospitals";

function BuildingsPage() {
  const { hospitalId } = useParams();
  const navigate = useNavigate();

  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBuildingsForHospital(hospitalId)
      .then((res) => {
        setBuildings(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        console.error("Failed to load buildings", err);
        setBuildings([]);
      })
      .finally(() => setLoading(false));
  }, [hospitalId]);

  return (
    <div data-theme="corporate" className="min-h-screen bg-base-200 p-4">
      <button
        className="btn btn-ghost mb-3"
        onClick={() => navigate("/hospitals")}
      >
        ⬅ Back to Hospitals
      </button>

      <h1 className="text-3xl font-bold text-primary mb-1">Buildings</h1>
      <p className="text-sm text-base-content/70 mb-4">Hospital ID: {hospitalId}</p>

      {loading && (
        <div className="flex justify-center my-10">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      )}

      {!loading && buildings.length === 0 && (
        <div className="text-center text-base-content/60 mt-8">
          No buildings found for this hospital.
        </div>
      )}

      {!loading && buildings.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {buildings.map((building) => (
            <div
              key={building.id}
              onClick={() => navigate(`/AHU/${hospitalId}/building/${building.id}`)}
              className="card bg-base-100 border border-base-300 shadow-sm hover:shadow-md hover:border-primary transition-all cursor-pointer"
            >
              <div className="card-body p-5">
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <h2 className="card-title text-lg text-primary break-words">
                      🏢 {building.name}
                    </h2>
                    {building.floor_area && (
                      <p className="text-xs text-base-content/60 mt-1">
                        Floor area: {building.floor_area}
                      </p>
                    )}
                  </div>
                  <span className={`badge badge-sm shrink-0 ${building.active ? "badge-success" : "badge-ghost"}`}>
                    {building.active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="mt-3">
                  <span className="badge badge-ghost badge-sm">{building.ahu_count} AHU{building.ahu_count !== 1 ? "s" : ""}</span>
                </div>

                <div className="divider my-2"></div>

                <button className="btn btn-primary btn-sm w-full pointer-events-none">
                  View AHUs
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BuildingsPage;
