const THEME_KEY = "client_theme";

export const LIGHT_THEME = "afc";
export const DARK_THEME = "afc-dark";

export function readClientTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === LIGHT_THEME || stored === DARK_THEME) return stored;
  } catch {
    /* ignore */
  }
  return LIGHT_THEME;
}

export function storeClientTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore */
  }
}

export function toggleClientTheme(current) {
  return current === DARK_THEME ? LIGHT_THEME : DARK_THEME;
}
