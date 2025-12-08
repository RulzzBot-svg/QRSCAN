import { useNavigate, useParams } from "react-router-dom";
import { useState, useRef } from "react";

function FilterInfo() {
  const navigate = useNavigate();
  const { ahuId } = useParams();

  // --- Ref for modal trigger ---
  const modalRef = useRef(null);

  // Simulated AHU filter data
  const filterData = {
    "AHU-1A": [
      { id: "row1", qty: 12, phase: "Pre", part: "zlp20242", size: "20x24x2" },
      { id: "row2", qty: 4, phase: "Pre", part: "zlp12242", size: "12x24x2" },
      { id: "row3", qty: 2, phase: "Final", part: "F8V4-2424-GWB", size: "24x24x12" },
    ],
    "AHU-1B": [
      { id: "row1", qty: 6, phase: "Pre", part: "23LP-2020", size: "20x20x2" },
      { id: "row2", qty: 6, phase: "Final", part: "HPA-2024", size: "20x24x12" },
    ],
    "AHU-201": [
      { id: "row1", qty: 10, phase: "Pre", part: "KLP-2424", size: "24x24x2" },
    ],
  };

  const filterRows = filterData[ahuId] || [];

  const [checked, setChecked] = useState({});
  const [notes, setNotes] = useState({});

  const handleCheckbox = (id) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNoteChange = (id, value) => {
    setNotes((prev) => ({ ...prev, [id]: value }));
  };

  // --- Trigger modal ---
  const openModal = () => {
    if (modalRef.current) {
      modalRef.current.showModal();
    }
  };

  return (
    <div data-theme="corporate" className="min-h-screen bg-base-200 items-center">
      <div className="w-full max-w-3xl">

        {/* Back Button */}
        <button className="btn btn-ghost mb-4" onClick={() => navigate(-1)}>
          ⬅ Back
        </button>

        {/* AHU Title */}
        <h1 className="text-3xl font-bold text-primary mb-2">
          Filter Checklist — {ahuId}
        </h1>

        <p className="text-sm text-base-content/70 mb-4">
          Review and mark completed filters. Add notes if needed.
        </p>

        {/* Table */}
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
                  <td className="px-4 py-4 font-medium">{row.qty}</td>
                  <td className="px-4 py-4">{row.phase}</td>
                  <td className="px-4 py-4">{row.part}</td>
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
            onClick={() => {
              console.log("Checked:", checked);
              console.log("Notes:", notes);
              openModal();
            }}
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

          <form method="dialog" className="modal-backdrop" >
            <button>close</button>
          </form>
        </dialog>
      </div>
    </div>
  );
}

export default FilterInfo;
