import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getHospitals } from "../../api/hospitals";
import { saveHospitalBundle, isHospitalDownloaded } from "../../offline/offlineBundle";
import { dbPromise } from "../../offline/db";
import { parseIsoToDate } from "../../utils/dates";
import LogoutButton from "./logoutbutton";
import { API } from "../../api/api";

async function downloadHospital(hospitalId) {

  const res = await API.get(`/hospitals/${hospitalId}/offline-bundle`);
  await saveHospitalBundle(res.data);
  alert("Hospital download for offline use.");
  return true;
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
  // map of hospitalId -> downloaded boolean
  const [offlineMap, setOfflineMap] = useState({});

  // Search bar state
  const [search, setSearch] = useState("");

  // Filtered list based on search
  const filtered = hospitals.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase())
  );

  // Load counts for hospitals in view from local IndexedDB only (avoid network prefetch)
  useEffect(() => {
    const idsToLoad = filtered.slice(0, visible).map((h) => h.id).filter((id) => !(id in countsMap));
    if (idsToLoad.length === 0) return;

    const today = new Date();

    idsToLoad.forEach(async (hospitalId) => {
      try {
        // If hospital bundle is downloaded, compute counts from local DB
        const downloaded = await isHospitalDownloaded(hospitalId);
        if (!downloaded) {
          // Avoid fetching remote bundle here to prevent many concurrent requests.
          setCountsMap((m) => ({ ...m, [hospitalId]: { ahu_count: 0, ahus_overdue: 0, ahus_due_soon: 0, ahus_ok: 0 } }));
          return;
        }

        const db = await dbPromise;
        const idx = await db.get('hospitalAhuIndex', hospitalId);
        const ahuIds = idx?.ahu_ids || [];

        let ahu_count = 0;
        let ahus_overdue = 0;
        let ahus_due_soon = 0;
        let ahus_ok = 0;

        for (const aid of ahuIds) {
          const a = await db.get('ahuCache', aid);
          if (!a) continue;
          ahu_count += 1;

          let has_overdue = false;
          let has_due_soon = false;
          let has_filters = false;

          for (const f of (a.filters || [])) {
            has_filters = true;
            const last = f.last_service_date ? parseIsoToDate(f.last_service_date) : null;
            const freq = f.frequency_days || null;
            if (last && freq) {
              const nextDue = new Date(last.getTime() + freq * 24 * 60 * 60 * 1000);
              const delta = Math.ceil((nextDue - today) / (1000 * 60 * 60 * 24));
              if (delta < 0) has_overdue = true;
              else if (delta <= 14) has_due_soon = true;
            }
          }

          if (has_overdue) ahus_overdue += 1;
          else if (has_due_soon) ahus_due_soon += 1;
          else if (has_filters) ahus_ok += 1;
        }

        setCountsMap((m) => ({ ...m, [hospitalId]: { ahu_count, ahus_overdue, ahus_due_soon, ahus_ok } }));
      } catch (err) {
        console.error('Failed to compute local hospital counts', hospitalId, err);
        setCountsMap((m) => ({ ...m, [hospitalId]: { ahu_count: 0, ahus_overdue: 0, ahus_due_soon: 0, ahus_ok: 0 } }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, visible, offlineMap]);

  // Check which hospitals are available offline in IndexedDB
  useEffect(() => {
    const ids = filtered.slice(0, visible).map((h) => h.id);
    ids.forEach(async (hid) => {
      try {
        const downloaded = await isHospitalDownloaded(hid);
        setOfflineMap((m) => ({ ...m, [hid]: !!downloaded }));
      } catch (e) {
        console.warn('isHospitalDownloaded failed', hid, e);
      }
    });
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
        {filtered.slice(0, visible).map((hospital) => {
          const c = countsMap[hospital.id] || { ahu_count: 0, ahus_overdue: 0, ahus_due_soon: 0, ahus_ok: 0 };
          return (
            <div
              key={hospital.id}
              onClick={() => navigate(`/AHU/${hospital.id}`)}
              className="card bg-base-100 shadow-sm border border-base-300 hover:shadow-md hover:bg-base-100 transition-all cursor-pointer"
            >
              <div className="card-body p-5 ">

                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  {/* Left: title/city */}
                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-semibold text-primary break-words">
                      {hospital.name}
                    </div>
                    <div className="text-xs text-base-content/60 break-words">
                      {hospital.city}
                    </div>
                  </div>

                  {/* Right: badge (no shrinking) */}
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className={`badge badge-sm ${hospital.active ? "badge-success" : "badge-ghost"}`}>
                      {hospital.active ? "Active" : "Inactive"}
                    </span>
                    {offlineMap[hospital.id] && (
                      <span className="badge badge-sm badge-info">Offline ready</span>
                    )}
                  </div>
                </div>


                {/* AHU Count + Badges */}
                <div className="flex flex-wrap items-center gap-4 mb-3 mt-2">

                  {/* Blue badge for OK count as requested, preserve error/warning colours */}
                  {c.ahu_count > 0 ? <span className="text-xs badge badge-ghost">{c.ahu_count} AHUs </span> : null}
                  {c.ahus_ok > 0 ? <span className="badge badge-info">{c.ahus_ok} OK</span> : null}
                  {c.ahus_overdue > 0 ? <span className="badge badge-error">{c.ahus_overdue} overdue</span> : null}
                  {c.ahus_due_soon > 0 ? <span className="badge badge-warning">{c.ahus_due_soon} due soon</span> : null}

                </div>

                {/* Divider */}
                <div className="divider my-1"></div>

                {/* Buttons */}
                <button
                  className="btn btn-primary btn-sm w-full mb-2 "
                  onClick={(e) => {e.stopPropagation(); navigate(`/AHU/${hospital.id}`)}}
                >
                  Load AHUs
                </button>
                <button
                  className="btn btn-sm"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      const ok = await downloadHospital(hospital.id);
                      if (ok) setOfflineMap((m) => ({ ...m, [hospital.id]: true }));
                    } catch (err) {
                      console.error('Download failed', err);
                      alert('Failed to download hospital for offline');
                    }
                  }}
                >
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
          )
        })}
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
