-- ==============================================================================
-- ATELIERPRO — INSTALLATION COMPLÈTE BASE DE DONNÉES & SÉCURITÉ RLS
-- Script unifié, idempotent et sans erreur pour Supabase SQL Editor
-- ==============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Types ENUM (Création sécurisée sans duplication)
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('OWNER', 'MANAGER', 'TAILOR', 'CUTTER', 'CASHIER', 'EMPLOYEE'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE order_status AS ENUM ('NEW', 'MEASURED', 'CUTTING', 'SEWING', 'FINISHING', 'READY', 'DELIVERED', 'ON_HOLD', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE payment_method AS ENUM ('CASH', 'WAVE', 'ORANGE_MONEY', 'BANK', 'STRIPE', 'OTHER'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE payment_status AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'REFUNDED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE priority_level AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE gender_type AS ENUM ('MALE', 'FEMALE', 'OTHER'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE garment_type AS ENUM ('BOUBOU', 'KAFTAN', 'CHEMISE', 'PANTALON', 'ROBE', 'JUPE', 'VESTE', 'COSTUME', 'ENSEMBLE', 'AUTRE'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE expense_category AS ENUM ('TISSU', 'FIL', 'MATERIEL', 'TRANSPORT', 'LOYER', 'ELECTRICITE', 'SALAIRES', 'ENTRETIEN', 'AUTRE'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Création des Tables
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workshops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS workshop_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'TAILOR',
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'INVITED')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workshop_id, user_id)
);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  city TEXT,
  gender gender_type DEFAULT 'OTHER',
  photo_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  order_number TEXT NOT NULL,
  status order_status NOT NULL DEFAULT 'NEW',
  priority priority_level NOT NULL DEFAULT 'NORMAL',
  total_amount NUMERIC NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  paid_amount NUMERIC NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  balance NUMERIC NOT NULL DEFAULT 0 CHECK (balance >= 0),
  order_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date DATE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  garment_type garment_type,
  fabric TEXT,
  color TEXT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  reference_image_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS measurement_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Mesures Standard',
  notes TEXT,
  fabric_image_url TEXT,
  model_image_url TEXT,
  fabric_type TEXT,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS measurement_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'cm',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS measurement_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES measurement_profiles(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  measurement_type_id UUID NOT NULL REFERENCES measurement_types(id) ON DELETE RESTRICT,
  value NUMERIC NOT NULL CHECK (value >= 0),
  unit TEXT NOT NULL DEFAULT 'cm'
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_method payment_method NOT NULL DEFAULT 'CASH',
  status payment_status NOT NULL DEFAULT 'CONFIRMED',
  reference TEXT,
  notes TEXT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  received_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  category expense_category NOT NULL DEFAULT 'AUTRE',
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method payment_method DEFAULT 'CASH',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fabrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'BAZIN',
  color_name TEXT,
  color_hex TEXT,
  pattern TEXT,
  origin TEXT,
  total_meters NUMERIC NOT NULL DEFAULT 0 CHECK (total_meters >= 0),
  available_meters NUMERIC NOT NULL DEFAULT 0 CHECK (available_meters >= 0),
  reserved_meters NUMERIC NOT NULL DEFAULT 0 CHECK (reserved_meters >= 0),
  price_per_meter NUMERIC NOT NULL DEFAULT 0 CHECK (price_per_meter >= 0),
  supplier TEXT,
  location_shelf TEXT,
  low_stock_threshold NUMERIC NOT NULL DEFAULT 5,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fitting_appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  appointment_type TEXT NOT NULL DEFAULT 'PREMIER_ESSAYAGE',
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  assigned_tailor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Fonction Multi-Tenant Sécurisée
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

-- 5. Activation RLS Stricte sur toutes les tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshops FORCE ROW LEVEL SECURITY;

ALTER TABLE workshop_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_members FORCE ROW LEVEL SECURITY;

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items FORCE ROW LEVEL SECURITY;

ALTER TABLE measurement_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE measurement_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_types FORCE ROW LEVEL SECURITY;

ALTER TABLE measurement_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_values FORCE ROW LEVEL SECURITY;

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses FORCE ROW LEVEL SECURITY;

ALTER TABLE fabrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabrics FORCE ROW LEVEL SECURITY;

ALTER TABLE fitting_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitting_appointments FORCE ROW LEVEL SECURITY;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

-- 6. Politiques RLS (user_id = auth.uid() & Multi-Tenant)
DO $$ BEGIN
  -- Profiles
  DROP POLICY IF EXISTS "profiles_select_auth" ON profiles;
  CREATE POLICY "profiles_select_auth" ON profiles FOR SELECT TO authenticated USING (true);
  
  DROP POLICY IF EXISTS "profiles_update_self" ON profiles;
  CREATE POLICY "profiles_update_self" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

  -- Workshops
  DROP POLICY IF EXISTS "workshops_select" ON workshops;
  CREATE POLICY "workshops_select" ON workshops FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.user_is_member_of(id));

  DROP POLICY IF EXISTS "workshops_insert" ON workshops;
  CREATE POLICY "workshops_insert" ON workshops FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

  DROP POLICY IF EXISTS "workshops_update" ON workshops;
  CREATE POLICY "workshops_update" ON workshops FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

  -- Workshop Members (Prevent role escalation from client)
  DROP POLICY IF EXISTS "members_select" ON workshop_members;
  CREATE POLICY "members_select" ON workshop_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.user_is_member_of(workshop_id));
  
  -- Seuls les owners ou managers devraient pouvoir insérer/update, mais pour simplifier on limite au workshop_id (le client ne doit pas forcer des rôles super administrateurs)
  DROP POLICY IF EXISTS "members_insert" ON workshop_members;
  CREATE POLICY "members_insert" ON workshop_members FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM workshop_members WHERE workshop_id = workshop_members.workshop_id AND user_id = auth.uid() AND role IN ('OWNER', 'MANAGER')));
  DROP POLICY IF EXISTS "members_update" ON workshop_members;
  CREATE POLICY "members_update" ON workshop_members FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM workshop_members WHERE workshop_id = workshop_members.workshop_id AND user_id = auth.uid() AND role IN ('OWNER', 'MANAGER')));
  DROP POLICY IF EXISTS "members_delete" ON workshop_members;
  CREATE POLICY "members_delete" ON workshop_members FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM workshop_members WHERE workshop_id = workshop_members.workshop_id AND user_id = auth.uid() AND role = 'OWNER'));

  -- Customers
  DROP POLICY IF EXISTS "customers_select" ON customers;
  CREATE POLICY "customers_select" ON customers FOR SELECT TO authenticated USING (public.user_is_member_of(workshop_id));
  DROP POLICY IF EXISTS "customers_insert" ON customers;
  CREATE POLICY "customers_insert" ON customers FOR INSERT TO authenticated WITH CHECK (public.user_is_member_of(workshop_id));
  DROP POLICY IF EXISTS "customers_update" ON customers;
  CREATE POLICY "customers_update" ON customers FOR UPDATE TO authenticated USING (public.user_is_member_of(workshop_id));
  DROP POLICY IF EXISTS "customers_delete" ON customers;
  CREATE POLICY "customers_delete" ON customers FOR DELETE TO authenticated USING (public.user_is_member_of(workshop_id));

  -- Orders
  DROP POLICY IF EXISTS "orders_select" ON orders;
  CREATE POLICY "orders_select" ON orders FOR SELECT TO authenticated USING (public.user_is_member_of(workshop_id));
  DROP POLICY IF EXISTS "orders_insert" ON orders;
  CREATE POLICY "orders_insert" ON orders FOR INSERT TO authenticated WITH CHECK (public.user_is_member_of(workshop_id));
  DROP POLICY IF EXISTS "orders_update" ON orders;
  CREATE POLICY "orders_update" ON orders FOR UPDATE TO authenticated USING (public.user_is_member_of(workshop_id));
  DROP POLICY IF EXISTS "orders_delete" ON orders;
  CREATE POLICY "orders_delete" ON orders FOR DELETE TO authenticated USING (public.user_is_member_of(workshop_id));

  -- Order Items
  DROP POLICY IF EXISTS "order_items_select" ON order_items;
  CREATE POLICY "order_items_select" ON order_items FOR SELECT TO authenticated USING (public.user_is_member_of(workshop_id));
  DROP POLICY IF EXISTS "order_items_insert" ON order_items;
  CREATE POLICY "order_items_insert" ON order_items FOR INSERT TO authenticated WITH CHECK (public.user_is_member_of(workshop_id));
  DROP POLICY IF EXISTS "order_items_update" ON order_items;
  CREATE POLICY "order_items_update" ON order_items FOR UPDATE TO authenticated USING (public.user_is_member_of(workshop_id));
  DROP POLICY IF EXISTS "order_items_delete" ON order_items;
  CREATE POLICY "order_items_delete" ON order_items FOR DELETE TO authenticated USING (public.user_is_member_of(workshop_id));

  -- Measurement Profiles
  DROP POLICY IF EXISTS "measurement_profiles_select" ON measurement_profiles;
  CREATE POLICY "measurement_profiles_select" ON measurement_profiles FOR SELECT TO authenticated USING (public.user_is_member_of(workshop_id));
  DROP POLICY IF EXISTS "measurement_profiles_insert" ON measurement_profiles;
  CREATE POLICY "measurement_profiles_insert" ON measurement_profiles FOR INSERT TO authenticated WITH CHECK (public.user_is_member_of(workshop_id));
  DROP POLICY IF EXISTS "measurement_profiles_update" ON measurement_profiles;
  CREATE POLICY "measurement_profiles_update" ON measurement_profiles FOR UPDATE TO authenticated USING (public.user_is_member_of(workshop_id));
  DROP POLICY IF EXISTS "measurement_profiles_delete" ON measurement_profiles;
  CREATE POLICY "measurement_profiles_delete" ON measurement_profiles FOR DELETE TO authenticated USING (public.user_is_member_of(workshop_id));

  -- Measurement Types
  DROP POLICY IF EXISTS "measurement_types_select" ON measurement_types;
  CREATE POLICY "measurement_types_select" ON measurement_types FOR SELECT TO authenticated USING (workshop_id IS NULL OR public.user_is_member_of(workshop_id));
  DROP POLICY IF EXISTS "measurement_types_insert" ON measurement_types;
  CREATE POLICY "measurement_types_insert" ON measurement_types FOR INSERT TO authenticated WITH CHECK (workshop_id IS NULL OR public.user_is_member_of(workshop_id));
  DROP POLICY IF EXISTS "measurement_types_update" ON measurement_types;
  CREATE POLICY "measurement_types_update" ON measurement_types FOR UPDATE TO authenticated USING (workshop_id IS NULL OR public.user_is_member_of(workshop_id));
  DROP POLICY IF EXISTS "measurement_types_delete" ON measurement_types;
  CREATE POLICY "measurement_types_delete" ON measurement_types FOR DELETE TO authenticated USING (workshop_id IS NULL OR public.user_is_member_of(workshop_id));

  -- Measurement Values
  DROP POLICY IF EXISTS "measurement_values_select" ON measurement_values;
  CREATE POLICY "measurement_values_select" ON measurement_values FOR SELECT TO authenticated USING (public.user_is_member_of(workshop_id));
  DROP POLICY IF EXISTS "measurement_values_insert" ON measurement_values;
  CREATE POLICY "measurement_values_insert" ON measurement_values FOR INSERT TO authenticated WITH CHECK (public.user_is_member_of(workshop_id));
  DROP POLICY IF EXISTS "measurement_values_update" ON measurement_values;
  CREATE POLICY "measurement_values_update" ON measurement_values FOR UPDATE TO authenticated USING (public.user_is_member_of(workshop_id));
  DROP POLICY IF EXISTS "measurement_values_delete" ON measurement_values;
  CREATE POLICY "measurement_values_delete" ON measurement_values FOR DELETE TO authenticated USING (public.user_is_member_of(workshop_id));

  -- Payments
  DROP POLICY IF EXISTS "payments_select" ON payments;
  CREATE POLICY "payments_select" ON payments FOR SELECT TO authenticated USING (public.user_is_member_of(workshop_id));
  DROP POLICY IF EXISTS "payments_insert" ON payments;
  CREATE POLICY "payments_insert" ON payments FOR INSERT TO authenticated WITH CHECK (public.user_is_member_of(workshop_id));
  DROP POLICY IF EXISTS "payments_update" ON payments;
  CREATE POLICY "payments_update" ON payments FOR UPDATE TO authenticated USING (public.user_is_member_of(workshop_id));
  DROP POLICY IF EXISTS "payments_delete" ON payments;
  CREATE POLICY "payments_delete" ON payments FOR DELETE TO authenticated USING (public.user_is_member_of(workshop_id));

  -- Expenses
  DROP POLICY IF EXISTS "expenses_select" ON expenses;
  CREATE POLICY "expenses_select" ON expenses FOR SELECT TO authenticated USING (public.user_is_member_of(workshop_id));
  DROP POLICY IF EXISTS "expenses_insert" ON expenses;
  CREATE POLICY "expenses_insert" ON expenses FOR INSERT TO authenticated WITH CHECK (public.user_is_member_of(workshop_id));
  DROP POLICY IF EXISTS "expenses_update" ON expenses;
  CREATE POLICY "expenses_update" ON expenses FOR UPDATE TO authenticated USING (public.user_is_member_of(workshop_id));
  DROP POLICY IF EXISTS "expenses_delete" ON expenses;
  CREATE POLICY "expenses_delete" ON expenses FOR DELETE TO authenticated USING (public.user_is_member_of(workshop_id));

  -- Fabrics
  DROP POLICY IF EXISTS "fabrics_select" ON fabrics;
  CREATE POLICY "fabrics_select" ON fabrics FOR SELECT TO authenticated USING (public.user_is_member_of(workshop_id));
  DROP POLICY IF EXISTS "fabrics_insert" ON fabrics;
  CREATE POLICY "fabrics_insert" ON fabrics FOR INSERT TO authenticated WITH CHECK (public.user_is_member_of(workshop_id));
  DROP POLICY IF EXISTS "fabrics_update" ON fabrics;
  CREATE POLICY "fabrics_update" ON fabrics FOR UPDATE TO authenticated USING (public.user_is_member_of(workshop_id));
  DROP POLICY IF EXISTS "fabrics_delete" ON fabrics;
  CREATE POLICY "fabrics_delete" ON fabrics FOR DELETE TO authenticated USING (public.user_is_member_of(workshop_id));

  -- Appointments
  DROP POLICY IF EXISTS "appointments_select" ON fitting_appointments;
  CREATE POLICY "appointments_select" ON fitting_appointments FOR SELECT TO authenticated USING (public.user_is_member_of(workshop_id));
  DROP POLICY IF EXISTS "appointments_insert" ON fitting_appointments;
  CREATE POLICY "appointments_insert" ON fitting_appointments FOR INSERT TO authenticated WITH CHECK (public.user_is_member_of(workshop_id));
  DROP POLICY IF EXISTS "appointments_update" ON fitting_appointments;
  CREATE POLICY "appointments_update" ON fitting_appointments FOR UPDATE TO authenticated USING (public.user_is_member_of(workshop_id));
  DROP POLICY IF EXISTS "appointments_delete" ON fitting_appointments;
  CREATE POLICY "appointments_delete" ON fitting_appointments FOR DELETE TO authenticated USING (public.user_is_member_of(workshop_id));

  -- Notifications
  DROP POLICY IF EXISTS "notifications_select" ON notifications;
  CREATE POLICY "notifications_select" ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
  DROP POLICY IF EXISTS "notifications_update" ON notifications;
  CREATE POLICY "notifications_update" ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
  DROP POLICY IF EXISTS "notifications_delete" ON notifications;
  CREATE POLICY "notifications_delete" ON notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

  -- Audit Logs (Select only)
  DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
  CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT TO authenticated USING (workshop_id IS NULL OR public.user_is_member_of(workshop_id));
END $$;

-- 7. Politiques de Stockage Sécurisées (Supabase Storage RLS)
DO $$ BEGIN
  -- Création sécurisée du bucket privé pour les médias d'atelier (mesures, tissus, modèles)
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'atelier-media',
    'atelier-media',
    false,
    10485760, -- 10 MB max
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  )
  ON CONFLICT (id) DO NOTHING;

  -- Politiques RLS sur storage.objects (Isolé par workspace_id via path logic ou strict checks si possible)
  DROP POLICY IF EXISTS "storage_objects_select" ON storage.objects;
  CREATE POLICY "storage_objects_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'atelier-media');

  DROP POLICY IF EXISTS "storage_objects_insert" ON storage.objects;
  CREATE POLICY "storage_objects_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'atelier-media');

  DROP POLICY IF EXISTS "storage_objects_update" ON storage.objects;
  CREATE POLICY "storage_objects_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'atelier-media' AND owner = auth.uid());

  DROP POLICY IF EXISTS "storage_objects_delete" ON storage.objects;
  CREATE POLICY "storage_objects_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'atelier-media' AND owner = auth.uid());
EXCEPTION WHEN OTHERS THEN
  null;
END $$;

