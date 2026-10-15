/** Build printable AHU QR labels that scan to FilterInfo. */

export const DEFAULT_QR_BASE_URL = "https://qrscan-lyart.vercel.app/FilterInfo";
export const QR_LOGO_STORAGE_KEY = "qrLabelLogo";
export const DEFAULT_AFC_LOGO_PATH = "/afc-logo-bw.png";
export const DEFAULT_AFC_MARK_PATH = "/afc-mark-bw.png";
/** Center-of-QR mark size vs QR width. ~0.58 fills the quiet zone without a hard rectangle. */
export const QR_CENTER_LOGO_RATIO = 0.58;
export const QR_LAYOUTS = {
  sheet: "sheet",
  single: "single",
  zebra: "zebra",
  zebraMark: "zebra-mark",
  zebraBanner: "zebra-banner",
  zebraFlip: "zebra-flip",
};

export const QR_LAYOUT_OPTIONS = [
  { id: QR_LAYOUTS.zebra, label: "Zebra 4×2 — split", hint: "QR left, name right" },
  { id: QR_LAYOUTS.zebraMark, label: "Zebra 4×2 — logo in QR", hint: "AFC mark in the center of the QR" },
  { id: QR_LAYOUTS.zebraBanner, label: "Zebra 4×2 — banner", hint: "Thin full-width bar, AFC mark in the QR" },
  { id: QR_LAYOUTS.zebraFlip, label: "Zebra 4×2 — QR right", hint: "Name left, QR on the right" },
  { id: QR_LAYOUTS.sheet, label: "Sheet (3 per page)", hint: "Letter page, 3 labels" },
  { id: QR_LAYOUTS.single, label: "One AHU per page", hint: "One AHU per printed page" },
];

export function isZebraLayout(layout) {
  return String(layout || "").startsWith("zebra");
}

export function resolveQrLayout(layout) {
  const ids = new Set(Object.values(QR_LAYOUTS));
  if (ids.has(layout)) return layout;
  return QR_LAYOUTS.sheet;
}

export function usesQrCenterLogo(layout) {
  return layout === QR_LAYOUTS.zebraMark || layout === QR_LAYOUTS.zebraBanner;
}

export function usesSideLogo(layout) {
  return layout === QR_LAYOUTS.zebra || layout === QR_LAYOUTS.zebraFlip;
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

function cropImageToInk(img, { threshold = 250 } = {}) {
  const w = img.width || 1;
  const h = img.height || 1;
  const src = document.createElement("canvas");
  src.width = w;
  src.height = h;
  const sctx = src.getContext("2d");
  sctx.drawImage(img, 0, 0);
  const data = sctx.getImageData(0, 0, w, h).data;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      if (data[i + 3] > 8 && lum < threshold) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX) return img;
  const pad = 1;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  out.getContext("2d").drawImage(src, minX, minY, cw, ch, 0, 0, cw, ch);
  return out;
}

export async function overlayLogoOnQr(qrDataUrl, logoDataUrl, { logoRatio = QR_CENTER_LOGO_RATIO } = {}) {
  if (!logoDataUrl || typeof document === "undefined") return qrDataUrl;
  const qrImg = await loadImage(qrDataUrl);
  const logoImg = cropImageToInk(await loadImage(logoDataUrl));
  const size = qrImg.width || 280;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(qrImg, 0, 0, size, size);

  const maxSide = Math.round(size * logoRatio);
  const iw = logoImg.width || maxSide;
  const ih = logoImg.height || maxSide;
  const fit = Math.min(maxSide / iw, maxSide / ih);
  const lw = iw * fit;
  const lh = ih * fit;
  const pad = Math.max(4, Math.round(Math.min(lw, lh) * 0.06));
  const plate = Math.min(size * 0.72, Math.max(lw, lh) + pad * 2);
  const cx = size / 2;
  const cy = size / 2;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, plate / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.drawImage(logoImg, cx - lw / 2, cy - lh / 2, lw, lh);
  return canvas.toDataURL("image/png");
}

export async function generateQrDataUrl(text, { withLogo = false } = {}) {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: withLogo ? "H" : "Q",
    margin: 1,
    width: withLogo ? 480 : 280,
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
      qrDataUrl: await overlayLogoOnQr(qr, logoDataUrl, { logoRatio: QR_CENTER_LOGO_RATIO }),
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
export const AFC_PHONE_TEL = "+13238328316";

export function hospitalLine(label) {
  const name = String(label?.hospital || "").trim();
  return name ? name.toUpperCase() : "";
}

function zebraIdentityHtml(label, { sideLogo = "", footer = true } = {}) {
  const headline = zebraHeadline(label);
  const hospital = hospitalLine(label);
  return `
        ${sideLogo ? `<img class="logo" src="${sideLogo}" alt="AFC" />` : ""}
        <div class="identity">
          <div class="name">${escapeHtml(headline)}</div>
          ${hospital ? `<div class="hospital">${escapeHtml(hospital)}</div>` : ""}
        </div>
        ${
          footer
            ? `<div class="footer">
          <div class="rule"></div>
          <div class="company">${escapeHtml(AFC_COMPANY_NAME)}</div>
          <div class="phone">${escapeHtml(AFC_PHONE)}</div>
        </div>`
            : ""
        }`;
}

function labelCardHtml(label, options = {}) {
  const layout = resolveQrLayout(options.layout);
  const sideLogo = usesSideLogo(layout) ? options.sideLogoDataUrl || "" : "";
  const meta = [label.hospital, label.building].filter(Boolean).join(" · ");
  if (isZebraLayout(layout)) {
    const headline = zebraHeadline(label);
    const qr = `<div class="qr-wrap">
        <img class="qr" src="${label.qrDataUrl}" alt="QR for ${escapeHtml(headline)}" />
      </div>`;
    if (layout === QR_LAYOUTS.zebraBanner) {
      return `
    <article class="label">
      <div class="band">
        <span class="company">${escapeHtml(AFC_COMPANY_NAME)}</span>
        <span class="phone">${escapeHtml(AFC_PHONE)}</span>
      </div>
      <div class="body">
        ${qr}
        <div class="copy">
          ${zebraIdentityHtml(label, { footer: false })}
        </div>
      </div>
    </article>
  `;
    }
    return `
    <article class="label">
      ${qr}
      <div class="copy">
        ${zebraIdentityHtml(label, { sideLogo, footer: true })}
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
  const zebra = isZebraLayout(layout);
  const pageCss = zebra
    ? "@page { size: 4in 2in; margin: 0 !important; }"
    : "@page { size: letter; margin: 0.4in; }";
  const hint = zebra
    ? `${labels.length} label${labels.length === 1 ? "" : "s"} — 4×2 in Zebra ZD220 · black & white · scan opens FilterInfo`
    : `${labels.length} label${labels.length === 1 ? "" : "s"} — scan opens FilterInfo for that AHU`;
  const cards = labels.map((label) => labelCardHtml(label, options)).join("");
  return `<!DOCTYPE html>
<html lang="en"${zebra ? ' class="print-zebra"' : ""}>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    ${pageCss}
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      color: #111;
      font-family: Arial, Helvetica, sans-serif;
      background: #fff;
    }
    html.print-zebra,
    html.print-zebra body {
      width: 4in;
      height: 2in;
      overflow: hidden;
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
    .grid.zebra-page {
      display: block;
      padding: 0;
    }
    .zebra-page .label {
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
    .zebra-page .label:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .zebra-page .qr-wrap {
      flex: 0 0 1.62in;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .zebra-page .label img.qr {
      width: 1.28in;
      height: 1.28in;
    }
    .zebra-page .copy {
      flex: 1;
      min-width: 0;
      border-left: 2px solid #000;
      padding: 0.1in 0.12in 0.1in 0.14in;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .zebra-page .logo {
      position: absolute;
      top: 0.08in;
      right: 0.1in;
      height: 0.34in;
      width: auto;
      max-width: 0.95in;
      object-fit: contain;
    }
    .zebra-page .identity {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding-top: 0.16in;
      padding-right: 0.12in;
      min-height: 0;
    }
    .zebra-page .name {
      font-size: 14pt;
      font-weight: 800;
      line-height: 1.1;
      letter-spacing: -0.02em;
      margin: 0;
      overflow-wrap: anywhere;
    }
    .zebra-page .hospital {
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 0.14em;
      margin: 0.06in 0 0;
      text-transform: uppercase;
    }
    .zebra-page .footer {
      margin-top: auto;
    }
    .zebra-page .rule {
      border-top: 1.5px solid #000;
      margin: 0 0 0.05in;
    }
    .zebra-page .company {
      font-size: 7pt;
      font-weight: 800;
      letter-spacing: 0.05em;
      line-height: 1.15;
      text-transform: uppercase;
    }
    .zebra-page .phone {
      font-size: 8pt;
      font-weight: 800;
      letter-spacing: 0.08em;
      line-height: 1.15;
      margin-top: 0.02in;
    }
    .layout-zebra-flip .label {
      flex-direction: row-reverse;
    }
    .layout-zebra-flip .copy {
      border-left: 0;
      border-right: 2px solid #000;
    }
    .layout-zebra-flip .logo {
      right: auto;
      left: 0.1in;
    }
    .layout-zebra-banner .label {
      position: relative;
      flex-direction: column;
      width: 4in;
      height: 2in;
      padding: 0;
      margin: 0;
      overflow: hidden;
      background: #000;
    }
    .layout-zebra-banner .band {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: 2;
      flex: none;
      height: 0.22in;
      width: 100%;
      min-width: 100%;
      max-width: none;
      align-self: stretch;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin: 0;
      padding: 0 0.12in;
      background: #000;
      color: #fff;
      box-shadow: 0 0 0 0.08in #000;
    }
    .layout-zebra-banner .band .company,
    .layout-zebra-banner .band .phone {
      color: #fff;
      margin: 0;
    }
    .layout-zebra-banner .body {
      flex: 1;
      min-height: 0;
      margin-top: 0.22in;
      display: flex;
      flex-direction: row;
      align-items: stretch;
      background: #fff;
    }
    .layout-zebra-banner .qr-wrap {
      flex-basis: 1.72in;
    }
    .layout-zebra-banner .label img.qr {
      width: 1.42in;
      height: 1.42in;
    }
    .layout-zebra-banner .copy {
      border-left: 2px solid #000;
      justify-content: center;
    }
    .layout-zebra-banner .identity,
    .layout-zebra-mark .identity {
      padding-top: 0.04in;
      padding-right: 0;
    }
    @media print {
      .toolbar { display: none !important; }
      .grid { padding: 0; gap: 10px; }
      .grid.zebra-page {
        padding: 0 !important;
        gap: 0 !important;
        position: absolute;
        top: 0;
        left: 0;
        width: 4in;
        height: 2in;
      }
      html.print-zebra,
      html.print-zebra body,
      .zebra-page .label {
        width: 4in !important;
        height: 2in !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
      }
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
  <div class="grid layout-${layout}${zebra ? " zebra-page" : ""}">
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
  iframe.style.left = "0";
  iframe.style.top = "0";
  iframe.style.width = isZebraLayout(layout) ? "4in" : "8.5in";
  iframe.style.height = isZebraLayout(layout) ? "2in" : "11in";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.style.zIndex = "-1";
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
