import {
  buildFilterInfoUrl,
  buildQrPrintDocument,
  DEFAULT_QR_BASE_URL,
  escapeHtml,
  zebraHeadline,
  hospitalLine,
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
assert(zebra.includes("1.28in"), "zebra QR should sit in the left pane");
assert(zebra.includes("border-left: 2px solid #000"), "zebra layout should use a vertical divider");
assert(!zebra.includes("[HUNTINGTON]"), "zebra footer should not wrap the hospital in brackets");
assert(zebra.includes(">HUNTINGTON<"), "zebra labels should still show the hospital name");
assert(!zebra.includes("SERVICED"), "zebra footer should not say serviced by");
assert(zebra.includes("ADVANCED FILTRATION CONCEPTS"), "zebra footer should name Advanced Filtration Concepts");
assert(zebra.includes("323.832.8316"), "zebra footer should show the company phone");
assert(zebra.includes("data:image/png;base64,LOGO"), "zebra layout should print the corner logo");
assert(zebra.includes("img class=\"qr\""), "zebra QR should keep a dedicated class");
assert(zebra.includes("Zebra ZD220"), "zebra hint should mention the printer");
assert(zebra.includes("AHU-1 — 21 Building"), "zebra headline should keep building already in the AHU name");
assert(zebra.includes("font-size: 24pt"), "zebra name should use the larger wrapping type");
assert(!zebra.includes("ID 128"), "zebra labels should not show the internal ID");
assert(!zebra.includes("class=\"id\""), "zebra labels should not include an ID row");
assert(!zebra.includes("6th Floor"), "zebra service layout should not print location");

assert(
  zebraHeadline({ name: "AHU-012", building: "Main" }) === "AHU-012 — Main",
  "short AHU names should pick up the building in the headline"
);
assert(
  zebraHeadline({ name: "AHU-1 — 21 Building", building: "21 Building" }) === "AHU-1 — 21 Building",
  "should not duplicate a building already in the name"
);
assert(hospitalLine({ hospital: "Huntington" }) === "HUNTINGTON", "hospital line is uppercase without brackets");
assert(hospitalLine({ hospital: "" }) === "", "blank hospital stays off the label");

const short = buildQrPrintDocument(
  [
    {
      id: 12,
      name: "AHU-012",
      hospital: "Foothill",
      building: "Main",
      url: "https://qrscan-lyart.vercel.app/FilterInfo/12",
      qrDataUrl: "data:image/png;base64,AAA",
    },
  ],
  "QR Codes — Foothill",
  { layout: "zebra" }
);
assert(short.includes("AHU-012 — Main"), "print HTML should use the building headline");
assert(short.includes("323.832.8316"), "short-name labels should still show the company phone");
assert(!short.includes("[FOOTHILL]"), "short-name labels should not show a bracketed hospital");
assert(short.includes(">FOOTHILL<"), "short-name labels should still show the hospital name");

console.log("qrLabels tests passed");
