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
- A separate random rate-limit secret of at least 32 characters
- A public support email address before inviting beta testers

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
| `RATE_LIMIT_SECRET` | Server-only key used to digest rate-limit identifiers; use at least 32 random characters |
| `SUPPORT_EMAIL` | Public support/privacy contact rendered on legal pages; not a secret |

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

`supabase/migrations/20260904000000_atomic_api_rate_limits.sql` replaces the
multi-query product-search counter with one atomic database operation. It
creates or replaces only the rate-limit function, grants it solely to the
server role, and does not rewrite or delete existing rows. The application
stores a keyed digest instead of a readable client address for all new
rate-limit entries after this release.

`supabase/migrations/20260907000000_beta_readiness_metrics.sql` adds only
nonnegative aggregate counters to `price_check_runs`. The counters distinguish
Amazon lookup failures, push attempts, accepted deliveries, transient push
failures, and expired subscriptions. They contain no product, account, device,
URL, price, endpoint, key, or provider-response data. Existing run rows are
preserved and receive zero-valued counters.

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
API-hardening tests cover JSON content types, malformed and oversized bodies,
keyed rate-limit identifiers, proxy address selection, and `Retry-After`
calculation.
Beta-readiness tests cover unavailable-price guidance, sign-in-link cooldowns,
and privacy-safe lookup/push aggregate summaries.

### GitHub quality automation

`.github/workflows/quality.yml` runs the same lint, test, TypeScript, and
production-build checks for every pull request, every push to `main`, and a
manual workflow dispatch. The workflow has read-only repository permission,
does not preserve Git credentials after checkout, has no deployment step, and
cannot apply Supabase migrations.

The build uses clearly marked compile-time placeholders rather than repository
or production secrets. Route handlers are not invoked during the build, so the
workflow does not contact Supabase, Rainforest, Web Push, or the deployed app.
Never replace these placeholders with production values. If a future test
genuinely needs a service, use an isolated test project and a reviewed GitHub
environment rather than production credentials.

The interface uses a system font stack, so compilation does not download fonts
or depend on Google Fonts availability. This keeps local and CI builds
deterministic while preserving the existing rendered typography.

Dependabot checks npm packages and GitHub Actions weekly. It opens reviewable
pull requests only; it cannot merge, deploy, or change production data. Review
release notes and require the quality workflow to pass before merging an
update. Compatible minor and patch updates for Next.js, its matching ESLint
configuration, React, React DOM, and their React types are grouped so framework
versions stay aligned. Major framework, ESLint, and Node-type updates require a
planned manual upgrade rather than an automatic pull request.

After the workflow has completed successfully at least once, protect `main` in
the GitHub repository settings with a branch ruleset that requires pull
requests and the `Lint, test, typecheck, and build` status check. Block force
pushes and branch deletion. Until that ruleset is enabled, direct pushes to
`main` can still trigger Vercel before GitHub finishes its independent checks.

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
The public `/terms` page explains beta-service limitations, acceptable use,
account controls, and the need to confirm every price on Amazon. Set
`SUPPORT_EMAIL` to publish the same contact on both legal pages. These templates
are an operational baseline, not jurisdiction-specific legal advice; obtain a
qualified review before charging users or launching broadly.

### Production email delivery

Supabase's shared development email sender is intentionally rate-limited and
is not suitable for a public beta. Before inviting testers, configure a custom
SMTP provider in Supabase Authentication settings:

1. Create a dedicated transactional-email sender and verify its domain with the
   provider.
2. Enter the SMTP host, port, username, password, sender name, and sender email
   directly in the Supabase dashboard. Never paste these values into source,
   issues, pull requests, or chat.
3. Keep the production Site URL and permitted redirect URLs current under
   Authentication URL Configuration.
4. Send one magic link to an internal test account, follow it on desktop and
   mobile, and inspect only aggregate delivery/bounce status in the provider.
5. Set conservative provider and Supabase send limits, then increase them only
   after observing legitimate beta traffic.

The sign-in form applies a one-minute resend cooldown after a successful
request. This reduces accidental repeat emails but does not replace Supabase or
provider-side rate limits.

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
After the Phase 9 migration, it also stores aggregate lookup and push-delivery
counters. `/status` displays only these counts and timestamps; raw provider
errors and customer-level records remain restricted to protected operations.

Cron responses are aggregate-only: checked, updated, notification, and failure
counts. Per-product lookup errors remain in the existing scheduling/error
fields so operators can diagnose them through protected database access.
The same daily job removes API rate-limit identifiers whose windows ended more
than seven days earlier.

### Uptime monitoring

Point an HTTPS uptime monitor at `GET /api/health` after the latest migration is
applied. Use a daily check shortly after the scheduled 09:00 UTC cron run and
alert only when the endpoint returns `503` or cannot be reached. The endpoint
is public, read-only, aggregate-only, and marked `Cache-Control: no-store`.
Never place `CRON_SECRET` in an uptime monitor or use the protected cron route
as a health check.

For beta operations, review these signals without opening customer records:

- latest cron state and completion time;
- checked, updated, and lookup-failure counts;
- push attempts, accepted deliveries, transient failures, and expired
  subscriptions;
- Vercel function error rate and invocation duration;
- transactional-email aggregate delivery and bounce rates.

### Beta launch checklist

Before inviting external testers:

1. Apply the Phase 9 migration to staging, deploy the branch there, and run one
   protected scheduled check.
2. Confirm `/status` and `/api/health` show only aggregate counters.
3. Configure and test custom SMTP without sharing credentials.
4. Set `SUPPORT_EMAIL`, review `/privacy` and `/terms`, and obtain any legal
   review appropriate to the launch jurisdictions.
5. Test a listing with a current price and one without a buy-box price. The
   latter must remain trackable and clearly explain that PricePeek will retry.
6. Test sign-in, cross-device sync, account deletion, installation, offline
   behavior, and push delivery on the target desktop and mobile browsers.
7. Invite a small tester group, monitor aggregate health for several scheduled
   runs, and expand only after lookup and notification failures are understood.

## API safety

All `/api/` responses are marked private and `no-store`. Mutation routes accept
small JSON objects only and reject unsupported content types, malformed JSON,
and oversized bodies before performing application work. Public product
lookups use an atomic hourly allowance, return standard limit/reset headers,
and time out stalled provider requests. Provider and database error details are
logged server-side in limited form and are not returned to visitors.

`RATE_LIMIT_SECRET` is independent from the Supabase, Rainforest, VAPID, and
cron credentials. Generate it locally, store it only in protected environment
configuration, and never prefix it with `NEXT_PUBLIC_`. Rotating it is safe but
starts a new set of temporary limiter identifiers.

A product remains active after a notification. The notification flag suppresses
duplicates while its price stays at or below the target and is re-armed after the
price rises above the target.

## Deployment

1. Apply every reviewed migration in filename order to staging. Deploy code
   that reads `price_check_runs` only after
   `20260903010000_cron_run_health.sql` has been applied. Apply
   `20260904000000_atomic_api_rate_limits.sql` before deploying code that calls
   `consume_api_rate_limit`. Apply
   `20260907000000_beta_readiness_metrics.sql` before deploying code that writes
   or reads the new aggregate health counters.
2. Configure every environment variable in the staging deployment.
3. Run the quality checks above.
4. Deploy to staging and verify product lookup, tracking, deletion, price
   history, cron authorization, and push subscription behavior.
5. Invoke the cron route with a staging secret and inspect both its JSON result
   and scheduling fields in Supabase.
6. Only after staging succeeds, apply the migration to production, configure
   production secrets, and deploy.

Never expose `SUPABASE_SECRET_KEY`, `VAPID_PRIVATE_KEY`, `RAINFOREST_API_KEY`,
`CRON_SECRET`, or `RATE_LIMIT_SECRET` through client components or
`NEXT_PUBLIC_` variables. The
Supabase project URL, publishable key, and VAPID public key are intentionally
browser-safe.
