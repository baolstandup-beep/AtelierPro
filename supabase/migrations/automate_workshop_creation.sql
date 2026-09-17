-- Migration: Automatisation de la création de l'atelier et du profil à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_workshop_id UUID;
  v_workshop_name TEXT;
  v_phone TEXT;
BEGIN
  v_workshop_name := COALESCE(NEW.raw_user_meta_data->>'workshop_name', 'Mon Atelier');
  v_phone := NEW.raw_user_meta_data->>'phone';

  -- 1. Create Profile
  INSERT INTO profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    v_phone
  )
  ON CONFLICT (id) DO UPDATE SET 
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone;

  -- 2. Create Workshop
  INSERT INTO workshops (name, owner_id, phone)
  VALUES (v_workshop_name, NEW.id, v_phone)
  RETURNING id INTO v_workshop_id;

  -- 3. Link Profile to Workshop as OWNER
  INSERT INTO workshop_members (workshop_id, user_id, role, status)
  VALUES (v_workshop_id, NEW.id, 'OWNER', 'ACTIVE');

  -- 4. Create default measurement types
  INSERT INTO measurement_types (workshop_id, name, unit, sort_order, is_custom)
  VALUES 
    (v_workshop_id, 'Tour de cou', 'cm', 1, false),
    (v_workshop_id, 'Épaule', 'cm', 2, false),
    (v_workshop_id, 'Poitrine', 'cm', 3, false),
    (v_workshop_id, 'Taille', 'cm', 4, false),
    (v_workshop_id, 'Hanche', 'cm', 5, false),
    (v_workshop_id, 'Bassin', 'cm', 6, false),
    (v_workshop_id, 'Longueur manches', 'cm', 7, false),
    (v_workshop_id, 'Tour de bras', 'cm', 8, false),
    (v_workshop_id, 'Longueur boubou', 'cm', 9, false),
    (v_workshop_id, 'Longueur pantalon', 'cm', 10, false),
    (v_workshop_id, 'Cuisse', 'cm', 11, false),
    (v_workshop_id, 'Genou', 'cm', 12, false),
    (v_workshop_id, 'Bas de pantalon', 'cm', 13, false),
    (v_workshop_id, 'Longueur chemise', 'cm', 14, false);

  RETURN NEW;
END;
$$;
