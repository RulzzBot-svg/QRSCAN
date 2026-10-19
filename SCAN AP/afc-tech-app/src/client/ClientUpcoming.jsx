import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getClientUpcoming } from "./api";
import { prettyDate } from "./format";

const TONE = {
  overdue: {
    card: "border-error/40 bg-error/10 hover:bg-error/15",
    badge: "badge-error",
    label: "Due ASAP",
  },
  soon: {
    card: "border-warning/50 bg-warning/10 hover:bg-warning/15",
    badge: "badge-warning",
    label: "Due ASAP",
  },
  month: {
    card: "border-info/40 bg-info/10 hover:bg-info/15",
    badge: "badge-info",
    label: "This month",
  },
};

function dueLabel(ahu) {
  if (ahu.severity === "overdue") {
    const n = ahu.days_overdue || 0;
    return n === 1 ? "Overdue 1 day" : `Overdue ${n} days`;
  }
  if (ahu.days_until_due === 0) return "Due today";
  if (ahu.days_until_due === 1) return "Due tomorrow";
  if (ahu.severity === "soon") return `Due in ${ahu.days_until_due} days`;
  if (ahu.next_due_date) return prettyDate(ahu.next_due_date);
  return "This month";
}

function matchesBucket(ahu, bucket) {
  if (bucket === "asap") return ahu.severity === "overdue" || ahu.severity === "soon";
  if (bucket === "month") return ahu.severity === "month";
  return true;
}

export default function ClientUpcoming() {
  const navigate = useNavigate();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bucket, setBucket] = useState("all");

  useEffect(() => {
    let cancelled = false;
    getClientUpcoming()
      .then((res) => {
        if (!cancelled) setPayload(res.data || { buildings: [], summary: {} });
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.error || "Could not load due filters.");
          setPayload({ buildings: [], summary: {} });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const buildings = useMemo(() => {
    const rows = payload?.buildings || [];
    if (bucket === "all") return rows;
    return rows
      .map((b) => ({
        ...b,
        ahus: (b.ahus || []).filter((a) => matchesBucket(a, bucket)),
      }))
      .filter((b) => b.ahus.length);
  }, [payload, bucket]);

  const summary = payload?.summary || {};
  const windowDays = payload?.window_days || 30;

  return (
    <div className="space-y-5">
      <section>
        <h2 className="text-2xl font-bold">Due this month</h2>
        <p className="text-sm text-base-content/60 mt-1">
          Overdue and due in the next {windowDays} days, by building. Tap a unit for status and
          history. Status only — no prices.
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-error/30 bg-error/5 p-4">
          <div className="text-xs uppercase tracking-wide text-error font-semibold">Due ASAP</div>
          <div className="text-3xl font-bold text-error mt-1">{summary.ahus_asap || 0}</div>
          <p className="text-xs text-base-content/60 mt-1">Overdue or due within 7 days</p>
        </div>
        <div className="rounded-2xl border border-info/30 bg-info/5 p-4">
          <div className="text-xs uppercase tracking-wide text-info font-semibold">This month</div>
          <div className="text-3xl font-bold text-info mt-1">{summary.ahus_month || 0}</div>
          <p className="text-xs text-base-content/60 mt-1">Due in 8–{windowDays} days</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: "all", label: "All due" },
          { id: "asap", label: "Due ASAP" },
          { id: "month", label: "This month" },
        ].map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`btn btn-sm ${bucket === opt.id ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setBucket(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error ? <div className="alert alert-error text-sm">{error}</div> : null}

      {loading ? (
        <div className="py-16 text-center">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : buildings.length === 0 ? (
        <div className="rounded-2xl bg-base-100 border border-base-300 p-8 text-center">
          <p className="font-semibold">Nothing coming due</p>
          <p className="text-sm text-base-content/60 mt-1">
            No active filters are overdue or due in the next {windowDays} days.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {buildings.map((building) => (
            <details
              key={building.id ?? building.name}
              className="collapse collapse-arrow bg-base-100 border border-base-300 rounded-2xl"
            >
              <summary className="collapse-title min-h-14 py-3">
                <span className="font-semibold">{building.name}</span>
                <span className="ml-2 text-xs text-base-content/50">
                  {(building.ahus || []).length} unit{(building.ahus || []).length === 1 ? "" : "s"}
                </span>
              </summary>
              <div className="collapse-content">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pb-2">
                  {(building.ahus || []).map((ahu) => {
                    const tone = TONE[ahu.severity] || TONE.month;
                    return (
                      <button
                        key={ahu.id}
                        type="button"
                        className={`text-left rounded-xl border p-3 min-h-[7rem] transition ${tone.card}`}
                        onClick={() => navigate(`/client/ahu/${ahu.id}`)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold text-sm leading-tight line-clamp-2">
                            {ahu.name}
                          </div>
                          <span className={`badge badge-xs shrink-0 ${tone.badge}`}>{tone.label}</span>
                        </div>
                        <div className="mt-2 text-sm font-medium">{dueLabel(ahu)}</div>
                        <div className="mt-1 text-xs text-base-content/60">
                          {ahu.filters_due} filter{ahu.filters_due === 1 ? "" : "s"}
                          {ahu.qty_due ? ` · ${ahu.qty_due} pcs` : ""}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </details>
          ))}
        </div>
      )}

      <Link className="btn btn-ghost btn-sm" to="/client">
        Back to Home
      </Link>
    </div>
  );
}
