import { useEffect, useState } from "react";
import AdminSidebar from "./AdminSidebar";
import { getHospitals } from "../../api/hospitals";
import { getAHUsForHospital } from "../../api/hospitals";

function AdminDashboard() {
  const [stats, setStats] = useState({
    hospitals: 0,
    ahus: 0,
    overdue: 0,
    dueSoon: 0
  });

  const [hospitalRows, setHospitalRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);

    const hospitalsRes = await getHospitals();
    const hospitals = hospitalsRes.data;

    let totalAhus = 0;
    let overdue = 0;
    let dueSoon = 0;
    const rows = [];

    for (const h of hospitals) {
      const ahusRes = await getAHUsForHospital(h.id);
      const ahus = ahusRes.data;

      const hospitalOverdue = ahus.filter(a => a.status === "Overdue").length;
      const hospitalDueSoon = ahus.filter(a => a.status === "Due Soon").length;

      totalAhus += ahus.length;
      overdue += hospitalOverdue;
      dueSoon += hospitalDueSoon;

      rows.push({
        id: h.id,
        name: h.name,
        totalAhus: ahus.length,
        overdue: hospitalOverdue,
        dueSoon: hospitalDueSoon
      });
    }

    setStats({
      hospitals: hospitals.length,
      ahus: totalAhus,
      overdue,
      dueSoon
    });

    setHospitalRows(rows);
    setLoading(false);
  };

  return (
    <div data-theme="corporate" className="flex min-h-screen bg-base-200">
      <AdminSidebar />

      <main className="flex-1 p-6">
        <h1 className="text-3xl font-bold text-primary mb-6">
          Admin Dashboard
        </h1>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="stats shadow bg-base-100">
            <div className="stat">
              <div className="stat-title">Hospitals</div>
              <div className="stat-value text-primary">{stats.hospitals}</div>
            </div>
          </div>

          <div className="stats shadow bg-base-100">
            <div className="stat">
              <div className="stat-title">AHUs</div>
              <div className="stat-value">{stats.ahus}</div>
            </div>
          </div>

          <div className="stats shadow bg-base-100">
            <div className="stat">
              <div className="stat-title">Overdue</div>
              <div className="stat-value text-error">{stats.overdue}</div>
            </div>
          </div>

          <div className="stats shadow bg-base-100">
            <div className="stat">
              <div className="stat-title">Due Soon</div>
              <div className="stat-value text-warning">{stats.dueSoon}</div>
            </div>
          </div>
        </div>

        {/* HOSPITAL TABLE */}
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
                  <th>Total AHUs</th>
                  <th>Overdue</th>
                  <th>Due Soon</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {hospitalRows.map(row => {
                  const status =
                    row.overdue > 0
                      ? "Overdue"
                      : row.dueSoon > 0
                      ? "Due Soon"
                      : "Compliant";

                  return (
                    <tr key={row.id}>
                      <td className="font-medium">{row.name}</td>
                      <td>{row.totalAhus}</td>
                      <td className="text-error">{row.overdue}</td>
                      <td className="text-warning">{row.dueSoon}</td>
                      <td>
                        <span
                          className={`badge ${
                            status === "Overdue"
                              ? "badge-error"
                              : status === "Due Soon"
                              ? "badge-warning"
                              : "badge-success"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
