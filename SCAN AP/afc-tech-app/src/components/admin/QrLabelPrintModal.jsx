import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_AFC_LOGO_PATH,
  fileToLogoDataUrl,
  loadImageAsDataUrl,
  loadStoredQrLogo,
  applyLogoToLabels,
  printQrLabels,
  QR_LAYOUTS,
  storeQrLogo,
  toBlackAndWhiteDataUrl,
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
    loadImageAsDataUrl(DEFAULT_AFC_LOGO_PATH)
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

  useEffect(() => {
    let cancelled = false;
    const source = Array.isArray(labels) ? labels : [];
    const overlay = layout !== QR_LAYOUTS.zebra && logoDataUrl;
    if (!overlay) {
      setDisplayLabels(source);
      return undefined;
    }
    setLogoBusy(true);
    (async () => {
      try {
        const next = await applyLogoToLabels(source, logoDataUrl);
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
  }, [labels, logoDataUrl, layout]);

  const zebraLogo = bwLogoDataUrl || logoDataUrl || afcLogoDataUrl;
  const printOptions = useMemo(
    () => ({
      layout,
      sideLogoDataUrl: layout === QR_LAYOUTS.zebra ? zebraLogo : "",
    }),
    [layout, zebraLogo]
  );

  const count = displayLabels?.length || 0;
  const hint = useMemo(() => {
    if (layout === QR_LAYOUTS.zebra) {
      return "4×2 in Zebra ZD220 thermal labels (black & white)";
    }
    if (layout === QR_LAYOUTS.single) return "One AHU per printed page";
    return "3 labels per letter page";
  }, [layout]);

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
                src={layout === QR_LAYOUTS.zebra ? zebraLogo : logoDataUrl}
                alt="QR logo"
                className="h-6 object-contain border bg-white"
              />
              <button className="btn btn-xs btn-ghost" type="button" onClick={clearLogo}>
                Use AFC logo
              </button>
            </>
          ) : (
            <span className="text-xs opacity-70">
              {layout === QR_LAYOUTS.zebra
                ? "AFC logo prints beside the QR in black & white"
                : "Optional company logo sits in the center of each QR"}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="opacity-70">Layout</span>
            <select
              className="select select-xs select-bordered"
              value={layout}
              onChange={(e) => setLayout(e.target.value)}
            >
              <option value={QR_LAYOUTS.zebra}>Zebra 4×2 in</option>
              <option value={QR_LAYOUTS.sheet}>Sheet (3 per page)</option>
              <option value={QR_LAYOUTS.single}>One AHU per page</option>
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

          {!loading && !error && count > 0 && layout === QR_LAYOUTS.zebra && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {displayLabels.map((label) => (
                <ZebraPreviewCard
                  key={label.id}
                  label={label}
                  logoSrc={zebraLogo}
                  onPrint={() =>
                    printQrLabels([label], label.name, {
                      layout: QR_LAYOUTS.zebra,
                      sideLogoDataUrl: zebraLogo,
                    })
                  }
                />
              ))}
            </div>
          )}

          {!loading && !error && count > 0 && layout !== QR_LAYOUTS.zebra && (
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
                  <div className="text-[10px] opacity-60 mt-1">ID {label.id}</div>
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

function ZebraPreviewCard({ label, logoSrc, onPrint }) {
  const meta = [label.hospital, label.building].filter(Boolean).join(" · ");
  return (
    <div className="border border-base-300 rounded bg-white text-black p-2">
      <div
        className="flex items-center gap-3 bg-white"
        style={{ aspectRatio: "2 / 1" }}
      >
        <img
          src={label.qrDataUrl}
          alt={`QR for ${label.name}`}
          className="h-full w-auto aspect-square shrink-0"
        />
        <div className="min-w-0 pr-2">
          {logoSrc ? (
            <img src={logoSrc} alt="AFC" className="h-10 w-auto max-w-full object-contain mb-1" />
          ) : null}
          <div className="font-extrabold text-sm leading-tight">{label.name}</div>
          {meta ? <div className="text-xs mt-0.5">{meta}</div> : null}
          {label.location ? <div className="text-xs">{label.location}</div> : null}
          <div className="text-[10px] mt-1">ID {label.id}</div>
        </div>
      </div>
      <button className="btn btn-xs mt-2" type="button" onClick={onPrint}>
        Print this AHU
      </button>
    </div>
  );
}
