import { AFC_COMPANY_NAME, DEFAULT_AFC_LOGO_PATH } from "../utils/qrLabels";
import { printHtmlDocument } from "./printHtml";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function exportTechnicalDatasheet(sheet) {
  const hospital = sheet?.hospital || "Hospital";
  const when = new Date().toLocaleString();
  const logoSrc = `${window.location.origin}${DEFAULT_AFC_LOGO_PATH}`;
  const buildings = sheet?.buildings || [];

  const sections = buildings
    .map((group) => {
      const units = (group.units || [])
        .map((u) => {
          const filters = (u.filters || [])
            .map(
              (f) =>
                `<tr><td>${escapeHtml(f.phase || "Filter")}</td><td>${escapeHtml(f.size || "—")}</td><td>${escapeHtml(f.quantity ?? "—")}</td><td>${escapeHtml(f.frequency_label || "—")}</td></tr>`
            )
            .join("");
          return `<div class="unit">
            <h3>${escapeHtml(u.name)} <span>${escapeHtml(u.location || "")}</span></h3>
            <table>
              <thead><tr><th>Stage</th><th>Size</th><th>Qty</th><th>Change frequency</th></tr></thead>
              <tbody>${filters || "<tr><td colspan='4'>No active filters</td></tr>"}</tbody>
            </table>
          </div>`;
        })
        .join("");
      return `<section><h2>${escapeHtml(group.building)}</h2>${units}</section>`;
    })
    .join("");

  printHtmlDocument(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(hospital)} — technical datasheet</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; color: #0b1f33; margin: 28px; }
    .header { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #0a4d8c; padding-bottom: 12px; margin-bottom: 18px; }
    .header img { height: 48px; width: auto; }
    .brand { font-size: 11px; letter-spacing: 0.12em; color: #0a4d8c; font-weight: 700; }
    h1 { font-size: 20px; margin: 2px 0 0; }
    .sub, .note { font-size: 12px; color: #4b6278; }
    h2 { font-size: 15px; color: #0a4d8c; margin: 20px 0 8px; }
    h3 { font-size: 13px; margin: 12px 0 6px; }
    h3 span { font-weight: 400; color: #4b6278; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 10px; }
    th, td { text-align: left; padding: 5px 8px; border-bottom: 1px solid #e6eef4; }
    .unit { break-inside: avoid; }
  </style>
</head>
<body>
  <div class="header">
    <img src="${escapeHtml(logoSrc)}" alt="AFC" onerror="this.style.display='none'" />
    <div>
      <div class="brand">${escapeHtml(AFC_COMPANY_NAME)}</div>
      <h1>${escapeHtml(hospital)} technical datasheet</h1>
      <div class="sub">${escapeHtml(sheet?.city || "")} · ${escapeHtml(when)}</div>
    </div>
  </div>
  <p class="note">Filter stages, sizes, quantities, and change frequencies for this hospital only. Catalog part numbers, prices, invoices, GPS, and technician names are not included.</p>
  ${sections || "<p class='note'>No units on file.</p>"}
</body>
</html>`);
}

export function exportItBrief({ hospitalName }) {
  const hospital = hospitalName || "Hospital";
  const when = new Date().toLocaleString();
  const logoSrc = `${window.location.origin}${DEFAULT_AFC_LOGO_PATH}`;
  printHtmlDocument(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(hospital)} — AFC portal IT brief</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; color: #0b1f33; margin: 28px; max-width: 720px; }
    .brand { font-size: 11px; letter-spacing: 0.12em; color: #0a4d8c; font-weight: 700; }
    h1 { font-size: 20px; }
    h2 { font-size: 14px; color: #0a4d8c; margin-top: 22px; }
    p, li { font-size: 13px; line-height: 1.45; color: #24384a; }
    .header img { height: 44px; }
  </style>
</head>
<body>
  <div class="header">
    <img src="${escapeHtml(logoSrc)}" alt="AFC" onerror="this.style.display='none'" />
    <div class="brand">${escapeHtml(AFC_COMPANY_NAME)}</div>
    <h1>Hospital portal — information for IT</h1>
    <p>${escapeHtml(hospital)} · ${escapeHtml(when)}</p>
  </div>
  <h2>What this system is</h2>
  <p>AFC’s hospital portal is a read-only website (and optional home-screen app) that shows filter status for <strong>this hospital only</strong>. It is not a work-order system. Hospital users cannot add, edit, or delete air-handler or filter records.</p>
  <h2>Accounts</h2>
  <ul>
    <li><strong>Director</strong> — dashboard, graphs, inspection PDF, technical datasheet, contact AFC, how-to, and unit/scan views.</li>
    <li><strong>Hospital technician</strong> — camera scan and unit list only, plus the how-to page. No graphs, exports, or contact form.</li>
  </ul>
  <p>Logins use a username and PIN issued by AFC. Sessions expire automatically. A director login cannot see another hospital. A hospital technician login cannot use director tools.</p>
  <h2>Data shown</h2>
  <ul>
    <li>AHU name, building, location</li>
    <li>Filter stage, size, quantity, change frequency</li>
    <li>Last serviced / next due / on-schedule, due soon, or overdue</li>
    <li>Read-only comments when an AFC technician recorded why a filter was not replaced</li>
  </ul>
  <h2>Data not shown and not writable</h2>
  <ul>
    <li>No prices, invoices, purchase orders, or catalog part numbers</li>
    <li>No GPS, AFC technician names, or internal job files</li>
    <li>No passwords or AFC admin tools</li>
    <li>Logged-out QR stickers show status only — they cannot change anything</li>
  </ul>
  <h2>Access and hosting</h2>
  <ul>
    <li>HTTPS web app; optional Add to Home Screen (PWA) scoped to the portal</li>
    <li>Hospital-scoped API; technician and admin APIs reject portal tokens</li>
    <li>Login and public sticker requests are rate-limited</li>
    <li>No protected health information is stored in this portal</li>
  </ul>
  <p>Questions: call AFC at 323.832.8316.</p>
</body>
</html>`);
}
