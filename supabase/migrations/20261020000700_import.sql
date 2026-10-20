-- Import CSV de produits : tout ou rien (une seule transaction).
-- p_products : [{ name, category, brand, reference, description, purchase_price, sale_price, variants: [...] }]
create or replace function public.import_products(p_products jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_entry jsonb;
  v_category_id uuid;
  v_count integer := 0;
  v_cat text;
begin
  perform public.require_permission('products.manage');
  if p_products is null or jsonb_typeof(p_products) <> 'array' or jsonb_array_length(p_products) = 0 then
    raise exception 'Aucun produit à importer.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_products) > 2000 then
    raise exception 'Import limité à 2 000 produits par fichier.' using errcode = '22023';
  end if;
  for v_entry in select * from jsonb_array_elements(p_products) loop
    v_category_id := null;
    v_cat := nullif(trim(v_entry ->> 'category'), '');
    if v_cat is not null then
      select id into v_category_id from public.categories where lower(name) = lower(v_cat);
      if v_category_id is null then
        insert into public.categories (name) values (v_cat) returning id into v_category_id;
      end if;
    end if;
    perform public.create_product(
      (v_entry - 'variants' - 'category') || jsonb_build_object('category_id', v_category_id),
      v_entry -> 'variants'
    );
    v_count := v_count + 1;
  end loop;
  perform public.log_audit('product.import', 'product', null, jsonb_build_object('count', v_count));
  return v_count;
end $$;

revoke execute on function public.import_products(jsonb) from public, anon;
grant execute on function public.import_products(jsonb) to authenticated;
