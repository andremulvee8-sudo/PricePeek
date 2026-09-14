import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How PricePeek uses and protects account and price-tracking data.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  const supportEmail = process.env.SUPPORT_EMAIL?.trim();

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <article className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-green-400">
          Privacy
        </p>
        <h1 className="mt-4 text-4xl font-bold">Your data in PricePeek</h1>
        <p className="mt-5 text-lg text-slate-300">
          PricePeek stores only the information needed to provide product
          tracking, account sync, abuse prevention, and optional push alerts.
        </p>

        <div className="mt-10 space-y-8 text-slate-300">
          <section aria-labelledby="data-collected">
            <h2 id="data-collected" className="text-2xl font-semibold text-white">
              Information stored
            </h2>
            <p className="mt-3">
              This includes your sign-in email, tracked Amazon marketplace and
              product identifiers, target prices, recorded price history, a
              randomly generated browser device identifier, and a browser push
              endpoint with its subscription keys when you enable notifications.
              New abuse-prevention entries retain a keyed, non-readable digest
              of the request address rather than the address itself. These
              temporary entries, including older-format entries from before
              this safeguard, are removed after seven days during scheduled
              cleanup.
            </p>
          </section>

          <section aria-labelledby="data-use">
            <h2 id="data-use" className="text-2xl font-semibold text-white">
              How it is used
            </h2>
            <p className="mt-3">
              The data is used to synchronize your tracked products, perform
              scheduled checks, display price history, and deliver alerts you
              requested. PricePeek does not send marketing email and does not
              sell personal information.
            </p>
          </section>

          <section aria-labelledby="providers">
            <h2 id="providers" className="text-2xl font-semibold text-white">
              Service providers
            </h2>
            <p className="mt-3">
              PricePeek relies on Supabase for authentication and storage,
              Vercel for application hosting and scheduled execution, Rainforest
              API for Amazon product information, and your browser&apos;s push
              service for optional notifications. Opening a product link takes
              you to the relevant Amazon marketplace.
            </p>
          </section>

          <section aria-labelledby="choices">
            <h2 id="choices" className="text-2xl font-semibold text-white">
              Your choices
            </h2>
            <p className="mt-3">
              You can pause or remove individual products and disable push
              alerts per device at any time. Signed-in users can permanently
              delete their account from the Account menu. Account deletion
              removes account-owned products, their price history, and linked
              push subscriptions and cannot be undone.
            </p>
          </section>

          <section aria-labelledby="accuracy">
            <h2 id="accuracy" className="text-2xl font-semibold text-white">
              Price accuracy
            </h2>
            <p className="mt-3">
              Prices can change between scheduled checks. Always confirm the
              current price, availability, shipping, and seller details on
              Amazon before purchasing.
            </p>
          </section>

          {supportEmail && (
            <section aria-labelledby="privacy-contact">
              <h2
                id="privacy-contact"
                className="text-2xl font-semibold text-white"
              >
                Privacy contact
              </h2>
              <p className="mt-3">
                For privacy questions or help using the in-app deletion
                control, email{" "}
                <a
                  className="text-green-400 underline-offset-4 hover:underline"
                  href={`mailto:${supportEmail}`}
                >
                  {supportEmail}
                </a>
                .
              </p>
            </section>
          )}
        </div>

        <p className="mt-10 text-sm text-slate-500">Last updated: September 4, 2026</p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-xl border border-slate-700 px-5 py-3 font-semibold transition hover:border-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400"
        >
          Return to PricePeek
        </Link>
      </article>
    </main>
  );
}
