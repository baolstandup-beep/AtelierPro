-- ============================================================
-- PAIEMENTS SAAS (Abonnements des Ateliers)
-- ============================================================

CREATE TYPE saas_payment_status AS ENUM ('pending', 'processing', 'paid', 'failed', 'cancelled', 'expired');

CREATE TABLE IF NOT EXISTS subscription_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
    provider TEXT NOT NULL CHECK (provider IN ('WAVE', 'ORANGE_MONEY', 'STRIPE', 'MANUAL')),
    provider_transaction_id TEXT UNIQUE,
    reference TEXT UNIQUE NOT NULL,
    amount BIGINT NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'XOF',
    status saas_payment_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    paid_at TIMESTAMPTZ,
    raw_metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_sub_payments_workshop ON subscription_payments(workshop_id);
CREATE INDEX IF NOT EXISTS idx_sub_payments_reference ON subscription_payments(reference);

-- Sécurité RLS stricte sur les paiements SaaS
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments FORCE ROW LEVEL SECURITY;

-- Les membres de l'atelier peuvent voir les paiements de leur atelier (utile pour les factures)
CREATE POLICY "Les membres de l'atelier peuvent voir les paiements SaaS"
    ON subscription_payments FOR SELECT
    USING (public.user_is_member_of(workshop_id));

-- Seul le système (Service Role) peut créer ou modifier un paiement SaaS
-- IL N'Y A AUCUNE POLICY POUR INSERT / UPDATE POUR LES UTILISATEURS AUTHENTIFIÉS
-- C'est le backend qui effectue les INSERT/UPDATE avec la clé Service Role.


-- ============================================================
-- JOURNALISATION DES WEBHOOKS (Idempotence)
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL,
    event_id TEXT UNIQUE NOT NULL,
    payment_reference TEXT NOT NULL,
    event_type TEXT NOT NULL,
    signature_valid BOOLEAN NOT NULL DEFAULT false,
    processed BOOLEAN NOT NULL DEFAULT false,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,
    payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_reference ON payment_webhook_events(payment_reference);

-- RLS
ALTER TABLE payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhook_events FORCE ROW LEVEL SECURITY;

-- Seulement visible et modifiable par le système (Service Role)
-- Aucune policy définie pour 'authenticated' ou 'anon'.


-- Trigger pour updated_at sur subscription_payments
CREATE OR REPLACE FUNCTION update_subscription_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_subscription_payments_updated_at ON subscription_payments;
CREATE TRIGGER trg_subscription_payments_updated_at
    BEFORE UPDATE ON subscription_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_payments_updated_at();
