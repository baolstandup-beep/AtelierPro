-- ============================================================
-- MODULE SAAS - PLANS, ABONNEMENTS ET PAIEMENTS (WAVE / ORANGE MONEY)
-- ============================================================

-- 1. TABLES DES PLANS
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL DEFAULT 0 CHECK (price >= 0),
    currency TEXT NOT NULL DEFAULT 'XOF',
    duration_days INTEGER NOT NULL DEFAULT 30 CHECK (duration_days > 0),
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans FORCE ROW LEVEL SECURITY;

CREATE POLICY "Plans_select_public"
    ON plans FOR SELECT
    TO authenticated
    USING (is_active = true);


-- 2. TABLE DES ABONNEMENTS (SUBSCRIPTIONS)
CREATE TYPE saas_subscription_status AS ENUM ('pending', 'active', 'expired', 'cancelled');

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    atelier_id UUID NOT NULL REFERENCES ateliers(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
    status saas_subscription_status NOT NULL DEFAULT 'pending',
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour accélérer les recherches d'abonnements par atelier
CREATE INDEX IF NOT EXISTS idx_subscriptions_atelier ON subscriptions(atelier_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_subscription_per_atelier 
    ON subscriptions(atelier_id) 
    WHERE status = 'active';

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY;

CREATE POLICY "Subscriptions_select_atelier_members"
    ON subscriptions FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.atelier_id = subscriptions.atelier_id));


-- 3. TABLE DES PAIEMENTS (SUBSCRIPTION_PAYMENTS)
CREATE TYPE saas_payment_status AS ENUM ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded');

CREATE TABLE IF NOT EXISTS subscription_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    atelier_id UUID NOT NULL REFERENCES ateliers(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('WAVE', 'ORANGE_MONEY', 'STRIPE', 'MANUAL')),
    provider_payment_id TEXT UNIQUE,
    provider_transaction_id TEXT UNIQUE,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'XOF',
    status saas_payment_status NOT NULL DEFAULT 'pending',
    metadata JSONB DEFAULT '{}'::jsonb,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sub_payments_atelier ON subscription_payments(atelier_id);

ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments FORCE ROW LEVEL SECURITY;

CREATE POLICY "Payments_select_atelier_members"
    ON subscription_payments FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.atelier_id = subscription_payments.atelier_id));


-- 4. TABLE DES WEBHOOK EVENTS (IDEMPOTENCE & AUDIT)
CREATE TABLE IF NOT EXISTS payment_webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL,
    event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payment_reference TEXT,
    signature_valid BOOLEAN NOT NULL DEFAULT false,
    processing_status TEXT NOT NULL DEFAULT 'pending', -- pending, processed, error
    error_message TEXT,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_provider_event UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_reference ON payment_webhook_events(payment_reference);

ALTER TABLE payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhook_events FORCE ROW LEVEL SECURITY;
-- Seul le système (Service Role) accède à cette table. Aucune policy pour le public.


-- TRIGGERS DE MISE À JOUR (updated_at)
CREATE OR REPLACE FUNCTION update_saas_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_plans_updated_at BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION update_saas_tables_updated_at();
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_saas_tables_updated_at();
CREATE TRIGGER trg_subscription_payments_updated_at BEFORE UPDATE ON subscription_payments FOR EACH ROW EXECUTE FUNCTION update_saas_tables_updated_at();
