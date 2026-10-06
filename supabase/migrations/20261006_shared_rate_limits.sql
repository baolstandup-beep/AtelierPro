-- Rate limiting partagé entre toutes les instances serverless (Vercel).
-- Le compteur en mémoire de lib/rate-limiter.ts n'est pas partagé entre
-- instances : cette table + RPC sert de source de vérité unique.

create table if not exists public.rate_limits (
  key           text primary key,
  count         integer     not null default 0,
  window_start  timestamptz not null default now(),
  blocked_until timestamptz
);

-- Aucune policy : seule la service_role (qui contourne RLS) y accède.
alter table public.rate_limits enable row level security;

create index if not exists rate_limits_window_start_idx on public.rate_limits (window_start);

create or replace function public.check_rate_limit(
  p_key text,
  p_max integer,
  p_window_seconds integer,
  p_block_seconds integer
)
returns table (allowed boolean, attempts integer, retry_after_seconds integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_row public.rate_limits%rowtype;
begin
  insert into public.rate_limits (key, count, window_start)
  values (p_key, 0, v_now)
  on conflict (key) do nothing;

  select * into v_row from public.rate_limits where key = p_key for update;

  -- Bloqué
  if v_row.blocked_until is not null and v_now < v_row.blocked_until then
    return query select false, v_row.count,
      ceil(extract(epoch from (v_row.blocked_until - v_now)))::integer, v_row.blocked_until;
    return;
  end if;

  -- Fenêtre expirée (ou blocage terminé) : on repart de zéro
  if v_now - v_row.window_start > make_interval(secs => p_window_seconds)
     or v_row.blocked_until is not null then
    v_row.count := 0;
    v_row.window_start := v_now;
    v_row.blocked_until := null;
  end if;

  v_row.count := v_row.count + 1;

  if v_row.count > p_max then
    v_row.blocked_until := v_now + make_interval(secs => p_block_seconds);
  end if;

  update public.rate_limits
     set count = v_row.count,
         window_start = v_row.window_start,
         blocked_until = v_row.blocked_until
   where key = p_key;

  -- Nettoyage opportuniste des entrées périmées
  if random() < 0.01 then
    delete from public.rate_limits
     where window_start < v_now - interval '1 day'
       and (blocked_until is null or blocked_until < v_now);
  end if;

  if v_row.blocked_until is not null then
    return query select false, v_row.count, p_block_seconds, v_row.blocked_until;
  else
    return query select true, v_row.count, 0,
      v_row.window_start + make_interval(secs => p_window_seconds);
  end if;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer, integer) to service_role;
