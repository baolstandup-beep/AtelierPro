-- ========================================================================================
-- Correction des triggers d'inscription Supabase Auth & Profils AtelierPro
-- ========================================================================================

-- 1. Supprimer les triggers potentiellement en conflit sur auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trg_new_user_profile ON auth.users;
DROP TRIGGER IF EXISTS trg_handle_new_user ON auth.users;

-- 2. Créer la fonction trigger robuste, idempotente et isolée
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_atelier_id UUID;
  v_workshop_name TEXT;
  v_phone TEXT;
BEGIN
  v_workshop_name := COALESCE(NEW.raw_user_meta_data->>'workshop_name', 'Mon Atelier');
  v_phone := NEW.raw_user_meta_data->>'phone';

  -- 1. Créer l'atelier s'il n'existe pas encore pour cet utilisateur
  INSERT INTO public.ateliers (name, phone)
  VALUES (v_workshop_name, v_phone)
  RETURNING id INTO v_atelier_id;

  -- 2. Créer ou mettre à jour le profil lié
  INSERT INTO public.profiles (id, atelier_id, full_name, phone, role)
  VALUES (
    NEW.id,
    v_atelier_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    v_phone,
    'owner'
  )
  ON CONFLICT (id) DO UPDATE SET
    atelier_id = COALESCE(profiles.atelier_id, EXCLUDED.atelier_id),
    full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE profiles.full_name END,
    phone = COALESCE(EXCLUDED.phone, profiles.phone);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Ne jamais bloquer la création du compte dans auth.users si une exception survient
  -- L'application créera/synchronisera le profil explicitement à l'étape suivante
  RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 3. Attacher le trigger unique
CREATE TRIGGER trg_new_user_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
