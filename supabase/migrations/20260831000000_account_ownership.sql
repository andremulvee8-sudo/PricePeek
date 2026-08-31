-- Add optional Supabase Auth ownership while preserving anonymous device data.
-- Existing rows remain anonymous until claimed after a verified sign-in.

alter table public.tracked_products
  add column if not exists owner_user_id uuid references auth.users(id) on delete cascade;

alter table public.push_subscriptions
  add column if not exists owner_user_id uuid references auth.users(id) on delete cascade;

create index if not exists tracked_products_owner_created_idx
  on public.tracked_products (owner_user_id, created_at desc)
  where owner_user_id is not null;

create unique index if not exists tracked_products_user_marketplace_asin_uidx
  on public.tracked_products (owner_user_id, marketplace, asin)
  where owner_user_id is not null
    and marketplace is not null
    and asin is not null;

create index if not exists push_subscriptions_owner_idx
  on public.push_subscriptions (owner_user_id)
  where owner_user_id is not null;

alter table public.tracked_products enable row level security;
alter table public.price_history enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.api_rate_limits enable row level security;

revoke all on table public.tracked_products from anon, authenticated;
revoke all on table public.price_history from anon, authenticated;
revoke all on table public.push_subscriptions from anon, authenticated;
revoke all on table public.api_rate_limits from anon, authenticated;

grant select, insert, update, delete on table public.tracked_products to authenticated;
grant select on table public.price_history to authenticated;
grant select, insert, update, delete on table public.push_subscriptions to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tracked_products'
      and policyname = 'tracked_products_select_own'
  ) then
    create policy tracked_products_select_own
      on public.tracked_products for select to authenticated
      using ((select auth.uid()) = owner_user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tracked_products'
      and policyname = 'tracked_products_insert_own'
  ) then
    create policy tracked_products_insert_own
      on public.tracked_products for insert to authenticated
      with check ((select auth.uid()) = owner_user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tracked_products'
      and policyname = 'tracked_products_update_own'
  ) then
    create policy tracked_products_update_own
      on public.tracked_products for update to authenticated
      using ((select auth.uid()) = owner_user_id)
      with check ((select auth.uid()) = owner_user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tracked_products'
      and policyname = 'tracked_products_delete_own'
  ) then
    create policy tracked_products_delete_own
      on public.tracked_products for delete to authenticated
      using ((select auth.uid()) = owner_user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'price_history'
      and policyname = 'price_history_select_own'
  ) then
    create policy price_history_select_own
      on public.price_history for select to authenticated
      using (
        exists (
          select 1
          from public.tracked_products
          where tracked_products.id = price_history.tracked_product_id
            and tracked_products.owner_user_id = (select auth.uid())
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'push_subscriptions'
      and policyname = 'push_subscriptions_select_own'
  ) then
    create policy push_subscriptions_select_own
      on public.push_subscriptions for select to authenticated
      using ((select auth.uid()) = owner_user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'push_subscriptions'
      and policyname = 'push_subscriptions_insert_own'
  ) then
    create policy push_subscriptions_insert_own
      on public.push_subscriptions for insert to authenticated
      with check ((select auth.uid()) = owner_user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'push_subscriptions'
      and policyname = 'push_subscriptions_update_own'
  ) then
    create policy push_subscriptions_update_own
      on public.push_subscriptions for update to authenticated
      using ((select auth.uid()) = owner_user_id)
      with check ((select auth.uid()) = owner_user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'push_subscriptions'
      and policyname = 'push_subscriptions_delete_own'
  ) then
    create policy push_subscriptions_delete_own
      on public.push_subscriptions for delete to authenticated
      using ((select auth.uid()) = owner_user_id);
  end if;
end $$;
