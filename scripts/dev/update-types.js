const fs = require('fs');
const file = '/Users/administrateur/Documents/dossier sans titre 2/atelierpro/lib/types.ts';
let code = fs.readFileSync(file, 'utf8');

const additionalTypes = `
export type SaaSProvider = 'WAVE' | 'ORANGE_MONEY' | 'STRIPE' | 'MANUAL';
export type SaaSStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'expired';

export interface SubscriptionPayment {
  id: string;
  workshop_id: string;
  plan_id: string;
  provider: SaaSProvider;
  provider_transaction_id?: string;
  reference: string;
  amount: number;
  currency: string;
  status: SaaSStatus;
  created_at: string;
  updated_at: string;
  paid_at?: string;
  raw_metadata?: Record<string, unknown>;
}

export interface PaymentWebhookEvent {
  id: string;
  provider: string;
  event_id: string;
  payment_reference: string;
  event_type: string;
  signature_valid: boolean;
  processed: boolean;
  received_at: string;
  processed_at?: string;
  payload: Record<string, unknown>;
}
`;

fs.writeFileSync(file, code + additionalTypes);
