// AdminAHUs.jsx
// Redesigned Admin AHU UI: two-pane layout
import { useEffect, useMemo, useRef, useState } from "react";
import { API } from "../../api/api";
import AdminFilterEditorInline from "./adminInlineEditor";
import SupervisorSignoff from "../common/SupervisorSignoff";
import PackingSlipPanel from "./PackingSlipPanel";
import PackingSlipReviewModal from "./PackingSlipReviewModal";
import QrLabelPrintModal from "./QrLabelPrintModal";
import { buildQrLabels } from "../../utils/qrLabels";
import {
  copyPackingSlipToClipboard,
  countPackingSlipItems,
  qbPasteInstructions,
  selectionToFiltersByAhu,
} from "../../utils/qbPackingSlip";

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
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [hospitalQuery, setHospitalQuery] = useState(""); // searches hospitals in the left pane
  const [ahuQuery, setAhuQuery] = useState(""); // searches AHUs in the right pane
  const [selected, setSelected] = useState({}); // { [ahuId]: true }
  const [selectedHospitalKey, setSelectedHospitalKey] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [showSignoff, setShowSignoff] = useState(false);
  const [showAddAhu, setShowAddAhu] = useState(false);
  const [newAhuHospital, setNewAhuHospital] = useState(null);
  const [newAhuBuilding, setNewAhuBuilding] = useState("");
  const [newAhuName, setNewAhuName] = useState("");
  const [newAhuLocation, setNewAhuLocation] = useState("");
  const [newAhuNotes, setNewAhuNotes] = useState("");
  const [selectedFiltersForQB, setSelectedFiltersForQB] = useState({});
  const [manualReviewData, setManualReviewData] = useState(null);
  const [buildingFilter, setBuildingFilter] = useState("");
  const [showAllHospitals, setShowAllHospitals] = useState(false);
  const [qrPrint, setQrPrint] = useState({
    open: false,
    loading: false,
    labels: [],
    title: "AHU QR Labels",
    error: "",
  });
  const [ahuPartial, setAhuPartial] = useState({});
  const filterEditorRefs = useRef(new Map());

  const HOSPITAL_PREVIEW_LIMIT = 10;

  // NEW: Global (page-level) filter bar state (independent of tables)
  const [globalFilters, setGlobalFilters] = useState({
    frequency: "all", // all | 30 | 60 | 90 | 180 | 365
    status: "all", // all | ok | due_soon | overdue | pending | inactive
    nextFrom: "", // yyyy-mm-dd
    nextTo: "", // yyyy-mm-dd
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await API.get("/admin/ahus");
        setAhus(Array.isArray(res.data) ? res.data : []);
        const hr = await API.get("/admin/hospitals");
        setHospitals(Array.isArray(hr.data) ? hr.data : []);
      } catch (e) {
        console.error(e);
        setAhus([]);
        setHospitals([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // helper to refresh data after mutations
  const refreshData = async () => {
    try {
      const res = await API.get("/admin/ahus");
      setAhus(Array.isArray(res.data) ? res.data : []);
      const hr = await API.get("/admin/hospitals");
      setHospitals(Array.isArray(hr.data) ? hr.data : []);
    } catch (e) {
      console.error(e);
    }
  };

  // Group by hospital then building (LEFT PANEL — unchanged)
  const grouped = useMemo(() => {
    const map = new Map();
    for (const a of ahus) {
      const hKey = a.hospital_id != null ? String(a.hospital_id) : "unknown";
      const hName = a.hospital || "Unknown";
      if (!map.has(hKey)) map.set(hKey, { hospitalKey: hKey, hospitalName: hName, items: [] });
      map.get(hKey).items.push(a);
    }
    const groups = Array.from(map.values()).sort((x, y) => x.hospitalName.localeCompare(y.hospitalName));
    for (const g of groups) {
      const bmap = new Map();
      for (const a of g.items) {
        const b = a.building || "(No building)";
        if (!bmap.has(b)) bmap.set(b, []);
        bmap.get(b).push(a);
      }
      g.buildings = Array.from(bmap.entries()).map(([name, items]) => ({
        buildingName: name,
        items: items.sort((p, q) => naturalAhuSort(p.id, q.id)),
      }));
    }
    return groups;
  }, [ahus]);

  // NOTE: This is your existing "Search ALL AHUs..." behavior (searches through all AHUs)
  const filtered = useMemo(() => {
    const q = (ahuQuery || "").toLowerCase();
    return ahus.filter((a) => {
      if (selectedHospitalKey && String(a.hospital_id) !== String(selectedHospitalKey)) return false;
      if (!q) return true;
      return (
        String(a.id || "").toLowerCase().includes(q) ||
        String(a.name || "").toLowerCase().includes(q) ||
        String(a.location || "").toLowerCase().includes(q) ||
        String(a.excel_block || a.group || a.display_name || "").toLowerCase().includes(q)
      );
    });
  }, [ahus, ahuQuery, selectedHospitalKey]);

  const setEditorRef = (ahuId) => (el) => {
    if (el) filterEditorRefs.current.set(ahuId, el);
    else filterEditorRefs.current.delete(ahuId);
  };

  // multi-select: AHU checkbox also selects/clears every active filter in that AHU
  const toggleSelect = (id) => {
    setSelected((s) => {
      const nextChecked = !s[id];
      const editor = filterEditorRefs.current.get(id);
      if (nextChecked) editor?.selectAllActive?.();
      else editor?.clearAll?.();
      return { ...s, [id]: nextChecked };
    });
    setAhuPartial((p) => ({ ...p, [id]: false }));
  };

  // Limit how many AHU filter editors mount at once to avoid too many concurrent requests
  const [visibleAhus, setVisibleAhus] = useState(50);

  const handleBulkAction = (action) => {
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (!ids.length) return alert("No rows selected");
    alert(`${action} on ${ids.length} AHU(s)`);
  };

  const handlePrintQr = async (ahusOverride) => {
    const selectedAhus = ahus.filter((a) => selected[a.id] || selected[String(a.id)]);
    const selectedIds = selectedAhus.map((a) => a.id);
    const ahusToPrint = Array.isArray(ahusOverride) && ahusOverride.length
      ? ahusOverride
      : (selectedAhus.length ? selectedAhus : filtered);

    if (!ahusToPrint.length) {
      alert("Select AHUs or a hospital first, then click QR.");
      return;
    }

    if (!selectedIds.length && !ahusOverride?.length && ahusToPrint.length > 20) {
      const ok = window.confirm(
        `No rows selected. Print QR labels for all ${ahusToPrint.length} AHUs currently shown?`
      );
      if (!ok) return;
    }

    const hospitalNames = [...new Set(ahusToPrint.map((a) => a.hospital).filter(Boolean))];
    const title =
      hospitalNames.length === 1
        ? `QR Codes — ${hospitalNames[0]}`
        : "AHU QR Labels";

    setQrPrint({ open: true, loading: true, labels: [], title, error: "" });
    try {
      const labels = await buildQrLabels(ahusToPrint);
      setQrPrint({ open: true, loading: false, labels, title, error: "" });
    } catch (err) {
      console.error("QR label generation failed", err);
      setQrPrint({
        open: true,
        loading: false,
        labels: [],
        title,
        error: "Failed to generate QR labels.",
      });
    }
  };

  // CSV import preview: group by blank lines into blocks (simple)
  const parseCsvBlocks = (text) => {
    const lines = text.split(/\r?\n/);
    const blocks = [];
    let cur = [];
    for (const line of lines) {
      if (line.trim() === "") {
        if (cur.length) {
          blocks.push(cur);
          cur = [];
        }
      } else cur.push(line);
    }
    if (cur.length) blocks.push(cur);
    return blocks.map((b, i) => ({ id: i + 1, rows: b, group: b[0]?.split(",")[0] || `Block ${i + 1}` }));
  };

  const handleImportFile = (file) => {
    const r = new FileReader();
    r.onload = (e) => {
      const txt = e.target.result;
      const blocks = parseCsvBlocks(txt);
      setImportPreview(blocks);
    };
    r.readAsText(file);
  };

  const clearGlobalFilters = () => {
    setGlobalFilters({ frequency: "all", status: "all", nextFrom: "", nextTo: "" });
  };

  const handleFilterSelection = (ahuId, selectedFilterObjects, meta) => {
    setSelectedFiltersForQB((prev) => ({
      ...prev,
      [ahuId]: selectedFilterObjects || [],
    }));
    if (!meta) return;
    setSelected((s) => ({ ...s, [ahuId]: !!meta.allSelected }));
    setAhuPartial((p) => ({ ...p, [ahuId]: !!meta.someSelected }));
  };

  const handleManualReviewOpen = (filtersByAhu) => {
    setManualReviewData(filtersByAhu);
  };

  const filtersByAhuFromChecks = () =>
    selectionToFiltersByAhu(selectedFiltersForQB, ahus);

  const copySelectionForQb = async () => {
    const filtersByAhu = filtersByAhuFromChecks();
    const itemCount = countPackingSlipItems(filtersByAhu);
    if (!itemCount) {
      alert("Check AHUs or filters first, then copy.");
      return;
    }
    try {
      await copyPackingSlipToClipboard(filtersByAhu);
      alert(qbPasteInstructions(itemCount, Object.keys(filtersByAhu).length));
    } catch (err) {
      console.error(err);
      alert("Could not copy. Allow clipboard access for this site, then try again.");
    }
  };

  const manualSelectionCount = Object.values(selectedFiltersForQB).reduce(
    (n, arr) => n + (arr?.length || 0),
    0
  );

  if (loading) {
    return (
      <div className="p-8 text-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div data-theme="corporate" className="min-h-screen bg-base-200">
      <div className="flex items-center justify-between mb-3 px-4 pt-4">
        <div>
          <h1 className="text-xl font-bold">Admin — AHUs & Filters</h1>
          <div className="text-xs opacity-70">Compact view with always-visible filters</div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-xs" onClick={() => setShowImport(true)} type="button">
            Import
          </button>
          <button className="btn btn-xs btn-primary" onClick={() => setShowAddAhu(true)} type="button">
            Add AHU
          </button>
          <button
            className={`btn btn-xs ${manualSelectionCount ? "btn-accent" : "btn-disabled"}`}
            onClick={copySelectionForQb}
            disabled={!manualSelectionCount}
            type="button"
          >
            Copy for QuickBooks
          </button>
          <button
            className={`btn btn-xs ${manualSelectionCount ? "btn-outline" : "btn-disabled"}`}
            onClick={() => handleManualReviewOpen(filtersByAhuFromChecks())}
            disabled={!manualSelectionCount}
            type="button"
          >
            Review first
          </button>
          <button className="btn btn-xs btn-secondary" onClick={() => setShowSignoff(true)} type="button">
            Sign-off
          </button>
        </div>
      </div>

      <PackingSlipPanel
        hospitals={hospitals}
        selectedHospitalKey={selectedHospitalKey}
        selectedFiltersForQB={selectedFiltersForQB}
        ahus={ahus}
        onOpenManualReview={handleManualReviewOpen}
      />

      <div className="flex gap-4 px-4 pb-4">
        {/* Left: Hospital tree (UNCHANGED) */}
          <aside className="w-64 bg-base-100 border border-base-300 rounded-lg p-3 overflow-auto lg:max-h-[calc(100vh-150px)] shrink-0">
            <div className="font-medium mb-2">Hospitals</div>
            <input
              className="input input-sm input-bordered w-full mb-2"
              placeholder="Search hospitals..."
              onChange={(e) => setHospitalQuery(e.target.value)}
              value={hospitalQuery}
            />
            <input
              className="input input-sm input-bordered w-full mb-3"
              placeholder="Filter by building name..."
              onChange={(e) => setBuildingFilter(e.target.value)}
              value={buildingFilter}
            />
          <div className="space-y-2">
                {(() => {
                  const filteredHospitals = grouped.filter(g => {
                  if (hospitalQuery && !g.hospitalName.toLowerCase().includes(hospitalQuery.toLowerCase())) return false;
                  if (buildingFilter) {
                    const has = g.buildings.some(b => b.buildingName.toLowerCase().includes(buildingFilter.toLowerCase()));
                    if (!has) return false;
                  }
                  return true;
                });
                  const visible = (showAllHospitals || hospitalQuery || buildingFilter)
                    ? filteredHospitals
                    : filteredHospitals.slice(0, HOSPITAL_PREVIEW_LIMIT);
                  return (
                    <>
                      {visible.map((g) => {
              const total = g.items.length;
              const overdue = g.items.reduce((s, x) => s + (x.overdue_count || 0), 0);
              return (
                <div
                  key={g.hospitalKey}
                  onClick={() => setSelectedHospitalKey(selectedHospitalKey === g.hospitalKey ? null : g.hospitalKey)}
                  className={`p-2 rounded hover:bg-base-200 cursor-pointer ${
                    selectedHospitalKey === g.hospitalKey ? "bg-primary/10" : ""
                  }`}
                >
                  <div className="flex justify-between items-center gap-1">
                    <div className="truncate font-semibold">{g.hospitalName}</div>
                    <div className="text-xs opacity-70 shrink-0">{total}</div>
                  </div>
                  <div className="text-xs mt-1 flex flex-wrap gap-1.5 items-center">
                    <span className="badge badge-sm badge-error">{overdue} overdue</span>
                  </div>
                </div>
              );
            })}
                      {!showAllHospitals && !hospitalQuery && !buildingFilter && filteredHospitals.length > HOSPITAL_PREVIEW_LIMIT && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs w-full"
                          onClick={() => setShowAllHospitals(true)}
                        >
                          Display all ({filteredHospitals.length})
                        </button>
                      )}
                      {showAllHospitals && filteredHospitals.length > HOSPITAL_PREVIEW_LIMIT && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs w-full"
                          onClick={() => setShowAllHospitals(false)}
                        >
                          Show less
                        </button>
                      )}
                    </>
                  );
                })()}
          </div>
        </aside>

        {/* Right: compact AHU list with always-visible filters */}
        <section className="flex-1 w-full">
          <div className="bg-base-100 border border-base-300 rounded-lg">
            {/* Top toolbar (kept) */}
            <div className="p-2 flex items-center justify-between gap-2 border-b">
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold">AHUs</div>
                <div className="text-xs opacity-70">{filtered.length} shown</div>
            <span className="badge badge-error badge-xs align-middle">Overdue</span> = past due,{" "}
            <span className="badge badge-warning badge-xs align-middle">Due Soon</span> = within 14 days,{" "}
            <span className="badge badge-info badge-xs align-middle">540 Days</span> = 18 Months
              </div>

              <div className="flex items-center gap-2">
                <input
                  placeholder="Search ALL AHUs..."
                  value={ahuQuery}
                  onChange={(e) => setAhuQuery(e.target.value)}
                  className="input input-xs input-bordered w-72"
                />
                <button className="btn btn-xs" onClick={() => handleBulkAction("Export CSV")} type="button">
                  Export
                </button>
                <button className="btn btn-xs btn-warning" onClick={() => handlePrintQr()} type="button">
                  QR
                </button>
                <button className="btn btn-xs btn-ghost" onClick={() => setSelected({})} type="button">
                  Clear selection
                </button>
              </div>
            </div>

            {/* ✅ NEW: GLOBAL FILTER BAR (independent of the tables) */}
            <div className="px-3 py-2 border-b bg-base-100">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex items-center gap-2">
                  <div className="text-xs font-semibold">Frequency:</div>
                  <select
                    className="select select-xs select-bordered"
                    value={globalFilters.frequency}
                    onChange={(e) => setGlobalFilters((f) => ({ ...f, frequency: e.target.value }))}
                  >
                    <option value="all">All</option>
                    <option value="30">30d</option>
                    <option value="60">60d</option>
                    <option value="90">90d</option>
                    <option value="180">180d</option>
                    <option value="365">365d</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-xs font-semibold">Status:</div>
                  <select
                    className="select select-xs select-bordered"
                    value={globalFilters.status}
                    onChange={(e) => setGlobalFilters((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="all">All</option>
                    <option value="ok">OK</option>
                    <option value="due_soon">Due Soon</option>
                    <option value="overdue">Overdue</option>
                    <option value="pending">Pending</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-xs font-semibold">Next Date From:</div>
                  <input
                    type="date"
                    className="input input-xs input-bordered"
                    value={globalFilters.nextFrom}
                    onChange={(e) => setGlobalFilters((f) => ({ ...f, nextFrom: e.target.value }))}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-xs font-semibold">To:</div>
                  <input
                    type="date"
                    className="input input-xs input-bordered"
                    value={globalFilters.nextTo}
                    onChange={(e) => setGlobalFilters((f) => ({ ...f, nextTo: e.target.value }))}
                  />
                </div>

                <button className="btn btn-xs btn-ghost ml-auto" onClick={clearGlobalFilters} type="button">
                  Clear filters
                </button>
              </div>
            </div>

            {/* Compact card list */}
            <div className="p-2 overflow-auto lg:max-h-[calc(100vh-240px)] space-y-2">
              {filtered.slice(0, visibleAhus).map((a) => {
                return (
                  <div key={a.id} className="border border-base-300 rounded-lg overflow-hidden">
                    {/* Compact AHU header */}
                    <div className="bg-base-200 px-3 py-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={!!selected[a.id]}
                          ref={(el) => {
                            if (el) el.indeterminate = !!ahuPartial[a.id] && !selected[a.id];
                          }}
                          onChange={() => toggleSelect(a.id)}
                          className="checkbox checkbox-xs"
                          title="Select all filters in this AHU"
                        />
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="text-xs font-semibold truncate">
                            {a.name || String(a.id).split("-").slice(1).join("-") || a.id}
                          </div>
                          <div className="text-xs opacity-70 truncate">{a.location || ""}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          className="btn btn-xs btn-warning"
                          onClick={() => handlePrintQr([a])}
                          type="button"
                        >
                          QR
                        </button>
                        <button className="btn btn-xs btn-ghost" onClick={() => window.open(`/FilterInfo/${a.id}`, "_blank")} type="button">
                          Open
                        </button>
                      </div>
                    </div>

                    {/* Always visible filters table */}
                    <div className="p-2">
                      {/* Pass the global filters down (AdminFilterEditorInline can ignore or use it) */}
                      <AdminFilterEditorInline 
                        ref={setEditorRef(a.id)}
                        ahuId={a.id} 
                        isOpen={true} 
                        globalFilters={globalFilters}
                        ahuNotes={a.notes}
                        onSelectionChange={(selectedObjs, meta) => handleFilterSelection(a.id, selectedObjs, meta)}
                      />
                    </div>
                  </div>
                );
              })}

              {filtered.length === 0 && <div className="text-center py-8 opacity-70">No AHUs found</div>}
              {filtered.length > visibleAhus && (
                <div className="text-center py-2">
                  <button
                    className="btn btn-xs"
                    onClick={() => setVisibleAhus((v) => v + 50)}
                    type="button"
                  >
                    Show more AHUs ({Math.min(filtered.length - visibleAhus, 50)})
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Import preview modal */}
      {showImport && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40">
          <div className="bg-base-100 border p-4 rounded-lg w-3/4 max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">Import Preview</div>
              <div className="flex gap-2">
                <label className="btn btn-sm btn-ghost">
                  Choose CSV
                  <input
                    type="file"
                    accept="text/csv,text/plain"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImportFile(e.target.files[0])}
                  />
                </label>
                <button className="btn btn-sm" onClick={() => { setShowImport(false); setImportPreview([]); }} type="button">
                  Close
                </button>
              </div>
            </div>

            {importPreview.length === 0 ? (
              <div className="text-center opacity-70">No preview loaded. Choose a CSV to preview grouping by blank line separators.</div>
            ) : (
              <div className="space-y-2">
                {importPreview.map((b) => (
                  <div key={b.id} className="p-2 border rounded">
                    <div className="font-medium">
                      {b.group} — {b.rows.length} rows
                    </div>
                    <div className="text-xs mt-1 overflow-auto">
                      <pre className="whitespace-pre-wrap">{b.rows.join("\n")}</pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add AHU modal */}
      {showAddAhu && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40">
          <div className="bg-base-100 border p-4 rounded-lg w-96">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">Add AHU</div>
              <div className="flex gap-2">
                <button className="btn btn-sm" onClick={() => setShowAddAhu(false)} type="button">Close</button>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <label className="label"><span className="label-text">Hospital</span></label>
                <select className="select select-sm select-bordered w-full" value={newAhuHospital || ""} onChange={(e) => setNewAhuHospital(e.target.value)}>
                  <option value="">Select hospital</option>
                  {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label"><span className="label-text">Building (optional)</span></label>
                <input className="input input-sm input-bordered w-full" value={newAhuBuilding || ""} onChange={(e) => setNewAhuBuilding(e.target.value)} />
              </div>
              <div>
                <label className="label"><span className="label-text">Name</span></label>
                <input className="input input-sm input-bordered w-full" value={newAhuName || ""} onChange={(e) => setNewAhuName(e.target.value)} />
              </div>
              <div>
                <label className="label"><span className="label-text">Location</span></label>
                <input className="input input-sm input-bordered w-full" value={newAhuLocation || ""} onChange={(e) => setNewAhuLocation(e.target.value)} />
              </div>
              <div>
                <label className="label"><span className="label-text">Notes</span></label>
                <input className="input input-sm input-bordered w-full" value={newAhuNotes || ""} onChange={(e) => setNewAhuNotes(e.target.value)} />
              </div>
              <div className="flex justify-end">
                <button className="btn btn-sm btn-primary" onClick={async () => {
                  // basic validation
                  if (!newAhuHospital) return alert('Please select a hospital');
                  try {
                    const payload = {
                      hospital_id: Number(newAhuHospital),
                      name: newAhuName || undefined,
                      location: newAhuLocation || undefined,
                      notes: newAhuNotes || undefined,
                    };
                    // include building if numeric id provided or as name (backend will ignore non-numeric)
                    if (newAhuBuilding) payload.building_id = isNaN(Number(newAhuBuilding)) ? undefined : Number(newAhuBuilding);

                    const res = await API.post('/admin/ahus', payload);
                    alert('AHU created: ' + (res.data && res.data.id));
                    setShowAddAhu(false);
                    // clear form
                    setNewAhuHospital(null); setNewAhuBuilding(''); setNewAhuName(''); setNewAhuLocation(''); setNewAhuNotes('');
                    // refresh list
                    await refreshData();
                  } catch (err) {
                    console.error('Create AHU failed', err);
                    alert('Failed to create AHU');
                  }
                }} type="button">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {manualSelectionCount > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-base-100 border border-base-300 shadow-lg rounded-lg px-4 py-2 flex items-center gap-3">
          <div className="text-sm">
            <span className="font-semibold">{manualSelectionCount}</span> filter
            {manualSelectionCount === 1 ? "" : "s"} selected
          </div>
          <button className="btn btn-sm btn-accent" type="button" onClick={copySelectionForQb}>
            Copy for QuickBooks
          </button>
          <button
            className="btn btn-sm btn-outline"
            type="button"
            onClick={() => handleManualReviewOpen(filtersByAhuFromChecks())}
          >
            Review
          </button>
        </div>
      )}

      <SupervisorSignoff open={showSignoff} onClose={() => setShowSignoff(false)} hospitals={hospitals} ahus={ahus} />

      <PackingSlipReviewModal
        open={!!manualReviewData}
        onClose={() => setManualReviewData(null)}
        filtersByAhu={manualReviewData || {}}
        sourceLabel="manual checkbox selection"
        onSuccess={() => {
          setManualReviewData(null);
        }}
      />

      <QrLabelPrintModal
        open={qrPrint.open}
        labels={qrPrint.labels}
        title={qrPrint.title}
        loading={qrPrint.loading}
        error={qrPrint.error}
        onClose={() => setQrPrint((s) => ({ ...s, open: false }))}
      />
    </div>
  );
}

export default AdminAHUs;