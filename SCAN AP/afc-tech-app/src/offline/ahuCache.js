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
  const raw = ahu_id;
  const trimmed = String(ahu_id ?? "").trim();
  const asInt = parseInt(trimmed, 10);
  const keys = [];
  if (Number.isFinite(asInt) && String(asInt) === trimmed) {
    keys.push(asInt, String(asInt));
  }
  if (raw !== undefined && raw !== null && raw !== "") keys.push(raw);
  for (const key of keys) {
    const row = await db.get("ahuCache", key);
    if (row) return row;
  }

  const mapEntry = await db.get("ahuLegacyMap", trimmed || ahu_id);
  if (mapEntry && mapEntry.ahu_id) {
    return await db.get("ahuCache", mapEntry.ahu_id);
  }

  return null;
}

export async function getCachedAhusForHospital(hospitalId) {
  const db = await dbPromise;
  const all = await db.getAll("ahuCache");
  return (all || []).filter((a) => String(a.hospital_id) === String(hospitalId));
}
