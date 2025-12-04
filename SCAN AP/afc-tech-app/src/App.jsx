import React from "react";
import { useNavigate } from "react-router-dom";

function App() {
  const navigate = useNavigate(); // navigation hook

  return (
    <div
      data-theme="business"
      className="min-h-screen flex flex-col bg-base-200"
    >
      {/* Top App Bar */}
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
      <main className="flex-1 flex flex-col gap-4 px-4 pt-4 pb-6 max-w-md mx-auto w-full">
        {/* Greeting */}
        <section>
          <h1 className="text-2xl font-semibold mb-1">
            Hi [TechName], lets get to work!
          </h1>
        </section>

        {/* Quick Actions */}
        <section className="grid gap-4 mt-2">
          {/* Fast Scan Mode */}
          <div className="card bg-base-100 shadow-md border border-base-300">
            <div className="card-body p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h2 className="card-title text-base">Scan QR to Start</h2>
                <span className="badge badge-success text-xs">Recommended</span>
              </div>

              <p className="text-sm text-base-content/70 mb-3">
                Open the camera, scan the AHU QR label, and we&apos;ll load all
                unit info automatically. Use this when the QR sticker is present.
              </p>

              <button className="btn btn-primary w-full">
                📷 Scan QR Code
              </button>
            </div>
          </div>

          {/* Manual Mode */}
          <div className="card bg-base-100 shadow-sm border border-base-300">
            <div className="card-body p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h2 className="card-title text-base">
                  Manual Mode – Select Hospital
                </h2>
                <span className="badge badge-ghost text-xs">Fallback</span>
              </div>

              <p className="text-sm text-base-content/70 mb-3">
                If the QR label is missing or the camera isn't loading, pick the hospital,
                then AHU, and we'll take you to a checklist from there.
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

        {/* Mini Status / Info */}
        <section className="mt-2 space-y-2">
          <div className="flex items-center justify-between text-xs text-base-content/60">
            <span>Today&apos;s jobs</span>
            <span className="font-semibold">—</span>
          </div>

          <div className="flex items-center justify-between text-xs text-base-content/60">
            <span>Last sync</span>
            <span className="font-semibold">Online</span>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
