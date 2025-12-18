import { useEffect, useState } from "react";
import AdminSidebar from "./AdminSidebar";
import { getHospitals } from "../../api/hospitals";

function AdminHospitals() {
  const [hospitals, setHospitals] = useState([]);

  useEffect(() => {
    getHospitals().then(res => setHospitals(res.data));
  }, []);

  return (
    <div data-theme="corporate" className="flex min-h-screen bg-base-200">

      <main className="flex-1 p-6">
        <h1 className="text-3xl font-bold text-primary mb-6">
          Hospitals
        </h1>

        <div className="bg-base-100 border border-base-300 rounded-lg shadow">
          <table className="table table-zebra table-pin-rows w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>City</th>
                <th>Active</th>
                <th>AHUs</th>
              </tr>
            </thead>
            <tbody>
              {hospitals.map(h => (
                <tr key={h.id}>
                  <td className="font-medium">{h.name}</td>
                  <td>{h.city}</td>
                  <td>
                    <span className={`badge ${h.active ? "badge-success" : "badge-error"}`}>
                      {h.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>{h.ahu_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default AdminHospitals;
