import type { Metadata } from "next";
import Link from "next/link";
import { SUBSCRIPTION_PLANS } from "../lib/subscription";

export const metadata: Metadata = {
  title: "Plans",
  description: "PricePeek plans and the current free beta offering.",
  alternates: {
    canonical: "/plans",
  },
};

export default function PlansPage() {
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
          PricePeek is free during the beta. Paid checkout is not enabled, so
          you cannot be charged today.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <article className="rounded-3xl border border-green-400/50 bg-green-400/10 p-7">
            <p className="text-sm font-semibold text-green-300">Available now</p>
            <h2 className="mt-3 text-3xl font-bold">
              {SUBSCRIPTION_PLANS.free.name} beta
            </h2>
            <p className="mt-3 text-slate-300">
              All currently released PricePeek features remain available while
              the beta is running.
            </p>
            <ul className="mt-6 space-y-3 text-slate-200">
              <li>Daily automatic Amazon price checks</li>
              <li>Target-price push alerts</li>
              <li>Price history and account sync</li>
              <li>No payment details required</li>
            </ul>
            <Link
              href="/#amazon-product-url"
              className="mt-8 inline-flex rounded-xl bg-green-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400"
            >
              Track a product
            </Link>
          </article>

          <article className="rounded-3xl border border-slate-700 bg-slate-900 p-7">
            <p className="text-sm font-semibold text-slate-400">Planned</p>
            <h2 className="mt-3 text-3xl font-bold">
              {SUBSCRIPTION_PLANS.plus.name}
            </h2>
            <p className="mt-3 text-slate-300">
              A future paid plan for people who need more tracked products and
              faster checks. Final features and pricing will be shown before
              checkout is introduced.
            </p>
            <p className="mt-6 rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-300">
              PricePeek will never start a paid subscription without a clear,
              explicit checkout confirmation.
            </p>
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
