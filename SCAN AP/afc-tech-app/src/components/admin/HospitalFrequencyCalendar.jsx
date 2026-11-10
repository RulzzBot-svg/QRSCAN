import { useEffect, useMemo, useState } from "react";
import { calendarFrequencyColor, frequencyShortLabel } from "../../utils/frequencyColors";
import { buildFrequencyCalendar, cellKey } from "../../utils/hospitalFrequencyCalendar";

const CHECKS_KEY = "adminFreqCalendarChecks";

function loadChecks() {
  try {
    const raw = localStorage.getItem(CHECKS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function CheckMark() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" aria-hidden="true">
      <path
        fill="none"
        stroke="#14532d"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 10.8 8.1 15.2 16.2 5"
      />
    </svg>
  );
}

export default function HospitalFrequencyCalendar({ source, loading }) {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [checks, setChecks] = useState(loadChecks);

  useEffect(() => {
    try {
      localStorage.setItem(CHECKS_KEY, JSON.stringify(checks));
    } catch {
      /* ignore quota */
    }
  }, [checks]);

  const display = useMemo(() => {
    if (!source) return null;
    return buildFrequencyCalendar({ ...source, year });
  }, [source, year]);

  const legend = useMemo(
    () =>
      (display?.frequencies || []).map((days) => ({
        days,
        label: frequencyShortLabel(days),
        color: calendarFrequencyColor(days),
      })),
    [display]
  );

  const toggle = (hospitalId, month, freq) => {
    const key = cellKey(hospitalId, year, month, freq);
    setChecks((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });
  };

  if (loading && !source) {
    return (
      <div className="rounded-xl border border-base-300 bg-base-100 p-6 text-center mb-5">
        <span className="loading loading-spinner loading-sm" />
      </div>
    );
  }

  if (!display || !display.rows?.length) return null;

  return (
    <section className="rounded-xl border border-base-300 bg-base-100 mb-5 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 pb-2">
        <div>
          <h2 className="text-lg font-bold">Frequency calendar</h2>
          <p className="text-xs text-base-content/60 mt-0.5">
            Months light up when that hospital has a changeout on that cadence. Click a colored cell to check it off.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className="btn btn-xs btn-ghost" onClick={() => setYear((y) => y - 1)} aria-label="Previous year">
            ‹
          </button>
          <div className="text-sm font-semibold tabular-nums min-w-[3.5rem] text-center">{year}</div>
          <button type="button" className="btn btn-xs btn-ghost" onClick={() => setYear((y) => y + 1)} aria-label="Next year">
            ›
          </button>
        </div>
      </div>

      {legend.length ? (
        <div className="flex flex-wrap gap-2 px-4 pb-3">
          {legend.map((item) => (
            <span
              key={item.days}
              className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-wide px-1.5 py-0.5 rounded border border-black/10"
              style={{ backgroundColor: item.color }}
            >
              {item.label}
            </span>
          ))}
        </div>
      ) : null}

      <div className="freq-cal-wrap">
        <table className="freq-cal">
          <thead>
            <tr>
              <th rowSpan={2} className="name-col">
                HOSPITALS / MONTHS
              </th>
              {display.months.map((m) => (
                <th key={m.month} className="month-h" colSpan={Math.max(m.freqs.length, 1)}>
                  {m.label}
                </th>
              ))}
            </tr>
            <tr>
              {display.months.map((m) =>
                m.freqs.length ? (
                  m.freqs.map((freq) => (
                    <th
                      key={`${m.month}-${freq}`}
                      className="freq-h"
                      style={{ backgroundColor: calendarFrequencyColor(freq) }}
                    >
                      {frequencyShortLabel(freq)}
                    </th>
                  ))
                ) : (
                  <th key={`${m.month}-empty`} className="freq-h freq-h-empty" />
                )
              )}
            </tr>
          </thead>
          <tbody>
            {display.rows.map((row) => (
              <tr key={row.id ?? row.name}>
                <th className="name-col">{row.name}</th>
                {display.months.map((m) =>
                  (m.freqs.length ? m.freqs : [null]).map((freq) => {
                    if (freq == null) {
                      return <td key={`${row.id}-${m.month}-empty`} className="cell" />;
                    }
                    const on = Boolean(row.freqs.get(freq)?.has(m.month));
                    const checked = Boolean(checks[cellKey(row.id, year, m.month, freq)]);
                    return (
                      <td key={`${row.id}-${m.month}-${freq}`} className="cell">
                        {on ? (
                          <button
                            type="button"
                            className={`freq-cell ${checked ? "is-checked" : ""}`}
                            style={{ backgroundColor: calendarFrequencyColor(freq) }}
                            aria-pressed={checked}
                            aria-label={`${row.name} ${m.label} ${frequencyShortLabel(freq)}${checked ? " checked" : ""}`}
                            title={`${row.name} · ${m.label} · ${frequencyShortLabel(freq)}`}
                            onClick={() => toggle(row.id, m.month, freq)}
                          >
                            {checked ? <CheckMark /> : null}
                          </button>
                        ) : null}
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
