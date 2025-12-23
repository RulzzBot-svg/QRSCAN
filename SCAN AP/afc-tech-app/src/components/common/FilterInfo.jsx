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
  const [inspected, setInspected] = useState({});




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
    let cancelled = false;

    const loadAHU = async () => {
      try {
        if (navigator.onLine) {
          const res = await getAHUbyQR(ahuId);
          if (cancelled) return;

          setAhu(res.data);
          setFilterRows(res.data.filters || []);

          // 🔑 cache for offline use
          await cacheAHU(res.data);
        } else {
          const cached = await getCachedAHU(ahuId);
          if (!cached) throw new Error("No cached AHU");

          if (cancelled) return;
          setAhu(cached);
          setFilterRows(cached.filters || []);
        }
      } catch (err) {
        alert(
          navigator.onLine
            ? "AHU not found"
            : "This AHU is not available offline"
        );
        navigate("/scan");
      }
    };

    loadAHU();
    return () => {
      cancelled = true;
    };
  }, [ahuId, navigate]);

  /* ----------------------------- */
  /* UI helpers                    */
  /* ----------------------------- */

  /*ask about this, should the tech have to check each box when they do replace or leave it seperate
  each checkbox individual meaning inspected can be unchecked and replaced be checked?
  or when its replaced it automatically checks inspected as well.
  */ 
  const handleCompleted = (id) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
    //delete the line below depending on the situation in the comments above line 87-90
    setInspected((prev) => ({ ...prev, [id]: true }));
  };

  const handleInspected = (id) => {
    setInspected((prev) => ({ ...prev, [id]: !prev[id] }));
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
      is_inspected: inspected[row.id] || false,
      is_completed: checked[row.id] || false,
      note: notes[row.id] || ""
    }));

    if (!filterPayload.some((f) => f.is_completed)) {
      alert("Please complete at least one filter before submitting.");
      return;
    }

    setSubmitting(true);
    const location = await getCurrentLocation();

    const jobData = {
      ahu_id: ahuId,
      tech_id: 1, // TODO: replace with auth user
      overall_notes: "",
      gps_lat: location.lat,
      gps_long: location.long,
      filters: filterPayload
    };

    try {
      if (!navigator.onLine) {
        await queueJob(jobData);
        openModal();
        return;
      }

      await submitJob(jobData);
      openModal();
    } catch (err) {
      console.error("Error submitting job:", err);
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
  /* RENDER (UNCHANGED UI)         */
  /* ----------------------------- */
  return (
    <div data-theme="corporate" className="min-h-screen bg-base-200 pb-28">
      <div className="max-w-3xl mx-auto p-4">

        {/* OFFLINE BANNER */}
        {offline && (
          <div className="mb-3 rounded-lg bg-warning/20 border border-warning p-2 text-sm">
            📶 Offline mode — using cached data
          </div>
        )}

        {/* AHU SUMMARY CARD */}
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

                <span
                  className={`badge ${ahu.status === "Overdue"
                    ? "badge-error"
                    : ahu.status === "Due Soon"
                      ? "badge-warning"
                      : "badge-success"
                    }`}
                >
                  {ahu.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="font-medium">
                  <p className="text-base-content/60 text-sm">
                    Last Serviced Date
                  </p>
                  {filterRows.some((f) => f.last_service_date)
                    ? new Date(
                      Math.max(
                        ...filterRows
                          .filter((f) => f.last_service_date)
                          .map((f) => new Date(f.last_service_date))
                      )
                    ).toLocaleDateString()
                    : "Never"}
                </div>

                <div>
                  <div className="text-base-content/60">Next Due</div>
                  <div className="font-medium">
                    {ahu.next_due_date || "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PROGRESS */}
        <div className="mb-3 text-sm text-base-content/70">
          Completed {completedCount} of {filterRows.length} filters
        </div>

        <progress
          className="progress progress-primary w-full mb-4"
          value={completedCount}
          max={filterRows.length}
        />

        {/* FILTER TABLE (UNCHANGED) */}
        <div className="overflow-x-auto bg-base-100 shadow rounded-lg border border-base-300">
          <table className="w-full text-sm text-left">
            <thead className="bg-base-200 border-b border-base-300">
              <tr>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Phase</th>
                <th className="px-4 py-3">Part</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Last Serviced</th>
                <th className="px-4 py-3 text-center text-primary">Inspected</th>
                <th className="px-4 py-4 text-center text-primary">Replaced</th>
                <th className="px-4 py-3 text-center">Notes</th>
              </tr>
            </thead>

            <tbody>
              {filterRows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-base-300 ${checked[row.id]
                    ? "bg-success/10"
                    : "bg-base-100"
                    }`}
                >
                  <td className="px-4 py-3 font-medium">
                    {row.quantity}
                  </td>
                  <td className="px-4 py-3">{row.phase}</td>
                  <td className="px-4 py-3">{row.part_number}</td>
                  <td className="px-4 py-3">{row.size}</td>
                  <td className="px-4 py-3">
                    <span className="badge badge-success">
                      {row.last_service_date
                        ? new Date(
                          row.last_service_date
                        ).toLocaleDateString()
                        : "Never"}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary"
                      checked={inspected[row.id] || false}
                      onChange={() => handleInspected(row.id)}
                    />
                  </td>

                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary"
                      checked={checked[row.id] || false}
                      onChange={() => handleCompleted(row.id)}
                    />
                  </td>




                  <td className="px-4 py-3 text-center">
                    <textarea
                      className="textarea textarea-bordered textarea-xs w-28"
                      placeholder="Notes"
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

        {/* ACTION BUTTONS */}
        <div className="flex justify-between gap-2 mb-4 mt-3.5 pt-3">
          <button
            className="btn btn-ghost btn-outline"
            disabled={!ahu}
            onClick={() =>
              navigate(`/AHU/${ahu.hospital_id}`)
            }
          >
            ⬅ Back to list
          </button>

          <button
            className="btn btn-outline"
            onClick={() => navigate("/scan")}
          >
            Scan another QR Code
          </button>
        </div>

        {/* STICKY ACTION BAR */}
        <div className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 p-4">
          <div className="max-w-3xl mx-auto">
            <button
              className={`btn btn-primary w-full ${submitting ? "loading" : ""
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
              Job Saved!
            </h3>

            <p className="py-4 text-base-content/70">
              Your checklist for <strong>{ahuId}</strong> has been
              saved.
            </p>

            <div className="modal-action flex flex-col gap-3">
              <form method="dialog">
                <button className="btn btn-primary w-full">
                  OK
                </button>
              </form>

              <button
                className="btn btn-outline w-full"
                onClick={() => navigate("/hospitals")}
              >
                Back to Hospitals
              </button>
            </div>
          </div>

          <form method="dialog" className="modal-backdrop">
            <button>close</button>
          </form>
        </dialog>
      </div>
    </div>
  );
}

export default FilterInfo;
