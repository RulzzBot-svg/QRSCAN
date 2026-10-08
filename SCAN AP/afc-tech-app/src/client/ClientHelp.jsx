import { Link } from "react-router-dom";
import { isClientDirector, readClientUser } from "./api";
import { AFC_PHONE, AFC_PHONE_TEL } from "../utils/qrLabels";

export default function ClientHelp() {
  const director = isClientDirector(readClientUser());

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold">How to use this portal</h2>
        <p className="text-sm text-base-content/60">
          Read-only filter status for your hospital. Nothing here can change AFC’s survey.
        </p>
      </div>

      <section className="rounded-2xl bg-base-100 border border-base-300 p-5 space-y-2">
        <h3 className="font-semibold">Scan a unit</h3>
        <p className="text-sm text-base-content/70">
          Open <strong>Scan</strong>, point the camera at the AHU QR sticker, or type the unit id. You
          will see last serviced, next due, and each filter stage.
        </p>
      </section>

      <section className="rounded-2xl bg-base-100 border border-base-300 p-5 space-y-2">
        <h3 className="font-semibold">Browse units</h3>
        <p className="text-sm text-base-content/70">
          <strong>Units</strong> is grouped by building in walk order. Tap a name for filter sizes,
          quantities, frequencies, and technician comments when a filter was not replaced.
        </p>
      </section>

      <section className="rounded-2xl bg-base-100 border border-base-300 p-5 space-y-2">
        <h3 className="font-semibold">Status colors</h3>
        <ul className="text-sm text-base-content/70 list-disc pl-5 space-y-1">
          <li>Green — on schedule</li>
          <li>Yellow — due soon</li>
          <li>Red — overdue</li>
        </ul>
      </section>

      {director ? (
        <section className="rounded-2xl bg-base-100 border border-base-300 p-5 space-y-2">
          <h3 className="font-semibold">Director tools</h3>
          <p className="text-sm text-base-content/70">
            Home and Graphs show counts only. Inspection PDF and the technical datasheet are for
            walk-throughs and IT — they still have no prices or catalog part numbers. Use Contact to
            call or message AFC.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link className="btn btn-sm btn-outline" to="/client">
              Home
            </Link>
            <Link className="btn btn-sm btn-outline" to="/client/datasheet">
              Datasheet
            </Link>
            <Link className="btn btn-sm btn-outline" to="/client/contact">
              Contact
            </Link>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl bg-base-100 border border-base-300 p-5 space-y-2">
          <h3 className="font-semibold">Hospital technician access</h3>
          <p className="text-sm text-base-content/70">
            This login can scan and view every unit at this hospital. It cannot open graphs, exports,
            or the contact form, and it cannot change filters.
          </p>
        </section>
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
