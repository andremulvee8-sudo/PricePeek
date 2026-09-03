import Link from "next/link";
import AuthControls from "./AuthControls";

export default function Navbar() {
  return (
    <nav
      aria-label="Primary navigation"
      className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-5 sm:px-8 sm:py-6"
    >
      <Link
        href="/"
        aria-label="PricePeek home"
        className="text-2xl font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-400 sm:text-3xl"
      >
        Price<span className="text-green-400">Peek</span>
      </Link>

      <div className="flex items-center gap-3">
        <AuthControls />
        <a
          href="#amazon-product-url"
          className="hidden rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400 sm:inline-flex"
        >
          Get Started
        </a>
      </div>
    </nav>
  );
}
