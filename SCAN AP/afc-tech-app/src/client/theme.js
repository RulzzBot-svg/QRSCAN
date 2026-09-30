const THEME_KEY = "client_theme";

export function readClientTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "afc" || stored === "afc-dark") return stored;
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "afc-dark";
  }
  return "afc";
}

export function storeClientTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore */
  }
}

export function toggleClientTheme(current) {
  return current === "afc-dark" ? "afc" : "afc-dark";
}
