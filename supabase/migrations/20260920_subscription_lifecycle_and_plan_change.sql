-- ============================================================
-- AtelierPro — Migration Cycle de Vie Abonnement & Changement de Formule
-- Idempotente, Production-Safe, Zéro perte de données
-- ============================================================

-- 1. Colonnes complémentaires sur subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS pending_plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL;

-- 2. Fonction RPC get_or_create_atelier_subscription
-- Garantit qu'un atelier dispose toujours d'une ligne d'abonnement en base
CREATE OR REPLACE FUNCTION public.get_or_create_atelier_subscription(p_atelier_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sub RECORD;
  v_discovery_plan_id UUID;
BEGIN
  -- 1. Chercher la subscription existante
  SELECT s.*, p.slug as plan_slug, p.name as plan_name, p.price as plan_price
  INTO v_sub
  FROM public.subscriptions s
  JOIN public.plans p ON p.id = s.plan_id
  WHERE s.atelier_id = p_atelier_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'subscription_id', v_sub.id,
      'atelier_id', v_sub.atelier_id,
      'plan_id', v_sub.plan_id,
      'plan_slug', v_sub.plan_slug,
      'plan_name', v_sub.plan_name,
      'status', v_sub.status,
      'current_period_end', v_sub.current_period_end
    );
  END IF;

  -- 2. Si absente, trouver le plan discovery
  SELECT id INTO v_discovery_plan_id FROM public.plans WHERE slug = 'discovery';
  IF v_discovery_plan_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'discovery_plan_not_found');
  END IF;

  -- 3. Insérer la subscription Découverte par défaut
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
    v_discovery_plan_id,
    'active',
    now(),
    now(),
    NULL -- Gratuit permanent sans expiration
  )
  ON CONFLICT (atelier_id) DO UPDATE SET
    updated_at = now()
  RETURNING * INTO v_sub;

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_sub.id,
    'atelier_id', v_sub.atelier_id,
    'plan_id', v_sub.plan_id,
    'plan_slug', 'discovery',
    'status', v_sub.status,
    'current_period_end', v_sub.current_period_end
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_atelier_subscription(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_or_create_atelier_subscription(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_atelier_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_atelier_subscription(UUID) TO service_role;

-- 3. Fonction RPC renew_subscription (Unifiée pour renouvellement, upgrade, réabonnement)
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
  v_is_same_plan BOOLEAN;
  v_is_currently_active BOOLEAN;
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

  -- Idempotence du paiement
  IF v_payment.status = 'paid' THEN
    RETURN jsonb_build_object('success', true, 'already_processed', true);
  END IF;

  -- 3. Récupérer le nouveau plan payé
  SELECT * INTO v_plan FROM public.plans WHERE id = v_payment.plan_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'plan_not_found');
  END IF;

  v_is_same_plan := (v_sub.plan_id = v_payment.plan_id);
  v_is_currently_active := (v_sub.status = 'active' AND v_sub.current_period_end IS NOT NULL AND v_sub.current_period_end > now());

  -- 4. Calcul de la nouvelle période :
  IF v_is_same_plan AND v_is_currently_active THEN
    -- CAS 1 : Renouvellement anticipé du même plan
    -- On prolonge depuis la date de fin existante pour ne pas perdre les jours déjà payés
    v_new_period_start := v_sub.current_period_start;
    IF v_plan.billing_interval = 'year' THEN
      v_new_period_end := v_sub.current_period_end + INTERVAL '1 year';
    ELSIF v_plan.billing_interval = 'month' THEN
      v_new_period_end := v_sub.current_period_end + INTERVAL '1 month';
    ELSE
      v_new_period_end := v_sub.current_period_end + (v_plan.duration_days || ' days')::INTERVAL;
    END IF;
  ELSE
    -- CAS 2 : Changement de formule (Upgrade/Downgrade) OU Réabonnement après expiration
    -- Prend effet IMMÉDIATEMENT à partir de now()
    v_new_period_start := now();
    IF v_plan.billing_interval = 'year' THEN
      v_new_period_end := now() + INTERVAL '1 year';
    ELSIF v_plan.billing_interval = 'month' THEN
      v_new_period_end := now() + INTERVAL '1 month';
    ELSE
      v_new_period_end := now() + (v_plan.duration_days || ' days')::INTERVAL;
    END IF;
  END IF;

  -- 5. Mettre à jour la subscription existante de CET atelier (JAMAIS de nouvel atelier !)
  UPDATE public.subscriptions
  SET
    status = 'active',
    plan_id = v_payment.plan_id,
    current_period_start = v_new_period_start,
    current_period_end = v_new_period_end,
    grace_period_end = NULL,
    suspended_at = NULL,
    cancelled_at = NULL,
    pending_plan_id = NULL,
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

  -- 7. Marquer le webhook comme traité si event_id fourni
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
  WHERE subscription_id = p_subscription_id;

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', p_subscription_id,
    'plan_id', v_payment.plan_id,
    'plan_slug', v_plan.slug,
    'new_period_start', v_new_period_start,
    'new_period_end', v_new_period_end
  );
END;
$$;

REVOKE ALL ON FUNCTION public.renew_subscription(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.renew_subscription(UUID, UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.renew_subscription(UUID, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.renew_subscription(UUID, UUID, TEXT) TO service_role;

-- 4. confirm_initial_subscription_payment (Robuste pour tout paiement authentifié ou signup)
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
  v_sub_id UUID;
  v_renew_result JSONB;
BEGIN
  -- 1. Récupérer et verrouiller le paiement
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

  -- 3. Vérification du montant (tolérance 1 FCFA)
  IF p_amount_received IS NOT NULL AND ABS(v_payment.amount - p_amount_received) > 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'amount_mismatch',
      'expected', v_payment.amount, 'received', p_amount_received);
  END IF;

  -- 4. Si paiement d'un atelier connecté (atelier_id présent)
  IF v_payment.atelier_id IS NOT NULL THEN
    -- Récupérer ou créer la subscription de l'atelier
    v_sub_id := v_payment.subscription_id;
    IF v_sub_id IS NULL THEN
      SELECT id INTO v_sub_id FROM public.subscriptions WHERE atelier_id = v_payment.atelier_id;
      IF v_sub_id IS NULL THEN
        INSERT INTO public.subscriptions (atelier_id, plan_id, status, started_at, current_period_start, current_period_end)
        VALUES (v_payment.atelier_id, v_payment.plan_id, 'active', now(), now(), now() + INTERVAL '30 days')
        RETURNING id INTO v_sub_id;
      END IF;

      UPDATE public.subscription_payments
      SET subscription_id = v_sub_id
      WHERE id = v_payment.id;
    END IF;

    -- Appliquer le renouvellement / changement de plan
    v_renew_result := public.renew_subscription(v_sub_id, v_payment.id, p_event_id);
    RETURN jsonb_build_object(
      'success', true,
      'type', 'renewal_or_upgrade',
      'payment_id', v_payment.id,
      'subscription_id', v_sub_id,
      'details', v_renew_result
    );
  END IF;

  -- 5. Si pré-inscription (nouveau compte pas encore créé)
  UPDATE public.subscription_payments
  SET
    status = 'paid',
    paid_at = now(),
    updated_at = now()
  WHERE id = v_payment.id;

  IF v_payment.pending_signup_id IS NOT NULL THEN
    UPDATE public.pending_signups
    SET
      status = 'paid',
      paid_at = now(),
      updated_at = now()
    WHERE id = v_payment.pending_signup_id
      AND status IN ('pending', 'payment_processing');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'type', 'initial_payment',
    'payment_id', v_payment.id,
    'pending_signup_id', v_payment.pending_signup_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_initial_subscription_payment(TEXT, TEXT, TEXT, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_initial_subscription_payment(TEXT, TEXT, TEXT, NUMERIC) FROM anon;
REVOKE ALL ON FUNCTION public.confirm_initial_subscription_payment(TEXT, TEXT, TEXT, NUMERIC) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_initial_subscription_payment(TEXT, TEXT, TEXT, NUMERIC) TO service_role;
