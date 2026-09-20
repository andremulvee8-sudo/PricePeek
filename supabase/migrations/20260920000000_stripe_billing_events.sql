-- Idempotency ledger for verified Stripe webhook events.
-- This migration is additive and does not charge customers, alter existing
-- subscriptions, or modify tracked products and price history.

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamp with time zone not null default now(),
  constraint stripe_webhook_events_id_valid
    check (char_length(event_id) between 1 and 255),
  constraint stripe_webhook_events_type_valid
    check (char_length(event_type) between 1 and 255)
);

create index if not exists stripe_webhook_events_processed_at_idx
  on public.stripe_webhook_events (processed_at);

alter table public.stripe_webhook_events enable row level security;

revoke all on table public.stripe_webhook_events from anon, authenticated;

comment on table public.stripe_webhook_events is
  'Server-only ledger of successfully processed Stripe webhook event IDs.';
