import { useEffect, useState } from "react";
import AdminFilterEditor from "./adminFilterEditor";
import { API } from "../../api/api";

function AdminAHUs() {
  const [ahus, setAhus] = useState([]);
  const [selectedAHU, setSelectedAHU] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await API.get("/admin/ahus");
      setAhus(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    };

    load();
  }, []);

  return (
    <div data-theme="corporate" className="min-h-screen bg-base-200">
      <main className="p-6">
        <h1 className="text-3xl font-bold text-primary mb-6">
          AHU Maintenance Overview
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
                  <th className="text-center">Overdue</th>
                  <th className="text-center">Due Soon</th>
                  <th>Last Serviced</th>
                  <th>Next Due</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ahus.map((a) => (
                  <tr key={a.id}>
                    <td className="font-medium">{a.id}</td>
                    <td>{a.hospital}</td>
                    <td>{a.location || "—"}</td>

                    {/* Overdue count */}
                    <td className="text-center">
                      {a.overdue_count > 0 ? (
                        <span className="badge badge-error">
                          {a.overdue_count}
                        </span>
                      ) : (
                        <span className="badge badge-ghost">0</span>
                      )}
                    </td>

                    {/* Due soon count */}
                    <td className="text-center">
                      {a.due_soon_count > 0 ? (
                        <span className="badge badge-warning">
                          {a.due_soon_count}
                        </span>
                      ) : (
                        <span className="badge badge-ghost">0</span>
                      )}
                    </td>

                    {/* Last serviced */}
                    <td className="text-sm">
                      {a.last_serviced
                        ? new Date(a.last_serviced).toLocaleDateString()
                        : "Never"}
                    </td>

                    {/* Next due */}
                    <td className="text-sm">
                      {a.next_due_date
                        ? new Date(a.next_due_date).toLocaleDateString()
                        : "—"}
                    </td>

                    {/* Actions */}
                    <td className="text-right">
                      <button
                        className="btn btn-xs btn-outline"
                        onClick={() => setSelectedAHU(a)}
                      >
                        View Schedule
                      </button>
                    </td>
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
