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
BEGIN
  -- 1. Verrouiller la ligne de paiement (FOR UPDATE)
  SELECT * INTO v_payment
  FROM subscription_payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paiement % introuvable', p_payment_id;
  END IF;

  IF v_payment.status = 'paid' THEN
    RAISE NOTICE 'Paiement % déjà confirmé.', p_payment_id;
    RETURN TRUE; -- Déjà confirmé (Idempotence absolue)
  END IF;

  -- 2. Récupérer l'abonnement
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE id = v_payment.subscription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Abonnement % introuvable', v_payment.subscription_id;
  END IF;

  -- 3. Récupérer le plan
  SELECT * INTO v_plan
  FROM plans
  WHERE id = v_subscription.plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan % introuvable', v_subscription.plan_id;
  END IF;

  -- 4. Marquer le paiement comme payé
  UPDATE subscription_payments
  SET 
    status = 'paid',
    paid_at = NOW(),
    updated_at = NOW()
  WHERE id = p_payment_id;

  -- 5. Activer ou prolonger l'abonnement
  UPDATE subscriptions
  SET 
    status = 'active',
    starts_at = CASE 
      WHEN starts_at IS NULL THEN NOW() 
      ELSE starts_at 
    END,
    expires_at = CASE 
      WHEN expires_at > NOW() THEN expires_at + (v_plan.duration_days || ' days')::INTERVAL
      ELSE NOW() + (v_plan.duration_days || ' days')::INTERVAL
    END,
    updated_at = NOW()
  WHERE id = v_subscription.id;

  -- 6. Marquer l'événement webhook comme traité
  IF p_event_id IS NOT NULL THEN
    UPDATE payment_webhook_events
    SET 
      processing_status = 'processed',
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
