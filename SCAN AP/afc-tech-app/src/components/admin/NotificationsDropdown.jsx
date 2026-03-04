import React, { useEffect, useState, useRef } from "react";
import { API } from "../../api/api";

const SEVERITY_CONFIG = {
  critical: { color: "bg-red-500", icon: "⚠️", bg: "bg-red-50", border: "border-red-100" },
  warning: { color: "bg-amber-500", icon: "🟠", bg: "bg-amber-50", border: "border-amber-100" },
  info: { color: "bg-blue-500", icon: "ℹ️", bg: "bg-blue-50", border: "border-blue-100" },
  success: { color: "bg-emerald-500", icon: "✅", bg: "bg-emerald-50", border: "border-emerald-100" },
};

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
    fetchNotifs();
    const id = setInterval(fetchNotifs, 5000);
    const onJobCreated = () => fetchNotifs();
    window.addEventListener("jobCreated", onJobCreated);
    return () => {
      clearInterval(id);
      window.removeEventListener("jobCreated", onJobCreated);
    };
  }, []);

  const severityOf = (n) => {
    return (n.level || n.type || n.severity || "info").toLowerCase();
  };

  const pendingCount = notifs.filter(n => n.status === "pending").length;

  const timeAgo = (iso) => {
    try {
      const d = new Date(iso);
      const diff = Math.floor((Date.now() - d.getTime()) / 1000);
      if (diff < 60) return `${diff}s ago`;
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return `${Math.floor(diff / 86400)}d ago`;
    } catch (e) { return ""; }
  };

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
    <div className="relative inline-block" ref={ref}>
      {/* Trigger Button */}
      <button
        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
          if (!open) fetchNotifs();
        }}
      >
        <span className="text-xl">🔔</span>
        {pendingCount > 0 && (
          <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white">
            {pendingCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-3 w-[400px] bg-white rounded-xl shadow-2xl  z-50 overflow-hidden">
          {/* Simple Header */}
          <div className="bg-sky-300 px-4 py-4">
            <h3 className="text-white font-bold text-base">System Notifications</h3>
          </div>

          {/* List Section */}
          <div className="max-h-[480px] overflow-y-auto bg-gray-50/50 p-3 space-y-3">
            {notifs.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-gray-400 font-medium font-inter">All clear! No alerts.</p>
              </div>
            ) : (
              notifs.map((n) => {
                const sev = severityOf(n);
                const config = SEVERITY_CONFIG[sev] || SEVERITY_CONFIG.info;
                return (
                  <div key={n.id} className={`relative bg-white border ${config.border} rounded-xl shadow-sm group transition-all`}>
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.color} rounded-l-xl`} />
                    
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full ${config.bg} flex items-center justify-center text-lg`}>
                          {config.icon}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 truncate">
                              <h4 className="text-sm font-bold text-gray-900 truncate">
                                {n.hospital_name || n.title || 'System Alert'}
                              </h4>
                              {n.ahu_name && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 uppercase">
                                  {n.ahu_name}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap ml-2">
                              {timeAgo(n.created_at)}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-600 leading-relaxed mb-4">
                            {n.comment_text}
                          </p>
                          
                          <div className="flex gap-2">
                            {n.status !== 'completed' && (
                              <button 
                                onClick={() => updateStatus(n.id, 'completed')}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                              >
                                Mark Completed
                              </button>
                            )}
                            <button 
                              onClick={() => updateStatus(n.id, 'dismissed')}
                              className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-bold rounded-lg transition-colors"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>

                        <button 
                          onClick={() => updateStatus(n.id, 'dismissed')}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-300 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}