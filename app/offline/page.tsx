import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Offline",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <section className="max-w-lg text-center">
        <Image
          src="/icon-192x192.png"
          alt=""
          width={96}
          height={96}
          unoptimized
          className="mx-auto rounded-3xl"
        />
        <h1 className="mt-8 text-4xl font-bold">PricePeek is offline</h1>
        <p className="mt-4 text-lg text-slate-300">
          Product lookups, tracked prices, and alerts need an internet
          connection. Any saved price you saw previously may now be outdated.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-xl bg-green-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400"
        >
          Try PricePeek again
        </Link>
      </section>
    </main>
  );
}
