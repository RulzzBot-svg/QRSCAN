import { Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import AdminSidebar, { AdminBottomNav } from "./AdminSidebar";
import NotificationsDropdown from "./NotificationsDropdown";
import { hasAuthToken } from "../../api/api";

export default function AdminLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!hasAuthToken()) {
      navigate("/");
      return;
    }

    const techStr = localStorage.getItem("tech");
    if (!techStr) {
      navigate("/");
      return;
    }

    try {
      const tech = JSON.parse(techStr);
      if (tech.role !== "admin") {
        alert("Access denied. Admin privileges required.");
        navigate("/Home");
      }
    } catch (e) {
      console.error("Error parsing tech data:", e);
      navigate("/");
    }
  }, [navigate]);

  return (
    <div data-theme="corporate" className="drawer lg:drawer-open min-h-dvh">
      <input id="admin-drawer" type="checkbox" className="drawer-toggle" />

      <div className="drawer-content flex flex-col min-h-dvh min-w-0 bg-base-200">
        <header className="navbar min-h-12 bg-base-100 border-b border-base-300 px-2 lg:px-4 sticky top-0 z-20">
          <div className="flex-none lg:hidden">
            <label htmlFor="admin-drawer" className="btn btn-ghost btn-square btn-sm" aria-label="Open menu">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </label>
          </div>
          <div className="flex-1 lg:hidden font-bold text-primary text-sm">AFC Admin</div>
          <div className="flex-1 hidden lg:block" />
          <div className="flex-none">
            <NotificationsDropdown />
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-4 lg:p-6 pb-24 lg:pb-6 overflow-x-hidden">
          <Outlet />
        </main>

        <AdminBottomNav />
      </div>

      <div className="drawer-side z-40">
        <label htmlFor="admin-drawer" aria-label="close sidebar" className="drawer-overlay" />
        <AdminSidebar />
      </div>
    </div>
  );
}
