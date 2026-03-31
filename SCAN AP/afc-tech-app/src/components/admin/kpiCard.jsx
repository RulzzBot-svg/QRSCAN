function KpiCard({ title, value, subtitle, color = "primary" }) {
  const colorMap = {
    primary: "text-primary",
    success: "text-success",
    warning: "text-amber-500",
    error: "text-error",
  };

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body p-4">
        <div className="text-sm text-base-content/60">{title}</div>

        <div className={`text-3xl font-bold ${colorMap[color] || "text-primary"}`}>
          {value}
        </div>

        {subtitle && <div className="text-xs text-base-content/50 mt-1">{subtitle}</div>}
      </div>
    </div>
  );
}

export default KpiCard;
