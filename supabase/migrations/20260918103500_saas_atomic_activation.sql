-- Fonction sécurisée pour confirmer atomiquement un paiement SaaS.
-- Cette fonction garantit que le paiement est marqué 'paid', que l'abonnement est activé/renouvelé,
-- et que l'événement webhook est marqué 'processed' dans une seule transaction cohérente.

CREATE OR REPLACE FUNCTION confirm_subscription_payment(
  p_payment_id UUID,
  p_event_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Exécute avec les droits du créateur (doit être appelée via Service Role)
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
  v_subscription RECORD;
  v_plan RECORD;
  v_event_id_uuid UUID;
BEGIN
  -- 1. Verrouiller la ligne de paiement (FOR UPDATE)
  SELECT * INTO v_payment
  FROM subscription_payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paiement introuvable';
  END IF;

  IF v_payment.status = 'paid' THEN
    RAISE NOTICE 'Paiement % déjà confirmé.', p_payment_id;
    RETURN TRUE; -- Déjà confirmé (Idempotence)
  END IF;

  -- 2. Récupérer le plan
  SELECT * INTO v_plan
  FROM plans
  WHERE id = v_payment.plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan % introuvable', v_payment.plan_id;
  END IF;

  -- 3. Marquer le paiement comme payé
  UPDATE subscription_payments
  SET 
    status = 'paid',
    paid_at = NOW(),
    updated_at = NOW()
  WHERE id = p_payment_id;

  -- 4. Activer ou renouveler l'abonnement
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE id = v_payment.subscription_id
  FOR UPDATE;

  IF FOUND THEN
    -- Mettre à jour l'abonnement existant
    UPDATE subscriptions
    SET 
      plan_id = v_plan.id,
      status = 'active',
      -- Si l'abonnement est encore actif, on ajoute la durée à l'expiration actuelle.
      -- Sinon, on démarre à partir de maintenant.
      current_period_end = CASE 
        WHEN current_period_end > NOW() THEN current_period_end + (v_plan.interval_count || ' ' || v_plan.interval)::INTERVAL
        ELSE NOW() + (v_plan.interval_count || ' ' || v_plan.interval)::INTERVAL
      END,
      updated_at = NOW()
    WHERE id = v_subscription.id;
  ELSE
    -- Créer un nouvel abonnement
    INSERT INTO subscriptions (
      id,
      user_id,
      plan_id,
      status,
      current_period_start,
      current_period_end,
      created_at,
      updated_at
    ) VALUES (
      v_payment.subscription_id,
      v_payment.user_id,
      v_plan.id,
      'active',
      NOW(),
      NOW() + (v_plan.interval_count || ' ' || v_plan.interval)::INTERVAL,
      NOW(),
      NOW()
    );
  END IF;

  -- 5. Marquer l'événement webhook comme traité
  IF p_event_id IS NOT NULL THEN
    UPDATE payment_webhook_events
    SET 
      processed = TRUE,
      processed_at = NOW()
    WHERE event_id = p_event_id AND provider = v_payment.provider;
  END IF;

  RETURN TRUE;
END;
$$;

-- Sécurisation absolue de la fonction
REVOKE ALL ON FUNCTION confirm_subscription_payment(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION confirm_subscription_payment(UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION confirm_subscription_payment(UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION confirm_subscription_payment(UUID, TEXT) TO service_role;

