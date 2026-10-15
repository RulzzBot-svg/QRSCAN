/** Where a FilterInfo QR scan should go. Unauthenticated scans always hit login. */

export function filterInfoScanDestination(ahuId, { hasTech = false, hasClient = false } = {}) {
  if (hasTech) return { stay: true, path: null };
  const id = encodeURIComponent(String(ahuId ?? "").trim());
  if (hasClient) return { stay: false, path: `/client/ahu/${id}` };
  return { stay: false, path: "/" };
}
