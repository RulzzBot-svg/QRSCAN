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
assert(!html.includes("ID 7"), "printed labels should not show the internal ID");

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
assert(!single.includes("ID 7"), "one-per-page labels should not show the internal ID");

const zebra = buildQrPrintDocument(
  [
    {
      id: 128,
      name: "AHU-1 — 21 Building",
      location: "6th Floor",
      hospital: "Huntington",
      building: "21 Building",
      url: "https://qrscan-lyart.vercel.app/FilterInfo/128",
      qrDataUrl: "data:image/png;base64,AAA",
    },
  ],
  "QR Codes — Huntington",
  {
    layout: "zebra",
    sideLogoDataUrl: "data:image/png;base64,LOGO",
  }
);
assert(zebra.includes("size: 4in 2in"), "zebra layout should use 4x2 page size");
assert(zebra.includes("layout-zebra"), "zebra layout class should be present");
assert(zebra.includes("width: 4in"), "zebra label should be 4 inches wide");
assert(zebra.includes("height: 2in"), "zebra label should be 2 inches tall");
assert(zebra.includes("1.48in"), "zebra QR should leave room for a larger side logo");
assert(zebra.includes("height: 0.98in"), "zebra side logo should be enlarged");
assert(zebra.includes("font-size: 18pt"), "zebra AHU name should be enlarged");
assert(zebra.includes("data:image/png;base64,LOGO"), "zebra layout should print the side logo");
assert(zebra.includes("img class=\"qr\""), "zebra QR should keep a dedicated class");
assert(zebra.includes("Zebra ZD220"), "zebra hint should mention the printer");
assert(!zebra.includes("ID 128"), "zebra labels should not show the internal ID");
assert(!zebra.includes("class=\"id\""), "zebra labels should not include an ID row");

console.log("qrLabels tests passed");
