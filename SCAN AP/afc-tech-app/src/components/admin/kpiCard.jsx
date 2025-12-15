function KpiCard({ title, value, subtitle, color = "primary" }) {
  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body p-4">
        <div className="text-sm text-base-content/60">
          {title}
        </div>

        <div className={`text-3xl font-bold text-${color}`}>
          {value}
        </div>

        {subtitle && (
          <div className="text-xs text-base-content/50 mt-1">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

export default KpiCard;
