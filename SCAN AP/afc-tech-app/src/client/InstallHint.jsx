import { useEffect, useState } from "react";
import { isIosDevice, isStandaloneDisplay } from "./pwa";

export default function InstallHint() {
  const [deferred, setDeferred] = useState(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (isStandaloneDisplay()) return undefined;
    setIos(isIosDevice());
    const onPrompt = (event) => {
      event.preventDefault();
      setDeferred(event);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (hidden || isStandaloneDisplay()) return null;
  if (!deferred && !ios) return null;

  return (
    <div className="rounded-2xl bg-base-100 border border-base-300 p-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-semibold text-sm">Add to Home Screen</p>
        <p className="text-xs text-base-content/60 mt-1">
          {ios
            ? "On iPhone: tap Share, then Add to Home Screen. Opens the portal like an app — still read-only."
            : "Install this portal on your phone. Status only — no way to change filters from here."}
        </p>
        {deferred ? (
          <button
            type="button"
            className="btn btn-primary btn-sm mt-3"
            onClick={async () => {
              deferred.prompt();
              try {
                await deferred.userChoice;
              } catch {
                /* ignore */
              }
              setDeferred(null);
            }}
          >
            Add to home screen
          </button>
        ) : null}
      </div>
      <button
        type="button"
        className="btn btn-ghost btn-xs"
        aria-label="Dismiss add to home screen"
        onClick={() => setHidden(true)}
      >
        ✕
      </button>
    </div>
  );
}
