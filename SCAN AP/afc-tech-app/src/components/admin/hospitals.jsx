import { useEffect, useState } from "react";
import { getHospitals } from "../../api/hospitals";

function AdminHospitals() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const perPage = 10;
  const [total, setTotal] = useState(null);

  useEffect(() => {
    loadPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPage = async (pageToLoad = 0) => {
    if (pageToLoad === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await getHospitals({ limit: perPage, offset: pageToLoad * perPage });
      // API returns envelope { total, data } when paginated
      const payload = res?.data?.data ?? (Array.isArray(res?.data) ? res.data : []);
      const totalCount = res?.data?.total ?? (Array.isArray(res?.data) ? res.data.length : null);

      setHospitals((prev) => (pageToLoad === 0 ? payload : [...prev, ...payload]));
      if (totalCount !== null) setTotal(totalCount);
      setPage(pageToLoad);
    } catch (err) {
      console.error("Failed to load hospitals", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    loadPage(page + 1);
  };

  return (
    <div data-theme="corporate" className="min-h-screen bg-base-200">
      <main className="p-6">
        <h1 className="text-3xl font-bold text-primary mb-6">Hospital Maintenance Overview</h1>

        <div className="bg-base-100 border border-base-300 rounded-lg shadow">
          {loading ? (
            <div className="p-6 text-center">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : (
            <>
              <table className="table table-zebra table-pin-rows w-full">
                <thead>
                  <tr>
                    <th>Hospital</th>
                    <th>City</th>
                    <th className="text-center">Overdue</th>
                    <th className="text-center">Due Soon</th>
                    <th className="text-center">Compliance</th>
                    <th>Last Job</th>
                    <th className="text-center">AHUs</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {hospitals.map((h) => (
                    <tr key={h.id}>
                      <td className="font-medium">{h.name}</td>
                      <td>{h.city || "—"}</td>

                      <td className="text-center">
                        {h.overdue_count > 0 ? (
                          <span className="badge badge-error">{h.overdue_count}</span>
                        ) : (
                          <span className="badge badge-ghost">0</span>
                        )}
                      </td>

                      <td className="text-center">
                        {h.due_soon_count > 0 ? (
                          <span className="badge badge-warning">{h.due_soon_count}</span>
                        ) : (
                          <span className="badge badge-ghost">0</span>
                        )}
                      </td>

                      <td className="text-center">
                        {h.compliance_pct ? (
                          <span className="badge badge-success">{h.compliance_pct}%</span>
                        ) : (
                          <span className="badge badge-ghost">—</span>
                        )}
                      </td>

                      <td className="text-sm">
                        {h.last_job_date ? new Date(h.last_job_date).toLocaleDateString() : "—"}
                      </td>

                      <td className="text-center">
                        <span className="badge badge-outline">{h.ahu_count}</span>
                      </td>

                      <td>
                        <span className={`badge ${h.active ? "badge-success" : "badge-error"}`}>
                          {h.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {total !== null && hospitals.length < total && (
                <div className="p-4 flex justify-center">
                  <button className="btn btn-sm" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      `View more (${Math.max(0, total - hospitals.length)} remaining)`
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminHospitals;
