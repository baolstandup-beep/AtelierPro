-- =============================================================================
-- Indicateurs et rapports. Définitions (voir docs/CALCULS.md) :
--  * CA brut       : somme des lignes nettes (après remises) des ventes validées
--                    (status = completed) créées sur la période.
--  * Retours       : valeur nette des articles retournés sur la période.
--  * CA net        : CA brut − retours.
--  * Encaissements : paiements effectivement reçus sur la période (ventes et
--                    règlements de créances) − remboursements versés. Les
--                    ventes à crédit ne sont pas des encaissements.
--  * CMV           : coût d'achat enregistré sur chaque ligne vendue − coût des
--                    articles retournés.
--  * Marge brute   : CA net − CMV.
--  * Bénéfice estimé : marge brute − dépenses non annulées de la période.
-- Toutes les bornes sont des instants (timestamptz) ; l'interface les calcule
-- en heure de Dakar.
-- =============================================================================

create or replace function public.report_summary(p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_gross bigint; v_cogs bigint; v_count bigint; v_discounts bigint; v_credit bigint;
  v_ret_value bigint; v_ret_cost bigint;
  v_received bigint; v_refunded bigint; v_expenses bigint;
  v_stock_value bigint; v_low bigint; v_out bigint;
  v_receivables bigint; v_payables bigint;
begin
  if not (public.has_permission('dashboard.view') or public.has_permission('reports.view')) then
    raise exception 'Permission refusée.' using errcode = '42501';
  end if;

  select coalesce(sum(si.line_total), 0), coalesce(sum(si.unit_cost * si.quantity), 0)
    into v_gross, v_cogs
    from public.sale_items si join public.sales s on s.id = si.sale_id
   where s.status = 'completed' and s.created_at >= p_from and s.created_at < p_to;

  select count(*), coalesce(sum(discount_amount), 0), coalesce(sum(case when balance_due > 0 then balance_due else 0 end), 0)
    into v_count, v_discounts, v_credit
    from public.sales where status = 'completed' and created_at >= p_from and created_at < p_to;

  select coalesce(sum(ri.refund_value), 0), coalesce(sum(ri.unit_cost * ri.quantity), 0)
    into v_ret_value, v_ret_cost
    from public.return_items ri join public.returns r on r.id = ri.return_id
   where r.created_at >= p_from and r.created_at < p_to;

  select coalesce(sum(amount), 0) into v_received from public.payments
   where created_at >= p_from and created_at < p_to and method <> 'store_credit';
  select coalesce(sum(amount), 0) into v_refunded from public.refunds
   where created_at >= p_from and created_at < p_to and method <> 'store_credit';

  select coalesce(sum(amount), 0) into v_expenses from public.expenses
   where voided_at is null
     and expense_date >= (p_from at time zone 'Africa/Dakar')::date
     and expense_date < (p_to at time zone 'Africa/Dakar')::date;

  select coalesce(sum(stock_value) filter (where stock_qty > 0), 0),
         count(*) filter (where stock_status = 'low' and is_sellable),
         count(*) filter (where stock_status = 'out' and is_sellable)
    into v_stock_value, v_low, v_out
    from public.v_variant_stock;

  select coalesce(sum(balance_due), 0) into v_receivables from public.sales where status = 'completed' and balance_due > 0;
  select coalesce(sum(received_total), 0) - coalesce((select sum(amount) from public.supplier_payments), 0)
    into v_payables from public.purchases where status <> 'cancelled';

  return jsonb_build_object(
    'gross_sales', v_gross,
    'returns_value', v_ret_value,
    'net_sales', v_gross - v_ret_value,
    'sales_count', v_count,
    'average_basket', case when v_count > 0 then round(v_gross::numeric / v_count)::bigint else 0 end,
    'discounts', v_discounts,
    'credit_granted', v_credit,
    'cogs', v_cogs - v_ret_cost,
    'gross_margin', (v_gross - v_ret_value) - (v_cogs - v_ret_cost),
    'expenses', v_expenses,
    'estimated_profit', (v_gross - v_ret_value) - (v_cogs - v_ret_cost) - v_expenses,
    'cash_received', v_received,
    'refunds_paid', v_refunded,
    'net_collections', v_received - v_refunded,
    'stock_value', v_stock_value,
    'low_stock_count', v_low,
    'out_of_stock_count', v_out,
    'receivables', v_receivables,
    'payables', greatest(v_payables, 0)
  );
end $$;

create or replace function public.report_payments_by_method(p_from timestamptz, p_to timestamptz)
returns table (method public.payment_method, received bigint, refunded bigint, net bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.has_permission('dashboard.view') or public.has_permission('reports.view')) then
    raise exception 'Permission refusée.' using errcode = '42501';
  end if;
  return query
  with p as (
    select pm.method, sum(pm.amount)::bigint as amt from public.payments pm
     where pm.created_at >= p_from and pm.created_at < p_to group by pm.method
  ), r as (
    select rf.method, sum(rf.amount)::bigint as amt from public.refunds rf
     where rf.created_at >= p_from and rf.created_at < p_to group by rf.method
  )
  select m.m, coalesce(p.amt, 0), coalesce(r.amt, 0), coalesce(p.amt, 0) - coalesce(r.amt, 0)
    from unnest(enum_range(null::public.payment_method)) as m(m)
    left join p on p.method = m.m
    left join r on r.method = m.m
   where coalesce(p.amt, 0) <> 0 or coalesce(r.amt, 0) <> 0
   order by 2 desc;
end $$;

create or replace function public.report_sales_by_day(p_from timestamptz, p_to timestamptz)
returns table (day date, sales_count bigint, gross_sales bigint, discounts bigint, cogs bigint, margin bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.has_permission('dashboard.view') or public.has_permission('reports.view')) then
    raise exception 'Permission refusée.' using errcode = '42501';
  end if;
  return query
  select (s.created_at at time zone 'Africa/Dakar')::date,
         count(distinct s.id),
         sum(si.line_total)::bigint,
         sum(si.discount_amount)::bigint,
         sum(si.unit_cost * si.quantity)::bigint,
         sum(si.line_total - si.unit_cost * si.quantity)::bigint
    from public.sales s join public.sale_items si on si.sale_id = s.id
   where s.status = 'completed' and s.created_at >= p_from and s.created_at < p_to
   group by 1 order by 1;
end $$;

create or replace function public.report_sales_by_month(p_from timestamptz, p_to timestamptz)
returns table (month text, sales_count bigint, gross_sales bigint, cogs bigint, margin bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_permission('reports.view');
  return query
  select to_char(s.created_at at time zone 'Africa/Dakar', 'YYYY-MM'),
         count(distinct s.id), sum(si.line_total)::bigint,
         sum(si.unit_cost * si.quantity)::bigint, sum(si.line_total - si.unit_cost * si.quantity)::bigint
    from public.sales s join public.sale_items si on si.sale_id = s.id
   where s.status = 'completed' and s.created_at >= p_from and s.created_at < p_to
   group by 1 order by 1;
end $$;

-- Ventes et marges par article (net des retours de la période).
create or replace function public.report_sales_by_product(p_from timestamptz, p_to timestamptz)
returns table (variant_id uuid, product_name text, variant_label text, category_name text,
               quantity bigint, returned_quantity bigint, net_sales bigint, cogs bigint, margin bigint, margin_rate numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.has_permission('dashboard.view') or public.has_permission('reports.view')) then
    raise exception 'Permission refusée.' using errcode = '42501';
  end if;
  return query
  with sold as (
    select si.variant_id, sum(si.quantity)::bigint as qty, sum(si.line_total)::bigint as amt,
           sum(si.unit_cost * si.quantity)::bigint as cost
      from public.sale_items si join public.sales s on s.id = si.sale_id
     where s.status = 'completed' and s.created_at >= p_from and s.created_at < p_to
     group by si.variant_id
  ), ret as (
    select si.variant_id, sum(ri.quantity)::bigint as qty, sum(ri.refund_value)::bigint as amt,
           sum(ri.unit_cost * ri.quantity)::bigint as cost
      from public.return_items ri
      join public.returns r on r.id = ri.return_id
      join public.sale_items si on si.id = ri.sale_item_id
     where r.created_at >= p_from and r.created_at < p_to
     group by si.variant_id
  ), merged as (
    select coalesce(sold.variant_id, ret.variant_id) as vid,
           coalesce(sold.qty, 0) as qty, coalesce(ret.qty, 0) as rqty,
           coalesce(sold.amt, 0) - coalesce(ret.amt, 0) as net,
           coalesce(sold.cost, 0) - coalesce(ret.cost, 0) as cost
      from sold full join ret on ret.variant_id = sold.variant_id
  )
  select m.vid, p.name, v.label, c.name, m.qty, m.rqty, m.net, m.cost, m.net - m.cost,
         case when m.net > 0 then round((m.net - m.cost)::numeric * 100 / m.net, 1) else null end
    from merged m
    join public.product_variants v on v.id = m.vid
    join public.products p on p.id = v.product_id
    left join public.categories c on c.id = p.category_id
   order by m.net desc;
end $$;

create or replace function public.report_sales_by_category(p_from timestamptz, p_to timestamptz)
returns table (category_name text, quantity bigint, net_sales bigint, cogs bigint, margin bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_permission('reports.view');
  return query
  select coalesce(r.category_name, 'Sans catégorie'), sum(r.quantity - r.returned_quantity)::bigint,
         sum(r.net_sales)::bigint, sum(r.cogs)::bigint, sum(r.margin)::bigint
    from public.report_sales_by_product(p_from, p_to) r
   group by 1 order by 3 desc;
end $$;

create or replace function public.report_sales_by_employee(p_from timestamptz, p_to timestamptz)
returns table (cashier_id uuid, full_name text, sales_count bigint, gross_sales bigint, discounts bigint, average_basket bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_permission('reports.view');
  return query
  select s.cashier_id, pr.full_name, count(*)::bigint, sum(s.total)::bigint, sum(s.discount_amount)::bigint,
         round(avg(s.total))::bigint
    from public.sales s join public.profiles pr on pr.id = s.cashier_id
   where s.status = 'completed' and s.created_at >= p_from and s.created_at < p_to
   group by 1, 2 order by 4 desc;
end $$;

-- Valorisation au coût d'achat enregistré.
create or replace function public.report_stock_valuation()
returns table (category_name text, variants bigint, units bigint, cost_value bigint, retail_value bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.has_permission('reports.view') or public.has_permission('stock.manage')) then
    raise exception 'Permission refusée.' using errcode = '42501';
  end if;
  return query
  select coalesce(s.category_name, 'Sans catégorie'), count(*)::bigint,
         sum(greatest(s.stock_qty, 0))::bigint,
         sum(greatest(s.stock_qty, 0) * s.purchase_price)::bigint,
         sum(greatest(s.stock_qty, 0) * s.sale_price)::bigint
    from public.v_variant_stock s
   where s.product_status = 'active'
   group by 1 order by 4 desc;
end $$;

-- Faible rotation : articles en stock vendus en quantité ≤ p_max_sold depuis p_days jours.
create or replace function public.report_slow_movers(p_days integer default 60, p_max_sold integer default 0)
returns table (variant_id uuid, product_name text, variant_label text, stock_qty integer, stock_value bigint,
               sold_quantity bigint, last_sale_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.has_permission('reports.view') or public.has_permission('stock.manage')) then
    raise exception 'Permission refusée.' using errcode = '42501';
  end if;
  return query
  select s.variant_id, s.product_name, s.variant_label, s.stock_qty, s.stock_value,
         coalesce(x.qty, 0)::bigint, last.last_at
    from public.v_variant_stock s
    left join lateral (
      select sum(si.quantity) as qty from public.sale_items si join public.sales sa on sa.id = si.sale_id
       where si.variant_id = s.variant_id and sa.status = 'completed'
         and sa.created_at >= now() - make_interval(days => p_days)
    ) x on true
    left join lateral (
      select max(sa.created_at) as last_at from public.sale_items si join public.sales sa on sa.id = si.sale_id
       where si.variant_id = s.variant_id and sa.status = 'completed'
    ) last on true
   where s.product_status = 'active' and s.stock_qty > 0 and coalesce(x.qty, 0) <= p_max_sold
   order by s.stock_value desc;
end $$;

create or replace function public.report_expenses_by_category(p_from date, p_to date)
returns table (category public.expense_category, count bigint, total bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.has_permission('reports.view') or public.has_permission('expenses.manage')) then
    raise exception 'Permission refusée.' using errcode = '42501';
  end if;
  return query
  select e.category, count(*)::bigint, sum(e.amount)::bigint
    from public.expenses e
   where e.voided_at is null and e.expense_date >= p_from and e.expense_date <= p_to
   group by 1 order by 3 desc;
end $$;

create or replace function public.report_customer_receivables()
returns table (customer_id uuid, customer_name text, phone text, open_sales bigint, balance_due bigint, oldest_sale_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.has_permission('reports.view') or public.has_permission('customers.view')) then
    raise exception 'Permission refusée.' using errcode = '42501';
  end if;
  return query
  select c.id, trim(c.first_name || ' ' || coalesce(c.last_name, '')), c.phone,
         count(*)::bigint, sum(s.balance_due)::bigint, min(s.created_at)
    from public.sales s join public.customers c on c.id = s.customer_id
   where s.status = 'completed' and s.balance_due > 0
   group by c.id order by 5 desc;
end $$;

create or replace function public.report_supplier_balances()
returns table (supplier_id uuid, supplier_name text, ordered bigint, received bigint, paid bigint, balance bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.has_permission('reports.view') or public.has_permission('suppliers.manage')) then
    raise exception 'Permission refusée.' using errcode = '42501';
  end if;
  return query
  select sp.id, sp.name,
         coalesce((select sum(p.ordered_total) from public.purchases p where p.supplier_id = sp.id and p.status <> 'cancelled'), 0)::bigint,
         coalesce((select sum(p.received_total) from public.purchases p where p.supplier_id = sp.id and p.status <> 'cancelled'), 0)::bigint,
         coalesce((select sum(pay.amount) from public.supplier_payments pay where pay.supplier_id = sp.id), 0)::bigint,
         (coalesce((select sum(p.received_total) from public.purchases p where p.supplier_id = sp.id and p.status <> 'cancelled'), 0)
          - coalesce((select sum(pay.amount) from public.supplier_payments pay where pay.supplier_id = sp.id), 0))::bigint
    from public.suppliers sp
   order by 6 desc, 2;
end $$;

create or replace function public.report_top_products(p_from timestamptz, p_to timestamptz, p_limit integer default 5)
returns table (product_name text, variant_label text, quantity bigint, net_sales bigint)
language sql stable security definer set search_path = public as $$
  select r.product_name, r.variant_label, r.quantity - r.returned_quantity, r.net_sales
    from public.report_sales_by_product(p_from, p_to) r
   order by r.quantity - r.returned_quantity desc, r.net_sales desc
   limit p_limit
$$;
