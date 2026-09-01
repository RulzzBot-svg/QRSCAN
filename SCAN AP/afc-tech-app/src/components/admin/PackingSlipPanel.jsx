import { useState } from "react";
import { fetchPackingSlipFromJobs } from "../../api/qb";
import {
  copyPackingSlipToClipboard,
  groupLinesByAhu,
  qbCopySummary,
  selectionToFiltersByAhu,
} from "../../utils/qbPackingSlip";
import PackingSlipReviewModal from "./PackingSlipReviewModal";

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 7);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function PackingSlipPanel({
  hospitals,
  selectedHospitalKey,
  selectedFiltersForQB,
  ahus,
  onOpenManualReview,
  onCopied,
}) {
  const defaults = defaultDateRange();
  const [fromDate, setFromDate] = useState(defaults.from);
  const [toDate, setToDate] = useState(defaults.to);
  const [loading, setLoading] = useState(false);
  const [jobFiltersByAhu, setJobFiltersByAhu] = useState(null);
  const [showJobReview, setShowJobReview] = useState(false);
  const [loadMeta, setLoadMeta] = useState(null);

  const manualCount = Object.values(selectedFiltersForQB || {}).reduce(
    (n, arr) => n + (arr?.length || 0),
    0
  );

  const hospitalName =
    hospitals.find((h) => String(h.id) === String(selectedHospitalKey))?.name ||
    "selected hospital";

  const loadFromJobs = async () => {
    if (!selectedHospitalKey) {
      alert("Select a hospital on the left first.");
      return;
    }
    setLoading(true);
    try {
      const data = await fetchPackingSlipFromJobs({
        hospitalId: selectedHospitalKey,
        from: fromDate,
        to: toDate,
      });
      const grouped = groupLinesByAhu(data.lines || []);
      const count = (data.lines || []).length;
      if (!count) {
        alert(
          `No replaced filters found for ${hospitalName} between ${fromDate} and ${toDate}.\n\n` +
            "Make sure technicians marked filters as Replaced (not just Inspected) when submitting jobs."
        );
        return;
      }
      setJobFiltersByAhu(grouped);
      setLoadMeta({ count, jobs: data.job_count });
      setShowJobReview(true);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || err.message || "Failed to load completed jobs");
    } finally {
      setLoading(false);
    }
  };

  const openManualReview = () => {
    if (!manualCount) {
      alert("Check AHUs or filters below first.");
      return;
    }
    onOpenManualReview(selectionToFiltersByAhu(selectedFiltersForQB, ahus));
  };

  const copyManualSelection = async () => {
    if (!manualCount) {
      alert("Check AHUs or filters below first.");
      return;
    }
    const filtersByAhu = selectionToFiltersByAhu(selectedFiltersForQB, ahus);
    try {
      await copyPackingSlipToClipboard(filtersByAhu, { mode: "special" });
      onCopied?.(qbCopySummary(filtersByAhu, "special"));
    } catch (err) {
      console.error(err);
      alert("Could not copy. Allow clipboard access for this site, then try again.");
    }
  };

  return (
    <>
      <div className="mx-4 mb-3 p-3 bg-base-100 border border-base-300 rounded-lg">
        <div className="text-sm font-semibold mb-2">QuickBooks packing slip</div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs opacity-70 block">Job completed from</label>
            <input
              type="date"
              className="input input-xs input-bordered"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs opacity-70 block">to</label>
            <input
              type="date"
              className="input input-xs input-bordered"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <button
            type="button"
            className={`btn btn-sm btn-primary ${loading ? "loading" : ""}`}
            disabled={loading || !selectedHospitalKey}
            onClick={loadFromJobs}
          >
            Load replaced filters from jobs
          </button>
          {!selectedHospitalKey && (
            <span className="text-xs text-warning">← Pick a hospital first to load from jobs</span>
          )}
          <button
            type="button"
            className="btn btn-sm btn-accent"
            disabled={!manualCount}
            onClick={copyManualSelection}
          >
            Copy for QuickBooks ({manualCount})
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            disabled={!manualCount}
            onClick={openManualReview}
          >
            Review first
          </button>
        </div>
        <p className="text-xs opacity-60 mt-2">
          Check an AHU to select every filter in it, then Copy for QuickBooks. In QB click QTY
          and press Ctrl+Alt+V — not Ctrl+V.
        </p>
      </div>

      <PackingSlipReviewModal
        open={showJobReview}
        onClose={() => setShowJobReview(false)}
        filtersByAhu={jobFiltersByAhu || {}}
        sourceLabel={
          loadMeta
            ? `${loadMeta.count} replaced filter(s) from ${loadMeta.jobs} job(s)`
            : "completed jobs"
        }
        onCopied={onCopied}
        onSuccess={() => {
          setShowJobReview(false);
          setJobFiltersByAhu(null);
        }}
      />
    </>
  );
}
