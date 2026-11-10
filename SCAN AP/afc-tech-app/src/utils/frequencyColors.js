/** Shared filter-frequency colors (AHU rows + hospital calendar). */
export const FREQUENCY_COLORS = {
  30: "#FFFF99",
  60: "#F2CEEF",
  90: "#CCFFFF",
  120: "#E5A065",
  180: "#C5E0B3",
  365: "#FBE4D5",
  540: "#F3F0D9",
  730: "#49BFBC",
  1095: "#FFD965",
};

export function frequencyColor(freqDays) {
  if (!freqDays && freqDays !== 0) return null;
  const n = Number(freqDays);
  if (!Number.isFinite(n)) return null;
  return FREQUENCY_COLORS[n] || null;
}

/** Stronger fills for the year calendar so months stay readable at a glance. */
export const CALENDAR_FREQUENCY_COLORS = {
  30: "#FFE14D",
  60: "#F0B3E6",
  90: "#7EE0E0",
  120: "#E8894A",
  180: "#8FD67A",
  365: "#F0B27A",
  540: "#E8E2B8",
  730: "#2EB8B5",
  1095: "#FFD24D",
};

export function calendarFrequencyColor(freqDays) {
  const n = Number(freqDays);
  if (!Number.isFinite(n)) return "#E2E8F0";
  return CALENDAR_FREQUENCY_COLORS[n] || FREQUENCY_COLORS[n] || "#E2E8F0";
}

export function frequencyShortLabel(days) {
  const n = Number(days);
  const map = {
    30: "30 DAY",
    60: "60 DAY",
    90: "90 DAY",
    120: "120 DAY",
    180: "180 DAY",
    365: "365 DAY",
    540: "18 MO",
    730: "2 YEARS",
    1095: "3 YEARS",
  };
  return map[n] || `${n} DAY`;
}

export const MONTH_LABELS = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];

export const MONTH_SHORT = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
