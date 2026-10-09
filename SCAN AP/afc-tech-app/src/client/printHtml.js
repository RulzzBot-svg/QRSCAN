/** Open a printable HTML document. Zero-size iframes print blank; noopener popups were empty. */

export function printHtmlDocument(html, filename = "afc-export.html") {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  let win = null;
  try {
    win = window.open(url, "_blank");
  } catch {
    win = null;
  }
  if (!win) {
    downloadUrl(url, filename);
    return;
  }
  const tryPrint = () => {
    try {
      win.focus();
      win.print();
    } catch {
      /* user can print from the opened tab */
    }
  };
  setTimeout(tryPrint, 600);
  setTimeout(() => URL.revokeObjectURL(url), 120000);
}

export function downloadHtml(html, filename = "afc-export.html") {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  downloadUrl(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function downloadUrl(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
