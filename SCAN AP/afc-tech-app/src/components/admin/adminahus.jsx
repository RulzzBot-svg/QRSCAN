import { useEffect, useState } from "react";
import axios from "axios";
import AdminSidebar from "./AdminSidebar";
import AdminFilterEditor from "./adminFilterEditor";

function AdminAHUs() {
  const [ahus, setAhus] = useState([]);
  const [selectedAHU, setSelectedAHU] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await axios.get("/api/admin/ahus");
      setAhus(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    };

    load();
  }, []);

  return (
    <div data-theme="corporate" className="flex min-h-screen bg-base-200">
      <AdminSidebar />

      <main className="flex-1 p-6">
        <h1 className="text-3xl font-bold text-primary mb-6">
          AHU Master List
        </h1>

        <div className="bg-base-100 border border-base-300 rounded-lg shadow">
          {loading ? (
            <div className="p-6 text-center">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : (
            <table className="table table-zebra table-pin-rows w-full">
              <thead>
                <tr>
                  <th>AHU</th>
                  <th>Hospital</th>
                  <th>Location</th>
                  <th>Edit Filters</th>
                  <th>Status</th>
                  <th>Next Due</th>
                </tr>
              </thead>
              <tbody>
                {ahus.map(a => (
                  <tr key={a.id}>
                    <td className="font-medium">{a.id}</td>
                    <td>{a.hospital}</td>
                    <td>{a.location}</td>
                    <td>
                      <button
                        className="btn btn-xs btn-outline"
                        onClick={() => setSelectedAHU(a)}
                      >
                        Edit Filters
                      </button>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          a.status === "Overdue"
                            ? "badge-error"
                            : a.status === "Due Soon"
                            ? "badge-warning"
                            : a.status === "Completed"
                            ? "badge-success"
                            : "badge-ghost"
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td>{a.next_due_date || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selectedAHU && (
          <AdminFilterEditor
            ahu={selectedAHU}
            onClose={() => setSelectedAHU(null)}
          />
        )}
      </main>
    </div>
  );
}

export default AdminAHUs;
