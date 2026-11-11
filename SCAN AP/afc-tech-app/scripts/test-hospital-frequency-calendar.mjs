import { readFileSync } from "fs";
import { monthsForFilter, buildFrequencyCalendar, slicesForMonth, frequenciesForMonth, cellKey, monthKey } from "../src/utils/hospitalFrequencyCalendar.js";
import { frequencyColor, frequencyShortLabel } from "../src/utils/frequencyColors.js";

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

assert(monthsForFilter({ frequency_days: 30, last_service_date: "2026-03-04" }, 2026).length === 12, "30-day fills every month");
assert(monthsForFilter({ frequency_days: 30 }, 2026).length === 12, "undated 30-day still fills every month");

const ninety = monthsForFilter({ frequency_days: 90, last_service_date: "2026-01-15" }, 2026);
assert(ninety.includes(1) && ninety.includes(4) && ninety.includes(7) && ninety.includes(10), `90-day from mid-Jan walks quarters, got ${ninety}`);
assert(!ninety.includes(2), "90-day does not fill February from a January start");

const yearly = monthsForFilter({ frequency_days: 365, last_service_date: "2025-10-10" }, 2026);
assert(yearly.length === 1 && yearly[0] === 10, `365-day lands in October, got ${yearly}`);

const grid = buildFrequencyCalendar({
  year: 2026,
  hospitals: [
    { id: 1, name: "CHOC" },
    { id: 2, name: "Huntington" },
  ],
  ahus: [
    { id: 10, hospital_id: 1, hospital: "CHOC" },
    { id: 20, hospital_id: 2, hospital: "Huntington" },
  ],
  filtersByAhu: {
    10: [
      { frequency_days: 30, last_service_date: "2026-01-01", is_active: true },
      { frequency_days: 90, last_service_date: "2026-01-15", is_active: true },
    ],
    20: [{ frequency_days: 365, last_service_date: "2025-10-10", is_active: true }],
  },
});

assert(grid.rows.length === 2, "both hospitals listed");
const choc = grid.rows.find((r) => r.name === "CHOC");
assert(choc.freqs.get(30).has(1) && choc.freqs.get(30).has(12), "CHOC 30-day paints Jan and Dec");
assert(choc.freqs.get(90).has(4), "CHOC 90-day paints April");
const jan = grid.months[0];
assert(jan.freqs.includes(30) && jan.freqs.includes(90), "January shows frequencies that are due");
assert(!jan.freqs.includes(365), "January hides 365 when nobody is due");
const oct = grid.months[9];
assert(oct.freqs.includes(365), "October shows 365 for Huntington");

const janSlices = slicesForMonth(choc, 1);
assert(janSlices[0] === 30 && janSlices[1] === 90, `January CHOC splits 30+90, got ${janSlices}`);
assert(slicesForMonth({ cells: { "2026-01": [90, 30] } }, "2026-01").join(",") === "30,90", "API cells split by month key");
assert(
  frequenciesForMonth([{ cells: { "2026-01": [90] } }, { cells: { "2026-01": [30, 90] } }], "2026-01").join(",") ===
    "30,90",
  "month frequency columns include every cadence due that month"
);
assert(monthKey(2027, 3) === "2027-03", "month key is YYYY-MM");
assert(cellKey(1, "2026-01", 90) === "1:2026-01:90", "check key includes the 24-month slot");

assert(frequencyColor(30) === "#FFFF99", "30-day yellow");
assert(frequencyShortLabel(730) === "2 YEARS", "2-year short label");

const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
assert(css.includes("flex-direction: column"), "month square splits with a horizontal cut");
assert(css.includes("inset 0 1px 0"), "stacked cadences share a horizontal seam");

console.log("hospitalFrequencyCalendar tests passed");
