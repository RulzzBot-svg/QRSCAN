import { useNavigate, useParams } from "react-router-dom";
import { useState, useRef, useEffect } from "react";

import { getAHUbyQR } from "../../api/ahu";
import { submitJob } from "../../api/jobs";

import { queueJob } from "../../offline/jobQueue";
import { cacheAHU, getCachedAHU } from "../../offline/ahuCache";
import { parseIsoToDate, formatDate } from "../../utils/dates";

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
  const [tech, setTech] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const [initialResistance, setInitialResistance] = useState({});
  const [finalResistance, setFinalResistance] = useState({});

  /* ----------------------------- */
  /* Load technician from localStorage */
  /* ----------------------------- */
  useEffect(() => {
    const storedTech = localStorage.getItem("tech");
    if (storedTech) {
      setTech(JSON.parse(storedTech));
    } else {
      // If no tech logged in, redirect to login
      navigate("/");
    }
  }, [navigate]);

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

          // 🔑 cache for offline use (keyed by ahu_id)
          await cacheAHU(res.data);
        } else {
          const cached = await getCachedAHU(ahuId);
          if (!cached) throw new Error("No cached AHU");

          if (cancelled) return;
          setAhu(cached);
          setFilterRows(cached.filters || []);
        }
      } catch (err) {
        console.error("Error loading AHU:", err);
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

  const handleCompleted = (id) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
    setInspected((prev) => ({ ...prev, [id]: true }));
  };

  const handleInspected = (id) => {
    setInspected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNoteChange = (id, value) => {
    setNotes((prev) => ({ ...prev, [id]: value }));
  };

  const toggleRowExpansion = (id) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleInitialResistanceChange = (id, value) => {
    setInitialResistance((prev) => ({ ...prev, [id]: value }));
  };

  const handleFinalResistanceChange = (id, value) => {
    setFinalResistance((prev) => ({ ...prev, [id]: value }));
  };

  const doneCount = filterRows.filter((row) => checked[row.id] || inspected[row.id]).length;

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
      note: notes[row.id] || "",
      initial_resistance: initialResistance[row.id] !== "" && initialResistance[row.id] !== undefined ? parseFloat(initialResistance[row.id]) : null,
      final_resistance: finalResistance[row.id] !== "" && finalResistance[row.id] !== undefined ? parseFloat(finalResistance[row.id]) : null,
    }));

    if (!filterPayload.some((f) => f.is_completed || f.is_inspected)) {
      alert("Please complete or inspect at least one filter before submitting.");
      return;
    }

    setSubmitting(true);
    const location = await getCurrentLocation();

    // ✅ IMPORTANT: always submit the *global* AHU ID
    const resolvedAhuId = (ahu?.ahu_id || ahu?.id || ahuId);

    const jobData = {
      ahu_id: resolvedAhuId,
      tech_id: tech?.id || 1, // Use logged-in technician ID
      overall_notes: "",
      gps_lat: location.lat,
      gps_long: location.long,
      filters: filterPayload,
    };

    try {
      if (!navigator.onLine) {
        await queueJob(jobData);
        openModal();
        return;
      }

      await submitJob(jobData);
      if (!offline) {
        // Refetch and update cache with new last_service_date
        const res = await getAHUbyQR(ahuId);
        setAhu(res.data);
        await cacheAHU(res.data);
      }
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
            long: pos.coords.longitude,
          }),
        () => resolve({ lat: null, long: null }),
        {
          enableHighAccuracy: false,
          timeout: 20000,
          maximumAge: 300000,
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
                  className={`badge ${
                    ahu.status === "Overdue"
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
                    ? formatDate(
                        new Date(
                          Math.max(
                            ...filterRows
                              .filter((f) => f.last_service_date)
                              .map((f) => parseIsoToDate(f.last_service_date).getTime())
                          )
                        )
                      )
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
          Processed {doneCount} of {filterRows.length} filters
        </div>

        <progress
          className="progress progress-primary w-full mb-4"
          value={doneCount}
          max={filterRows.length}
        />

        {/* FILTER TABLE (DROPDOWN) */}
        <div className="space-y-2 mb-4">
          {filterRows.map((row) => (
            <div
              key={row.id}
              className={`bg-base-100 shadow rounded-lg border border-base-300 overflow-hidden ${
                checked[row.id] ? "border-success" : ""
              }`}
            >
              {/* Collapsed Header - Always Visible */}
              <div
                className={`p-4 cursor-pointer hover:bg-base-200 transition-colors ${
                  checked[row.id] ? "bg-success/10" : ""
                }`}
                onClick={() => toggleRowExpansion(row.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="grid grid-cols-5 gap-4 flex-1 text-sm">
                    <div>
                      <div className="text-base-content/60 text-xs">Qty</div>
                      <div className="font-medium">{row.quantity}</div>
                    </div>
                    <div>
                      <div className="text-base-content/60 text-xs">Phase</div>
                      <div className="font-medium">{row.phase}</div>
                    </div>
                    <div>
                      <div className="text-base-content/60 text-xs">Part</div>
                      <div className="font-medium">{row.part_number}</div>
                    </div>
                    <div>
                      <div className="text-base-content/60 text-xs">Size</div>
                      <div className="font-medium">{row.size}</div>
                    </div>
                    <div>
                      <div className="text-base-content/60 text-xs">Last Serviced</div>
                      <div>
                        <span className="badge badge-success badge-sm">
                          {row.last_service_date
                            ? formatDate(row.last_service_date)
                            : "Never"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-5 w-5 transition-transform ${
                        expandedRows[row.id] ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedRows[row.id] && (
                <div className="p-4 border-t border-base-300 bg-base-100">
                  <div className="space-y-4">
                    {/* Checkboxes Row */}
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-primary"
                          checked={inspected[row.id] || false}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleInspected(row.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-sm font-medium">Inspected</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-primary"
                          checked={checked[row.id] || false}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleCompleted(row.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-sm font-medium">Replaced</span>
                      </label>
                    </div>

                    {/* Resistance Fields Row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div onClick={(e) => e.stopPropagation()}>
                        <label className="label">
                          <span className="label-text text-xs">Initial Resistance</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className="input input-bordered input-sm w-full"
                          placeholder="Enter value"
                          value={initialResistance[row.id] || ""}
                          onChange={(e) =>
                            handleInitialResistanceChange(row.id, e.target.value)
                          }
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      <div onClick={(e) => e.stopPropagation()}>
                        <label className="label">
                          <span className="label-text text-xs">Final Resistance</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className="input input-bordered input-sm w-full"
                          placeholder="Enter value"
                          value={finalResistance[row.id] || ""}
                          onChange={(e) =>
                            handleFinalResistanceChange(row.id, e.target.value)
                          }
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    {/* Notes Field */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <label className="label">
                        <span className="label-text text-xs">Notes</span>
                      </label>
                      <textarea
                        className="textarea textarea-bordered w-full"
                        placeholder="Add notes here..."
                        rows="3"
                        value={notes[row.id] || ""}
                        onChange={(e) => handleNoteChange(row.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex justify-between gap-2 mb-4 mt-3.5 pt-3">
          <button
            className="btn btn-ghost btn-outline"
            disabled={!ahu}
            onClick={() => navigate(`/AHU/${ahu.hospital_id}`)}
          >
            ⬅ Back to list
          </button>

          <button className="btn btn-outline" onClick={() => navigate("/scan")}>
            Scan another QR Code
          </button>
        </div>

        {/* STICKY ACTION BAR */}
        <div className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 p-4">
          <div className="max-w-3xl mx-auto">
            <button
              className={`btn btn-primary w-full ${submitting ? "loading" : ""}`}
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
            <h3 className="font-bold text-lg text-primary">Job Saved!</h3>

            <p className="py-4 text-base-content/70">
              Your checklist for <strong>{ahuId}</strong> has been saved.
            </p>

            <div className="modal-action flex flex-col gap-3">
              <form method="dialog">
                <button className="btn btn-primary w-full">OK</button>
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
