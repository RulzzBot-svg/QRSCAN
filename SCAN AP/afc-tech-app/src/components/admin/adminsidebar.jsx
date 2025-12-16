import { NavLink } from "react-router-dom";
import { useNavigate } from "react-router-dom";





function AdminSidebar() {
  const navigate = useNavigate()
  const linkClass = ({ isActive }) =>
    `block px-4 py-2 rounded-lg ${isActive
      ? "bg-primary text-primary-content"
      : "hover:bg-base-200"
    }`;

  return (
    <aside className="w-64 bg-base-100 border-r border-base-300 p-4">
      <h2 className="text-xl font-bold text-primary mb-6">
        AFC Admin
      </h2>

      <nav className="space-y-2 text-sm">
        <NavLink to="/admin" end className={linkClass}>
          📊 Dashboard
        </NavLink>

        <NavLink to="/admin/hospitals" className={linkClass}>
          🏥 Hospitals
        </NavLink>

        <NavLink to="/admin/ahus" className={linkClass}>
          🌀 AHUs
        </NavLink>

        <NavLink to="/admin/jobs" className={linkClass}>
          📋 Jobs / History
        </NavLink>
      </nav>
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
