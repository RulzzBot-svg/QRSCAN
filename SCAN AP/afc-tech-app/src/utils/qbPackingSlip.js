/** Build QuickBooks SpecialPaste clipboard text (Cedars / AutoIt format).
 *
 * Clipboard is one continuous string. Tab marker is ∟ (U+221F).
 * SpecialPaste.au3 splits on ∟ and types TAB between fields, starting on QTY.
 *
 *   Building/AHU header:  ∟∟Text∟∟
 *   Item:                 qty∟partnumber∟desc∟price∟total∟tax∟
 *   Spacer:               ∟∟∟∟∟∟∟   (exactly 7 markers)
 */

export const QB_FIELD_DELIM = "\u221F"; // ∟
export const QB_SPACER_ROW = QB_FIELD_DELIM.repeat(7);

export function sanitizeQbField(value) {
  if (value == null) return "";
  return String(value)
    .replace(/\r\n/g, " ")
    .replace(/[\r\n]/g, " ")
    .replace(new RegExp(String.fromCharCode(30), "g"), "")
    .replace(new RegExp(String.fromCharCode(31), "g"), "")
    .replace(/@@/g, "")
    .replace(/\u00a0/g, " ")
    .replace(new RegExp(QB_FIELD_DELIM, "g"), " ")
    .replace(/\|\|/g, " ")
    .replace(/\t/g, " ")
    .trim();
}

export function qbBuildingRow(building) {
  return `${QB_FIELD_DELIM}${QB_FIELD_DELIM}${sanitizeQbField(building)}${QB_FIELD_DELIM}${QB_FIELD_DELIM}`;
}

export function qbAhuRow(ahu) {
  return `${QB_FIELD_DELIM}${QB_FIELD_DELIM}${sanitizeQbField(ahu)}${QB_FIELD_DELIM}${QB_FIELD_DELIM}`;
}

export function formatQbPrice(value) {
  if (value == null || value === "") return "";
  const s = String(value).replace(/[$,]/g, "").trim();
  if (!s) return "";
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return "";
  return String(n);
}

export function qbItemRow(part, qty, price) {
  const q = sanitizeQbField(qty != null && qty !== "" ? qty : "1");
  const p = sanitizeQbField(part);
  const rate = formatQbPrice(price);
  // qty | item | desc | price/rate | total | tax | extra tab into next row
  return `${q}${QB_FIELD_DELIM}${p}${QB_FIELD_DELIM}${QB_FIELD_DELIM}${rate}${QB_FIELD_DELIM}${QB_FIELD_DELIM}${QB_FIELD_DELIM}${QB_FIELD_DELIM}`;
}

export function qbAppendRow(existing, rowText) {
  if (!existing) return rowText;
  if (rowText === QB_SPACER_ROW) return existing + QB_SPACER_ROW;
  if (existing.slice(-QB_SPACER_ROW.length) === QB_SPACER_ROW) return existing + rowText;
  if (!existing.endsWith(QB_FIELD_DELIM)) return existing + QB_FIELD_DELIM + rowText;
  return existing + rowText;
}

export function selectionToFiltersByAhu(selectedFiltersForQB, ahus) {
  const filtersByAhu = {};
  for (const [ahuId, filterObjects] of Object.entries(selectedFiltersForQB || {})) {
    if (!filterObjects?.length) continue;
    const ahu = (ahus || []).find((a) => String(a.id) === String(ahuId));
    filtersByAhu[ahuId] = {
      ahu_name: ahu?.name || ahuId,
      building: ahu?.building || "",
      hospital: ahu?.hospital || "",
      filters: filterObjects,
    };
  }
  return filtersByAhu;
}

export function flattenPackingRows(filtersByAhu) {
  const rows = [];
  for (const [ahuId, ahuData] of Object.entries(filtersByAhu || {})) {
    const building = sanitizeQbField(ahuData.building || "");
    const ahuName = sanitizeQbField(ahuData.ahu_name || ahuId);
    for (const f of ahuData.filters || []) {
      rows.push({
        building,
        ahu: ahuName,
        part: sanitizeQbField(f.part_number || ""),
        qty: sanitizeQbField(f.quantity != null && f.quantity !== "" ? f.quantity : "1"),
        price: formatQbPrice(f.unit_price ?? f.price),
      });
    }
  }
  rows.sort((a, b) => {
    const bcmp = a.building.localeCompare(b.building, undefined, {
      numeric: true,
      sensitivity: "base",
    });
    if (bcmp) return bcmp;
    return a.ahu.localeCompare(b.ahu, undefined, { numeric: true, sensitivity: "base" });
  });
  return rows;
}

/**
 * Mirror CedarsSerialize.au3 BuildCedarsSpecialPasteTextFrom grouping:
 * building change → spacer + building + ahu + item
 * ahu change     → ahu + item
 * same ahu       → item
 */
export function buildQbPasteString(filtersByAhu, { delim = QB_FIELD_DELIM } = {}) {
  const rows = flattenPackingRows(filtersByAhu);
  let out = "";
  let prevBuilding = "";
  let prevAhu = "";

  for (const row of rows) {
    if (!row.building && !row.ahu && !row.part && !row.qty) continue;

    if (row.building && row.building !== prevBuilding) {
      out = qbAppendRow(out, QB_SPACER_ROW);
      out = qbAppendRow(out, qbBuildingRow(row.building));
      out = qbAppendRow(out, qbAhuRow(row.ahu));
      out = qbAppendRow(out, qbItemRow(row.part, row.qty, row.price));
      prevBuilding = row.building;
      prevAhu = row.ahu;
    } else if (row.ahu !== prevAhu) {
      if (!out) out = qbAppendRow(out, QB_SPACER_ROW);
      out = qbAppendRow(out, qbAhuRow(row.ahu));
      out = qbAppendRow(out, qbItemRow(row.part, row.qty, row.price));
      prevAhu = row.ahu;
      if (row.building) prevBuilding = row.building;
    } else {
      out = qbAppendRow(out, qbItemRow(row.part, row.qty, row.price));
    }
  }

  const cedars = out.replace(/[\r\n]/g, "");
  if (!delim || delim === QB_FIELD_DELIM) return cedars;
  return cedars.split(QB_FIELD_DELIM).join(delim);
}

/** @param {Array<object>} lines from API */
export function groupLinesByAhu(lines) {
  const map = {};
  for (const line of lines) {
    const key = String(line.ahu_id);
    if (!map[key]) {
      map[key] = {
        ahu_name: line.ahu_name || key,
        building: line.building || "",
        hospital: line.hospital || "",
        filters: [],
      };
    }
    map[key].filters.push({
      id: line.filter_id,
      part_number: line.part_number,
      quantity: line.quantity,
      unit_price: line.unit_price,
      size: line.size,
      phase: line.phase,
      description: line.phase,
      job_id: line.job_id,
      completed_at: line.completed_at,
    });
  }
  return map;
}

export function countPackingSlipItems(filtersByAhu) {
  return Object.values(filtersByAhu || {}).reduce(
    (sum, a) => sum + (a.filters?.length || 0),
    0
  );
}

export async function copyPackingSlipToClipboard(filtersByAhu, { mode = "special" } = {}) {
  const delim = mode === "tabs" ? "\t" : QB_FIELD_DELIM;
  const text = buildQbPasteString(filtersByAhu, { delim });
  if (!text) throw new Error("Nothing to copy");
  await navigator.clipboard.writeText(text);
  return text;
}

export function qbCopySummary(filtersByAhu, mode = "special") {
  return {
    itemCount: countPackingSlipItems(filtersByAhu),
    ahuCount: Object.keys(filtersByAhu || {}).length,
    mode,
    filtersByAhu,
  };
}
