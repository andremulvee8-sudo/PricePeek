-- Store privacy-safe operational summaries for scheduled price checks.
-- This table contains counts and timestamps only, never customer or product data.

create table if not exists public.price_check_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running',
  checked_count integer not null default 0,
  updated_count integer not null default 0,
  notification_count integer not null default 0,
  failure_count integer not null default 0,
  constraint price_check_runs_status_valid
    check (status in ('running', 'succeeded', 'partial', 'failed')),
  constraint price_check_runs_counts_nonnegative
    check (
      checked_count >= 0
      and updated_count >= 0
      and notification_count >= 0
      and failure_count >= 0
    ),
  constraint price_check_runs_completion_consistent
    check (
      (status = 'running' and completed_at is null)
      or (status <> 'running' and completed_at is not null)
    )
);

create index if not exists price_check_runs_started_at_idx
  on public.price_check_runs (started_at desc);

alter table public.price_check_runs enable row level security;
revoke all on table public.price_check_runs from public, anon, authenticated;
grant select, insert, update, delete on table public.price_check_runs to service_role;
