import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { isClientDirector, loadClientDatasheet, readClientUser } from "./api";
import { packetSectionsForScreen } from "./docsContent";
import { exportDatasheetPdf, exportTechPacketPdf } from "./exportTechPacketPdf";
import { AFC_PHONE, AFC_PHONE_TEL } from "../utils/qrLabels";

const DIRECTOR_TABS = [
  { id: "guide", label: "How to use" },
  { id: "datasheet", label: "Datasheet" },
  { id: "tech", label: "Technical packet" },
];

function normalizeTab(requested, director) {
  if (!director) return "guide";
  if (requested === "it" || requested === "code") return "tech";
  if (requested === "datasheet" || requested === "tech") return requested;
  return "guide";
}

export default function ClientDocs() {
  const director = isClientDirector(readClientUser());
  const [params, setParams] = useSearchParams();
  const tab = normalizeTab(params.get("tab") || "guide", director);

  const setTab = (id) => {
    const next = new URLSearchParams(params);
    if (id === "guide") next.delete("tab");
    else next.set("tab", id);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold">Documentation</h2>
        <p className="text-sm text-base-content/60">
          How to use the portal, the equipment datasheet, and a technical packet you can download as
          PDF for hospital IT / IS.
        </p>
      </div>

      {director ? (
        <div className="flex flex-wrap gap-2">
          {DIRECTOR_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`btn btn-sm ${tab === t.id ? "btn-primary" : "btn-outline"}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : null}

      {tab === "guide" ? <GuideTab director={director} /> : null}
      {tab === "datasheet" && director ? <DatasheetTab /> : null}
      {tab === "tech" && director ? <TechTab /> : null}
    </div>
  );
}

function GuideTab({ director }) {
  return (
    <div className="space-y-4">
      <DocCard title="Scan a unit">
        Open <strong>Scan</strong>, point the camera at the AHU QR sticker, or type the unit id. You
        will see last serviced, next due, and each filter stage.
      </DocCard>
      <DocCard title="Browse units">
        <strong>Units</strong> is grouped by building in walk order. Tap a name for filter sizes,
        quantities, frequencies, and technician comments when a filter was not replaced. Those
        comments are read-only.
      </DocCard>
      <DocCard title="Status colors">
        <ul className="list-disc pl-5 space-y-1">
          <li>Green — on schedule</li>
          <li>Yellow — due soon</li>
          <li>Red — overdue</li>
        </ul>
      </DocCard>
      {director ? (
        <DocCard title="Director tools">
          Graphs can be exported as PDF. The datasheet and technical packet on this page download as
          PDF for hospital IT. This portal is not an inspection form.
          <div className="flex flex-wrap gap-2 mt-3">
            <Link className="btn btn-sm btn-outline" to="/client/docs?tab=datasheet">
              Datasheet
            </Link>
            <Link className="btn btn-sm btn-outline" to="/client/docs?tab=tech">
              Technical packet
            </Link>
            <Link className="btn btn-sm btn-outline" to="/client/graphs">
              Graphs
            </Link>
            <Link className="btn btn-sm btn-outline" to="/client/contact">
              Contact
            </Link>
          </div>
        </DocCard>
      ) : (
        <DocCard title="Hospital technician access">
          This login can scan and view every unit at this hospital. It cannot open graphs, exports,
          or the contact form, and it cannot change filters.
        </DocCard>
      )}
      <p className="text-sm text-base-content/60">
        Need AFC?{" "}
        <a className="link link-primary" href={`tel:${AFC_PHONE_TEL}`}>
          Call {AFC_PHONE}
        </a>
      </p>
    </div>
  );
}

function DatasheetTab() {
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-base-content/60">
          {sheet.hospital || "Hospital"} — {unitCount} units. Stages, sizes, quantities, and change
          frequencies. No catalog part numbers or prices.
        </p>
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

function TechTab() {
  const hospital = readClientUser()?.hospital_name || "Hospital";
  const sections = packetSectionsForScreen();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-base-content/60">
          AFC-HP-TIP-001 — architecture, HIPAA determination (45 CFR 160.103), Security Rule mapping
          (45 CFR 164.312 / NIST SP 800-66r2), and API inventory.
        </p>
        <button
          type="button"
          className="btn btn-primary btn-sm shrink-0"
          onClick={() => exportTechPacketPdf({ hospitalName: hospital })}
        >
          Download PDF
        </button>
      </div>
      {sections.map((s) => (
        <DocCard key={s.title} title={s.title}>
          {s.paragraphs.map((p) => (
            <p key={p.slice(0, 80)}>{p}</p>
          ))}
          {s.table ? (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    {s.table.headers.map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.table.rows.map((row) => (
                    <tr key={row.join("|")}>
                      {row.map((cell, i) => (
                        <td key={`${row[0]}-${i}`}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {s.bullets.length ? (
            <ul className="list-disc pl-5 space-y-1">
              {s.bullets.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </DocCard>
      ))}
    </div>
  );
}

function DocCard({ title, children }) {
  return (
    <section className="rounded-2xl bg-base-100 border border-base-300 p-5 space-y-2">
      <h3 className="font-semibold">{title}</h3>
      <div className="text-sm text-base-content/70 space-y-2">{children}</div>
    </section>
  );
}
