-- =============================================================================
-- Opérations commerciales transactionnelles et idempotentes.
-- Chaque fonction s'exécute dans UNE transaction (un appel RPC PostgREST) :
-- en cas d'erreur, rien n'est enregistré.
-- Les montants et prix sont toujours relus en base, jamais pris du client.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Sessions de caisse
-- ---------------------------------------------------------------------------
create or replace function public.open_cash_session(p_register_name text default 'Caisse principale', p_opening_float bigint default 0)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_register text := coalesce(nullif(trim(p_register_name), ''), 'Caisse principale');
begin
  perform public.require_permission('cash.operate');
  if p_opening_float is null or p_opening_float < 0 then
    raise exception 'Le fond de caisse doit être positif ou nul.' using errcode = '22023';
  end if;
  if exists (select 1 from public.cash_sessions where register_name = v_register and status = 'open') then
    raise exception 'Une session est déjà ouverte sur « % ».', v_register using errcode = '23505';
  end if;
  insert into public.cash_sessions (register_name, opened_by, opening_float)
  values (v_register, auth.uid(), p_opening_float)
  returning id into v_id;
  if p_opening_float > 0 then
    insert into public.cash_movements (cash_session_id, type, amount, reason, created_by)
    values (v_id, 'opening_float', p_opening_float, 'Fond de caisse initial', auth.uid());
  end if;
  perform public.log_audit('cash_session.open', 'cash_session', v_id::text,
    jsonb_build_object('register', v_register, 'opening_float', p_opening_float));
  return v_id;
end $$;

create or replace function public.add_cash_movement(p_session_id uuid, p_type public.cash_movement_type, p_amount bigint, p_reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  perform public.require_permission('cash.operate');
  if p_type not in ('cash_in', 'cash_out') then
    raise exception 'Type de mouvement non autorisé.' using errcode = '22023';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Le montant doit être supérieur à zéro.' using errcode = '22023';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Le motif est obligatoire.' using errcode = '22023';
  end if;
  perform 1 from public.cash_sessions where id = p_session_id for update;
  perform public.assert_open_session(p_session_id);
  if p_type = 'cash_out' and public.cash_session_balance(p_session_id) < p_amount then
    raise exception 'Espèces insuffisantes dans la caisse.' using errcode = '23514';
  end if;
  insert into public.cash_movements (cash_session_id, type, amount, reason, created_by)
  values (p_session_id, p_type, case when p_type = 'cash_out' then -p_amount else p_amount end, trim(p_reason), auth.uid())
  returning id into v_id;
  perform public.log_audit('cash.' || p_type::text, 'cash_session', p_session_id::text,
    jsonb_build_object('amount', p_amount, 'reason', p_reason));
  return v_id;
end $$;

create or replace function public.cash_session_totals(p_session_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'expected_cash', public.cash_session_balance(p_session_id),
    'cash_by_type', coalesce((
      select jsonb_object_agg(type, total) from (
        select type::text, sum(amount)::bigint as total from public.cash_movements
        where cash_session_id = p_session_id group by type) t), '{}'::jsonb),
    'payments_by_method', coalesce((
      select jsonb_object_agg(method, total) from (
        select method::text, sum(amount)::bigint as total from public.payments
        where cash_session_id = p_session_id group by method) t), '{}'::jsonb),
    'refunds_by_method', coalesce((
      select jsonb_object_agg(method, total) from (
        select method::text, sum(amount)::bigint as total from public.refunds
        where cash_session_id = p_session_id group by method) t), '{}'::jsonb),
    'sales_count', (select count(*) from public.sales where cash_session_id = p_session_id and status = 'completed'),
    'sales_total', (select coalesce(sum(total), 0) from public.sales where cash_session_id = p_session_id and status = 'completed'),
    'credit_granted', (select coalesce(sum(balance_due), 0) from public.sales where cash_session_id = p_session_id and status = 'completed')
  )
$$;

create or replace function public.close_cash_session(
  p_session_id uuid, p_counted_cash bigint, p_difference_reason text default null, p_notes text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_session public.cash_sessions;
  v_expected bigint;
  v_diff bigint;
  v_totals jsonb;
begin
  perform public.require_permission('cash.close');
  select * into v_session from public.cash_sessions where id = p_session_id for update;
  if not found then
    raise exception 'Session introuvable.' using errcode = 'P0002';
  end if;
  if v_session.status <> 'open' then
    raise exception 'Cette session est déjà clôturée.' using errcode = '23514';
  end if;
  if p_counted_cash is null or p_counted_cash < 0 then
    raise exception 'Le comptage réel est obligatoire.' using errcode = '22023';
  end if;
  v_expected := public.cash_session_balance(p_session_id);
  v_diff := p_counted_cash - v_expected;
  if v_diff <> 0 and coalesce(trim(p_difference_reason), '') = '' then
    raise exception 'Écart de % FCFA : le motif est obligatoire.', v_diff using errcode = '22023';
  end if;
  v_totals := public.cash_session_totals(p_session_id);
  update public.cash_sessions
     set status = 'closed', closed_by = auth.uid(), closed_at = now(),
         expected_cash = v_expected, counted_cash = p_counted_cash, difference = v_diff,
         difference_reason = nullif(trim(p_difference_reason), ''), closing_notes = nullif(trim(p_notes), ''),
         totals_snapshot = v_totals
   where id = p_session_id;
  perform public.log_audit('cash_session.close', 'cash_session', p_session_id::text,
    jsonb_build_object('expected', v_expected, 'counted', p_counted_cash, 'difference', v_diff, 'reason', p_difference_reason));
  return jsonb_build_object('expected_cash', v_expected, 'counted_cash', p_counted_cash, 'difference', v_diff);
end $$;

-- Correction exceptionnelle d'une session clôturée : autorisée, motivée, tracée.
create or replace function public.correct_cash_session(p_session_id uuid, p_amount bigint, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_session public.cash_sessions;
  v_expected bigint;
begin
  perform public.require_permission('cash.correct');
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Le motif de correction est obligatoire.' using errcode = '22023';
  end if;
  if p_amount is null or p_amount = 0 then
    raise exception 'Le montant de correction ne peut pas être nul.' using errcode = '22023';
  end if;
  select * into v_session from public.cash_sessions where id = p_session_id for update;
  if v_session.status <> 'closed' then
    raise exception 'Seule une session clôturée peut être corrigée.' using errcode = '23514';
  end if;
  perform set_config('app.cash_correction', 'on', true);
  insert into public.cash_movements (cash_session_id, type, amount, reason, created_by)
  values (p_session_id, 'correction', p_amount, trim(p_reason), auth.uid());
  perform set_config('app.cash_correction', 'off', true);
  v_expected := public.cash_session_balance(p_session_id);
  update public.cash_sessions
     set expected_cash = v_expected, difference = counted_cash - v_expected
   where id = p_session_id;
  perform public.log_audit('cash_session.correct', 'cash_session', p_session_id::text,
    jsonb_build_object('amount', p_amount, 'reason', p_reason, 'previous_expected', v_session.expected_cash, 'new_expected', v_expected));
end $$;

-- ---------------------------------------------------------------------------
-- Vente
-- p_items    : [{ "variant_id": uuid, "quantity": int }]
-- p_payments : [{ "method": "cash"|"wave"|"orange_money"|"bank_transfer"|"store_credit", "amount": int, "reference": text }]
-- Le reste à payer (total − paiements) constitue un crédit client.
-- ---------------------------------------------------------------------------
create or replace function public.create_sale(
  p_client_operation_id uuid,
  p_cash_session_id uuid,
  p_items jsonb,
  p_payments jsonb default '[]'::jsonb,
  p_discount_amount bigint default 0,
  p_customer_id uuid default null,
  p_cash_tendered bigint default null,
  p_note text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_existing public.sales;
  v_settings public.shop_settings;
  v_role public.app_role;
  v_sale_id uuid := gen_random_uuid();
  v_sale_number text;
  v_subtotal bigint := 0;
  v_discount bigint := coalesce(p_discount_amount, 0);
  v_total bigint;
  v_paid bigint := 0;
  v_cash bigint := 0;
  v_store_credit bigint := 0;
  v_balance bigint;
  v_change bigint := 0;
  v_line record;
  v_pay jsonb;
  v_method public.payment_method;
  v_amount bigint;
  v_allocated bigint := 0;
  v_line_discount bigint;
  v_count integer;
  v_idx integer := 0;
  v_largest_variant uuid;
begin
  perform public.require_permission('sales.create');
  if p_client_operation_id is null then
    raise exception 'Identifiant d''opération manquant.' using errcode = '22023';
  end if;

  -- Idempotence : une même opération rejouée renvoie la vente existante.
  perform pg_advisory_xact_lock(hashtextextended(p_client_operation_id::text, 0));
  select * into v_existing from public.sales where client_operation_id = p_client_operation_id;
  if found then
    if v_existing.cashier_id <> v_uid then
      raise exception 'Identifiant d''opération déjà utilisé.' using errcode = '23505';
    end if;
    return jsonb_build_object('id', v_existing.id, 'sale_number', v_existing.sale_number, 'duplicate', true);
  end if;

  perform 1 from public.cash_sessions where id = p_cash_session_id for share;
  perform public.assert_open_session(p_cash_session_id);

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Le panier est vide.' using errcode = '22023';
  end if;
  if p_payments is null or jsonb_typeof(p_payments) <> 'array' then
    raise exception 'Paiements invalides.' using errcode = '22023';
  end if;
  if v_discount < 0 then
    raise exception 'Remise invalide.' using errcode = '22023';
  end if;

  select * into v_settings from public.shop_settings where id = 1;
  select role into v_role from public.profiles where id = v_uid;

  -- Lignes agrégées par variante, verrouillées dans un ordre stable (évite
  -- les interblocages entre deux caisses).
  create temporary table if not exists _sale_lines (
    variant_id uuid primary key, quantity integer, unit_price bigint, unit_cost bigint,
    product_name text, variant_label text, barcode text, gross bigint, discount bigint default 0
  ) on commit drop;
  truncate _sale_lines;

  insert into _sale_lines (variant_id, quantity)
  select (e ->> 'variant_id')::uuid, sum((e ->> 'quantity')::integer)
    from jsonb_array_elements(p_items) e
   group by 1;

  if exists (select 1 from _sale_lines where variant_id is null or quantity is null or quantity <= 0 or quantity > 10000) then
    raise exception 'Quantité invalide dans le panier.' using errcode = '22023';
  end if;

  for v_line in
    select v.id, v.label, v.barcode, v.is_active, p.name, p.status,
           coalesce(v.sale_price, p.sale_price) as price,
           coalesce(v.purchase_price, p.purchase_price) as cost
      from public.product_variants v
      join public.products p on p.id = v.product_id
     where v.id in (select variant_id from _sale_lines)
     order by v.id
       for update of v
  loop
    if not v_line.is_active or v_line.status <> 'active' then
      raise exception 'L''article « % » n''est plus en vente.', v_line.name using errcode = '23514';
    end if;
    update _sale_lines
       set unit_price = v_line.price, unit_cost = v_line.cost, product_name = v_line.name,
           variant_label = v_line.label, barcode = v_line.barcode, gross = v_line.price * quantity
     where variant_id = v_line.id;
  end loop;

  if exists (select 1 from _sale_lines where unit_price is null) then
    raise exception 'Article introuvable dans le panier.' using errcode = 'P0002';
  end if;

  select coalesce(sum(gross), 0), count(*) into v_subtotal, v_count from _sale_lines;

  if v_discount > v_subtotal then
    raise exception 'La remise dépasse le montant du panier.' using errcode = '22023';
  end if;
  if v_discount > 0 then
    if not public.has_permission('sales.discount') then
      raise exception 'Vous n''êtes pas autorisé à accorder une remise.' using errcode = '42501';
    end if;
    if v_role <> 'admin' and v_discount * 100 > v_subtotal * v_settings.max_discount_percent then
      raise exception 'Remise supérieure au plafond autorisé (% %%).', v_settings.max_discount_percent using errcode = '42501';
    end if;
    -- Répartition proportionnelle de la remise ; le reliquat d'arrondi va à
    -- la ligne la plus importante.
    for v_line in select variant_id, gross from _sale_lines order by gross desc, variant_id loop
      v_line_discount := (v_discount * v_line.gross) / v_subtotal;
      update _sale_lines set discount = v_line_discount where variant_id = v_line.variant_id;
      v_allocated := v_allocated + v_line_discount;
      if v_largest_variant is null then
        v_largest_variant := v_line.variant_id;
      end if;
    end loop;
    update _sale_lines set discount = discount + (v_discount - v_allocated) where variant_id = v_largest_variant;
  end if;

  v_total := v_subtotal - v_discount;

  -- Paiements
  for v_pay in select * from jsonb_array_elements(p_payments) loop
    begin
      v_method := (v_pay ->> 'method')::public.payment_method;
      v_amount := (v_pay ->> 'amount')::bigint;
    exception when others then
      raise exception 'Paiement invalide.' using errcode = '22023';
    end;
    if v_amount is null or v_amount <= 0 then
      raise exception 'Montant de paiement invalide.' using errcode = '22023';
    end if;
    v_paid := v_paid + v_amount;
    if v_method = 'cash' then v_cash := v_cash + v_amount; end if;
    if v_method = 'store_credit' then v_store_credit := v_store_credit + v_amount; end if;
  end loop;

  if v_paid > v_total then
    raise exception 'Les paiements (% FCFA) dépassent le total (% FCFA). Saisissez le montant remis en espèces pour calculer la monnaie.', v_paid, v_total using errcode = '22023';
  end if;
  v_balance := v_total - v_paid;

  if p_cash_tendered is not null then
    if p_cash_tendered < v_cash then
      raise exception 'Le montant remis est inférieur à la part payée en espèces.' using errcode = '22023';
    end if;
    v_change := p_cash_tendered - v_cash;
  end if;

  if p_customer_id is not null then
    perform 1 from public.customers where id = p_customer_id for update;
    if not found then
      raise exception 'Client introuvable.' using errcode = 'P0002';
    end if;
  end if;

  if v_store_credit > 0 then
    if p_customer_id is null then
      raise exception 'Un client est requis pour utiliser un avoir.' using errcode = '22023';
    end if;
    update public.customers set store_credit = store_credit - v_store_credit
     where id = p_customer_id and store_credit >= v_store_credit;
    if not found then
      raise exception 'Avoir client insuffisant.' using errcode = '23514';
    end if;
  end if;

  if v_balance > 0 then
    if p_customer_id is null then
      raise exception 'Vente incomplètement payée : sélectionnez un client pour enregistrer un crédit.' using errcode = '22023';
    end if;
    if not public.has_permission('credit.sell') then
      raise exception 'Vous n''êtes pas autorisé à vendre à crédit.' using errcode = '42501';
    end if;
  end if;

  v_sale_number := public.format_doc_number('V', nextval('public.sale_number_seq'));

  insert into public.sales (id, sale_number, client_operation_id, cash_session_id, customer_id, cashier_id,
                            subtotal, discount_amount, total, amount_paid, balance_due, cash_tendered, change_given, note)
  values (v_sale_id, v_sale_number, p_client_operation_id, p_cash_session_id, p_customer_id, v_uid,
          v_subtotal, v_discount, v_total, v_paid, v_balance, p_cash_tendered, v_change, nullif(trim(p_note), ''));

  insert into public.sale_items (sale_id, variant_id, product_name, variant_label, barcode, quantity,
                                 unit_price, unit_cost, discount_amount, line_total)
  select v_sale_id, variant_id, product_name, variant_label, barcode, quantity,
         unit_price, unit_cost, discount, gross - discount
    from _sale_lines;

  for v_line in select variant_id, quantity, unit_cost from _sale_lines order by variant_id loop
    perform public.apply_stock_movement(v_line.variant_id, -v_line.quantity, 'sale',
      'Vente ' || v_sale_number, 'sale', v_sale_id, v_line.unit_cost);
  end loop;

  insert into public.payments (sale_id, customer_id, cash_session_id, method, amount, kind, reference, received_by)
  select v_sale_id, p_customer_id, p_cash_session_id, (e ->> 'method')::public.payment_method,
         (e ->> 'amount')::bigint, 'sale', nullif(trim(e ->> 'reference'), ''), v_uid
    from jsonb_array_elements(p_payments) e;

  if v_cash > 0 then
    insert into public.cash_movements (cash_session_id, type, amount, reason, reference_type, reference_id, created_by)
    values (p_cash_session_id, 'sale', v_cash, 'Vente ' || v_sale_number, 'sale', v_sale_id, v_uid);
  end if;

  if v_discount > 0 then
    perform public.log_audit('sale.discount', 'sale', v_sale_id::text,
      jsonb_build_object('sale_number', v_sale_number, 'discount', v_discount, 'subtotal', v_subtotal));
  end if;
  if v_balance > 0 then
    perform public.log_audit('sale.credit', 'sale', v_sale_id::text,
      jsonb_build_object('sale_number', v_sale_number, 'balance_due', v_balance, 'customer_id', p_customer_id));
  end if;

  return jsonb_build_object('id', v_sale_id, 'sale_number', v_sale_number, 'duplicate', false,
                            'total', v_total, 'paid', v_paid, 'balance_due', v_balance, 'change', v_change);
end $$;

-- ---------------------------------------------------------------------------
-- Annulation d'une vente (autorisée, motivée, journalisée) :
-- réintègre le stock et rembourse chaque moyen de paiement reçu.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_sale(p_sale_id uuid, p_reason text, p_cash_session_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_sale public.sales;
  v_item record;
  v_pay record;
begin
  perform public.require_permission('sales.cancel');
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Le motif d''annulation est obligatoire.' using errcode = '22023';
  end if;
  select * into v_sale from public.sales where id = p_sale_id for update;
  if not found then
    raise exception 'Vente introuvable.' using errcode = 'P0002';
  end if;
  if v_sale.status = 'cancelled' then
    raise exception 'Cette vente est déjà annulée.' using errcode = '23514';
  end if;
  if exists (select 1 from public.returns where sale_id = p_sale_id) then
    raise exception 'Des retours ont déjà été enregistrés sur cette vente : utilisez la procédure de retour.' using errcode = '23514';
  end if;

  for v_item in select variant_id, quantity, unit_cost from public.sale_items where sale_id = p_sale_id order by variant_id loop
    perform public.apply_stock_movement(v_item.variant_id, v_item.quantity, 'sale_cancel',
      'Annulation vente ' || v_sale.sale_number, 'sale', p_sale_id, v_item.unit_cost, true);
  end loop;

  for v_pay in select method, sum(amount)::bigint as amount from public.payments where sale_id = p_sale_id group by method loop
    if v_pay.method = 'cash' then
      perform 1 from public.cash_sessions where id = p_cash_session_id for update;
      perform public.assert_open_session(p_cash_session_id);
      if public.cash_session_balance(p_cash_session_id) < v_pay.amount then
        raise exception 'Espèces insuffisantes dans la caisse pour rembourser % FCFA.', v_pay.amount using errcode = '23514';
      end if;
      insert into public.cash_movements (cash_session_id, type, amount, reason, reference_type, reference_id, created_by)
      values (p_cash_session_id, 'refund', -v_pay.amount, 'Annulation vente ' || v_sale.sale_number, 'sale', p_sale_id, auth.uid());
    elsif v_pay.method = 'store_credit' then
      update public.customers set store_credit = store_credit + v_pay.amount where id = v_sale.customer_id;
    end if;
    insert into public.refunds (sale_id, kind, method, amount, cash_session_id, reason, created_by)
    values (p_sale_id, 'cancellation', v_pay.method, v_pay.amount,
            case when v_pay.method = 'cash' then p_cash_session_id end, trim(p_reason), auth.uid());
  end loop;

  update public.sales
     set status = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid(),
         cancel_reason = trim(p_reason), balance_due = 0
   where id = p_sale_id;

  perform public.log_audit('sale.cancel', 'sale', p_sale_id::text,
    jsonb_build_object('sale_number', v_sale.sale_number, 'total', v_sale.total, 'reason', p_reason));
end $$;

-- ---------------------------------------------------------------------------
-- Retour (partiel ou total)
-- p_items : [{ "sale_item_id": uuid, "quantity": int, "restock": bool }]
-- La valeur retournée réduit d'abord le reste à payer de la vente, le surplus
-- est remboursé (espèces / Wave / OM / virement) ou converti en avoir.
-- ---------------------------------------------------------------------------
create or replace function public.process_return(
  p_client_operation_id uuid,
  p_sale_id uuid,
  p_items jsonb,
  p_reason text,
  p_refund_method public.payment_method default 'cash',
  p_cash_session_id uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_existing public.returns;
  v_sale public.sales;
  v_return_id uuid := gen_random_uuid();
  v_return_number text;
  v_entry jsonb;
  v_item public.sale_items;
  v_qty integer;
  v_restock boolean;
  v_value bigint;
  v_total bigint := 0;
  v_reduction bigint;
  v_refund bigint;
begin
  perform public.require_permission('returns.manage');
  if p_client_operation_id is null then
    raise exception 'Identifiant d''opération manquant.' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_client_operation_id::text, 0));
  select * into v_existing from public.returns where client_operation_id = p_client_operation_id;
  if found then
    return jsonb_build_object('id', v_existing.id, 'return_number', v_existing.return_number, 'duplicate', true);
  end if;

  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Le motif du retour est obligatoire.' using errcode = '22023';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Sélectionnez au moins un article à retourner.' using errcode = '22023';
  end if;

  select * into v_sale from public.sales where id = p_sale_id for update;
  if not found then
    raise exception 'Vente introuvable.' using errcode = 'P0002';
  end if;
  if v_sale.status <> 'completed' then
    raise exception 'Impossible de retourner les articles d''une vente annulée.' using errcode = '23514';
  end if;

  v_return_number := public.format_doc_number('R', nextval('public.return_number_seq'));
  insert into public.returns (id, return_number, client_operation_id, sale_id, reason, total_value, created_by)
  values (v_return_id, v_return_number, p_client_operation_id, p_sale_id, trim(p_reason), 0, auth.uid());

  for v_entry in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_entry ->> 'quantity')::integer;
    v_restock := coalesce((v_entry ->> 'restock')::boolean, true);
    select * into v_item from public.sale_items
     where id = (v_entry ->> 'sale_item_id')::uuid and sale_id = p_sale_id
       for update;
    if not found then
      raise exception 'Article introuvable sur cette vente.' using errcode = 'P0002';
    end if;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Quantité de retour invalide.' using errcode = '22023';
    end if;
    if v_item.returned_qty + v_qty > v_item.quantity then
      raise exception 'Quantité retournée supérieure à la quantité restante pour « % » (reste : %).',
        v_item.product_name, v_item.quantity - v_item.returned_qty using errcode = '23514';
    end if;
    -- Valeur nette (remise incluse). La dernière unité reprend le reliquat
    -- exact pour que la somme des retours égale le montant de la ligne.
    if v_item.returned_qty + v_qty = v_item.quantity then
      v_value := v_item.line_total - v_item.refunded_amount;
    else
      v_value := round(v_item.line_total::numeric * v_qty / v_item.quantity)::bigint;
      v_value := least(v_value, v_item.line_total - v_item.refunded_amount);
    end if;

    update public.sale_items
       set returned_qty = returned_qty + v_qty, refunded_amount = refunded_amount + v_value
     where id = v_item.id;

    insert into public.return_items (return_id, sale_item_id, quantity, refund_value, unit_cost, restock)
    values (v_return_id, v_item.id, v_qty, v_value, v_item.unit_cost, v_restock);

    if v_restock then
      perform public.apply_stock_movement(v_item.variant_id, v_qty, 'return',
        'Retour ' || v_return_number || ' (vente ' || v_sale.sale_number || ')', 'return', v_return_id, v_item.unit_cost, true);
    end if;
    v_total := v_total + v_value;
  end loop;

  v_reduction := least(v_sale.balance_due, v_total);
  v_refund := v_total - v_reduction;

  if v_reduction > 0 then
    update public.sales set balance_due = balance_due - v_reduction where id = p_sale_id;
  end if;

  if v_refund > 0 then
    if p_refund_method is null then
      raise exception 'Choisissez le mode de remboursement.' using errcode = '22023';
    end if;
    if p_refund_method = 'cash' then
      perform 1 from public.cash_sessions where id = p_cash_session_id for update;
      perform public.assert_open_session(p_cash_session_id);
      if public.cash_session_balance(p_cash_session_id) < v_refund then
        raise exception 'Espèces insuffisantes dans la caisse pour rembourser % FCFA.', v_refund using errcode = '23514';
      end if;
      insert into public.cash_movements (cash_session_id, type, amount, reason, reference_type, reference_id, created_by)
      values (p_cash_session_id, 'refund', -v_refund, 'Retour ' || v_return_number, 'return', v_return_id, auth.uid());
    elsif p_refund_method = 'store_credit' then
      if v_sale.customer_id is null then
        raise exception 'Un avoir nécessite une vente rattachée à un client.' using errcode = '22023';
      end if;
      update public.customers set store_credit = store_credit + v_refund where id = v_sale.customer_id;
    end if;
    insert into public.refunds (sale_id, return_id, kind, method, amount, cash_session_id, reason, created_by)
    values (p_sale_id, v_return_id, 'return', p_refund_method, v_refund,
            case when p_refund_method = 'cash' then p_cash_session_id end, trim(p_reason), auth.uid());
  end if;

  update public.returns
     set total_value = v_total, balance_reduction = v_reduction, refund_amount = v_refund,
         refund_method = case when v_refund > 0 then p_refund_method end,
         cash_session_id = case when v_refund > 0 and p_refund_method = 'cash' then p_cash_session_id end
   where id = v_return_id;

  perform public.log_audit('return.create', 'return', v_return_id::text,
    jsonb_build_object('return_number', v_return_number, 'sale_number', v_sale.sale_number,
                       'total_value', v_total, 'refund', v_refund, 'method', p_refund_method));

  return jsonb_build_object('id', v_return_id, 'return_number', v_return_number, 'duplicate', false,
                            'total_value', v_total, 'balance_reduction', v_reduction, 'refund_amount', v_refund);
end $$;

-- ---------------------------------------------------------------------------
-- Règlement d'une créance client (réparti sur les ventes les plus anciennes)
-- ---------------------------------------------------------------------------
create or replace function public.record_credit_payment(
  p_client_operation_id uuid, p_customer_id uuid, p_amount bigint, p_method public.payment_method,
  p_cash_session_id uuid default null, p_reference text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_outstanding bigint;
  v_remaining bigint := p_amount;
  v_sale record;
  v_part bigint;
  v_id uuid;
begin
  perform public.require_permission('sales.create');
  perform pg_advisory_xact_lock(hashtextextended(p_client_operation_id::text, 0));
  select id into v_id from public.credit_settlements where client_operation_id = p_client_operation_id;
  if found then
    return jsonb_build_object('id', v_id, 'duplicate', true);
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Montant invalide.' using errcode = '22023';
  end if;
  if p_method = 'store_credit' then
    raise exception 'Un avoir ne peut pas servir à régler une créance.' using errcode = '22023';
  end if;
  perform 1 from public.customers where id = p_customer_id for update;
  if not found then
    raise exception 'Client introuvable.' using errcode = 'P0002';
  end if;
  select coalesce(sum(balance_due), 0) into v_outstanding
    from public.sales where customer_id = p_customer_id and status = 'completed' and balance_due > 0;
  if p_amount > v_outstanding then
    raise exception 'Le montant (% FCFA) dépasse la créance du client (% FCFA).', p_amount, v_outstanding using errcode = '22023';
  end if;
  if p_method = 'cash' then
    perform public.assert_open_session(p_cash_session_id);
  end if;

  insert into public.credit_settlements (client_operation_id, customer_id, method, amount, cash_session_id, reference, created_by)
  values (p_client_operation_id, p_customer_id, p_method, p_amount,
          case when p_method = 'cash' then p_cash_session_id end, nullif(trim(p_reference), ''), auth.uid())
  returning id into v_id;

  for v_sale in
    select id, balance_due from public.sales
     where customer_id = p_customer_id and status = 'completed' and balance_due > 0
     order by created_at, id
       for update
  loop
    exit when v_remaining = 0;
    v_part := least(v_remaining, v_sale.balance_due);
    update public.sales set balance_due = balance_due - v_part, amount_paid = amount_paid + v_part where id = v_sale.id;
    insert into public.payments (sale_id, customer_id, cash_session_id, method, amount, kind, reference, received_by)
    values (v_sale.id, p_customer_id, case when p_method = 'cash' then p_cash_session_id end,
            p_method, v_part, 'credit_settlement', nullif(trim(p_reference), ''), auth.uid());
    v_remaining := v_remaining - v_part;
  end loop;

  if p_method = 'cash' then
    insert into public.cash_movements (cash_session_id, type, amount, reason, reference_type, reference_id, created_by)
    values (p_cash_session_id, 'credit_settlement', p_amount, 'Règlement créance client', 'credit_settlement', v_id, auth.uid());
  end if;

  perform public.log_audit('customer.credit_payment', 'customer', p_customer_id::text,
    jsonb_build_object('amount', p_amount, 'method', p_method));
  return jsonb_build_object('id', v_id, 'duplicate', false);
end $$;

-- ---------------------------------------------------------------------------
-- Dépenses
-- ---------------------------------------------------------------------------
create or replace function public.record_expense(
  p_category public.expense_category, p_amount bigint, p_expense_date date,
  p_method public.payment_method, p_comment text default null, p_cash_session_id uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  perform public.require_permission('expenses.manage');
  if p_amount is null or p_amount <= 0 then
    raise exception 'Le montant doit être supérieur à zéro.' using errcode = '22023';
  end if;
  if p_expense_date is null or p_expense_date > (now() at time zone 'Africa/Dakar')::date + 1 then
    raise exception 'Date de dépense invalide.' using errcode = '22023';
  end if;
  if p_method = 'store_credit' then
    raise exception 'Moyen de paiement invalide pour une dépense.' using errcode = '22023';
  end if;
  if p_cash_session_id is not null then
    if p_method <> 'cash' then
      raise exception 'Seule une dépense en espèces peut être prise dans la caisse.' using errcode = '22023';
    end if;
    perform 1 from public.cash_sessions where id = p_cash_session_id for update;
    perform public.assert_open_session(p_cash_session_id);
    if public.cash_session_balance(p_cash_session_id) < p_amount then
      raise exception 'Espèces insuffisantes dans la caisse.' using errcode = '23514';
    end if;
  end if;
  insert into public.expenses (category, amount, expense_date, method, comment, cash_session_id, created_by)
  values (p_category, p_amount, p_expense_date, p_method, nullif(trim(p_comment), ''), p_cash_session_id, auth.uid())
  returning id into v_id;
  -- Un seul mouvement de caisse par dépense : la dépense n'est comptée
  -- qu'une fois dans les rapports (table expenses) et une fois en caisse.
  if p_cash_session_id is not null then
    insert into public.cash_movements (cash_session_id, type, amount, reason, reference_type, reference_id, created_by)
    values (p_cash_session_id, 'expense', -p_amount, 'Dépense : ' || p_category::text, 'expense', v_id, auth.uid());
  end if;
  perform public.log_audit('expense.create', 'expense', v_id::text,
    jsonb_build_object('amount', p_amount, 'category', p_category, 'method', p_method, 'from_register', p_cash_session_id is not null));
  return v_id;
end $$;

create or replace function public.void_expense(p_expense_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_exp public.expenses;
  v_status public.cash_session_status;
begin
  perform public.require_permission('expenses.manage');
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Le motif est obligatoire.' using errcode = '22023';
  end if;
  select * into v_exp from public.expenses where id = p_expense_id for update;
  if not found then
    raise exception 'Dépense introuvable.' using errcode = 'P0002';
  end if;
  if v_exp.voided_at is not null then
    raise exception 'Cette dépense est déjà annulée.' using errcode = '23514';
  end if;
  if v_exp.cash_session_id is not null then
    select status into v_status from public.cash_sessions where id = v_exp.cash_session_id for update;
    if v_status <> 'open' then
      raise exception 'La session de caisse de cette dépense est clôturée : demandez une correction de caisse.' using errcode = '23514';
    end if;
    insert into public.cash_movements (cash_session_id, type, amount, reason, reference_type, reference_id, created_by)
    values (v_exp.cash_session_id, 'expense_void', v_exp.amount, 'Annulation dépense', 'expense', v_exp.id, auth.uid());
  end if;
  update public.expenses set voided_at = now(), voided_by = auth.uid(), void_reason = trim(p_reason) where id = p_expense_id;
  perform public.log_audit('expense.void', 'expense', p_expense_id::text,
    jsonb_build_object('amount', v_exp.amount, 'reason', p_reason));
end $$;

-- ---------------------------------------------------------------------------
-- Stock : entrées, sorties, corrections
-- ---------------------------------------------------------------------------
create or replace function public.adjust_stock(
  p_variant_id uuid, p_quantity integer, p_type public.stock_movement_type, p_reason text
) returns integer language plpgsql security definer set search_path = public as $$
declare
  v_balance integer;
  v_cost bigint;
begin
  perform public.require_permission('stock.adjust');
  if p_type not in ('initial', 'entry', 'exit', 'adjustment') then
    raise exception 'Type de mouvement non autorisé.' using errcode = '22023';
  end if;
  if p_quantity is null or p_quantity = 0 then
    raise exception 'La quantité ne peut pas être nulle.' using errcode = '22023';
  end if;
  if p_type in ('initial', 'entry') and p_quantity < 0 or p_type = 'exit' and p_quantity > 0 then
    raise exception 'Le signe de la quantité ne correspond pas au type de mouvement.' using errcode = '22023';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Le motif est obligatoire.' using errcode = '22023';
  end if;
  select coalesce(v.purchase_price, p.purchase_price) into v_cost
    from public.product_variants v join public.products p on p.id = v.product_id
   where v.id = p_variant_id for update of v;
  if not found then
    raise exception 'Variante introuvable.' using errcode = 'P0002';
  end if;
  v_balance := public.apply_stock_movement(p_variant_id, p_quantity, p_type, trim(p_reason), 'manual', null, v_cost);
  perform public.log_audit('stock.' || p_type::text, 'product_variant', p_variant_id::text,
    jsonb_build_object('quantity', p_quantity, 'reason', p_reason, 'balance_after', v_balance));
  return v_balance;
end $$;

-- ---------------------------------------------------------------------------
-- Inventaires physiques
-- ---------------------------------------------------------------------------
create or replace function public.start_inventory(p_name text, p_category_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  perform public.require_permission('stock.manage');
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Le nom de l''inventaire est obligatoire.' using errcode = '22023';
  end if;
  insert into public.inventories (name, category_id, started_by)
  values (trim(p_name), p_category_id, auth.uid()) returning id into v_id;
  insert into public.inventory_lines (inventory_id, variant_id, expected_qty)
  select v_id, v.id, v.stock_qty
    from public.product_variants v join public.products p on p.id = v.product_id
   where v.is_active and p.status = 'active'
     and (p_category_id is null or p.category_id = p_category_id);
  perform public.log_audit('inventory.start', 'inventory', v_id::text, jsonb_build_object('name', p_name));
  return v_id;
end $$;

create or replace function public.record_inventory_count(p_line_id uuid, p_counted integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_permission('stock.manage');
  if p_counted is not null and p_counted < 0 then
    raise exception 'La quantité comptée ne peut pas être négative.' using errcode = '22023';
  end if;
  update public.inventory_lines l
     set counted_qty = p_counted, counted_by = auth.uid(), counted_at = now()
    from public.inventories i
   where l.id = p_line_id and i.id = l.inventory_id and i.status = 'in_progress';
  if not found then
    raise exception 'Ligne introuvable ou inventaire déjà clôturé.' using errcode = '23514';
  end if;
end $$;

-- Validation : l'écart (compté − théorique au démarrage) est appliqué au stock
-- courant, ce qui préserve les ventes enregistrées pendant le comptage.
create or replace function public.validate_inventory(p_inventory_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_inv public.inventories;
  v_line record;
  v_adjusted integer := 0;
begin
  perform public.require_permission('stock.manage');
  select * into v_inv from public.inventories where id = p_inventory_id for update;
  if not found or v_inv.status <> 'in_progress' then
    raise exception 'Inventaire introuvable ou déjà clôturé.' using errcode = '23514';
  end if;
  for v_line in
    select l.variant_id, l.counted_qty - l.expected_qty as delta,
           coalesce(v.purchase_price, p.purchase_price) as cost
      from public.inventory_lines l
      join public.product_variants v on v.id = l.variant_id
      join public.products p on p.id = v.product_id
     where l.inventory_id = p_inventory_id and l.counted_qty is not null and l.counted_qty <> l.expected_qty
     order by l.variant_id
  loop
    perform public.apply_stock_movement(v_line.variant_id, v_line.delta, 'inventory',
      'Inventaire : ' || v_inv.name, 'inventory', p_inventory_id, v_line.cost);
    v_adjusted := v_adjusted + 1;
  end loop;
  update public.inventories set status = 'validated', validated_by = auth.uid(), validated_at = now() where id = p_inventory_id;
  perform public.log_audit('inventory.validate', 'inventory', p_inventory_id::text, jsonb_build_object('adjusted_lines', v_adjusted));
  return jsonb_build_object('adjusted_lines', v_adjusted);
end $$;

create or replace function public.cancel_inventory(p_inventory_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_permission('stock.manage');
  update public.inventories set status = 'cancelled' where id = p_inventory_id and status = 'in_progress';
  if not found then
    raise exception 'Inventaire introuvable ou déjà clôturé.' using errcode = '23514';
  end if;
  perform public.log_audit('inventory.cancel', 'inventory', p_inventory_id::text, '{}'::jsonb);
end $$;

-- ---------------------------------------------------------------------------
-- Achats : commande, réception (partielle possible), règlement
-- p_items : [{ "variant_id": uuid, "quantity": int, "unit_cost": int }]
-- ---------------------------------------------------------------------------
create or replace function public.create_purchase(
  p_supplier_id uuid, p_items jsonb, p_supplier_reference text default null,
  p_notes text default null, p_order_date date default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := gen_random_uuid();
  v_number text;
  v_total bigint;
begin
  perform public.require_permission('purchases.manage');
  if not exists (select 1 from public.suppliers where id = p_supplier_id) then
    raise exception 'Fournisseur introuvable.' using errcode = 'P0002';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Ajoutez au moins un article.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) e
     where (e ->> 'quantity')::integer is null or (e ->> 'quantity')::integer <= 0
        or (e ->> 'unit_cost')::bigint is null or (e ->> 'unit_cost')::bigint < 0
        or not exists (select 1 from public.product_variants v where v.id = (e ->> 'variant_id')::uuid)
  ) then
    raise exception 'Ligne d''achat invalide (article, quantité ou coût).' using errcode = '22023';
  end if;
  v_number := public.format_doc_number('A', nextval('public.purchase_number_seq'));
  insert into public.purchases (id, purchase_number, supplier_id, supplier_reference, notes, order_date, created_by)
  values (v_id, v_number, p_supplier_id, nullif(trim(p_supplier_reference), ''), nullif(trim(p_notes), ''),
          coalesce(p_order_date, (now() at time zone 'Africa/Dakar')::date), auth.uid());
  insert into public.purchase_items (purchase_id, variant_id, quantity_ordered, unit_cost)
  select v_id, (e ->> 'variant_id')::uuid, (e ->> 'quantity')::integer, (e ->> 'unit_cost')::bigint
    from jsonb_array_elements(p_items) e;
  select sum(quantity_ordered * unit_cost) into v_total from public.purchase_items where purchase_id = v_id;
  update public.purchases set ordered_total = v_total where id = v_id;
  perform public.log_audit('purchase.create', 'purchase', v_id::text, jsonb_build_object('number', v_number, 'total', v_total));
  return jsonb_build_object('id', v_id, 'purchase_number', v_number, 'ordered_total', v_total);
end $$;

create or replace function public.cancel_purchase(p_purchase_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_p public.purchases;
begin
  perform public.require_permission('purchases.manage');
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Le motif est obligatoire.' using errcode = '22023';
  end if;
  select * into v_p from public.purchases where id = p_purchase_id for update;
  if v_p.status <> 'ordered' or v_p.received_total > 0 then
    raise exception 'Seule une commande sans réception peut être annulée.' using errcode = '23514';
  end if;
  if v_p.amount_paid > 0 then
    raise exception 'Cette commande a déjà fait l''objet d''un règlement.' using errcode = '23514';
  end if;
  update public.purchases set status = 'cancelled', cancelled_at = now(), cancel_reason = trim(p_reason) where id = p_purchase_id;
  perform public.log_audit('purchase.cancel', 'purchase', p_purchase_id::text, jsonb_build_object('reason', p_reason));
end $$;

-- p_items : [{ "purchase_item_id": uuid, "quantity": int, "unit_cost": int (optionnel) }]
create or replace function public.receive_purchase(
  p_client_operation_id uuid, p_purchase_id uuid, p_items jsonb,
  p_update_costs boolean default true, p_notes text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_existing uuid;
  v_p public.purchases;
  v_receipt_id uuid := gen_random_uuid();
  v_entry jsonb;
  v_item public.purchase_items;
  v_qty integer;
  v_cost bigint;
  v_total bigint := 0;
  v_remaining integer;
begin
  perform public.require_permission('purchases.manage');
  perform pg_advisory_xact_lock(hashtextextended(p_client_operation_id::text, 0));
  select id into v_existing from public.purchase_receipts where client_operation_id = p_client_operation_id;
  if found then
    return jsonb_build_object('id', v_existing, 'duplicate', true);
  end if;
  select * into v_p from public.purchases where id = p_purchase_id for update;
  if not found then
    raise exception 'Commande introuvable.' using errcode = 'P0002';
  end if;
  if v_p.status not in ('ordered', 'partially_received') then
    raise exception 'Cette commande ne peut plus être réceptionnée.' using errcode = '23514';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Indiquez les quantités reçues.' using errcode = '22023';
  end if;

  insert into public.purchase_receipts (id, client_operation_id, purchase_id, received_by, total_cost, notes)
  values (v_receipt_id, p_client_operation_id, p_purchase_id, auth.uid(), 0, nullif(trim(p_notes), ''));

  for v_entry in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_entry ->> 'quantity')::integer;
    continue when coalesce(v_qty, 0) = 0;
    select * into v_item from public.purchase_items
     where id = (v_entry ->> 'purchase_item_id')::uuid and purchase_id = p_purchase_id for update;
    if not found then
      raise exception 'Ligne de commande introuvable.' using errcode = 'P0002';
    end if;
    if v_qty < 0 or v_item.quantity_received + v_qty > v_item.quantity_ordered then
      raise exception 'Quantité reçue invalide (reste à recevoir : %).', v_item.quantity_ordered - v_item.quantity_received using errcode = '23514';
    end if;
    v_cost := coalesce((v_entry ->> 'unit_cost')::bigint, v_item.unit_cost);
    if v_cost < 0 then
      raise exception 'Coût unitaire invalide.' using errcode = '22023';
    end if;
    update public.purchase_items set quantity_received = quantity_received + v_qty where id = v_item.id;
    insert into public.purchase_receipt_items (receipt_id, purchase_item_id, quantity, unit_cost)
    values (v_receipt_id, v_item.id, v_qty, v_cost);
    perform public.apply_stock_movement(v_item.variant_id, v_qty, 'purchase_receipt',
      'Réception ' || v_p.purchase_number, 'purchase_receipt', v_receipt_id, v_cost, true);
    if p_update_costs then
      update public.product_variants set purchase_price = v_cost where id = v_item.variant_id;
    end if;
    v_total := v_total + v_qty * v_cost;
  end loop;

  if v_total = 0 and not exists (select 1 from public.purchase_receipt_items where receipt_id = v_receipt_id) then
    raise exception 'Aucune quantité reçue.' using errcode = '22023';
  end if;

  update public.purchase_receipts set total_cost = v_total where id = v_receipt_id;
  select coalesce(sum(quantity_ordered - quantity_received), 0) into v_remaining from public.purchase_items where purchase_id = p_purchase_id;
  update public.purchases
     set received_total = received_total + v_total,
         status = case when v_remaining = 0 then 'received'::public.purchase_status else 'partially_received'::public.purchase_status end
   where id = p_purchase_id;
  perform public.log_audit('purchase.receive', 'purchase', p_purchase_id::text,
    jsonb_build_object('receipt_id', v_receipt_id, 'total_cost', v_total));
  return jsonb_build_object('id', v_receipt_id, 'duplicate', false, 'total_cost', v_total);
end $$;

create or replace function public.record_supplier_payment(
  p_client_operation_id uuid, p_supplier_id uuid, p_amount bigint, p_method public.payment_method,
  p_purchase_id uuid default null, p_reference text default null,
  p_cash_session_id uuid default null, p_paid_at date default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_p public.purchases;
begin
  perform public.require_permission('suppliers.manage');
  perform pg_advisory_xact_lock(hashtextextended(p_client_operation_id::text, 0));
  select id into v_id from public.supplier_payments where client_operation_id = p_client_operation_id;
  if found then
    return jsonb_build_object('id', v_id, 'duplicate', true);
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Montant invalide.' using errcode = '22023';
  end if;
  if p_method = 'store_credit' then
    raise exception 'Moyen de paiement invalide.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.suppliers where id = p_supplier_id) then
    raise exception 'Fournisseur introuvable.' using errcode = 'P0002';
  end if;
  if p_purchase_id is not null then
    select * into v_p from public.purchases where id = p_purchase_id for update;
    if not found or v_p.supplier_id <> p_supplier_id then
      raise exception 'Commande introuvable pour ce fournisseur.' using errcode = 'P0002';
    end if;
    if v_p.status = 'cancelled' then
      raise exception 'Commande annulée.' using errcode = '23514';
    end if;
    if v_p.amount_paid + p_amount > greatest(v_p.ordered_total, v_p.received_total) then
      raise exception 'Le règlement dépasse le montant de la commande (reste : % FCFA).',
        greatest(v_p.ordered_total, v_p.received_total) - v_p.amount_paid using errcode = '22023';
    end if;
  end if;
  if p_cash_session_id is not null then
    if p_method <> 'cash' then
      raise exception 'Seul un règlement en espèces peut être pris dans la caisse.' using errcode = '22023';
    end if;
    perform 1 from public.cash_sessions where id = p_cash_session_id for update;
    perform public.assert_open_session(p_cash_session_id);
    if public.cash_session_balance(p_cash_session_id) < p_amount then
      raise exception 'Espèces insuffisantes dans la caisse.' using errcode = '23514';
    end if;
  end if;
  insert into public.supplier_payments (client_operation_id, supplier_id, purchase_id, method, amount, reference, cash_session_id, paid_at, created_by)
  values (p_client_operation_id, p_supplier_id, p_purchase_id, p_method, p_amount, nullif(trim(p_reference), ''),
          p_cash_session_id, coalesce(p_paid_at, (now() at time zone 'Africa/Dakar')::date), auth.uid())
  returning id into v_id;
  if p_purchase_id is not null then
    update public.purchases set amount_paid = amount_paid + p_amount where id = p_purchase_id;
  end if;
  if p_cash_session_id is not null then
    insert into public.cash_movements (cash_session_id, type, amount, reason, reference_type, reference_id, created_by)
    values (p_cash_session_id, 'supplier_payment', -p_amount, 'Règlement fournisseur', 'supplier_payment', v_id, auth.uid());
  end if;
  perform public.log_audit('supplier.payment', 'supplier', p_supplier_id::text,
    jsonb_build_object('amount', p_amount, 'method', p_method, 'purchase_id', p_purchase_id));
  return jsonb_build_object('id', v_id, 'duplicate', false);
end $$;

-- ---------------------------------------------------------------------------
-- Création d'un produit avec ses variantes et stock initial (atomique)
-- p_product  : { name, description, category_id, brand, supplier_id, reference,
--                purchase_price, sale_price, min_stock, photo_path }
-- p_variants : [{ label, attributes, sku, barcode, generate_barcode, purchase_price,
--                 sale_price, min_stock, initial_stock }]
-- ---------------------------------------------------------------------------
create or replace function public.create_product(p_product jsonb, p_variants jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_variant_id uuid;
  v_entry jsonb;
  v_barcode text;
  v_internal boolean;
  v_initial integer;
begin
  perform public.require_permission('products.manage');
  if coalesce(trim(p_product ->> 'name'), '') = '' then
    raise exception 'Le nom du produit est obligatoire.' using errcode = '22023';
  end if;
  if p_variants is null or jsonb_typeof(p_variants) <> 'array' or jsonb_array_length(p_variants) = 0 then
    p_variants := '[{"label":"Standard"}]'::jsonb;
  end if;
  insert into public.products (name, description, category_id, brand, supplier_id, reference,
                               purchase_price, sale_price, min_stock, photo_path, created_by)
  values (trim(p_product ->> 'name'), nullif(trim(p_product ->> 'description'), ''),
          nullif(p_product ->> 'category_id', '')::uuid, nullif(trim(p_product ->> 'brand'), ''),
          nullif(p_product ->> 'supplier_id', '')::uuid, nullif(trim(p_product ->> 'reference'), ''),
          coalesce((p_product ->> 'purchase_price')::bigint, 0), (p_product ->> 'sale_price')::bigint,
          coalesce((p_product ->> 'min_stock')::integer, (select default_min_stock from public.shop_settings where id = 1)),
          nullif(p_product ->> 'photo_path', ''), auth.uid())
  returning id into v_id;

  for v_entry in select * from jsonb_array_elements(p_variants) loop
    v_barcode := nullif(trim(v_entry ->> 'barcode'), '');
    v_internal := false;
    if v_barcode is null and coalesce((v_entry ->> 'generate_barcode')::boolean, true) then
      v_barcode := public.generate_internal_barcode();
      v_internal := true;
    end if;
    if v_barcode is not null and exists (select 1 from public.product_variants where barcode = v_barcode) then
      raise exception 'Le code-barres % est déjà attribué à un autre article.', v_barcode using errcode = '23505';
    end if;
    insert into public.product_variants (product_id, label, attributes, sku, barcode, barcode_is_internal,
                                         purchase_price, sale_price, min_stock)
    values (v_id, coalesce(nullif(trim(v_entry ->> 'label'), ''), 'Standard'),
            coalesce(v_entry -> 'attributes', '{}'::jsonb), nullif(trim(v_entry ->> 'sku'), ''),
            v_barcode, v_internal,
            (v_entry ->> 'purchase_price')::bigint, (v_entry ->> 'sale_price')::bigint,
            (v_entry ->> 'min_stock')::integer)
    returning id into v_variant_id;
    v_initial := coalesce((v_entry ->> 'initial_stock')::integer, 0);
    if v_initial < 0 then
      raise exception 'Le stock initial ne peut pas être négatif.' using errcode = '22023';
    end if;
    if v_initial > 0 then
      perform public.apply_stock_movement(v_variant_id, v_initial, 'initial', 'Stock initial', 'product', v_id,
        coalesce((v_entry ->> 'purchase_price')::bigint, (p_product ->> 'purchase_price')::bigint, 0));
    end if;
  end loop;
  perform public.log_audit('product.create', 'product', v_id::text, jsonb_build_object('name', p_product ->> 'name'));
  return v_id;
end $$;

-- Ajout d'une variante à un produit existant (stock initial tracé).
create or replace function public.add_variant(p_product_id uuid, p_variant jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_barcode text := nullif(trim(p_variant ->> 'barcode'), '');
  v_internal boolean := false;
  v_initial integer := coalesce((p_variant ->> 'initial_stock')::integer, 0);
begin
  perform public.require_permission('products.manage');
  if not exists (select 1 from public.products where id = p_product_id) then
    raise exception 'Produit introuvable.' using errcode = 'P0002';
  end if;
  if v_barcode is null and coalesce((p_variant ->> 'generate_barcode')::boolean, true) then
    v_barcode := public.generate_internal_barcode();
    v_internal := true;
  end if;
  if v_barcode is not null and exists (select 1 from public.product_variants where barcode = v_barcode) then
    raise exception 'Le code-barres % est déjà attribué à un autre article.', v_barcode using errcode = '23505';
  end if;
  if v_initial < 0 then
    raise exception 'Le stock initial ne peut pas être négatif.' using errcode = '22023';
  end if;
  insert into public.product_variants (product_id, label, attributes, sku, barcode, barcode_is_internal,
                                       purchase_price, sale_price, min_stock)
  values (p_product_id, coalesce(nullif(trim(p_variant ->> 'label'), ''), 'Standard'),
          coalesce(p_variant -> 'attributes', '{}'::jsonb), nullif(trim(p_variant ->> 'sku'), ''),
          v_barcode, v_internal, (p_variant ->> 'purchase_price')::bigint, (p_variant ->> 'sale_price')::bigint,
          (p_variant ->> 'min_stock')::integer)
  returning id into v_id;
  if v_initial > 0 then
    perform public.apply_stock_movement(v_id, v_initial, 'initial', 'Stock initial', 'product', p_product_id,
      (select coalesce(v.purchase_price, p.purchase_price) from public.product_variants v join public.products p on p.id = v.product_id where v.id = v_id));
  end if;
  perform public.log_audit('variant.create', 'product', p_product_id::text, jsonb_build_object('variant_id', v_id, 'barcode', v_barcode));
  return v_id;
end $$;
