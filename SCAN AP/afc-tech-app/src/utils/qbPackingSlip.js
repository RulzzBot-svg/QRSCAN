/** Build QuickBooks SpecialPaste clipboard string from grouped AHU filter lines. */

export function sanitizeQbField(value) {
  if (value == null) return "";
  return String(value).replace(/\r?\n/g, " ").replace(/\|\|/g, " ").trim();
}

/**
 * @param {Record<string, { ahu_name: string, filters: Array<{ part_number?, quantity?, description?, size? }> }>} filtersByAhu
 */
export function buildQbPasteString(filtersByAhu) {
  const allParts = [];

  for (const ahuData of Object.values(filtersByAhu)) {
    const ahuName = sanitizeQbField(ahuData.ahu_name);
    allParts.push(`||||${ahuName}||`);

    for (const f of ahuData.filters || []) {
      const part = sanitizeQbField(f.part_number || "");
      const qty = sanitizeQbField(f.quantity != null ? f.quantity : "1");
      const size = sanitizeQbField(f.size || "");
      const fdesc = sanitizeQbField(f.description || f.phase || "");
      const descWithSize = size && fdesc ? `${fdesc} ${size}` : fdesc || size;

      if (descWithSize) {
        allParts.push(`${qty}||${part}||${descWithSize}||||||||||`);
      } else {
        allParts.push(`${qty}||${part}||||||||||`);
      }
    }
  }

  return allParts.join("");
}

/** @param {Array<object>} lines from API */
export function groupLinesByAhu(lines) {
  const map = {};
  for (const line of lines) {
    const key = String(line.ahu_id);
    if (!map[key]) {
      map[key] = { ahu_name: line.ahu_name || key, filters: [] };
    }
    map[key].filters.push({
      id: line.filter_id,
      part_number: line.part_number,
      quantity: line.quantity,
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
  return Object.values(filtersByAhu).reduce(
    (sum, a) => sum + (a.filters?.length || 0),
    0
  );
}
