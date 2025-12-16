import { useEffect, useState } from "react";
import AdminSidebar from "./AdminSidebar";

function AdminJobs() {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    fetch("/api/jobs")
      .then(res => res.json())
      .then(setJobs);
  }, []);

  return (
    <div data-theme="corporate" className="flex min-h-screen bg-base-200">
      <AdminSidebar />

      <main className="flex-1 p-6">
        <h1 className="text-3xl font-bold text-primary mb-6">
          Job History
        </h1>

        <div className="bg-base-100 border border-base-300 rounded-lg shadow">
          <table className="table table-zebra table-pin-rows w-full">
            <thead>
              <tr>
                <th>Job ID</th>
                <th>AHU</th>
                <th>Technician</th>
                <th>Completed</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(j => (
                <tr key={j.id}>
                  <td>{j.id}</td>
                  <td className="font-medium">{j.ahu_id}</td>
                  <td>{j.tech_id}</td>
                  <td>{new Date(j.completed_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default AdminJobs;
