import React, { useEffect, useState, useRef } from "react";
import { API } from "../../api/api";

const SEVERITY_CLASSES = {
  critical: "alert-critical",
  warning: "alert-warning",
  info: "alert-info",
  success: "alert-success",
};

export default function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [filter, setFilter] = useState("all");
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

  const counts = notifs.reduce(
    (acc, n) => {
      const s = severityOf(n);
      acc[s] = (acc[s] || 0) + 1;
      if (n.status === "pending") acc.pending += 1;
      return acc;
    },
    { critical: 0, warning: 0, info: 0, success: 0, pending: 0 }
  );

  const visible = notifs.filter((n) => {
    if (filter === "all") return true;
    return severityOf(n) === filter;
  });

  const timeAgo = (iso) => {
    try {
      const d = new Date(iso);
      const diff = Math.floor((Date.now() - d.getTime()) / 1000);
      if (diff < 60) return `${diff}s ago`;
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return `${Math.floor(diff / 86400)}d ago`;
    } catch (e) {
      return "";
    }
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
    <div className="relative" ref={ref}>
      <style>{`
        :root{--primary:#2c3e50;--warning:#f39c12;--danger:#e74c3c;--info:#3498db;--success:#27ae60;--light:#f5f7fa;--shadow:rgba(0,0,0,0.08);--radius:8px}
        .nd-panel{width:380px;background:#fff;border-radius:10px;box-shadow:0 6px 24px var(--shadow);overflow:hidden;font-family:Inter, system-ui, Arial}
        .nd-header{background:var(--primary);color:#fff;padding:12px 14px;display:flex;justify-content:space-between;align-items:center}
        .nd-title{font-size:14px;font-weight:600}
        .nd-filters{display:flex;gap:8px}
        .nd-filter-btn{background:rgba(255,255,255,0.12);border:none;color:#fff;padding:6px 10px;border-radius:6px;font-size:12px;cursor:pointer}
        .nd-filter-btn.active{background:rgba(255,255,255,0.22)}
        .nd-summary{display:flex;gap:12px;padding:10px 14px;background:#fafafa;border-bottom:1px solid rgba(0,0,0,0.04)}
        .nd-summary .item{display:flex;align-items:center;gap:8px;font-size:13px}
        .nd-summary .count{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700}
        .critical-count{background:rgba(231,76,60,0.12);color:var(--danger)}
        .warning-count{background:rgba(243,156,18,0.12);color:var(--warning)}
        .info-count{background:rgba(52,152,219,0.12);color:var(--info)}
        .nd-list{max-height:320px;overflow:auto}
        .alert{padding:12px 14px;border-bottom:1px solid rgba(0,0,0,0.04);display:flex;gap:12px;align-items:flex-start}
        .alert-icon{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .alert-content{flex:1}
        .alert-title{display:flex;justify-content:space-between;align-items:center;font-weight:600;margin-bottom:6px}
        .alert-message{font-size:13px;color:#444}
        .alert-time{font-size:12px;color:#8b98a6}
        .alert-actions{margin-top:8px;display:flex;gap:8px}
        .btn-nd{padding:6px 10px;border-radius:6px;border:0;background:#f3f4f6;cursor:pointer}
        .btn-nd.primary{background:#fff;color:var(--primary);border:1px solid rgba(0,0,0,0.04)}
        .alert-dismiss{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#9aa6b2}
        .alert-critical .alert-icon{background:rgba(231,76,60,0.08);color:var(--danger)}
        .alert-warning .alert-icon{background:rgba(243,156,18,0.07);color:var(--warning)}
        .alert-info .alert-icon{background:rgba(52,152,219,0.08);color:var(--info)}
        .alert-success .alert-icon{background:rgba(39,174,96,0.08);color:var(--success)}
      `}</style>

      <button
        className="btn btn-ghost btn-square"
        onClick={(e) => {
          e.stopPropagation();
          const next = !open;
          setOpen(next);
          if (next) fetchNotifs();
        }}
        aria-label="Notifications"
      >
        {counts.pending > 0 && (
          <span className="badge badge-secondary mr-1">{counts.pending}</span>
        )}
        🔔
      </button>

      {open && (
        <div className="absolute right-0 mt-2 nd-panel z-50">
          <div className="nd-header">
            <div className="nd-title">System Notifications</div>
            <div className="nd-filters">
              {[["all","All"],["critical","Critical"],["warning","Warning"],["info","Info"]].map(([key,label])=>(
                <button key={key} className={`nd-filter-btn ${filter===key?"active":""}`} onClick={()=>setFilter(key)}>{label}</button>
              ))}
            </div>
          </div>

          <div className="nd-summary">
            <div className="item"><div className="count critical-count">{counts.critical}</div><div>Critical</div></div>
            <div className="item"><div className="count warning-count">{counts.warning}</div><div>Warning</div></div>
            <div className="item"><div className="count info-count">{counts.info}</div><div>Info</div></div>
          </div>

          <div className="nd-list">
            {visible.length === 0 && (
              <div style={{padding:24,textAlign:'center',color:'#95a5a6'}}>All clear! No notifications to display.</div>
            )}

            {visible.map((n) => {
              const sev = severityOf(n);
              const cls = SEVERITY_CLASSES[sev] || "alert-info";
              return (
                <div key={n.id} className={`alert ${cls}`}>
                  <div className="alert-icon">
                    {sev === 'critical' ? '⚠️' : sev === 'warning' ? '🟠' : sev === 'info' ? 'ℹ️' : '✅'}
                  </div>
                  <div className="alert-content">
                    <div className="alert-title">
                      <div style={{display:'flex',gap:8,alignItems:'center'}}>
                        <strong style={{fontSize:13}}>{n.hospital_name || n.title || 'Notification'}</strong>
                        {n.ahu_name && <span style={{fontSize:12,color:'#7e8a95'}}>{n.ahu_name}</span>}
                      </div>
                      <div style={{fontSize:12,color:'#7e8a95'}}>{timeAgo(n.created_at)}</div>
                    </div>
                    <div className="alert-message">{n.comment_text}</div>
                    <div className="alert-actions">
                      {n.status !== 'completed' && (
                        <button className="btn-nd primary" onClick={()=>updateStatus(n.id,'completed')}>Mark Completed</button>
                      )}
                      <button className="btn-nd" onClick={()=>updateStatus(n.id,'dismissed')}>Dismiss</button>
                    </div>
                  </div>
                  <div className="alert-dismiss" title="Dismiss" onClick={()=>updateStatus(n.id,'dismissed')}>✖</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
