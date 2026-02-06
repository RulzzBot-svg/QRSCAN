import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getHospitals } from "../../api/hospitals";
import { saveHospitalBundle } from "../../offline/offlineBundle";
import LogoutButton from "./logoutbutton";
import { API } from "../../api/api";

async function downloadHospital (hospitalId){

  const res = await API.get(`/hospitals/${hospitalId}/offline-bundle`);
  await saveHospitalBundle(res.data);
  alert("Hospital donwload for offline use.");
}



function HospitalCards() {
  const navigate = useNavigate();

  // Temporary hardcoded full list (simulate big data)
  const [hospitals, setHospitals] = useState([]);

  useEffect(() => {
    getHospitals().then((res) => setHospitals(res.data)).catch((err) => console.error("Error Loading", err));
  }, []);

  // Pagination: how many hospitals to show at once
  const [visible, setVisible] = useState(4);

  // Per-hospital computed counts: { [hospitalId]: { filters_count, overdue_count, due_soon_count, ok_count } }
  const [countsMap, setCountsMap] = useState({});

  // Search bar state
  const [search, setSearch] = useState("");

  // Filtered list based on search
  const filtered = hospitals.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase())
  );

  // Load counts for hospitals in view (avoids firing for all at once)
  useEffect(() => {
    const idsToLoad = filtered.slice(0, visible).map((h) => h.id).filter((id) => !(id in countsMap));
    if (idsToLoad.length === 0) return;

    const today = new Date();

    idsToLoad.forEach(async (hospitalId) => {
      try {
        const res = await API.get(`/hospitals/${hospitalId}/offline-bundle`);
        const payload = res.data;
        let filters_count = 0;
        let overdue_count = 0;
        let due_soon_count = 0;

        for (const a of (payload.ahus || [])) {
          for (const f of (a.filters || [])) {
            filters_count += 1;
            const last = f.last_service_date ? new Date(f.last_service_date) : null;
            const freq = f.frequency_days || null;
            if (last && freq) {
              const nextDue = new Date(last.getTime() + freq * 24 * 60 * 60 * 1000);
              const delta = Math.ceil((nextDue - today) / (1000 * 60 * 60 * 24));
              if (delta < 0) overdue_count += 1;
              else if (delta <= 14) due_soon_count += 1;
            }
          }
        }

        const ok_count = Math.max(0, filters_count - overdue_count - due_soon_count);
        setCountsMap((m) => ({ ...m, [hospitalId]: { filters_count, overdue_count, due_soon_count, ok_count } }));
      } catch (err) {
        console.error('Failed to load hospital bundle', hospitalId, err);
        setCountsMap((m) => ({ ...m, [hospitalId]: { filters_count: 0, overdue_count: 0, due_soon_count: 0, ok_count: 0 } }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, visible]);

  return (
    <div data-theme="corporate" className="min-h-screen bg-base-200 p-4">


      <button
        className="btn btn-ghost mb-3"
        onClick={() => navigate("/Home")}
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

              <div className="flex items-start gap-3">
                <div className="min-w-0">
                  <h2 className="card-title text-lg text-primary truncate">{hospital.name}</h2>
                  <p className="text-xs text-base-content/60 truncate">{hospital.city}</p>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <span className={`badge badge-sm ${hospital.active ? "badge-success" : "badge-ghost"}`}>
                    {hospital.active ? "Active" : "Inactive"}
                  </span>

                  {(() => {
                    const c = countsMap[hospital.id] || { filters_count: 0, overdue_count: 0, due_soon_count: 0, ok_count: 0 };
                    return (
                      <>
                        {c.ok_count > 0 ? <span className="badge badge-success">{c.ok_count} OK</span> : null}
                        {c.overdue_count > 0 ? <span className="badge badge-error">{c.overdue_count} overdue</span> : null}
                        {c.due_soon_count > 0 ? <span className="badge badge-warning">{c.due_soon_count} due soon</span> : null}
                        <span className="badge badge-ghost">{c.filters_count} filters</span>
                      </>
                    );
                  })()}
                </div>
              </div>

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
              <button className="btn btn-sm" onClick={()=>downloadHospital(hospital.id)}>
                Download Hospital for offline
              </button>
              <button
                className="btn btn-success btn-sm w-full mt-2"
                onClick={(e) => { e.stopPropagation(); navigate(`/tech/signoff?h=${hospital.id}`); }}
              >
                Tech Sign-off
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
