import { useEffect, useState } from "react";
import { API } from "../../api/api";
import KpiCard from "./kpiCard";

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

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);

    try {
      // Use admin/ahus which has accurate per-AHU status (Overdue, Due Soon, Completed, Pending)
      const res = await API.get("/admin/ahus");
      const ahus = Array.isArray(res.data) ? res.data : [];

      // Aggregate by hospital
      const hospitalMap = new Map();
      for (const a of ahus) {
        const hKey = String(a.hospital_id ?? "unknown");
        if (!hospitalMap.has(hKey)) {
          hospitalMap.set(hKey, {
            id: a.hospital_id,
            name: a.hospital || "Unknown Hospital",
            ahus: 0,
            overdue: 0,
            dueSoon: 0,
            compliant: 0,
          });
        }
        const row = hospitalMap.get(hKey);
        row.ahus += 1;
        if (a.status === "Overdue") row.overdue += 1;
        else if (a.status === "Due Soon") row.dueSoon += 1;
        else if (a.status === "Completed") row.compliant += 1;
        // "Pending" AHUs (no filters ever serviced) are excluded from compliant count
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

  return (
    <div data-theme="corporate" className="min-h-screen bg-base-200">
      <main className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-primary">Admin Dashboard</h1>
          <button className="btn btn-sm btn-ghost" onClick={loadDashboard} disabled={loading}>
            {loading ? <span className="loading loading-spinner loading-xs" /> : "↻ Refresh"}
          </button>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <KpiCard title="Hospitals" value={stats.hospitals} />
          <KpiCard title="Total AHUs" value={stats.ahus} />
          <KpiCard title="Overdue" value={stats.overdue} color="error" />
          <KpiCard title="Due Soon" value={stats.dueSoon} color="warning" />
          <KpiCard title="Compliant" value={stats.compliant} color="success" />
        </div>

        {/* HOSPITAL OVERVIEW */}
        <div className="bg-base-100 border border-base-300 rounded-lg shadow">
          <div className="p-4 border-b border-base-300 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Hospital Compliance Overview</h2>
            <div className="text-sm text-base-content/50">
              {hospitalRows.filter(r => r.status === "Compliant").length} of {hospitalRows.length} hospitals compliant
            </div>
          </div>

          {loading ? (
            <div className="p-6 text-center">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : (
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Hospital</th>
                  <th className="text-center">AHUs</th>
                  <th className="text-center">Overdue</th>
                  <th className="text-center">Due Soon</th>
                  <th className="text-center">Compliant</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {hospitalRows.map((row) => (
                  <tr key={row.id}>
                    <td className="font-medium">{row.name}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
