import React, { useEffect, useState, useRef } from "react";
import { API } from "../../api/api";

export default function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const ref = useRef();

  const fetchNotifs = async () => {
    try {
      const res = await API.get("/admin/notifications");
      setNotifs(res.data || []);
    } catch (e) {
      console.error("Failed to load notifications", e);
    }
  };

  useEffect(() => {
    const onClick = (ev) => {
      if (ref.current && !ref.current.contains(ev.target)) setOpen(false);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    // initial load
    fetchNotifs();
    // refresh every 60s
    const id = setInterval(fetchNotifs, 60000);
    return () => clearInterval(id);
  }, []);

  const pendingCount = notifs.filter((n) => n.status === "pending").length;

  const updateStatus = async (id, status) => {
    try {
      const tech = JSON.parse(localStorage.getItem("tech") || "null") || {};
      await API.post(`/admin/notifications/${id}/status`, {
        status,
        resolved_by: tech.name || null,
      });
      await fetchNotifs();
    } catch (e) {
      console.error("Failed to update notification", e);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        className="btn btn-ghost btn-square"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((s) => {
            const next = !s;
            if (next) fetchNotifs();
            return next;
          });
        }}
        aria-label="Notifications"
      >
        🔔
        {pendingCount > 0 && (
          <span className="badge badge-secondary ml-1">{pendingCount}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-base-100 border border-base-300 rounded shadow-lg z-50">
          <div className="p-2 border-b border-base-300 font-semibold">Notifications</div>
          <div className="max-h-72 overflow-auto">
            {notifs.length === 0 && (
              <div className="p-3 text-sm text-muted">No notifications</div>
            )}

            {notifs.map((n) => (
              <div key={n.id} className="p-3 border-b border-base-200 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <strong>{n.hospital_name || "Unknown Hospital"}</strong>
                    {n.ahu_name && <span className="ml-2 text-xs">{n.ahu_name}</span>}
                  </div>
                  <div className="text-xs text-muted">{n.technician_name || ""}</div>
                </div>
                <div className="text-sm">{n.comment_text}</div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-muted">{n.created_at}</div>
                  <div className="ml-auto flex gap-2">
                    {n.status !== "completed" ? (
                      <button
                        className="btn btn-xs btn-success"
                        onClick={() => updateStatus(n.id, "completed")}
                      >
                        Mark Completed
                      </button>
                    ) : (
                      <button
                        className="btn btn-xs btn-outline"
                        onClick={() => updateStatus(n.id, "pending")}
                      >
                        Mark Pending
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
