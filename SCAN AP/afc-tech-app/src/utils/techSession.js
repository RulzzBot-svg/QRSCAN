/** Where to send a returning technician instead of showing login again. */

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
