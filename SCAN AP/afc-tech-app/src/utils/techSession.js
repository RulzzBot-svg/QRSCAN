/** Local technician session helpers for online JWT and offline PIN work. */

export function namesMatch(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

export function readStoredTech() {
  try {
    const raw = localStorage.getItem("tech");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function readOfflineTech() {
  try {
    const raw = localStorage.getItem("offline_tech");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Online needs JWT + tech. Offline needs a tech profile already on the phone. */
export function canUseFieldApp({
  online = true,
  hasToken = false,
  hasTech = false,
} = {}) {
  if (online) return Boolean(hasToken && hasTech);
  return Boolean(hasTech);
}

export function resumeTechPath({
  online = true,
  hasSession = false,
  hasTech = false,
  postLoginPath = "",
} = {}) {
  const canResume = Boolean(hasSession || (!online && hasTech));
  if (!canResume) return null;

  const next = String(postLoginPath || "").trim();
  if (
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !next.startsWith("/client")
  ) {
    return next;
  }
  return "/Home";
}

export function restoreTechFromOfflineRecord(offline) {
  if (!offline) return null;
  const tech = {
    id: offline.id,
    name: offline.name,
    role: offline.role || "technician",
  };
  return tech;
}
