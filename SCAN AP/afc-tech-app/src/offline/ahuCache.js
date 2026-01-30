import { dbPromise } from "./db";

export async function cacheAHU(ahu) {
  const db = await dbPromise;

  // Normalize key: always ensure we have ahu_id (keyPath)
  const key = ahu?.ahu_id || ahu?.id;

  if (!key) {
    // Nothing to cache safely
    return;
  }

  const normalized = {
    ...ahu,
    ahu_id: ahu?.ahu_id || key, // ensure keyPath exists
  };

  await db.put("ahuCache", normalized);
}

export async function getCachedAHU(ahu_id) {
  const db = await dbPromise;
  return await db.get("ahuCache", ahu_id);
}
