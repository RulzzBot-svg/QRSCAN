import { dbPromise } from "./db";

export async function cacheAHU(ahu) {
  const db = await dbPromise;

  // Normalize key: always ensure we have ahu_id (keyPath)
  const key = ahu?.ahu_id || ahu?.id;

  if (!key) {
    return; // Nothing to cache safely
  }

  const normalized = {
    ...ahu,
    ahu_id: ahu?.ahu_id || key,
  };

  // store the canonical AHU payload keyed by numeric id
  await db.put("ahuCache", normalized);

  // if the AHU has a legacy-style name like 'AHU-001', store a mapping
  // from that label -> numeric id so offline lookups using old QR codes work
  const name = ahu?.name;
  if (typeof name === "string" && name.match(/^AHU\-/i)) {
    await db.put("ahuLegacyMap", { label: name, ahu_id: normalized.ahu_id });
  }
}

export async function getCachedAHU(ahu_id) {
  const db = await dbPromise;
  // accept numeric id or legacy label
  const numeric = typeof ahu_id === "number" || (!isNaN(parseInt(ahu_id, 10)) && String(ahu_id).trim() !== "");
  if (numeric) {
    const key = typeof ahu_id === "number" ? ahu_id : parseInt(ahu_id, 10);
    return await db.get("ahuCache", key);
  }

  // try legacy map lookup
  const mapEntry = await db.get("ahuLegacyMap", ahu_id);
  if (mapEntry && mapEntry.ahu_id) {
    return await db.get("ahuCache", mapEntry.ahu_id);
  }

  return null;
}
