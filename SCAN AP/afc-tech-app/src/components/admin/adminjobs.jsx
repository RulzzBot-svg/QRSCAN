import { useEffect, useState } from "react";
import AdminSidebar from "./AdminSidebar";
import { API } from "../../api/api";


function AdminJobs() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
    API.get("/admin/jobs")
      .then(res => setJobs(res.data));
  }, []);

  return (
    <div data-theme="corporate" className="flex min-h-screen bg-base-200">

      <main className="flex-1 p-6">
        <h1 className="text-3xl font-bold text-primary mb-6">
          Job History
        </h1>

        <div className="bg-base-100 border border-base-300 rounded-lg shadow">
          <table className="table table-zebra table-pin-rows w-full">
            <thead>
              <tr>
                <th>Job ID</th>
                <th>AHU</th>
                <th>Technician</th>
                <th>Completed</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(j => (
                <tr
                  key={j.id}
                  className="cursor-pointer hover:bg-base-200"
                  onClick={() => setSelectedJob(j)}
                >
                  <td>{j.id}</td>
                  <td className="font-medium">{j.ahu_id}</td>
                  <td>{j.technician}</td>
                  <td>{new Date(j.completed_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* JOB DETAIL MODAL */}
        {selectedJob && (
          <dialog className="modal modal-open">
            <div className="modal-box max-w-3xl">
              <h3 className="font-bold text-xl text-primary mb-2">
                Job #{selectedJob.id}
              </h3>

              <div className="text-sm text-base-content/70 mb-4 space-y-1">
                <div><strong>AHU:</strong> {selectedJob.ahu_name} ({selectedJob.ahu_id})</div>
                <div><strong>Technician:</strong> {selectedJob.technician}</div>
                <div>
                  <strong>Completed:</strong>{" "}
                  {new Date(selectedJob.completed_at).toLocaleString()}
                </div>
              </div>

              <div className="divider" />

              <h4 className="font-semibold mb-2">Filters & Notes</h4>

              <div className="space-y-3">
                {selectedJob.filters.map((f, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded border ${
                      f.is_completed
                        ? "border-success bg-success/5"
                        : "border-base-300"
                    }`}
                  >
                    <div className="font-medium">
                      {f.phase} — {f.part_number} ({f.size})
                    </div>

                    <div className="text-sm mt-1">
                      Status:{" "}
                      <span
                        className={`badge badge-sm ${
                          f.is_completed
                            ? "badge-success"
                            : "badge-ghost"
                        }`}
                      >
                        {f.is_completed ? "Completed" : "Not Done"}
                      </span>
                    </div>

                    {f.note && (
                      <div className="mt-2 text-sm italic text-base-content/70">
                        “{f.note}”
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="modal-action">
                <button
                  className="btn"
                  onClick={() => setSelectedJob(null)}
                >
                  Close
                </button>
              </div>
            </div>

            <form method="dialog" className="modal-backdrop">
              <button onClick={() => setSelectedJob(null)}>close</button>
            </form>
          </dialog>
        )}
      </main>
    </div>
  );
}

export default AdminJobs;
