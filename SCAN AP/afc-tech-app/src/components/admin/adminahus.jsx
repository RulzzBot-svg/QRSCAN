import { useEffect, useState } from "react";
import { API } from "../../api/api";
import AdminFilterEditorInline from "./adminInlineEditor";

function AdminAHUs() {
  const [ahus, setAhus] = useState([]);
  const [loading, setLoading] = useState(true);

  // which AHUs are expanded
  const [openMap, setOpenMap] = useState({}); // { [ahuId]: true/false }

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await API.get("/admin/ahus");
      setAhus(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    };
    load();
  }, []);

  const toggleOpen = (ahuId) => {
    setOpenMap((prev) => ({ ...prev, [ahuId]: !prev[ahuId] }));
  };

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
            <div className="divide-y divide-base-300">
              {ahus.map((a) => {
                const isOpen = !!openMap[a.id];

                return (
                  <div key={a.id} className="p-4">
                    {/* AHU "line item" */}
                    <button
                      className="w-full text-left"
                      onClick={() => toggleOpen(a.id)}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="font-semibold text-lg truncate">
                              {a.id}
                            </div>

                            {/* quick status chips */}
                            <div className="flex items-center gap-2">
                              {a.overdue_count > 0 ? (
                                <span className="badge badge-error">
                                  {a.overdue_count} overdue
                                </span>
                              ) : (
                                <span className="badge badge-ghost">0 overdue</span>
                              )}

                              {a.due_soon_count > 0 ? (
                                <span className="badge badge-warning">
                                  {a.due_soon_count} due soon
                                </span>
                              ) : (
                                <span className="badge badge-ghost">0 due soon</span>
                              )}
                            </div>
                          </div>

                          <div className="text-sm opacity-80 mt-1">
                            {a.hospital}
                            {a.location ? ` • ${a.location}` : ""}
                            {" • "}
                            Last:{" "}
                            {a.last_serviced
                              ? new Date(a.last_serviced).toLocaleDateString()
                              : "Never"}
                            {" • "}
                            Next:{" "}
                            {a.next_due_date
                              ? new Date(a.next_due_date).toLocaleDateString()
                              : "—"}
                          </div>
                        </div>

                        <div className="shrink-0">
                          <span className="btn btn-sm btn-outline">
                            {isOpen ? "Hide Filters" : "View Filters"}
                          </span>
                        </div>
                      </div>
                    </button>

                    {/* Filters grouped under this AHU */}
                    <AdminFilterEditorInline ahuId={a.id} isOpen={isOpen} />
                  </div>
                );
              })}

              {ahus.length === 0 && (
                <div className="p-6 text-center opacity-70">
                  No AHUs found.
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminAHUs;
