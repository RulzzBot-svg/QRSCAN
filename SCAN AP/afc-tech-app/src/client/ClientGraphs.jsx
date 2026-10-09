import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getClientGraphs, readClientUser } from "./api";
import { exportClientGraphsPdf } from "./exportGraphsPdf";

const STATUS_COLORS = {
  compliant: "#15803d",
  due_soon: "#d97706",
  overdue: "#dc2626",
  pending: "#64748b",
};

export default function ClientGraphs() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const chartsRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    getClientGraphs()
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.error || "Could not load graphs");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }
  if (error) return <div className="alert alert-error text-sm">{error}</div>;
  if (!data) return null;

  const pie = [
    { name: "On schedule", value: data.summary.compliant || 0, color: STATUS_COLORS.compliant },
    { name: "Due soon", value: data.summary.due_soon || 0, color: STATUS_COLORS.due_soon },
    { name: "Overdue", value: data.summary.overdue || 0, color: STATUS_COLORS.overdue },
    { name: "Pending", value: data.summary.pending || 0, color: STATUS_COLORS.pending },
  ].filter((d) => d.value > 0);

  const buildings = (data.by_building || []).map((b) => ({
    name: b.name.length > 14 ? `${b.name.slice(0, 14)}…` : b.name,
    Compliant: b.compliant,
    "Due soon": b.due_soon,
    Overdue: b.overdue,
  }));

  const visits = (data.visits || []).map((v) => ({
    month: v.month.slice(5),
    Visits: v.jobs,
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Graphs</h2>
          <p className="text-sm text-base-content/60">This hospital only. Counts, not dollars.</p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm shrink-0"
          onClick={() =>
            exportClientGraphsPdf({
              hospitalName: readClientUser()?.hospital_name,
              summary: data.summary,
              frequencies: data.by_frequency,
              chartsRoot: chartsRef.current,
            })
          }
        >
          Export graphs PDF
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="AHUs" value={data.summary.ahus} />
        <Kpi label="Filters" value={data.summary.filters} />
        <Kpi label="Due in 30 days" value={data.upcoming?.[0]?.filters || 0} />
        <Kpi label="Due in 90 days" value={data.upcoming?.[2]?.filters || 0} />
      </div>

      <div ref={chartsRef} className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="AHU status">
          {pie.length === 0 ? (
            <p className="text-sm text-base-content/50 py-16 text-center">No unit status yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80}>
                  {pie.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Buildings">
          {buildings.length === 0 ? (
            <p className="text-sm text-base-content/50 py-16 text-center">No buildings to chart.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={buildings} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Compliant" stackId="a" fill={STATUS_COLORS.compliant} />
                <Bar dataKey="Due soon" stackId="a" fill={STATUS_COLORS.due_soon} />
                <Bar dataKey="Overdue" stackId="a" fill={STATUS_COLORS.overdue} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Service visits by month">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={visits} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="Visits" fill="#0a4d8c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Filter frequencies">
          <div className="space-y-2 js-graph-list">
            {(data.by_frequency || []).map((row) => (
              <div key={row.days} className="flex items-center justify-between text-sm">
                <span>{row.label}</span>
                <span className="font-semibold tabular-nums">{row.count}</span>
              </div>
            ))}
            {(data.by_frequency || []).length === 0 ? (
              <p className="text-sm text-base-content/50">No filter rows yet.</p>
            ) : null}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="js-graph-card rounded-2xl bg-base-100 border border-base-300 p-4">
      <h3 className="font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="rounded-2xl bg-base-100 border border-base-300 p-4">
      <p className="text-xs text-base-content/50">{label}</p>
      <p className="text-2xl font-bold tabular-nums text-primary">{value}</p>
    </div>
  );
}
