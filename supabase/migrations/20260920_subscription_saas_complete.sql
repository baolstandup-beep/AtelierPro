-- ============================================================
-- AtelierPro — Migration SaaS Abonnement Complet (Production-Safe)
-- Idempotente, sans DROP destructif, compatible prod existante
-- ============================================================

-- ============================================================
-- 0. Extensions requises
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. ENUM — Ajouter les statuts manquants à saas_subscription_status
-- ============================================================
DO $$ BEGIN
  ALTER TYPE saas_subscription_status ADD VALUE IF NOT EXISTS 'grace_period';
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
  ALTER TYPE saas_subscription_status ADD VALUE IF NOT EXISTS 'suspended';
EXCEPTION WHEN others THEN null; END $$;

-- ============================================================
-- 2. TABLE plans — Ajouter colonnes manquantes si nécessaire
-- ============================================================
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS billing_interval TEXT NOT NULL DEFAULT 'month'
    CHECK (billing_interval IN ('day', 'week', 'month', 'year')),
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Insérer les plans par défaut si la table est vide
INSERT INTO public.plans (name, slug, description, price, currency, duration_days, billing_interval, features, is_active, sort_order)
VALUES
  (
    'Starter',
    'starter',
    'Idéal pour démarrer votre atelier numérique.',
    5000,
    'XOF',
    30,
    'month',
    '["Carnet de mesures illimité","Gestion des commandes","Suivi Kanban de production","Paiements Wave & Orange Money","Factures PDF & WhatsApp","Support email"]'::jsonb,
    true,
    1
  ),
  (
    'Pro',
    'pro',
    'Pour les ateliers en pleine croissance.',
    15000,
    'XOF',
    365,
    'year',
    '["Tout le plan Starter","Rapports financiers avancés","Export Excel comptable","Gestion d''équipe illimitée","Catalogue de modèles","Support prioritaire"]'::jsonb,
    true,
    2
  )
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 3. TABLE subscriptions — Ajouter colonnes manquantes
-- ============================================================
-- Renommer starts_at → started_at (si la colonne starts_at existe et started_at n'existe pas)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'starts_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE public.subscriptions RENAME COLUMN starts_at TO started_at;
  END IF;
END $$;

-- Ajouter started_at si aucune des deux n'existe
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

-- Renommer expires_at → current_period_end si besoin (compat)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'expires_at'
  ) THEN
    -- Copier les données expires_at → current_period_end si current_period_end est NULL
    UPDATE public.subscriptions
    SET current_period_end = expires_at
    WHERE current_period_end IS NULL AND expires_at IS NOT NULL;
  END IF;
END $$;

-- ============================================================
-- 4. TABLE subscription_payments — Aligner le schéma
-- ============================================================

-- Ajouter la colonne pending_signup_id (nullable, car les paiements existants n'en ont pas)
ALTER TABLE public.subscription_payments
  ADD COLUMN IF NOT EXISTS pending_signup_id UUID,
  ADD COLUMN IF NOT EXISTS period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_reference TEXT;

-- Contrainte d'unicité sur (provider, provider_reference) pour idempotence
DO $$ BEGIN
  ALTER TABLE public.subscription_payments
    ADD CONSTRAINT uq_sub_payments_provider_ref UNIQUE (provider, provider_reference);
EXCEPTION WHEN duplicate_table THEN null;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- 5. TABLE pending_signups — Pré-inscriptions avant paiement
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pending_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identité
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  workshop_name TEXT NOT NULL DEFAULT '',

  -- Plan sélectionné
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,

  -- Référence de paiement (lien vers subscription_payments)
  payment_reference TEXT UNIQUE,

  -- Statut de la pré-inscription
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'payment_processing', 'paid', 'completed', 'expired', 'failed', 'cancelled')),

  -- Timestamps de cycle de vie
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  paid_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour recherches par téléphone et statut
CREATE INDEX IF NOT EXISTS idx_pending_signups_phone ON public.pending_signups(phone);
CREATE INDEX IF NOT EXISTS idx_pending_signups_status ON public.pending_signups(status);
CREATE INDEX IF NOT EXISTS idx_pending_signups_payment_ref ON public.pending_signups(payment_reference);
CREATE INDEX IF NOT EXISTS idx_pending_signups_expires ON public.pending_signups(expires_at) WHERE status = 'pending';

-- RLS sur pending_signups : UNIQUEMENT le backend (service_role) peut manipuler cette table
ALTER TABLE public.pending_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_signups FORCE ROW LEVEL SECURITY;

-- Aucun accès utilisateur normal (ni anon ni authenticated) → service_role only
-- Les données pré-inscription sont sensibles et manipulées uniquement côté serveur

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_pending_signups_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pending_signups_updated_at ON public.pending_signups;
CREATE TRIGGER trg_pending_signups_updated_at
  BEFORE UPDATE ON public.pending_signups
  FOR EACH ROW EXECUTE FUNCTION update_pending_signups_updated_at();

-- ============================================================
-- 6. TABLE subscription_notifications — Suivi des rappels
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscription_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL
    CHECK (notification_type IN ('expiry_7_days', 'expiry_3_days', 'expiry_1_day', 'expired', 'grace_period', 'reactivated')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_sub_notif_type UNIQUE (subscription_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_sub_notifications_sub ON public.subscription_notifications(subscription_id);

ALTER TABLE public.subscription_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_notifications FORCE ROW LEVEL SECURITY;
-- Accessible en lecture par les membres de l'atelier
CREATE POLICY "SubNotifications: lecture atelier"
  ON public.subscription_notifications FOR SELECT
  USING (
    subscription_id IN (
      SELECT s.id FROM public.subscriptions s
      WHERE s.atelier_id IN (
        SELECT atelier_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- ============================================================
-- 7. FONCTION RPC — complete_pending_signup (transactionnelle)
-- Crée le compte utilisateur, l'atelier et l'abonnement après paiement confirmé
-- ============================================================
CREATE OR REPLACE FUNCTION public.complete_pending_signup(
  p_pending_signup_id UUID,
  p_auth_user_id UUID,       -- UUID de l'utilisateur créé dans auth.users
  p_atelier_id UUID          -- UUID de l'atelier créé
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_signup RECORD;
  v_plan RECORD;
  v_subscription_id UUID;
  v_period_end TIMESTAMPTZ;
BEGIN
  -- 1. Verrouiller et récupérer la pré-inscription
  SELECT * INTO v_signup
  FROM public.pending_signups
  WHERE id = p_pending_signup_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'pending_signup_not_found');
  END IF;

  -- 2. Vérifier le statut
  IF v_signup.status != 'paid' THEN
    RETURN jsonb_build_object('success', false, 'error', 'payment_not_confirmed', 'status', v_signup.status);
  END IF;

  IF v_signup.completed_at IS NOT NULL THEN
    -- Idempotence : déjà complété
    RETURN jsonb_build_object('success', true, 'already_completed', true);
  END IF;

  -- 3. Récupérer le plan
  SELECT * INTO v_plan FROM public.plans WHERE id = v_signup.plan_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'plan_not_found');
  END IF;

  -- 4. Calculer la période d'abonnement
  v_period_end := now() + (v_plan.duration_days || ' days')::INTERVAL;

  -- 5. Créer l'abonnement
  INSERT INTO public.subscriptions (
    atelier_id,
    plan_id,
    status,
    started_at,
    current_period_start,
    current_period_end
  )
  VALUES (
    p_atelier_id,
    v_signup.plan_id,
    'active',
    now(),
    now(),
    v_period_end
  )
  RETURNING id INTO v_subscription_id;

  -- 6. Lier le paiement à l'abonnement et à l'atelier
  UPDATE public.subscription_payments
  SET
    subscription_id = v_subscription_id,
    atelier_id = p_atelier_id,
    period_start = now(),
    period_end = v_period_end,
    updated_at = now()
  WHERE pending_signup_id = p_pending_signup_id;

  -- 7. Marquer la pré-inscription comme complétée
  UPDATE public.pending_signups
  SET
    status = 'completed',
    completed_at = now(),
    updated_at = now()
  WHERE id = p_pending_signup_id;

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_subscription_id,
    'period_end', v_period_end
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_pending_signup(UUID, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_pending_signup(UUID, UUID, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.complete_pending_signup(UUID, UUID, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.complete_pending_signup(UUID, UUID, UUID) TO service_role;

-- ============================================================
-- 8. FONCTION RPC — renew_subscription (logique renouvellement anticipé)
-- ============================================================
CREATE OR REPLACE FUNCTION public.renew_subscription(
  p_subscription_id UUID,
  p_payment_id UUID,
  p_event_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sub RECORD;
  v_plan RECORD;
  v_payment RECORD;
  v_new_period_start TIMESTAMPTZ;
  v_new_period_end TIMESTAMPTZ;
BEGIN
  -- 1. Verrouiller l'abonnement
  SELECT * INTO v_sub FROM public.subscriptions WHERE id = p_subscription_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'subscription_not_found');
  END IF;

  -- 2. Récupérer le paiement
  SELECT * INTO v_payment FROM public.subscription_payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'payment_not_found');
  END IF;

  -- Idempotence
  IF v_payment.status = 'paid' THEN
    RETURN jsonb_build_object('success', true, 'already_processed', true);
  END IF;

  -- 3. Récupérer le plan
  SELECT * INTO v_plan FROM public.plans WHERE id = v_payment.plan_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'plan_not_found');
  END IF;

  -- 4. Calcul de la nouvelle période (renouvellement anticipé conserve les jours)
  IF v_sub.current_period_end IS NOT NULL AND v_sub.current_period_end > now() THEN
    -- Abonnement encore actif : prolonger depuis la date d'expiration actuelle
    v_new_period_start := v_sub.current_period_start;
    -- Utiliser le bon intervalle calendaire
    IF v_plan.billing_interval = 'year' THEN
      v_new_period_end := v_sub.current_period_end + INTERVAL '1 year';
    ELSIF v_plan.billing_interval = 'month' THEN
      v_new_period_end := v_sub.current_period_end + INTERVAL '1 month';
    ELSE
      v_new_period_end := v_sub.current_period_end + (v_plan.duration_days || ' days')::INTERVAL;
    END IF;
  ELSE
    -- Abonnement expiré : nouvelle période depuis maintenant
    v_new_period_start := now();
    IF v_plan.billing_interval = 'year' THEN
      v_new_period_end := now() + INTERVAL '1 year';
    ELSIF v_plan.billing_interval = 'month' THEN
      v_new_period_end := now() + INTERVAL '1 month';
    ELSE
      v_new_period_end := now() + (v_plan.duration_days || ' days')::INTERVAL;
    END IF;
  END IF;

  -- 5. Mettre à jour l'abonnement
  UPDATE public.subscriptions
  SET
    status = 'active',
    plan_id = v_payment.plan_id,
    current_period_start = v_new_period_start,
    current_period_end = v_new_period_end,
    grace_period_end = NULL,
    suspended_at = NULL,
    cancelled_at = NULL,
    updated_at = now()
  WHERE id = p_subscription_id;

  -- 6. Mettre à jour le paiement
  UPDATE public.subscription_payments
  SET
    status = 'paid',
    paid_at = now(),
    period_start = v_new_period_start,
    period_end = v_new_period_end,
    updated_at = now()
  WHERE id = p_payment_id;

  -- 7. Marquer le webhook comme traité
  IF p_event_id IS NOT NULL THEN
    UPDATE public.webhook_events
    SET
      processed = true,
      processed_at = now(),
      processing_status = 'processed'
    WHERE event_id = p_event_id;
  END IF;

  -- 8. Réinitialiser les notifications d'expiration
  DELETE FROM public.subscription_notifications
  WHERE subscription_id = p_subscription_id
    AND notification_type IN ('expiry_7_days', 'expiry_3_days', 'expiry_1_day', 'expired', 'grace_period');

  RETURN jsonb_build_object(
    'success', true,
    'new_period_start', v_new_period_start,
    'new_period_end', v_new_period_end
  );
END;
$$;

REVOKE ALL ON FUNCTION public.renew_subscription(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.renew_subscription(UUID, UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.renew_subscription(UUID, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.renew_subscription(UUID, UUID, TEXT) TO service_role;

-- ============================================================
-- 9. FONCTION RPC — confirm_initial_subscription_payment
-- Pour les webhooks: confirme un paiement de pré-inscription
-- ============================================================
CREATE OR REPLACE FUNCTION public.confirm_initial_subscription_payment(
  p_payment_reference TEXT,
  p_provider TEXT,
  p_event_id TEXT,
  p_amount_received NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment RECORD;
  v_signup RECORD;
BEGIN
  -- 1. Récupérer et verrouiller le paiement par référence
  SELECT * INTO v_payment
  FROM public.subscription_payments
  WHERE provider_reference = p_payment_reference
    AND provider = p_provider
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'payment_not_found');
  END IF;

  -- 2. Idempotence
  IF v_payment.status = 'paid' THEN
    RETURN jsonb_build_object('success', true, 'already_processed', true);
  END IF;

  -- 3. Vérification du montant (anti-fraude)
  IF p_amount_received IS NOT NULL AND ABS(v_payment.amount - p_amount_received) > 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'amount_mismatch',
      'expected', v_payment.amount, 'received', p_amount_received);
  END IF;

  -- 4. Mettre à jour le paiement
  UPDATE public.subscription_payments
  SET
    status = 'paid',
    paid_at = now(),
    updated_at = now()
  WHERE id = v_payment.id;

  -- 5. Si c'est une pré-inscription, mettre à jour pending_signup
  IF v_payment.pending_signup_id IS NOT NULL THEN
    UPDATE public.pending_signups
    SET
      status = 'paid',
      paid_at = now(),
      updated_at = now()
    WHERE id = v_payment.pending_signup_id
      AND status IN ('pending', 'payment_processing');

    GET DIAGNOSTICS v_signup = ROW_COUNT;
  END IF;

  -- 6. Si c'est un renouvellement (subscription_id non null), appeler renew_subscription
  IF v_payment.subscription_id IS NOT NULL THEN
    PERFORM public.renew_subscription(v_payment.subscription_id, v_payment.id, p_event_id);
    RETURN jsonb_build_object('success', true, 'type', 'renewal', 'payment_id', v_payment.id);
  END IF;

  RETURN jsonb_build_object('success', true, 'type', 'initial_payment',
    'payment_id', v_payment.id, 'pending_signup_id', v_payment.pending_signup_id);
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_initial_subscription_payment(TEXT, TEXT, TEXT, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_initial_subscription_payment(TEXT, TEXT, TEXT, NUMERIC) FROM anon;
REVOKE ALL ON FUNCTION public.confirm_initial_subscription_payment(TEXT, TEXT, TEXT, NUMERIC) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_initial_subscription_payment(TEXT, TEXT, TEXT, NUMERIC) TO service_role;

-- ============================================================
-- 10. RLS complémentaires sur subscriptions
-- ============================================================
-- Empêcher toute mutation d'abonnement par l'utilisateur (UPDATE/DELETE uniquement service_role)
DROP POLICY IF EXISTS "Subscriptions_no_user_update" ON public.subscriptions;
-- Les utilisateurs peuvent LIRE leur abonnement mais PAS le modifier
-- La policy existante (SELECT) est conservée

-- Policy explicite : interdire INSERT/UPDATE/DELETE pour authenticated
DROP POLICY IF EXISTS "Subscriptions_block_user_mutations" ON public.subscriptions;

-- ============================================================
-- 11. RLS sur subscription_payments — Interdire les mutations utilisateur
-- ============================================================
-- Les utilisateurs peuvent consulter mais pas modifier leurs paiements
DROP POLICY IF EXISTS "Payments_block_user_update" ON public.subscription_payments;
-- Pas de policy UPDATE/INSERT/DELETE pour authenticated → service_role only par défaut

-- ============================================================
-- 12. Permissions Plans (lecture publique pour page /pricing)
-- ============================================================
DROP POLICY IF EXISTS "Plans_select_public" ON public.plans;
CREATE POLICY "Plans_select_public"
  ON public.plans FOR SELECT
  USING (is_active = true);

-- Autoriser la lecture des plans même non-authentifié (page pricing publique)
DROP POLICY IF EXISTS "Plans_anon_select" ON public.plans;
CREATE POLICY "Plans_anon_select"
  ON public.plans FOR SELECT
  TO anon
  USING (is_active = true);
