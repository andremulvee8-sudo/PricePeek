-- Prevent overlapping price-check runs with a short, self-expiring lease.

create table if not exists public.price_check_lock (
  id smallint primary key check (id = 1),
  locked_until timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.price_check_lock enable row level security;
revoke all on table public.price_check_lock from anon, authenticated;

create or replace function public.acquire_price_check_lock(
  lock_duration_seconds integer default 300
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  acquired boolean;
begin
  if lock_duration_seconds < 1 or lock_duration_seconds > 300 then
    raise exception 'Lock duration must be between 1 and 300 seconds';
  end if;

  insert into public.price_check_lock (id, locked_until, updated_at)
  values (1, now() + make_interval(secs => lock_duration_seconds), now())
  on conflict (id) do update
    set locked_until = excluded.locked_until,
        updated_at = excluded.updated_at
    where public.price_check_lock.locked_until <= now()
  returning true into acquired;

  return coalesce(acquired, false);
end;
$$;

revoke all on function public.acquire_price_check_lock(integer) from public;
revoke all on function public.acquire_price_check_lock(integer) from anon, authenticated;
grant execute on function public.acquire_price_check_lock(integer) to service_role;
