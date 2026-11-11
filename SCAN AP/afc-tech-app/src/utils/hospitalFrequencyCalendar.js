import { MONTH_LABELS } from "./frequencyColors.js";

export function parseLocalDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value).trim());
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function addDays(date, days) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + Number(days));
  return next;
}

export function cadenceDates(anchor, frequencyDays, start, last, { includeForward = false } = {}) {
  const day = parseLocalDate(anchor);
  const step = Number(frequencyDays) || 0;
  if (!day || step <= 0 || !start || !last || start > last) return [];

  const found = [];
  let cursor = day;
  let guard = 0;
  while (cursor >= start && guard < 64) {
    if (cursor <= last) found.push(new Date(cursor.getTime()));
    cursor = addDays(cursor, -step);
    guard += 1;
  }
  if (includeForward) {
    cursor = addDays(day, step);
    while (cursor <= last && guard < 80) {
      if (cursor >= start) found.push(new Date(cursor.getTime()));
      cursor = addDays(cursor, step);
      guard += 1;
    }
  }
  found.sort((a, b) => a - b);
  return found;
}

export function monthsForFilter(filter, year) {
  const freq = Number(filter?.frequency_days);
  if (!freq || freq <= 0 || !year) return [];
  if (freq <= 31) return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  const start = new Date(year, 0, 1);
  const last = new Date(year, 11, 31);
  const lastSvc = parseLocalDate(filter.last_service_date);
  const anchor = lastSvc || start;
  const months = new Set();
  for (const visit of cadenceDates(anchor, freq, start, last, { includeForward: true })) {
    months.add(visit.getMonth() + 1);
  }
  return [...months].sort((a, b) => a - b);
}

function hospitalKey(id) {
  return id == null ? "unknown" : String(id);
}

function filtersForAhu(filtersByAhu, ahuId) {
  if (!filtersByAhu) return [];
  const rows = filtersByAhu[String(ahuId)] ?? filtersByAhu[ahuId];
  return Array.isArray(rows) ? rows : [];
}

export function buildFrequencyCalendar({ hospitals = [], ahus = [], filtersByAhu = {}, year } = {}) {
  const y = Number(year) || new Date().getFullYear();
  const byHospital = new Map();

  for (const hospital of hospitals) {
    byHospital.set(hospitalKey(hospital.id), {
      id: hospital.id,
      name: hospital.name || "Hospital",
      freqs: new Map(),
    });
  }

  for (const ahu of ahus) {
    const hid = hospitalKey(ahu.hospital_id);
    if (!byHospital.has(hid)) {
      byHospital.set(hid, {
        id: ahu.hospital_id,
        name: ahu.hospital || "Unknown",
        freqs: new Map(),
      });
    }
    const row = byHospital.get(hid);
    for (const filter of filtersForAhu(filtersByAhu, ahu.id)) {
      if (filter.is_active === false || filter._inactive) continue;
      const freq = Number(filter.frequency_days);
      if (!freq || freq <= 0) continue;
      if (!row.freqs.has(freq)) row.freqs.set(freq, new Set());
      const bucket = row.freqs.get(freq);
      for (const month of monthsForFilter(filter, y)) bucket.add(month);
    }
  }

  const freqSet = new Set();
  for (const row of byHospital.values()) {
    for (const freq of row.freqs.keys()) freqSet.add(freq);
  }
  const frequencies = [...freqSet].sort((a, b) => a - b);

  const rows = [...byHospital.values()].sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" })
  );

  const months = MONTH_LABELS.map((label, index) => {
    const month = index + 1;
    const freqs = frequencies.filter((freq) => rows.some((row) => row.freqs.get(freq)?.has(month)));
    return { month, label, freqs };
  });

  return { year: y, frequencies, months, rows };
}

export function monthKey(year, month) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

export function cellKey(hospitalId, monthKeyValue, freq) {
  return `${hospitalId}:${monthKeyValue}:${freq}`;
}

export function slicesForMonth(row, key) {
  if (!row) return [];
  if (row.cells) {
    const raw = row.cells[key] ?? row.cells[String(key)] ?? [];
    return [...raw]
      .map(Number)
      .filter((n) => n > 0)
      .sort((a, b) => a - b);
  }
  const freqs = [];
  const month = Number(String(key).slice(-2));
  for (const [freq, months] of row.freqs || []) {
    if (months.has(month)) freqs.push(Number(freq));
  }
  return freqs.sort((a, b) => a - b);
}

export function frequenciesForMonth(hospitals, key) {
  const found = new Set();
  for (const row of hospitals || []) {
    for (const freq of slicesForMonth(row, key)) found.add(freq);
  }
  return [...found].sort((a, b) => a - b);
}
