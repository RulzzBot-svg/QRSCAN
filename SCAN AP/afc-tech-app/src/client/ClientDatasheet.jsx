import { useEffect, useMemo, useState } from "react";
import { loadClientDatasheet } from "./api";
import { exportDatasheetPdf } from "./exportTechPacketPdf";

export default function ClientDatasheet() {
  const [sheet, setSheet] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadClientDatasheet()
      .then((data) => {
        if (!cancelled) setSheet(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.error || "Could not load datasheet");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const unitCount = useMemo(
    () => (sheet?.buildings || []).reduce((n, b) => n + (b.units || []).length, 0),
    [sheet]
  );

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }
  if (error) return <div className="alert alert-error text-sm">{error}</div>;
  if (!sheet) return null;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Technical datasheet</h2>
          <p className="text-sm text-base-content/60">
            {sheet.hospital || "Hospital"} — {unitCount} units. Stages, sizes, quantities, and change
            frequencies. No catalog part numbers or prices.
          </p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => exportDatasheetPdf(sheet)}>
          Download PDF
        </button>
      </div>
      {(sheet.buildings || []).length === 0 ? (
        <p className="text-sm text-base-content/50">No units on file for this hospital.</p>
      ) : null}
      {(sheet.buildings || []).map((group) => (
        <section key={group.building} className="space-y-3">
          <h3 className="font-semibold">{group.building}</h3>
          {(group.units || []).map((u, ui) => (
            <div key={`${group.building}-${u.name}-${ui}`} className="rounded-2xl bg-base-100 border border-base-300 p-4">
              <p className="font-semibold">{u.name}</p>
              <p className="text-xs text-base-content/50">{u.location || "—"}</p>
              <div className="overflow-x-auto mt-3">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Stage</th>
                      <th>Size</th>
                      <th>Qty</th>
                      <th>Frequency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(u.filters || []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-base-content/50">
                          No active filters
                        </td>
                      </tr>
                    ) : (
                      (u.filters || []).map((f, i) => (
                        <tr key={`${f.phase || "f"}-${i}`}>
                          <td>{f.phase || "Filter"}</td>
                          <td>{f.size || "—"}</td>
                          <td>{f.quantity ?? "—"}</td>
                          <td>{f.frequency_label || "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
