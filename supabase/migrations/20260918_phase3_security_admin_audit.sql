-- ========================================================================================
-- ATELIERPRO — MIGRATION SÉCURITÉ PRODUCTION & GOUVERNANCE (PHASE 3)
-- Version Finale Audité & Sécurisée
-- ========================================================================================

-- ----------------------------------------------------------------------------------------
-- 1. Table d'audit des actions sensibles (Audit Logs)
-- ----------------------------------------------------------------------------------------
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

-- SÉCURITÉ IMMUTABILITÉ & ANTI-FALSIFICATION :
-- Aucun droit INSERT, UPDATE ou DELETE n'est accordé aux rôles 'authenticated' ou 'anon'.
-- Les événements d'audit sont écrits exclusivement par le backend de confiance (service_role).
REVOKE ALL ON public.audit_logs FROM anon, authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;

-- Politique de lecture sécurisée :
-- Un atelier ne peut consulter que ses propres logs (profiles.id = auth.uid()),
-- et un administrateur plateforme peut consulter l'ensemble des logs d'audit.
DROP POLICY IF EXISTS "AuditLogs: Lecture propre atelier ou admin" ON public.audit_logs;
CREATE POLICY "AuditLogs: Lecture propre atelier ou admin"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    atelier_id IN (
      SELECT atelier_id FROM public.profiles WHERE id = auth.uid()
    )
    OR (SELECT public.is_platform_admin())
  );

-- ----------------------------------------------------------------------------------------
-- 2. Table de sécurité pour les Administrateurs Plateforme
-- ----------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Activation RLS sur platform_admins
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- SÉCURITÉ ANTI-AUTO-PROMOTION :
-- Seul le rôle service_role ou une opération SQL explicite peut insérer, modifier ou supprimer un admin.
REVOKE ALL ON public.platform_admins FROM anon, authenticated;
GRANT SELECT ON public.platform_admins TO authenticated;

-- Politique de lecture : Un utilisateur authentifié peut uniquement vérifier son propre statut
DROP POLICY IF EXISTS "PlatformAdmins: Lecture propre statut" ON public.platform_admins;
CREATE POLICY "PlatformAdmins: Lecture propre statut"
  ON public.platform_admins FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Fonction SECURITY DEFINER sécurisée pour tester le rôle d'administrateur
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

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;

-- ----------------------------------------------------------------------------------------
-- 3. Sécurisation stricte du Bucket Privé (atelierpro-private)
-- ----------------------------------------------------------------------------------------
-- Le chemin d'accès attendu est : workshops/{atelier_id}/{category}/{fileName}
-- storage.foldername(name)[1] = 'workshops'
-- storage.foldername(name)[2] = atelier_id

-- INSERT : Uniquement dans le dossier de son propre atelier
DROP POLICY IF EXISTS "Strict - Insert private media for own workshop" ON storage.objects;
CREATE POLICY "Strict - Insert private media for own workshop"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'atelierpro-private'
    AND (storage.foldername(name))[1] = 'workshops'
    AND (storage.foldername(name))[2] IN (
      SELECT atelier_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );

-- SELECT : Uniquement dans le dossier de son propre atelier
DROP POLICY IF EXISTS "Strict - Select private media for own workshop" ON storage.objects;
CREATE POLICY "Strict - Select private media for own workshop"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'atelierpro-private'
    AND (storage.foldername(name))[1] = 'workshops'
    AND (storage.foldername(name))[2] IN (
      SELECT atelier_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );

-- UPDATE : Uniquement dans le dossier de son propre atelier
DROP POLICY IF EXISTS "Strict - Update private media for own workshop" ON storage.objects;
CREATE POLICY "Strict - Update private media for own workshop"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'atelierpro-private'
    AND (storage.foldername(name))[1] = 'workshops'
    AND (storage.foldername(name))[2] IN (
      SELECT atelier_id::text FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'atelierpro-private'
    AND (storage.foldername(name))[1] = 'workshops'
    AND (storage.foldername(name))[2] IN (
      SELECT atelier_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );

-- DELETE : Uniquement dans le dossier de son propre atelier
DROP POLICY IF EXISTS "Strict - Delete private media for own workshop" ON storage.objects;
CREATE POLICY "Strict - Delete private media for own workshop"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'atelierpro-private'
    AND (storage.foldername(name))[1] = 'workshops'
    AND (storage.foldername(name))[2] IN (
      SELECT atelier_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------------------
-- Note sur les contraintes financières :
-- Les contraintes `orders_total_amount_check` et `payments_amount_check` sont déjà actives
-- sur les tables `orders` et `payments`. Aucune duplication n'est créée.
-- ----------------------------------------------------------------------------------------
