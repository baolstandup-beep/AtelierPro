import crypto from 'crypto';

// Support du versionnement et de la rotation des secrets PIN
const PIN_SECRETS: Record<number, string> = {
  1: process.env.PIN_SECRET_V1 || process.env.PIN_SECRET || 'AtelierPro_Secure_Salt_2024',
  2: process.env.PIN_SECRET_V2 || 'AtelierPro_Secure_Salt_V2_2026',
};

export const CURRENT_CREDENTIAL_VERSION = 1;

/**
 * Génère un sel cryptographique unique par utilisateur (16 octets / 32 hex)
 */
export function generateUserSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Calcule une dérivation cryptographique forte (PBKDF2 avec 100 000 itérations SHA-256)
 * combinant le PIN utilisateur (4 chiffres), le sel unique de l'utilisateur,
 * et le secret serveur versionné.
 */
export function computePinHash(pin: string, salt: string, version = CURRENT_CREDENTIAL_VERSION): string {
  const secret = PIN_SECRETS[version] || PIN_SECRETS[1];
  const combinedSalt = `${salt}:${secret}`;
  return crypto.pbkdf2Sync(pin, combinedSalt, 100_000, 32, 'sha256').toString('hex');
}

/**
 * Vérification en temps constant pour prévenir les attaques temporelles (timing side-channel attacks)
 */
export function verifyPin(pin: string, storedHash: string, salt: string, version = CURRENT_CREDENTIAL_VERSION): boolean {
  if (!storedHash || !salt) return false;
  try {
    const computed = computePinHash(pin, salt, version);
    const bufStored = Buffer.from(storedHash, 'hex');
    const bufComputed = Buffer.from(computed, 'hex');
    if (bufStored.length !== bufComputed.length) return false;
    return crypto.timingSafeEqual(bufStored, bufComputed);
  } catch {
    return false;
  }
}
