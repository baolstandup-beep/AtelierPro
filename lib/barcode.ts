// Lecteurs USB/Bluetooth en mode clavier : sur un poste AZERTY, un lecteur
// configuré en QWERTY tape « &é"'(-è_çà » au lieu de « 1234567890 ».
const AZERTY_DIGITS: Record<string, string> = {
  "&": "1", "é": "2", '"': "3", "'": "4", "(": "5", "-": "6", "è": "7", "_": "8", "ç": "9", "à": "0",
};

export function normalizeScan(raw: string): string {
  return raw.trim().replace(/[\r\n\t]/g, "");
}

/** Variante corrigée si la saisie ressemble à des chiffres tapés en AZERTY, sinon null. */
export function azertyToDigits(raw: string): string | null {
  const value = normalizeScan(raw);
  if (!value || ![...value].some((c) => c in AZERTY_DIGITS)) return null;
  const converted = [...value].map((c) => AZERTY_DIGITS[c] ?? c).join("");
  return /^\d+$/.test(converted) ? converted : null;
}

/** Contrôle de la clé d'un EAN-13 / EAN-8 / UPC-A. */
export function isValidGtin(code: string): boolean {
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(code)) return false;
  const digits = [...code].map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

/** Caractères acceptés par le Code 128 (ASCII imprimable). */
export function isCode128Compatible(code: string): boolean {
  return code.length > 0 && code.length <= 48 && /^[\x20-\x7e]+$/.test(code);
}
