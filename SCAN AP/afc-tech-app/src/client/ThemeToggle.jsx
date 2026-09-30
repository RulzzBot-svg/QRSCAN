export default function ThemeToggle({ theme, onToggle, compact, fit }) {
  const dark = theme === "afc-dark";
  const shape = compact
    ? "btn btn-ghost btn-sm btn-square"
    : fit
      ? "btn btn-ghost btn-sm"
      : "btn btn-ghost btn-sm w-full justify-start";
  return (
    <button
      type="button"
      className={shape}
      onClick={onToggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={dark}
    >
      <span className="inline-flex items-center gap-2 min-w-0">
        {dark ? <SunIcon className="w-4 h-4 shrink-0" /> : <MoonIcon className="w-4 h-4 shrink-0" />}
        {compact ? null : (
          <span className="whitespace-nowrap">{dark ? "Light mode" : "Dark mode"}</span>
        )}
      </span>
    </button>
  );
}

function SunIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M5 12H3M21 12h-2M6.2 6.2 4.8 4.8M19.2 19.2l-1.4-1.4M17.8 6.2l1.4-1.4M6.2 17.8l-1.4 1.4" />
    </svg>
  );
}

function MoonIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z" />
    </svg>
  );
}
