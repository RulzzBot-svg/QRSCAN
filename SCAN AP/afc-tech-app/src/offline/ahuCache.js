import { dbPromise } from "./db";

export async function cacheAHU(ahu) {
  const db = await dbPromise;
  await db.put("ahuCache", ahu);
}

export async function getCachedAHU(ahu_id) {
  const db = await dbPromise;
  return await db.get("ahuCache", ahu_id);
}
