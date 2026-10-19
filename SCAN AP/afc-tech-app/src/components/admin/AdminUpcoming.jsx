import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAdminUpcoming } from "../../api/admin";
import { formatDate } from "../../utils/dates";

const TONE = {
  overdue: {
    card: "border-error/40 bg-error/10 hover:bg-error/15",
    badge: "badge-error",
    label: "Due ASAP",
  },
  soon: {
    card: "border-warning/50 bg-warning/10 hover:bg-warning/15",
    badge: "badge-warning",
    label: "Due ASAP",
  },
  month: {
    card: "border-info/40 bg-info/10 hover:bg-info/15",
    badge: "badge-info",
    label: "This month",
  },
};

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

function matchesBucket(ahu, bucket) {
  if (bucket === "asap") return ahu.severity === "overdue" || ahu.severity === "soon";
  if (bucket === "month") return ahu.severity === "month";
  return true;
}

function AhuSquare({ ahu, onOpen }) {
  const tone = TONE[ahu.severity] || TONE.month;
  const qty = ahu.qty_due || 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`text-left rounded-xl border p-3 min-h-[7.5rem] w-full transition ${tone.card}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-semibold text-sm leading-tight line-clamp-2">{ahu.name}</div>
        <span className={`badge badge-xs shrink-0 ${tone.badge}`}>{tone.label}</span>
      </div>
      <div className="mt-2 text-sm font-medium">{dueLabel(ahu)}</div>
      <div className="mt-1 text-xs text-base-content/60">
        {ahu.filters_due} filter{ahu.filters_due === 1 ? "" : "s"}
        {qty ? ` · ${qty} pcs` : ""}
      </div>
    </button>
  );
}

export default function AdminUpcoming() {
  const navigate = useNavigate();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bucket, setBucket] = useState("all");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAdminUpcoming();
      setPayload(res.data || { hospitals: [], summary: {} });
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.error || "Could not load upcoming filters.");
      setPayload({ hospitals: [], summary: {} });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openHospital = (hospitalId) => {
    if (hospitalId == null) return;
    navigate(`/admin/ahus?hospital=${hospitalId}`);
  };

  const hospitals = useMemo(() => {
    const rows = payload?.hospitals || [];
    if (bucket === "all") return rows;
    return rows
      .map((h) => {
        const buildings = (h.buildings || [])
          .map((b) => ({
            ...b,
            ahus: (b.ahus || []).filter((a) => matchesBucket(a, bucket)),
          }))
          .filter((b) => b.ahus.length);
        return { ...h, buildings };
      })
      .filter((h) => h.buildings.length);
  }, [payload, bucket]);

  const summary = payload?.summary || {};
  const windowDays = payload?.window_days || 30;

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold">Upcoming filters</h1>
          <p className="text-sm text-base-content/60 mt-1">
            What is overdue or due in the next {windowDays} days, grouped by hospital and
            building. Tap a square to open that hospital in AHUs.
          </p>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={load} disabled={loading} type="button">
          {loading ? <span className="loading loading-spinner loading-xs" /> : "↻ Refresh"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <div className="rounded-xl border border-error/30 bg-error/5 p-4">
          <div className="text-xs uppercase tracking-wide text-error font-semibold">Due ASAP</div>
          <div className="text-3xl font-bold text-error mt-1">{summary.ahus_asap || 0}</div>
          <div className="text-xs text-base-content/60 mt-1">
            Overdue or due within 7 days
            {summary.filters_asap ? ` · ${summary.filters_asap} filters` : ""}
          </div>
        </div>
        <div className="rounded-xl border border-info/30 bg-info/5 p-4">
          <div className="text-xs uppercase tracking-wide text-info font-semibold">This month</div>
          <div className="text-3xl font-bold text-info mt-1">{summary.ahus_month || 0}</div>
          <div className="text-xs text-base-content/60 mt-1">
            Due in 8–{windowDays} days
            {summary.filters_month ? ` · ${summary.filters_month} filters` : ""}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
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

      {error ? (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      ) : null}

      {loading ? (
        <div className="py-16 text-center">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : hospitals.length === 0 ? (
        <div className="rounded-xl border border-base-300 bg-base-100 p-10 text-center">
          <div className="text-lg font-semibold">Nothing coming due</div>
          <p className="text-sm text-base-content/60 mt-1">
            No active filters are overdue or due in the next {windowDays} days.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {hospitals.map((hospital) => (
            <section key={hospital.id ?? hospital.name}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <h2 className="text-lg font-semibold">{hospital.name}</h2>
                  <p className="text-xs text-base-content/50">
                    {hospital.asap_ahus ? `${hospital.asap_ahus} ASAP` : "No ASAP"}
                    {" · "}
                    {hospital.month_ahus ? `${hospital.month_ahus} this month` : "none this month"}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-xs btn-outline"
                  onClick={() => openHospital(hospital.id)}
                >
                  Open in AHUs
                </button>
              </div>

              <div className="space-y-5">
                {(hospital.buildings || []).map((building) => (
                  <div key={`${hospital.id}-${building.id ?? building.name}`}>
                    <h3 className="text-sm font-medium text-base-content/70 mb-2">
                      {building.name}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {(building.ahus || []).map((ahu) => (
                        <AhuSquare
                          key={ahu.id}
                          ahu={ahu}
                          onOpen={() => openHospital(hospital.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
