import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "../components/Navbar";

export const metadata: Metadata = {
  title: "Help",
  description:
    "Learn how to track Amazon prices, install PricePeek, enable alerts, sync devices, and manage billing.",
  alternates: {
    canonical: "/help",
  },
};

const focusClass =
  "text-green-400 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400";

export default function HelpPage() {
  const supportEmail = process.env.SUPPORT_EMAIL?.trim();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <article className="mx-auto max-w-4xl px-6 pb-20 pt-12 sm:pt-16">
        <p className="text-sm font-semibold uppercase tracking-wider text-green-400">
          PricePeek guide
        </p>
        <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
          Track a product with confidence
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-slate-300">
          PricePeek works in your browser or as an installed app. Tracking,
          signing in, installation, and notifications are separate choices, so
          you can use only the features you want.
        </p>

        <nav
          aria-label="Help topics"
          className="mt-8 flex flex-wrap gap-2 text-sm"
        >
          {[
            ["Copy a link", "copy-link"],
            ["Track a product", "track-product"],
            ["Install", "install"],
            ["Notifications", "notifications"],
            ["Account and billing", "account-billing"],
            ["Troubleshooting", "troubleshooting"],
          ].map(([label, id]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-full border border-slate-700 px-4 py-2 transition hover:border-green-400 hover:text-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="mt-12 space-y-8">
          <section
            id="copy-link"
            className="scroll-mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-7 sm:p-9"
          >
            <p className="text-sm font-semibold text-green-400">Step 1</p>
            <h2 className="mt-2 text-2xl font-bold">
              Copy the Amazon product link
            </h2>
            <div className="mt-4 space-y-3 text-slate-300">
              <p>
                <strong className="text-white">On iPhone or Android:</strong>{" "}
                open the product in Amazon or your browser, tap Share, then tap
                Copy link. Paste the entire link into PricePeek—even if it is a
                long link or starts with{" "}
                <code className="text-green-300">a.co</code>.
              </p>
              <p>
                <strong className="text-white">On desktop:</strong> open the
                product page and copy its address from the browser bar. Links
                containing <code className="text-green-300">/dp/</code> or{" "}
                <code className="text-green-300">/gp/product/</code> are
                supported.
              </p>
              <p>
                Search-result pages, carts, wish lists, sponsored redirects,
                and links to unsupported Amazon marketplaces are not product
                links. Open the individual product page first.
              </p>
            </div>
          </section>

          <section
            id="track-product"
            className="scroll-mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-7 sm:p-9"
          >
            <p className="text-sm font-semibold text-green-400">Step 2</p>
            <h2 className="mt-2 text-2xl font-bold">
              Look it up and save a target
            </h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-slate-300 marker:font-semibold marker:text-green-400">
              <li>
                Paste the link on the PricePeek home page and select Track price.
              </li>
              <li>
                Review the title, marketplace, currency, and available price.
              </li>
              <li>Enter the price you want and save the product.</li>
              <li>Sign in if you want your list to follow you across devices.</li>
            </ol>
            <p className="mt-4 text-slate-300">
              A product can be saved even when Amazon does not expose a current
              price. It will show Price unavailable and PricePeek will retry on
              future scheduled checks.
            </p>
            <Link
              href="/#amazon-product-url"
              className={`mt-5 inline-flex ${focusClass}`}
            >
              Track a product now
            </Link>
          </section>

          <section
            id="install"
            className="scroll-mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-7 sm:p-9"
          >
            <h2 className="text-2xl font-bold">Install PricePeek</h2>
            <div className="mt-4 space-y-3 text-slate-300">
              <p>
                On a supported desktop or Android browser, use the Install
                PricePeek button on the home page. On iPhone or iPad in Safari,
                tap Share, choose Add to Home Screen, then confirm Add.
              </p>
              <p>
                The installed app opens in its own window. When offline, the
                app shell may open, but saved prices can be outdated until you
                reconnect. Product and account data are never stored in the
                offline cache.
              </p>
            </div>
          </section>

          <section
            id="notifications"
            className="scroll-mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-7 sm:p-9"
          >
            <h2 className="text-2xl font-bold">Enable optional price alerts</h2>
            <div className="mt-4 space-y-3 text-slate-300">
              <p>
                Saving a product does not require notification permission. To
                receive alerts on a device, choose Enable price alerts on that
                device and allow notifications when the browser asks.
              </p>
              <p>
                Alerts are device-specific. If permission was blocked, open
                the browser or operating-system notification settings for
                <strong className="text-white"> getpricepeek.com</strong>, allow
                notifications, then return to PricePeek. Tracking remains
                active after an alert; use Re-arm alert if you want another
                notification while the price is still below your target.
              </p>
            </div>
          </section>

          <section
            id="account-billing"
            className="scroll-mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-7 sm:p-9"
          >
            <h2 className="text-2xl font-bold">Account, syncing, and billing</h2>
            <div className="mt-4 space-y-3 text-slate-300">
              <p>
                Sign in with the secure email link to synchronize products
                across your devices. Use the same email on each device. You can
                sign out or delete your account from the Account menu.
              </p>
              <p>
                The Free plan supports up to 5 tracked products. Plus supports
                up to 20. Both currently use daily scheduled checks. Upgrade or
                open the Stripe customer portal from the{" "}
                <Link href="/plans" className={focusClass}>
                  Plans page
                </Link>
                .
              </p>
            </div>
          </section>

          <section
            id="troubleshooting"
            className="scroll-mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-7 sm:p-9"
          >
            <h2 className="text-2xl font-bold">Quick troubleshooting</h2>
            <dl className="mt-5 space-y-5">
              <div>
                <dt className="font-semibold">The Amazon link is rejected</dt>
                <dd className="mt-1 text-slate-300">
                  Open the individual product page and copy a fresh Share link.
                  Make sure the link belongs to a supported Amazon marketplace.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">
                  The price says N/A or unavailable
                </dt>
                <dd className="mt-1 text-slate-300">
                  Amazon did not provide a usable current price. You can still
                  save a target; the next scheduled check will try again.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">
                  My signed-in list looks out of date
                </dt>
                <dd className="mt-1 text-slate-300">
                  Confirm you used the same email, reconnect to the internet,
                  and refresh the app. Do not reinstall before checking the
                  account shown in the Account menu.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Is PricePeek checking normally?</dt>
                <dd className="mt-1 text-slate-300">
                  Visit the aggregate-only{" "}
                  <Link href="/status" className={focusClass}>
                    service status page
                  </Link>
                  .
                  It never displays customer or product records.
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <aside className="mt-10 rounded-3xl border border-green-500/30 bg-green-500/10 p-7">
          <h2 className="text-xl font-bold">Still need help?</h2>
          <p className="mt-2 text-slate-300">
            {supportEmail ? (
              <>
                Email{" "}
                <a href={`mailto:${supportEmail}`} className={focusClass}>
                  {supportEmail}
                </a>{" "}
                and describe what you expected and what happened. Never send a
                password, API key, payment-card number, or magic sign-in link.
              </>
            ) : (
              <>
                Check the{" "}
                <Link href="/status" className={focusClass}>
                  service status
                </Link>{" "}
                and try again later. A support address will appear here when
                it is configured.
              </>
            )}
          </p>
        </aside>

        <div className="mt-8 flex flex-wrap gap-4 text-sm">
          <Link href="/privacy" className={focusClass}>
            Privacy
          </Link>
          <Link href="/terms" className={focusClass}>
            Terms
          </Link>
          <Link href="/" className={focusClass}>
            Return home
          </Link>
        </div>
      </article>
    </main>
  );
}
