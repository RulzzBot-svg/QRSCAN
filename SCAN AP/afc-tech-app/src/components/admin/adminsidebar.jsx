import { NavLink, useNavigate } from "react-router-dom";

function AdminSidebar() {
  const navigate = useNavigate();

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2 rounded-md text-sm transition-colors
     ${
       isActive
         ? "bg-primary text-primary-content"
         : "text-base-content/70 hover:bg-base-200"
     }`;

  return (
    <aside className="w-64 bg-base-100 border-r border-base-300 min-h-screen flex flex-col">
      
      {/* Header */}
      <div className="px-4 py-4 border-b border-base-300">
        <h2 className="text-lg font-bold text-primary">
          AFC Admin
        </h2>
        <p className="text-xs text-base-content/60">
          Management Console
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        <NavLink to="/admin" end className={linkClass}>
          📊 Overview
        </NavLink>

        <NavLink to="/admin/hospitals" className={linkClass}>
          🏥 Hospitals
        </NavLink>

        <NavLink to="/admin/ahus" className={linkClass}>
          🌀 AHUs
        </NavLink>

        <NavLink to="/admin/jobs" className={linkClass}>
          🧾 Jobs / History
        </NavLink>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-base-300">
        <button
          className="btn btn-ghost btn-sm w-full justify-start"
          onClick={() => navigate("/")}
        >
          ⬅ Back to Technician App
        </button>
      </div>
    </aside>
  );
}

export default AdminSidebar;
