import { useEffect, useState } from "react";
import { getClientDatasheet, getClientHospital, readClientUser } from "./api";
import { exportItBrief, exportTechnicalDatasheet } from "./exportDatasheet";

export default function ClientDatasheet() {
  const [sheet, setSheet] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getClientDatasheet()
      .then((res) => {
        if (!cancelled) setSheet(res.data);
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
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Technical datasheet</h2>
          <p className="text-sm text-base-content/60">
            Equipment list for {sheet.hospital}: stages, sizes, quantities, and change frequencies.
            No catalog part numbers or prices.
          </p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => exportTechnicalDatasheet(sheet)}>
            Print datasheet
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={async () => {
              let hospitalName = sheet.hospital || readClientUser()?.hospital_name;
              try {
                const res = await getClientHospital();
                hospitalName = res.data?.name || hospitalName;
              } catch {
                /* already have a name */
              }
              exportItBrief({ hospitalName });
            }}
          >
            Print IT brief
          </button>
        </div>
      </div>

      {(sheet.buildings || []).map((group) => (
        <section key={group.building} className="space-y-3">
          <h3 className="font-semibold">{group.building}</h3>
          {(group.units || []).map((u) => (
            <div key={u.name} className="rounded-2xl bg-base-100 border border-base-300 p-4">
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
                    {(u.filters || []).map((f, i) => (
                      <tr key={`${f.phase || "f"}-${i}`}>
                        <td>{f.phase || "Filter"}</td>
                        <td>{f.size || "—"}</td>
                        <td>{f.quantity ?? "—"}</td>
                        <td>{f.frequency_label || "—"}</td>
                      </tr>
                    ))}
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
