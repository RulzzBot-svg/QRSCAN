import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getClientAhu } from "./api";
import { prettyDate } from "./format";
import { StatusBadge } from "./StatusBadge";

export default function ClientAhu() {
  const { ahuId } = useParams();
  const [ahu, setAhu] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getClientAhu(ahuId)
      .then((res) => {
        if (!cancelled) setAhu(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.error || "Unit not found for this hospital");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ahuId]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="alert alert-error text-sm">{error}</div>
        <Link className="btn btn-ghost" to="/client/scan">
          Scan another
        </Link>
      </div>
    );
  }

  const filters = ahu.filters || [];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-base-content/50">{ahu.building || "AHU"}</p>
          <h2 className="text-2xl font-bold leading-tight">{ahu.name}</h2>
          {ahu.location ? <p className="text-sm text-base-content/60 mt-1">{ahu.location}</p> : null}
        </div>
        <StatusBadge status={ahu.status} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-base-100 border border-base-300 p-4">
          <p className="text-xs text-base-content/50">Last serviced</p>
          <p className="font-semibold">{prettyDate(ahu.last_service_date)}</p>
        </div>
        <div className="rounded-2xl bg-base-100 border border-base-300 p-4">
          <p className="text-xs text-base-content/50">Next due</p>
          <p className="font-semibold">{prettyDate(ahu.next_due_date)}</p>
        </div>
      </div>

      <h3 className="font-semibold pt-2">Filters</h3>
      {filters.length === 0 ? (
        <p className="text-sm text-base-content/50">No active filters on this unit.</p>
      ) : (
      <div className="space-y-2">
        {filters.map((f) => (
          <div key={f.id} className="rounded-2xl bg-base-100 border border-base-300 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{f.phase || "Filter"}</p>
                <p className="text-sm text-base-content/60">
                  {f.size || "—"} · qty {f.quantity ?? "—"}
                </p>
              </div>
              <StatusBadge status={f.status} />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
              <div>
                <p className="text-xs text-base-content/50">Last serviced</p>
                <p>{prettyDate(f.last_service_date)}</p>
              </div>
              <div>
                <p className="text-xs text-base-content/50">Next due</p>
                <p>{prettyDate(f.next_due_date)}</p>
              </div>
              <div>
                <p className="text-xs text-base-content/50">Frequency</p>
                <p>{f.frequency_label || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-base-content/50">
                  {f.status === "Overdue" ? "Days overdue" : "Days until due"}
                </p>
                <p>
                  {f.status === "Overdue"
                    ? f.days_overdue ?? "—"
                    : f.days_until_due ?? "—"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      <div className="flex gap-2 pt-2">
        <Link className="btn btn-ghost" to="/client/units">
          All units
        </Link>
        <Link className="btn btn-primary" to="/client/scan">
          Scan another
        </Link>
      </div>
    </div>
  );
}
