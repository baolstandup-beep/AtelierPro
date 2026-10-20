export const RECEIPT_FORMATS = [
  { key: "80", label: "Ticket 80 mm" },
  { key: "58", label: "Ticket 58 mm" },
  { key: "a4", label: "Format A4" },
];

/** Feuille de style d'impression selon le format choisi. */
export function ReceiptPageStyle({ format }: { format: string }) {
  const page = format === "a4" ? "size: A4; margin: 15mm" : `size: ${format}mm auto; margin: 2mm`;
  return <style>{`@media print { @page { ${page} } html, body { background: #fff } }`}</style>;
}

export function receiptWidth(format: string) {
  return format === "a4" ? "max-w-[180mm] text-[11pt]" : format === "58" ? "max-w-[54mm] text-[8pt]" : "max-w-[76mm] text-[9pt]";
}
