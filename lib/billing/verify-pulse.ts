import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Vérifie la signature d'un Pulse Chariow.
 * Contrat (https://chariow.dev/en/guides/pulse-security) :
 *   x-chariow-signature = "sha256=" + hex(HMAC_SHA256(corps_brut, whsec_...))
 * Le corps doit être les octets bruts reçus, jamais un JSON re-sérialisé.
 */
export function verifyPulseSignature(
  rawBody: Buffer | string,
  receivedSignature: string | null | undefined,
  secret: string,
): boolean {
  if (!secret || !receivedSignature) return false

  const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex')

  const a = Buffer.from(receivedSignature)
  const b = Buffer.from(expected)

  // timingSafeEqual lève une exception si les longueurs diffèrent.
  return a.length === b.length && timingSafeEqual(a, b)
}
