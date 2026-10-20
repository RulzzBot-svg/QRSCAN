import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getClientAhu } from "./api";
import { prettyDate } from "./format";

export default function ClientAhu() {
  const { ahuId } = useParams();
  const [ahu, setAhu] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("status");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setAhu(null);
    getClientAhu(ahuId)
      .then((res) => {
        if (!cancelled) setAhu(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.data?.error || "Unit not found for this hospital");
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

  if (error || !ahu) {
    return (
      <div className="space-y-4 max-w-xl">
        <div className="alert alert-error text-sm">{error || "Unit not found for this hospital"}</div>
        <div className="flex items-center gap-3">
          <Link className="btn btn-ghost btn-sm rounded-full" to="/client/units">
            All units
          </Link>
          <Link className="btn btn-primary btn-sm rounded-full gap-2" to="/client/scan">
            <QrScanIcon className="w-4 h-4" />
            Scan another
          </Link>
        </div>
      </div>
    );
  }

  const filters = ahu.filters || [];
  const history = ahu.history || [];
  const dueKind = nextDueKind(ahu.status, ahu.days_until_due);

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {ahu.building ? (
            <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-base-content/45">
              {ahu.building}
            </p>
          ) : (
            <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-base-content/45">AHU</p>
          )}
          <h2 className="text-[1.7rem] font-extrabold leading-tight tracking-tight">{ahu.name}</h2>
          {ahu.location ? (
            <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-base-content/45 mt-1">
              {ahu.location}
            </p>
          ) : null}
        </div>
        <UnitBadge status={ahu.status} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-base-100 border border-base-300 px-3.5 py-3">
          <p className="flex items-center gap-1.5 text-xs text-base-content/50">
            <CalendarIcon className="w-3.5 h-3.5 text-primary/70" />
            Last serviced
          </p>
          <p className="font-bold mt-1">{prettyDate(ahu.last_service_date)}</p>
        </div>
        <div
          className={`rounded-2xl border px-3.5 py-3 ${
            dueKind === "overdue"
              ? "bg-error/10 border-error/30"
              : dueKind === "soon" || dueKind === "watch"
                ? "bg-warning/10 border-warning/25"
                : "bg-base-100 border-base-300"
          }`}
        >
          <p
            className={`flex items-center gap-1.5 text-xs ${
              dueKind === "overdue"
                ? "text-error"
                : dueKind === "soon" || dueKind === "watch"
                  ? "text-warning"
                  : "text-base-content/50"
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            Next due
          </p>
          <p
            className={`font-bold mt-1 ${
              dueKind === "overdue"
                ? "text-error"
                : dueKind === "soon" || dueKind === "watch"
                  ? "text-warning"
                  : ""
            }`}
          >
            {prettyDate(ahu.next_due_date)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          className={`px-4 h-8 rounded-full text-sm font-semibold ${
            tab === "status" ? "bg-primary text-primary-content" : "text-base-content/70"
          }`}
          onClick={() => setTab("status")}
        >
          Status
        </button>
        <button
          type="button"
          className={`px-4 h-8 rounded-full text-sm font-semibold ${
            tab === "history" ? "bg-primary text-primary-content" : "text-base-content/70"
          }`}
          onClick={() => setTab("history")}
        >
          History{history.length ? ` (${history.length})` : ""}
        </button>
      </div>

      {tab === "history" ? (
        <HistoryTab history={history} comments={ahu.comments || []} />
      ) : (
        <>
          <h3 className="font-semibold flex items-center gap-1.5 pt-1">
            Filters
            <FiltersIcon className="w-4 h-4 text-base-content/35" />
          </h3>
          {filters.length === 0 ? (
            <p className="text-sm text-base-content/50">No active filters on this unit.</p>
          ) : (
            <div className="space-y-3">
              {filters.map((f) => (
                <FilterCard key={f.id ?? `${f.phase}-${f.size}`} filter={f} />
              ))}
            </div>
          )}
        </>
      )}

      <div className="flex items-center gap-3 pt-1">
        <Link className="btn btn-ghost btn-sm rounded-full px-4" to="/client/units">
          All units
        </Link>
        <Link className="btn btn-primary btn-sm rounded-full px-5 gap-2" to="/client/scan">
          <QrScanIcon className="w-4 h-4" />
          Scan another
        </Link>
      </div>
    </div>
  );
}

function FilterCard({ filter: f }) {
  const kind = nextDueKind(f.status, f.days_until_due);
  const stripe =
    f.status === "Overdue"
      ? "bg-error"
      : f.status === "Due Soon"
        ? "bg-warning"
        : f.status === "Completed"
          ? "bg-success"
          : "bg-base-300";
  const daysLabel = f.status === "Overdue" ? "Days overdue" : "Days until due";
  const daysValue =
    f.status === "Overdue"
      ? f.days_overdue ?? "—"
      : f.days_until_due ?? "—";
  const pre = isPrePhase(f.phase);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-base-100 border border-base-300 shadow-sm">
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${stripe}`} />
      <div className="p-4 pl-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold">{f.phase || "Filter"}</p>
            <p className="text-sm text-base-content/55 mt-0.5 flex items-center gap-1.5">
              <GridIcon className="w-3.5 h-3.5 text-base-content/35 shrink-0" />
              <span>
                {f.size || "—"} · qty {f.quantity ?? "—"}
              </span>
            </p>
          </div>
          <UnitBadge status={f.status} />
        </div>

        <div className="flex items-end gap-3 mt-3">
          <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-2 text-sm min-w-0">
            <div>
              <p className="text-xs text-base-content/50">Last serviced</p>
              <p className="font-medium">{prettyDate(f.last_service_date)}</p>
            </div>
            <div>
              <p className="text-xs text-base-content/50">Next due</p>
              <p className={`font-medium flex items-center gap-1.5 ${kindText(kind)}`}>
                <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{prettyDate(f.next_due_date)}</span>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${kindDot(kind)}`} />
              </p>
            </div>
            <div>
              <p className="text-xs text-base-content/50">Frequency</p>
              <p className="font-medium flex items-center gap-1.5">
                {pre ? <StageZeroIcon className="w-4 h-4 text-accent shrink-0" /> : <RefreshIcon className="w-4 h-4 text-accent shrink-0" />}
                <span>{f.frequency_label || "—"}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-base-content/50">{daysLabel}</p>
              <p className="font-medium">{daysValue}</p>
            </div>
          </div>
          <DueRing
            status={f.status}
            daysUntil={f.days_until_due}
            daysOverdue={f.days_overdue}
            frequencyDays={f.frequency_days}
          />
        </div>
      </div>
    </div>
  );
}

function DueRing({ status, daysUntil, daysOverdue, frequencyDays }) {
  const size = 68;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const overdue = status === "Overdue";
  const pending = status === "Pending" || (daysUntil == null && !overdue);
  const remaining = overdue ? 0 : Math.max(0, Number(daysUntil) || 0);
  const freq = Math.max(0, Number(frequencyDays) || 0);
  const frac = pending ? 0 : overdue ? 1 : freq ? Math.max(0, Math.min(1, remaining / freq)) : 0;
  const tone = overdue
    ? "text-error"
    : pending
      ? "text-base-content/20"
      : remaining <= 90
        ? "text-warning"
        : "text-success";
  const label = pending ? "—" : overdue ? String(daysOverdue || 0) : String(remaining);

  return (
    <div className={`relative w-[68px] h-[68px] shrink-0 ${tone}`}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-[68px] h-[68px] -rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          className="opacity-20"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - frac)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[15px] font-extrabold text-base-content tabular-nums">
        {label}
      </span>
    </div>
  );
}

function UnitBadge({ status }) {
  const overdue = status === "Overdue";
  const soon = status === "Due Soon";
  const done = status === "Completed";
  const cls = overdue
    ? "bg-error text-white"
    : soon
      ? "bg-warning text-white"
      : done
        ? "bg-success text-white"
        : "bg-base-300 text-base-content";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shrink-0 ${cls}`}>
      {done ? <CheckIcon className="w-3 h-3" /> : null}
      {soon || overdue ? <AlertIcon className="w-3 h-3" /> : null}
      {status || "Pending"}
    </span>
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
        <section key={`${visit.at}-${i}`} className="rounded-2xl bg-base-100 border border-base-300 p-4 shadow-sm">
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

function nextDueKind(status, daysUntil) {
  if (status === "Overdue") return "overdue";
  if (status === "Due Soon") return "soon";
  const n = Number(daysUntil);
  if (Number.isFinite(n) && n <= 90) return "watch";
  if (status === "Pending" || daysUntil == null) return "pending";
  return "ok";
}

function kindText(kind) {
  if (kind === "overdue") return "text-error";
  if (kind === "soon" || kind === "watch") return "text-warning";
  if (kind === "ok") return "text-success";
  return "";
}

function kindDot(kind) {
  if (kind === "overdue") return "bg-error";
  if (kind === "soon" || kind === "watch") return "bg-warning";
  if (kind === "ok") return "bg-success";
  return "bg-base-300";
}

function isPrePhase(phase) {
  return /^pre/i.test(String(phase || "").trim());
}

function QrScanIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 8V5h3M20 8V5h-3M4 16v3h3M20 16v3h-3" />
      <path d="M7 12h10" />
    </svg>
  );
}

function CalendarIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </svg>
  );
}

function GridIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <rect x="13" y="4" width="7" height="7" rx="1" />
      <rect x="4" y="13" width="7" height="7" rx="1" />
      <rect x="13" y="13" width="7" height="7" rx="1" />
    </svg>
  );
}

function FiltersIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}

function RefreshIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 12a8 8 0 1 1-2.2-5.5" />
      <path d="M20 5v5h-5" />
    </svg>
  );
}

function StageZeroIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CheckIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

function AlertIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 8v5" />
      <path d="M12 16.5h.01" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}
