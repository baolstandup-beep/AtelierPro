-- ========================================================================================
-- ATELIERPRO — MIGRATION SÉCURITÉ PRODUCTION & GOUVERNANCE (PHASE 3)
-- ========================================================================================

-- 1. Table d'audit des actions sensibles (Audit Logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  atelier_id UUID REFERENCES public.ateliers(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Activation RLS sur audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Politique de lecture : Chaque atelier ne peut lire que son propre journal d'audit
DROP POLICY IF EXISTS "AuditLogs: Lecture propre atelier" ON public.audit_logs;
CREATE POLICY "AuditLogs: Lecture propre atelier"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    atelier_id IN (
      SELECT atelier_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Politique d'insertion : Insertion permise par les services authentifiés
DROP POLICY IF EXISTS "AuditLogs: Insertion autorisée" ON public.audit_logs;
CREATE POLICY "AuditLogs: Insertion autorisée"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 2. Table de sécurité pour les Administrateurs Plateforme
CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Fonction sécurisée pour vérifier le rôle d'administrateur plateforme
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid()
  );
$$;

-- 3. Renforcement de l'intégrité financière (Montants positifs stricts)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_total_amount_positive') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_total_amount_positive CHECK (total_amount >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_amount_positive') THEN
    ALTER TABLE public.payments ADD CONSTRAINT payments_amount_positive CHECK (amount >= 0);
  END IF;
END $$;

-- 4. Sécurisation stricte du Bucket Privé (atelierpro-private)
-- Insertion uniquement dans le dossier de son propre atelier
DROP POLICY IF EXISTS "Strict - Insert private media for own workshop" ON storage.objects;
CREATE POLICY "Strict - Insert private media for own workshop"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'atelierpro-private'
    AND (storage.foldername(name))[2] IN (
      SELECT atelier_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Lecture uniquement dans son propre dossier d'atelier
DROP POLICY IF EXISTS "Strict - Select private media for own workshop" ON storage.objects;
CREATE POLICY "Strict - Select private media for own workshop"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'atelierpro-private'
    AND (storage.foldername(name))[2] IN (
      SELECT atelier_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );
