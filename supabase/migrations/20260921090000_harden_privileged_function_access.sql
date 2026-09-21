-- Restrict privileged functions to the roles that actually need them.
-- Trigger functions must never be callable directly from browser clients.

revoke all on function public.activate_discovery_subscription(uuid)
  from public, anon, authenticated;
grant execute on function public.activate_discovery_subscription(uuid)
  to service_role;

revoke all on function public.handle_new_user()
  from public, anon, authenticated;
grant execute on function public.handle_new_user()
  to service_role;

revoke all on function public.trg_check_client_quota()
  from public, anon, authenticated;
grant execute on function public.trg_check_client_quota()
  to service_role;

-- Authenticated users may only ask whether their own auth.uid() is an admin.
revoke all on function public.is_platform_admin()
  from public, anon;
grant execute on function public.is_platform_admin()
  to authenticated, service_role;
