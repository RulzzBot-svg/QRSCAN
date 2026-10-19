import { API, hasAuthToken } from "../api/api";
import {
  getUnsyncedJobs,
  markJobSynced,
  markJobFailed,
  pruneSyncedJobs,
} from "./jobQueue";

export async function syncQueuedJobs({ max = 50, drain = true } = {}) {
  if (!hasAuthToken()) {
    return { ok: false, synced: 0, failed: 0, needsLogin: true };
  }

  let synced = 0;
  let failed = 0;
  const seen = new Set();

  while (true) {
    const jobs = (await getUnsyncedJobs()).filter((j) => !seen.has(j.local_id));
    if (!jobs?.length) break;

    const batch = jobs.slice(0, max);
    for (const j of batch) {
      const localId = j.local_id;
      seen.add(localId);
      try {
        const raw = j.payload ?? j;
        const { tech_id: _ignored, ...payload } = raw;
        await API.post("/jobs", payload);
        await markJobSynced(localId);
        try {
          window.dispatchEvent(new Event("jobCreated"));
        } catch (e) {
          /* ignore */
        }
        synced += 1;
      } catch (err) {
        if (err?.response?.status === 401) {
          return { ok: false, synced, failed, needsLogin: true };
        }
        const msg =
          err?.response?.data?.error || err?.message || "Unknown syncing error.";
        await markJobFailed(localId, msg);
        failed += 1;
      }
    }

    if (!drain || batch.length < max) break;
  }

  try {
    await pruneSyncedJobs();
  } catch {
    /* ignore */
  }

  return { ok: failed === 0, synced, failed };
}
