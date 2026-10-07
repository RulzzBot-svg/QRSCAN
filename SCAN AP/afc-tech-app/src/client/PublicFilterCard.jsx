import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPublicUnit } from "./api";
import { prettyDate } from "./format";
import { StatusBadge } from "./StatusBadge";
import { AFC_COMPANY_NAME, AFC_PHONE, AFC_PHONE_TEL } from "../utils/qrLabels";

export default function PublicFilterCard({ ahuId }) {
  const [card, setCard] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPublicUnit(ahuId)
      .then((res) => {
        if (!cancelled) setCard(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.error || "Unit not found");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ahuId]);

  return (
    <div data-theme="afc" className="min-h-dvh bg-base-200 text-base-content">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div>
          <p className="text-[11px] font-extrabold tracking-[0.18em] text-primary">
            {AFC_COMPANY_NAME}
          </p>
          <h1 className="text-xl font-bold mt-1">Filter status</h1>
          <p className="text-xs text-base-content/60 mt-1">
            Read-only sticker view. No logins, prices, or changes from this page.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        ) : null}

        {error ? <div className="alert alert-error text-sm">{error}</div> : null}

        {card ? (
          <>
            <div className="rounded-2xl bg-base-100 border border-base-300 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-base-content/50">{card.hospital || "Hospital"}</p>
                  <h2 className="text-2xl font-bold leading-tight">{card.name}</h2>
                  <p className="text-sm text-base-content/60 mt-1">
                    {[card.building, card.location].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <StatusBadge status={card.status} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-base-content/50">Last serviced</p>
                  <p className="font-semibold">{prettyDate(card.last_service_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-base-content/50">Next due</p>
                  <p className="font-semibold">{prettyDate(card.next_due_date)}</p>
                </div>
              </div>
            </div>

            <h3 className="font-semibold">Filters</h3>
            {(card.filters || []).length === 0 ? (
              <p className="text-sm text-base-content/50">No active filters on this unit.</p>
            ) : (
              <div className="space-y-2">
                {(card.filters || []).map((f, i) => (
                  <div
                    key={`${f.phase || "filter"}-${f.size || i}`}
                    className="rounded-2xl bg-base-100 border border-base-300 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{f.phase || "Filter"}</p>
                        <p className="text-sm text-base-content/60">
                          {f.size || "—"} · qty {f.quantity ?? "—"}
                        </p>
                      </div>
                      <StatusBadge status={f.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                      <div>
                        <p className="text-xs text-base-content/50">Last serviced</p>
                        <p>{prettyDate(f.last_service_date)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-base-content/50">Next due</p>
                        <p>{prettyDate(f.next_due_date)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-base-content/50">Frequency</p>
                        <p>{f.frequency_label || "—"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}

        <div className="rounded-2xl bg-base-100 border border-base-300 p-4 space-y-2">
          <p className="font-semibold text-sm">Need AFC?</p>
          <a className="btn btn-primary w-full" href={`tel:${AFC_PHONE_TEL}`}>
            Call {AFC_PHONE}
          </a>
          <p className="text-xs text-base-content/50">
            Hospital staff can send a message after signing into the portal. This sticker page
            cannot change anything.
          </p>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <Link className="btn btn-outline" to="/client/login">
            Hospital portal sign in
          </Link>
          <Link className="link link-primary text-center text-xs" to="/">
            AFC technician sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
