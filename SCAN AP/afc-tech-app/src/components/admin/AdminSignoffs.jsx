import { useEffect, useState } from "react";
import { API } from "../../api/api";
import { formatDate } from "../../utils/dates";

export default function AdminSignoffs() {
  const [signoffs, setSignoffs] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    API.get("/admin/supervisor-signoff")
      .then((res) => setSignoffs(res.data))
      .catch((err) => {
        console.error("Failed to load signoffs", err);
        setSignoffs([]);
      });
  }, []);

  return (
    <div className="min-h-screen">
      <h1 className="text-3xl font-bold text-primary mb-4">Signed Off Forms</h1>

      <div className="bg-base-100 border border-base-300 rounded-lg shadow">
        <table className="table w-full">
          <thead>
            <tr>
              <th>ID</th>
              <th>Hospital</th>
              <th>Date</th>
              <th>Supervisor</th>
              <th>Summary</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {signoffs.map((s) => (
              <tr key={s.id} className="hover:bg-base-200">
                <td>{s.id}</td>
                <td>{s.hospital_id}</td>
                <td>{formatDate(s.date)}</td>
                <td>{s.supervisor_name}</td>
                <td className="max-w-sm truncate">{s.summary}</td>
                <td>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setSelected(s)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-3xl">
            <h3 className="font-bold text-xl text-primary">Sign-off #{selected.id}</h3>
            <div className="text-sm text-base-content/70 my-3">
              <div><strong>Hospital:</strong> {selected.hospital_id}</div>
              <div><strong>Date:</strong> {formatDate(selected.date)}</div>
              <div><strong>Supervisor:</strong> {selected.supervisor_name}</div>
              <div className="mt-2"><strong>Summary:</strong> {selected.summary}</div>
            </div>

            {selected.signature_data && (
              <div className="mb-4">
                <img src={selected.signature_data} alt="signature" className="w-full max-h-96 object-contain border" />
              </div>
            )}

            <div className="modal-action">
              <button className="btn" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setSelected(null)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
