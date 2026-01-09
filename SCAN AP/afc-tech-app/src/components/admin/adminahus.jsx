import { useEffect, useMemo, useState } from "react";
import { API } from "../../api/api";
import AdminFilterEditorInline from "./adminInlineEditor";

function AdminAHUs() {
  const [ahus, setAhus] = useState([]);
  const [loading, setLoading] = useState(true);

  // which AHUs are expanded
  const [openMap, setOpenMap] = useState({}); // { [ahuId]: true/false }

  // which hospitals are collapsed/expanded
  const [openHospitals, setOpenHospitals] = useState({}); // { [hospitalKey]: true/false }

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await API.get("/admin/ahus");
        setAhus(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to load AHUs:", err);
        setAhus([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggleOpenAhu = (ahuId) => {
    setOpenMap((prev) => ({ ...prev, [ahuId]: !prev[ahuId] }));
  };

  const toggleOpenHospital = (hospitalKey) => {
    setOpenHospitals((prev) => ({ ...prev, [hospitalKey]: !prev[hospitalKey] }));
  };

  // Group AHUs by hospital
  const grouped = useMemo(() => {
    const map = new Map();

    for (const a of ahus) {
      const key = a.hospital_id != null ? String(a.hospital_id) : "unknown";
      const name = a.hospital || "Unknown Hospital";

      if (!map.has(key)) {
        map.set(key, { hospitalKey: key, hospitalName: name, items: [] });
      }
      map.get(key).items.push(a);
    }

    // sort hospitals alphabetically
    const groups = Array.from(map.values()).sort((g1, g2) =>
      g1.hospitalName.localeCompare(g2.hospitalName)
    );

    // sort AHUs inside each hospital by id
    for (const g of groups) {
      g.items.sort((x, y) => String(x.id).localeCompare(String(y.id)));
    }

    return groups;
  }, [ahus]);

  // Optional: expand all hospitals by default after first load
  useEffect(() => {
    if (loading) return;
    setOpenHospitals((prev) => {
      // only set defaults once
      if (Object.keys(prev).length) return prev;

      const next = {};
      for (const g of grouped) next[g.hospitalKey] = true;
      return next;
    });
  }, [loading, grouped]);

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
              {grouped.map((group) => {
                const isHospitalOpen = !!openHospitals[group.hospitalKey];

                // quick hospital summary chips
                const hospitalOverdue = group.items.reduce(
                  (acc, a) => acc + (a.overdue_count || 0),
                  0
                );
                const hospitalDueSoon = group.items.reduce(
                  (acc, a) => acc + (a.due_soon_count || 0),
                  0
                );

                return (
                  <div key={group.hospitalKey} className="p-4">
                    {/* Hospital header */}
                    <button
                      className="w-full text-left"
                      onClick={() => toggleOpenHospital(group.hospitalKey)}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="font-bold text-xl truncate">
                              {group.hospitalName}
                            </div>

                            <div className="flex items-center gap-2">
                              {hospitalOverdue > 0 ? (
                                <span className="badge badge-error">
                                  {hospitalOverdue} overdue
                                </span>
                              ) : (
                                <span className="badge badge-ghost">0 overdue</span>
                              )}

                              {hospitalDueSoon > 0 ? (
                                <span className="badge badge-warning">
                                  {hospitalDueSoon} due soon
                                </span>
                              ) : (
                                <span className="badge badge-ghost">0 due soon</span>
                              )}

                              <span className="badge badge-ghost">
                                {group.items.length} AHUs
                              </span>
                            </div>
                          </div>

                          <div className="text-sm opacity-70 mt-1">
                            Click to {isHospitalOpen ? "collapse" : "expand"} hospital
                          </div>
                        </div>

                        <div className="shrink-0">
                          <span className="btn btn-sm btn-outline">
                            {isHospitalOpen ? "Hide AHUs" : "View AHUs"}
                          </span>
                        </div>
                      </div>
                    </button>

                    {/* AHUs under hospital */}
                    {isHospitalOpen && (
                      <div className="mt-4 space-y-3">
                        {group.items.map((a) => {
                          const isOpen = !!openMap[a.id];

                          return (
                            <div
                              key={a.id}
                              className="bg-base-200/40 border border-base-300 rounded-lg"
                            >
                              {/* AHU header row */}
                              <button
                                className="w-full text-left p-4"
                                onClick={() => toggleOpenAhu(a.id)}
                                type="button"
                              >
                                <div className="flex items-center justify-between gap-4">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-3">
                                      <div className="font-semibold text-lg truncate">
                                        {a.id}
                                      </div>

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

                                        <span className="badge badge-ghost">
                                          {a.filters_count ?? 0} filters
                                        </span>
                                      </div>
                                    </div>

                                    <div className="text-sm opacity-80 mt-1">
                                      {a.location ? `${a.location} • ` : ""}
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

                              {/* Filters (inline editor) */}
                              <div className="px-4 pb-4">
                                <AdminFilterEditorInline ahuId={a.id} isOpen={isOpen} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {ahus.length === 0 && (
                <div className="p-6 text-center opacity-70">No AHUs found.</div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminAHUs;
