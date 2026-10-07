import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { clearClientSession, hasClientToken, readClientUser } from "./api";
import {
  applyClientTheme,
  clearDocumentTheme,
  readClientTheme,
  storeClientTheme,
  toggleClientTheme,
} from "./theme";
import ThemeToggle from "./ThemeToggle";

const NAV = [
  { to: "/client", label: "Home", end: true, icon: HomeIcon },
  { to: "/client/units", label: "Units", icon: UnitsIcon },
  { to: "/client/scan", label: "Scan", icon: ScanIcon, featured: true },
  { to: "/client/graphs", label: "Graphs", icon: GraphIcon },
  { to: "/client/contact", label: "Contact", icon: ContactIcon },
];

export default function ClientApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState(readClientTheme);
  const user = readClientUser();

  useEffect(() => {
    if (!hasClientToken() || !user) {
      const next = `${location.pathname}${location.search || ""}`;
      try {
        sessionStorage.setItem("post_client_path", next);
      } catch {
        /* ignore */
      }
      navigate("/client/login", { replace: true });
    }
  }, [navigate, location.pathname, location.search, user]);

  useEffect(() => {
    applyClientTheme(theme);
    storeClientTheme(theme);
    return () => clearDocumentTheme();
  }, [theme]);

  if (!hasClientToken() || !user) return null;

  const hospital = user.hospital_name || "Hospital portal";

  return (
    <div data-theme={theme} className="min-h-dvh bg-base-200 text-base-content">
      <div className="md:flex md:min-h-dvh">
        <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-base-300 md:bg-base-100">
          <div className="px-5 py-6 border-b border-base-300">
            <p className="text-[11px] font-extrabold tracking-[0.18em] text-primary">AFC</p>
            <h1 className="font-bold text-lg leading-tight mt-1">Hospital Portal</h1>
            <p className="text-sm text-base-content/60 mt-1">{hospital}</p>
          </div>
          <nav className="flex-1 p-3 space-y-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                    isActive ? "bg-primary text-primary-content" : "hover:bg-base-200"
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="p-4 border-t border-base-300 space-y-2">
            <ThemeToggle theme={theme} onToggle={() => setTheme(toggleClientTheme(theme))} />
            <button
              type="button"
              className="btn btn-ghost btn-sm w-full justify-start"
              onClick={() => {
                clearClientSession();
                navigate("/client/login");
              }}
            >
              Sign out
            </button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="md:hidden sticky top-0 z-20 bg-base-100/95 backdrop-blur border-b border-base-300">
            <div className="flex items-center justify-between px-4 h-14 gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold tracking-[0.16em] text-primary">AFC PORTAL</p>
                <p className="text-sm font-semibold truncate">{hospital}</p>
              </div>
              <div className="flex items-center shrink-0">
                <ThemeToggle theme={theme} onToggle={() => setTheme(toggleClientTheme(theme))} compact />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    clearClientSession();
                    navigate("/client/login");
                  }}
                >
                  Sign out
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 w-full max-w-5xl mx-auto px-4 pt-4 pb-28 md:px-8 md:py-8">
            <Outlet />
          </main>

          <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-base-100 border-t border-base-300 pb-[env(safe-area-inset-bottom)]">
            <div className="grid grid-cols-5 h-16">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex flex-col items-center justify-center gap-0.5 text-[11px] ${
                      isActive ? "text-primary font-semibold" : "text-base-content/60"
                    }`
                  }
                >
                  <span
                    className={
                      item.featured
                        ? "flex items-center justify-center w-11 h-11 -mt-5 rounded-full bg-primary text-primary-content shadow-lg"
                        : ""
                    }
                  >
                    <item.icon className={item.featured ? "w-6 h-6" : "w-5 h-5"} />
                  </span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}

function HomeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10.5V20h14v-9.5" />
    </svg>
  );
}

function ScanIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 8V5h3M20 8V5h-3M4 16v3h3M20 16v3h-3" />
      <path d="M7 12h10" />
    </svg>
  );
}

function UnitsIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <rect x="13" y="4" width="7" height="7" rx="1" />
      <rect x="4" y="13" width="7" height="7" rx="1" />
      <rect x="13" y="13" width="7" height="7" rx="1" />
    </svg>
  );
}

function GraphIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 16v-5" />
      <path d="M12 16V8" />
      <path d="M16 16v-8" />
    </svg>
  );
}

function ContactIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16v12H4z" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}
