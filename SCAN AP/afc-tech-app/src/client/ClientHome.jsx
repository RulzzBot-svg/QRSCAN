import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getClientHospital } from "./api";
import { prettyDate } from "./format";
import { StatusBadge } from "./StatusBadge";
import InstallHint from "./InstallHint";

export default function ClientHome() {
  const [hospital, setHospital] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getClientHospital()
      .then((res) => {
        if (!cancelled) setHospital(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.error || "Could not load hospital");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-error text-sm">{error}</div>;
  }

  const summary = hospital?.summary || {};

  return (
    <div className="space-y-5">
      <section>
        <h2 className="text-2xl font-bold">{hospital?.name}</h2>
        <p className="text-sm text-base-content/60 mt-1">
          Filter status only — no pricing, invoices, or job notes. Analytics export and the technical
          packet PDF are under Analytics and Docs.
        </p>
      </section>
      <InstallHint />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="AHUs" value={summary.ahus || 0} />
        <Stat label="On schedule" value={summary.compliant || 0} tone="success" />
        <Stat label="Due soon" value={summary.due_soon || 0} tone="warning" />
        <Stat label="Overdue" value={summary.overdue || 0} tone="error" />
        <Stat label="Compliance" value={`${hospital?.compliance_pct ?? 0}%`} />
      </div>

      <section>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-base-content/45 uppercase mb-2">
          Actions
        </p>
        <div className="rounded-3xl bg-primary/5 border border-primary/10 p-4 sm:p-5">
          <div className="inline-flex items-center rounded-full bg-base-100 border border-base-300 px-4 py-1.5 text-sm font-semibold shadow-sm mb-4">
            Quick Actions
          </div>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            {QUICK_ACTIONS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-base-100 border border-base-300 shadow-sm px-2 py-4 min-h-[6.25rem] hover:border-primary/40 hover:shadow-md active:scale-[0.98] transition"
              >
                <item.icon className="w-8 h-8 text-primary" />
                <span className="text-xs font-medium text-center leading-tight text-base-content">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {(hospital?.held_filters || []).length ? (
        <section className="rounded-2xl bg-base-100 border border-warning/40 p-5">
          <h3 className="font-semibold">Held / not replaced</h3>
          <p className="text-xs text-base-content/50 mt-0.5 mb-3">
            Filters AFC recorded as skipped. Read-only — tap a unit for history.
          </p>
          <ul className="space-y-2">
            {hospital.held_filters.map((row, i) => (
              <li key={`${row.ahu_id}-${row.at}-${row.filter}-${i}`}>
                <Link
                  to={`/client/ahu/${row.ahu_id}`}
                  className="block rounded-xl px-2 py-2 -mx-2 hover:bg-base-200"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold truncate">{row.name}</p>
                    <span className="text-xs text-base-content/50 shrink-0">{prettyDate(row.at)}</span>
                  </div>
                  <p className="text-xs text-base-content/60 mt-0.5">
                    {[row.building, row.filter, "not replaced"].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-sm mt-1">{row.text}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {(hospital?.recent_changeouts || []).length ? (
        <section className="rounded-2xl bg-base-100 border border-success/30 p-5">
          <h3 className="font-semibold">Most recently replaced</h3>
          <p className="text-xs text-base-content/50 mt-0.5 mb-3">
            Last {hospital.recent_changeouts.length} changeouts at this hospital. Tap a unit to open it.
          </p>
          <ul className="space-y-2">
            {hospital.recent_changeouts.map((a) => (
              <li key={`${a.id}-${a.serviced_at}`}>
                <Link
                  to={`/client/ahu/${a.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 -mx-2 hover:bg-base-200 active:scale-[0.99] transition"
                >
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{a.name}</p>
                    <p className="text-xs text-base-content/50 truncate">
                      {[a.building, a.location, (a.stages || []).join(", ")].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-success shrink-0 tabular-nums">
                    {prettyDate(a.serviced_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="rounded-2xl bg-base-100 border border-base-300 p-5">
          <h3 className="font-semibold">Most recently replaced</h3>
          <p className="text-sm text-base-content/50 mt-2">No changeouts on file for this hospital yet.</p>
        </section>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        <section className="card bg-base-100 border border-base-300">
          <div className="card-body p-5">
            <h3 className="font-semibold">Needs attention</h3>
            {(hospital?.overdue_units || []).length ? (
              <ul className="space-y-2 mt-2">
                {hospital.overdue_units.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                    <Link className="link link-primary font-medium" to={`/client/ahu/${a.id}`}>
                      {a.name}
                    </Link>
                    <span className="text-xs text-base-content/50 truncate">
                      {[a.building, a.location].filter(Boolean).join(" · ")}
                    </span>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-base-content/60 mt-2">No overdue units right now.</p>
            )}
          </div>
        </section>
        <DuePreview summary={hospital?.upcoming_summary} />
      </div>

      <div className="flex items-center gap-2 text-xs text-base-content/50">
        <StatusBadge status="Completed" />
        <span>on schedule</span>
        <StatusBadge status="Due Soon" />
        <StatusBadge status="Overdue" />
      </div>
    </div>
  );
}

const QUICK_ACTIONS = [
  { to: "/client/scan", label: "Scan unit QR", icon: QrIcon },
  { to: "/client/units", label: "Browse units", icon: FolderIcon },
  { to: "/client/graphs", label: "Analytics", icon: AnalyticsIcon },
  { to: "/client/contact", label: "Help", icon: HelpCircleIcon },
  { to: "/client/docs", label: "Docs", icon: DocsIcon },
];

function QrIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="5.75" y="5.75" width="2.5" height="2.5" fill="currentColor" stroke="none" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="15.75" y="5.75" width="2.5" height="2.5" fill="currentColor" stroke="none" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
      <rect x="5.75" y="15.75" width="2.5" height="2.5" fill="currentColor" stroke="none" />
      <rect x="13.5" y="13.5" width="3" height="3" fill="currentColor" stroke="none" />
      <rect x="17.5" y="13.5" width="3" height="3" rx="0.4" />
      <rect x="13.5" y="17.5" width="3" height="3" rx="0.4" />
      <rect x="17.75" y="17.75" width="2.5" height="2.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FolderIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    >
      <path d="M3.5 8.5h5.2l1.8 1.8H20.5v8.2a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z" />
      <path d="M3.5 8.5V6.8A1.3 1.3 0 0 1 4.8 5.5h4.1l1.5 1.5" />
    </svg>
  );
}

function AnalyticsIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <path d="M7 18V11" />
      <path d="M12 18V6" />
      <path d="M17 18V9" />
    </svg>
  );
}

function HelpCircleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.4a2.5 2.5 0 1 1 3.3 2.35c-.85.4-1.3.9-1.3 1.75" strokeLinecap="round" />
      <circle cx="12" cy="16.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function DocsIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    >
      <path d="M7 3.5h7.2L20.5 10v10.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5z" />
      <path d="M14.2 3.5V10h6.3" />
      <path d="M9 13.5h6.5M9 17h4.5" strokeLinecap="round" />
    </svg>
  );
}

function DuePreview({ summary }) {
  const asap = summary?.ahus_asap || 0;
  const month = summary?.ahus_month || 0;
  return (
    <Link to="/client/upcoming" className="card bg-base-100 border border-base-300">
      <div className="card-body p-5">
        <h3 className="font-semibold">Due this month</h3>
        <p className="text-sm text-base-content/60">
          {asap} ASAP · {month} later this month. Building list of what is coming due.
        </p>
      </div>
    </Link>
  );
}

function Stat({ label, value, tone }) {
  const color =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "error"
          ? "text-error"
          : "text-primary";
  return (
    <div className="rounded-2xl bg-base-100 border border-base-300 p-4">
      <p className="text-xs text-base-content/50">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
