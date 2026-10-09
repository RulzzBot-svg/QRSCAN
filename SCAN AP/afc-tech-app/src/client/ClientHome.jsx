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
          Filter status only — no pricing, invoices, or job notes. Graphs export and the technical
          packet PDF are under Graphs and Docs.
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

      <Link
        to="/client/scan"
        className="card bg-primary text-primary-content shadow-md active:scale-[0.99] transition"
      >
        <div className="card-body p-5">
          <h3 className="card-title text-lg">Scan a unit QR</h3>
          <p className="text-sm opacity-90">
            Point the camera at the AHU label. Same sticker technicians use — portal view only.
          </p>
          <span className="btn btn-sm bg-white text-primary border-0 w-fit">Open camera</span>
        </div>
      </Link>

      <div className="grid md:grid-cols-2 gap-3">
        <Link to="/client/units" className="card bg-base-100 border border-base-300">
          <div className="card-body p-5">
            <h3 className="font-semibold">Browse units</h3>
            <p className="text-sm text-base-content/60">Building, location, last serviced, and next due.</p>
          </div>
        </Link>
        <Link to="/client/graphs" className="card bg-base-100 border border-base-300">
          <div className="card-body p-5">
            <h3 className="font-semibold">Graphs</h3>
            <p className="text-sm text-base-content/60">Compliance mix, buildings, and visits.</p>
          </div>
        </Link>
        <Link to="/client/contact" className="card bg-base-100 border border-base-300">
          <div className="card-body p-5">
            <h3 className="font-semibold">Call or email AFC</h3>
            <p className="text-sm text-base-content/60">
              Phone and a short message form. Nothing here can edit units.
            </p>
          </div>
        </Link>
        <Link to="/client/docs" className="card bg-base-100 border border-base-300">
          <div className="card-body p-5">
            <h3 className="font-semibold">Documentation</h3>
            <p className="text-sm text-base-content/60">How to use, and a download button for the hospital-IT PDF.</p>
          </div>
        </Link>
      </div>

      {(hospital?.overdue_units || []).length ? (
        <section className="rounded-2xl bg-base-100 border border-base-300 p-5">
          <h3 className="font-semibold mb-3">Needs attention</h3>
          <ul className="space-y-2">
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
        </section>
      ) : null}

      <div className="flex items-center gap-2 text-xs text-base-content/50">
        <StatusBadge status="Completed" />
        <span>on schedule</span>
        <StatusBadge status="Due Soon" />
        <StatusBadge status="Overdue" />
      </div>
    </div>
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
