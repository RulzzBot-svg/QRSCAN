import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getClientAhus } from "./api";
import { prettyDate } from "./format";
import { StatusBadge } from "./StatusBadge";

export default function ClientUnits() {
  const [ahus, setAhus] = useState([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getClientAhus()
      .then((res) => {
        if (!cancelled) setAhus(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.error || "Could not load units");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ahus.filter((a) => {
      if (filter !== "all" && a.status !== filter) return false;
      if (!q) return true;
      return [a.name, a.building, a.location].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [ahus, query, filter]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (error) return <div className="alert alert-error text-sm">{error}</div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Units</h2>
        <p className="text-sm text-base-content/60">{ahus.length} AHUs at this hospital</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className="input input-bordered w-full sm:flex-1"
          placeholder="Search name, building, location"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="select select-bordered sm:w-40"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All status</option>
          <option value="Overdue">Overdue</option>
          <option value="Due Soon">Due soon</option>
          <option value="Completed">On schedule</option>
          <option value="Pending">Pending</option>
        </select>
      </div>

      <div className="hidden md:block bg-base-100 border border-base-300 rounded-2xl overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>AHU</th>
              <th>Building</th>
              <th>Location</th>
              <th>Next due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((a) => (
              <tr key={a.id} className="hover">
                <td>
                  <Link className="link link-primary font-semibold" to={`/client/ahu/${a.id}`}>
                    {a.name}
                  </Link>
                </td>
                <td>{a.building || "—"}</td>
                <td>{a.location || "—"}</td>
                <td>{prettyDate(a.next_due_date)}</td>
                <td>
                  <StatusBadge status={a.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-2">
        {shown.map((a) => (
          <Link
            key={a.id}
            to={`/client/ahu/${a.id}`}
            className="block rounded-2xl bg-base-100 border border-base-300 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold truncate">{a.name}</p>
                <p className="text-xs text-base-content/60 truncate">
                  {[a.building, a.location].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <StatusBadge status={a.status} />
            </div>
            <p className="text-xs mt-2 text-base-content/60">Next due {prettyDate(a.next_due_date)}</p>
          </Link>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-base-content/50 text-center py-8">No units match that search.</p>
      ) : null}
    </div>
  );
}
