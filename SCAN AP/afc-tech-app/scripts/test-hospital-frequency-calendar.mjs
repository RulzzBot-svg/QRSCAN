import { monthsForFilter, buildFrequencyCalendar, slicesForMonth } from "../src/utils/hospitalFrequencyCalendar.js";
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
const janSlices = slicesForMonth(choc, 1);
assert(janSlices[0] === 30 && janSlices[1] === 90, `January CHOC splits 30+90, got ${janSlices}`);
assert(slicesForMonth(choc, 2).length === 1 && slicesForMonth(choc, 2)[0] === 30, "February CHOC is 30-day only");
const hunt = grid.rows.find((r) => r.name === "Huntington");
assert(slicesForMonth(hunt, 10)[0] === 365, "October Huntington is 365-day");
assert(slicesForMonth(hunt, 1).length === 0, "January Huntington is empty");

assert(frequencyColor(30) === "#FFFF99", "30-day yellow");
assert(frequencyShortLabel(730) === "2 YEARS", "2-year short label");

console.log("hospitalFrequencyCalendar tests passed");
