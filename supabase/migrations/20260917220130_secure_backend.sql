-- ========================================================================================
-- Sécurisation du backend AtelierPro - Isolation Multi-Tenant via get_auth_workshop_id()
-- ========================================================================================

-- 1. Fonction sécurisée pour obtenir le workshop de la session courante
CREATE OR REPLACE FUNCTION public.get_auth_workshop_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT workshop_id FROM workshop_members
  WHERE user_id = auth.uid()
    AND status = 'ACTIVE'
  LIMIT 1;
$$;

-- 2. Sécurisation plus stricte de Storage (bucket_id = 'atelierpro-media')
-- On supprime les anciennes policies permissives s'il y en a
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete media" ON storage.objects;

-- Les utilisateurs peuvent insérer seulement si le fichier est placé dans un dossier portant leur workshop_id
CREATE POLICY "Strict - Insert media for own workshop" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'atelierpro-media' 
  AND (storage.foldername(name))[1] = public.get_auth_workshop_id()::text
);

-- Les utilisateurs peuvent mettre à jour / supprimer seulement leurs propres dossiers
CREATE POLICY "Strict - Update media for own workshop" 
ON storage.objects FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'atelierpro-media' 
  AND (storage.foldername(name))[1] = public.get_auth_workshop_id()::text
);

CREATE POLICY "Strict - Delete media for own workshop" 
ON storage.objects FOR DELETE 
TO authenticated
USING (
  bucket_id = 'atelierpro-media' 
  AND (storage.foldername(name))[1] = public.get_auth_workshop_id()::text
);

-- ========================================================================================
-- Remplacement des règles RLS "public.user_is_member_of(workshop_id)" par "workshop_id = get_auth_workshop_id()"
-- pour garantir 100% que l'insertion depuis le client utilise le bon workshop.
-- ========================================================================================

-- Customers
DROP POLICY IF EXISTS "Customers: création par membres" ON public.customers;
CREATE POLICY "Customers: création par membres sécurisé"
  ON public.customers FOR INSERT
  WITH CHECK (workshop_id = public.get_auth_workshop_id());

-- Orders
DROP POLICY IF EXISTS "Orders: création par membres" ON public.orders;
CREATE POLICY "Orders: création par membres sécurisé"
  ON public.orders FOR INSERT
  WITH CHECK (workshop_id = public.get_auth_workshop_id());

-- Order Items
DROP POLICY IF EXISTS "OrderItems: accès membres" ON public.order_items;
CREATE POLICY "OrderItems: accès membres sécurisé"
  ON public.order_items FOR ALL
  USING (workshop_id = public.get_auth_workshop_id())
  WITH CHECK (workshop_id = public.get_auth_workshop_id());

-- Payments
DROP POLICY IF EXISTS "Payments: création par rôles autorisés" ON public.payments;
CREATE POLICY "Payments: création sécurisée"
  ON public.payments FOR INSERT
  WITH CHECK (
    workshop_id = public.get_auth_workshop_id()
    AND public.user_has_role(workshop_id, ARRAY['OWNER', 'MANAGER', 'CASHIER']::public.user_role[])
  );

-- Measurement Profiles
DROP POLICY IF EXISTS "MeasProfiles: accès membres" ON public.measurement_profiles;
CREATE POLICY "MeasProfiles: accès membres sécurisé"
  ON public.measurement_profiles FOR ALL
  USING (workshop_id = public.get_auth_workshop_id())
  WITH CHECK (workshop_id = public.get_auth_workshop_id());

-- Measurement Values
DROP POLICY IF EXISTS "MeasValues: accès membres" ON public.measurement_values;
CREATE POLICY "MeasValues: accès membres sécurisé"
  ON public.measurement_values FOR ALL
  USING (workshop_id = public.get_auth_workshop_id())
  WITH CHECK (workshop_id = public.get_auth_workshop_id());

-- ========================================================================================
-- 3. Forcer auth.uid() sur le champ created_by pour empêcher l'usurpation frontend
-- ========================================================================================

CREATE OR REPLACE FUNCTION public.force_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.created_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customers_created_by ON public.customers;
CREATE TRIGGER trg_customers_created_by BEFORE INSERT ON public.customers FOR EACH ROW EXECUTE FUNCTION public.force_created_by();

DROP TRIGGER IF EXISTS trg_orders_created_by ON public.orders;
CREATE TRIGGER trg_orders_created_by BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.force_created_by();

DROP TRIGGER IF EXISTS trg_payments_created_by ON public.payments;
CREATE TRIGGER trg_payments_created_by BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.force_created_by();

DROP TRIGGER IF EXISTS trg_expenses_created_by ON public.expenses;
CREATE TRIGGER trg_expenses_created_by BEFORE INSERT ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.force_created_by();
