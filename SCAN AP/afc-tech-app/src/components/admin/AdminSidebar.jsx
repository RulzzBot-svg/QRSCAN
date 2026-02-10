import { NavLink, useNavigate } from "react-router-dom";

function AdminSidebar() {
  const navigate = useNavigate();

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg transition
     ${isActive ? "bg-primary text-primary-content" : "hover:bg-base-300"}`;

  return (
    <aside
      className="
        flex min-h-full flex-col bg-base-100 border-r border-base-300
        is-drawer-close:w-14
        is-drawer-open:w-64
        transition-all duration-300
      "
    >
      {/* Logo / Title */}
      <div className="p-4 font-bold text-primary is-drawer-close:hidden">
        AFC Admin
      </div>

      {/* Nav */}
      <ul className="menu grow px-2 space-y-1 text-sm">
        <li>
          <NavLink
            to="/admin"
            end
            className={`${linkClass} is-drawer-close:tooltip is-drawer-close:tooltip-right`}
            data-tip="Dashboard"
          >
            📊
            <span className="is-drawer-close:hidden">Dashboard</span>
          </NavLink>
        </li>

        <li>
          <NavLink
            to="/admin/hospitals"
            className={`${linkClass} is-drawer-close:tooltip is-drawer-close:tooltip-right`}
            data-tip="Hospitals"
          >
            🏥
            <span className="is-drawer-close:hidden">Hospitals</span>
          </NavLink>
        </li>

        <li>
          <NavLink
            to="/admin/ahus"
            className={`${linkClass} is-drawer-close:tooltip is-drawer-close:tooltip-right`}
            data-tip="AHUs"
          >
            🌀
            <span className="is-drawer-close:hidden">AHUs</span>
          </NavLink>
        </li>

        <li>
          <NavLink
            to="/admin/jobs"
            className={`${linkClass} is-drawer-close:tooltip is-drawer-close:tooltip-right`}
            data-tip="Jobs"
          >
            📋
            <span className="is-drawer-close:hidden">Jobs</span>
          </NavLink>
        </li>

        <li>
          <NavLink
            to="/admin/signoffs"
            className={`${linkClass} is-drawer-close:tooltip is-drawer-close:tooltip-right`}
            data-tip="Signed Off Forms"
          >
            📝
            <span className="is-drawer-close:hidden">Signed Off</span>
          </NavLink>
        </li>
      </ul>

      {/* Footer */}
      <div className="p-2 border-t border-base-300">
        <button
          className="
            btn btn-ghost btn-sm w-full justify-start
            is-drawer-close:tooltip is-drawer-close:tooltip-right
          "
          data-tip="Back to Technician App"
          onClick={() => navigate("/Home")}
        >
          ⬅
          <span className="is-drawer-close:hidden ml-2">
            Back to Technician App
          </span>
        </button>
      </div>
    </aside>
  );
}

export default AdminSidebar;
