/**
 * AtelierPro — Client Chariow (https://chariow.dev). Côté serveur uniquement.
 * Le montant n'est jamais envoyé : il est porté par le produit Chariow lié au plan.
 */
import { toChariowPhone } from './phone.ts';

const API_URL = (process.env.CHARIOW_API_URL || 'https://api.chariow.com/v1').replace(/\/$/, '');

/** Chariow remplace Bictorys uniquement quand le drapeau est explicitement activé. */
export function isChariowEnabled(): boolean {
  return (process.env.PAYMENT_PROVIDER || '').toLowerCase() === 'chariow';
}

export interface ChariowCheckoutInput {
  productId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  reference: string;
  redirectUrl: string;
  customerIp?: string;
}

export interface ChariowCheckoutResult {
  checkoutUrl: string;
  saleId: string | null;
  transactionId: string | null;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

export async function createChariowCheckout(input: ChariowCheckoutInput): Promise<ChariowCheckoutResult> {
  const apiKey = process.env.CHARIOW_API_KEY;
  if (!apiKey) throw new Error('Chariow non configuré (CHARIOW_API_KEY manquante).');
  const phone = toChariowPhone(input.phone);
  if (!phone) throw new Error('Numéro de téléphone invalide.');

  const body: Record<string, unknown> = {
    product_id: input.productId,
    email: input.email,
    first_name: input.firstName,
    last_name: input.lastName,
    phone,
    redirect_url: input.redirectUrl,
    custom_metadata: { payment_reference: input.reference },
  };
  if (input.customerIp) body.customer_ip = input.customerIp;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  let res: Response;
  try {
    res = await fetch(`${API_URL}/checkout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch {
    throw new Error('Impossible de contacter Chariow.');
  } finally {
    clearTimeout(timer);
  }

  const json = (await res.json().catch(() => null)) as { message?: string; data?: { step?: string; payment?: { checkout_url?: string; transaction_id?: string }; purchase?: { id?: string } } } | null;
  if (!res.ok || !json?.data) {
    console.error('[CHARIOW_CHECKOUT_ERROR]', res.status, json?.message);
    throw new Error(json?.message || `Chariow a refusé la demande (${res.status}).`);
  }
  // `payment` (guide) et `awaiting_payment` (doc bonnes pratiques) : on accepte les deux.
  const step = json.data.step;
  const url = json.data.payment?.checkout_url;
  if ((step !== 'payment' && step !== 'awaiting_payment') || !url) {
    throw new Error('Réponse Chariow inattendue (pas de lien de paiement).');
  }
  return {
    checkoutUrl: url,
    saleId: json.data.purchase?.id ?? null,
    transactionId: json.data.payment?.transaction_id ?? null,
  };
}

export interface PulseSale {
  eventType: 'success' | 'failed' | 'abandoned' | 'other';
  saleId: string | null;
  reference: string | null;
  amount: number;
  currency: string;
  productId: string | null;
}

/** Extrait les champs utiles d'un Pulse `*.sale`. Pure, testable. */
type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

export function parsePulse(eventName: string, payload: Json): PulseSale {
  const sale: Json = payload?.sale ?? {};
  const meta = sale.custom_metadata ?? payload?.custom_metadata ?? {};
  const eventType =
    eventName === 'successful.sale' ? 'success'
    : eventName === 'failed.sale' ? 'failed'
    : eventName === 'abandoned.sale' ? 'abandoned'
    : 'other';
  return {
    eventType,
    saleId: sale.id ? String(sale.id) : null,
    reference: typeof meta.payment_reference === 'string' ? meta.payment_reference : null,
    amount: Number(sale.amount?.value ?? 0),
    currency: String(sale.amount?.currency ?? ''),
    productId: payload?.product?.id ? String(payload.product.id) : null,
  };
}
