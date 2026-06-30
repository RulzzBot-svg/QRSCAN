import { Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import AdminSidebar from "./AdminSidebar";
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
    <div data-theme="corporate" className="min-h-screen flex">
      {/* Sidebar (always visible) */}
      <AdminSidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col bg-base-200">
        {/* Top navbar */}
        <div className="navbar bg-base-100 border-b border-base-300">
          <div className="flex-1" />
          <div className="flex-none">
            <NotificationsDropdown />
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
