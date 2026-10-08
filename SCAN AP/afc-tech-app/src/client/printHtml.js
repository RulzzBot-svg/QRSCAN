/** Print an HTML document without a blank popup. window.open+noopener was emptying the export. */

export function printHtmlDocument(html) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("title", "Print");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    downloadHtml(html);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => {
    setTimeout(() => {
      try {
        iframe.remove();
      } catch {
        /* ignore */
      }
    }, 1500);
  };

  const runPrint = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch {
      downloadHtml(html);
    } finally {
      cleanup();
    }
  };

  iframe.contentWindow.addEventListener("afterprint", cleanup);
  setTimeout(runPrint, 500);
}

function downloadHtml(html) {
  try {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "afc-export.html";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch {
    alert("Could not open the print dialog. Try another browser.");
  }
}
