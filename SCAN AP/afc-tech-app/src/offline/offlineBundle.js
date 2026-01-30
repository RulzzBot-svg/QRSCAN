import { dbPromise } from "./db";

/**
 * bundle shape expected:
 * {
 *   hospital: { id, name, ... },
 *   ahus: [{ id, hospital_id, name, location, filters: [...] }, ...]
 * }
 */
export async function saveHospitalBundle(bundle) {
  const db = await dbPromise;
  const hospitalId = bundle?.hospital?.id;

  if (!hospitalId) throw new Error("Invalid bundle: missing hospital.id");

  const ahus = Array.isArray(bundle.ahus) ? bundle.ahus : [];
  const ahuIds = ahus.map((a) => a.id);

  const tx = db.transaction(["ahuCache", "offlineHospitals", "hospitalAhuIndex"], "readwrite");

  // 1) store each AHU (including filters) into ahuCache keyed by ahu_id
  const ahuStore = tx.objectStore("ahuCache");
  for (const a of ahus) {
    await ahuStore.put({
      ahu_id: a.id,      // matches your keyPath
      ...a,              // includes filters inside
      cached_at: new Date().toISOString(),
    });
  }

  // 2) store hospital download metadata
  await tx.objectStore("offlineHospitals").put({
    hospital_id: hospitalId,
    name: bundle.hospital.name ?? `Hospital ${hospitalId}`,
    ahu_count: ahus.length,
    downloaded_at: new Date().toISOString(),
  });

  // 3) store index for removal
  await tx.objectStore("hospitalAhuIndex").put({
    hospital_id: hospitalId,
    ahu_ids: ahuIds,
  });

  await tx.done;

  return { hospitalId, ahuCount: ahus.length };
}

export async function getOfflineHospitals() {
  const db = await dbPromise;
  return db.getAll("offlineHospitals");
}

export async function isHospitalDownloaded(hospitalId) {
  const db = await dbPromise;
  const row = await db.get("offlineHospitals", hospitalId);
  return !!row;
}

export async function removeHospitalBundle(hospitalId) {
  const db = await dbPromise;

  // get the list of cached AHUs for this hospital
  const idx = await db.get("hospitalAhuIndex", hospitalId);
  const ahuIds = idx?.ahu_ids || [];

  const tx = db.transaction(["ahuCache", "offlineHospitals", "hospitalAhuIndex"], "readwrite");

  // delete all AHUs from cache
  const ahuStore = tx.objectStore("ahuCache");
  for (const id of ahuIds) {
    await ahuStore.delete(id);
  }

  // delete hospital metadata + index
  await tx.objectStore("offlineHospitals").delete(hospitalId);
  await tx.objectStore("hospitalAhuIndex").delete(hospitalId);

  await tx.done;

  return { hospitalId, removedAhuCount: ahuIds.length };
}
