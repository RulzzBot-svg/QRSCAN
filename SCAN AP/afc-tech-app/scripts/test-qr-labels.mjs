import {
  buildFilterInfoUrl,
  buildQrPrintDocument,
  DEFAULT_QR_BASE_URL,
  escapeHtml,
} from "../src/utils/qrLabels.js";

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

assert(escapeHtml(`<img src="x" onerror="alert(1)">`) === `&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;`, "escapeHtml should neutralize HTML");
assert(buildFilterInfoUrl(42, "https://qrscan-lyart.vercel.app/FilterInfo/") === "https://qrscan-lyart.vercel.app/FilterInfo/42", "URL should strip trailing slashes");
assert(DEFAULT_QR_BASE_URL.endsWith("/FilterInfo"), "default base should point at FilterInfo");

const html = buildQrPrintDocument(
  [
    {
      id: 7,
      name: "AHU-01 <test>",
      location: "Roof & penthouse",
      hospital: "Foothill",
      building: "Main",
      url: "https://qrscan-lyart.vercel.app/FilterInfo/7",
      qrDataUrl: "data:image/png;base64,AAA",
    },
  ],
  "QR Codes — Foothill"
);

assert(html.includes("QR Codes — Foothill"), "title should render");
assert(html.includes("AHU-01 &lt;test&gt;"), "AHU name should be escaped");
assert(html.includes("Roof &amp; penthouse"), "location should be escaped");
assert(html.includes("data:image/png;base64,AAA"), "QR image should be embedded");
assert(html.includes("grid-template-columns: repeat(3, 1fr)"), "print sheet should stay 3-up");
assert(!html.includes("max-width: 800px"), "print sheet should not collapse on a hidden iframe");
assert(html.includes("Foothill · Main"), "hospital and building should show");
assert(html.includes("layout-sheet"), "default layout should be 3-up sheet");

const single = buildQrPrintDocument(
  [
    {
      id: 7,
      name: "AHU-01",
      location: "Roof",
      hospital: "Foothill",
      building: "Main",
      url: "https://qrscan-lyart.vercel.app/FilterInfo/7",
      qrDataUrl: "data:image/png;base64,AAA",
    },
  ],
  "AHU-01",
  { layout: "single" }
);
assert(single.includes("layout-single"), "single layout should print one AHU per page");
assert(single.includes("page-break-after: always"), "one-per-page layout should break after each label");

console.log("qrLabels tests passed");
