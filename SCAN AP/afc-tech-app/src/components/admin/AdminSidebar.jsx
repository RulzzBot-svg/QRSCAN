import { NavLink, useNavigate } from "react-router-dom";

export const ADMIN_NAV = [
  { to: "/admin", label: "Dashboard", short: "Home", end: true, icon: "📊" },
  { to: "/admin/hospitals", label: "Hospitals", short: "Hospitals", icon: "🏥" },
  { to: "/admin/ahus", label: "AHUs", short: "AHUs", icon: "🌀" },
  { to: "/admin/jobs", label: "Jobs", short: "Jobs", icon: "📋" },
  { to: "/admin/signoffs", label: "Signed Off", short: "Signed", icon: "📝" },
];

function closeDrawer() {
  const el = document.getElementById("admin-drawer");
  if (el) el.checked = false;
}

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 px-3 py-2 rounded-lg transition
   ${isActive ? "bg-primary text-primary-content" : "hover:bg-base-300"}`;

function AdminSidebar({ onCollapse }) {
  const navigate = useNavigate();

  return (
    <aside className="w-56 h-full min-h-dvh flex flex-col bg-base-100 border-r border-base-300">
      <div className="p-3 font-bold text-primary flex items-center justify-between gap-2">
        <span>AFC Admin</span>
        {onCollapse ? (
          <button
            type="button"
            className="btn btn-ghost btn-square btn-xs"
            onClick={onCollapse}
            aria-label="Close sidebar"
            title="Close sidebar"
          >
            «
          </button>
        ) : null}
      </div>

      <ul className="menu grow px-2 space-y-1 text-sm">
        {ADMIN_NAV.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={linkClass}
              onClick={closeDrawer}
            >
              {item.icon}
              <span className="ml-2">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="p-2 border-t border-base-300">
        <button
          className="btn btn-ghost btn-sm w-full justify-start"
          onClick={() => {
            closeDrawer();
            navigate("/Home");
          }}
        >
          ⬅
          <span className="ml-2 truncate">Back to Technician App</span>
        </button>
      </div>
    </aside>
  );
}

export function AdminBottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-base-300 bg-base-100 pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5">
        {ADMIN_NAV.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] leading-tight ${
                  isActive ? "text-primary font-semibold" : "text-base-content/70"
                }`
              }
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.short}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default AdminSidebar;
