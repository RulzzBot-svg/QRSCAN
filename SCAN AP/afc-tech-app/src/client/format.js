import { formatDate } from "../utils/dates.js";

const FREQUENCY = {
  30: "30 days",
  60: "60 days",
  90: "90 days",
  180: "6 months",
  365: "1 year",
  540: "18 months",
  730: "2 years",
  1095: "3 years",
};

export function frequencyLabel(days) {
  const n = Number(days);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return FREQUENCY[n] || `${n} days`;
}

export function statusTone(status) {
  if (status === "Overdue") return "error";
  if (status === "Due Soon") return "warning";
  if (status === "Completed") return "success";
  return "ghost";
}

export function prettyDate(value) {
  return value ? formatDate(value) : "—";
}

export function extractAhuId(decodedText) {
  const s = String(decodedText || "").trim();
  if (!s) return "";
  if (!s.includes("http")) return s;
  try {
    const u = new URL(s);
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || s;
  } catch {
    return s;
  }
}
