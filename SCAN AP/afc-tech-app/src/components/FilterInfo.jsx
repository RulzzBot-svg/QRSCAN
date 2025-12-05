import { useNavigate } from "react-router-dom";
import { useState } from "react";

function FilterInfo() {
  const navigate = useNavigate();

  // Hardcoded filter rows (later will come from backend)
  const filterRows = [
    { id: "row1", qty: 12, phase: "Pre", part: "zlp20242", size: "20x24x2" },
    { id: "row2", qty: 4, phase: "Pre", part: "zlp12242", size: "12x24x2" },
    { id: "row3", qty: 2, phase: "Final", part: "F8V4-2424-GWB", size: "24x24x12" },
  ];

  // Checkboxes + Notes state
  const [checked, setChecked] = useState({});
  const [notes, setNotes] = useState({});

  const handleCheckbox = (id) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNoteChange = (id, value) => {
    setNotes((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <div className="w-full p-4 max-w-3xl mx-auto">
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
              <tr
                key={row.id}
                className="bg-base-100 border-b border-base-300 hover:bg-base-200"
              >
                <td className="px-4 py-4 font-medium">{row.qty}</td>
                <td className="px-4 py-4">{row.phase}</td>
                <td className="px-4 py-4">{row.part}</td>
                <td className="px-4 py-4">{row.size}</td>

                {/* Checkbox */}
                <td className="px-4 py-4 text-center">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={checked[row.id] || false}
                    onChange={() => handleCheckbox(row.id)}
                  />
                </td>

                {/* Note Input */}
                <td className="px-4 py-3">
                  <textarea
                    className="textarea textarea-bordered textarea-xs w-28"
                    placeholder="Notes"
                    value={notes[row.id] || ""}
                    onChange={(e) => handleNoteChange(row.id, e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-3 mt-6">
        <button
          className="btn btn-primary w-full"
          onClick={() => {
            console.log("Completed Rows:", checked);
            console.log("Notes:", notes);
            navigate("/job-complete");
          }}
        >
          ✅ Complete Job
        </button>

        <button className="btn btn-outline w-full" onClick={() => navigate("/AHU")}>
          ⬅ Back
        </button>
      </div>
    </div>
  );
}

export default FilterInfo;
