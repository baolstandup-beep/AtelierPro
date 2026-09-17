CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_workshop_id UUID;
  v_workshop_name TEXT;
BEGIN
  -- 1. Create Profile
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO UPDATE SET 
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone;

  -- 2. Create Workshop (if it's a new owner registration)
  v_workshop_name := NEW.raw_user_meta_data->>'workshop_name';
  
  IF v_workshop_name IS NOT NULL AND v_workshop_name != '' THEN
    INSERT INTO public.workshops (name, owner_id, phone)
    VALUES (
      v_workshop_name, 
      NEW.id,
      NEW.raw_user_meta_data->>'phone'
    )
    RETURNING id INTO v_workshop_id;

    -- 3. Add user as OWNER in workshop_members
    IF v_workshop_id IS NOT NULL THEN
      INSERT INTO public.workshop_members (workshop_id, user_id, role, status)
      VALUES (
        v_workshop_id,
        NEW.id,
        'OWNER',
        'ACTIVE'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
