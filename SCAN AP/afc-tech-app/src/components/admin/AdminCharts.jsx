import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Colors ordered to match legend: Compliant (green), Due Soon (amber), Overdue (red)
const COLORS = ["#34d399", "#f59e0b", "#ef4444"];

function AdminCharts({ hospitalRows = [], stats = {} }) {
  // Prepare stacked bar data (top hospitals)
  const top = hospitalRows.slice(0, 8);
  const barData = top.map((h) => ({
    name: h.name.length > 12 ? h.name.slice(0, 12) + ".." : h.name,
    Overdue: h.overdue || 0,
    DueSoon: h.dueSoon || 0,
    Compliant: h.compliant || 0,
  }));

  // Order pieData to match legend and colors: Compliant, Due Soon, Overdue
  const pieData = [
    { name: "Compliant", value: stats.compliant || 0 },
    { name: "Due Soon", value: stats.dueSoon || 0 },
    { name: "Overdue", value: stats.overdue || 0 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="col-span-2 bg-base-100 border border-base-300 rounded-lg p-4 shadow-sm">
        <h3 className="text-md font-semibold mb-2">Hospital Status (top hospitals)</h3>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={barData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Compliant" stackId="a" fill="#34d399" />
              <Bar dataKey="DueSoon" stackId="a" fill="#f59e0b" />
              <Bar dataKey="Overdue" stackId="a" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-base-100 border border-base-300 rounded-lg p-4 shadow-sm">
        <h3 className="text-md font-semibold mb-2">Overall Compliance</h3>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} label>
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 text-sm text-base-content/60">
          <div>
            <strong>{stats.ahus || 0}</strong> total AHUs
          </div>
          <div className="mt-1">
            <span className="inline-block w-3 h-3 bg-emerald-400 mr-2 align-middle rounded-sm" /> Compliant
          </div>
          <div className="mt-1">
            <span className="inline-block w-3 h-3 bg-amber-400 mr-2 align-middle rounded-sm" /> Due Soon
          </div>
          <div className="mt-1">
            <span className="inline-block w-3 h-3 bg-red-500 mr-2 align-middle rounded-sm" /> Overdue
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminCharts;
