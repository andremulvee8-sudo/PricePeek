import AuthControls from "./AuthControls";

export default function Navbar() {
  return (
    <nav className="mx-auto flex max-w-7xl items-center justify-between px-8 py-6">
      <h1 className="text-3xl font-bold">
        Price<span className="text-green-400">Peek</span>
      </h1>

      <div className="flex items-center gap-3">
        <AuthControls />
        <a
          href="#amazon-product-url"
          className="rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400"
        >
          Get Started
        </a>
      </div>
    </nav>
  );
}
