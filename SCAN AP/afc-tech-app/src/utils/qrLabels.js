/** Build printable AHU QR labels that scan to FilterInfo. */

export const DEFAULT_QR_BASE_URL = "https://qrscan-lyart.vercel.app/FilterInfo";
export const QR_LOGO_STORAGE_KEY = "qrLabelLogo";
export const QR_LAYOUTS = { sheet: "sheet", single: "single" };

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getQrBaseUrl() {
  const fromEnv = String(import.meta.env?.VITE_QR_BASE_URL || "").trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  if (typeof window !== "undefined") {
    const origin = window.location.origin || "";
    if (origin && !/localhost|127\.0\.0\.1/.test(origin)) {
      return `${origin.replace(/\/+$/, "")}/FilterInfo`;
    }
  }

  return DEFAULT_QR_BASE_URL;
}

export function buildFilterInfoUrl(ahuId, baseUrl = getQrBaseUrl()) {
  return `${String(baseUrl).replace(/\/+$/, "")}/${ahuId}`;
}

export function ahuDisplayName(ahu) {
  return ahu?.name || String(ahu?.id ?? "AHU");
}

export function loadStoredQrLogo() {
  try {
    return localStorage.getItem(QR_LOGO_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function storeQrLogo(dataUrl) {
  try {
    if (dataUrl) localStorage.setItem(QR_LOGO_STORAGE_KEY, dataUrl);
    else localStorage.removeItem(QR_LOGO_STORAGE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

export async function fileToLogoDataUrl(file) {
  const raw = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read logo file"));
    reader.readAsDataURL(file);
  });
  if (typeof document === "undefined") return raw;

  const img = await loadImage(raw);
  const canvas = document.createElement("canvas");
  const size = 256;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  const scale = Math.min(size / img.width, size / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  return canvas.toDataURL("image/png");
}

export async function overlayLogoOnQr(qrDataUrl, logoDataUrl, { logoRatio = 0.22 } = {}) {
  if (!logoDataUrl || typeof document === "undefined") return qrDataUrl;
  const qrImg = await loadImage(qrDataUrl);
  const logoImg = await loadImage(logoDataUrl);
  const size = qrImg.width || 280;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(qrImg, 0, 0, size, size);

  const logoSize = Math.round(size * logoRatio);
  const pad = Math.max(4, Math.round(logoSize * 0.12));
  const box = logoSize + pad * 2;
  const x = (size - box) / 2;
  const y = (size - box) / 2;
  const radius = Math.max(6, Math.round(box * 0.12));
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, box, box, radius);
  } else {
    ctx.rect(x, y, box, box);
  }
  ctx.fill();
  ctx.drawImage(logoImg, x + pad, y + pad, logoSize, logoSize);
  return canvas.toDataURL("image/png");
}

export async function generateQrDataUrl(text, { withLogo = false } = {}) {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: withLogo ? "H" : "Q",
    margin: 1,
    width: withLogo ? 360 : 280,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

export async function buildQrLabels(ahus, baseUrlOrOptions = getQrBaseUrl()) {
  const options =
    typeof baseUrlOrOptions === "string"
      ? { baseUrl: baseUrlOrOptions }
      : (baseUrlOrOptions || {});
  const baseUrl = options.baseUrl || getQrBaseUrl();
  const logoDataUrl = options.logoDataUrl || "";
  const labels = [];
  for (const ahu of ahus) {
    const url = buildFilterInfoUrl(ahu.id, baseUrl);
    let qrDataUrl = await generateQrDataUrl(url, { withLogo: Boolean(logoDataUrl) });
    if (logoDataUrl) {
      qrDataUrl = await overlayLogoOnQr(qrDataUrl, logoDataUrl);
    }
    labels.push({
      id: ahu.id,
      name: ahuDisplayName(ahu),
      location: ahu.location || "",
      hospital: ahu.hospital || "",
      building: ahu.building || "",
      url,
      qrDataUrl,
    });
  }
  return labels;
}

export async function applyLogoToLabels(labels, logoDataUrl) {
  if (!logoDataUrl) return labels || [];
  const next = [];
  for (const label of labels || []) {
    const qr = await generateQrDataUrl(label.url, { withLogo: true });
    next.push({
      ...label,
      qrDataUrl: await overlayLogoOnQr(qr, logoDataUrl),
    });
  }
  return next;
}

function labelCardHtml(label) {
  const meta = [label.hospital, label.building].filter(Boolean).join(" · ");
  return `
    <article class="label">
      <img src="${label.qrDataUrl}" alt="QR for ${escapeHtml(label.name)}" />
      ${meta ? `<div class="meta">${escapeHtml(meta)}</div>` : ""}
      <div class="name">${escapeHtml(label.name)}</div>
      ${label.location ? `<div class="location">${escapeHtml(label.location)}</div>` : ""}
      <div class="id">ID ${escapeHtml(label.id)}</div>
    </article>
  `;
}

export function buildQrPrintDocument(labels, title = "AHU QR Labels", options = {}) {
  const layout = options.layout === QR_LAYOUTS.single ? QR_LAYOUTS.single : QR_LAYOUTS.sheet;
  const cards = labels.map(labelCardHtml).join("");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: letter; margin: 0.4in; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #111;
      font-family: system-ui, -apple-system, Segoe UI, sans-serif;
      background: #fff;
    }
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid #ddd;
    }
    .toolbar button {
      font: inherit;
      padding: 8px 14px;
      border: 0;
      border-radius: 6px;
      background: #1d4ed8;
      color: #fff;
      cursor: pointer;
    }
    .hint { font-size: 12px; color: #555; }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      padding: 16px;
    }
    .label {
      border: 1px solid #222;
      border-radius: 8px;
      padding: 12px 10px 10px;
      text-align: center;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .label img {
      width: 1.65in;
      height: 1.65in;
      image-rendering: pixelated;
    }
    .meta { font-size: 11px; color: #444; margin-top: 6px; }
    .name { font-size: 14px; font-weight: 700; margin-top: 4px; }
    .location { font-size: 12px; margin-top: 2px; }
    .id { font-size: 10px; color: #555; margin-top: 6px; letter-spacing: 0.02em; }
    .grid.layout-single {
      grid-template-columns: 1fr;
      justify-items: center;
    }
    .layout-single .label {
      width: 3.4in;
      page-break-after: always;
      break-after: page;
    }
    .layout-single .label:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .layout-single .label img {
      width: 2.2in;
      height: 2.2in;
    }
    @media print {
      .toolbar { display: none !important; }
      .grid { padding: 0; gap: 10px; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div>
      <strong>${escapeHtml(title)}</strong>
      <div class="hint">${labels.length} label${labels.length === 1 ? "" : "s"} — scan opens FilterInfo for that AHU</div>
    </div>
    <button type="button" onclick="window.print()">Print</button>
  </div>
  <div class="grid layout-${layout}">
    ${cards}
  </div>
</body>
</html>`;
}

export function printQrLabels(labels, title, options = {}) {
  const html = buildQrPrintDocument(labels, title, options);
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = "8.5in";
  iframe.style.height = "11in";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!frameDoc) {
    iframe.remove();
    const w = window.open("", "_blank");
    if (!w) {
      alert("Pop-up blocked. Allow pop-ups for this site, then click Print again.");
      return;
    }
    w.document.write(html);
    w.document.close();
    return;
  }

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  const cleanup = () => {
    window.setTimeout(() => iframe.remove(), 1000);
  };

  const triggerPrint = () => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    iframe.contentWindow.onafterprint = cleanup;
    window.setTimeout(cleanup, 60_000);
  };

  const images = Array.from(frameDoc.images || []);
  if (!images.length) {
    triggerPrint();
    return;
  }

  let remaining = images.length;
  const mark = () => {
    remaining -= 1;
    if (remaining <= 0) triggerPrint();
  };
  images.forEach((img) => {
    if (img.complete) mark();
    else {
      img.addEventListener("load", mark, { once: true });
      img.addEventListener("error", mark, { once: true });
    }
  });
}
