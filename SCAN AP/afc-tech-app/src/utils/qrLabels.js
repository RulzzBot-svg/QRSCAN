/** Build printable AHU QR labels that scan to FilterInfo. */

export const DEFAULT_QR_BASE_URL = "https://qrscan-lyart.vercel.app/FilterInfo";
export const QR_LOGO_STORAGE_KEY = "qrLabelLogo";
export const DEFAULT_AFC_LOGO_PATH = "/afc-logo-bw.png";
export const DEFAULT_AFC_MARK_PATH = "/afc-mark-bw.png";
export const QR_LAYOUTS = { sheet: "sheet", single: "single", zebra: "zebra" };

export function resolveQrLayout(layout) {
  if (layout === QR_LAYOUTS.single || layout === QR_LAYOUTS.zebra) return layout;
  return QR_LAYOUTS.sheet;
}

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

export async function loadImageAsDataUrl(src) {
  if (!src) return "";
  if (String(src).startsWith("data:")) return String(src);
  const res = await fetch(src);
  if (!res.ok) throw new Error("Failed to load image");
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(blob);
  });
}

export async function toBlackAndWhiteDataUrl(src, { threshold = 236 } = {}) {
  if (!src || typeof document === "undefined") return src || "";
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = img.width || 1;
  canvas.height = img.height || 1;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    const v = lum < threshold ? 0 : 255;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
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
  const maxSide = 800;
  const scale = Math.min(1, maxSide / Math.max(img.width || 1, img.height || 1));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
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
  const fit = Math.min(logoSize / (logoImg.width || 1), logoSize / (logoImg.height || 1));
  const lw = (logoImg.width || logoSize) * fit;
  const lh = (logoImg.height || logoSize) * fit;
  ctx.drawImage(
    logoImg,
    x + pad + (logoSize - lw) / 2,
    y + pad + (logoSize - lh) / 2,
    lw,
    lh
  );
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

export function zebraHeadline(label) {
  const name = String(label?.name || "").trim();
  const building = String(label?.building || "").trim();
  if (!building) return name;
  const haystack = name.toLowerCase();
  const needle = building.toLowerCase();
  if (haystack.includes(needle)) return name;
  return name ? `${name} — ${building}` : building;
}

export const AFC_COMPANY_NAME = "ADVANCED FILTRATION CONCEPTS";
export const AFC_PHONE = "323.832.8316";

export function hospitalLine(label) {
  const name = String(label?.hospital || "").trim();
  return name ? name.toUpperCase() : "";
}

function labelCardHtml(label, options = {}) {
  const layout = resolveQrLayout(options.layout);
  const sideLogo = options.sideLogoDataUrl || "";
  const meta = [label.hospital, label.building].filter(Boolean).join(" · ");
  if (layout === QR_LAYOUTS.zebra) {
    const headline = zebraHeadline(label);
    const hospital = hospitalLine(label);
    return `
    <article class="label">
      <div class="qr-wrap">
        <img class="qr" src="${label.qrDataUrl}" alt="QR for ${escapeHtml(headline)}" />
      </div>
      <div class="copy">
        ${sideLogo ? `<img class="logo" src="${sideLogo}" alt="AFC" />` : ""}
        <div class="identity">
          <div class="name">${escapeHtml(headline)}</div>
          ${hospital ? `<div class="hospital">${escapeHtml(hospital)}</div>` : ""}
        </div>
        <div class="footer">
          <div class="rule"></div>
          <div class="company">${escapeHtml(AFC_COMPANY_NAME)}</div>
          <div class="phone">${escapeHtml(AFC_PHONE)}</div>
        </div>
      </div>
    </article>
  `;
  }
  return `
    <article class="label">
      <img class="qr" src="${label.qrDataUrl}" alt="QR for ${escapeHtml(label.name)}" />
      ${meta ? `<div class="meta">${escapeHtml(meta)}</div>` : ""}
      <div class="name">${escapeHtml(label.name)}</div>
      ${label.location ? `<div class="location">${escapeHtml(label.location)}</div>` : ""}
    </article>
  `;
}

export function buildQrPrintDocument(labels, title = "AHU QR Labels", options = {}) {
  const layout = resolveQrLayout(options.layout);
  const pageCss =
    layout === QR_LAYOUTS.zebra
      ? "@page { size: 4in 2in; margin: 0; }"
      : "@page { size: letter; margin: 0.4in; }";
  const hint =
    layout === QR_LAYOUTS.zebra
      ? `${labels.length} label${labels.length === 1 ? "" : "s"} — 4×2 in Zebra ZD220 · black & white · scan opens FilterInfo`
      : `${labels.length} label${labels.length === 1 ? "" : "s"} — scan opens FilterInfo for that AHU`;
  const cards = labels.map((label) => labelCardHtml(label, options)).join("");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    ${pageCss}
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #111;
      font-family: Arial, Helvetica, sans-serif;
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
    .label img.qr {
      width: 1.65in;
      height: 1.65in;
      image-rendering: pixelated;
    }
    .meta { font-size: 11px; color: #444; margin-top: 6px; }
    .name { font-size: 14px; font-weight: 700; margin-top: 4px; }
    .location { font-size: 12px; margin-top: 2px; }
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
    .layout-single .label img.qr {
      width: 2.2in;
      height: 2.2in;
    }
    .grid.layout-zebra {
      display: block;
      padding: 0;
    }
    .layout-zebra .label {
      width: 4in;
      height: 2in;
      display: flex;
      flex-direction: row;
      align-items: stretch;
      gap: 0;
      padding: 0;
      border: 0;
      border-radius: 0;
      text-align: left;
      page-break-after: always;
      break-after: page;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    .layout-zebra .label:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .layout-zebra .qr-wrap {
      flex: 0 0 1.62in;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .layout-zebra .label img.qr {
      width: 1.28in;
      height: 1.28in;
    }
    .layout-zebra .copy {
      flex: 1;
      min-width: 0;
      border-left: 2px solid #000;
      padding: 0.1in 0.12in 0.1in 0.14in;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .layout-zebra .logo {
      position: absolute;
      top: 0.08in;
      right: 0.1in;
      height: 0.34in;
      width: auto;
      max-width: 0.95in;
      object-fit: contain;
    }
    .layout-zebra .identity {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding-top: 0.16in;
      padding-right: 0.12in;
      min-height: 0;
    }
    .layout-zebra .name {
      font-size: 24pt;
      font-weight: 800;
      line-height: 0.92;
      letter-spacing: -0.03em;
      margin: 0;
    }
    .layout-zebra .hospital {
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 0.14em;
      margin: 0.06in 0 0;
      text-transform: uppercase;
    }
    .layout-zebra .footer {
      margin-top: auto;
    }
    .layout-zebra .rule {
      border-top: 1.5px solid #000;
      margin: 0 0 0.05in;
    }
    .layout-zebra .company {
      font-size: 7pt;
      font-weight: 800;
      letter-spacing: 0.05em;
      line-height: 1.15;
      text-transform: uppercase;
    }
    .layout-zebra .phone {
      font-size: 8pt;
      font-weight: 800;
      letter-spacing: 0.08em;
      line-height: 1.15;
      margin-top: 0.02in;
    }
    @media print {
      .toolbar { display: none !important; }
      .grid { padding: 0; gap: 10px; }
      .grid.layout-zebra { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div>
      <strong>${escapeHtml(title)}</strong>
      <div class="hint">${escapeHtml(hint)}</div>
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
  const layout = resolveQrLayout(options.layout);
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = layout === QR_LAYOUTS.zebra ? "4in" : "8.5in";
  iframe.style.height = layout === QR_LAYOUTS.zebra ? "2in" : "11in";
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
