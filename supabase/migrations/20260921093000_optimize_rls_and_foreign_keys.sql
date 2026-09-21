-- Cache auth.uid() once per statement in the policies reported by the advisor.
alter policy "AuditLogs: Lecture propre atelier" on public.audit_logs
  using (atelier_id in (
    select profiles.atelier_id
    from public.profiles
    where profiles.id = (select auth.uid())
  ));

alter policy "Subscriptions_select_atelier" on public.subscriptions
  using (atelier_id in (
    select profiles.atelier_id
    from public.profiles
    where profiles.id = (select auth.uid())
  ));

alter policy "SubPayments_select_atelier" on public.subscription_payments
  using (atelier_id in (
    select profiles.atelier_id
    from public.profiles
    where profiles.id = (select auth.uid())
  ));

-- Cover foreign keys used by joins and referential actions.
create index if not exists audit_logs_actor_user_id_idx on public.audit_logs (actor_user_id);
create index if not exists audit_logs_atelier_id_idx on public.audit_logs (atelier_id);
create index if not exists client_measurements_atelier_id_idx on public.client_measurements (atelier_id);
create index if not exists measurement_records_atelier_id_idx on public.measurement_records (atelier_id);
create index if not exists measurement_records_client_id_idx on public.measurement_records (client_id);
create index if not exists measurement_values_profile_workshop_idx on public.measurement_values (profile_id, workshop_id);
create index if not exists order_items_atelier_id_idx on public.order_items (atelier_id);
create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists orders_customer_id_idx on public.orders (customer_id);
create index if not exists payments_order_id_idx on public.payments (order_id);
create index if not exists profiles_atelier_id_idx on public.profiles (atelier_id);
create index if not exists projects_atelier_id_idx on public.projects (atelier_id);
create index if not exists projects_client_id_idx on public.projects (client_id);
create index if not exists subscription_payments_plan_id_idx on public.subscription_payments (plan_id);
create index if not exists subscription_payments_subscription_id_idx on public.subscription_payments (subscription_id);
create index if not exists subscriptions_plan_id_idx on public.subscriptions (plan_id);
create index if not exists team_members_atelier_id_idx on public.team_members (atelier_id);
