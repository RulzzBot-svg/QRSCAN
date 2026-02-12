import { Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import AdminSidebar from "./AdminSidebar";

export default function AdminLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const techStr = localStorage.getItem("tech");
    if (!techStr) {
      navigate("/");
      return;
    }

    // Check if user has admin role
    try {
      const tech = JSON.parse(techStr);
      if (tech.role !== "admin") {
        // Redirect non-admin users to home
        alert("Access denied. Admin privileges required.");
        navigate("/Home");
        return;
      }
    } catch (e) {
      console.error("Error parsing tech data:", e);
      navigate("/");
      return;
    }
  }, [navigate]);

  return (
    <div data-theme="corporate" className="drawer lg:drawer-open min-h-screen">
      {/* Toggle */}
      <input id="admin-drawer" type="checkbox" className="drawer-toggle" />

      {/* Main content */}
      <div className="drawer-content flex flex-col bg-base-200">
        {/* Top navbar */}
        <div className="navbar bg-base-100 border-b border-base-300">
          <div className="flex-none">
            <label
              htmlFor="admin-drawer"
              className="btn btn-square btn-ghost"
              aria-label="Toggle sidebar"
            >
              {/* Toggle icon */}
              <svg
                className="size-5 transition-transform duration-300 is-drawer-open:rotate-180"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </label>
          </div>

          <div className="flex-1 font-bold text-primary">
            AFC Admin
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>

      {/* Sidebar */}
      <div className="drawer-side is-drawer-close:overflow-visible">
        <label htmlFor="admin-drawer" className="drawer-overlay" />
        <AdminSidebar />
      </div>
    </div>
  );
}
