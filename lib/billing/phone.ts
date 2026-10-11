// Chariow attend phone.number (chiffres uniquement) + phone.country_code (ISO).
// Par défaut Sénégal : on retire l'indicatif +221 s'il est présent.

export function toChariowPhone(
  raw: string,
  defaultCountry = 'SN',
): { number: string; country_code: string } | null {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('00221')) digits = digits.slice(5)
  else if (digits.startsWith('221') && digits.length > 9) digits = digits.slice(3)

  if (digits.length < 6) return null
  return { number: digits, country_code: defaultCountry }
}
