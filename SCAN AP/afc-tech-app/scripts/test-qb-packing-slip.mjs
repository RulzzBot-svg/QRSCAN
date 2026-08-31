import {
  QB_FIELD_DELIM,
  QB_SPACER_ROW,
  buildQbPasteString,
  flattenPackingRows,
  qbAhuRow,
  qbAppendRow,
  qbBuildingRow,
  qbItemRow,
  sanitizeQbField,
  selectionToFiltersByAhu,
} from "../src/utils/qbPackingSlip.js";

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

assert(QB_FIELD_DELIM === "\u221F", "delimiter must be Cedars ∟");
assert(QB_SPACER_ROW.length === 7, "spacer is exactly 7 tab markers");
assert(sanitizeQbField("AH-1\nEast") === "AH-1 East", "newlines become spaces");
assert(!sanitizeQbField(`x${QB_FIELD_DELIM}y`).includes(QB_FIELD_DELIM), "strip delim from fields");

assert(qbBuildingRow("Main") === `${QB_FIELD_DELIM}${QB_FIELD_DELIM}Main${QB_FIELD_DELIM}${QB_FIELD_DELIM}`, "building row");
assert(qbAhuRow("AH-1") === `${QB_FIELD_DELIM}${QB_FIELD_DELIM}AH-1${QB_FIELD_DELIM}${QB_FIELD_DELIM}`, "ahu row");
assert(
  qbItemRow("P1", 4) === `4${QB_FIELD_DELIM}P1${QB_FIELD_DELIM}${QB_FIELD_DELIM}${QB_FIELD_DELIM}${QB_FIELD_DELIM}${QB_FIELD_DELIM}${QB_FIELD_DELIM}`,
  "item row is qty, part, empty desc/price/total/tax + extra tab"
);

let out = "";
out = qbAppendRow(out, QB_SPACER_ROW);
out = qbAppendRow(out, qbBuildingRow("Main"));
assert(out.startsWith(QB_SPACER_ROW + qbBuildingRow("Main")), "spacer keeps leading ∟∟ on next header");

const grouped = {
  10: {
    ahu_name: "AH-1",
    building: "Main",
    filters: [
      { part_number: "HVP12242", quantity: 4 },
      { part_number: "HVP20202", quantity: 2 },
    ],
  },
  11: {
    ahu_name: "AH-2",
    building: "Main",
    filters: [{ part_number: "M13", quantity: 1 }],
  },
  20: {
    ahu_name: "AH-9",
    building: "East",
    filters: [{ part_number: "E1", quantity: 8 }],
  },
};

const rows = flattenPackingRows(grouped);
assert(rows[0].building === "East" || rows[0].building === "Main", "rows flatten");
assert(rows.length === 4, "four item rows");

const paste = buildQbPasteString(grouped);
assert(!paste.includes("\n"), "no newlines in clipboard");
assert(!paste.includes("||"), "does not use the old || delimiter");
assert(paste.includes(QB_SPACER_ROW), "includes spacers between buildings");
assert(paste.includes(qbBuildingRow("Main")), "includes building header");
assert(paste.includes(qbBuildingRow("East")), "includes second building");
assert(paste.includes(qbAhuRow("AH-1")), "includes AHU header");
assert(paste.includes(qbItemRow("HVP12242", 4)), "includes first item");
assert(paste.includes(qbItemRow("HVP20202", 2)), "same-AHU items have no extra AHU header between them");

// Same building, new AHU: AH-2 header then item, no extra building header
const mainBlockStart = paste.indexOf(qbBuildingRow("Main"));
const eastBlockStart = paste.indexOf(qbBuildingRow("East"));
const mainBlock = eastBlockStart > mainBlockStart
  ? paste.slice(mainBlockStart, eastBlockStart)
  : paste.slice(mainBlockStart);
assert(mainBlock.includes(qbAhuRow("AH-2")), "AH-2 stays under Main");
assert((mainBlock.match(new RegExp(qbBuildingRow("Main"), "g")) || []).length === 1, "building header once per building");

const fromChecks = selectionToFiltersByAhu(
  { 5: [{ part_number: "X", quantity: 3 }] },
  [{ id: 5, name: "AH-5", building: "West", hospital: "Cedars" }]
);
assert(fromChecks[5].building === "West", "selection carries building");
assert(fromChecks[5].ahu_name === "AH-5", "selection carries AHU name");

const noBuilding = buildQbPasteString({
  1: { ahu_name: "AH-Solo", building: "", filters: [{ part_number: "Z", quantity: 1 }] },
});
assert(noBuilding.includes(qbAhuRow("AH-Solo")), "AHU-only paste still works without a building");
assert(noBuilding.includes(qbItemRow("Z", 1)), "AHU-only item is present");

const tabbed = buildQbPasteString(grouped, { delim: "\t" });
assert(!tabbed.includes(QB_FIELD_DELIM), "tab mode has no ∟ markers");
assert(tabbed.includes("\t"), "tab mode uses real tabs");
assert(tabbed.split("\t").length === paste.split(QB_FIELD_DELIM).length, "tab mode keeps the same field count");

console.log("qbPackingSlip tests passed");
