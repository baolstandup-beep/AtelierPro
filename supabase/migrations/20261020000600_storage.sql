-- Photos produits : lecture publique (visuels catalogue, non sensibles),
-- écriture réservée aux utilisateurs ayant products.manage.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-photos', 'product-photos', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "product photos read" on storage.objects for select
  using (bucket_id = 'product-photos');
create policy "product photos insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-photos' and public.has_permission('products.manage'));
create policy "product photos update" on storage.objects for update to authenticated
  using (bucket_id = 'product-photos' and public.has_permission('products.manage'));
create policy "product photos delete" on storage.objects for delete to authenticated
  using (bucket_id = 'product-photos' and public.has_permission('products.manage'));
