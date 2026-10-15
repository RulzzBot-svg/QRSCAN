import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_AFC_MARK_PATH,
  fileToLogoDataUrl,
  loadImageAsDataUrl,
  loadStoredQrLogo,
  applyLogoToLabels,
  printQrLabels,
  QR_LAYOUTS,
  QR_LAYOUT_OPTIONS,
  isZebraLayout,
  usesQrCenterLogo,
  usesSideLogo,
  storeQrLogo,
  toBlackAndWhiteDataUrl,
  zebraHeadline,
  hospitalLine,
  AFC_COMPANY_NAME,
  AFC_PHONE,
} from "../../utils/qrLabels";

export default function QrLabelPrintModal({
  open,
  labels,
  title,
  loading,
  error,
  onClose,
}) {
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [afcLogoDataUrl, setAfcLogoDataUrl] = useState("");
  const [bwLogoDataUrl, setBwLogoDataUrl] = useState("");
  const [logoBusy, setLogoBusy] = useState(false);
  const [displayLabels, setDisplayLabels] = useState(labels || []);
  const [layout, setLayout] = useState(QR_LAYOUTS.zebra);

  useEffect(() => {
    if (!open) return;
    setLayout(QR_LAYOUTS.zebra);
    setLogoDataUrl(loadStoredQrLogo());
    loadImageAsDataUrl(DEFAULT_AFC_MARK_PATH)
      .then(setAfcLogoDataUrl)
      .catch(() => setAfcLogoDataUrl(""));
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    if (!logoDataUrl) {
      setBwLogoDataUrl("");
      return undefined;
    }
    toBlackAndWhiteDataUrl(logoDataUrl)
      .then((next) => {
        if (!cancelled) setBwLogoDataUrl(next);
      })
      .catch(() => {
        if (!cancelled) setBwLogoDataUrl(logoDataUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [logoDataUrl]);

  const zebraLogo = bwLogoDataUrl || logoDataUrl || afcLogoDataUrl;
  const centerLogo = usesQrCenterLogo(layout)
    ? zebraLogo
    : !isZebraLayout(layout)
      ? logoDataUrl
      : "";

  useEffect(() => {
    let cancelled = false;
    const source = Array.isArray(labels) ? labels : [];
    if (!centerLogo) {
      setDisplayLabels(source);
      return undefined;
    }
    setLogoBusy(true);
    (async () => {
      try {
        const next = await applyLogoToLabels(source, centerLogo);
        if (!cancelled) setDisplayLabels(next);
      } catch (err) {
        console.error("Logo overlay failed", err);
        if (!cancelled) setDisplayLabels(source);
      } finally {
        if (!cancelled) setLogoBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [labels, centerLogo]);

  const printOptions = useMemo(
    () => ({
      layout,
      sideLogoDataUrl: usesSideLogo(layout) ? zebraLogo : "",
    }),
    [layout, zebraLogo]
  );

  const count = displayLabels?.length || 0;
  const selected = QR_LAYOUT_OPTIONS.find((opt) => opt.id === layout);
  const hint = selected?.hint || "Scan opens FilterInfo";
  const zebra = isZebraLayout(layout);

  if (!open) return null;

  const onLogoFile = async (file) => {
    if (!file) return;
    setLogoBusy(true);
    try {
      const dataUrl = await fileToLogoDataUrl(file);
      storeQrLogo(dataUrl);
      setLogoDataUrl(dataUrl);
    } catch (err) {
      console.error(err);
      alert("Could not read that image. Try a PNG or JPG logo.");
    } finally {
      setLogoBusy(false);
    }
  };

  const clearLogo = () => {
    storeQrLogo("");
    setLogoDataUrl("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-base-100 border border-base-300 rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between gap-3 p-3 border-b">
          <div>
            <div className="font-semibold">{title || "AHU QR Labels"}</div>
            <div className="text-xs opacity-70">
              {loading || logoBusy
                ? "Generating QR codes…"
                : `${count} label${count === 1 ? "" : "s"} ready to print · ${hint}`}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-sm btn-primary"
              type="button"
              disabled={loading || logoBusy || !count}
              onClick={() => printQrLabels(displayLabels, title, printOptions)}
            >
              Print {count === 1 ? "this AHU" : "all"}
            </button>
            <button className="btn btn-sm" type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="px-3 py-2 border-b flex flex-wrap items-center gap-3">
          <label className="btn btn-xs">
            {logoDataUrl ? "Change logo" : "Add logo"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => onLogoFile(e.target.files?.[0])}
            />
          </label>
          {logoDataUrl ? (
            <>
              <img
                src={zebra ? zebraLogo : logoDataUrl}
                alt="QR logo"
                className="h-6 object-contain border bg-white"
              />
              <button className="btn btn-xs btn-ghost" type="button" onClick={clearLogo}>
                Use AFC logo
              </button>
            </>
          ) : (
            <span className="text-xs opacity-70">
              {layout === QR_LAYOUTS.zebraMark
                ? "AFC mark sits in the center of the QR"
                : layout === QR_LAYOUTS.zebraBanner
                  ? "Thin full-width bar, AFC mark in the QR"
                  : zebra
                    ? "AFC mark on the label, hospital under the AHU name"
                    : "Optional company logo sits in the center of each QR"}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="opacity-70">Design</span>
            <select
              className="select select-xs select-bordered max-w-[16rem]"
              value={layout}
              onChange={(e) => setLayout(e.target.value)}
            >
              {QR_LAYOUT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-3 overflow-auto">
          {loading && (
            <div className="text-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          )}

          {!loading && error && (
            <div className="alert alert-error text-sm">{error}</div>
          )}

          {!loading && !error && count === 0 && (
            <div className="text-center py-12 opacity-70">No AHUs to print.</div>
          )}

          {!loading && !error && count > 0 && zebra && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {displayLabels.map((label) => (
                <ZebraPreviewCard
                  key={label.id}
                  label={label}
                  layout={layout}
                  logoSrc={usesSideLogo(layout) ? zebraLogo : ""}
                  onPrint={() => printQrLabels([label], label.name, printOptions)}
                />
              ))}
            </div>
          )}

          {!loading && !error && count > 0 && !zebra && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {displayLabels.map((label) => (
                <div
                  key={label.id}
                  className="border border-base-300 rounded-lg p-3 text-center bg-white text-black"
                >
                  <img
                    src={label.qrDataUrl}
                    alt={`QR for ${label.name}`}
                    className="mx-auto w-40 h-40"
                  />
                  {(label.hospital || label.building) && (
                    <div className="text-xs opacity-70 mt-2">
                      {[label.hospital, label.building].filter(Boolean).join(" · ")}
                    </div>
                  )}
                  <div className="font-semibold text-sm mt-1">{label.name}</div>
                  {label.location ? (
                    <div className="text-xs mt-0.5">{label.location}</div>
                  ) : null}
                  <button
                    className="btn btn-xs mt-2"
                    type="button"
                    onClick={() =>
                      printQrLabels([label], label.name, { layout: QR_LAYOUTS.single })
                    }
                  >
                    Print this AHU
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ZebraPreviewCard({ label, layout, logoSrc, onPrint }) {
  const headline = zebraHeadline(label);
  const hospital = hospitalLine(label);
  const flip = layout === QR_LAYOUTS.zebraFlip;
  const banner = layout === QR_LAYOUTS.zebraBanner;

  const copy = (
    <div
      className={`flex-1 min-w-0 pl-3 pr-2 py-2 flex flex-col relative ${
        flip ? "border-r-2 border-black" : "border-l-2 border-black"
      }`}
    >
      {logoSrc ? (
        <img
          src={logoSrc}
          alt="AFC"
          className={`absolute top-1 h-7 w-auto max-w-[40%] object-contain ${
            flip ? "left-2" : "right-2"
          }`}
        />
      ) : null}
      <div className={`flex-1 flex flex-col justify-center pt-2 ${logoSrc ? "pr-6" : ""}`}>
        <div className="font-extrabold text-lg leading-tight tracking-tight break-words">
          {headline}
        </div>
        {hospital ? (
          <div className="text-[10px] font-bold tracking-[0.14em] uppercase mt-1.5">
            {hospital}
          </div>
        ) : null}
      </div>
      {!banner ? (
        <div className="mt-auto">
          <div className="border-t border-black mb-1.5" />
          <div className="text-[9px] font-extrabold uppercase tracking-wide leading-tight">
            {AFC_COMPANY_NAME}
          </div>
          <div className="text-[10px] font-extrabold tracking-wide leading-tight mt-0.5">
            {AFC_PHONE}
          </div>
        </div>
      ) : null}
    </div>
  );

  const qr = (
    <div className={`${banner ? "w-[38%]" : "w-[40%]"} flex items-center justify-center shrink-0`}>
      <img
        src={label.qrDataUrl}
        alt={`QR for ${headline}`}
        className="h-[72%] w-auto aspect-square"
      />
    </div>
  );

  return (
    <div className="border border-base-300 rounded bg-white text-black overflow-hidden">
      <div
        className="flex flex-col bg-white overflow-hidden w-full"
        style={{ aspectRatio: "2 / 1" }}
      >
        {banner ? (
          <div className="bg-black text-white flex items-center justify-between gap-2 px-2 py-[3px] shrink-0 w-full">
            <span className="text-[8px] font-extrabold uppercase tracking-wide truncate">
              {AFC_COMPANY_NAME}
            </span>
            <span className="text-[9px] font-extrabold shrink-0">{AFC_PHONE}</span>
          </div>
        ) : null}
        <div className={`flex items-stretch flex-1 min-h-0 ${flip ? "flex-row-reverse" : ""}`}>
          {qr}
          {copy}
        </div>
      </div>
      <div className="p-2 border-t border-base-300 bg-base-100">
        <button className="btn btn-xs" type="button" onClick={onPrint}>
          Print this AHU
        </button>
      </div>
    </div>
  );
}
