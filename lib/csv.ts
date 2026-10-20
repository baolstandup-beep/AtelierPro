// Lecture / écriture CSV (RFC 4180) avec détection du séparateur « ; » ou « , »
// (Excel en français exporte avec « ; »).

export function detectDelimiter(text: string): ";" | "," {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  return (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
}

export function parseCsv(text: string, delimiter = detectDelimiter(text)): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"' && field === "") quoted = true;
    else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

function escapeField(value: unknown, delimiter: string): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  // Neutralise l'injection de formules dans Excel.
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+([.,]\d+)?$/.test(s)) s = `'${s}`;
  return /["\n\r]/.test(s) || s.includes(delimiter) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: unknown[][], delimiter = ";"): string {
  const lines = [headers, ...rows].map((r) => r.map((v) => escapeField(v, delimiter)).join(delimiter));
  return "﻿" + lines.join("\r\n") + "\r\n";
}
