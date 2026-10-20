import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAdminHospitals, getAdminUpcoming } from "../../api/admin";
import { formatDate } from "../../utils/dates";
import { frequencyLabel } from "../../client/format";
import HospitalSettingsModal from "./HospitalSettingsModal";

const FREQUENCIES = [
  { value: 30, label: "30 day" },
  { value: 60, label: "60 day" },
  { value: 90, label: "90 day" },
  { value: 180, label: "180 day" },
  { value: 365, label: "365 day" },
  { value: 540, label: "18 months" },
  { value: 730, label: "2 yrs" },
  { value: 1095, label: "3 yrs" },
];

const SEVERITY_RANK = { overdue: 0, soon: 1, month: 2, later: 3 };

function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultDateRange() {
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + 30);
  return { from: isoDate(from), to: isoDate(to) };
}

function dueInRange(due, fromDate, toDate) {
  if (!fromDate && !toDate) return true;
  if (!due) return false;
  const d = String(due).slice(0, 10);
  if (fromDate && d < fromDate) return false;
  if (toDate && d > toDate) return false;
  return true;
}

function dueLabel(ahu) {
  if (ahu.severity === "overdue") {
    const n = ahu.days_overdue || 0;
    return n === 1 ? "Overdue 1 day" : `Overdue ${n} days`;
  }
  if (ahu.days_until_due === 0) return "Due today";
  if (ahu.days_until_due === 1) return "Due tomorrow";
  if (ahu.severity === "soon") return `Due in ${ahu.days_until_due} days`;
  if (ahu.next_due_date) return formatDate(ahu.next_due_date);
  return "This month";
}

function dueTone(severity) {
  if (severity === "overdue") return "text-error font-semibold";
  if (severity === "soon") return "text-warning font-semibold";
  return "text-info";
}

function matchesBucket(severity, bucket) {
  if (bucket === "asap") return severity === "overdue" || severity === "soon";
  if (bucket === "month") return severity === "month";
  return true;
}

function worstOf(filters) {
  let worst = null;
  let nextDue = null;
  let daysUntil = null;
  let daysOverdue = 0;
  for (const f of filters) {
    const sev = f.severity;
    if (worst == null || (SEVERITY_RANK[sev] ?? 9) < (SEVERITY_RANK[worst] ?? 9)) {
      worst = sev;
    }
    if (f.next_due_date && (nextDue == null || f.next_due_date < nextDue)) {
      nextDue = f.next_due_date;
    }
    if (f.days_until_due != null) {
      daysUntil = daysUntil == null ? f.days_until_due : Math.min(daysUntil, f.days_until_due);
    }
    daysOverdue = Math.max(daysOverdue, f.days_overdue || 0);
  }
  return { worst, nextDue, daysUntil, daysOverdue };
}

function slimAhu(ahu, frequencyDays, fromDate, toDate) {
  let filters = ahu.filters || [];
  if (frequencyDays) {
    filters = filters.filter((f) => Number(f.frequency_days) === frequencyDays);
  }
  if (fromDate && toDate) {
    filters = filters.filter((f) => dueInRange(f.next_due_date, fromDate, toDate));
  }
  if (!filters.length) return null;
  const { worst, nextDue, daysUntil, daysOverdue } = worstOf(filters);
  return {
    ...ahu,
    filters,
    severity: worst,
    next_due_date: nextDue,
    days_until_due: worst === "overdue" ? 0 : daysUntil,
    days_overdue: daysOverdue,
    filters_due: filters.length,
    qty_due: filters.reduce((sum, f) => sum + (Number(f.quantity) || 0), 0),
  };
}

function slimHospital(hospital, bucket, frequencyDays, fromDate, toDate) {
  const buildings = [];
  let asap = 0;
  let month = 0;
  for (const building of hospital.buildings || []) {
    const ahus = [];
    for (const ahu of building.ahus || []) {
      const slim = slimAhu(ahu, frequencyDays, fromDate, toDate);
      if (!slim || !matchesBucket(slim.severity, bucket)) continue;
      if (slim.severity === "overdue" || slim.severity === "soon") asap += 1;
      else month += 1;
      ahus.push(slim);
    }
    if (ahus.length) buildings.push({ ...building, ahus });
  }
  return { ...hospital, buildings, asap_ahus: asap, month_ahus: month };
}

function stagesLine(ahu) {
  const phases = [];
  for (const f of ahu.filters || []) {
    const label = f.phase || "Filter";
    if (!phases.includes(label)) phases.push(label);
  }
  const freqs = [
    ...new Set(
      (ahu.filters || [])
        .map((f) => frequencyLabel(f.frequency_days))
        .filter((label) => label && label !== "—")
    ),
  ];
  const qty = ahu.qty_due || 0;
  return [phases.join(", "), freqs.join(" · "), qty ? `${qty} pcs` : null].filter(Boolean).join(" · ");
}

function AdminHospitals() {
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState([]);
  const [upcoming, setUpcoming] = useState({ hospitals: [], summary: {}, window_days: 30 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [settingsHospital, setSettingsHospital] = useState(null);
  const [bucket, setBucket] = useState("all");
  const [freqKey, setFreqKey] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const usingDates = freqKey === "dates";
  const frequencyDays = usingDates || freqKey === "all" ? null : Number(freqKey);
  const rangeFrom = usingDates ? fromDate : "";
  const rangeTo = usingDates ? toDate : "";
  const viewBucket = usingDates ? "all" : bucket;
  const upcomingQuery =
    usingDates && fromDate && toDate ? `${fromDate}:${toDate}` : usingDates ? "" : "default";

  const load = async () => {
    if (usingDates && (!fromDate || !toDate)) return;
    setLoading(true);
    setError("");
    try {
      const params = usingDates ? { from: fromDate, to: toDate } : {};
      const [hospitalRes, upcomingRes] = await Promise.all([
        getAdminHospitals(),
        getAdminUpcoming(params),
      ]);
      const roster = Array.isArray(hospitalRes?.data) ? hospitalRes.data : [];
      setHospitals(roster);
      setUpcoming(upcomingRes.data || { hospitals: [], summary: {}, window_days: 30 });
    } catch (err) {
      console.error("Failed to load hospitals", err);
      setError(err?.response?.data?.error || "Could not load hospitals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!upcomingQuery) return;
    load();
    // Frequency options are client-side; only the default window vs From–To hits the API.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upcomingQuery]);

  const dueById = useMemo(() => {
    const map = new Map();
    for (const row of upcoming.hospitals || []) {
      if (row.id != null) map.set(row.id, row);
    }
    return map;
  }, [upcoming]);

  const rows = useMemo(() => {
    const merged = hospitals.map((h) => {
      const due = dueById.get(h.id) || {
        id: h.id,
        name: h.name,
        buildings: [],
        asap_ahus: 0,
        month_ahus: 0,
      };
      return slimHospital(
        { ...h, ...due, name: h.name, id: h.id },
        viewBucket,
        frequencyDays,
        rangeFrom,
        rangeTo
      );
    });
    merged.sort((a, b) => {
      const aDue = (a.asap_ahus || 0) + (a.month_ahus || 0);
      const bDue = (b.asap_ahus || 0) + (b.month_ahus || 0);
      if (Boolean(b.asap_ahus) !== Boolean(a.asap_ahus)) return a.asap_ahus ? -1 : 1;
      if (bDue !== aDue) return bDue - aDue;
      return String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" });
    });
    return merged;
  }, [hospitals, dueById, viewBucket, frequencyDays, rangeFrom, rangeTo]);

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, h) => {
        acc.ahus_asap += h.asap_ahus || 0;
        acc.ahus_month += h.month_ahus || 0;
        if ((h.asap_ahus || 0) + (h.month_ahus || 0) > 0) acc.hospitals += 1;
        return acc;
      },
      { hospitals: 0, ahus_asap: 0, ahus_month: 0 }
    );
  }, [rows]);

  const windowDays = upcoming.window_days || 30;
  const openAhus = (hospitalId) => {
    if (hospitalId == null) return;
    navigate(`/admin/ahus?hospital=${hospitalId}`);
  };

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold">Hospitals</h1>
          <p className="text-sm text-base-content/60 mt-1">
            Open a hospital to see what is due. Settings stays on the right for portal logins.
          </p>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={load} disabled={loading} type="button">
          {loading ? <span className="loading loading-spinner loading-xs" /> : "↻ Refresh"}
        </button>
      </div>

      {usingDates ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 mb-5">
          <div className="text-xs uppercase tracking-wide text-primary font-semibold">Due in this range</div>
          <div className="text-3xl font-bold mt-1">{summary.ahus_asap + summary.ahus_month}</div>
          <div className="text-xs text-base-content/60 mt-1">
            {fromDate && toDate
              ? `${formatDate(fromDate)} – ${formatDate(toDate)}`
              : "Pick a from and to date"}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <div className="rounded-xl border border-error/30 bg-error/5 p-4">
            <div className="text-xs uppercase tracking-wide text-error font-semibold">Due ASAP</div>
            <div className="text-3xl font-bold text-error mt-1">{summary.ahus_asap}</div>
            <div className="text-xs text-base-content/60 mt-1">Overdue or due within 7 days</div>
          </div>
          <div className="rounded-xl border border-info/30 bg-info/5 p-4">
            <div className="text-xs uppercase tracking-wide text-info font-semibold">This month</div>
            <div className="text-3xl font-bold text-info mt-1">{summary.ahus_month}</div>
            <div className="text-xs text-base-content/60 mt-1">Due in 8–{windowDays} days</div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 mb-5">
        {usingDates ? null : (
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: "All due" },
              { id: "asap", label: "Due ASAP" },
              { id: "month", label: "This month" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`btn btn-sm ${bucket === opt.id ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setBucket(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
        <label className="form-control" htmlFor="hospitals-frequency">
          <span className="text-xs text-base-content/60 mb-1">Frequency</span>
          <select
            id="hospitals-frequency"
            className="select select-sm select-bordered min-w-[12rem]"
            value={freqKey}
            onChange={(e) => {
              const next = e.target.value;
              setFreqKey(next);
              if (next === "dates") {
                setBucket("all");
                if (!fromDate || !toDate) {
                  const range = defaultDateRange();
                  setFromDate(range.from);
                  setToDate(range.to);
                }
              }
            }}
          >
            <option value="all">All frequencies</option>
            {FREQUENCIES.map((opt) => (
              <option key={opt.value} value={String(opt.value)}>
                {opt.label}
              </option>
            ))}
            <option value="dates">From–to dates</option>
          </select>
        </label>
        {usingDates ? (
          <>
            <label className="form-control" htmlFor="hospitals-due-from">
              <span className="text-xs text-base-content/60 mb-1">From</span>
              <input
                id="hospitals-due-from"
                type="date"
                className="input input-sm input-bordered"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </label>
            <label className="form-control" htmlFor="hospitals-due-to">
              <span className="text-xs text-base-content/60 mb-1">To</span>
              <input
                id="hospitals-due-to"
                type="date"
                className="input input-sm input-bordered"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </label>
          </>
        ) : null}
      </div>

      {error ? (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      ) : null}

      {loading ? (
        <div className="py-16 text-center">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-base-300 bg-base-100 p-10 text-center">
          <div className="text-lg font-semibold">No hospitals</div>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((hospital) => {
            const dueCount = (hospital.asap_ahus || 0) + (hospital.month_ahus || 0);
            return (
              <div
                key={hospital.id ?? hospital.name}
                className={`rounded-xl border bg-base-100 ${
                  hospital.asap_ahus ? "border-error/40" : "border-base-300"
                }`}
              >
                <details className="group">
                  <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer">
                    <span className="text-xs text-base-content/40 transition-transform group-open:rotate-90">▶</span>
                    <span className="flex-1 min-w-0">
                      <span className="font-semibold block truncate">{hospital.name}</span>
                      <span className="text-xs text-base-content/50">
                        {[hospital.city, hospital.ahu_count != null ? `${hospital.ahu_count} AHUs` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <span className="text-xs shrink-0 text-right">
                      {usingDates ? (
                        dueCount ? (
                          <span className="font-semibold">{dueCount} due</span>
                        ) : (
                          <span className="text-base-content/50">Nothing due</span>
                        )
                      ) : (
                        <>
                          {hospital.asap_ahus ? (
                            <span className="text-error font-semibold">{hospital.asap_ahus} ASAP</span>
                          ) : (
                            <span className="text-base-content/50">No ASAP</span>
                          )}
                          <span className="text-base-content/40"> · </span>
                          {hospital.month_ahus ? (
                            <span className="text-info font-medium">{hospital.month_ahus} this month</span>
                          ) : (
                            <span className="text-base-content/50">none this month</span>
                          )}
                        </>
                      )}
                    </span>
                    <span
                      className="shrink-0"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        title="Contract settings and hospital portal logins"
                        onClick={() => setSettingsHospital(hospital)}
                      >
                        Settings
                      </button>
                    </span>
                  </summary>
                  <div className="px-4 pb-4">
                    <div className="flex justify-end mb-2">
                      <button
                        type="button"
                        className="btn btn-xs btn-outline"
                        onClick={() => openAhus(hospital.id)}
                      >
                        Open in AHUs
                      </button>
                    </div>
                    {dueCount === 0 ? (
                      <p className="text-sm text-base-content/50">Nothing due in this view.</p>
                    ) : (
                      <div className="space-y-3">
                        {(hospital.buildings || []).map((building) => (
                          <div key={`${hospital.id}-${building.id ?? building.name}`}>
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-base-content/50 mb-1">
                              {building.name}
                            </h3>
                            <ul className="divide-y divide-base-300 border border-base-300 rounded-lg overflow-hidden">
                              {(building.ahus || []).map((ahu) => (
                                <li key={ahu.id}>
                                  <button
                                    type="button"
                                    className="w-full flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-3 py-2 text-left hover:bg-base-200"
                                    onClick={() => openAhus(hospital.id)}
                                  >
                                    <span
                                      className={`font-medium ${
                                        ahu.severity === "overdue" ? "text-error" : ""
                                      }`}
                                    >
                                      {ahu.name}
                                    </span>
                                    <span className={`text-sm ${dueTone(ahu.severity)}`}>{dueLabel(ahu)}</span>
                                    <span className="text-xs text-base-content/60 ml-auto">
                                      {stagesLine(ahu)}
                                    </span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      )}

      <HospitalSettingsModal
        hospital={settingsHospital}
        open={!!settingsHospital}
        onClose={() => setSettingsHospital(null)}
      />
    </div>
  );
}

export default AdminHospitals;
