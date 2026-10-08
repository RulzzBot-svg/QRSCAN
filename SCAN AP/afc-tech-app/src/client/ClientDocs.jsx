import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { isClientDirector, loadClientDatasheet, readClientUser } from "./api";
import { CODE_SECTIONS, IT_SECTIONS } from "./docsContent";
import { datasheetHtml, exportItBrief, exportTechnicalDatasheet } from "./exportDatasheet";
import { downloadHtml } from "./printHtml";
import { AFC_PHONE, AFC_PHONE_TEL } from "../utils/qrLabels";

const DIRECTOR_TABS = [
  { id: "guide", label: "How to use" },
  { id: "datasheet", label: "Datasheet" },
  { id: "it", label: "IT brief" },
  { id: "code", label: "Technical docs" },
];

export default function ClientDocs() {
  const director = isClientDirector(readClientUser());
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab") || "guide";
  const tab = director || requested === "guide" ? requested : "guide";

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
          How to use the portal, the equipment datasheet, and pages you can hand to hospital IT.
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
      {tab === "it" && director ? <ItTab /> : null}
      {tab === "code" && director ? <CodeTab /> : null}
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
          Home and Graphs are counts only. The datasheet and IT / technical tabs on this page are
          for walk-throughs and hospital IT. Contact AFC from Home.
          <div className="flex flex-wrap gap-2 mt-3">
            <Link className="btn btn-sm btn-outline" to="/client/docs?tab=datasheet">
              Datasheet
            </Link>
            <Link className="btn btn-sm btn-outline" to="/client/docs?tab=it">
              IT brief
            </Link>
            <Link className="btn btn-sm btn-outline" to="/client/docs?tab=code">
              Technical docs
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
        <div className="flex gap-2">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => exportTechnicalDatasheet(sheet)}>
            Print
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => downloadHtml(datasheetHtml(sheet), "afc-technical-datasheet.html")}
          >
            Download HTML
          </button>
        </div>
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

function ItTab() {
  const hospital = readClientUser()?.hospital_name || "Hospital";
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => exportItBrief({ hospitalName: hospital })}>
          Print IT brief
        </button>
      </div>
      {IT_SECTIONS.map((s) => (
        <DocCard key={s.title} title={s.title}>
          {s.body.length === 1 ? (
            s.body[0]
          ) : (
            <ul className="list-disc pl-5 space-y-1">
              {s.body.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </DocCard>
      ))}
    </div>
  );
}

function CodeTab() {
  const hospital = readClientUser()?.hospital_name || "Hospital";
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() =>
            downloadHtml(codeDocHtml(hospital), "afc-hospital-portal-technical-docs.html")
          }
        >
          Download HTML
        </button>
      </div>
      {CODE_SECTIONS.map((s) => (
        <DocCard key={s.title} title={s.title}>
          <ul className="list-disc pl-5 space-y-1">
            {s.body.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
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

function codeDocHtml(hospital) {
  const esc = (s) =>
    String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const blocks = CODE_SECTIONS.map(
    (s) =>
      `<h2>${esc(s.title)}</h2><ul>${s.body.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`
  ).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>AFC portal technical docs</title>
  <style>body{font-family:Arial,Helvetica,sans-serif;margin:28px;color:#0b1f33;max-width:720px}h1{font-size:20px}h2{font-size:14px;color:#0a4d8c;margin-top:22px}li{font-size:13px;line-height:1.45}</style>
  </head><body><h1>AFC hospital portal — technical documentation</h1><p>${esc(hospital)}</p>${blocks}</body></html>`;
}
