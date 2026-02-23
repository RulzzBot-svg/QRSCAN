// AdminAHUs.jsx
// Redesigned Admin AHU UI: two-pane layout
import { useEffect, useMemo, useState } from "react";
import { API } from "../../api/api";
import AdminFilterEditorInline from "./adminInlineEditor";
import SupervisorSignoff from "../common/SupervisorSignoff";

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
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState({}); // { [ahuId]: true }
  const [selectedHospitalKey, setSelectedHospitalKey] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [showSignoff, setShowSignoff] = useState(false);
  const [qbMacroLoading, setQbMacroLoading] = useState(false);
  const [selectedFiltersForQB, setSelectedFiltersForQB] = useState({}); // { [ahuId]: array of filter objects }
  const [buildingFilter, setBuildingFilter] = useState("");

  // NEW: Global (page-level) filter bar state (independent of tables)
  const [globalFilters, setGlobalFilters] = useState({
    frequency: "all", // all | 30 | 60 | 90 | 180 | 365
    status: "all", // all | ok | due_soon | overdue | pending | inactive
    nextFrom: "", // yyyy-mm-dd
    nextTo: "", // yyyy-mm-dd
  });

  useEffect(() => {
    const load = async () => {
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
    load();
  }, []);

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
    const q = (query || "").toLowerCase();
    return ahus.filter((a) => {
      if (selectedHospitalKey && String(a.hospital_id) !== String(selectedHospitalKey)) return false;
      if (!q) return true;
      return (
        String(a.id || "").toLowerCase().includes(q) ||
        String(a.name || "").toLowerCase().includes(q) ||
        String(a.location || "").toLowerCase().includes(q) ||
        String(a.hospital || "").toLowerCase().includes(q) ||
        String(a.excel_block || a.group || a.display_name || "").toLowerCase().includes(q)
      );
    });
  }, [ahus, query, selectedHospitalKey]);

  // multi-select
  const toggleSelect = (id) => setSelected((s) => ({ ...s, [id]: !s[id] }));

  const handleBulkAction = (action) => {
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (!ids.length) return alert("No rows selected");
    alert(`${action} on ${ids.length} AHU(s)`);
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

  const handleFilterSelection = (ahuId, selectedFilterObjects) => {
    setSelectedFiltersForQB((prev) => ({
      ...prev,
      [ahuId]: selectedFilterObjects || [],
    }));
  };

  const generatePackingSlip = async () => {
    // Collect all selected filters GROUPED BY AHU
    const filtersByAhu = {};
    let hasAnyFilters = false;

    for (const [ahuId, filterObjects] of Object.entries(selectedFiltersForQB)) {
      if (filterObjects && Array.isArray(filterObjects) && filterObjects.length > 0) {
        hasAnyFilters = true;
        const ahu = ahus.find((a) => a.id == ahuId);
        if (ahu) {
          filtersByAhu[ahuId] = {
            ahu_name: ahu.name || ahu.id,
            filters: filterObjects
          };
        }
      }
    }

    if (!hasAnyFilters) {
      alert("Please select at least one filter to generate packing slip");
      return;
    }

    setQbMacroLoading(true);

    try {
      // Format data for QB SpecialPaste.exe
      // QB columns after 13 initial tabs: [skip 2] | Description | [skip 6] | Qty | Part | [skip 6] | ...
      // Pattern: |||| = 2 tabs, then description, then |||||||||||| = 6 tabs, then qty||part||||||||||
      
      const sanitize = (s) => {
        if (s == null) return "";
        return String(s).replace(/\r?\n/g, " ").replace(/\|\|/g, " ").trim();
      };

      const allParts = [];

      // For each AHU, add AHU name (as a description-only header), then items
      for (const [ahuId, ahuData] of Object.entries(filtersByAhu)) {
        const ahuName = sanitize(ahuData.ahu_name);

        // Description-only header: put AHU name into the Description column
        // Pattern: ||||<description>||  (user requested this format)
        allParts.push(`||||${ahuName}||`);

        // Items: if filter has its own description, include it after part number
        // Otherwise provide qty||part and spacing to the next item
        ahuData.filters.forEach((f) => {
          const part = sanitize(f.part_number || "");
          const qty = sanitize(f.quantity != null ? f.quantity : "1");
          const fdesc = sanitize(f.description || "");

          if (fdesc) {
            // qty || item || description ||||||||||  (then next item)
            allParts.push(`${qty}||${part}||${fdesc}||||||||||`);
          } else {
            // qty || item |||||||||| (no item-level description)
            allParts.push(`${qty}||${part}||||||||||`);
          }
        });
      }

      // ONE continuous line: all parts joined
      const data = allParts.join("");

      // Copy to clipboard
      try {
        await navigator.clipboard.writeText(data);
        
        const totalItems = Object.values(filtersByAhu).reduce((sum, a) => sum + a.filters.length, 0);
        const preview = data.slice(0, 200) + (data.length > 200 ? "..." : "");
        
        alert(
          `✓ ${Object.keys(filtersByAhu).length} AHU(s), ${totalItems} filter(s) copied!\n\n` +
          "Preview (one continuous line):\n" +
          preview +
          "\n\n━━━ QUICKBOOKS AUTO-PASTE ━━━\n" +
          "1. Open QuickBooks packing slip\n" +
          "2. Click in the FIRST cell (top-left)\n" +
          "3. Press Ctrl+Shift+V to auto-paste\n" +
          "4. AHU names appear as section headers\n" +
          "5. Items fill across horizontally\n" +
          "6. Press Ctrl+Q to stop if needed"
        );
        
        // Clear selections after success
        setSelectedFiltersForQB({});
      } catch (clipboardErr) {
        console.error("Clipboard copy failed:", clipboardErr);
        alert(
          "Failed to copy to clipboard.\n\n" +
          "This might be a browser permission issue.\n" +
          "Try clicking somewhere on the page first, then try again."
        );
      }
    } catch (err) {
      console.error("Unexpected error in generatePackingSlip:", err);
      alert("Unexpected error. Check browser console for details.");
    } finally {
      setQbMacroLoading(false);
    }
  };

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
          <button
            className={`btn btn-xs ${
              Object.values(selectedFiltersForQB).some(arr => arr && arr.length > 0)
                ? 'btn-accent'
                : 'btn-disabled'
            }`}
            onClick={generatePackingSlip}
            disabled={qbMacroLoading || !Object.values(selectedFiltersForQB).some(arr => arr && arr.length > 0)}
            type="button"
          >
            {qbMacroLoading ? (
              <>
                <span className="loading loading-spinner loading-xs"></span>
                Copying...
              </>
            ) : (
              "📋 Copy for QB"
            )}
          </button>
          <button className="btn btn-xs btn-secondary" onClick={() => setShowSignoff(true)} type="button">
            Sign-off
          </button>
        </div>
      </div>

      <div className="flex gap-4 px-4 pb-4">
        {/* Left: Hospital tree (UNCHANGED) */}
          <aside className="w-64 bg-base-100 border border-base-300 rounded-lg p-3 overflow-auto max-h-[calc(100vh-8rem)] shrink-0">
            <div className="font-medium mb-2">Hospitals</div>
            <input
              className="input input-sm input-bordered w-full mb-2"
              placeholder="Search hospitals..."
              onChange={(e) => setQuery(e.target.value)}
              value={query}
            />
            <input
              className="input input-sm input-bordered w-full mb-3"
              placeholder="Filter by building name..."
              onChange={(e) => setBuildingFilter(e.target.value)}
              value={buildingFilter}
            />
          <div className="space-y-2">
              {grouped.filter(g => {
                  if (query && !g.hospitalName.toLowerCase().includes(query.toLowerCase())) return false;
                  if (buildingFilter) {
                    // check whether any building matches
                    const has = g.buildings.some(b => b.buildingName.toLowerCase().includes(buildingFilter.toLowerCase()));
                    if (!has) return false;
                  }
                  return true;
                }).map((g) => {
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
                  <div className="flex justify-between items-center">
                    <div className="truncate font-semibold">{g.hospitalName}</div>
                    <div className="text-xs opacity-70">{total}</div>
                  </div>
                  <div className="text-xs mt-1 flex gap-2">
                    <span className="badge badge-sm badge-error">{overdue} overdue</span>
                  </div>
                </div>
              );
            })}
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
              </div>

              <div className="flex items-center gap-2">
                <input
                  placeholder="Search ALL AHUs..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="input input-xs input-bordered w-72"
                />
                <button className="btn btn-xs" onClick={() => handleBulkAction("Export CSV")} type="button">
                  Export
                </button>
                <button className="btn btn-xs btn-warning" onClick={() => handleBulkAction("QR")} type="button">
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
              {filtered.map((a) => {
                return (
                  <div key={a.id} className="border border-base-300 rounded-lg overflow-hidden">
                    {/* Compact AHU header */}
                    <div className="bg-base-200 px-3 py-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={!!selected[a.id]}
                          onChange={() => toggleSelect(a.id)}
                          className="checkbox checkbox-xs"
                        />
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="text-xs font-semibold truncate">
                            {a.name || String(a.id).split("-").slice(1).join("-") || a.id}
                          </div>
                          <div className="text-xs opacity-70 truncate">{a.location || ""}</div>
                        </div>
                      </div>
                      <button className="btn btn-xs btn-ghost" onClick={() => window.open(`/FilterInfo/${a.id}`, "_blank")} type="button">
                        Open
                      </button>
                    </div>

                    {/* Always visible filters table */}
                    <div className="p-2">
                      {/* Pass the global filters down (AdminFilterEditorInline can ignore or use it) */}
                      <AdminFilterEditorInline 
                        ahuId={a.id} 
                        isOpen={true} 
                        globalFilters={globalFilters}
                        onSelectionChange={(selectedIds) => handleFilterSelection(a.id, selectedIds)}
                      />
                    </div>
                  </div>
                );
              })}

              {filtered.length === 0 && <div className="text-center py-8 opacity-70">No AHUs found</div>}
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

      <SupervisorSignoff open={showSignoff} onClose={() => setShowSignoff(false)} hospitals={hospitals} ahus={ahus} />
    </div>
  );
}

export default AdminAHUs;