-- ============================================================
-- AtelierPro — Schéma PostgreSQL Hardened & Multi-Tenant Sécurisé
-- Isolation absolue entre ateliers, RLS stricte, Intégrité financière & Triggers d'Audit
-- ============================================================

-- Extensions requises
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('OWNER', 'MANAGER', 'TAILOR', 'CUTTER', 'CASHIER', 'EMPLOYEE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('NEW', 'MEASURED', 'CUTTING', 'SEWING', 'FINISHING', 'READY', 'DELIVERED', 'ON_HOLD', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('CASH', 'WAVE', 'ORANGE_MONEY', 'BANK', 'STRIPE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'REFUNDED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE priority_level AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE gender_type AS ENUM ('MALE', 'FEMALE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE garment_type AS ENUM ('BOUBOU', 'KAFTAN', 'CHEMISE', 'PANTALON', 'ROBE', 'JUPE', 'VESTE', 'COSTUME', 'ENSEMBLE', 'AUTRE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE expense_category AS ENUM ('TISSU', 'FIL', 'MATERIEL', 'TRANSPORT', 'LOYER', 'ELECTRICITE', 'SALAIRES', 'ENTRETIEN', 'AUTRE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('ORDER_DUE_TODAY', 'ORDER_DUE_TOMORROW', 'ORDER_LATE', 'ORDER_READY', 'PAYMENT_RECEIVED', 'CUSTOMER_DEBT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM (
    'CUSTOMER_CREATED', 'CUSTOMER_UPDATED', 'CUSTOMER_ARCHIVED', 'CUSTOMER_DELETED',
    'ORDER_CREATED', 'ORDER_UPDATED', 'ORDER_STATUS_CHANGED', 'ORDER_DELIVERED', 'ORDER_CANCELLED', 'ORDER_DELETED',
    'PAYMENT_CREATED', 'PAYMENT_UPDATED', 'PAYMENT_REFUNDED',
    'MEASUREMENT_CREATED', 'MEASUREMENT_UPDATED',
    'MEMBER_INVITED', 'MEMBER_ROLE_CHANGED', 'MEMBER_DEACTIVATED', 'MEMBER_REMOVED',
    'EXPENSE_CREATED', 'EXPENSE_UPDATED', 'EXPENSE_DELETED',
    'WORKSHOP_UPDATED', 'SECURITY_ALERT'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- 1. PROFILES (Extension auth.users)
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;

-- ============================================================
-- 2. WORKSHOPS (Ateliers)
-- ============================================================

CREATE TABLE IF NOT EXISTS workshops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  phone TEXT,
  address TEXT,
  city TEXT,
  logo_url TEXT,
  currency TEXT NOT NULL DEFAULT 'XOF',
  currency_symbol TEXT NOT NULL DEFAULT 'FCFA',
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshops FORCE ROW LEVEL SECURITY;

-- ============================================================
-- 3. WORKSHOP_MEMBERS (Membres & RBAC)
-- ============================================================

CREATE TABLE IF NOT EXISTS workshop_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'EMPLOYEE',
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'INVITED')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_workshop_members_workshop_user UNIQUE(workshop_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workshop_members_user_status ON workshop_members(user_id, status);
CREATE INDEX IF NOT EXISTS idx_workshop_members_workshop_role ON workshop_members(workshop_id, role, status);

ALTER TABLE workshop_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_members FORCE ROW LEVEL SECURITY;

-- ============================================================
-- FONCTIONS SÉCURISÉES D'AUTHENTIFICATION & PERMISSIONS (SECURITY DEFINER)
-- search_path explicitement verrouillé à public, pg_temp pour parer le détournement
-- ============================================================

-- Vérifie si l'utilisateur actuel est membre actif d'un atelier
CREATE OR REPLACE FUNCTION public.user_is_member_of(p_workshop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workshop_members
    WHERE workshop_id = p_workshop_id
      AND user_id = auth.uid()
      AND status = 'ACTIVE'
  );
$$;

-- Obtient le rôle actif de l'utilisateur dans un atelier donné
CREATE OR REPLACE FUNCTION public.get_current_user_role(p_workshop_id UUID)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT role FROM workshop_members
  WHERE workshop_id = p_workshop_id
    AND user_id = auth.uid()
    AND status = 'ACTIVE'
  LIMIT 1;
$$;

-- Vérifie si l'utilisateur a l'un des rôles spécifiés dans l'atelier
CREATE OR REPLACE FUNCTION public.user_has_role(p_workshop_id UUID, p_roles user_role[])
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workshop_members
    WHERE workshop_id = p_workshop_id
      AND user_id = auth.uid()
      AND role = ANY(p_roles)
      AND status = 'ACTIVE'
  );
$$;

-- Vérifie des permissions granulaires
CREATE OR REPLACE FUNCTION public.has_permission(p_workshop_id UUID, p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role
  FROM workshop_members
  WHERE workshop_id = p_workshop_id
    AND user_id = auth.uid()
    AND status = 'ACTIVE';

  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  CASE p_permission
    -- Permissions financières
    WHEN 'FINANCIAL_READ', 'FINANCIAL_WRITE' THEN
      RETURN v_role IN ('OWNER', 'MANAGER', 'CASHIER');
    -- Permissions d'administration de l'atelier
    WHEN 'WORKSHOP_ADMIN', 'MANAGE_MEMBERS' THEN
      RETURN v_role IN ('OWNER', 'MANAGER');
    WHEN 'CHANGE_ROLES', 'DELETE_WORKSHOP' THEN
      RETURN v_role = 'OWNER';
    -- Permissions commandes & production
    WHEN 'CREATE_ORDER', 'EDIT_ORDER', 'UPDATE_STATUS', 'CREATE_CUSTOMER', 'TAKE_MEASUREMENT' THEN
      RETURN v_role IN ('OWNER', 'MANAGER', 'TAILOR', 'CUTTER', 'CASHIER', 'EMPLOYEE');
    WHEN 'DELETE_ORDER', 'CANCEL_ORDER', 'ARCHIVE_CUSTOMER' THEN
      RETURN v_role IN ('OWNER', 'MANAGER');
    WHEN 'VIEW_AUDIT_LOGS' THEN
      RETURN v_role IN ('OWNER', 'MANAGER');
    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- ============================================================
-- RLS POLICIES: PROFILES & WORKSHOPS & MEMBERS
-- ============================================================

-- Profiles policies
DROP POLICY IF EXISTS "Profiles: lecture authentifié" ON profiles;
CREATE POLICY "Profiles: lecture authentifié"
  ON profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Profiles: update par propriétaire" ON profiles;
CREATE POLICY "Profiles: update par propriétaire"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Workshops policies
DROP POLICY IF EXISTS "Workshops: lecture par membres actifs" ON workshops;
CREATE POLICY "Workshops: lecture par membres actifs"
  ON workshops FOR SELECT
  USING (public.user_is_member_of(id));

DROP POLICY IF EXISTS "Workshops: insertion par créateur authentifié" ON workshops;
CREATE POLICY "Workshops: insertion par créateur authentifié"
  ON workshops FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Workshops: update par OWNER/MANAGER" ON workshops;
CREATE POLICY "Workshops: update par OWNER/MANAGER"
  ON workshops FOR UPDATE
  USING (public.user_has_role(id, ARRAY['OWNER', 'MANAGER']::user_role[]))
  WITH CHECK (public.user_has_role(id, ARRAY['OWNER', 'MANAGER']::user_role[]));

DROP POLICY IF EXISTS "Workshops: delete par OWNER uniquement" ON workshops;
CREATE POLICY "Workshops: delete par OWNER uniquement"
  ON workshops FOR DELETE
  USING (public.user_has_role(id, ARRAY['OWNER']::user_role[]));

-- Workshop Members policies
DROP POLICY IF EXISTS "Members: lecture membres de son atelier" ON workshop_members;
CREATE POLICY "Members: lecture membres de son atelier"
  ON workshop_members FOR SELECT
  USING (public.user_is_member_of(workshop_id));

DROP POLICY IF EXISTS "Members: invitation par OWNER/MANAGER" ON workshop_members;
CREATE POLICY "Members: invitation par OWNER/MANAGER"
  ON workshop_members FOR INSERT
  WITH CHECK (
    public.user_has_role(workshop_id, ARRAY['OWNER', 'MANAGER']::user_role[])
    OR (
      -- Autoriser l'auto-insertion de l'OWNER lors de la création de l'atelier
      user_id = auth.uid() AND role = 'OWNER'
    )
  );

DROP POLICY IF EXISTS "Members: modification par OWNER/MANAGER" ON workshop_members;
CREATE POLICY "Members: modification par OWNER/MANAGER"
  ON workshop_members FOR UPDATE
  USING (public.user_has_role(workshop_id, ARRAY['OWNER', 'MANAGER']::user_role[]))
  WITH CHECK (public.user_has_role(workshop_id, ARRAY['OWNER', 'MANAGER']::user_role[]));

DROP POLICY IF EXISTS "Members: suppression par OWNER" ON workshop_members;
CREATE POLICY "Members: suppression par OWNER"
  ON workshop_members FOR DELETE
  USING (public.user_has_role(workshop_id, ARRAY['OWNER']::user_role[]));

-- ============================================================
-- 4. CUSTOMERS (Clients)
-- ============================================================

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL CHECK (char_length(trim(full_name)) > 0),
  phone TEXT NOT NULL CHECK (char_length(trim(phone)) > 0),
  email TEXT,
  address TEXT,
  city TEXT,
  gender gender_type,
  photo_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  -- Clé unique composite obligatoire pour verrouiller les clés étrangères multi-tenant
  CONSTRAINT uq_customers_id_workshop UNIQUE (id, workshop_id)
);

CREATE INDEX IF NOT EXISTS idx_customers_workshop_id ON customers(workshop_id);
CREATE INDEX IF NOT EXISTS idx_customers_workshop_phone ON customers(workshop_id, phone);
CREATE INDEX IF NOT EXISTS idx_customers_workshop_name ON customers(workshop_id, full_name);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(workshop_id) WHERE deleted_at IS NULL;

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers: lecture par membres" ON customers;
CREATE POLICY "Customers: lecture par membres"
  ON customers FOR SELECT
  USING (public.user_is_member_of(workshop_id));

DROP POLICY IF EXISTS "Customers: création par membres" ON customers;
CREATE POLICY "Customers: création par membres"
  ON customers FOR INSERT
  WITH CHECK (public.user_is_member_of(workshop_id));

DROP POLICY IF EXISTS "Customers: mise à jour par membres" ON customers;
CREATE POLICY "Customers: mise à jour par membres"
  ON customers FOR UPDATE
  USING (public.user_is_member_of(workshop_id))
  WITH CHECK (public.user_is_member_of(workshop_id));

DROP POLICY IF EXISTS "Customers: suppression par OWNER/MANAGER" ON customers;
CREATE POLICY "Customers: suppression par OWNER/MANAGER"
  ON customers FOR DELETE
  USING (public.user_has_role(workshop_id, ARRAY['OWNER', 'MANAGER']::user_role[]));

-- ============================================================
-- 5. MEASUREMENT_TYPES, TEMPLATES, PROFILES, VALUES
-- ============================================================

CREATE TABLE IF NOT EXISTS measurement_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_meas_templates_id_workshop UNIQUE (id, workshop_id)
);

CREATE INDEX IF NOT EXISTS idx_measurement_templates_workshop ON measurement_templates(workshop_id);
ALTER TABLE measurement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_templates FORCE ROW LEVEL SECURITY;

CREATE POLICY "MeasTemplates: accès membres"
  ON measurement_templates FOR ALL
  USING (public.user_is_member_of(workshop_id))
  WITH CHECK (public.user_is_member_of(workshop_id));

CREATE TABLE IF NOT EXISTS measurement_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'cm',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_meas_types_id_workshop UNIQUE (id, workshop_id)
);

CREATE INDEX IF NOT EXISTS idx_measurement_types_workshop ON measurement_types(workshop_id);
ALTER TABLE measurement_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_types FORCE ROW LEVEL SECURITY;

CREATE POLICY "MeasTypes: accès membres"
  ON measurement_types FOR ALL
  USING (public.user_is_member_of(workshop_id))
  WITH CHECK (public.user_is_member_of(workshop_id));

CREATE TABLE IF NOT EXISTS measurement_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  label TEXT,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  taken_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Clé composite stricte : le client doit appartenir au MEME atelier
  CONSTRAINT fk_meas_profiles_customer_workshop FOREIGN KEY (customer_id, workshop_id)
    REFERENCES customers(id, workshop_id) ON DELETE CASCADE,
  CONSTRAINT uq_meas_profiles_id_workshop UNIQUE (id, workshop_id)
);

CREATE INDEX IF NOT EXISTS idx_measurement_profiles_customer ON measurement_profiles(workshop_id, customer_id);
ALTER TABLE measurement_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_profiles FORCE ROW LEVEL SECURITY;

CREATE POLICY "MeasProfiles: accès membres"
  ON measurement_profiles FOR ALL
  USING (public.user_is_member_of(workshop_id))
  WITH CHECK (public.user_is_member_of(workshop_id));

CREATE TABLE IF NOT EXISTS measurement_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL,
  measurement_type_id UUID NOT NULL,
  value DECIMAL(8,2) NOT NULL CHECK (value >= 0),
  unit TEXT NOT NULL DEFAULT 'cm',
  -- Clés composites pour empêcher toute injection croisée
  CONSTRAINT fk_meas_values_profile_workshop FOREIGN KEY (profile_id, workshop_id)
    REFERENCES measurement_profiles(id, workshop_id) ON DELETE CASCADE,
  CONSTRAINT fk_meas_values_type_workshop FOREIGN KEY (measurement_type_id, workshop_id)
    REFERENCES measurement_types(id, workshop_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_measurement_values_profile ON measurement_values(workshop_id, profile_id);
ALTER TABLE measurement_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_values FORCE ROW LEVEL SECURITY;

CREATE POLICY "MeasValues: accès membres"
  ON measurement_values FOR ALL
  USING (public.user_is_member_of(workshop_id))
  WITH CHECK (public.user_is_member_of(workshop_id));

-- ============================================================
-- 6. ORDERS (Commandes & Verrouillage Financier)
-- ============================================================

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  order_number TEXT NOT NULL CHECK (char_length(trim(order_number)) > 0),
  status order_status NOT NULL DEFAULT 'NEW',
  priority priority_level NOT NULL DEFAULT 'NORMAL',
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  balance DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  -- Contraintes d'intégrité strictes
  CONSTRAINT uq_orders_id_workshop UNIQUE (id, workshop_id),
  CONSTRAINT uq_orders_workshop_number UNIQUE (workshop_id, order_number),
  CONSTRAINT fk_orders_customer_workshop FOREIGN KEY (customer_id, workshop_id)
    REFERENCES customers(id, workshop_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_orders_workshop_id ON orders(workshop_id);
CREATE INDEX IF NOT EXISTS idx_orders_workshop_customer ON orders(workshop_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_workshop_status ON orders(workshop_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_workshop_due_date ON orders(workshop_id, due_date);
CREATE INDEX IF NOT EXISTS idx_orders_active ON orders(workshop_id) WHERE deleted_at IS NULL;

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Orders: lecture par membres" ON orders;
CREATE POLICY "Orders: lecture par membres"
  ON orders FOR SELECT
  USING (public.user_is_member_of(workshop_id));

DROP POLICY IF EXISTS "Orders: création par membres" ON orders;
CREATE POLICY "Orders: création par membres"
  ON orders FOR INSERT
  WITH CHECK (public.user_is_member_of(workshop_id));

DROP POLICY IF EXISTS "Orders: modification par membres" ON orders;
CREATE POLICY "Orders: modification par membres"
  ON orders FOR UPDATE
  USING (public.user_is_member_of(workshop_id))
  WITH CHECK (public.user_is_member_of(workshop_id));

DROP POLICY IF EXISTS "Orders: suppression par OWNER/MANAGER" ON orders;
CREATE POLICY "Orders: suppression par OWNER/MANAGER"
  ON orders FOR DELETE
  USING (public.user_has_role(workshop_id, ARRAY['OWNER', 'MANAGER']::user_role[]));

-- ============================================================
-- 7. ORDER_ITEMS (Articles de commande)
-- ============================================================

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  order_id UUID NOT NULL,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  garment_type garment_type,
  fabric TEXT,
  color TEXT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  reference_image_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_order_items_order_workshop FOREIGN KEY (order_id, workshop_id)
    REFERENCES orders(id, workshop_id) ON DELETE CASCADE,
  CONSTRAINT uq_order_items_id_workshop UNIQUE (id, workshop_id)
);

CREATE INDEX IF NOT EXISTS idx_order_items_workshop_order ON order_items(workshop_id, order_id);
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items FORCE ROW LEVEL SECURITY;

CREATE POLICY "OrderItems: accès membres"
  ON order_items FOR ALL
  USING (public.user_is_member_of(workshop_id))
  WITH CHECK (public.user_is_member_of(workshop_id));

-- ============================================================
-- 8. ORDER_STATUS_HISTORY
-- ============================================================

CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  order_id UUID NOT NULL,
  old_status order_status,
  new_status order_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_status_history_order_workshop FOREIGN KEY (order_id, workshop_id)
    REFERENCES orders(id, workshop_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_status_history_workshop_order ON order_status_history(workshop_id, order_id);
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history FORCE ROW LEVEL SECURITY;

CREATE POLICY "StatusHistory: accès membres"
  ON order_status_history FOR ALL
  USING (public.user_is_member_of(workshop_id))
  WITH CHECK (public.user_is_member_of(workshop_id));

-- ============================================================
-- 9. PAYMENTS (Paiements & Protection financière)
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  order_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  method payment_method NOT NULL DEFAULT 'CASH',
  status payment_status NOT NULL DEFAULT 'CONFIRMED',
  reference TEXT,
  notes TEXT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Intégrité multi-tenant obligatoire
  CONSTRAINT fk_payments_order_workshop FOREIGN KEY (order_id, workshop_id)
    REFERENCES orders(id, workshop_id) ON DELETE RESTRICT,
  CONSTRAINT fk_payments_customer_workshop FOREIGN KEY (customer_id, workshop_id)
    REFERENCES customers(id, workshop_id) ON DELETE RESTRICT,
  CONSTRAINT uq_payments_id_workshop UNIQUE (id, workshop_id)
);

CREATE INDEX IF NOT EXISTS idx_payments_workshop ON payments(workshop_id);
CREATE INDEX IF NOT EXISTS idx_payments_workshop_order ON payments(workshop_id, order_id);
CREATE INDEX IF NOT EXISTS idx_payments_workshop_customer ON payments(workshop_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_workshop_date ON payments(workshop_id, payment_date);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Payments: lecture par rôles autorisés" ON payments;
CREATE POLICY "Payments: lecture par rôles autorisés"
  ON payments FOR SELECT
  USING (
    public.user_has_role(workshop_id, ARRAY['OWNER', 'MANAGER', 'CASHIER']::user_role[])
  );

DROP POLICY IF EXISTS "Payments: création par rôles autorisés" ON payments;
CREATE POLICY "Payments: création par rôles autorisés"
  ON payments FOR INSERT
  WITH CHECK (
    public.user_has_role(workshop_id, ARRAY['OWNER', 'MANAGER', 'CASHIER']::user_role[])
  );

DROP POLICY IF EXISTS "Payments: mise à jour par OWNER/MANAGER" ON payments;
CREATE POLICY "Payments: mise à jour par OWNER/MANAGER"
  ON payments FOR UPDATE
  USING (public.user_has_role(workshop_id, ARRAY['OWNER', 'MANAGER']::user_role[]))
  WITH CHECK (public.user_has_role(workshop_id, ARRAY['OWNER', 'MANAGER']::user_role[]));

DROP POLICY IF EXISTS "Payments: suppression par OWNER uniquement" ON payments;
CREATE POLICY "Payments: suppression par OWNER uniquement"
  ON payments FOR DELETE
  USING (public.user_has_role(workshop_id, ARRAY['OWNER']::user_role[]));

-- ============================================================
-- 10. EXPENSES (Dépenses)
-- ============================================================

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  category expense_category NOT NULL DEFAULT 'AUTRE',
  description TEXT NOT NULL CHECK (char_length(trim(description)) > 0),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method payment_method DEFAULT 'CASH',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_workshop ON expenses(workshop_id);
CREATE INDEX IF NOT EXISTS idx_expenses_workshop_date ON expenses(workshop_id, expense_date);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses FORCE ROW LEVEL SECURITY;

CREATE POLICY "Expenses: lecture par rôles autorisés"
  ON expenses FOR SELECT
  USING (public.user_has_role(workshop_id, ARRAY['OWNER', 'MANAGER', 'CASHIER']::user_role[]));

CREATE POLICY "Expenses: création par rôles autorisés"
  ON expenses FOR INSERT
  WITH CHECK (public.user_has_role(workshop_id, ARRAY['OWNER', 'MANAGER', 'CASHIER']::user_role[]));

CREATE POLICY "Expenses: modification par OWNER/MANAGER"
  ON expenses FOR UPDATE
  USING (public.user_has_role(workshop_id, ARRAY['OWNER', 'MANAGER']::user_role[]))
  WITH CHECK (public.user_has_role(workshop_id, ARRAY['OWNER', 'MANAGER']::user_role[]));

CREATE POLICY "Expenses: suppression par OWNER/MANAGER"
  ON expenses FOR DELETE
  USING (public.user_has_role(workshop_id, ARRAY['OWNER', 'MANAGER']::user_role[]));

-- ============================================================
-- 11. ATTACHMENTS (Fichiers & Photos)
-- ============================================================

CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('customer', 'order', 'order_item')),
  entity_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  size_bytes INTEGER CHECK (size_bytes > 0 AND size_bytes <= 10485760), -- Max 10MB
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attachments_workshop_entity ON attachments(workshop_id, entity_type, entity_id);
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments FORCE ROW LEVEL SECURITY;

CREATE POLICY "Attachments: accès membres"
  ON attachments FOR ALL
  USING (public.user_is_member_of(workshop_id))
  WITH CHECK (public.user_is_member_of(workshop_id));

-- ============================================================
-- 12. NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read_at);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

CREATE POLICY "Notifications: lecture propre"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Notifications: mise à jour propre"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 13. AUDIT_LOGS (Journal d'audit immuable)
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action audit_action NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  old_data JSONB,
  new_data JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_workshop_created ON audit_logs(workshop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_workshop_entity ON audit_logs(workshop_id, entity_type, entity_id);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

-- Lecture réservée aux OWNER et MANAGER de l'atelier
CREATE POLICY "AuditLogs: lecture par OWNER/MANAGER"
  ON audit_logs FOR SELECT
  USING (public.user_has_role(workshop_id, ARRAY['OWNER', 'MANAGER']::user_role[]));

-- Insertion par membres de l'atelier ou triggers
CREATE POLICY "AuditLogs: insertion sécurisée"
  ON audit_logs FOR INSERT
  WITH CHECK (public.user_is_member_of(workshop_id));

-- STRICTEMENT AUCUNE politique d'UPDATE ni de DELETE (journal d'audit inviolable)

-- ============================================================
-- TRIGGERS D'INTÉGRITÉ & SÉCURITÉ
-- ============================================================

-- 1. Updated_at automatique
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_workshops_updated_at BEFORE UPDATE ON workshops FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Recalcul automatique et atomique du paid_amount d'une commande
CREATE OR REPLACE FUNCTION public.recalculate_order_paid_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order_id UUID;
  v_workshop_id UUID;
  v_total_paid DECIMAL(12,2);
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_order_id := OLD.order_id;
    v_workshop_id := OLD.workshop_id;
  ELSE
    v_order_id := NEW.order_id;
    v_workshop_id := NEW.workshop_id;
  END IF;

  -- Calculer la somme exacte des paiements confirmés
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM payments
  WHERE order_id = v_order_id
    AND workshop_id = v_workshop_id
    AND status = 'CONFIRMED';

  -- Mettre à jour la commande
  UPDATE orders
  SET paid_amount = v_total_paid
  WHERE id = v_order_id
    AND workshop_id = v_workshop_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_recalc_after_change ON payments;
CREATE TRIGGER trg_payment_recalc_after_change
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION recalculate_order_paid_amount();

-- 3. Validation croisée commande / client lors de l'enregistrement d'un paiement
CREATE OR REPLACE FUNCTION public.validate_payment_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order_customer_id UUID;
  v_order_workshop_id UUID;
BEGIN
  -- Vérifier que la commande existe et appartient au bon atelier
  SELECT customer_id, workshop_id
  INTO v_order_customer_id, v_order_workshop_id
  FROM orders
  WHERE id = NEW.order_id;

  IF v_order_workshop_id IS NULL OR v_order_workshop_id <> NEW.workshop_id THEN
    RAISE EXCEPTION 'VIOLATION DE SÉCURITÉ : La commande % n''appartient pas à l''atelier %.', NEW.order_id, NEW.workshop_id
      USING ERRCODE = '23503';
  END IF;

  IF v_order_customer_id <> NEW.customer_id THEN
    RAISE EXCEPTION 'INCOHÉRENCE : Le client du paiement (%) ne correspond pas au client de la commande (%).', NEW.customer_id, v_order_customer_id
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_payment_integrity_trigger ON payments;
CREATE TRIGGER trg_validate_payment_integrity_trigger
  BEFORE INSERT OR UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION validate_payment_integrity();

-- 4. Audit Log Automatique sur commandes, paiements, clients
CREATE OR REPLACE FUNCTION public.log_order_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_action audit_action;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'ORDER_CREATED';
    INSERT INTO audit_logs (workshop_id, user_id, action, entity_type, entity_id, new_data)
    VALUES (NEW.workshop_id, auth.uid(), v_action, 'order', NEW.id, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status <> NEW.status THEN
      v_action := CASE WHEN NEW.status = 'DELIVERED' THEN 'ORDER_DELIVERED'
                       WHEN NEW.status = 'CANCELLED' THEN 'ORDER_CANCELLED'
                       ELSE 'ORDER_STATUS_CHANGED' END;
      -- Enregistrer aussi dans order_status_history
      INSERT INTO order_status_history (workshop_id, order_id, old_status, new_status, changed_by)
      VALUES (NEW.workshop_id, NEW.id, OLD.status, NEW.status, auth.uid());
    ELSE
      v_action := 'ORDER_UPDATED';
    END IF;
    INSERT INTO audit_logs (workshop_id, user_id, action, entity_type, entity_id, old_data, new_data)
    VALUES (NEW.workshop_id, auth.uid(), v_action, 'order', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'ORDER_DELETED';
    INSERT INTO audit_logs (workshop_id, user_id, action, entity_type, entity_id, old_data)
    VALUES (OLD.workshop_id, auth.uid(), v_action, 'order', OLD.id, to_jsonb(OLD));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_order_changes ON orders;
CREATE TRIGGER trg_audit_order_changes
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION log_order_changes();

-- 5. Profil utilisateur automatique à la création de compte Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_user_profile ON auth.users;
CREATE TRIGGER trg_new_user_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 14. VUES SÉCURISÉES AVEC SECURITY_INVOKER
-- ============================================================

CREATE OR REPLACE VIEW order_full
WITH (security_invoker = true)
AS
SELECT
  o.*,
  c.full_name AS customer_name,
  c.phone AS customer_phone,
  CASE
    WHEN o.status NOT IN ('DELIVERED', 'CANCELLED')
      AND o.due_date < CURRENT_DATE
    THEN true
    ELSE false
  END AS is_late,
  p.full_name AS assignee_name
FROM orders o
LEFT JOIN customers c ON c.id = o.customer_id AND c.workshop_id = o.workshop_id
LEFT JOIN profiles p ON p.id = o.assigned_to
WHERE o.deleted_at IS NULL;

CREATE OR REPLACE VIEW customer_summary
WITH (security_invoker = true)
AS
SELECT
  c.*,
  COUNT(DISTINCT o.id) AS total_orders,
  COALESCE(SUM(o.total_amount), 0) AS total_spent,
  COALESCE(SUM(o.balance), 0) AS total_balance,
  MAX(o.created_at) AS last_order_at
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id AND o.workshop_id = c.workshop_id AND o.deleted_at IS NULL
WHERE c.deleted_at IS NULL
GROUP BY c.id;

-- ============================================================
-- 15. STORAGE BUCKET RLS POLICIES (Supabase Storage Hardening)
-- ============================================================

-- Les fichiers doivent être stockés sous : workshop-attachments/<workshop_id>/...
-- L'accès au storage est rigoureusement conditionné à l'appartenance à l'atelier
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    EXECUTE '
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Storage: lecture fichiers atelier" ON storage.objects;
      CREATE POLICY "Storage: lecture fichiers atelier"
        ON storage.objects FOR SELECT
        USING (
          bucket_id IN (''workshop-photos'', ''workshop-attachments'')
          AND public.user_is_member_of((storage.foldername(name))[1]::uuid)
        );

      DROP POLICY IF EXISTS "Storage: upload fichiers atelier" ON storage.objects;
      CREATE POLICY "Storage: upload fichiers atelier"
        ON storage.objects FOR INSERT
        WITH CHECK (
          bucket_id IN (''workshop-photos'', ''workshop-attachments'')
          AND public.user_is_member_of((storage.foldername(name))[1]::uuid)
        );

      DROP POLICY IF EXISTS "Storage: suppression par OWNER/MANAGER" ON storage.objects;
      CREATE POLICY "Storage: suppression par OWNER/MANAGER"
        ON storage.objects FOR DELETE
        USING (
          bucket_id IN (''workshop-photos'', ''workshop-attachments'')
          AND public.user_has_role((storage.foldername(name))[1]::uuid, ARRAY[''OWNER'', ''MANAGER'']::user_role[])
        );
    ';
  END IF;
END $$;

-- ============================================================
-- 16. PLANS & SUBSCRIPTIONS (Architecture SaaS Abonnement)
-- ============================================================

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  price NUMERIC NOT NULL DEFAULT 0 CHECK (price >= 0),
  billing_period TEXT NOT NULL DEFAULT 'MONTHLY' CHECK (billing_period IN ('MONTHLY', 'YEARLY')),
  max_members INTEGER NOT NULL DEFAULT 3,
  max_orders INTEGER NOT NULL DEFAULT 100,
  max_storage_mb INTEGER NOT NULL DEFAULT 500,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans FORCE ROW LEVEL SECURITY;

CREATE POLICY "Plans: lecture publique authentifiée"
  ON plans FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'TRIAL', 'PAST_DUE', 'CANCELLED', 'EXPIRED')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  provider TEXT DEFAULT 'MANUAL',
  provider_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY;

CREATE POLICY "Subscriptions: lecture membres atelier"
  ON subscriptions FOR SELECT
  USING (public.user_is_member_of(workshop_id));

CREATE POLICY "Subscriptions: gestion par OWNER"
  ON subscriptions FOR ALL
  USING (public.user_has_role(workshop_id, ARRAY['OWNER']::user_role[]));

-- ============================================================
-- 17. PAIEMENTS MOBILES FUTURS (Intents, Webhooks & Idempotence)
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_intents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'XOF',
  provider TEXT NOT NULL, -- 'WAVE', 'ORANGE_MONEY', 'LIGDICASH'
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED')),
  idempotency_key TEXT NOT NULL UNIQUE,
  provider_reference TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_intents FORCE ROW LEVEL SECURITY;

CREATE POLICY "PaymentIntents: lecture atelier"
  ON payment_intents FOR SELECT
  USING (public.user_is_member_of(workshop_id));

CREATE POLICY "PaymentIntents: création par caissier ou gestionnaire"
  ON payment_intents FOR INSERT
  WITH CHECK (
    public.user_is_member_of(workshop_id)
    AND public.user_has_role(workshop_id, ARRAY['OWNER', 'MANAGER', 'CASHIER']::user_role[])
  );

CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_intent_id UUID NOT NULL REFERENCES payment_intents(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  signature TEXT NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  UNIQUE(provider, event_id)
);

-- ============================================================
-- 18. SEED INITIAL DES PLANS SAAS
-- ============================================================

INSERT INTO plans (name, price, billing_period, max_members, max_orders, max_storage_mb, features)
VALUES
  ('Starter', 9900, 'MONTHLY', 2, 50, 250, '["Gestion clients & commandes", "Mesures illimitées", "Paiements manuels", "Support WhatsApp"]'::jsonb),
  ('Pro', 19900, 'MONTHLY', 5, 200, 1000, '["Toutes les fonctionnalités Starter", "Vue Kanban de production", "Calendrier des livraisons", "Multi-utilisateurs RBAC", "Rapports financiers & export CSV"]'::jsonb),
  ('Business', 39900, 'MONTHLY', 15, 1000, 5000, '["Toutes les fonctionnalités Pro", "Atelier multi-postes", "Intégration paiements Wave & Orange Money", "Support prioritaire 7j/7", "Sauvegarde quotidienne"]'::jsonb)
ON CONFLICT (name) DO NOTHING;
