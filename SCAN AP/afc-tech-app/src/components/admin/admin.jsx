import { useEffect, useState } from "react";
import { getHospitals } from "../../api/hospitals";
import KpiCard from "./kpiCard";

function AdminDashboard() {
  const [stats, setStats] = useState({
    hospitals: 0,
    ahus: 0,
    overdue: 0,
    dueSoon: 0,
  });

  const [hospitalRows, setHospitalRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);

    // For now: hospitals endpoint
    // Later: backend should return aggregates directly
    const res = await getHospitals();
    const hospitals = Array.isArray(res.data) ? res.data : [];

    let totalAhus = 0;
    let overdue = 0;
    let dueSoon = 0;

    const rows = hospitals.map((h) => {
      totalAhus += h.ahu_count || 0;
      overdue += h.overdue_count || 0;
      dueSoon += h.due_soon_count || 0;

      return {
        id: h.id,
        name: h.name,
        ahus: h.ahu_count || 0,
        overdue: h.overdue_count || 0,
        dueSoon: h.due_soon_count || 0,
        status:
          (h.overdue_count || 0) > 0
            ? "Overdue"
            : (h.due_soon_count || 0) > 0
            ? "Due Soon"
            : "Compliant",
      };
    });

    setStats({
      hospitals: hospitals.length,
      ahus: totalAhus,
      overdue,
      dueSoon,
    });

    setHospitalRows(rows);
    setLoading(false);
  };

  return (
    <div data-theme="corporate" className="min-h-screen bg-base-200">
      <main className="p-6">
        <h1 className="text-3xl font-bold text-primary mb-6">
          Admin Dashboard
        </h1>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard title="Hospitals" value={stats.hospitals} />
          <KpiCard title="AHUs" value={stats.ahus} />
          <KpiCard title="Overdue" value={stats.overdue} color="error" />
          <KpiCard title="Due Soon" value={stats.dueSoon} color="warning" />
        </div>

        {/* HOSPITAL OVERVIEW */}
        <div className="bg-base-100 border border-base-300 rounded-lg shadow">
          <div className="p-4 border-b border-base-300">
            <h2 className="text-lg font-semibold">
              Hospital Compliance Overview
            </h2>
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
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {hospitalRows.map((row) => (
                  <tr key={row.id}>
                    <td className="font-medium">{row.name}</td>
                    <td className="text-center">{row.ahus}</td>
                    <td className="text-center text-error">
                      {row.overdue}
                    </td>
                    <td className="text-center text-warning">
                      {row.dueSoon}
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
