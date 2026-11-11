-- Private, anonymous beta-feedback storage with automatic expiry metadata.
-- This migration does not alter accounts, tracked products, price history,
-- subscriptions, alerts, or existing customer records.

create table if not exists public.beta_feedback (
  id bigint generated always as identity primary key,
  category text not null,
  area text not null,
  message text not null,
  created_at timestamp with time zone not null default now(),
  expires_at timestamp with time zone not null default (now() + interval '90 days'),
  constraint beta_feedback_category_valid
    check (category in ('bug', 'idea', 'confusing', 'other')),
  constraint beta_feedback_area_valid
    check (area in (
      'tracking',
      'prices',
      'notifications',
      'installation',
      'account',
      'billing',
      'other'
    )),
  constraint beta_feedback_message_length_valid
    check (char_length(message) between 20 and 1200),
  constraint beta_feedback_expiry_valid
    check (
      expires_at > created_at
      and expires_at <= created_at + interval '91 days'
    )
);

create index if not exists beta_feedback_expires_at_idx
  on public.beta_feedback (expires_at);

alter table public.beta_feedback enable row level security;

revoke all on table public.beta_feedback from anon, authenticated;

do $$
begin
  if to_regclass('public.beta_feedback_id_seq') is not null then
    execute 'revoke all on sequence public.beta_feedback_id_seq from anon, authenticated';
  end if;
end
$$;

comment on table public.beta_feedback is
  'Anonymous beta feedback without account, email, device, URL, or request-address fields. Rows expire after approximately 90 days.';
