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

For HTTPS development on another device, run:

```powershell
npm.cmd run dev -- --experimental-https
```

## Environment variables

| Variable | Purpose |
| --- | --- |
| `RAINFOREST_API_KEY` | Server-side Amazon product lookup |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SECRET_KEY` | Server-only Supabase administrative key |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser-safe copy of the Supabase project URL used for Auth |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe Supabase publishable key used for Auth |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Browser-safe Web Push public key |
| `VAPID_PRIVATE_KEY` | Server-only Web Push private key |
| `VAPID_SUBJECT` | VAPID contact, normally a `mailto:` URL |
| `CRON_SECRET` | Bearer token protecting the cron route |

## Database migration

The migration is stored in
`supabase/migrations/20260829000000_price_check_scheduling.sql`. It creates the
baseline tables when absent and adds the scheduling fields, constraints, and
indexes needed by the current app.

`supabase/migrations/20260829010000_product_tracking_correctness.sql` then adds
canonical Amazon marketplace and ISO currency fields and enforces uniqueness by
device, marketplace, and ASIN.

`supabase/migrations/20260831000000_account_ownership.sql` adds optional account
ownership to products and push subscriptions, account-level deduplication
indexes, and row-level security policies. Existing rows are preserved with a
null account owner and remain available to their original browser until that
browser signs in and claims them.

`supabase/migrations/20260903000000_cron_execution_lock.sql` adds a short,
self-expiring database lease for the scheduled checker. It creates no foreign
keys to application data and does not rewrite tracked products or price
history.

`supabase/migrations/20260903010000_cron_run_health.sql` adds an operational
run ledger for the public service-status view. It stores timestamps, states,
and aggregate counts only. It never stores product IDs, URLs, prices, account
identifiers, device identifiers, or push subscriptions.

Before applying it to an existing database, take a backup and test it against a
staging copy. Existing rows that violate the new positive-price or nonnegative
counter constraints must be corrected first. Existing duplicate `device_id`
values in `push_subscriptions` or duplicate `identifier` values in
`api_rate_limits` must also be resolved before the unique indexes can be added.
Before the second migration, resolve any duplicate tracked-product rows sharing
the same `device_id`, `marketplace`, and `asin`. Before the account migration,
confirm `auth.users` is available and review existing grants and policies on all
four public application tables.

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

Tests cover Amazon URL identity parsing, marketplace currencies, tracking
deduplication, historical-price deal wording, scheduled-product eligibility,
failure backoff, and duplicate-notification suppression.
They also cover account/device ownership selection and claim deduplication
decisions, sign-in error wording, and expired push-subscription detection.
Launch-readiness tests also cover account-deletion confirmation, privacy-safe
cron summaries, and health classification for successful, partial, stale, and
stalled runs.

Tracked products use `(device_id, marketplace, asin)` as their canonical unique
identity. Saving a product does not require notification permission. Target
prices, active tracking state, and alert re-arming can be managed independently
from the tracked-products interface.

## Accounts and cross-device sync

PricePeek supports passwordless email magic links through Supabase Auth. Signed
out visitors can continue tracking with a random browser device ID. After a
verified sign-in, PricePeek links that browser's anonymous products and push
subscription to the account. Products then load on every signed-in device, and
alert delivery can fan out to each subscribed account device.

Configure the Supabase Auth Site URL to the production origin and allow the
local development origins under Authentication → URL Configuration. Email
magic links are rate-limited by the configured email provider. The interface
asks users to wait before retrying after a rate-limit response. Never expose
`SUPABASE_SECRET_KEY` to the browser; only the publishable key belongs in a
`NEXT_PUBLIC_` variable.

Signing out detaches the current browser's push subscription from the account.
Claimed products remain account-owned and require signing in again; this avoids
leaking account data back into an anonymous browser session.

### Account deletion and privacy

The Account menu links to notification settings and the privacy notice. To
prevent accidental deletion, a signed-in user must enter the account email
before the server accepts the request. The server validates the current access
token and uses the server-only Supabase admin client to delete that exact Auth
user. Existing foreign keys then cascade to account-owned tracked products and
push subscriptions, while each product cascades to its price history. The
browser also removes its locally cached product list and local push
subscription. This action is permanent.

The public `/privacy` page documents the data PricePeek stores, its service
providers, user controls, and price-accuracy limitations. Before a broader
public launch, review the notice for the jurisdictions where the service will
be offered and add an appropriate support contact when one is available.

## Progressive Web App

PricePeek includes a native Next.js web manifest and a small, hand-written
service worker. On supporting Chromium browsers, use the **Install PricePeek**
button after the browser exposes its install prompt. On iPhone or iPad, open the
Share menu and choose **Add to Home Screen**. Installation guidance is hidden
when the app is already running in standalone mode.

Push-notification permission and application installation are separate. Either
feature can be used without enabling the other.

Push alerts can also be disabled from Notification settings. Disabling removes
the local browser subscription and asks the server to delete that device's
stored endpoint. Email is used for passwordless sign-in only; PricePeek does
not currently send marketing messages or price alerts by email.

### Cache policy

The service worker caches only the public application shell:

- `/`, `/offline`, the web manifest, and PricePeek icon files
- Same-origin build assets under `/_next/static/`

It never caches `/api/` responses, Supabase data, Amazon product responses,
tracked-product records, price history, external product images, or arbitrary
future routes. Network failures during navigation fall back to `/offline`, and
the live interface displays an offline warning that saved prices may be stale.
Increase the `SHELL_CACHE` version in `public/sw.js` whenever the shell asset list
or cache behavior changes.

### Icon assets

- `public/icon-192x192.png`: standard 192 px install icon
- `public/icon-512x512.png`: standard 512 px install icon
- `public/icon-maskable-512x512.png`: mask-safe 512 px install icon
- `public/apple-touch-icon.png`: 180 px Apple touch icon
- `app/favicon.ico`: multi-size 16/32/48 px favicon
- `public/notification-badge-96x96.png`: monochrome transparent push badge

The icon family uses the slate and emerald palette from the PricePeek interface.

### PWA testing

After running the standard quality checks, test with production output over
HTTPS or localhost:

1. Inspect `/manifest.webmanifest` and confirm every icon loads.
2. In browser developer tools, verify the service worker controls the page.
3. Confirm offline navigation shows the offline warning or `/offline` fallback.
4. Confirm requests under `/api/` never appear in Cache Storage.
5. Exercise install, dismissal, standalone launch, and service-worker update.
6. On an installed iOS 16.4+ app, separately test push permission and delivery.

## Scheduled price checks

Vercel calls `GET /api/cron/check-prices` daily according to `vercel.json` and
sends `Authorization: Bearer <CRON_SECRET>`. The route selects active products
whose `next_check_at` is due, oldest first. Successful checks are scheduled for
the following day. Failed lookups record their error and use exponential backoff
so one failing product cannot repeatedly occupy the front of the queue.

The checker first acquires a self-expiring five-minute database lease, so an
overlapping invocation exits successfully without processing the same batch.
Expired push endpoints are removed individually; a stale endpoint cannot stop
delivery to the other subscribed devices. A price alert is marked as sent only
after at least one device accepts it.

Each non-overlapping invocation writes a row to `price_check_runs`. The row
contains only start/completion times, a status, and aggregate result counts.
`/status` gives visitors a plain-language health view, while `/api/health`
provides the same privacy-safe state for an uptime monitor. The health response
uses `Cache-Control: no-store`, returns HTTP 503 for missing, stale, partial, or
failed runs, and exposes no customer or product records. The first status will
remain degraded until a scheduled check runs after this migration is applied.

Cron responses are aggregate-only: checked, updated, notification, and failure
counts. Per-product lookup errors remain in the existing scheduling/error
fields so operators can diagnose them through protected database access.
The same daily job removes API rate-limit identifiers whose windows ended more
than seven days earlier.

A product remains active after a notification. The notification flag suppresses
duplicates while its price stays at or below the target and is re-armed after the
price rises above the target.

## Deployment

1. Apply every reviewed migration in filename order to staging. Deploy code
   that reads `price_check_runs` only after
   `20260903010000_cron_run_health.sql` has been applied.
2. Configure every environment variable in the staging deployment.
3. Run the quality checks above.
4. Deploy to staging and verify product lookup, tracking, deletion, price
   history, cron authorization, and push subscription behavior.
5. Invoke the cron route with a staging secret and inspect both its JSON result
   and scheduling fields in Supabase.
6. Only after staging succeeds, apply the migration to production, configure
   production secrets, and deploy.

Never expose `SUPABASE_SECRET_KEY`, `VAPID_PRIVATE_KEY`, `RAINFOREST_API_KEY`, or
`CRON_SECRET` through client components or `NEXT_PUBLIC_` variables. The
Supabase project URL, publishable key, and VAPID public key are intentionally
browser-safe.
