import { useNavigate, useParams } from "react-router-dom";
import { useState, useRef, useEffect } from "react";

import { getAHUbyQR } from "../../api/ahu";
import { submitJob } from "../../api/jobs";

import { queueJob } from "../../offline/jobQueue";
import { cacheAHU, getCachedAHU } from "../../offline/ahuCache";

function FilterInfo() {
  const navigate = useNavigate();
  const { ahuId } = useParams();
  const modalRef = useRef(null);

  const [ahu, setAhu] = useState(null);
  const [filterRows, setFilterRows] = useState([]);
  const [checked, setChecked] = useState({});
  const [notes, setNotes] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);

  /* ----------------------------- */
  /* Online / Offline status watch */
  /* ----------------------------- */
  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  /* ----------------------------- */
  /* Load AHU (online OR offline)  */
  /* ----------------------------- */
  useEffect(() => {
    const loadAHU = async () => {
      try {
        if (!offline) {
          const res = await getAHUbyQR(ahuId);
          setAhu(res.data);
          setFilterRows(res.data.filters || []);
          await cacheAHU(res.data); // ✅ cache for offline use
        } else {
          const cached = await getCachedAHU(ahuId);
          if (!cached) throw new Error("No cached AHU");
          setAhu(cached);
          setFilterRows(cached.filters || []);
        }
      } catch (err) {
        alert(
          offline
            ? "This AHU is not available offline."
            : "AHU not found."
        );
        navigate("/scan");
      }
    };

    loadAHU();
  }, [ahuId, offline, navigate]);

  /* ----------------------------- */
  /* UI helpers                    */
  /* ----------------------------- */
  const handleCheckbox = (id) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNoteChange = (id, value) => {
    setNotes((prev) => ({ ...prev, [id]: value }));
  };

  const completedCount = filterRows.filter(
    (row) => checked[row.id]
  ).length;

  const openModal = () => {
    modalRef.current?.showModal();
  };

  /* ----------------------------- */
  /* Job submission (offline-safe) */
  /* ----------------------------- */
  const handleJobCompletion = async () => {
    if (!ahu || submitting) return;

    const filterPayload = filterRows.map((row) => ({
      filter_id: row.id,
      is_completed: checked[row.id] || false,
      note: notes[row.id] || ""
    }));

    if (!filterPayload.some((f) => f.is_completed)) {
      alert("Please complete at least one filter.");
      return;
    }

    setSubmitting(true);
    const location = await getCurrentLocation();

    const jobData = {
      ahu_id: ahuId,
      tech_id: 1, // TODO: replace with auth
      overall_notes: "",
      gps_lat: location.lat,
      gps_long: location.long,
      filters: filterPayload
    };

    try {
      if (offline) {
        await queueJob(jobData);
      } else {
        await submitJob(jobData);
      }
      openModal();
    } catch (err) {
      console.error("Submit failed, queued:", err);
      await queueJob(jobData);
      openModal();
    } finally {
      setSubmitting(false);
    }
  };

  /* ----------------------------- */
  /* GPS (robust fallback)         */
  /* ----------------------------- */
  const getCurrentLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        return resolve({ lat: null, long: null });
      }

      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            long: pos.coords.longitude
          }),
        () =>
          resolve({ lat: null, long: null }),
        {
          enableHighAccuracy: false,
          timeout: 20000,
          maximumAge: 300000
        }
      );
    });
  };

  /* ----------------------------- */
  /* RENDER                        */
  /* ----------------------------- */
  return (
    <div data-theme="corporate" className="min-h-screen bg-base-200 pb-28">
      <div className="max-w-3xl mx-auto p-4">

        {/* OFFLINE BANNER */}
        {offline && (
          <div className="mb-3 rounded-lg bg-warning/20 border border-warning p-2 text-sm">
            📶 Offline mode — data may be cached
          </div>
        )}

        {/* AHU SUMMARY */}
        {ahu && (
          <div className="card bg-base-100 border border-base-300 shadow-sm mb-4">
            <div className="card-body p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-bold text-primary">
                    {ahu.name}
                  </h1>
                  <p className="text-sm text-base-content/70">
                    📍 {ahu.location}
                  </p>
                </div>
                <span className="badge badge-outline">
                  {ahu.status || "—"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* PROGRESS */}
        <div className="mb-2 text-sm text-base-content/70">
          Completed {completedCount} of {filterRows.length}
        </div>
        <progress
          className="progress progress-primary w-full mb-4"
          value={completedCount}
          max={filterRows.length}
        />

        {/* FILTER TABLE */}
        <div className="overflow-x-auto bg-base-100 shadow rounded-lg border border-base-300">
          <table className="w-full text-sm">
            <thead className="bg-base-200 border-b">
              <tr>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Phase</th>
                <th className="px-3 py-2">Part</th>
                <th className="px-3 py-2">Size</th>
                <th className="px-3 py-2 text-center">Done</th>
                <th className="px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filterRows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b ${
                    checked[row.id] ? "bg-success/10" : ""
                  }`}
                >
                  <td className="px-3 py-2">{row.quantity}</td>
                  <td className="px-3 py-2">{row.phase}</td>
                  <td className="px-3 py-2">{row.part_number}</td>
                  <td className="px-3 py-2">{row.size}</td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary"
                      checked={checked[row.id] || false}
                      onChange={() => handleCheckbox(row.id)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <textarea
                      className="textarea textarea-bordered textarea-xs w-full"
                      value={notes[row.id] || ""}
                      onChange={(e) =>
                        handleNoteChange(row.id, e.target.value)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ACTION BAR */}
        <div className="fixed bottom-0 left-0 right-0 bg-base-100 border-t p-4">
          <div className="max-w-3xl mx-auto">
            <button
              className={`btn btn-primary w-full ${
                submitting ? "loading" : ""
              }`}
              onClick={handleJobCompletion}
              disabled={submitting}
            >
              ✅ Complete Job
            </button>
          </div>
        </div>

        {/* SUCCESS MODAL */}
        <dialog ref={modalRef} className="modal">
          <div className="modal-box text-center">
            <h3 className="font-bold text-lg text-primary">
              Job Saved
            </h3>
            <p className="py-3 text-sm text-base-content/70">
              Your checklist for <strong>{ahuId}</strong> has been saved.
            </p>
            <form method="dialog">
              <button className="btn btn-primary w-full">OK</button>
            </form>
          </div>
        </dialog>
      </div>
    </div>
  );
}

export default FilterInfo;
