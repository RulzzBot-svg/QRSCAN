import { useEffect, useRef, useState } from "react";
import { syncQueuedJobs } from "./sync";
import { getQueueSummary } from "./jobQueue";
import { hasAuthToken } from "../api/api";

export function useOfflineSync() {
  const [status, setStatus] = useState({
    syncing: false,
    lastResult: null,
    queue: { pending: 0, failed: 0 },
  });

  const isRunningRef = useRef(false);

  async function refreshQueue() {
    try {
      const queue = await getQueueSummary();
      setStatus((s) => ({ ...s, queue }));
      return queue;
    } catch {
      return { pending: 0, failed: 0 };
    }
  }

  async function runSync() {
    if (isRunningRef.current) return;
    if (!navigator.onLine) {
      await refreshQueue();
      return;
    }
    if (!hasAuthToken()) {
      const queue = await refreshQueue();
      setStatus((s) => ({
        ...s,
        queue,
        lastResult: queue.pending ? { needsLogin: true, synced: 0, failed: 0 } : s.lastResult,
      }));
      return;
    }

    isRunningRef.current = true;
    setStatus((s) => ({ ...s, syncing: true }));

    try {
      const res = await syncQueuedJobs({ drain: true, max: 50 });
      const queue = await getQueueSummary();
      setStatus({ syncing: false, lastResult: res, queue });
    } finally {
      isRunningRef.current = false;
    }
  }

  useEffect(() => {
    refreshQueue();
    runSync();

    const online = () => runSync();
    const queued = () => refreshQueue();
    const onAuthExpired = () => {
      setStatus((s) => ({
        ...s,
        syncing: false,
        lastResult: { needsLogin: true, synced: s.lastResult?.synced || 0, failed: s.lastResult?.failed || 0 },
      }));
    };

    window.addEventListener("online", online);
    window.addEventListener("jobs:queued", queued);
    window.addEventListener("auth:expired", onAuthExpired);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("jobs:queued", queued);
      window.removeEventListener("auth:expired", onAuthExpired);
    };
  }, []);

  return { ...status, runSync, refreshQueue };
}
