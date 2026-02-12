import React from "react";
import { useNavigate } from "react-router-dom";
import LogoutButton from "./components/common/logoutbutton";
import { useOfflineSync } from "./offline/useOfflineSync";


export default function App() {
  const navigate = useNavigate();
  const {syncing, lastResult, runSync} = useOfflineSync();
  const tech = JSON.parse(localStorage.getItem("tech"));
  console.log(tech.name);
  console.log("API BASE URL:", import.meta.env.VITE_API_BASE_URL);

  if (!tech) {
    navigate("/");
    return null;
  }

  // Check if user has admin role
  const isAdmin = tech.role === "admin";

  return (

    <div data-theme="corporate" className="min-h-screen flex flex-col bg-base-200">
      {/* Header */}
      <header className="navbar bg-base-100 shadow-sm px-4">
        <div className="flex-1">
          <span className="font-bold text-lg tracking-tight">
            AFC Technician
          </span>
        </div>
        <div className="flex-none">
          <span className="badge badge-primary text-xs">v0.1</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 pt-4 pb-10 max-w-md mx-auto w-full space-y-5">

        {/* Greeting */}
        <section>
          <h1 className="text-2xl font-semibold">
            Hi {tech.name}, let's get to work!
          </h1>
          <p className="text-sm text-base-content/70 mt-1">
            Choose how you want to start today’s job.
          </p>
        </section>

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
                Scan the AHU's QR label to instantly load filter info,
                last service date, and required steps.
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
                <h2 className="card-title text-base">
                  Manual Mode – Select Hospital
                </h2>
                <span className="badge rounded-2xl badge-ghost text-xs">Fallback</span>
              </div>

              <p className="text-sm text-base-content/70 mb-3 leading-snug">
                If the QR label is missing or the camera has issues, browse
                hospitals manually and pick the AHU.
              </p>

              <button
                className="btn btn-outline w-full"
                onClick={() => navigate("/hospitals")}
              >
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
                <h2 className="card-title text-base">
                  Admin Dashboard
                </h2>
                <span className="rounded-2xl badge badge-info badge-soft badge-outline text-xs">
                  Admin
                </span>
              </div>

              <p className="text-sm text-base-content/70 mb-3 leading-snug">
                View system-wide status, upcoming changeouts, and overall
                compliance across all hospitals and AHUs.
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

        {/* Status Section */}
        <section className="space-y-1 pt-4">
          <div className="flex justify-between text-xs text-base-content/60">
            <span>Today's jobs</span>
            <span className="font-semibold">—</span>
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
            <span className={`font-semibold ${navigator.onLine ? 'text-success' : 'text-error'}`}>
              {navigator.onLine ? 'Online' : 'Offline'}
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}
