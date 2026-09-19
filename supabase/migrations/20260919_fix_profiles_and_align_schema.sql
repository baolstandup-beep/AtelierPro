-- ============================================================
-- AtelierPro — Migration P0-A
-- Correction du double schéma ateliers/workshops
-- ============================================================

-- 1. Ajouter les colonnes manquantes à la table profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS atelier_id UUID,
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'owner';

-- 2. Créer la table 'ateliers' pour compatibilité ascendante
--    (utilisée par les Server Actions d'inscription)
CREATE TABLE IF NOT EXISTS ateliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  phone TEXT,
  address TEXT,
  city TEXT,
  logo_url TEXT,
  currency TEXT NOT NULL DEFAULT 'XOF',
  currency_symbol TEXT NOT NULL DEFAULT 'FCFA',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ateliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ateliers FORCE ROW LEVEL SECURITY;

-- RLS : un utilisateur peut voir/modifier son atelier
DROP POLICY IF EXISTS "Ateliers: lecture propre" ON ateliers;
CREATE POLICY "Ateliers: lecture propre"
  ON ateliers FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT atelier_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Ateliers: création par utilisateur authentifié" ON ateliers;
CREATE POLICY "Ateliers: création par utilisateur authentifié"
  ON ateliers FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Ateliers: mise à jour par propriétaire" ON ateliers;
CREATE POLICY "Ateliers: mise à jour par propriétaire"
  ON ateliers FOR UPDATE
  TO authenticated
  USING (
    id IN (SELECT atelier_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    id IN (SELECT atelier_id FROM profiles WHERE id = auth.uid())
  );

-- 3. Trigger updated_at pour ateliers
DO $$ BEGIN
  CREATE TRIGGER trg_ateliers_updated_at
    BEFORE UPDATE ON ateliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 4. Créer la table subscription_payments (manquante dans schema.sql)
CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE,
  atelier_id UUID REFERENCES ateliers(id) ON DELETE CASCADE,
  plan_id UUID,
  provider TEXT NOT NULL DEFAULT 'WAVE',
  provider_transaction_id TEXT,
  reference TEXT NOT NULL UNIQUE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'XOF',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled', 'expired')),
  raw_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments FORCE ROW LEVEL SECURITY;

CREATE POLICY "SubPayments: lecture atelier"
  ON subscription_payments FOR SELECT
  TO authenticated
  USING (
    atelier_id IN (SELECT atelier_id FROM profiles WHERE id = auth.uid())
    OR workshop_id IN (
      SELECT workshop_id FROM workshop_members WHERE user_id = auth.uid() AND status = 'ACTIVE'
    )
  );

-- 5. Renommer payment_webhook_events → aligner sur le schéma réel (webhook_events)
-- On ajoute les colonnes manquantes à webhook_events pour le webhook Wave

ALTER TABLE webhook_events
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS signature_valid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'processed', 'error')),
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 6. Vue de compatibilité payment_webhook_events → webhook_events
CREATE OR REPLACE VIEW payment_webhook_events AS
  SELECT
    id,
    provider,
    event_id,
    payload,
    signature AS signature_valid,
    processed,
    error_message,
    received_at,
    processed_at,
    payment_reference,
    processing_status,
    CASE WHEN processed THEN 'processed' ELSE processing_status END AS status
  FROM webhook_events;

-- 7. RPC confirm_subscription_payment
--    Confirme atomiquement un paiement d'abonnement et active la subscription
CREATE OR REPLACE FUNCTION public.confirm_subscription_payment(
  p_payment_id UUID,
  p_event_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_workshop_id UUID;
  v_atelier_id UUID;
  v_plan_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- 1. Récupérer les infos du paiement
  SELECT workshop_id, atelier_id, plan_id
  INTO v_workshop_id, v_atelier_id, v_plan_id
  FROM subscription_payments
  WHERE id = p_payment_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found or already processed: %', p_payment_id;
  END IF;

  -- 2. Marquer le paiement comme payé
  UPDATE subscription_payments
  SET status = 'paid',
      paid_at = now(),
      updated_at = now()
  WHERE id = p_payment_id;

  -- 3. Activer/prolonger l'abonnement si on est dans le système workshops
  IF v_workshop_id IS NOT NULL AND v_plan_id IS NOT NULL THEN
    v_expires_at := now() + INTERVAL '30 days';

    INSERT INTO subscriptions (workshop_id, plan_id, status, starts_at, expires_at, provider, provider_reference)
    VALUES (v_workshop_id, v_plan_id, 'ACTIVE', now(), v_expires_at, 'WAVE', p_event_id)
    ON CONFLICT DO NOTHING;

    UPDATE subscriptions
    SET status = 'ACTIVE',
        expires_at = v_expires_at,
        updated_at = now()
    WHERE workshop_id = v_workshop_id AND status IN ('TRIAL', 'PAST_DUE', 'EXPIRED');
  END IF;

  -- 4. Enregistrer l'événement webhook avec idempotence
  UPDATE webhook_events
  SET processed = true,
      processed_at = now(),
      processing_status = 'processed'
  WHERE event_id = p_event_id AND provider = 'WAVE';

END;
$$;
