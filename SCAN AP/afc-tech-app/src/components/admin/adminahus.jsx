// AdminAHUs.jsx
import { useEffect, useMemo, useState } from "react";
import { API } from "../../api/api";
import AdminFilterEditorInline from "./adminInlineEditor";

// Natural sort for IDs like "AHU-1", "AHU 1", "AHU-46", "46", etc.
const naturalAhuSort = (a, b) => {
  const A = String(a ?? "");
  const B = String(b ?? "");

  const numA = (A.match(/\d+/) || [null])[0];
  const numB = (B.match(/\d+/) || [null])[0];

  if (numA != null && numB != null) {
    const nA = parseInt(numA, 10);
    const nB = parseInt(numB, 10);

    const preA = A.split(numA)[0].trim().toLowerCase();
    const preB = B.split(numB)[0].trim().toLowerCase();

    if (preA !== preB) return preA.localeCompare(preB);
    if (nA !== nB) return nA - nB;

    return A.localeCompare(B, undefined, { numeric: true, sensitivity: "base" });
  }

  if (numA != null && numB == null) return -1;
  if (numA == null && numB != null) return 1;

  return A.localeCompare(B, undefined, { numeric: true, sensitivity: "base" });
};

function AdminAHUs() {
  const [ahus, setAhus] = useState([]);
  const [loading, setLoading] = useState(true);

  // which hospitals are collapsed/expanded
  const [openHospitals, setOpenHospitals] = useState({}); // { [hospitalKey]: true/false }

  // Option 3: selected AHU drives a right-side inspector panel
  const [selectedAhuId, setSelectedAhuId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await API.get("/admin/ahus");
        const list = Array.isArray(res.data) ? res.data : [];
        setAhus(list);

        // If nothing selected yet, pick the first AHU (optional behavior)
        if (!selectedAhuId && list.length) {
          setSelectedAhuId(list[0].id);
        }
      } catch (err) {
        console.error("Failed to load AHUs:", err);
        setAhus([]);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    // sort AHUs inside each hospital by natural numeric order
    for (const g of groups) {
      g.items.sort((x, y) => naturalAhuSort(x.id, y.id));
    }

    return groups;
  }, [ahus]);

  // Expand all hospitals by default after first load
  useEffect(() => {
    if (loading) return;
    setOpenHospitals((prev) => {
      if (Object.keys(prev).length) return prev;
      const next = {};
      for (const g of grouped) next[g.hospitalKey] = true;
      return next;
    });
  }, [loading, grouped]);

  const toggleOpenHospital = (hospitalKey) => {
    setOpenHospitals((prev) => ({ ...prev, [hospitalKey]: !prev[hospitalKey] }));
  };

  const selectedAhu = useMemo(
    () => ahus.find((x) => String(x.id) === String(selectedAhuId)) || null,
    [ahus, selectedAhuId]
  );

  return (
    <div data-theme="corporate" className="min-h-screen bg-base-200">
      <main className="w-full p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">AHU Maintenance Overview</h1>
            <div className="text-sm opacity-70 mt-1">
              Click an AHU to open the inspector panel (filters + editing) on the right.
            </div>
          </div>

          {selectedAhu && (
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setSelectedAhuId(null)}
              type="button"
            >
              Close Panel
            </button>
          )}
        </div>

        {loading ? (
          <div className="bg-base-100 border border-base-300 rounded-lg shadow p-10 text-center">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          // ✅ KEY CHANGE: flex layout that becomes 70/30 on desktop
          <div className="flex flex-col lg:flex-row gap-4">
            {/* LEFT: Dense list (70%) */}
            <div className="w-full lg:w-[60%] min-w-0">
              <div className="bg-base-100 border border-base-300 rounded-lg shadow">
                <div className="p-4 border-b border-base-300 flex items-center justify-between">
                  <div className="font-semibold">Hospitals / AHUs</div>
                  <div className="text-xs opacity-70">{ahus.length} total AHUs</div>
                </div>

                {/* Optional: make the list scroll within viewport on large screens */}
                <div className="divide-y divide-base-300 lg:max-h-[calc(100vh-160px)] lg:overflow-y-auto">
                  {grouped.map((group) => {
                    const isHospitalOpen = !!openHospitals[group.hospitalKey];

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
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-3">
                                <div className="font-bold text-lg truncate">
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

                              <div className="text-xs opacity-70 mt-1">
                                Click to {isHospitalOpen ? "collapse" : "expand"} hospital
                              </div>
                            </div>

                            <span className="btn btn-xs btn-outline shrink-0">
                              {isHospitalOpen ? "Hide" : "View"}
                            </span>
                          </div>
                        </button>

                        {/* Dense AHU rows */}
                        {isHospitalOpen && (
                          <div className="mt-3">
                            <div className="border border-base-300 rounded-md overflow-hidden">
                              {group.items.map((a) => {
                                const isSelected = String(selectedAhuId) === String(a.id);

                                return (
                                  <button
                                    key={a.id}
                                    type="button"
                                    onClick={() => setSelectedAhuId(a.id)}
                                    className={[
                                      "w-full text-left px-3 py-2",
                                      "flex items-center justify-between gap-3",
                                      "hover:bg-base-200/60",
                                      "border-b border-base-300 last:border-b-0",
                                      isSelected ? "bg-primary/10 ring-1 ring-primary/30" : "",
                                    ].join(" ")}
                                  >
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <div className="font-semibold truncate">{a.id}</div>

                                        {a.overdue_count > 0 ? (
                                          <span className="badge badge-error badge-sm">
                                            {a.overdue_count} overdue
                                          </span>
                                        ) : null}

                                        {a.due_soon_count > 0 ? (
                                          <span className="badge badge-warning badge-sm">
                                            {a.due_soon_count} due soon
                                          </span>
                                        ) : null}

                                        <span className="badge badge-ghost badge-sm">
                                          {a.filters_count ?? 0} filters
                                        </span>
                                      </div>

                                      <div className="text-xs opacity-70 truncate mt-0.5">
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

                                    <div className="shrink-0 text-xs opacity-70">
                                      {isSelected ? "Selected" : "Open"}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {ahus.length === 0 && (
                    <div className="p-6 text-center opacity-70">No AHUs found.</div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT: Inspector panel (30%) */}
            {selectedAhu ? (
              <div className="w-full lg:w-[40%] lg:min-w-[380px] min-w-0">
                <div className="bg-base-100 border border-base-300 rounded-lg shadow lg:sticky lg:top-6">
                  <div className="p-4 border-b border-base-300 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-lg font-bold truncate">{selectedAhu.id}</div>

                        {selectedAhu.overdue_count > 0 ? (
                          <span className="badge badge-error badge-sm">
                            {selectedAhu.overdue_count} overdue
                          </span>
                        ) : (
                          <span className="badge badge-ghost badge-sm">0 overdue</span>
                        )}

                        {selectedAhu.due_soon_count > 0 ? (
                          <span className="badge badge-warning badge-sm">
                            {selectedAhu.due_soon_count} due soon
                          </span>
                        ) : (
                          <span className="badge badge-ghost badge-sm">0 due soon</span>
                        )}

                        <span className="badge badge-ghost badge-sm">
                          {selectedAhu.filters_count ?? 0} filters
                        </span>
                      </div>

                      <div className="text-xs opacity-70 mt-1">
                        {selectedAhu.hospital ? (
                          <span className="mr-2">🏥 {selectedAhu.hospital}</span>
                        ) : null}
                        {selectedAhu.location ? <span>📍 {selectedAhu.location}</span> : null}
                      </div>

                      <div className="text-xs opacity-70 mt-1">
                        Last:{" "}
                        {selectedAhu.last_serviced
                          ? new Date(selectedAhu.last_serviced).toLocaleDateString()
                          : "Never"}
                        {" • "}
                        Next:{" "}
                        {selectedAhu.next_due_date
                          ? new Date(selectedAhu.next_due_date).toLocaleDateString()
                          : "—"}
                      </div>
                    </div>

                    <button
                      className="btn btn-sm btn-outline shrink-0"
                      onClick={() => setSelectedAhuId(null)}
                      type="button"
                    >
                      Close
                    </button>
                  </div>

                  {/* Optional: make panel content scroll if it gets tall */}
                  <div className="p-4 lg:max-h-[calc(100vh-170px)] lg:overflow-y-auto">
                    <AdminFilterEditorInline ahuId={selectedAhu.id} isOpen={true} />
                  </div>
                </div>
              </div>
            ) : (
              // If no AHU selected, you can either hide the panel entirely (current behavior),
              // or show an empty placeholder panel. If you want the placeholder, uncomment below:
              //
              // <div className="w-full lg:w-[30%] lg:min-w-[380px] min-w-0">
              //   <div className="bg-base-100 border border-base-300 rounded-lg shadow p-6 opacity-70">
              //     Select an AHU to view details.
              //   </div>
              // </div>
              null
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminAHUs;
