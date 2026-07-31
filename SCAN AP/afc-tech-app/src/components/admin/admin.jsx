import { useEffect, useState } from "react";
import { API } from "../../api/api";
import { getAdminHospitals } from "../../api/admin";
import KpiCard from "./kpiCard";
import AdminCharts from "./AdminCharts";
import HospitalSettingsModal from "./HospitalSettingsModal";

function AdminDashboard() {
  const [stats, setStats] = useState({
    hospitals: 0,
    ahus: 0,
    overdue: 0,
    dueSoon: 0,
    compliant: 0,
  });

  const [hospitalRows, setHospitalRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [settingsHospital, setSettingsHospital] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);

    try {
      const [ahusRes, hospitalsRes] = await Promise.all([
        API.get("/admin/ahus"),
        getAdminHospitals().catch(() => ({ data: [] })),
      ]);

      const ahus = Array.isArray(ahusRes.data) ? ahusRes.data : [];
      const settingsList = Array.isArray(hospitalsRes.data) ? hospitalsRes.data : [];
      const settingsById = new Map(settingsList.map((h) => [String(h.id), h]));

      const hospitalMap = new Map();
      for (const a of ahus) {
        const hKey = String(a.hospital_id ?? "unknown");
        if (!hospitalMap.has(hKey)) {
          const settings = settingsById.get(hKey) || {};
          hospitalMap.set(hKey, {
            id: a.hospital_id,
            name: a.hospital || settings.name || "Unknown Hospital",
            ahus: 0,
            overdue: 0,
            dueSoon: 0,
            compliant: 0,
            estimate_number: settings.estimate_number || "",
            po_number: settings.po_number || "",
            pricing_notes: settings.pricing_notes || "",
            changeout_interval_days: settings.changeout_interval_days ?? 90,
            changeouts_per_year: settings.changeouts_per_year ?? 4,
            changeouts_completed: settings.changeouts_completed ?? 0,
            contract_year_start: settings.contract_year_start || null,
            contract_notes: settings.contract_notes || "",
            city: settings.city || "",
            address: settings.address || "",
          });
        }
        const row = hospitalMap.get(hKey);
        row.ahus += 1;
        if (a.status === "Overdue") row.overdue += 1;
        else if (a.status === "Due Soon") row.dueSoon += 1;
        else if (a.status === "Completed") row.compliant += 1;
      }

      // Include hospitals that have settings but no AHUs yet
      for (const s of settingsList) {
        const key = String(s.id);
        if (!hospitalMap.has(key)) {
          hospitalMap.set(key, {
            id: s.id,
            name: s.name,
            ahus: 0,
            overdue: 0,
            dueSoon: 0,
            compliant: 0,
            estimate_number: s.estimate_number || "",
            po_number: s.po_number || "",
            pricing_notes: s.pricing_notes || "",
            changeout_interval_days: s.changeout_interval_days ?? 90,
            changeouts_per_year: s.changeouts_per_year ?? 4,
            changeouts_completed: s.changeouts_completed ?? 0,
            contract_year_start: s.contract_year_start || null,
            contract_notes: s.contract_notes || "",
            city: s.city || "",
            address: s.address || "",
          });
        }
      }

      const rows = Array.from(hospitalMap.values()).map((row) => ({
        ...row,
        status:
          row.overdue > 0
            ? "Overdue"
            : row.dueSoon > 0
            ? "Due Soon"
            : "Compliant",
      }));

      rows.sort((a, b) => a.name.localeCompare(b.name));

      const totalOverdue = rows.reduce((s, r) => s + r.overdue, 0);
      const totalDueSoon = rows.reduce((s, r) => s + r.dueSoon, 0);
      const totalCompliant = rows.reduce((s, r) => s + r.compliant, 0);

      setStats({
        hospitals: rows.length,
        ahus: ahus.length,
        overdue: totalOverdue,
        dueSoon: totalDueSoon,
        compliant: totalCompliant,
      });

      setHospitalRows(rows);
    } catch (err) {
      console.error("Failed to load dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  const syncFilterDates = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await API.post("/admin/backfill-filter-dates");
      setSyncResult({ ok: true, message: res.data.message, updated: res.data.updated });
      await loadDashboard();
    } catch (err) {
      setSyncResult({ ok: false, message: err?.response?.data?.error || "Sync failed" });
    } finally {
      setSyncing(false);
    }
  };

  const handleSettingsSaved = (updated) => {
    setHospitalRows((prev) =>
      prev.map((row) =>
        row.id === updated.id
          ? {
              ...row,
              ...updated,
              name: row.name,
              ahus: row.ahus,
              overdue: row.overdue,
              dueSoon: row.dueSoon,
              compliant: row.compliant,
              status: row.status,
            }
          : row
      )
    );
  };

  const changeoutLabel = (row) => {
    const done = row.changeouts_completed ?? 0;
    const total = row.changeouts_per_year ?? 4;
    return `${done}/${total}`;
  };

  return (
    <div data-theme="corporate" className="min-h-screen bg-slate-50">
      <main className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-slate-800">Overview</h1>
          <div className="flex gap-2 items-center">
            <button
              className="btn btn-sm btn-outline btn-warning"
              onClick={syncFilterDates}
              disabled={syncing || loading}
              title="Update all AHU filter dates from completed job history"
            >
              {syncing ? <span className="loading loading-spinner loading-xs" /> : "⟳ Sync"}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={loadDashboard} disabled={loading}>
              {loading ? <span className="loading loading-spinner loading-xs" /> : "↻ Refresh"}
            </button>
          </div>
        </div>

        {syncResult && (
          <div className={`alert ${syncResult.ok ? "alert-success" : "alert-error"} mb-4`}>
            <span>{syncResult.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <KpiCard title="Hospitals" value={stats.hospitals} />
          <KpiCard title="Total AHUs" value={stats.ahus} />
          <KpiCard title="Overdue" value={stats.overdue} color="error" subtitle="Immediate attention" />
          <KpiCard
            title="Hospitals Compliant %"
            value={`${Math.round((hospitalRows.filter((r) => r.status === "Compliant").length / Math.max(1, hospitalRows.length)) * 100)}%`}
            color="success"
          />
          <KpiCard
            title="Avg AHU Compliance"
            value={`${Math.round((stats.compliant / Math.max(1, stats.ahus)) * 100)}%`}
          />
        </div>

        <AdminCharts hospitalRows={hospitalRows} stats={stats} />

        <div className="mt-6 bg-base-100 border border-base-300 rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-3">Hospital Details</h2>

          {loading ? (
            <div className="p-6 text-center">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Hospital</th>
                    <th className="text-center">Changeouts</th>
                    <th className="text-center">AHUs</th>
                    <th className="text-center">Overdue</th>
                    <th className="text-center">Due Soon</th>
                    <th className="text-center">Compliant</th>
                    <th>Status</th>
                    <th className="w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {hospitalRows.map((row) => (
                    <tr key={row.id}>
                      <td className="font-medium">
                        <div>{row.name}</div>
                        {(row.estimate_number || row.po_number) && (
                          <div className="text-xs text-base-content/50 mt-0.5">
                            {row.estimate_number ? `Est ${row.estimate_number}` : ""}
                            {row.estimate_number && row.po_number ? " · " : ""}
                            {row.po_number ? `PO ${row.po_number}` : ""}
                          </div>
                        )}
                      </td>
                      <td className="text-center">
                        <span
                          className={`font-semibold tabular-nums ${
                            (row.changeouts_completed ?? 0) >= (row.changeouts_per_year ?? 4)
                              ? "text-success"
                              : "text-slate-700"
                          }`}
                          title={`${row.changeout_interval_days || 90}-day interval`}
                        >
                          {changeoutLabel(row)}
                        </span>
                      </td>
                      <td className="text-center">{row.ahus}</td>
                      <td className="text-center">
                        {row.overdue > 0 ? (
                          <span className="text-error font-semibold">{row.overdue}</span>
                        ) : (
                          <span className="text-base-content/40">0</span>
                        )}
                      </td>
                      <td className="text-center">
                        {row.dueSoon > 0 ? (
                          <span className="text-warning font-semibold">{row.dueSoon}</span>
                        ) : (
                          <span className="text-base-content/40">0</span>
                        )}
                      </td>
                      <td className="text-center">
                        {row.compliant > 0 ? (
                          <span className="text-success font-semibold">{row.compliant}</span>
                        ) : (
                          <span className="text-base-content/40">0</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            row.status === "Overdue"
                              ? "badge-error"
                              : row.status === "Due Soon"
                              ? "badge-warning"
                              : "badge-success"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          title="Hospital settings"
                          onClick={() => setSettingsHospital(row)}
                        >
                          ⚙
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <HospitalSettingsModal
        hospital={settingsHospital}
        open={!!settingsHospital}
        onClose={() => setSettingsHospital(null)}
        onSaved={handleSettingsSaved}
      />
    </div>
  );
}

export default AdminDashboard;
