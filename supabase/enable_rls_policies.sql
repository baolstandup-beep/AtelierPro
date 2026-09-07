-- ==============================================================================
-- ATELIERPRO — ACTIVATION ROW LEVEL SECURITY (RLS) & POLITIQUES SÉCURISÉES
-- À copier-coller dans l'Éditeur SQL de Supabase (Supabase > SQL Editor > Run)
-- ==============================================================================

-- 1. ACTIVATION DE LA RLS SUR TOUTES LES TABLES
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workshops FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS workshop_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workshop_members FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS order_items FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS measurement_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS measurement_profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS measurement_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS measurement_types FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS measurement_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS measurement_values FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS expenses FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS fabrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS fabrics FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS fitting_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS fitting_appointments FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs FORCE ROW LEVEL SECURITY;

-- ==============================================================================
-- 2. FONCTION DE SÉCURITÉ MULTI-TENANT (Vérification d'appartenance à l'atelier)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.user_is_member_of(_workshop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workshop_members
    WHERE workshop_id = _workshop_id
      AND user_id = auth.uid()
      AND status = 'ACTIVE'
  ) OR EXISTS (
    SELECT 1 FROM public.workshops
    WHERE id = _workshop_id
      AND owner_id = auth.uid()
  );
$$;

-- ==============================================================================
-- 3. POLITIQUES RLS BASÉES SUR auth.uid() ET user_is_member_of
-- ==============================================================================

-- ── Profiles (Utilisateurs) ──
DROP POLICY IF EXISTS "Profiles: lecture authentifiée" ON profiles;
CREATE POLICY "Profiles: lecture authentifiée"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Profiles: modification de son propre profil" ON profiles;
CREATE POLICY "Profiles: modification de son propre profil"
  ON profiles FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ── Workshops (Ateliers) ──
DROP POLICY IF EXISTS "Workshops: lecture pour propriétaire et membres" ON workshops;
CREATE POLICY "Workshops: lecture pour propriétaire et membres"
  ON workshops FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid() OR public.user_is_member_of(id));

DROP POLICY IF EXISTS "Workshops: création par utilisateur connecté" ON workshops;
CREATE POLICY "Workshops: création par utilisateur connecté"
  ON workshops FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Workshops: mise à jour par propriétaire" ON workshops;
CREATE POLICY "Workshops: mise à jour par propriétaire"
  ON workshops FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ── Workshop Members ──
DROP POLICY IF EXISTS "WorkshopMembers: lecture membres de l'atelier" ON workshop_members;
CREATE POLICY "WorkshopMembers: lecture membres de l'atelier"
  ON workshop_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.user_is_member_of(workshop_id));

DROP POLICY IF EXISTS "WorkshopMembers: gestion par propriétaire" ON workshop_members;
CREATE POLICY "WorkshopMembers: gestion par propriétaire"
  ON workshop_members FOR ALL
  TO authenticated
  USING (public.user_is_member_of(workshop_id))
  WITH CHECK (public.user_is_member_of(workshop_id));

-- ── Customers (Clients) ──
DROP POLICY IF EXISTS "Customers: isolation par atelier" ON customers;
CREATE POLICY "Customers: isolation par atelier"
  ON customers FOR ALL
  TO authenticated
  USING (public.user_is_member_of(workshop_id))
  WITH CHECK (public.user_is_member_of(workshop_id));

-- ── Orders (Commandes) ──
DROP POLICY IF EXISTS "Orders: isolation par atelier" ON orders;
CREATE POLICY "Orders: isolation par atelier"
  ON orders FOR ALL
  TO authenticated
  USING (public.user_is_member_of(workshop_id))
  WITH CHECK (public.user_is_member_of(workshop_id));

-- ── Order Items (Détails des tenues) ──
DROP POLICY IF EXISTS "OrderItems: isolation par atelier" ON order_items;
CREATE POLICY "OrderItems: isolation par atelier"
  ON order_items FOR ALL
  TO authenticated
  USING (public.user_is_member_of(workshop_id))
  WITH CHECK (public.user_is_member_of(workshop_id));

-- ── Measurements (Mesures) ──
DROP POLICY IF EXISTS "Measurements: isolation par atelier" ON measurement_profiles;
CREATE POLICY "Measurements: isolation par atelier"
  ON measurement_profiles FOR ALL
  TO authenticated
  USING (public.user_is_member_of(workshop_id))
  WITH CHECK (public.user_is_member_of(workshop_id));

-- ── Payments (Paiements) ──
DROP POLICY IF EXISTS "Payments: isolation par atelier" ON payments;
CREATE POLICY "Payments: isolation par atelier"
  ON payments FOR ALL
  TO authenticated
  USING (public.user_is_member_of(workshop_id))
  WITH CHECK (public.user_is_member_of(workshop_id));

-- ── Expenses (Dépenses) ──
DROP POLICY IF EXISTS "Expenses: isolation par atelier" ON expenses;
CREATE POLICY "Expenses: isolation par atelier"
  ON expenses FOR ALL
  TO authenticated
  USING (public.user_is_member_of(workshop_id))
  WITH CHECK (public.user_is_member_of(workshop_id));

-- ── Fabrics (Tissus & Stocks) ──
DROP POLICY IF EXISTS "Fabrics: isolation par atelier" ON fabrics;
CREATE POLICY "Fabrics: isolation par atelier"
  ON fabrics FOR ALL
  TO authenticated
  USING (public.user_is_member_of(workshop_id))
  WITH CHECK (public.user_is_member_of(workshop_id));

-- ── Fitting Appointments (Rendez-vous) ──
DROP POLICY IF EXISTS "Appointments: isolation par atelier" ON fitting_appointments;
CREATE POLICY "Appointments: isolation par atelier"
  ON fitting_appointments FOR ALL
  TO authenticated
  USING (public.user_is_member_of(workshop_id))
  WITH CHECK (public.user_is_member_of(workshop_id));

-- ── Notifications ──
DROP POLICY IF EXISTS "Notifications: destinataire unique" ON notifications;
CREATE POLICY "Notifications: destinataire unique"
  ON notifications FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
