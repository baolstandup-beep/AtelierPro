-- ============================================================
-- AtelierPro — Migration Freemium Sécurisée & Quotas Clients
-- Next.js + TypeScript + Supabase + PostgreSQL
-- Production-Safe, Idempotente, Zero legacy workshops/customers
-- ============================================================

-- 0. Extensions requises
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABLE public.plans
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'XOF',
  duration_days INTEGER NOT NULL DEFAULT 30,
  billing_interval TEXT NOT NULL DEFAULT 'month'
    CHECK (billing_interval IN ('free', 'day', 'week', 'month', 'year')),
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_clients INTEGER, -- NULL = illimité, 5 pour discovery
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour recherche rapide par slug
CREATE INDEX IF NOT EXISTS idx_plans_slug ON public.plans(slug);
CREATE INDEX IF NOT EXISTS idx_plans_is_active ON public.plans(is_active);

-- Insertion / Upsert idempotent des 3 plans canoniques AtelierPro
INSERT INTO public.plans (slug, name, description, price, currency, duration_days, billing_interval, features, max_clients, is_active, sort_order)
VALUES
  (
    'discovery',
    'Découverte',
    'Pour découvrir AtelierPro et démarrer la gestion de votre atelier sans frais.',
    0,
    'XOF',
    36500, -- Permanent sans expiration automatique
    'free',
    '["Jusqu''à 5 clients enregistrés", "Carnet de mesures de base", "Gestion basique des commandes", "Suivi de production basique", "Dashboard essentiel"]'::jsonb,
    5,
    true,
    1
  ),
  (
    'starter',
    'Starter',
    'Idéal pour structurer et développer un atelier actif.',
    5000,
    'XOF',
    30,
    'month',
    '["Clients illimités", "Mesures illimitées", "Commandes illimitées", "Tableau Kanban de production", "Paiements Wave & Orange Money", "Factures et reçus PDF", "Rappels et reçus WhatsApp", "Dashboard complet"]'::jsonb,
    NULL,
    true,
    2
  ),
  (
    'pro',
    'Pro',
    'Pour les ateliers et maisons de couture en pleine expansion.',
    15000,
    'XOF',
    30,
    'month',
    '["Tout le plan Starter", "Rapports financiers avancés", "Export Excel comptable", "Gestion d''équipe et tailleurs", "Catalogue de modèles", "Statistiques avancées", "Support prioritaire"]'::jsonb,
    NULL,
    true,
    3
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  currency = EXCLUDED.currency,
  duration_days = EXCLUDED.duration_days,
  billing_interval = EXCLUDED.billing_interval,
  features = EXCLUDED.features,
  max_clients = EXCLUDED.max_clients,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- 2. TABLE public.subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atelier_id UUID NOT NULL REFERENCES public.ateliers(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'grace_period', 'expired', 'cancelled', 'suspended')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ, -- NULL pour plan discovery
  grace_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_atelier_subscription UNIQUE (atelier_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_atelier ON public.subscriptions(atelier_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- 3. TABLE public.subscription_payments
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atelier_id UUID REFERENCES public.ateliers(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES public.plans(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL DEFAULT 'WAVE' CHECK (provider IN ('WAVE', 'ORANGE_MONEY', 'STRIPE', 'MANUAL')),
  provider_reference TEXT,
  provider_transaction_id TEXT,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'XOF',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded')),
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_sub_payments_provider_ref UNIQUE (provider, provider_reference)
);

CREATE INDEX IF NOT EXISTS idx_sub_payments_atelier ON public.subscription_payments(atelier_id);
CREATE INDEX IF NOT EXISTS idx_sub_payments_ref ON public.subscription_payments(provider_reference);

-- 4. TABLE public.webhook_events
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  signature TEXT,
  signature_valid BOOLEAN DEFAULT false,
  processed BOOLEAN NOT NULL DEFAULT false,
  processing_status TEXT DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'processed', 'error')),
  error_message TEXT,
  payment_reference TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  CONSTRAINT uq_webhook_provider_event UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_event ON public.webhook_events(provider, event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_ref ON public.webhook_events(payment_reference);

-- 5. RLS POLICIES SUR PLANS, SUBSCRIPTIONS, PAYMENTS & WEBHOOKS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Plans : lecture autorisée pour tous (y compris anonymes pour page /pricing)
DROP POLICY IF EXISTS "Plans_select_all" ON public.plans;
CREATE POLICY "Plans_select_all"
  ON public.plans FOR SELECT
  USING (is_active = true);

-- Subscriptions : un utilisateur ne peut lire que l'abonnement de son atelier
DROP POLICY IF EXISTS "Subscriptions_select_atelier" ON public.subscriptions;
CREATE POLICY "Subscriptions_select_atelier"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (
    atelier_id IN (
      SELECT atelier_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Subscriptions : aucune mutation directe par l'utilisateur (uniquement service_role ou RPC SECURITY DEFINER)
DROP POLICY IF EXISTS "Subscriptions_no_user_insert" ON public.subscriptions;
DROP POLICY IF EXISTS "Subscriptions_no_user_update" ON public.subscriptions;
DROP POLICY IF EXISTS "Subscriptions_no_user_delete" ON public.subscriptions;

-- Subscription payments : lecture seule pour les membres de l'atelier
DROP POLICY IF EXISTS "SubPayments_select_atelier" ON public.subscription_payments;
CREATE POLICY "SubPayments_select_atelier"
  ON public.subscription_payments FOR SELECT
  TO authenticated
  USING (
    atelier_id IN (
      SELECT atelier_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Webhook events : STRICTEMENT réservé à service_role (aucune lecture/écriture par anon ou authenticated)
DROP POLICY IF EXISTS "Webhook_no_public_access" ON public.webhook_events;

-- ============================================================
-- 6. RPC ATOMIQUE AVEC VERROU ADVISORY — create_client_with_plan_check
-- Empêche formellement la concurrence 4 -> 6 clients sur le plan Découverte
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_client_with_plan_check(
  p_name TEXT,
  p_phone TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_gender TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_atelier_id UUID;
  v_plan_slug TEXT;
  v_max_clients INTEGER;
  v_client_count INTEGER;
  v_new_client RECORD;
BEGIN
  -- 1. Vérification de l'utilisateur authentifié
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHORIZED',
      'message', 'Utilisateur non authentifié'
    );
  END IF;

  -- 2. Récupération de l'atelier depuis le profil (JAMAIS depuis le frontend)
  SELECT atelier_id INTO v_atelier_id
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_atelier_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ATELIER_NOT_FOUND',
      'message', 'Aucun atelier associé à cet utilisateur'
    );
  END IF;

  -- 3. VERROU TRANSACTIONNEL EXCLUSIF PAR ATELIER (Advisory Lock)
  -- Garantit une exécution strictement sérialisée par atelier pendant la durée de la transaction.
  -- Évite à 100% le bug de concurrence où deux requêtes simultanées à 4 clients créent 6 clients.
  PERFORM pg_advisory_xact_lock(hashtext('atelier_client_quota_' || v_atelier_id::text));

  -- 4. Déterminer l'abonnement et le plan de l'atelier
  SELECT p.slug, p.max_clients
  INTO v_plan_slug, v_max_clients
  FROM public.subscriptions s
  JOIN public.plans p ON p.id = s.plan_id
  WHERE s.atelier_id = v_atelier_id
    AND s.status IN ('active', 'grace_period');

  -- Si aucun abonnement explicite n'est trouvé, par défaut l'atelier est en 'discovery'
  IF v_plan_slug IS NULL THEN
    v_plan_slug := 'discovery';
    v_max_clients := 5;
  END IF;

  -- 5. Vérifier la limite de quota pour le plan Discovery
  IF v_max_clients IS NOT NULL THEN
    SELECT count(*) INTO v_client_count
    FROM public.clients
    WHERE atelier_id = v_atelier_id;

    IF v_client_count >= v_max_clients THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'FREE_PLAN_CLIENT_LIMIT_REACHED',
        'message', 'Vous avez atteint la limite de 5 clients du plan Découverte.',
        'current_count', v_client_count,
        'max_allowed', v_max_clients
      );
    END IF;
  END IF;

  -- 6. Insertion sécurisée du client
  INSERT INTO public.clients (
    atelier_id,
    name,
    phone,
    notes,
    gender,
    created_at,
    updated_at
  )
  VALUES (
    v_atelier_id,
    trim(p_name),
    nullif(trim(p_phone), ''),
    nullif(trim(p_notes), ''),
    nullif(trim(p_gender), ''),
    now(),
    now()
  )
  RETURNING * INTO v_new_client;

  RETURN jsonb_build_object(
    'success', true,
    'client', row_to_json(v_new_client)
  );
END;
$$;

-- Permissions d'exécution de la RPC
REVOKE ALL ON FUNCTION public.create_client_with_plan_check(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_client_with_plan_check(TEXT, TEXT, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_client_with_plan_check(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_client_with_plan_check(TEXT, TEXT, TEXT, TEXT) TO service_role;

-- ============================================================
-- 7. RPC — activate_discovery_subscription
-- Active le plan Découverte sans aucun paiement de manière idempotente
-- ============================================================
CREATE OR REPLACE FUNCTION public.activate_discovery_subscription(p_atelier_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plan_id UUID;
  v_sub_id UUID;
BEGIN
  -- 1. Récupérer le plan discovery
  SELECT id INTO v_plan_id FROM public.plans WHERE slug = 'discovery';
  IF v_plan_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'discovery_plan_not_found');
  END IF;

  -- 2. Créer ou mettre à jour l'abonnement de manière idempotente
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
    v_plan_id,
    'active',
    now(),
    now(),
    NULL -- Sans expiration
  )
  ON CONFLICT (atelier_id) DO UPDATE SET
    plan_id = v_plan_id,
    status = 'active',
    current_period_end = NULL,
    updated_at = now()
  RETURNING id INTO v_sub_id;

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_sub_id,
    'plan', 'discovery'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.activate_discovery_subscription(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.activate_discovery_subscription(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.activate_discovery_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_discovery_subscription(UUID) TO service_role;

-- ============================================================
-- 8. TRIGGER DE SÉCURITÉ ULTIME EN BASE (Defense in depth)
-- Même en cas de contournement direct via Supabase Client ou requête SQL
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_check_client_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plan_slug TEXT;
  v_max_clients INTEGER;
  v_current_count INTEGER;
BEGIN
  -- Vérifier le plan de l'atelier
  SELECT p.slug, p.max_clients
  INTO v_plan_slug, v_max_clients
  FROM public.subscriptions s
  JOIN public.plans p ON p.id = s.plan_id
  WHERE s.atelier_id = NEW.atelier_id
    AND s.status IN ('active', 'grace_period');

  -- Si non défini, défaut à discovery
  IF v_plan_slug IS NULL THEN
    v_plan_slug := 'discovery';
    v_max_clients := 5;
  END IF;

  IF v_max_clients IS NOT NULL THEN
    SELECT count(*) INTO v_current_count
    FROM public.clients
    WHERE atelier_id = NEW.atelier_id;

    IF v_current_count >= v_max_clients THEN
      RAISE EXCEPTION 'FREE_PLAN_CLIENT_LIMIT_REACHED: Vous avez atteint la limite de % clients du plan Découverte.', v_max_clients
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_client_quota ON public.clients;
CREATE TRIGGER trg_enforce_client_quota
  BEFORE INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_check_client_quota();
