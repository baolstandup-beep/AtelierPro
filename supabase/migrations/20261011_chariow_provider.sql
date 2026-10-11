-- ============================================================
-- Chariow : nouveau fournisseur de paiement d'abonnement
-- ============================================================
-- 1. Autoriser 'CHARIOW' dans subscription_payments.provider
DO $$
DECLARE c TEXT;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.subscription_payments'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%provider%'
  LOOP
    EXECUTE format('ALTER TABLE public.subscription_payments DROP CONSTRAINT %I', c);
  END LOOP;
  ALTER TABLE public.subscription_payments
    ADD CONSTRAINT subscription_payments_provider_check
    CHECK (provider IN ('WAVE','ORANGE_MONEY','STRIPE','MANUAL','CHARIOW'));
END $$;

-- 2. Produit Chariow associé à chaque plan payant (un produit par plan)
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS chariow_product_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_chariow_product
  ON public.plans (chariow_product_id) WHERE chariow_product_id IS NOT NULL;

-- 3. Chariow exige un vrai e-mail acheteur (les comptes utilisent des e-mails internes synthétiques)
ALTER TABLE public.pending_signups ADD COLUMN IF NOT EXISTS email TEXT;
