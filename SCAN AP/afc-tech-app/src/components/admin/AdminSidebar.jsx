import { NavLink, useNavigate } from "react-router-dom";

function AdminSidebar() {
  const navigate = useNavigate();

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg transition
     ${isActive ? "bg-primary text-primary-content" : "hover:bg-base-300"}`;

  return (
    <aside className="w-48 flex lg:max-h flex-col bg-base-100 border-r border-base-300 transition-all duration-200">
      {/* Logo / Title */}
      <div className="p-3 font-bold text-primary">AFC Admin</div>

      {/* Nav */}
      <ul className="menu grow px-2 space-y-1 text-sm">
        <li>
          <NavLink
            to="/admin"
            end
            className={linkClass}
          >
            📊
            <span className="ml-2">Dashboard</span>
          </NavLink>
        </li>

        <li>
          <NavLink to="/admin/ahus" className={linkClass}>
            🌀
            <span className="ml-2">AHUs</span>
          </NavLink>
        </li>

        <li>
          <NavLink to="/admin/jobs" className={linkClass}>
            📋
            <span className="ml-2">Jobs</span>
          </NavLink>
        </li>

        <li>
          <NavLink to="/admin/signoffs" className={linkClass}>
            📝
            <span className="ml-2">Signed Off</span>
          </NavLink>
        </li>
      </ul>

      {/* Footer */}
      <div className="p-2 border-t border-base-300">
        <button className="btn btn-ghost btn-sm w-full justify-start" onClick={() => navigate("/Home")}>⬅
          <span className="ml-2">Back to Technician App</span>
        </button>
      </div>
    </aside>
  );
}

export default AdminSidebar;
