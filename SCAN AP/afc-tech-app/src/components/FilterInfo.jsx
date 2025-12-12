import { useNavigate, useParams } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { getAHUbyQR } from "../api/ahu";
import { submitJob } from "../api/jobs";

function FilterInfo() {
  const navigate = useNavigate();
  const { ahuId } = useParams();
  const modalRef = useRef(null);

  const [ahu, setAhu] = useState(null);
  const [filterRows, setFilterRows] = useState([]);

  const [checked, setChecked] = useState({});
  const [notes, setNotes] = useState({});

  useEffect(() => {
    getAHUbyQR(ahuId)
      .then((res) => {
        setAhu(res.data);
        setFilterRows(res.data.filters);
      })
      .catch(() => {
        alert("AHU not found");
        navigate("/hospitals");
      });
  }, [ahuId]);

  const handleCheckbox = (id) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNoteChange = (id, value) => {
    setNotes((prev) => ({ ...prev, [id]: value }));
  };

  const openModal = () => {
    if (modalRef.current) modalRef.current.showModal();
  };

  // ⭐ Submit Job to Backend
  const handleJobCompletion = async () => {
    if (!ahu) return;

    // Build the job_filters array
    const filterPayload = filterRows.map((row) => ({
      filter_id: row.id,
      is_completed: checked[row.id] || false,
      note: notes[row.id] || ""
    }));

    const jobData = {
      ahu_id: ahu.ahu_id,
      tech_id: 1, // TODO: get from login later
      overall_notes: "",
      gps_lat: null,
      gps_long: null,
      filters: filterPayload
    };

    try {
      await submitJob(jobData);
      openModal();   // Show success modal
    } catch (err) {
      console.error("Error submitting job:", err);
      alert("Failed to submit job.");
    }
  };

  return (
    <div data-theme="corporate" className="min-h-screen bg-base-200 items-center">
      <div className="w-full max-w-3xl">

        <button className="btn btn-ghost mb-4" onClick={() => navigate(-1)}>
          ⬅ Back
        </button>

        <h1 className="text-3xl font-bold text-primary mb-2">
          Filter Checklist — {ahuId}
        </h1>

        <div className="relative overflow-x-auto bg-base-100 shadow rounded-lg border border-base-300">
          <table className="w-full text-sm text-left text-base-content">
            <thead className="text-sm bg-base-200 border-b border-base-300">
              <tr>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Phase</th>
                <th className="px-4 py-3 font-medium">Part</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium text-center">Done</th>
                <th className="px-4 py-3 font-medium text-center">Notes</th>
              </tr>
            </thead>

            <tbody>
              {filterRows.map((row) => (
                <tr key={row.id} className="bg-base-100 border-b border-base-300 hover:bg-base-200">
                  <td className="px-4 py-4 font-medium">{row.quantity}</td>
                  <td className="px-4 py-4">{row.phase}</td>
                  <td className="px-4 py-4">{row.part_number}</td>
                  <td className="px-4 py-4">{row.size}</td>

                  <td className="px-4 py-4 text-center">
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
                      value={notes[row.id] || ""}
                      placeholder="Notes"
                      onChange={(e) => handleNoteChange(row.id, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom Buttons */}
        <div className="flex flex-col gap-3 mt-6">
          <button
            className="btn btn-primary w-full"
            onClick={handleJobCompletion}
          >
            ✅ Complete Job
          </button>

          <button className="btn btn-outline w-full" onClick={() => navigate(-1)}>
            ⬅ Back
          </button>
        </div>

        {/* MODAL */}
        <dialog id="jobCompleteModal" ref={modalRef} className="modal">
          <div className="modal-box text-center">
            <h3 className="font-bold text-lg text-primary">Job Completed!</h3>

            <p className="py-4 text-base-content/70">
              Your checklist for <strong>{ahuId}</strong> has been saved.
            </p>

            <div className="modal-action flex flex-col gap-3">
              <form method="dialog">
                <button className="btn btn-primary w-full">OK</button>
              </form>

              <button className="btn btn-outline w-full" onClick={() => navigate("/hospitals")}>
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
