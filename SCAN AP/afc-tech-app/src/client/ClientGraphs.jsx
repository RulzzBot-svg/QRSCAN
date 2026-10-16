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

const PART_COLORS = [
  "#0a4d8c",
  "#15803d",
  "#7c3aed",
  "#c2410c",
  "#0f766e",
  "#a16207",
  "#be185d",
  "#0369a1",
  "#4338ca",
  "#b45309",
  "#64748b",
];

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

  const services = (data.services || data.visits || []).map((v) => ({
    month: (v.month || "").slice(5),
    Completed: v.completed ?? v.jobs ?? 0,
    Scheduled: v.scheduled ?? 0,
  }));

  const parts = (data.by_part || []).map((row, i) => ({
    name: row.part_number,
    value: row.quantity,
    color: PART_COLORS[i % PART_COLORS.length],
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

        <ChartCard title="Completed and scheduled">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={services} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Completed" stackId="s" fill="#0a4d8c" />
              <Bar dataKey="Scheduled" stackId="s" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Part numbers">
          {parts.length === 0 ? (
            <p className="text-sm text-base-content/50 py-16 text-center">No part numbers yet.</p>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 min-h-[240px]">
              <div className="flex-1 min-w-0 h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={parts} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80}>
                      {parts.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value} qty`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <TypeLegend items={parts} />
            </div>
          )}
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

function TypeLegend({ items }) {
  return (
    <ul className="js-graph-legend shrink-0 space-y-2.5 text-sm min-w-[9.5rem] max-w-[12.5rem] max-h-[220px] overflow-y-auto px-1">
      {items.map((row) => (
        <li key={row.name} className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ background: row.color }}
          />
          <span className="flex-1 leading-tight break-all" title={row.name}>
            {row.name}
          </span>
          <span className="font-semibold tabular-nums">{row.value}</span>
        </li>
      ))}
    </ul>
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
