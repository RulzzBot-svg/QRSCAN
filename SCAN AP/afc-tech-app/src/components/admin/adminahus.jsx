// AdminAHUs.jsx
import { useEffect, useMemo, useState, Fragment } from "react";
import { API } from "../../api/api";
import AdminFilterEditorInline from "./adminInlineEditor";
import SupervisorSignoff from "../common/SupervisorSignoff";

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

  // NEW: which buildings are collapsed/expanded per hospital
  // shape: { [hospitalKey]: { [buildingName]: true/false } }
  const [openBuildings, setOpenBuildings] = useState({});

  // Inline dropdown mode: expanded AHU in list
  const [expandedAhuId, setExpandedAhuId] = useState(null);

  // Form state for creating new AHU
  const [showNewAhuForm, setShowNewAhuForm] = useState(false);
  const [hospitals, setHospitals] = useState([]);
  const [newAhuFormData, setNewAhuFormData] = useState({
    hospital_id: "",
    ahu_name: "",
  });
  const [newAhuLoading, setNewAhuLoading] = useState(false);
  const [showSignoff, setShowSignoff] = useState(false);
  const [viewMode, setViewMode] = useState("spreadsheet"); // 'spreadsheet' | 'nested'
  const [query, setQuery] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await API.get("/admin/ahus");
        const list = Array.isArray(res.data) ? res.data : [];
        setAhus(list);

        // Fetch hospitals for the form
        const hospitalsRes = await API.get("/admin/hospitals");
        const hospitalsList = Array.isArray(hospitalsRes.data) ? hospitalsRes.data : [];
        setHospitals(hospitalsList);
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

  // Group AHUs by hospital -> building
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

    // sort AHUs inside each hospital by natural numeric order, and group by building
    for (const g of groups) {
      const buildingMap = new Map();
      for (const a of g.items) {
        const bname = a.building || "(No building)";
        if (!buildingMap.has(bname)) buildingMap.set(bname, []);
        buildingMap.get(bname).push(a);
      }

      const buildings = Array.from(buildingMap.entries()).map(([name, items]) => {
        items.sort((x, y) => naturalAhuSort(x.id, y.id));
        return { buildingName: name, items };
      });

      // sort buildings by name
      buildings.sort((x, y) => x.buildingName.localeCompare(y.buildingName));

      g.buildings = buildings;
    }

    return groups;
  }, [ahus]);

  // Expand all hospitals by default after first load
  useEffect(() => {
    if (loading) return;

    setOpenHospitals((prev) => {
      if (Object.keys(prev).length) return prev;
      const next = {};
      for (const g of grouped) next[g.hospitalKey] = false; // default collapsed
      return next;
    });

    // Also initialize building open map so buildings start collapsed
    setOpenBuildings((prev) => {
      if (Object.keys(prev).length) return prev;
      const next = {};
      for (const g of grouped) {
        const hKey = g.hospitalKey;
        next[hKey] = {};
        for (const b of g.buildings || []) {
          next[hKey][b.buildingName] = false; // default collapsed
        }
      }
      return next;
    });
  }, [loading, grouped]);

  const toggleOpenHospital = (hospitalKey) => {
    setOpenHospitals((prev) => ({ ...prev, [hospitalKey]: !prev[hospitalKey] }));
  };

  const toggleOpenBuilding = (hospitalKey, buildingName) => {
    setOpenBuildings((prev) => {
      const h = prev[hospitalKey] || {};
      return {
        ...prev,
        [hospitalKey]: {
          ...h,
          [buildingName]: !h[buildingName],
        },
      };
    });
  };

  const labelFor = (id) => {
    if (!id) return "";
    const idx = String(id).indexOf("-");
    return idx >= 0 ? String(id).slice(idx + 1) : String(id);
  };

  const handleCreateAhu = async () => {
    if (!newAhuFormData.hospital_id || !newAhuFormData.ahu_name.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    setNewAhuLoading(true);
    try {
      await API.post("/admin/ahu", {
        hospital_id: parseInt(newAhuFormData.hospital_id, 10),
        ahu_name: newAhuFormData.ahu_name,
      });

      // Reset form and refresh AHU list
      setNewAhuFormData({ hospital_id: "", ahu_name: "" });
      setShowNewAhuForm(false);

      // Reload AHUs
      const res = await API.get("/admin/ahus");
      const list = Array.isArray(res.data) ? res.data : [];
      setAhus(list);
    } catch (err) {
      console.error("Failed to create AHU:", err);
      alert("Error creating AHU: " + (err.response?.data?.error || err.message));
    } finally {
      setNewAhuLoading(false);
    }
  };

  return (
    <div data-theme="corporate" className="min-h-screen bg-base-200">
      <main className="w-full p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">AHU Maintenance Overview</h1>
            <div className="text-sm opacity-70 mt-1">Hospital → Building → AHU → Filters (accordion dropdowns).</div>
          </div>

          {expandedAhuId && (
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setExpandedAhuId(null)}
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
          <div>
            {/* Add New AHU Form */}
            <div className="mb-4">
              {!showNewAhuForm ? (
                <div className="flex gap-2">
                  <button className="btn btn-primary btn-sm" onClick={() => setShowNewAhuForm(true)} type="button">
                    + Add New AHU
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowSignoff(true)} type="button">
                    Supervisor Sign-off
                  </button>
                </div>
              ) : (
                <div className="bg-base-100 border border-base-300 rounded-lg shadow p-4">
                  <div className="font-semibold mb-3">Create New AHU</div>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="text-sm font-medium">Hospital *</label>
                      <select
                        className="select select-bordered w-full"
                        value={newAhuFormData.hospital_id}
                        onChange={(e) => setNewAhuFormData({ ...newAhuFormData, hospital_id: e.target.value })}
                      >
                        <option value="">Select a hospital</option>
                        {hospitals.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">AHU Name *</label>
                      <input
                        type="text"
                        className="input input-bordered w-full"
                        placeholder="e.g., AHU-1, Main Floor Unit"
                        value={newAhuFormData.ahu_name}
                        onChange={(e) => setNewAhuFormData({ ...newAhuFormData, ahu_name: e.target.value })}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button className="btn btn-primary btn-sm flex-1" onClick={handleCreateAhu} disabled={newAhuLoading} type="button">
                        {newAhuLoading ? <span className="loading loading-spinner loading-xs"></span> : "Create"}
                      </button>
                      <button className="btn btn-outline btn-sm flex-1" onClick={() => setShowNewAhuForm(false)} type="button">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* AHU List */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="w-full lg:w-full min-w-0">
                <div className="bg-base-100 border border-base-300 rounded-lg shadow">
                  <div className="p-4 border-b border-base-300 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold">AHUs</div>
                      <div className="text-xs opacity-70">{ahus.length} total AHUs</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="input-group">
                        <input placeholder="Search hospital, building, location or label..." value={query} onChange={(e) => setQuery(e.target.value)} className="input input-sm input-bordered" />
                      </div>

                      <div className="btn-group">
                        <button className={`btn btn-sm ${viewMode === "spreadsheet" ? "btn-primary" : "btn-outline"}`} onClick={() => setViewMode("spreadsheet")} type="button">
                          Spreadsheet
                        </button>
                        <button className={`btn btn-sm ${viewMode === "nested" ? "btn-primary" : "btn-outline"}`} onClick={() => setViewMode("nested")} type="button">
                          Nested
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Spreadsheet view */}
                  {viewMode === "spreadsheet" ? (
                    <div className="p-2 lg:max-h-[calc(100vh-180px)] lg:overflow-auto">
                      <table className="table table-compact w-full">
                        <thead>
                          <tr>
                            <th></th>
                            <th>Hospital</th>
                            <th>Building</th>
                            <th>Location</th>
                            <th>Label</th>
                            <th>Overdue</th>
                            <th>Due Soon</th>
                            <th>Last</th>
                            <th>Next</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ahus
                            .filter((a) => {
                              if (!query) return true;
                              const q = query.toLowerCase();
                              return (
                                String(a.id || "").toLowerCase().includes(q) ||
                                String(a.name || "").toLowerCase().includes(q) ||
                                String(a.location || "").toLowerCase().includes(q) ||
                                String(a.hospital || "").toLowerCase().includes(q)
                              );
                            })
                            .map((a) => {
                              const isSelected = String(expandedAhuId) === String(a.id);
                              return (
                                <Fragment key={`frag-${a.id}`}>
                                  <tr key={`row-${a.id}`} className={isSelected ? "bg-primary/10" : ""}>
                                    <td>
                                      <button className="btn btn-ghost btn-xs" onClick={() => setExpandedAhuId(expandedAhuId === a.id ? null : a.id)} type="button">
                                        {isSelected ? "-" : "+"}
                                      </button>
                                    </td>
                                    <td className="truncate max-w-xs">{a.hospital}</td>
                                    <td className="truncate max-w-xs">{a.building || "-"}</td>
                                    <td className="truncate max-w-xs">{a.location || "-"}</td>
                                    <td>{a.name || labelFor(a.id)}</td>
                                    <td>{a.overdue_count > 0 ? <span className="badge badge-error badge-sm">{a.overdue_count}</span> : <span className="badge badge-ghost badge-sm">0</span>}</td>
                                    <td>{a.due_soon_count > 0 ? <span className="badge badge-warning badge-sm">{a.due_soon_count}</span> : <span className="badge badge-ghost badge-sm">0</span>}</td>
                                    <td className="text-xs">{a.last_serviced ? <span className="badge badge-sm badge-info">{new Date(a.last_serviced).toLocaleDateString()}</span> : <span className="text-muted">—</span>}</td>
                                    <td className="text-xs">{a.next_due_date ? <span className="badge badge-sm badge-outline">{new Date(a.next_due_date).toLocaleDateString()}</span> : <span className="text-muted">—</span>}</td>
                                    <td>
                                      <div className="flex gap-2">
                                        <button className="btn btn-xs btn-outline" onClick={() => window.open(`/FilterInfo/${a.id}`, "_blank")} type="button">
                                          Open
                                        </button>
                                      </div>
                                    </td>
                                  </tr>

                                  {isSelected && (
                                    <tr key={`exp-${a.id}`} className="bg-base-100">
                                      <td colSpan={10} className="p-0">
                                        <div className="p-3 border-t">
                                          <AdminFilterEditorInline ahuId={a.id} isOpen={true} />
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="divide-y divide-base-300 lg:max-h-[calc(100vh-160px)] lg:overflow-y-auto">
                      {grouped.map((group) => {
                        const isHospitalOpen = !!openHospitals[group.hospitalKey];

                        const hospitalOverdue = group.items.reduce((acc, a) => acc + (a.overdue_count || 0), 0);
                        const hospitalDueSoon = group.items.reduce((acc, a) => acc + (a.due_soon_count || 0), 0);

                        const hospitalOk = group.items.reduce((acc, a) => {
                          const okCount = (a.filters_count ?? 0) - (a.overdue_count ?? 0) - (a.due_soon_count ?? 0);
                          return acc + Math.max(0, okCount);
                        }, 0);

                        return (
                          <div key={group.hospitalKey} className="p-4">
                            <button className="w-full text-left" onClick={() => toggleOpenHospital(group.hospitalKey)} type="button">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-3">
                                    <div className="font-bold text-lg truncate">{group.hospitalName}</div>

                                    <div className="flex items-center gap-2">
                                      {hospitalOk > 0 ? <span className="badge badge-sm badge-success">{hospitalOk} OK</span> : <span className="badge badge-sm badge-ghost">0 OK</span>}
                                      {hospitalOverdue > 0 ? <span className="badge badge-sm badge-error">{hospitalOverdue} overdue</span> : <span className="badge badge-sm badge-ghost">0 overdue</span>}
                                      {hospitalDueSoon > 0 ? <span className="badge badge-sm badge-warning">{hospitalDueSoon} due soon</span> : <span className="badge badge-sm badge-ghost">0 due soon</span>}

                                      <span className="badge badge-sm badge-ghost">{group.items.length} AHUs</span>
                                    </div>
                                  </div>

                                  <div className="text-xs opacity-70 mt-1">Click to {isHospitalOpen ? "collapse" : "expand"} hospital</div>
                                </div>

                                <span className="btn btn-xs btn-outline shrink-0">{isHospitalOpen ? "Hide" : "View"}</span>
                              </div>
                            </button>

                            {isHospitalOpen && (
                              <div className="mt-3">
                                <div className="overflow-auto">
                                  <table className="table table-compact w-full">
                                    <thead>
                                      <tr>
                                        <th></th>
                                        <th>ID</th>
                                        <th>Label</th>
                                        <th>Building</th>
                                        <th>Location</th>
                                        <th>Filters</th>
                                        <th>Overdue</th>
                                        <th>Due Soon</th>
                                        <th>Last</th>
                                        <th>Next</th>
                                        <th>Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {group.items
                                        .filter((a) => {
                                          if (!query) return true;
                                          const q = query.toLowerCase();
                                          return (
                                            String(a.id || "").toLowerCase().includes(q) ||
                                            String(a.name || "").toLowerCase().includes(q) ||
                                            String(a.location || "").toLowerCase().includes(q)
                                          );
                                        })
                                        .map((a) => {
                                          const isSelected = String(expandedAhuId) === String(a.id);
                                          return (
                                            <Fragment key={`frag-h-${a.id}`}>
                                              <tr key={`row-h-${a.id}`} className={isSelected ? "bg-primary/10" : ""}>
                                                <td>
                                                  <button className="btn btn-ghost btn-xs" onClick={() => setExpandedAhuId(expandedAhuId === a.id ? null : a.id)} type="button">
                                                    {isSelected ? "-" : "+"}
                                                  </button>
                                                </td>
                                                <td className="font-mono">{a.id}</td>
                                                <td>{a.name || labelFor(a.id)}</td>
                                                <td className="truncate max-w-xs">{a.building || "-"}</td>
                                                <td className="truncate max-w-xs">{a.location || "-"}</td>
                                                <td>{a.filters_count ?? 0}</td>
                                                <td>{a.overdue_count > 0 ? <span className="badge badge-error badge-sm">{a.overdue_count} overdue</span> : <span className="badge badge-ghost badge-sm">0</span>}</td>
                                                <td>{a.due_soon_count > 0 ? <span className="badge badge-warning badge-sm">{a.due_soon_count} due soon</span> : <span className="badge badge-ghost badge-sm">0</span>}</td>
                                                <td className="text-xs">{a.last_serviced ? <span className="badge badge-sm badge-info">{new Date(a.last_serviced).toLocaleDateString()}</span> : <span className="text-muted">—</span>}</td>
                                                <td className="text-xs">{a.next_due_date ? <span className="badge badge-sm badge-outline">{new Date(a.next_due_date).toLocaleDateString()}</span> : <span className="text-muted">—</span>}</td>
                                                <td>
                                                  <div className="flex gap-2">
                                                    <button className="btn btn-xs btn-outline" onClick={() => window.open(`/ahu/${a.id}`, "_blank")} type="button">
                                                      Open
                                                    </button>
                                                  </div>
                                                </td>
                                              </tr>

                                              {isSelected && (
                                                <tr key={`exp-h-${a.id}`} className="bg-base-100">
                                                  <td colSpan={11} className="p-0">
                                                    <div className="p-3 border-t">
                                                      <AdminFilterEditorInline ahuId={a.id} isOpen={true} />
                                                    </div>
                                                  </td>
                                                </tr>
                                              )}
                                            </Fragment>
                                          );
                                        })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {ahus.length === 0 && <div className="p-6 text-center opacity-70">No AHUs found.</div>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <SupervisorSignoff open={showSignoff} onClose={() => setShowSignoff(false)} hospitals={hospitals} ahus={ahus} />
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminAHUs;
