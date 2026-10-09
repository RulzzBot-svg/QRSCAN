import { isClientDirector, readClientUser } from "./api";
import { exportTechPacketPdf } from "./exportTechPacketPdf";
import { AFC_PHONE, AFC_PHONE_TEL } from "../utils/qrLabels";

export default function ClientDocs() {
  const director = isClientDirector(readClientUser());
  const hospital = readClientUser()?.hospital_name || "Hospital";

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold">Documentation</h2>
        <p className="text-sm text-base-content/60">How to use the portal.</p>
      </div>

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
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => exportTechPacketPdf({ hospitalName: hospital })}
        >
          Download technical packet PDF
        </button>
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

function DocCard({ title, children }) {
  return (
    <section className="rounded-2xl bg-base-100 border border-base-300 p-5 space-y-2">
      <h3 className="font-semibold">{title}</h3>
      <div className="text-sm text-base-content/70 space-y-2">{children}</div>
    </section>
  );
}
