export default function Navbar() {
  return (
    <nav className="mx-auto flex max-w-7xl items-center justify-between px-8 py-6">
      <h1 className="text-3xl font-bold">
        Price<span className="text-green-400">Peek</span>
      </h1>

      <div className="flex gap-4">
        <button className="rounded-xl border border-slate-700 px-5 py-2 hover:border-green-400 transition">
          Sign In
        </button>

        <button className="rounded-xl bg-green-500 px-5 py-2 font-semibold hover:bg-green-400 transition">
          Get Started
        </button>
      </div>
    </nav>
  );
}