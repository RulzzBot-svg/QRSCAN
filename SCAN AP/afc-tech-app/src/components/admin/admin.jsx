import { useEffect, useState } from "react";

import KpiCard from "./kpiCard";
import AdminSidebar from "./adminsidebar";

import { getAdminOverview } from "../../api/admin";

function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    setLoading(true);
    getAdminOverview()
      .then((res) => setStats(res.data))
      .catch((err) =>
        console.error("Failed to load admin overview", err)
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div data-theme="corporate" className="flex min-h-screen bg-base-200">
      
      {/* SIDEBAR */}
      <AdminSidebar />

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6">
        <h1 className="text-3xl font-bold text-primary mb-1">
          Admin Dashboard
        </h1>
        <p className="text-sm text-base-content/60 mb-6">
          System-wide compliance overview
        </p>

        {loading || !stats ? (
          <div className="flex justify-center mt-10">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Hospitals"
              value={stats.hospitals}
              subtitle="Registered facilities"
              color="primary"
            />

            <KpiCard
              title="Overdue AHUs"
              value={stats.overdue}
              subtitle="Immediate attention required"
              color="error"
            />

            <KpiCard
              title="Due Soon"
              value={stats.due_soon}
              subtitle="Upcoming changeouts"
              color="warning"
            />

            <KpiCard
              title="Compliant AHUs"
              value={stats.completed}
              subtitle="Up to date"
              color="success"
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
