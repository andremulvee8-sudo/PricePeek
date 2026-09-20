import type { Metadata } from "next";
import Link from "next/link";
import BillingControls from "../components/BillingControls";
import { SUBSCRIPTION_PLANS } from "../lib/subscription";

export const metadata: Metadata = {
  title: "Plans",
  description: "PricePeek plans and the current free beta offering.",
  alternates: {
    canonical: "/plans",
  },
};

type PlansPageProps = {
  searchParams: Promise<{ checkout?: string | string[] }>;
};

export default async function PlansPage({ searchParams }: PlansPageProps) {
  const checkout = (await searchParams).checkout;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-green-400">
          Plans
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold sm:text-5xl">
          Price tracking that stays clear and predictable.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-300">
          Start free, then upgrade only when you need room for more products.
          Stripe securely handles payment details and subscription management.
        </p>

        {checkout === "success" ? (
          <p role="status" className="mt-6 rounded-xl border border-green-400/40 bg-green-400/10 p-4 text-green-200">
            Checkout completed. Your Plus access will appear as soon as Stripe confirms the subscription.
          </p>
        ) : checkout === "canceled" ? (
          <p role="status" className="mt-6 rounded-xl border border-slate-700 bg-slate-900 p-4 text-slate-300">
            Checkout was canceled. No subscription change was made.
          </p>
        ) : null}

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <article className="rounded-3xl border border-green-400/50 bg-green-400/10 p-7">
            <p className="text-sm font-semibold text-green-300">Free</p>
            <h2 className="mt-3 text-3xl font-bold">
              {SUBSCRIPTION_PLANS.free.name}
            </h2>
            <p className="mt-3 text-slate-300">
              Track up to {SUBSCRIPTION_PLANS.free.trackedProductLimit} products with no payment details required.
            </p>
            <ul className="mt-6 space-y-3 text-slate-200">
              <li>Daily automatic Amazon price checks</li>
              <li>Target-price push alerts</li>
              <li>Price history and account sync</li>
              <li>Installable web app</li>
            </ul>
            <Link
              href="/#amazon-product-url"
              className="mt-8 inline-flex rounded-xl bg-green-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400"
            >
              Track a product
            </Link>
          </article>

          <article className="rounded-3xl border border-slate-700 bg-slate-900 p-7">
            <p className="text-sm font-semibold text-green-300">More capacity</p>
            <h2 className="mt-3 text-3xl font-bold">
              {SUBSCRIPTION_PLANS.plus.name}
            </h2>
            <p className="mt-3 text-slate-300">
              Track up to {SUBSCRIPTION_PLANS.plus.trackedProductLimit} products while keeping every current PricePeek feature.
            </p>
            <ul className="mt-6 space-y-3 text-slate-200">
              <li>Daily automatic Amazon price checks</li>
              <li>Target-price push alerts</li>
              <li>Price history and account sync</li>
              <li>Cancel anytime in Stripe’s secure portal</li>
            </ul>
            <p className="mt-5 text-sm text-slate-400">The exact recurring price and billing period are shown before you confirm in Stripe Checkout.</p>
            <BillingControls />
          </article>
        </div>

        <Link
          href="/"
          className="mt-10 inline-flex rounded-xl border border-slate-700 px-5 py-3 font-semibold transition hover:border-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400"
        >
          Return to PricePeek
        </Link>
      </section>
    </main>
  );
}
