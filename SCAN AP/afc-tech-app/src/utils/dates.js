// Lightweight date helpers: ensure ISO strings without timezone are treated as UTC
export function parseIsoToDate(s) {
  if (!s) return null;
  if (s instanceof Date) return s;
  let str = String(s);
  // If string contains timezone info (Z or +hh), leave as is
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(str)) return new Date(str);
  // If the value is a date-only string like YYYY-MM-DD, construct a local Date
  // to avoid UTC midnight shifting the displayed local date by one day.
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map((x) => parseInt(x, 10));
    // month index is zero-based
    return new Date(y, m - 1, d);
  }
  // If format looks like YYYY-MM-DDTHH:MM:SS(.sss) with no timezone, treat as UTC
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(str)) {
    str = str + 'Z';
  }
  return new Date(str);
}

export function formatDate(iso, locales = undefined, options = undefined) {
  const d = parseIsoToDate(iso);
  if (!d) return "";
  try {
    return d.toLocaleDateString(locales || undefined, options || undefined);
  } catch (e) {
    return d.toISOString().split('T')[0];
  }
}

export function formatDateTime(iso, locales = undefined, options = undefined) {
  const d = parseIsoToDate(iso);
  if (!d) return "";
  try {
    return d.toLocaleString(locales || undefined, options || undefined);
  } catch (e) {
    return d.toISOString();
  }
}
