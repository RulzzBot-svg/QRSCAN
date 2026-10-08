import { AFC_COMPANY_NAME, DEFAULT_AFC_LOGO_PATH } from "../utils/qrLabels";
import { prettyDate } from "./format";
import { printHtmlDocument } from "./printHtml";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function groupByBuilding(ahus) {
  const groups = [];
  const index = new Map();
  for (const ahu of ahus || []) {
    const name = ahu.building || "Unassigned";
    if (!index.has(name)) {
      index.set(name, groups.length);
      groups.push({ building: name, units: [] });
    }
    groups[index.get(name)].units.push(ahu);
  }
  return groups;
}

function statusLabel(status) {
  if (status === "Completed") return "On schedule";
  return status || "Pending";
}

export function exportInspectionPdf({ hospitalName, summary, ahus }) {
  const when = new Date().toLocaleString();
  const hospital = hospitalName || "Hospital";
  const logoSrc = `${window.location.origin}${DEFAULT_AFC_LOGO_PATH}`;
  const groups = groupByBuilding(ahus);
  const kpis = [
    ["AHUs", summary?.ahus ?? (ahus || []).length],
    ["On schedule", summary?.compliant ?? "—"],
    ["Due soon", summary?.due_soon ?? "—"],
    ["Overdue", summary?.overdue ?? "—"],
  ];

  const tables = groups
    .map((group) => {
      const rows = group.units
        .map(
          (a) => `<tr>
            <td>${escapeHtml(a.name)}</td>
            <td>${escapeHtml(a.location || "—")}</td>
            <td>${escapeHtml(prettyDate(a.last_service_date))}</td>
            <td>${escapeHtml(prettyDate(a.next_due_date))}</td>
            <td>${escapeHtml(statusLabel(a.status))}</td>
          </tr>`
        )
        .join("");
      return `<section class="building">
        <h2>${escapeHtml(group.building)}</h2>
        <table>
          <thead>
            <tr>
              <th>AHU</th>
              <th>Location</th>
              <th>Last serviced</th>
              <th>Next due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </section>`;
    })
    .join("");

  printHtmlDocument(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(hospital)} — inspection snapshot</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; color: #0b1f33; margin: 28px; }
    .header { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #0a4d8c; padding-bottom: 12px; margin-bottom: 18px; }
    .header img { height: 48px; width: auto; }
    .brand { font-size: 11px; letter-spacing: 0.12em; color: #0a4d8c; font-weight: 700; }
    h1 { font-size: 20px; margin: 2px 0 0; }
    .sub { font-size: 12px; color: #4b6278; margin-top: 2px; }
    .note { font-size: 11px; color: #4b6278; margin: 0 0 16px; }
    .kpis { display: flex; flex-wrap: wrap; gap: 10px; margin: 12px 0 22px; }
    .kpi { border: 1px solid #d4e1ea; border-radius: 8px; padding: 8px 12px; min-width: 110px; }
    .kpi span { display: block; font-size: 11px; color: #4b6278; }
    .kpi strong { font-size: 18px; color: #0a4d8c; }
    h2 { font-size: 14px; margin: 18px 0 8px; color: #0a4d8c; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e6eef4; }
    th { font-size: 11px; color: #4b6278; font-weight: 700; }
    .building { break-inside: avoid; }
    @media print {
      body { margin: 16px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="${escapeHtml(logoSrc)}" alt="AFC" onerror="this.style.display='none'" />
    <div>
      <div class="brand">${escapeHtml(AFC_COMPANY_NAME)}</div>
      <h1>${escapeHtml(hospital)}</h1>
      <div class="sub">Filter status snapshot · ${escapeHtml(when)}</div>
    </div>
  </div>
  <p class="note">Inspection copy for Joint Commission / walk-throughs. Filter status and due dates only — no prices, invoices, part numbers, or job notes.</p>
  <div class="kpis">
    ${kpis
      .map(
        ([label, value]) =>
          `<div class="kpi"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`
      )
      .join("")}
  </div>
  ${tables || "<p class='note'>No units on file for this hospital.</p>"}
</body>
</html>`);
}

export function groupAhusByBuilding(ahus) {
  return groupByBuilding(ahus);
}
