/** Minimal PDF 1.4 writer (US Letter, Helvetica). No extra dependencies. */

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN_X = 54;
const MARGIN_TOP = 68;
const MARGIN_BOTTOM = 50;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

const HELV = {
  " ": 278, "!": 278, '"': 355, "#": 556, $: 556, "%": 889, "&": 667, "'": 191,
  "(": 333, ")": 333, "*": 389, "+": 584, ",": 278, "-": 333, ".": 278, "/": 278,
  0: 556, 1: 556, 2: 556, 3: 556, 4: 556, 5: 556, 6: 556, 7: 556, 8: 556, 9: 556,
  ":": 278, ";": 278, "<": 584, "=": 584, ">": 584, "?": 556, "@": 1015,
  A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 500,
  K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611,
  U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  "[": 278, "\\": 278, "]": 278, "^": 469, _: 556, "`": 333,
  a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222, j: 222,
  k: 500, l: 222, m: 833, n: 556, o: 556, p: 556, q: 556, r: 333, s: 500, t: 278,
  u: 556, v: 500, w: 722, x: 500, y: 500, z: 500,
  "{": 334, "|": 260, "}": 334, "~": 584,
};

function pdfEscape(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function ascii(s) {
  return String(s ?? "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2022/g, "-")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x20-\x7E]/g, (ch) => {
      if (ch === "\n" || ch === "\r" || ch === "\t") return " ";
      return " ";
    });
}

function widthOf(text, size) {
  let w = 0;
  for (const ch of ascii(text)) w += HELV[ch] ?? 556;
  return (w * size) / 1000;
}

function wrap(text, size, maxW) {
  const words = ascii(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (widthOf(next, size) <= maxW) {
      line = next;
    } else {
      if (line) lines.push(line);
      if (widthOf(word, size) <= maxW) {
        line = word;
      } else {
        let chunk = "";
        for (const ch of word) {
          const trial = chunk + ch;
          if (widthOf(trial, size) > maxW && chunk) {
            lines.push(chunk);
            chunk = ch;
          } else chunk = trial;
        }
        line = chunk;
      }
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

export class PdfDocument {
  constructor({ title, author = "Advanced Filtration Concepts", subject, headerLeft, headerRight, footer }) {
    this.meta = { title: ascii(title || "Document"), author: ascii(author), subject: ascii(subject || "") };
    this.headerLeft = ascii(headerLeft || "AFC");
    this.headerRight = ascii(headerRight || "");
    this.footer = ascii(footer || "Not PHI");
    this.pages = [[]];
    this.y = PAGE_H - MARGIN_TOP;
  }

  get page() {
    return this.pages[this.pages.length - 1];
  }

  addPage() {
    this.pages.push([]);
    this.y = PAGE_H - MARGIN_TOP;
  }

  ensure(h) {
    if (this.y - h < MARGIN_BOTTOM + 8) this.addPage();
  }

  _text(str, x, y, size, { bold = false, color = "0 0 0" } = {}) {
    const font = bold ? "F2" : "F1";
    this.page.push(
      `BT /${font} ${size} Tf ${color} rg ${x.toFixed(2)} ${y.toFixed(2)} Td (${pdfEscape(ascii(str))}) Tj ET`
    );
  }

  _rule(y) {
    this.page.push(`0.55 0.65 0.74 RG 0.6 w ${MARGIN_X} ${y.toFixed(2)} m ${PAGE_W - MARGIN_X} ${y.toFixed(2)} l S`);
  }

  spacer(n = 8) {
    this.y -= n;
  }

  title(text) {
    this.ensure(28);
    this._text(text, MARGIN_X, this.y, 16, { bold: true, color: "0.04 0.30 0.55" });
    this.y -= 18;
    this._rule(this.y + 6);
    this.y -= 10;
  }

  heading(text) {
    this.ensure(26);
    this.y -= 6;
    this._text(text, MARGIN_X, this.y, 12, { bold: true, color: "0.04 0.30 0.55" });
    this.y -= 16;
  }

  subheading(text) {
    this.ensure(20);
    this._text(text, MARGIN_X, this.y, 10, { bold: true });
    this.y -= 13;
  }

  paragraph(text) {
    const size = 9;
    const leading = 12;
    const lines = wrap(text, size, CONTENT_W);
    for (const line of lines) {
      this.ensure(leading);
      this._text(line, MARGIN_X, this.y, size);
      this.y -= leading;
    }
    this.y -= 4;
  }

  bullets(items) {
    const size = 9;
    const leading = 12;
    for (const item of items || []) {
      const lines = wrap(String(item), size, CONTENT_W - 14);
      lines.forEach((line, i) => {
        this.ensure(leading);
        if (i === 0) this._text("-", MARGIN_X, this.y, size);
        this._text(line, MARGIN_X + 12, this.y, size);
        this.y -= leading;
      });
    }
    this.y -= 4;
  }

  kvTable(rows) {
    const size = 8.5;
    const rowH = 14;
    const col1 = 168;
    for (const [k, v] of rows) {
      const vLines = wrap(String(v), size, CONTENT_W - col1 - 8);
      const h = Math.max(rowH, vLines.length * 11 + 4);
      this.ensure(h);
      this.page.push(`0.93 0.95 0.97 rg ${MARGIN_X} ${(this.y - h + 6).toFixed(2)} ${col1} ${h.toFixed(2)} re f`);
      this._text(k, MARGIN_X + 4, this.y - 2, size, { bold: true });
      vLines.forEach((line, i) => {
        this._text(line, MARGIN_X + col1 + 6, this.y - 2 - i * 11, size);
      });
      this.page.push(
        `0.83 0.88 0.92 RG 0.4 w ${MARGIN_X} ${(this.y - h + 6).toFixed(2)} ${CONTENT_W} ${h.toFixed(2)} re S`
      );
      this.y -= h;
    }
    this.y -= 6;
  }

  table(headers, rows) {
    const size = 8;
    const cols = headers.length;
    const widths = headers.map((_, i) => (i === 0 ? CONTENT_W * 0.28 : CONTENT_W * (0.72 / Math.max(cols - 1, 1))));
    const drawRow = (cells, { header = false } = {}) => {
      const wrapped = cells.map((c, i) => wrap(String(c ?? ""), size, widths[i] - 8));
      const lines = Math.max(1, ...wrapped.map((w) => w.length));
      const h = lines * 10 + 6;
      this.ensure(h + 2);
      const y0 = this.y - h + 4;
      if (header) {
        this.page.push(`0.04 0.30 0.55 rg ${MARGIN_X} ${y0.toFixed(2)} ${CONTENT_W} ${h.toFixed(2)} re f`);
      }
      let x = MARGIN_X;
      wrapped.forEach((wlines, i) => {
        wlines.forEach((line, li) => {
          this._text(line, x + 4, this.y - 2 - li * 10, size, {
            bold: header,
            color: header ? "1 1 1" : "0 0 0",
          });
        });
        x += widths[i];
      });
      this.page.push(`0.83 0.88 0.92 RG 0.4 w ${MARGIN_X} ${y0.toFixed(2)} ${CONTENT_W} ${h.toFixed(2)} re S`);
      this.y -= h;
    };
    drawRow(headers, { header: true });
    for (const row of rows) drawRow(row);
    this.y -= 8;
  }

  build() {
    const objects = [];
    const add = (body) => {
      objects.push(body);
      return objects.length;
    };
    add("<< /Type /Catalog /Pages 2 0 R >>");
    add("<< /Type /Pages /Kids [] /Count 0 >>");
    add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
    const pageIds = [];
    const contentIds = [];
    const total = this.pages.length;

    this.pages.forEach((ops, i) => {
      const headerOps = [];
      headerOps.push(`BT /F2 8 Tf 0.04 0.30 0.55 rg ${MARGIN_X} ${PAGE_H - 36} Td (${pdfEscape(this.headerLeft)}) Tj ET`);
      const right = this.headerRight;
      headerOps.push(
        `BT /F1 8 Tf 0.3 0.4 0.48 rg ${(PAGE_W - MARGIN_X - widthOf(right, 8)).toFixed(2)} ${PAGE_H - 36} Td (${pdfEscape(right)}) Tj ET`
      );
      headerOps.push(`0.04 0.30 0.55 RG 1 w ${MARGIN_X} ${PAGE_H - 42} m ${PAGE_W - MARGIN_X} ${PAGE_H - 42} l S`);
      const foot = `${this.footer}  |  Page ${i + 1} of ${total}`;
      headerOps.push(
        `BT /F1 8 Tf 0.3 0.4 0.48 rg ${MARGIN_X} 28 Td (${pdfEscape(foot)}) Tj ET`
      );
      headerOps.push(`0.55 0.65 0.74 RG 0.6 w ${MARGIN_X} 38 m ${PAGE_W - MARGIN_X} 38 l S`);
      const stream = [...headerOps, ...ops].join("\n");
      contentIds.push(add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`));
    });

    this.pages.forEach((_, i) => {
      pageIds.push(
        add(
          `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentIds[i]} 0 R >>`
        )
      );
    });

    objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
    const info = add(
      `<< /Title (${pdfEscape(this.meta.title)}) /Author (${pdfEscape(this.meta.author)}) /Subject (${pdfEscape(this.meta.subject)}) /Creator (AFC Hospital Portal) >>`
    );

    let offset = 0;
    const chunks = ["%PDF-1.4\n"];
    offset = chunks[0].length;
    const xref = [0];
    objects.forEach((body, idx) => {
      xref[idx + 1] = offset;
      const obj = `${idx + 1} 0 obj\n${body}\nendobj\n`;
      chunks.push(obj);
      offset += obj.length;
    });
    const xrefStart = offset;
    let xrefTable = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= objects.length; i += 1) {
      xrefTable += `${String(xref[i]).padStart(10, "0")} 00000 n \n`;
    }
    chunks.push(xrefTable);
    chunks.push(
      `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
    );
    return chunks.join("");
  }

  blob() {
    const text = this.build();
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i += 1) bytes[i] = text.charCodeAt(i) & 0xff;
    return new Blob([bytes], { type: "application/pdf" });
  }

  download(filename) {
    const url = URL.createObjectURL(this.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
}
