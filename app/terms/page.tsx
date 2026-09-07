import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms for using the PricePeek price-tracking service.",
};

export default function TermsPage() {
  const supportEmail = process.env.SUPPORT_EMAIL?.trim();

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <article className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-green-400">
          Terms
        </p>
        <h1 className="mt-4 text-4xl font-bold">Using PricePeek</h1>
        <p className="mt-5 text-lg text-slate-300">
          PricePeek is a price-monitoring aid. It does not sell products,
          guarantee prices or availability, or act on behalf of Amazon or its
          sellers.
        </p>

        <div className="mt-10 space-y-8 text-slate-300">
          <section aria-labelledby="service">
            <h2 id="service" className="text-2xl font-semibold text-white">
              Service limitations
            </h2>
            <p className="mt-3">
              Product information comes from third-party services and may be
              delayed, incomplete, or inaccurate. Checks occur on a schedule,
              so a displayed or notified price may have changed. Confirm the
              final price, seller, shipping, taxes, and availability before
              purchasing.
            </p>
          </section>

          <section aria-labelledby="acceptable-use">
            <h2
              id="acceptable-use"
              className="text-2xl font-semibold text-white"
            >
              Acceptable use
            </h2>
            <p className="mt-3">
              Do not abuse the service, evade request limits, interfere with
              other users, or use PricePeek for unlawful activity. Access may
              be limited when needed to protect the service and its providers.
            </p>
          </section>

          <section aria-labelledby="accounts">
            <h2 id="accounts" className="text-2xl font-semibold text-white">
              Accounts and alerts
            </h2>
            <p className="mt-3">
              You are responsible for access to your email account and devices.
              Push alerts are optional and delivery is not guaranteed. You can
              pause tracking, disable alerts, or permanently delete a signed-in
              account from the application.
            </p>
          </section>

          <section aria-labelledby="availability">
            <h2
              id="availability"
              className="text-2xl font-semibold text-white"
            >
              Availability and changes
            </h2>
            <p className="mt-3">
              The beta service is provided as available and may change or be
              interrupted. Material updates to these terms will be reflected on
              this page before a broader public launch.
            </p>
          </section>

          {supportEmail && (
            <section aria-labelledby="contact">
              <h2 id="contact" className="text-2xl font-semibold text-white">
                Contact
              </h2>
              <p className="mt-3">
                Questions can be sent to{" "}
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

        <p className="mt-10 text-sm text-slate-500">
          Last updated: September 7, 2026
        </p>
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
