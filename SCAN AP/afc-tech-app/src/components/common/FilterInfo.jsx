import { useNavigate, useParams } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { getAHUbyQR } from "../../api/ahu";
import { submitJob } from "../../api/jobs";

function FilterInfo() {
  const navigate = useNavigate();
  const { ahuId } = useParams();
  const modalRef = useRef(null);

  const [ahu, setAhu] = useState(null);
  const [filterRows, setFilterRows] = useState([]);
  const [checked, setChecked] = useState({});
  const [notes, setNotes] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [gps, setGps] = useState({
    lat: null,
    long: null
  })

  useEffect(() => {
    getAHUbyQR(ahuId)
      .then((res) => {
        setAhu(res.data);
        setFilterRows(res.data.filters || []);
      })
      .catch(() => {
        alert("AHU not found");
        navigate("/hospitals");
      });
  }, [ahuId, navigate]);

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
    if (modalRef.current) modalRef.current.showModal();
  };

  const handleJobCompletion = async () => {
    if (!ahu || submitting) return;

    const filterPayload = filterRows.map((row) => ({
      filter_id: row.id,
      is_completed: checked[row.id] || false,
      note: notes[row.id] || ""
    }));

    if (!filterPayload.some(f => f.is_completed)) {
      alert("Please complete at least one filter before submitting.");
      return;
    }

    setSubmitting(true);
    const location = await getCurrentLocation();

    const jobData = {
      ahu_id: ahuId,
      tech_id: 1, // TODO: replace with auth user
      overall_notes: "",
      gps_lat: null,
      gps_long: null,
      filters: filterPayload
    };

    try {
      setSubmitting(true);
      await submitJob(jobData);
      openModal();
    } catch (err) {
      console.error("Error submitting job:", err);
      alert("Failed to submit job.");
    } finally {
      setSubmitting(false);
    }
  };


  const getCurrentLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn("Geolocation not supported");
        return resolve({ lat: null, long: null });
      }

      // First attempt: high accuracy
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            long: position.coords.longitude
          });
        },
        () => {
          // Fallback attempt: cached / low accuracy
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                lat: position.coords.latitude,
                long: position.coords.longitude
              });
            },
            () => {
              console.warn("Unable to retrieve location");
              resolve({ lat: null, long: null });
            },
            {
              enableHighAccuracy: false,
              timeout: 20000,
              maximumAge: 300000 // allow cached (5 min)
            }
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    });
  };





  return (
    <div data-theme="corporate" className="min-h-screen bg-base-200 pb-28">
      <div className="max-w-3xl mx-auto p-4">


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

              <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                <div className="font-medium">
                  <p className="text-base-content/60 text-sm">Last Serviced Date</p>
                  {filterRows.some(f => f.last_service_date)
                    ? new Date(
                      Math.max(
                        ...filterRows
                          .filter(f => f.last_service_date)
                          .map(f => new Date(f.last_service_date))
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

        {/* FILTER TABLE */}
        <div className="overflow-x-auto bg-base-100 shadow rounded-lg border border-base-300">
          <table className="w-full text-sm text-left">
            <thead className="bg-base-200 border-b border-base-300">
              <tr>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Phase</th>
                <th className="px-4 py-3">Part</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Last Serviced</th>
                <th className="px-4 py-3 text-center text-primary">Done</th>
                <th className="px-4 py-3 text-center">Notes</th>
              </tr>
            </thead>

            <tbody>
              {filterRows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-base-300 ${checked[row.id] ? "bg-success/10" : "bg-base-100"
                    }`}
                >
                  <td className="px-4 py-3 font-medium">{row.quantity}</td>
                  <td className="px-4 py-3">{row.phase}</td>
                  <td className="px-4 py-3">{row.part_number}</td>
                  <td className="px-4 py-3">{row.size}</td>
                  <td className="px-4 py-3 text-xs badge badge-success">
                    {row.last_service_date
                      ? new Date(row.last_service_date).toLocaleDateString()
                      : "Never"}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary"
                      checked={checked[row.id] || false}
                      onChange={() => handleCheckbox(row.id)}
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

        <div className="flex justify-between gap-2 mb-4 mt-3.5 pt-3">
          <button className="btn btn-ghost mb btn-outline" disable={!ahu} onClick={() => navigate(`/AHU/${ahu.hospital_id}`)}>
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
            <h3 className="font-bold text-lg text-primary">
              Job Completed!
            </h3>

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
