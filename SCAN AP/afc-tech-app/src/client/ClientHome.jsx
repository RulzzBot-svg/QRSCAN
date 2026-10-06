import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getClientHospital } from "./api";
import { StatusBadge } from "./StatusBadge";

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
          Filter status only — no pricing, invoices, or job notes.
        </p>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="AHUs" value={summary.ahus || 0} />
        <Stat label="On schedule" value={summary.compliant || 0} tone="success" />
        <Stat label="Due soon" value={summary.due_soon || 0} tone="warning" />
        <Stat label="Overdue" value={summary.overdue || 0} tone="error" />
      </div>

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
