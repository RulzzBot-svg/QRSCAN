import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TECH_APP_NAME } from "./branding";
import LogoutButton from "./components/common/logoutbutton";
import { useOfflineSync } from "./offline/useOfflineSync";
import { getOfflineHospitals } from "./offline/offlineBundle";
import { hasAuthToken } from "./api/api";

export default function App() {
  const navigate = useNavigate();
  const { syncing, lastResult, queue, runSync } = useOfflineSync();
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [downloads, setDownloads] = useState([]);

  const tech = useMemo(() => {
    try {
      const raw = localStorage.getItem("tech");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    getOfflineHospitals()
      .then((rows) => setDownloads(rows || []))
      .catch(() => setDownloads([]));
  }, []);

  useEffect(() => {
    if (!tech) {
      navigate("/");
      return;
    }
    if (online && !hasAuthToken()) {
      navigate("/");
    }
  }, [tech, navigate, online]);

  if (!tech) return null;
  if (online && !hasAuthToken()) return null;

  // Normalize role check (handles missing role, casing, extra spaces)
  const role = String(tech?.role || "").trim().toLowerCase();
  const isAdmin = role === "admin";

  return (
    <div data-theme="corporate" className="min-h-screen flex flex-col bg-base-200">
      {/* Header */}
      <header className="navbar bg-base-100 shadow-sm px-4">
        <div className="flex-1">
          <span className="font-bold text-lg tracking-tight">{TECH_APP_NAME}</span>
        </div>
        <div className="flex-none">
          <span className="badge badge-primary text-xs">v1.3</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 pt-4 pb-10 max-w-md mx-auto w-full space-y-5">
        {/* Greeting */}
        <section>
          <h1 className="text-2xl font-semibold">Hi {tech.name}, let's get to work!</h1>
          <p className="text-sm text-base-content/70 mt-1">
            Choose how you want to start today’s job.
          </p>
        </section>

        {!online ? (
          <div className="rounded-lg bg-warning/20 border border-warning p-3 text-sm">
            No signal. Scan and complete jobs from hospitals already downloaded on this phone.
            They upload when you are back online.
          </div>
        ) : null}

        {queue?.pending > 0 ? (
          <div className="rounded-lg bg-info/15 border border-info p-3 text-sm space-y-2">
            <p className="font-medium">
              {queue.pending} job{queue.pending === 1 ? "" : "s"} saved on this phone
              {queue.failed ? ` · ${queue.failed} failed last upload` : " · not uploaded yet"}
            </p>
            {lastResult?.needsLogin ? (
              <p>Sign in while online to upload. Jobs stay on the phone until then.</p>
            ) : null}
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={runSync}
              disabled={syncing || !online || !hasAuthToken()}
            >
              {syncing ? "Uploading…" : online ? "Upload now" : "Waiting for signal"}
            </button>
          </div>
        ) : null}

        {/* Quick Actions */}
        <section className="space-y-4">
          {/* Scan Mode */}
          <div className="card bg-base-100 border border-base-300 shadow-sm">
            <div className="card-body p-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="card-title text-base">Scan QR to Start</h2>
                <span className="rounded-2xl badge badge-success text-xs">Recommended</span>
              </div>

              <p className="text-sm text-base-content/70 mb-3 leading-snug">
                Scan the AHU's QR label to instantly load filter info, last service date, and
                required steps.
              </p>

              <button className="btn btn-primary w-full" onClick={() => navigate("/scan")}>
                📷 Scan QR Code
              </button>
            </div>
          </div>

          {/* Manual Mode */}
          <div className="card bg-base-100 border border-base-300 shadow-sm">
            <div className="card-body p-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="card-title text-base">Manual Mode – Select Hospital</h2>
                <span className="badge rounded-2xl badge-ghost text-xs">Fallback</span>
              </div>

              <p className="text-sm text-base-content/70 mb-3 leading-snug">
                If the QR label is missing or the camera has issues, browse hospitals manually
                and pick the AHU.
              </p>

              <button className="btn btn-outline w-full" onClick={() => navigate("/hospitals")}>
                🏥 Choose Hospital & AHU
              </button>
            </div>
          </div>
        </section>

        {/* Admin Dashboard - Only show for admin users */}
        {isAdmin && (
          <div className="card bg-base-100 border border-base-300 shadow-sm">
            <div className="card-body p-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="card-title text-base">Admin Dashboard</h2>
                <span className="rounded-2xl badge badge-info badge-soft badge-outline text-xs">
                  Admin
                </span>
              </div>

              <p className="text-sm text-base-content/70 mb-3 leading-snug">
                View system-wide status, upcoming changeouts, and overall compliance across all
                hospitals and AHUs.
              </p>

              <button
                className="btn btn-outline btn-info w-full"
                onClick={() => navigate("/admin")}
              >
                📊 Open Admin Dashboard
              </button>
            </div>
          </div>
        )}

        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body p-4">
            <LogoutButton />
          </div>
        </div>

        <details className="collapse collapse-arrow bg-base-100 border border-base-300">
          <summary className="collapse-title text-sm font-semibold min-h-12">
            Downloaded for offline
            <span className="ml-2 font-normal text-base-content/50">
              {downloads.length ? `(${downloads.length})` : ""}
            </span>
          </summary>
          <div className="collapse-content">
            {downloads.length ? (
              <ul className="space-y-1 pb-1">
                {downloads.map((h) => (
                  <li key={h.hospital_id}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm w-full justify-start"
                      onClick={() => navigate(`/buildings/${h.hospital_id}`)}
                    >
                      {h.name}
                      <span className="ml-auto text-xs opacity-60">{h.ahu_count} AHUs</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-base-content/50 pb-2">
                None yet. Open Choose Hospital and tap Download Hospital for offline.
              </p>
            )}
          </div>
        </details>

        {/* Status Section */}
        <section className="space-y-1 pt-4">
          <div className="flex justify-between text-xs text-base-content/60">
            <span>Today's jobs</span>
            <span className="font-semibold">{queue?.pending || 0} queued</span>
          </div>

          <div style={{ position: "fixed", bottom: 10, right: 10, zIndex: 9999 }}>
            <button
              onClick={runSync}
              disabled={syncing}
              className="btn btn-xs"
              title="Sync queued jobs"
            >
              {syncing ? "Syncing..." : "Sync"}
            </button>

            {lastResult && (
              <div className="text-xs mt-1 opacity-70">
                synced: {lastResult.synced}, failed: {lastResult.failed}
              </div>
            )}
          </div>

          <div className="flex justify-between text-xs text-base-content/60">
            <span>Connection</span>
            <span className={`font-semibold ${online ? "text-success" : "text-error"}`}>
              {online ? "Online" : "Offline"}
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}
