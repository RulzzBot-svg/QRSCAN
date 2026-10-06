import { AFC_COMPANY_NAME, DEFAULT_AFC_LOGO_PATH } from "../utils/qrLabels";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function serializeCharts(root) {
  if (!root) return [];
  return [...root.querySelectorAll(".js-graph-card")].map((card) => {
    const title = card.querySelector("h3")?.textContent || "Chart";
    const svg = card.querySelector("svg");
    return {
      title,
      svg: svg ? svg.outerHTML : "",
    };
  });
}

export function exportClientGraphsPdf({ hospitalName, summary, frequencies, chartsRoot }) {
  const charts = serializeCharts(chartsRoot);
  const when = new Date().toLocaleString();
  const hospital = hospitalName || "Hospital";
  const logoSrc = `${window.location.origin}${DEFAULT_AFC_LOGO_PATH}`;
  const kpis = [
    ["AHUs", summary?.ahus ?? "—"],
    ["Filters", summary?.filters ?? "—"],
    ["On schedule", summary?.compliant ?? "—"],
    ["Due soon", summary?.due_soon ?? "—"],
    ["Overdue", summary?.overdue ?? "—"],
  ];

  const win = window.open("", "_blank", "noopener,noreferrer,width=1024,height=768");
  if (!win) {
    alert("Allow pop-ups to export the PDF.");
    return;
  }

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(hospital)} — AFC graphs</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; color: #0b1f33; margin: 28px; }
    .header { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #0a4d8c; padding-bottom: 12px; margin-bottom: 18px; }
    .header img { height: 48px; width: auto; }
    .brand { font-size: 11px; letter-spacing: 0.12em; color: #0a4d8c; font-weight: 700; }
    h1 { font-size: 20px; margin: 2px 0 0; }
    .sub { font-size: 12px; color: #4b6278; margin-top: 2px; }
    .kpis { display: flex; flex-wrap: wrap; gap: 10px; margin: 16px 0 22px; }
    .kpi { border: 1px solid #d4e1ea; border-radius: 8px; padding: 8px 12px; min-width: 110px; }
    .kpi span { display: block; font-size: 11px; color: #4b6278; }
    .kpi strong { font-size: 18px; color: #0a4d8c; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .card { border: 1px solid #d4e1ea; border-radius: 10px; padding: 12px; break-inside: avoid; }
    .card h3 { margin: 0 0 10px; font-size: 14px; }
    .card svg { width: 100%; height: 220px; }
    .list-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; border-bottom: 1px solid #eef4f8; }
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
      <div class="sub">Filter status graphs · ${escapeHtml(when)}</div>
    </div>
  </div>
  <div class="kpis">
    ${kpis
      .map(
        ([label, value]) =>
          `<div class="kpi"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`
      )
      .join("")}
  </div>
  <div class="grid">
    ${charts
      .map((c) => {
        const body = c.svg
          ? c.svg
          : c.title === "Filter frequencies"
            ? (frequencies || [])
                .map(
                  (row) =>
                    `<div class="list-row"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.count)}</strong></div>`
                )
                .join("") || "<div class='sub'>No filter rows yet.</div>"
            : "<div class='sub'>No chart for this section.</div>";
        return `<div class="card"><h3>${escapeHtml(c.title)}</h3>${body}</div>`;
      })
      .join("")}
  </div>
  <script>
    window.addEventListener("load", function () {
      setTimeout(function () { window.print(); }, 400);
    });
  </script>
</body>
</html>`);
  win.document.close();
}
