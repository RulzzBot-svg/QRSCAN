export function isClientPath(pathname = window.location.pathname) {
  return String(pathname || "").startsWith("/client");
}

export function applyPwaManifest(pathname = window.location.pathname) {
  const client = isClientPath(pathname);
  let link = document.querySelector('link[rel="manifest"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "manifest";
    document.head.appendChild(link);
  }
  link.href = client ? "/client-manifest.webmanifest" : "/manifest.webmanifest";

  let title = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (!title) {
    title = document.createElement("meta");
    title.setAttribute("name", "apple-mobile-web-app-title");
    document.head.appendChild(title);
  }
  title.setAttribute("content", client ? "AFC Portal" : "AFC Tech");

  let theme = document.querySelector('meta[name="theme-color"]');
  if (!theme) {
    theme = document.createElement("meta");
    theme.setAttribute("name", "theme-color");
    document.head.appendChild(theme);
  }
  theme.setAttribute("content", client ? "#0a4d8c" : "#0f172a");

  if (client && !document.title.includes("Hospital Portal")) {
    document.title = "AFC Hospital Portal";
  }
}

export function isStandaloneDisplay() {
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    if (window.navigator.standalone) return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function isIosDevice() {
  try {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent || "");
  } catch {
    return false;
  }
}
