import Navbar from "./components/Navbar";
import Stats from "./components/Stats";
import SearchBar from "./components/SearchBar";
export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      {/* Hero */}
      <section className="mx-auto flex max-w-5xl flex-col items-center px-6 pt-20 text-center">
        <span className="rounded-full border border-green-500/40 bg-green-500/10 px-4 py-2 text-sm text-green-300">
          🚀 Track Amazon prices for free
        </span>

        <h1 className="mt-8 text-6xl font-extrabold leading-tight md:text-7xl">
          Know the <span className="text-green-400">perfect time</span>
          <br />
          to buy.
        </h1>

        <p className="mt-8 max-w-2xl text-xl text-slate-400">
          Paste any Amazon product link and PricePeek tracks the price,
          alerts you when it drops, and helps you avoid overpaying.
        </p>

        {/* Search Box */}
        <SearchBar />
      </section>

      {/* Features */}
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
          <h3 className="mt-6 text-2xl font-bold">Instant Alerts</h3>
          <p className="mt-3 text-slate-400">
            Receive notifications the moment prices drop.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <div className="text-4xl">🤖</div>
          <h3 className="mt-6 text-2xl font-bold">Deal Score</h3>
          <p className="mt-3 text-slate-400">
            Instantly know whether it's a good deal or not.
          </p>
        </div>

<div className="mt-12 flex flex-wrap justify-center gap-12">
  <div>
    <p className="text-4xl font-bold text-green-400">25K+</p>
    <p className="text-slate-400">Products Tracked</p>
  </div>

  <div>
    <p className="text-4xl font-bold text-green-400">8.5K+</p>
    <p className="text-slate-400">Users Waiting for Deals</p>
  </div>

  <div>
    <p className="text-4xl font-bold text-green-400">$250K+</p>
    <p className="text-slate-400">Potential Savings</p>
  </div>
</div>
<Stats />
</section>

      <footer className="mt-28 border-t border-slate-800 py-10 text-center text-slate-500">
        © 2026 PricePeek. Built with ❤️.
      </footer>
    </main>
  );
}