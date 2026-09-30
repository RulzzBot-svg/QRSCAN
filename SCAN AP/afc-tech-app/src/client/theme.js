const THEME_KEY = "client_appearance";
const LEGACY_THEME_KEY = "client_theme";

export const LIGHT_THEME = "afc";
export const DARK_THEME = "afc-dark";

export function readClientTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === LIGHT_THEME || stored === DARK_THEME) return stored;
    localStorage.removeItem(LEGACY_THEME_KEY);
  } catch {
    /* ignore */
  }
  return LIGHT_THEME;
}

export function storeClientTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme === DARK_THEME ? DARK_THEME : LIGHT_THEME);
    localStorage.removeItem(LEGACY_THEME_KEY);
  } catch {
    /* ignore */
  }
}

export function applyClientTheme(theme) {
  const next = theme === DARK_THEME ? DARK_THEME : LIGHT_THEME;
  try {
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.style.colorScheme = next === DARK_THEME ? "dark" : "light";
  } catch {
    /* ignore */
  }
}

export function clearDocumentTheme() {
  try {
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.colorScheme = "";
  } catch {
    /* ignore */
  }
}

export function toggleClientTheme(current) {
  return current === DARK_THEME ? LIGHT_THEME : DARK_THEME;
}
