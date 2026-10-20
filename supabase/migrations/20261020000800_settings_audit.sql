-- Toute modification des réglages (dont l'autorisation exceptionnelle de stock
-- négatif et le plafond de remise) est inscrite au journal.
create or replace function public.audit_settings_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'settings.update', 'shop_settings', '1',
          jsonb_build_object('before', to_jsonb(old) - 'updated_at', 'after', to_jsonb(new) - 'updated_at'));
  return new;
end $$;

create trigger shop_settings_audit after update on public.shop_settings
  for each row execute function public.audit_settings_change();

revoke execute on function public.audit_settings_change() from public, anon, authenticated;
