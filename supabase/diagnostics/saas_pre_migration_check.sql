-- ==============================================================================
-- ATELIERPRO - DIAGNOSTIC READ-ONLY AVANT MIGRATION SAAS
-- ==============================================================================

-- 1. Existence des tables cibles (ateliers et SaaS)
SELECT 
    schemaname, 
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename IN (
    'ateliers', 
    'plans', 
    'subscriptions', 
    'subscription_payments', 
    'payment_webhook_events'
)
ORDER BY tablename;

-- 2. Structure et colonnes de la table `ateliers`
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'ateliers'
ORDER BY ordinal_position;

-- 3. Clé primaire de la table `ateliers`
SELECT 
    c.column_name, 
    c.data_type
FROM information_schema.key_column_usage AS kcu
JOIN information_schema.table_constraints AS tc
  ON kcu.constraint_name = tc.constraint_name
JOIN information_schema.columns AS c
  ON kcu.column_name = c.column_name 
  AND kcu.table_name = c.table_name 
  AND kcu.table_schema = c.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY' 
  AND kcu.table_schema = 'public'
  AND kcu.table_name = 'ateliers';

-- 4. Foreign Keys sortantes et entrantes sur `ateliers`
SELECT
    tc.constraint_name,
    tc.table_name AS source_table,
    kcu.column_name AS source_column,
    ccu.table_name AS target_table,
    ccu.column_name AS target_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND (tc.table_name = 'ateliers' OR ccu.table_name = 'ateliers');

-- 5. Vérification de l'existence de la fonction user_is_member_of
SELECT 
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN ('user_is_member_of', 'user_is_member_of_atelier');

-- 6. Modèle relationnel Utilisateurs -> Ateliers (via profiles)
-- Vérifier la structure de la table profiles qui lie auth.users à ateliers
SELECT 
    column_name, 
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name IN ('id', 'atelier_id', 'role');
