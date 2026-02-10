// Redesigned Admin AHU UI: two-pane layout
import { useEffect, useMemo, useState, Fragment } from "react";
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
  const [viewMode, setViewMode] = useState("spreadsheet");
  const [expandedAhuId, setExpandedAhuId] = useState(null);
  const [selected, setSelected] = useState({}); // { [ahuId]: true }
  const [selectAll, setSelectAll] = useState(false);
  const [selectedHospitalKey, setSelectedHospitalKey] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [showSignoff, setShowSignoff] = useState(false);

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

  // Group by hospital then building
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
      g.buildings = Array.from(bmap.entries()).map(([name, items]) => ({ buildingName: name, items: items.sort((p, q) => naturalAhuSort(p.id, q.id)) }));
    }
    return groups;
  }, [ahus]);

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
  const toggleSelectAll = () => {
    if (!selectAll) {
      const next = {};
      for (const a of filtered) next[a.id] = true;
      setSelected(next);
    } else {
      setSelected({});
    }
    setSelectAll(!selectAll);
  };

  const handleBulkAction = (action) => {
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (!ids.length) return alert("No rows selected");
    // stub - perform client-side UI action or call API
    alert(`${action} on ${ids.length} AHU(s)`);
  };

  // CSV import preview: group by blank lines into blocks (simple)
  const parseCsvBlocks = (text) => {
    const lines = text.split(/\r?\n/);
    const blocks = [];
    let cur = [];
    for (const line of lines) {
      if (line.trim() === "") {
        if (cur.length) { blocks.push(cur); cur = []; }
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

  if (loading) {
    return (
      <div className="p-8 text-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div data-theme="corporate" className="min-h-screen bg-base-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Admin — AHUs</h1>
          <div className="text-sm opacity-70">Two-pane: hospitals on the left, spreadsheet on the right.</div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-sm" onClick={() => setShowImport(true)} type="button">Import Preview</button>
          <button className="btn btn-sm btn-secondary" onClick={() => setShowSignoff(true)} type="button">Supervisor Sign-off</button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Left: Hospital tree */}
          <aside className="w-72 bg-base-100 border border-base-300 rounded-lg p-3 overflow-auto">
          <div className="font-medium mb-2">Hospitals</div>
          <input className="input input-sm input-bordered w-full mb-3" placeholder="Filter hospitals..." onChange={(e) => setQuery(e.target.value)} value={query} />
          <div className="space-y-2">
            {grouped.map((g) => {
              const total = g.items.length;
              const overdue = g.items.reduce((s, x) => s + (x.overdue_count || 0), 0);
              return (
                <div
                  key={g.hospitalKey}
                  onClick={() => setSelectedHospitalKey(selectedHospitalKey === g.hospitalKey ? null : g.hospitalKey)}
                  className={`p-2 rounded hover:bg-base-200 cursor-pointer ${selectedHospitalKey === g.hospitalKey ? 'bg-primary/10' : ''}`}
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

        {/* Right: spreadsheet and toolbar */}
        <section className="flex-1">
          <div className="bg-base-100 border border-base-300 rounded-lg">
            <div className="p-3 flex items-center justify-between gap-3 border-b">
              <div className="flex items-center gap-3">
                <div className="font-semibold">AHUs</div>
                <div className="text-sm opacity-70">{ahus.length} total</div>
              </div>

              <div className="flex items-center gap-2">
                <div className="input-group">
                  <input placeholder="Search..." value={query} onChange={(e) => setQuery(e.target.value)} className="input input-sm input-bordered" />
                </div>
                <div className="btn-group">
                  <button className={`btn btn-sm ${viewMode === "spreadsheet" ? "btn-primary" : "btn-outline"}`} onClick={() => setViewMode("spreadsheet")}>Spreadsheet</button>
                  <button className={`btn btn-sm ${viewMode === "nested" ? "btn-primary" : "btn-outline"}`} onClick={() => setViewMode("nested")}>Nested</button>
                </div>
                <div className="divider-vertical" />
                <button className="btn btn-sm" onClick={() => handleBulkAction('Export CSV')}>Export CSV</button>
                <button className="btn btn-sm btn-warning" onClick={() => handleBulkAction('Regenerate QR')}>QR (bulk)</button>
              </div>
            </div>

            {/* Table */}
            <div className="p-2 overflow-auto lg:max-h-[calc(100vh-200px)]">
              <table className="table table-compact w-full">
                <thead>
                  <tr>
                    <th><input type="checkbox" checked={selectAll} onChange={toggleSelectAll} /></th>
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
                  {filtered.map((a) => {
                    const sel = !!selected[a.id];
                    const isOpen = String(expandedAhuId) === String(a.id);
                    return (
                      <Fragment key={`r-${a.id}`}>
                        <tr className={sel ? 'bg-primary/10' : ''}>
                          <td><input type="checkbox" checked={sel} onChange={() => toggleSelect(a.id)} /></td>
                          <td className="truncate max-w-xs">{a.hospital}</td>
                          <td className="truncate max-w-xs">{a.building || '-'}</td>
                          <td className="truncate max-w-xs">{a.location || '-'}</td>
                          <td>{a.name || (String(a.id).split('-').slice(1).join('-') || a.id)}</td>
                          <td>{a.overdue_count > 0 ? <span className="badge badge-error badge-sm">{a.overdue_count}</span> : <span className="badge badge-ghost badge-sm">0</span>}</td>
                          <td>{a.due_soon_count > 0 ? <span className="badge badge-warning badge-sm">{a.due_soon_count}</span> : <span className="badge badge-ghost badge-sm">0</span>}</td>
                          <td className="text-xs">{a.last_serviced ? <span className="badge badge-sm badge-info">{new Date(a.last_serviced).toLocaleDateString()}</span> : <span className="text-muted">—</span>}</td>
                          <td className="text-xs">{a.next_due_date ? <span className="badge badge-sm badge-outline">{new Date(a.next_due_date).toLocaleDateString()}</span> : <span className="text-muted">—</span>}</td>
                          <td>
                            <div className="flex gap-2">
                              <button className="btn btn-xs" onClick={() => setExpandedAhuId(isOpen ? null : a.id)}>{isOpen ? 'Close' : 'View'}</button>
                              <button className="btn btn-xs btn-outline" onClick={() => window.open(`/ahu/${a.id}`, '_blank')}>Open</button>
                            </div>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr><td colSpan={11} className="p-0"><div className="p-3 border-t"><AdminFilterEditorInline ahuId={a.id} isOpen={true} /></div></td></tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {/* Import preview modal (simple CSV grouping preview) */}
      {showImport && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40">
          <div className="bg-base-100 border p-4 rounded-lg w-3/4 max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">Import Preview</div>
              <div className="flex gap-2">
                <label className="btn btn-sm btn-ghost">
                  Choose CSV
                  <input type="file" accept="text/csv,text/plain" className="hidden" onChange={(e) => e.target.files?.[0] && handleImportFile(e.target.files[0])} />
                </label>
                <button className="btn btn-sm" onClick={() => { setShowImport(false); setImportPreview([]); }}>Close</button>
              </div>
            </div>

            {importPreview.length === 0 ? (
              <div className="text-center opacity-70">No preview loaded. Choose a CSV to preview grouping by blank line separators.</div>
            ) : (
              <div className="space-y-2">
                {importPreview.map((b) => (
                  <div key={b.id} className="p-2 border rounded">
                    <div className="font-medium">{b.group} — {b.rows.length} rows</div>
                    <div className="text-xs mt-1 overflow-auto"><pre className="whitespace-pre-wrap">{b.rows.join('\n')}</pre></div>
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
