import { API } from "./api";

const QB_LISTENER_BASE =
  import.meta.env.VITE_QB_LISTENER_URL || "http://127.0.0.1:5001";

export async function fetchPackingSlipFromJobs({ hospitalId, from, to }) {
  const res = await API.get("/admin/packing-slip/lines", {
    params: {
      hospital_id: hospitalId,
      from,
      to,
    },
  });
  return res.data;
}

export async function checkQbListenerHealth() {
  try {
    const res = await fetch(`${QB_LISTENER_BASE}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return { running: false };
    const data = await res.json();
    return { running: true, ...data };
  } catch {
    return { running: false };
  }
}

export async function pasteToQbListener(pasteData, { deleteOld = false } = {}) {
  const res = await fetch(`${QB_LISTENER_BASE}/paste`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: pasteData, delete_old: deleteOld }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || body.message || "QB listener paste failed");
  }
  return body;
}

export { QB_LISTENER_BASE };
