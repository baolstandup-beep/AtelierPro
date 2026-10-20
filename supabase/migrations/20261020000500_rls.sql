-- =============================================================================
-- Sécurité : RLS sur toutes les tables + privilèges minimaux.
-- Supabase accorde par défaut TOUS les droits aux rôles anon/authenticated :
-- on les retire puis on n'accorde que le nécessaire.
-- Les écritures commerciales passent exclusivement par les fonctions
-- SECURITY DEFINER qui vérifient elles-mêmes les permissions.
-- =============================================================================

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'shop_settings','profiles','permission_catalog','categories','suppliers','products','product_variants',
    'customers','cash_sessions','sales','sale_items','payments','credit_settlements','returns','return_items',
    'refunds','purchases','purchase_items','purchase_receipts','purchase_receipt_items','supplier_payments',
    'expenses','cash_movements','stock_movements','inventories','inventory_lines','audit_logs','login_attempts'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Lecture (SELECT)
-- ---------------------------------------------------------------------------
grant select on public.shop_settings, public.permission_catalog, public.profiles, public.categories,
  public.suppliers, public.products, public.product_variants, public.customers, public.cash_sessions,
  public.sales, public.sale_items, public.payments, public.credit_settlements, public.returns,
  public.return_items, public.refunds, public.purchases, public.purchase_items, public.purchase_receipts,
  public.purchase_receipt_items, public.supplier_payments, public.expenses, public.cash_movements,
  public.stock_movements, public.inventories, public.inventory_lines, public.audit_logs
  to authenticated;
grant select on public.v_variant_stock to authenticated;

create policy settings_read on public.shop_settings for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_active));
create policy settings_update on public.shop_settings for update to authenticated
  using (public.has_permission('settings.manage')) with check (public.has_permission('settings.manage'));
grant update (shop_name, address, phone, email, legal_info, receipt_footer, allow_negative_stock,
              max_discount_percent, default_min_stock, updated_at, updated_by) on public.shop_settings to authenticated;

create policy catalog_read on public.permission_catalog for select to authenticated using (true);

-- Profils : chacun voit le sien ; le gestionnaire voit et modifie tout.
-- (Le trigger profiles_guard empêche toute auto-attribution de droits.)
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_permission('users.manage') or public.has_permission('reports.view')
         or public.has_permission('sales.view_all') or public.has_permission('audit.view'));
create policy profiles_update on public.profiles for update to authenticated
  using (public.has_permission('users.manage')) with check (public.has_permission('users.manage'));
grant update (full_name, phone, role, permissions, is_active) on public.profiles to authenticated;

-- Catalogue : lisible par tout utilisateur actif qui vend ou consulte.
create policy categories_read on public.categories for select to authenticated
  using (public.has_permission('products.view') or public.has_permission('sales.create'));
create policy categories_write on public.categories for all to authenticated
  using (public.has_permission('products.manage')) with check (public.has_permission('products.manage'));
grant insert, update, delete on public.categories to authenticated;

create policy products_read on public.products for select to authenticated
  using (public.has_permission('products.view') or public.has_permission('sales.create'));
create policy products_update on public.products for update to authenticated
  using (public.has_permission('products.manage')) with check (public.has_permission('products.manage'));
grant update (name, description, category_id, brand, supplier_id, photo_path, reference,
              purchase_price, sale_price, min_stock, status) on public.products to authenticated;

create policy variants_read on public.product_variants for select to authenticated
  using (public.has_permission('products.view') or public.has_permission('sales.create'));
create policy variants_update on public.product_variants for update to authenticated
  using (public.has_permission('products.manage')) with check (public.has_permission('products.manage'));
-- stock_qty volontairement absent : il ne change que par mouvement tracé.
grant update (label, attributes, sku, barcode, barcode_is_internal, purchase_price, sale_price,
              min_stock, is_active) on public.product_variants to authenticated;

create policy suppliers_read on public.suppliers for select to authenticated
  using (public.has_permission('suppliers.manage') or public.has_permission('purchases.manage')
         or public.has_permission('products.manage') or public.has_permission('reports.view'));
create policy suppliers_write on public.suppliers for all to authenticated
  using (public.has_permission('suppliers.manage')) with check (public.has_permission('suppliers.manage'));
grant insert, update on public.suppliers to authenticated;

-- Clients : données personnelles limitées aux utilisateurs autorisés.
create policy customers_read on public.customers for select to authenticated
  using (public.has_permission('customers.view') or public.has_permission('customers.manage'));
create policy customers_insert on public.customers for insert to authenticated
  with check (public.has_permission('customers.manage'));
create policy customers_update on public.customers for update to authenticated
  using (public.has_permission('customers.manage')) with check (public.has_permission('customers.manage'));
grant insert (first_name, last_name, phone, email, notes) on public.customers to authenticated;
grant update (first_name, last_name, phone, email, notes) on public.customers to authenticated;

-- Caisse
create policy cash_sessions_read on public.cash_sessions for select to authenticated
  using (opened_by = auth.uid() or public.has_permission('cash.operate') or public.has_permission('cash.close')
         or public.has_permission('reports.view') or public.has_permission('sales.create'));
create policy cash_movements_read on public.cash_movements for select to authenticated
  using (public.has_permission('cash.close') or public.has_permission('reports.view')
         or exists (select 1 from public.cash_sessions cs where cs.id = cash_session_id and cs.opened_by = auth.uid()));

-- Ventes : un caissier voit ses ventes ; sales.view_all / reports.view voient tout.
create policy sales_read on public.sales for select to authenticated
  using (cashier_id = auth.uid() or public.has_permission('sales.view_all') or public.has_permission('reports.view')
         or public.has_permission('returns.manage')
         or (customer_id is not null and public.has_permission('customers.view')));
create policy sale_items_read on public.sale_items for select to authenticated
  using (exists (select 1 from public.sales s where s.id = sale_id));
create policy payments_read on public.payments for select to authenticated
  using ((sale_id is not null and exists (select 1 from public.sales s where s.id = sale_id))
         or public.has_permission('reports.view'));
create policy credit_settlements_read on public.credit_settlements for select to authenticated
  using (created_by = auth.uid() or public.has_permission('customers.view') or public.has_permission('reports.view'));
create policy returns_read on public.returns for select to authenticated
  using (exists (select 1 from public.sales s where s.id = sale_id));
create policy return_items_read on public.return_items for select to authenticated
  using (exists (select 1 from public.returns r where r.id = return_id));
create policy refunds_read on public.refunds for select to authenticated
  using (exists (select 1 from public.sales s where s.id = sale_id));

-- Achats
create policy purchases_read on public.purchases for select to authenticated
  using (public.has_permission('purchases.manage') or public.has_permission('suppliers.manage') or public.has_permission('reports.view'));
create policy purchase_items_read on public.purchase_items for select to authenticated
  using (exists (select 1 from public.purchases p where p.id = purchase_id));
create policy purchase_receipts_read on public.purchase_receipts for select to authenticated
  using (exists (select 1 from public.purchases p where p.id = purchase_id));
create policy purchase_receipt_items_read on public.purchase_receipt_items for select to authenticated
  using (exists (select 1 from public.purchase_receipts r where r.id = receipt_id));
create policy supplier_payments_read on public.supplier_payments for select to authenticated
  using (public.has_permission('suppliers.manage') or public.has_permission('purchases.manage') or public.has_permission('reports.view'));

-- Dépenses
create policy expenses_read on public.expenses for select to authenticated
  using (public.has_permission('expenses.manage') or public.has_permission('reports.view'));

-- Stock
create policy stock_movements_read on public.stock_movements for select to authenticated
  using (public.has_permission('stock.manage') or public.has_permission('stock.adjust')
         or public.has_permission('products.manage') or public.has_permission('reports.view'));
create policy inventories_read on public.inventories for select to authenticated
  using (public.has_permission('stock.manage'));
create policy inventory_lines_read on public.inventory_lines for select to authenticated
  using (public.has_permission('stock.manage'));

-- Journal
create policy audit_read on public.audit_logs for select to authenticated
  using (public.has_permission('audit.view'));

-- login_attempts : aucune politique → inaccessible via l'API (service_role uniquement).

-- ---------------------------------------------------------------------------
-- Fonctions exposées aux utilisateurs connectés
-- (chacune vérifie elle-même la permission requise)
-- ---------------------------------------------------------------------------
grant execute on function
  public.has_permission(text),
  public.my_permissions(),
  public.pos_search(text, integer),
  public.generate_internal_barcode(),
  public.cash_session_balance(uuid),
  public.cash_session_totals(uuid),
  public.open_cash_session(text, bigint),
  public.add_cash_movement(uuid, public.cash_movement_type, bigint, text),
  public.close_cash_session(uuid, bigint, text, text),
  public.correct_cash_session(uuid, bigint, text),
  public.create_sale(uuid, uuid, jsonb, jsonb, bigint, uuid, bigint, text),
  public.cancel_sale(uuid, text, uuid),
  public.process_return(uuid, uuid, jsonb, text, public.payment_method, uuid),
  public.record_credit_payment(uuid, uuid, bigint, public.payment_method, uuid, text),
  public.record_expense(public.expense_category, bigint, date, public.payment_method, text, uuid),
  public.void_expense(uuid, text),
  public.adjust_stock(uuid, integer, public.stock_movement_type, text),
  public.start_inventory(text, uuid),
  public.record_inventory_count(uuid, integer),
  public.validate_inventory(uuid),
  public.cancel_inventory(uuid),
  public.create_purchase(uuid, jsonb, text, text, date),
  public.cancel_purchase(uuid, text),
  public.receive_purchase(uuid, uuid, jsonb, boolean, text),
  public.record_supplier_payment(uuid, uuid, bigint, public.payment_method, uuid, text, uuid, date),
  public.create_product(jsonb, jsonb),
  public.add_variant(uuid, jsonb),
  public.report_summary(timestamptz, timestamptz),
  public.report_payments_by_method(timestamptz, timestamptz),
  public.report_sales_by_day(timestamptz, timestamptz),
  public.report_sales_by_month(timestamptz, timestamptz),
  public.report_sales_by_product(timestamptz, timestamptz),
  public.report_sales_by_category(timestamptz, timestamptz),
  public.report_sales_by_employee(timestamptz, timestamptz),
  public.report_stock_valuation(),
  public.report_slow_movers(integer, integer),
  public.report_expenses_by_category(date, date),
  public.report_customer_receivables(),
  public.report_supplier_balances(),
  public.report_top_products(timestamptz, timestamptz, integer)
to authenticated;

-- Utilisées dans les politiques RLS et les vues.
grant execute on function public.role_default_permissions(public.app_role) to authenticated;

-- Fonctions internes : jamais appelables directement via l'API
-- (apply_stock_movement, log_audit, assert_open_session, require_permission,
--  format_doc_number, handle_new_user, guard_*). Elles restent exécutables
--  par leur propriétaire, donc depuis les fonctions SECURITY DEFINER.

-- Limitation des connexions (appelée par le serveur avec la clé service_role).
create or replace function public.register_login_attempt(p_key text, p_success boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_row public.login_attempts;
  v_max integer := 5;
  v_window interval := interval '15 minutes';
begin
  select * into v_row from public.login_attempts where key = p_key for update;
  if p_success then
    delete from public.login_attempts where key = p_key;
    return jsonb_build_object('allowed', true);
  end if;
  if not found or v_row.window_start < now() - v_window then
    insert into public.login_attempts (key, attempts, window_start, locked_until)
    values (p_key, 1, now(), null)
    on conflict (key) do update set attempts = 1, window_start = now(), locked_until = null;
    return jsonb_build_object('allowed', true, 'attempts', 1);
  end if;
  update public.login_attempts
     set attempts = attempts + 1,
         locked_until = case when attempts + 1 >= v_max then now() + v_window else locked_until end
   where key = p_key
  returning * into v_row;
  return jsonb_build_object('allowed', v_row.locked_until is null or v_row.locked_until < now(), 'attempts', v_row.attempts);
end $$;

create or replace function public.check_login_allowed(p_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.login_attempts where key = p_key and locked_until > now())
$$;

revoke execute on function public.register_login_attempt(text, boolean) from public, anon, authenticated;
revoke execute on function public.check_login_allowed(text) from public, anon, authenticated;
grant execute on function public.register_login_attempt(text, boolean) to service_role;
grant execute on function public.check_login_allowed(text) to service_role;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
