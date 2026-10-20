/** Filter-type glyphs. FINAL is a v-bank for now; other types come later. */

export function isVBankFilter(phase) {
  const key = String(phase || "")
    .trim()
    .toLowerCase();
  if (!key) return false;
  if (/\bhepa\b/.test(key)) return false;
  if (/\bv[-\s]?banks?\b/.test(key)) return true;
  if (key.startsWith("final") || /\bfinal\b/.test(key)) return true;
  return false;
}

export function VBankIcon({ className, variant = "outline" }) {
  if (variant === "filled") return <VBankFilled className={className} />;
  return <VBankOutline className={className} />;
}

function VBankOutline({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {/* Cassette face with 4 vertical V-bank bays */}
      <path d="M3.5 8.2h17v12.2c0 .7-.6 1.3-1.3 1.3H4.8c-.7 0-1.3-.6-1.3-1.3V8.2z" />
      <path d="M7.8 8.2v13.5M12 8.2v13.5M16.2 8.2v13.5" />
      {/* Sawtooth top — the V pockets */}
      <path d="M3.5 8.2 5.7 4.4 8 8.2 10.2 4.4 12 8.2 13.8 4.4 16 8.2 18.3 4.4 20.5 8.2" />
    </svg>
  );
}

function VBankFilled({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M3.5 8.2 5.7 4.4 8 8.2 10.2 4.4 12 8.2 13.8 4.4 16 8.2 18.3 4.4 20.5 8.2v12.2c0 .7-.6 1.3-1.3 1.3H4.8c-.7 0-1.3-.6-1.3-1.3V8.2zm1.6 1.4h1.8v10.3H5.1V9.6zm3.9 0h1.8v10.3H9V9.6zm3.9 0h1.8v10.3h-1.8V9.6zm3.9 0h1.8v10.3h-1.8V9.6z"
      />
    </svg>
  );
}
