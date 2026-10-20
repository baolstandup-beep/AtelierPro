-- =============================================================================
-- Fonctions utilitaires, permissions, gardes et déclencheurs
-- =============================================================================

-- Permissions par défaut de chaque rôle. L'administrateur a toutes les
-- permissions ; les autres rôles reçoivent un socle complété par
-- profiles.permissions (attribuable uniquement par un gestionnaire).
create or replace function public.role_default_permissions(p_role public.app_role)
returns text[] language sql immutable as $$
  select case p_role
    when 'admin' then array(select key from public.permission_catalog)
    when 'cashier' then array[
      'products.view', 'sales.create', 'sales.discount', 'cash.operate', 'cash.close',
      'customers.view', 'customers.manage'
    ]
    when 'stock_manager' then array[
      'products.view', 'products.manage', 'stock.manage', 'stock.adjust',
      'purchases.manage', 'suppliers.manage'
    ]
    else array['products.view']
  end
$$;

-- role_default_permissions lit permission_catalog : on la marque STABLE.
alter function public.role_default_permissions(public.app_role) stable;

create or replace function public.has_permission(p_permission text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_active
      and (p.role = 'admin'
           or p_permission = any (public.role_default_permissions(p.role))
           or p_permission = any (p.permissions))
  )
$$;

create or replace function public.my_permissions()
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce((
    select array(
      select distinct unnest(public.role_default_permissions(p.role) || p.permissions)
      order by 1
    )
    from public.profiles p
    where p.id = auth.uid() and p.is_active
  ), '{}')
$$;

create or replace function public.require_permission(p_permission text)
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.' using errcode = '42501';
  end if;
  if not public.has_permission(p_permission) then
    raise exception 'Permission refusée (%).', p_permission using errcode = '42501';
  end if;
end $$;

create or replace function public.log_audit(
  p_action text, p_entity_type text, p_entity_id text, p_details jsonb default '{}'::jsonb
) returns void language sql security definer set search_path = public as $$
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_details, '{}'::jsonb));
$$;

create or replace function public.format_doc_number(p_prefix text, p_seq bigint)
returns text language sql stable as $$
  select p_prefix || to_char(now() at time zone 'Africa/Dakar', 'YYMMDD') || '-' || lpad(p_seq::text, 5, '0')
$$;

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();
create trigger product_variants_touch before update on public.product_variants
  for each row execute function public.touch_updated_at();
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Création automatique du profil : toujours inactif et sans droits.
-- Les métadonnées d'inscription ne sont JAMAIS utilisées pour le rôle,
-- elles sont contrôlables par l'utilisateur.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, phone, role, is_active)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(new.email, ''), '@', 1), 'Utilisateur'),
    new.email,
    new.phone,
    'employee',
    false
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Garde sur les profils : pas d'auto-attribution de droits, pas de perte du
-- dernier administrateur actif.
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_api_call boolean := current_setting('role', true) in ('authenticated', 'anon');
begin
  if (new.role is distinct from old.role
      or new.permissions is distinct from old.permissions
      or new.is_active is distinct from old.is_active) then
    if v_api_call then
      if not public.has_permission('users.manage') then
        raise exception 'Seul un gestionnaire peut modifier les rôles et permissions.' using errcode = '42501';
      end if;
      if new.id = auth.uid() then
        raise exception 'Vous ne pouvez pas modifier votre propre rôle, vos permissions ou votre statut.' using errcode = '42501';
      end if;
    end if;
    -- Les permissions doivent exister dans le catalogue.
    if exists (select 1 from unnest(new.permissions) k where k not in (select key from public.permission_catalog)) then
      raise exception 'Permission inconnue.' using errcode = '22023';
    end if;
    if old.role = 'admin' and old.is_active and (new.role <> 'admin' or not new.is_active) then
      if (select count(*) from public.profiles where role = 'admin' and is_active and id <> old.id) = 0 then
        raise exception 'Impossible : il doit rester au moins un administrateur actif.' using errcode = '23514';
      end if;
    end if;
  end if;
  if new.id is distinct from old.id then
    raise exception 'Identifiant non modifiable.';
  end if;
  return new;
end $$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ---------------------------------------------------------------------------
-- Le stock ne peut changer que via apply_stock_movement (drapeau interne).
-- ---------------------------------------------------------------------------
create or replace function public.guard_variant_stock()
returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('app.stock_write', true), '') <> 'on' then
    if tg_op = 'INSERT' and new.stock_qty <> 0 then
      raise exception 'Le stock initial doit être saisi par un mouvement de stock.' using errcode = '42501';
    elsif tg_op = 'UPDATE' and new.stock_qty is distinct from old.stock_qty then
      raise exception 'Le stock ne peut être modifié que par un mouvement de stock tracé.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create trigger product_variants_guard_stock before insert or update on public.product_variants
  for each row execute function public.guard_variant_stock();

create or replace function public.apply_stock_movement(
  p_variant_id uuid, p_quantity integer, p_type public.stock_movement_type,
  p_reason text, p_reference_type text, p_reference_id uuid, p_unit_cost bigint default null,
  p_allow_negative boolean default null
) returns integer language plpgsql security definer set search_path = public as $$
declare
  v_balance integer;
  v_allow boolean;
  v_label text;
begin
  if p_quantity = 0 then
    return (select stock_qty from public.product_variants where id = p_variant_id);
  end if;
  v_allow := coalesce(p_allow_negative, (select allow_negative_stock from public.shop_settings where id = 1));

  perform set_config('app.stock_write', 'on', true);
  update public.product_variants
     set stock_qty = stock_qty + p_quantity
   where id = p_variant_id
  returning stock_qty into v_balance;
  perform set_config('app.stock_write', 'off', true);

  if v_balance is null then
    raise exception 'Variante introuvable.' using errcode = 'P0002';
  end if;
  if v_balance < 0 and not v_allow then
    select pr.name || ' — ' || v.label into v_label
      from public.product_variants v join public.products pr on pr.id = v.product_id
     where v.id = p_variant_id;
    raise exception 'Stock insuffisant pour « % » (disponible : %).', v_label, v_balance - p_quantity
      using errcode = '23514';
  end if;

  insert into public.stock_movements (variant_id, type, quantity, balance_after, unit_cost, reason, reference_type, reference_id, created_by)
  values (p_variant_id, p_type, p_quantity, v_balance, p_unit_cost, p_reason, p_reference_type, p_reference_id, auth.uid());
  return v_balance;
end $$;

-- ---------------------------------------------------------------------------
-- Une session clôturée est verrouillée : aucun encaissement, décaissement,
-- paiement ou remboursement ne peut y être rattaché (sauf correction tracée).
-- ---------------------------------------------------------------------------
create or replace function public.guard_cash_session_open()
returns trigger language plpgsql as $$
declare
  v_status public.cash_session_status;
begin
  if new.cash_session_id is null then
    return new;
  end if;
  select status into v_status from public.cash_sessions where id = new.cash_session_id;
  if v_status is distinct from 'open'
     and coalesce(current_setting('app.cash_correction', true), '') <> 'on' then
    raise exception 'La session de caisse est clôturée : opération impossible.' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger cash_movements_guard before insert on public.cash_movements
  for each row execute function public.guard_cash_session_open();
create trigger payments_guard before insert on public.payments
  for each row execute function public.guard_cash_session_open();
create trigger refunds_guard before insert on public.refunds
  for each row execute function public.guard_cash_session_open();
create trigger sales_guard before insert on public.sales
  for each row execute function public.guard_cash_session_open();

-- Tables historiques : ni modification ni suppression.
create or replace function public.forbid_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Historique non modifiable (%).', tg_table_name using errcode = '42501';
end $$;

create trigger stock_movements_immutable before update or delete on public.stock_movements
  for each row execute function public.forbid_mutation();
create trigger cash_movements_immutable before update or delete on public.cash_movements
  for each row execute function public.forbid_mutation();
create trigger audit_logs_immutable before update or delete on public.audit_logs
  for each row execute function public.forbid_mutation();
create trigger payments_immutable before update or delete on public.payments
  for each row execute function public.forbid_mutation();
create trigger refunds_immutable before update or delete on public.refunds
  for each row execute function public.forbid_mutation();

create or replace function public.cash_session_balance(p_session_id uuid)
returns bigint language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount), 0)::bigint from public.cash_movements where cash_session_id = p_session_id
$$;

create or replace function public.assert_open_session(p_session_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_session_id is null then
    raise exception 'Aucune session de caisse ouverte.' using errcode = '23514';
  end if;
  if not exists (select 1 from public.cash_sessions where id = p_session_id and status = 'open') then
    raise exception 'La session de caisse n''est pas ouverte.' using errcode = '23514';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Vue de stock (sécurité de l'appelant : la RLS des tables s'applique)
-- ---------------------------------------------------------------------------
create view public.v_variant_stock with (security_invoker = true) as
select
  v.id as variant_id,
  v.product_id,
  p.name as product_name,
  v.label as variant_label,
  v.attributes,
  v.sku,
  v.barcode,
  v.barcode_is_internal,
  p.reference,
  p.brand,
  p.category_id,
  c.name as category_name,
  p.supplier_id,
  p.photo_path,
  coalesce(v.sale_price, p.sale_price) as sale_price,
  coalesce(v.purchase_price, p.purchase_price) as purchase_price,
  coalesce(v.min_stock, p.min_stock) as min_stock,
  v.stock_qty,
  (v.stock_qty * coalesce(v.purchase_price, p.purchase_price))::bigint as stock_value,
  case
    when v.stock_qty <= 0 then 'out'
    when v.stock_qty <= coalesce(v.min_stock, p.min_stock) then 'low'
    else 'ok'
  end as stock_status,
  (p.status = 'active' and v.is_active) as is_sellable,
  p.status as product_status,
  v.is_active as variant_active
from public.product_variants v
join public.products p on p.id = v.product_id
left join public.categories c on c.id = p.category_id;

-- Recherche caisse : code-barres exact, référence, SKU ou nom.
create or replace function public.pos_search(p_query text, p_limit integer default 20)
returns setof public.v_variant_stock language sql stable security invoker set search_path = public as $$
  select * from public.v_variant_stock s
  where s.is_sellable
    and (
      s.barcode = trim(p_query)
      or lower(s.sku) = lower(trim(p_query))
      or lower(s.reference) = lower(trim(p_query))
      or s.product_name ilike '%' || trim(p_query) || '%'
      or s.variant_label ilike '%' || trim(p_query) || '%'
      or s.brand ilike '%' || trim(p_query) || '%'
    )
  order by (s.barcode = trim(p_query)) desc nulls last, s.product_name, s.variant_label
  limit least(greatest(p_limit, 1), 50)
$$;

create or replace function public.generate_internal_barcode()
returns text language plpgsql security definer set search_path = public as $$
declare
  v_code text;
begin
  perform public.require_permission('products.manage');
  loop
    -- Code interne numérique (encodé en Code 128) : ce n'est PAS un GTIN GS1.
    v_code := '200' || lpad(nextval('public.internal_barcode_seq')::text, 9, '0');
    exit when not exists (select 1 from public.product_variants where barcode = v_code);
  end loop;
  return v_code;
end $$;
