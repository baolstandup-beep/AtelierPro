import crypto from 'crypto';
import type { SaaSProvider } from '@/lib/types';

const DEFAULT_API_URL = 'https://api.bictorys.com';

export interface BictorysChargeInput {
  provider: SaaSProvider;
  amount: number;
  reference: string;
  successUrl: string;
  errorUrl: string;
  customer?: { name?: string; phone?: string; email?: string; country?: string };
  otp?: string;
}

export interface BictorysChargeResult {
  transactionId: string;
  checkoutUrl: string;
  redirectUrl?: string;
  link?: string;
  qrCode?: string;
  message?: string;
}

function getConfig() {
  const apiKey = process.env.BICTORYS_API_KEY;
  if (!apiKey) throw new Error('BICTORYS_API_KEY non configurée.');
  return {
    apiKey,
    apiUrl: (process.env.BICTORYS_API_URL || DEFAULT_API_URL).replace(/\/$/, ''),
  };
}

export function normalizeBictorysPhone(phone?: string) {
  if (!phone) return undefined;
  const clean = phone.replace(/[\s().-]/g, '');
  if (clean.startsWith('+')) return clean;
  if (clean.startsWith('221')) return `+${clean}`;
  return clean.length === 9 ? `+221${clean}` : `+${clean}`;
}

export async function createBictorysCharge(input: BictorysChargeInput): Promise<BictorysChargeResult> {
  const { apiKey, apiUrl } = getConfig();
  const paymentType = input.provider === 'WAVE' ? 'wave_money' : 'orange_money';
  const phone = normalizeBictorysPhone(input.customer?.phone);
  const payload: Record<string, unknown> = {
    amount: Math.round(input.amount),
    currency: 'XOF',
    country: input.customer?.country || 'SN',
    paymentReference: input.reference,
    successRedirectUrl: input.successUrl,
    ErrorRedirectUrl: input.errorUrl,
    customerObject: {
      name: input.customer?.name || 'Client AtelierPro',
      ...(phone ? { phone } : {}),
      ...(input.customer?.email ? { email: input.customer.email } : {}),
      country: input.customer?.country || 'SN',
    },
  };
  if (input.otp) payload.otp = input.otp;

  const response = await fetch(`${apiUrl}/pay/v1/charges?payment_type=${paymentType}`, {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000),
  });

  const responseText = await response.text();
  let data: Record<string, unknown> = {};
  try { data = responseText ? JSON.parse(responseText) : {}; } catch {}

  if (!response.ok) {
    console.error('[BICTORYS_CHARGE_ERROR]', response.status, responseText.slice(0, 500));
    const message = typeof data.message === 'string' ? data.message : '';
    throw new Error(message || `Bictorys a refusé le paiement (${response.status}).`);
  }

  const transactionId = String(data.transactionId || '');
  const redirectUrl = typeof data.redirectUrl === 'string' ? data.redirectUrl : undefined;
  const link = typeof data.link === 'string' ? data.link : undefined;
  const checkoutUrl = link || redirectUrl;
  if (!transactionId || !checkoutUrl) {
    throw new Error('Réponse Bictorys incomplète : transaction ou URL absente.');
  }

  return {
    transactionId,
    checkoutUrl,
    redirectUrl,
    link,
    qrCode: typeof data.qrCode === 'string' ? data.qrCode : undefined,
    message: typeof data.message === 'string' ? data.message : undefined,
  };
}

export function verifyBictorysWebhook(rawBody: string, headers: Headers): boolean {
  const secret = process.env.BICTORYS_WEBHOOK_SECRET;
  if (!secret) return false;
  const signature = headers.get('x-webhook-signature');
  const timestamp = headers.get('x-webhook-timestamp');

  if (signature && timestamp) {
    const parsedTimestamp = Number(timestamp);
    if (!Number.isFinite(parsedTimestamp) || Math.abs(Date.now() - parsedTimestamp) > 5 * 60 * 1000) return false;
    const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
    return timingSafeEqual(signature, expected);
  }

  const staticKey = headers.get('x-secret-key');
  return Boolean(staticKey && timingSafeEqual(staticKey, secret));
}

function timingSafeEqual(received: string, expected: string) {
  try {
    const receivedBuffer = Buffer.from(received);
    const expectedBuffer = Buffer.from(expected);
    return receivedBuffer.length === expectedBuffer.length
      && crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
  } catch { return false; }
}
