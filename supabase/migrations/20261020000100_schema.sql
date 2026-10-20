-- =============================================================================
-- Élégance by Aicha — schéma principal
-- Montants : bigint en FCFA (entiers exacts, aucun flottant).
-- Dates : timestamptz (UTC en base), affichage en heure de Dakar (UTC+0).
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('admin', 'cashier', 'stock_manager', 'employee');
create type public.payment_method as enum ('cash', 'wave', 'orange_money', 'bank_transfer', 'store_credit');
create type public.product_status as enum ('active', 'archived');
create type public.sale_status as enum ('completed', 'cancelled');
create type public.purchase_status as enum ('ordered', 'partially_received', 'received', 'cancelled');
create type public.cash_session_status as enum ('open', 'closed');
create type public.stock_movement_type as enum (
  'initial', 'sale', 'sale_cancel', 'return', 'purchase_receipt',
  'entry', 'exit', 'adjustment', 'inventory'
);
create type public.cash_movement_type as enum (
  'opening_float', 'sale', 'credit_settlement', 'refund', 'expense',
  'expense_void', 'supplier_payment', 'cash_in', 'cash_out', 'correction'
);
create type public.expense_category as enum (
  'rent', 'electricity', 'transport', 'packaging', 'communication',
  'maintenance', 'salary', 'other'
);
create type public.inventory_status as enum ('in_progress', 'validated', 'cancelled');

-- ---------------------------------------------------------------------------
-- Réglages de la boutique (ligne unique)
-- ---------------------------------------------------------------------------
create table public.shop_settings (
  id smallint primary key default 1 check (id = 1),
  shop_name text not null default 'Élégance by Aicha',
  address text,
  phone text,
  email text,
  legal_info text,                        -- NINEA / RCCM éventuels
  receipt_footer text not null default 'Merci pour votre visite et à très bientôt !',
  allow_negative_stock boolean not null default false,
  max_discount_percent smallint not null default 10 check (max_discount_percent between 0 and 100),
  default_min_stock integer not null default 2 check (default_min_stock >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into public.shop_settings (id) values (1);

-- ---------------------------------------------------------------------------
-- Profils et permissions
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  role public.app_role not null default 'employee',
  permissions text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Catalogue des permissions applicatives (référence pour l'interface).
create table public.permission_catalog (
  key text primary key,
  label text not null,
  module text not null
);
insert into public.permission_catalog (key, label, module) values
  ('dashboard.view',     'Voir le tableau de bord',                  'Pilotage'),
  ('reports.view',       'Consulter et exporter les rapports',       'Pilotage'),
  ('products.view',      'Consulter les produits',                   'Produits'),
  ('products.manage',    'Créer et modifier les produits',           'Produits'),
  ('stock.manage',       'Gérer le stock et les inventaires',        'Stock'),
  ('stock.adjust',       'Corriger le stock (entrées / sorties)',    'Stock'),
  ('purchases.manage',   'Gérer les achats et réceptions',           'Achats'),
  ('suppliers.manage',   'Gérer les fournisseurs et leurs règlements','Achats'),
  ('sales.create',       'Encaisser des ventes',                     'Caisse'),
  ('sales.discount',     'Accorder des remises (dans la limite)',    'Caisse'),
  ('sales.view_all',     'Voir les ventes de tous les caissiers',    'Caisse'),
  ('sales.cancel',       'Annuler une vente',                        'Caisse'),
  ('credit.sell',        'Vendre à crédit',                          'Caisse'),
  ('returns.manage',     'Traiter les retours et remboursements',    'Caisse'),
  ('cash.operate',       'Ouvrir une caisse et saisir des mouvements','Caisse'),
  ('cash.close',         'Clôturer une caisse',                      'Caisse'),
  ('cash.correct',       'Corriger une caisse clôturée',             'Caisse'),
  ('customers.view',     'Consulter les clients',                    'Clients'),
  ('customers.manage',   'Créer et modifier les clients',            'Clients'),
  ('expenses.manage',    'Saisir et annuler des dépenses',           'Dépenses'),
  ('users.manage',       'Gérer les utilisateurs',                   'Administration'),
  ('settings.manage',    'Modifier les réglages de la boutique',     'Administration'),
  ('audit.view',         'Consulter le journal d''activité',         'Administration');

-- ---------------------------------------------------------------------------
-- Catalogue produits
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  constraint categories_name_unique unique (name)
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  phone text,
  email text,
  address text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references public.profiles(id)
);
create index suppliers_name_idx on public.suppliers (lower(name));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  description text,
  category_id uuid references public.categories(id) on delete set null,
  brand text,
  supplier_id uuid references public.suppliers(id) on delete set null,
  photo_path text,
  reference text,
  purchase_price bigint not null default 0 check (purchase_price >= 0),
  sale_price bigint not null check (sale_price >= 0),
  min_stock integer not null default 2 check (min_stock >= 0),
  status public.product_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references public.profiles(id)
);
create unique index products_reference_unique on public.products (lower(reference)) where reference is not null;
create index products_name_idx on public.products (lower(name));
create index products_category_idx on public.products (category_id);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  label text not null default 'Standard',          -- ex. « M / Noir », « 50 ml »
  attributes jsonb not null default '{}'::jsonb,   -- { "taille": "M", "couleur": "Noir" }
  sku text,
  barcode text,
  barcode_is_internal boolean not null default false,
  purchase_price bigint check (purchase_price >= 0), -- null = prix du produit
  sale_price bigint check (sale_price >= 0),         -- null = prix du produit
  min_stock integer check (min_stock >= 0),          -- null = seuil du produit
  stock_qty integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index product_variants_barcode_unique on public.product_variants (barcode) where barcode is not null;
create unique index product_variants_sku_unique on public.product_variants (lower(sku)) where sku is not null;
create index product_variants_product_idx on public.product_variants (product_id);

create sequence public.internal_barcode_seq start 1;

-- ---------------------------------------------------------------------------
-- Clients
-- ---------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (length(trim(first_name)) > 0),
  last_name text,
  phone text,
  email text,
  notes text,
  store_credit bigint not null default 0 check (store_credit >= 0), -- avoirs disponibles
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references public.profiles(id)
);
create unique index customers_phone_unique on public.customers (phone) where phone is not null;
create index customers_name_idx on public.customers (lower(first_name || ' ' || coalesce(last_name, '')));

-- ---------------------------------------------------------------------------
-- Sessions de caisse
-- ---------------------------------------------------------------------------
create table public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  register_name text not null default 'Caisse principale',
  status public.cash_session_status not null default 'open',
  opened_by uuid not null references public.profiles(id),
  opened_at timestamptz not null default now(),
  opening_float bigint not null default 0 check (opening_float >= 0),
  closed_by uuid references public.profiles(id),
  closed_at timestamptz,
  expected_cash bigint,
  counted_cash bigint check (counted_cash >= 0),
  difference bigint,
  difference_reason text,
  closing_notes text,
  totals_snapshot jsonb
);
create unique index cash_sessions_one_open_per_register on public.cash_sessions (register_name) where status = 'open';
create index cash_sessions_opened_at_idx on public.cash_sessions (opened_at desc);

-- ---------------------------------------------------------------------------
-- Ventes
-- ---------------------------------------------------------------------------
create sequence public.sale_number_seq start 1;
create sequence public.return_number_seq start 1;
create sequence public.purchase_number_seq start 1;

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  sale_number text not null unique,
  client_operation_id uuid not null unique,      -- idempotence
  cash_session_id uuid not null references public.cash_sessions(id),
  customer_id uuid references public.customers(id),
  cashier_id uuid not null references public.profiles(id),
  status public.sale_status not null default 'completed',
  subtotal bigint not null check (subtotal >= 0),
  discount_amount bigint not null default 0 check (discount_amount >= 0),
  total bigint not null check (total >= 0),
  amount_paid bigint not null default 0 check (amount_paid >= 0),
  balance_due bigint not null default 0 check (balance_due >= 0),
  cash_tendered bigint check (cash_tendered >= 0),
  change_given bigint not null default 0 check (change_given >= 0),
  note text,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id),
  cancel_reason text,
  constraint sales_total_consistent check (total = subtotal - discount_amount),
  constraint sales_cancel_consistent check (
    (status = 'cancelled') = (cancelled_at is not null)
  )
);
create index sales_created_at_idx on public.sales (created_at desc);
create index sales_customer_idx on public.sales (customer_id);
create index sales_cashier_idx on public.sales (cashier_id);
create index sales_session_idx on public.sales (cash_session_id);
create index sales_balance_due_idx on public.sales (customer_id) where balance_due > 0;

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete restrict,
  variant_id uuid not null references public.product_variants(id),
  product_name text not null,           -- instantanés au moment de la vente
  variant_label text not null,
  barcode text,
  quantity integer not null check (quantity > 0),
  unit_price bigint not null check (unit_price >= 0),
  unit_cost bigint not null check (unit_cost >= 0),
  discount_amount bigint not null default 0 check (discount_amount >= 0),
  line_total bigint not null check (line_total >= 0),   -- net de remise
  returned_qty integer not null default 0 check (returned_qty >= 0),
  refunded_amount bigint not null default 0 check (refunded_amount >= 0),
  constraint sale_items_returned_le_qty check (returned_qty <= quantity),
  constraint sale_items_refund_le_total check (refunded_amount <= line_total),
  constraint sale_items_line_consistent check (line_total = unit_price * quantity - discount_amount)
);
create index sale_items_sale_idx on public.sale_items (sale_id);
create index sale_items_variant_idx on public.sale_items (variant_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid references public.sales(id),
  customer_id uuid references public.customers(id),
  cash_session_id uuid references public.cash_sessions(id),
  method public.payment_method not null,
  amount bigint not null check (amount > 0),
  kind text not null default 'sale' check (kind in ('sale', 'credit_settlement')),
  reference text,                           -- n° de transaction Wave / OM
  received_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index payments_sale_idx on public.payments (sale_id);
create index payments_created_at_idx on public.payments (created_at desc);
create index payments_session_idx on public.payments (cash_session_id);

-- Paiements différés : historique des règlements de créances (une opération
-- client peut être répartie sur plusieurs ventes).
create table public.credit_settlements (
  id uuid primary key default gen_random_uuid(),
  client_operation_id uuid not null unique,
  customer_id uuid not null references public.customers(id),
  method public.payment_method not null,
  amount bigint not null check (amount > 0),
  cash_session_id uuid references public.cash_sessions(id),
  reference text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Retours et remboursements
-- ---------------------------------------------------------------------------
create table public.returns (
  id uuid primary key default gen_random_uuid(),
  return_number text not null unique,
  client_operation_id uuid not null unique,
  sale_id uuid not null references public.sales(id),
  reason text not null check (length(trim(reason)) > 0),
  total_value bigint not null check (total_value >= 0),     -- valeur nette des articles retournés
  balance_reduction bigint not null default 0 check (balance_reduction >= 0),
  refund_amount bigint not null default 0 check (refund_amount >= 0),
  refund_method public.payment_method,
  cash_session_id uuid references public.cash_sessions(id),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint returns_split check (total_value = balance_reduction + refund_amount)
);
create index returns_sale_idx on public.returns (sale_id);

create table public.return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.returns(id),
  sale_item_id uuid not null references public.sale_items(id),
  quantity integer not null check (quantity > 0),
  refund_value bigint not null check (refund_value >= 0),
  unit_cost bigint not null check (unit_cost >= 0),
  restock boolean not null
);
create index return_items_return_idx on public.return_items (return_id);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id),
  return_id uuid references public.returns(id),
  kind text not null check (kind in ('return', 'cancellation')),
  method public.payment_method not null,
  amount bigint not null check (amount > 0),
  cash_session_id uuid references public.cash_sessions(id),
  reason text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index refunds_sale_idx on public.refunds (sale_id);
create index refunds_created_at_idx on public.refunds (created_at desc);

-- ---------------------------------------------------------------------------
-- Achats fournisseurs (commande ≠ réception ≠ paiement)
-- ---------------------------------------------------------------------------
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  purchase_number text not null unique,
  supplier_id uuid not null references public.suppliers(id),
  supplier_reference text,                 -- n° de facture / bon fournisseur
  status public.purchase_status not null default 'ordered',
  order_date date not null default (now() at time zone 'Africa/Dakar')::date,
  ordered_total bigint not null default 0 check (ordered_total >= 0),
  received_total bigint not null default 0 check (received_total >= 0),
  amount_paid bigint not null default 0 check (amount_paid >= 0),
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancel_reason text
);
create index purchases_supplier_idx on public.purchases (supplier_id);
create index purchases_created_at_idx on public.purchases (created_at desc);

create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id),
  variant_id uuid not null references public.product_variants(id),
  quantity_ordered integer not null check (quantity_ordered > 0),
  quantity_received integer not null default 0 check (quantity_received >= 0),
  unit_cost bigint not null check (unit_cost >= 0),
  constraint purchase_items_received_le_ordered check (quantity_received <= quantity_ordered)
);
create index purchase_items_purchase_idx on public.purchase_items (purchase_id);

create table public.purchase_receipts (
  id uuid primary key default gen_random_uuid(),
  client_operation_id uuid not null unique,
  purchase_id uuid not null references public.purchases(id),
  received_by uuid not null references public.profiles(id),
  received_at timestamptz not null default now(),
  total_cost bigint not null check (total_cost >= 0),
  notes text
);

create table public.purchase_receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.purchase_receipts(id),
  purchase_item_id uuid not null references public.purchase_items(id),
  quantity integer not null check (quantity > 0),
  unit_cost bigint not null check (unit_cost >= 0)
);

create table public.supplier_payments (
  id uuid primary key default gen_random_uuid(),
  client_operation_id uuid not null unique,
  supplier_id uuid not null references public.suppliers(id),
  purchase_id uuid references public.purchases(id),
  method public.payment_method not null check (method <> 'store_credit'),
  amount bigint not null check (amount > 0),
  reference text,
  cash_session_id uuid references public.cash_sessions(id),
  paid_at date not null default (now() at time zone 'Africa/Dakar')::date,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index supplier_payments_supplier_idx on public.supplier_payments (supplier_id);

-- ---------------------------------------------------------------------------
-- Dépenses
-- ---------------------------------------------------------------------------
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  category public.expense_category not null,
  amount bigint not null check (amount > 0),
  expense_date date not null,
  method public.payment_method not null check (method <> 'store_credit'),
  comment text,
  cash_session_id uuid references public.cash_sessions(id),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid references public.profiles(id),
  void_reason text
);
create index expenses_date_idx on public.expenses (expense_date desc);

-- ---------------------------------------------------------------------------
-- Mouvements de caisse (espèces uniquement) et de stock
-- ---------------------------------------------------------------------------
create table public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  cash_session_id uuid not null references public.cash_sessions(id),
  type public.cash_movement_type not null,
  amount bigint not null check (amount <> 0),   -- signé : + entrée, − sortie
  reason text,
  reference_type text,
  reference_id uuid,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index cash_movements_session_idx on public.cash_movements (cash_session_id);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id),
  type public.stock_movement_type not null,
  quantity integer not null check (quantity <> 0),  -- signé
  balance_after integer not null,
  unit_cost bigint,
  reason text,
  reference_type text,
  reference_id uuid,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index stock_movements_variant_idx on public.stock_movements (variant_id, created_at desc);
create index stock_movements_created_at_idx on public.stock_movements (created_at desc);

-- ---------------------------------------------------------------------------
-- Inventaires physiques
-- ---------------------------------------------------------------------------
create table public.inventories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references public.categories(id),
  status public.inventory_status not null default 'in_progress',
  notes text,
  started_by uuid not null references public.profiles(id),
  started_at timestamptz not null default now(),
  validated_by uuid references public.profiles(id),
  validated_at timestamptz
);

create table public.inventory_lines (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.inventories(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id),
  expected_qty integer not null,      -- stock théorique au démarrage
  counted_qty integer check (counted_qty >= 0),
  counted_by uuid references public.profiles(id),
  counted_at timestamptz,
  constraint inventory_lines_unique unique (inventory_id, variant_id)
);

-- ---------------------------------------------------------------------------
-- Journal d'audit (append-only)
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Limitation des tentatives de connexion (utilisée côté serveur uniquement)
-- ---------------------------------------------------------------------------
create table public.login_attempts (
  key text primary key,
  attempts integer not null default 0,
  window_start timestamptz not null default now(),
  locked_until timestamptz
);
