import { useEffect, useRef, useState } from "react";
import { syncQueuedJobs } from "./sync";
import { hasAuthToken } from "../api/api";

export function useOfflineSync() {
  const [status, setStatus] = useState({
    syncing: false,
    lastResult: null,
  });

  const isRunningRef = useRef(false);

  async function runSync() {
    if (isRunningRef.current) return;
    if (!navigator.onLine) return;
    if (!hasAuthToken()) return;

    isRunningRef.current = true;
    setStatus((s) => ({ ...s, syncing: true }));

    try {
      const res = await syncQueuedJobs({ max: 10 });
      setStatus({ syncing: false, lastResult: res });
    } finally {
      isRunningRef.current = false;
    }
  }

  useEffect(() => {
    runSync();

    const online = () => runSync();
    const onAuthExpired = () => {
      setStatus({ syncing: false, lastResult: { needsLogin: true } });
    };

    window.addEventListener("online", online);
    window.addEventListener("auth:expired", onAuthExpired);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("auth:expired", onAuthExpired);
    };
  }, []);

  return { ...status, runSync };
}
