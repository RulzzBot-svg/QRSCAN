import { useEffect, useMemo, useState } from "react";
import { getFrequencyCalendar } from "../../api/admin";
import { calendarFrequencyColor, frequencyShortLabel, MONTH_SHORT } from "../../utils/frequencyColors";
import { cellKey, slicesForMonth } from "../../utils/hospitalFrequencyCalendar";

const CHECKS_KEY = "adminFreqCalendarChecks";
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

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
    <svg viewBox="0 0 20 20" className="w-3 h-3" aria-hidden="true">
      <path
        fill="none"
        stroke="#14532d"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 10.8 8.1 15.2 16.2 5"
      />
    </svg>
  );
}

export default function HospitalFrequencyCalendar() {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checks, setChecks] = useState(loadChecks);

  const display = cache[year] || null;

  useEffect(() => {
    try {
      localStorage.setItem(CHECKS_KEY, JSON.stringify(checks));
    } catch {
      /* ignore quota */
    }
  }, [checks]);

  useEffect(() => {
    if (!open || display) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    getFrequencyCalendar(year)
      .then((res) => {
        if (cancelled) return;
        setCache((prev) => ({ ...prev, [year]: res.data }));
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load frequency calendar", err);
        setError(err?.response?.data?.error || "Could not load the calendar.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, year, display]);

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

  return (
    <section className="rounded-xl border border-base-300 bg-base-100 mb-5 overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-base-200/60"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`text-xs text-base-content/40 transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
        <span className="flex-1 min-w-0">
          <span className="font-semibold block">Frequency calendar</span>
          <span className="text-xs text-base-content/50">
            Year of changeout months. Opens on click so this page stays fast.
          </span>
        </span>
      </button>

      {open ? (
        <div className="border-t border-base-300">
          <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-3 pb-2">
            <p className="text-xs text-base-content/60">
              Each month is one square. If a hospital has more than one cadence that month, the square splits. Click a
              color to check it off.
            </p>
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
                  className="inline-flex items-center text-[10px] font-semibold tracking-wide px-1.5 py-0.5 rounded border border-black/10"
                  style={{ backgroundColor: item.color }}
                >
                  {item.label}
                </span>
              ))}
            </div>
          ) : null}

          {error ? (
            <div className="alert alert-error mx-4 mb-3 text-sm">
              <span>{error}</span>
            </div>
          ) : null}

          {loading && !display ? (
            <div className="py-8 text-center">
              <span className="loading loading-spinner loading-sm" />
            </div>
          ) : display ? (
            <div className="freq-cal-wrap px-2 pb-3">
              <table className="freq-cal">
                <thead>
                  <tr>
                    <th className="name-col">HOSPITAL</th>
                    {MONTHS.map((month) => (
                      <th key={month} className="month-h">
                        {MONTH_SHORT[month - 1]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(display.hospitals || []).map((row) => (
                    <tr key={row.id ?? row.name}>
                      <th className="name-col">{row.name}</th>
                      {MONTHS.map((month) => {
                        const slices = slicesForMonth(row, month);
                        return (
                          <td key={`${row.id}-${month}`} className="cell">
                            <div className={`freq-month ${slices.length ? "" : "is-empty"}`}>
                              {slices.map((freq) => {
                                const checked = Boolean(checks[cellKey(row.id, year, month, freq)]);
                                return (
                                  <button
                                    key={freq}
                                    type="button"
                                    className={`freq-slice ${checked ? "is-checked" : ""}`}
                                    style={{ backgroundColor: calendarFrequencyColor(freq) }}
                                    aria-pressed={checked}
                                    aria-label={`${row.name} ${MONTH_SHORT[month - 1]} ${frequencyShortLabel(freq)}${checked ? " checked" : ""}`}
                                    title={`${row.name} · ${MONTH_SHORT[month - 1]} · ${frequencyShortLabel(freq)}`}
                                    onClick={() => toggle(row.id, month, freq)}
                                  >
                                    {checked ? <CheckMark /> : null}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
