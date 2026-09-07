import type { Metadata } from "next";
import Link from "next/link";
import { getPriceCheckHealth } from "../lib/priceCheckHealth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Service Status",
  description: "Current PricePeek scheduled price-check status.",
};

const STATUS_COPY = {
  healthy: {
    title: "Price checks are operating normally",
    detail: "The latest scheduled run completed successfully.",
    color: "text-green-400",
  },
  checking: {
    title: "A price check is running",
    detail: "The scheduled checker is currently processing its queue.",
    color: "text-amber-300",
  },
  degraded: {
    title: "Price checks need attention",
    detail:
      "The latest run was incomplete, failed, or has not reported recently. Saved prices may be outdated.",
    color: "text-red-300",
  },
};

export default async function StatusPage() {
  const health = await getPriceCheckHealth();
  const copy = STATUS_COPY[health.state];
  const completedLabel = health.lastCompletedAt
    ? new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(new Date(health.lastCompletedAt))
    : null;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <section className="mx-auto max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-green-400">
          PricePeek status
        </p>
        <h1 className={`mt-4 text-3xl font-bold ${copy.color}`}>
          {copy.title}
        </h1>
        <p className="mt-4 text-slate-300">{copy.detail}</p>

        <dl className="mt-8 border-t border-slate-800 pt-6">
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-slate-400">Last completed check</dt>
            <dd className="font-medium">
              {completedLabel ? `${completedLabel} UTC` : "Not available"}
            </dd>
          </div>
          {health.latestRun && (
            <>
              <div className="mt-4 flex flex-wrap justify-between gap-2">
                <dt className="text-slate-400">Products checked</dt>
                <dd className="font-medium">{health.latestRun.checkedCount}</dd>
              </div>
              <div className="mt-4 flex flex-wrap justify-between gap-2">
                <dt className="text-slate-400">Prices updated</dt>
                <dd className="font-medium">{health.latestRun.updatedCount}</dd>
              </div>
              <div className="mt-4 flex flex-wrap justify-between gap-2">
                <dt className="text-slate-400">Lookup failures</dt>
                <dd className="font-medium">
                  {health.latestRun.lookupFailureCount}
                </dd>
              </div>
              <div className="mt-4 flex flex-wrap justify-between gap-2">
                <dt className="text-slate-400">Push deliveries</dt>
                <dd className="font-medium">
                  {health.latestRun.pushDeliveryCount} / {health.latestRun.pushAttemptCount}
                </dd>
              </div>
            </>
          )}
        </dl>

        <Link
          href="/"
          className="mt-8 inline-flex rounded-xl bg-green-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400"
        >
          Return to PricePeek
        </Link>
      </section>
    </main>
  );
}
