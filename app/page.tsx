import Link from "next/link";
import Navbar from "./components/Navbar";
import Stats from "./components/Stats";
import SearchBar from "./components/SearchBar";
import PushNotificationButton from "./components/PushNotificationButton";
import PwaControls from "./components/PwaControls";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      <section className="mx-auto flex max-w-5xl flex-col items-center px-6 pt-20 text-center">
        <span className="rounded-full border border-green-500/40 bg-green-500/10 px-4 py-2 text-sm text-green-300">
          🚀 Track Amazon prices for free
        </span>

        <h1 className="mt-8 text-4xl font-extrabold leading-tight sm:text-6xl md:text-7xl">
          Know the <span className="text-green-400">perfect time</span>
          <br />
          to buy.
        </h1>

        <p className="mt-8 max-w-2xl text-xl text-slate-400">
          Paste any Amazon product link and PricePeek tracks the price,
          alerts you when it drops, and helps you avoid overpaying.
        </p>

        <SearchBar />
        <PwaControls />
        <PushNotificationButton />
      </section>

      <section
        aria-labelledby="how-pricepeek-works"
        className="mx-auto mt-28 max-w-6xl px-6"
      >
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-green-400">
            Simple by design
          </p>
          <h2
            id="how-pricepeek-works"
            className="mt-3 text-3xl font-bold sm:text-4xl"
          >
            Start tracking in three steps
          </h2>
        </div>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            [
              "1",
              "Copy an Amazon link",
              "Use the Share button in Amazon or copy the page address. Full and a.co links are supported.",
            ],
            [
              "2",
              "Set your target",
              "Paste the link, look up the product, choose the price you want, and save it.",
            ],
            [
              "3",
              "Check your progress",
              "PricePeek checks active products daily. Push alerts are optional and can be enabled separately.",
            ],
          ].map(([number, title, description]) => (
            <li
              key={number}
              className="rounded-3xl border border-slate-800 bg-slate-900 p-7"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 font-bold text-slate-950">
                {number}
              </span>
              <h3 className="mt-5 text-xl font-bold">{title}</h3>
              <p className="mt-3 text-slate-400">{description}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 text-center">
          <Link
            href="/help"
            className="inline-flex rounded-xl border border-slate-700 px-5 py-3 font-semibold transition hover:border-green-400 hover:text-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400"
          >
            Read the complete guide
          </Link>
        </div>
      </section>

      <section className="mx-auto mt-28 grid max-w-6xl gap-8 px-6 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <div className="text-4xl">📈</div>
          <h3 className="mt-6 text-2xl font-bold">Price History</h3>
          <p className="mt-3 text-slate-400">
            View every price change before buying.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <div className="text-4xl">🔔</div>
          <h3 className="mt-6 text-2xl font-bold">Target Alerts</h3>
          <p className="mt-3 text-slate-400">
            Receive a notification after a scheduled check finds your target
            price.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <div className="text-4xl">🤖</div>
          <h3 className="mt-6 text-2xl font-bold">Deal Score</h3>
          <p className="mt-3 text-slate-400">
            Instantly know whether it&apos;s a good deal or not.
          </p>
        </div>
      </section>

      <Stats />

      <footer className="mt-28 border-t border-slate-800 px-6 py-10 text-center text-slate-500">
        <p>© 2026 PricePeek.</p>
        <nav
          aria-label="Footer navigation"
          className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm"
        >
          <Link className="hover:text-green-400" href="/help">
            Help
          </Link>
          <Link className="hover:text-green-400" href="/privacy">
            Privacy
          </Link>
          <Link className="hover:text-green-400" href="/plans">
            Plans
          </Link>
          <Link className="hover:text-green-400" href="/terms">
            Terms
          </Link>
          <Link className="hover:text-green-400" href="/status">
            Service status
          </Link>
        </nav>
      </footer>
    </main>
  );
}
