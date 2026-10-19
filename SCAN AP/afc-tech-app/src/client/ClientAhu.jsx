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
  const [tab, setTab] = useState("status");

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
  const history = ahu.history || [];

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

      <div className="tabs tabs-boxed bg-base-100 border border-base-300 p-1 w-fit">
        <button
          type="button"
          className={`tab ${tab === "status" ? "tab-active" : ""}`}
          onClick={() => setTab("status")}
        >
          Status
        </button>
        <button
          type="button"
          className={`tab ${tab === "history" ? "tab-active" : ""}`}
          onClick={() => setTab("history")}
        >
          History{history.length ? ` (${history.length})` : ""}
        </button>
      </div>

      {tab === "history" ? (
        <HistoryTab history={history} comments={ahu.comments || []} />
      ) : (
        <>
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
        </>
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

function HistoryTab({ history, comments }) {
  if (!(history || []).length) {
    return (
      <div className="rounded-2xl bg-base-100 border border-base-300 p-5">
        <p className="font-semibold">No visits on file</p>
        <p className="text-sm text-base-content/60 mt-1">
          When AFC completes a changeout, the date and stages show here. Held filters include the
          reason.
        </p>
        {(comments || []).length ? (
          <div className="mt-4 space-y-2">
            {comments.map((c, i) => (
              <p key={`${c.at}-${i}`} className="text-sm">
                <span className="text-xs text-base-content/50">
                  {[prettyDate(c.at), c.filter, c.held ? "not replaced" : null].filter(Boolean).join(" · ")}
                </span>
                <span className="block">{c.text}</span>
              </p>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-base-content/60">
        Last visits on this unit. Dates and stages only — no technician names or prices.
      </p>
      {history.map((visit, i) => (
        <section key={`${visit.at}-${i}`} className="rounded-2xl bg-base-100 border border-base-300 p-4">
          <p className="font-semibold">{prettyDate(visit.at)}</p>
          {visit.replaced?.length ? (
            <p className="text-sm mt-1">Replaced: {visit.replaced.join(", ")}</p>
          ) : (
            <p className="text-sm mt-1 text-base-content/60">No filters replaced this visit.</p>
          )}
          {(visit.held || []).length ? (
            <ul className="mt-2 space-y-1">
              {visit.held.map((h, hi) => (
                <li key={`${h.filter}-${hi}`} className="text-sm">
                  <span className="badge badge-warning badge-xs mr-1">Held</span>
                  {h.filter || "Filter"}
                  {h.text ? <span className="text-base-content/70"> — {h.text}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}
