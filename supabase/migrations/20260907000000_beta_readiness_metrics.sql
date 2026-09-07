-- Add privacy-safe aggregate counters to scheduled-check health records.
-- These columns store counts only and do not contain customer, product,
-- subscription, device, URL, price, or provider-response data.

alter table public.price_check_runs
  add column if not exists lookup_failure_count integer not null default 0,
  add column if not exists push_attempt_count integer not null default 0,
  add column if not exists push_delivery_count integer not null default 0,
  add column if not exists push_failure_count integer not null default 0,
  add column if not exists expired_subscription_count integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'price_check_runs_beta_counts_nonnegative'
      and conrelid = 'public.price_check_runs'::regclass
  ) then
    alter table public.price_check_runs
      add constraint price_check_runs_beta_counts_nonnegative
        check (
          lookup_failure_count >= 0
          and push_attempt_count >= 0
          and push_delivery_count >= 0
          and push_failure_count >= 0
          and expired_subscription_count >= 0
          and push_delivery_count <= push_attempt_count
          and push_failure_count <= push_attempt_count
          and expired_subscription_count <= push_attempt_count
        );
  end if;
end
$$;
