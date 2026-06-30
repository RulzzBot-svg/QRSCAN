import { API, hasAuthToken } from "../api/api";
import { getUnsyncedJobs, markJobSynced, markJobFailed } from "./jobQueue";

export async function syncQueuedJobs({ max = 10 } = {}) {
  if (!hasAuthToken()) {
    return { ok: false, synced: 0, failed: 0, needsLogin: true };
  }

  const jobs = await getUnsyncedJobs();
  if (!jobs?.length) return { ok: true, synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  const batch = jobs.slice(0, max);

  for (const j of batch) {
    const localId = j.local_id;
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
  return { ok: failed === 0, synced, failed };
}
