-- Provider-neutral subscription state for a future paid plan.
-- This migration does not create charges, contact a billing provider, or
-- modify existing tracked products, price history, accounts, or alerts.

create table if not exists public.user_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free',
  status text not null default 'inactive',
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint user_subscriptions_plan_valid
    check (plan in ('free', 'plus')),
  constraint user_subscriptions_status_valid
    check (status in ('inactive', 'trialing', 'active', 'past_due', 'canceled', 'paused')),
  constraint user_subscriptions_provider_valid
    check (provider is null or char_length(provider) between 1 and 32),
  constraint user_subscriptions_provider_customer_valid
    check (provider_customer_id is null or char_length(provider_customer_id) between 1 and 255),
  constraint user_subscriptions_provider_subscription_valid
    check (provider_subscription_id is null or char_length(provider_subscription_id) between 1 and 255)
);

create unique index if not exists user_subscriptions_provider_customer_uidx
  on public.user_subscriptions (provider, provider_customer_id)
  where provider is not null and provider_customer_id is not null;

create unique index if not exists user_subscriptions_provider_subscription_uidx
  on public.user_subscriptions (provider, provider_subscription_id)
  where provider is not null and provider_subscription_id is not null;

create index if not exists user_subscriptions_status_idx
  on public.user_subscriptions (status, current_period_end);

alter table public.user_subscriptions enable row level security;

revoke all on table public.user_subscriptions from anon, authenticated;
grant select on table public.user_subscriptions to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_subscriptions'
      and policyname = 'user_subscriptions_select_own'
  ) then
    create policy user_subscriptions_select_own
      on public.user_subscriptions for select to authenticated
      using ((select auth.uid()) = user_id);
  end if;
end $$;

comment on table public.user_subscriptions is
  'Server-managed subscription lifecycle state. Authenticated users may read only their own row.';
