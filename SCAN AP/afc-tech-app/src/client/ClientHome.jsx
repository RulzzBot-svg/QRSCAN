import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getClientHospital } from "./api";
import { prettyDate } from "./format";
import { StatusBadge } from "./StatusBadge";
import InstallHint from "./InstallHint";

const ATTENTION_PREVIEW = 5;

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
  const overdueCount = summary.overdue || 0;
  const overdueUnits = hospital?.overdue_units || [];
  const attentionPreview = overdueUnits.slice(0, ATTENTION_PREVIEW);
  const compliance = hospital?.compliance_pct ?? 0;

  return (
    <div className="space-y-6">
      <InstallHint />

      <div className="grid md:grid-cols-2 gap-3 md:gap-4">
        <ComplianceHero pct={compliance} />
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Total AHUs" value={summary.ahus || 0} icon={AhuIcon} />
          <MetricCard
            label="On Schedule"
            value={summary.compliant || 0}
            tone="success"
            icon={CheckIcon}
          />
          <MetricCard
            label="Due Soon"
            value={summary.due_soon || 0}
            tone="warning"
            icon={ClockIcon}
          />
          <MetricCard
            label="Overdue"
            value={overdueCount}
            tone="error"
            icon={AlertIcon}
          />
        </div>
      </div>

      <section>
        <h3 className="text-sm font-bold px-1 mb-3">Quick Actions</h3>
        <div className="flex overflow-x-auto gap-3 pb-1 -mx-4 px-4 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:px-0 md:grid md:grid-cols-5 md:overflow-visible">
          {QUICK_ACTIONS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="snap-start shrink-0 w-[5.5rem] h-[5.5rem] md:w-auto md:h-28 rounded-[1.25rem] bg-base-100 border border-base-300 shadow-sm flex flex-col items-center justify-center gap-2 active:scale-95 hover:border-primary/40 hover:shadow-md transition"
            >
              <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <item.icon className="w-5 h-5" />
              </span>
              <span className="text-[11px] font-bold text-center leading-tight">{item.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {(hospital?.held_filters || []).length ? (
        <section className="rounded-3xl bg-base-100 border border-warning/40 overflow-hidden">
          <div className="px-5 py-4 border-b border-base-200 bg-warning/5 flex items-center justify-between">
            <h3 className="font-bold">Held / not replaced</h3>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-warning/20 text-warning">
              {hospital.held_filters.length}
            </span>
          </div>
          <ul className="p-2">
            {hospital.held_filters.map((row, i) => (
              <li key={`${row.ahu_id}-${row.at}-${row.filter}-${i}`}>
                <Link
                  to={`/client/ahu/${row.ahu_id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3 hover:bg-base-200"
                >
                  <div className="min-w-0">
                    <p className="font-bold truncate">{row.name}</p>
                    <p className="text-[11px] text-base-content/50 mt-0.5">
                      {[row.building, row.filter, "not replaced"].filter(Boolean).join(" · ")}
                    </p>
                    {row.text ? <p className="text-sm mt-1">{row.text}</p> : null}
                  </div>
                  <span className="text-xs text-base-content/50 shrink-0">{prettyDate(row.at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-3xl bg-base-100 border border-base-300 overflow-hidden">
        <div className="px-5 py-4 border-b border-base-200 bg-base-200/40 flex items-center justify-between">
          <h3 className="font-bold">Needs Attention</h3>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
              overdueCount ? "bg-error/15 text-error" : "bg-base-200 text-base-content/50"
            }`}
          >
            {overdueCount} Overdue
          </span>
        </div>
        {attentionPreview.length ? (
          <ul className="p-2">
            {attentionPreview.map((a) => (
              <li key={a.id}>
                <Link
                  to={`/client/ahu/${a.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3 hover:bg-base-200 active:bg-base-200"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{a.name}</p>
                    <p className="text-[11px] text-base-content/45 font-medium mt-0.5 truncate">
                      {[a.building, a.location].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={a.status} />
                    <ChevronIcon className="w-4 h-4 text-base-content/30" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-base-content/60 px-5 py-4">No overdue units right now.</p>
        )}
        {overdueCount > attentionPreview.length ? (
          <div className="p-3 pt-1">
            <Link
              to="/client/units"
              className="block w-full py-3.5 rounded-xl bg-base-200 text-center text-xs font-bold text-base-content/70 active:bg-base-300"
            >
              View All {overdueCount} Units
            </Link>
          </div>
        ) : null}
      </section>

      {(hospital?.recent_changeouts || []).length ? (
        <section className="rounded-3xl bg-base-100 border border-success/30 overflow-hidden">
          <div className="px-5 py-4 border-b border-base-200 flex items-center justify-between">
            <h3 className="font-bold">Recently Replaced</h3>
            <Link to="/client/units" className="text-primary text-sm font-semibold">
              View units
            </Link>
          </div>
          <ul className="p-2">
            {hospital.recent_changeouts.map((a) => (
              <li key={`${a.id}-${a.serviced_at}`}>
                <Link
                  to={`/client/ahu/${a.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3 hover:bg-base-200 active:scale-[0.99] transition"
                >
                  <div className="min-w-0">
                    <p className="font-bold truncate">{a.name}</p>
                    <p className="text-[11px] text-base-content/50 truncate mt-0.5">
                      {[a.building, a.location, (a.stages || []).join(", ")].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-success shrink-0 tabular-nums">
                    {prettyDate(a.serviced_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="rounded-3xl bg-base-100 border border-base-300 p-5">
          <h3 className="font-bold">Recently Replaced</h3>
          <p className="text-sm text-base-content/50 mt-2">No changeouts on file for this hospital yet.</p>
        </section>
      )}

      <DuePreview summary={hospital?.upcoming_summary} />
    </div>
  );
}

const QUICK_ACTIONS = [
  { to: "/client/scan", label: "Scan QR", icon: QrIcon },
  { to: "/client/units", label: "Browse", icon: FolderIcon },
  { to: "/client/graphs", label: "Analytics", icon: AnalyticsIcon },
  { to: "/client/docs", label: "Docs", icon: DocsIcon },
  { to: "/client/contact", label: "Help", icon: HelpCircleIcon },
];

const RING = 2 * Math.PI * 32;

function ComplianceHero({ pct }) {
  const value = Math.max(0, Math.min(100, Number(pct) || 0));
  const offset = RING - (RING * value) / 100;
  return (
    <section className="rounded-3xl bg-base-100 border border-base-300 shadow-sm p-6 flex items-center justify-between gap-4">
      <div>
        <h2 className="text-base-content/50 font-bold text-xs uppercase tracking-wider mb-1">
          Facility Health
        </h2>
        <p className="text-2xl font-black leading-tight">Compliance</p>
        <p className="text-xs text-base-content/50 mt-1">Status only — no prices or invoices.</p>
      </div>
      <div className="relative w-20 h-20 shrink-0">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
          <circle
            cx="40"
            cy="40"
            r="32"
            fill="none"
            strokeWidth="8"
            className="stroke-base-200"
          />
          <circle
            cx="40"
            cy="40"
            r="32"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            className="stroke-primary"
            strokeDasharray={RING}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-black tabular-nums tracking-tighter">
            {value}
            <span className="text-xs text-base-content/40">%</span>
          </span>
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value, tone, icon: Icon }) {
  const styles =
    tone === "success"
      ? {
          wrap: "border-success/20",
          glow: "bg-success/10",
          well: "bg-success/10 text-success",
          value: "text-success",
          label: "text-success/70",
        }
      : tone === "warning"
        ? {
            wrap: "border-warning/20",
            glow: "bg-warning/10",
            well: "bg-warning/10 text-warning",
            value: "text-warning",
            label: "text-warning/70",
          }
        : tone === "error"
          ? {
              wrap: "border-error/20",
              glow: "bg-error/10",
              well: "bg-error/10 text-error",
              value: "text-error",
              label: "text-error/70",
            }
          : {
              wrap: "border-base-300",
              glow: "bg-base-200/60",
              well: "bg-base-200 text-base-content/50",
              value: "text-base-content",
              label: "text-base-content/45",
            };
  return (
    <div
      className={`relative overflow-hidden rounded-[1.25rem] bg-base-100 border shadow-sm p-4 flex flex-col justify-between min-h-[7.5rem] ${styles.wrap}`}
    >
      <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-full ${styles.glow}`} />
      <span className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${styles.well}`}>
        <Icon className="w-4 h-4" />
      </span>
      <div className="relative z-10 mt-3">
        <p className={`text-3xl font-extrabold tabular-nums tracking-tight ${styles.value}`}>{value}</p>
        <p className={`text-[11px] font-bold uppercase tracking-wider mt-0.5 ${styles.label}`}>{label}</p>
      </div>
    </div>
  );
}

function DuePreview({ summary }) {
  const asap = summary?.ahus_asap || 0;
  const month = summary?.ahus_month || 0;
  return (
    <Link
      to="/client/upcoming"
      className="block rounded-3xl bg-base-100 border border-base-300 p-5 hover:border-primary/40 transition"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold">Due this month</h3>
        <ChevronIcon className="w-4 h-4 text-base-content/30" />
      </div>
      <p className="text-sm text-base-content/60 mt-1">
        {asap} ASAP · {month} later this month
      </p>
    </Link>
  );
}

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
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M3.5 8.5h5.2l1.8 1.8H20.5v8.2a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z" />
      <path d="M3.5 8.5V6.8A1.3 1.3 0 0 1 4.8 5.5h4.1l1.5 1.5" />
    </svg>
  );
}

function AnalyticsIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
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
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M7 3.5h7.2L20.5 10v10.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5z" />
      <path d="M14.2 3.5V10h6.3" />
      <path d="M9 13.5h6.5M9 17h4.5" strokeLinecap="round" />
    </svg>
  );
}

function AhuIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 9h8M8 12h5M8 15h3" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.5 2.4 2.4 4.6-5" />
    </svg>
  );
}

function ClockIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v4.5l3 1.8" strokeLinecap="round" />
    </svg>
  );
}

function AlertIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v5" strokeLinecap="round" />
      <circle cx="12" cy="16.2" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ChevronIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
