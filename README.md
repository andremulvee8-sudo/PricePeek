# PricePeek

PricePeek is a Next.js price-tracking application for Amazon products. It uses
Rainforest API for product data, Supabase for persisted products, price history,
push subscriptions, and rate limits, Web Push for alerts, and a Vercel cron job
for scheduled checks.

## Requirements

- Node.js 24 (the test command uses Node's built-in TypeScript support)
- npm
- A Supabase project
- A Rainforest API key
- A Web Push VAPID key pair
- A random cron secret

## Local setup

1. Install dependencies:

   ```powershell
   npm.cmd ci
   ```

2. Copy `.env.example` to `.env.local` and provide each value locally. Never
   commit `.env.local` or share the Supabase secret key, VAPID private key,
   Rainforest key, or cron secret.

3. Apply the database migration to a local or staging Supabase database as
   described below.

4. Start the app:

   ```powershell
   npm.cmd run dev
   ```

5. Open `http://localhost:3000`.

Browser push requires a secure context. `localhost` is accepted by browsers for
most development, while device testing should use HTTPS.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `RAINFOREST_API_KEY` | Server-side Amazon product lookup |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SECRET_KEY` | Server-only Supabase administrative key |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Browser-safe Web Push public key |
| `VAPID_PRIVATE_KEY` | Server-only Web Push private key |
| `VAPID_SUBJECT` | VAPID contact, normally a `mailto:` URL |
| `CRON_SECRET` | Bearer token protecting the cron route |

## Database migration

The migration is stored in
`supabase/migrations/20260829000000_price_check_scheduling.sql`. It creates the
baseline tables when absent and adds the scheduling fields, constraints, and
indexes needed by the current app.

Before applying it to an existing database, take a backup and test it against a
staging copy. Existing rows that violate the new positive-price or nonnegative
counter constraints must be corrected first. Existing duplicate `device_id`
values in `push_subscriptions` or duplicate `identifier` values in
`api_rate_limits` must also be resolved before the unique indexes can be added.

With the Supabase CLI linked to the intended non-production project:

```powershell
supabase db push --dry-run
supabase db push
```

For local Supabase development, use `supabase start` followed by
`supabase db reset`. Do not run `db push` against production until the staging
migration and application checks pass.

The migration intentionally separates:

- `is_active`: whether a product remains in the checking queue.
- `notification_sent`: whether an alert has already been delivered during the
  current below-target episode.
- `next_check_at`: when the product is eligible for another check.
- `consecutive_failures` and `last_check_error`: lookup failure/backoff state.

## Quality checks

Run the complete local verification set:

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

Tests focus on scheduled-product eligibility, continued checking after an alert,
fair ordering, failure backoff, and duplicate-notification suppression.

## Scheduled price checks

Vercel calls `GET /api/cron/check-prices` daily according to `vercel.json` and
sends `Authorization: Bearer <CRON_SECRET>`. The route selects active products
whose `next_check_at` is due, oldest first. Successful checks are scheduled for
the following day. Failed lookups record their error and use exponential backoff
so one failing product cannot repeatedly occupy the front of the queue.

A product remains active after a notification. The notification flag suppresses
duplicates while its price stays at or below the target and is re-armed after the
price rises above the target.

## Deployment

1. Apply the reviewed migration to staging.
2. Configure every environment variable in the staging deployment.
3. Run the quality checks above.
4. Deploy to staging and verify product lookup, tracking, deletion, price
   history, cron authorization, and push subscription behavior.
5. Invoke the cron route with a staging secret and inspect both its JSON result
   and scheduling fields in Supabase.
6. Only after staging succeeds, apply the migration to production, configure
   production secrets, and deploy.

Never expose `SUPABASE_SECRET_KEY`, `VAPID_PRIVATE_KEY`, `RAINFOREST_API_KEY`, or
`CRON_SECRET` through client components or `NEXT_PUBLIC_` variables.
