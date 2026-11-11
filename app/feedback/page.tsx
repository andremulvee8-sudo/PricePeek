import type { Metadata } from "next";
import Link from "next/link";
import FeedbackForm from "../components/FeedbackForm";
import Navbar from "../components/Navbar";

export const metadata: Metadata = {
  title: "Beta Feedback",
  description:
    "Send anonymous, privacy-conscious feedback about the PricePeek beta.",
  alternates: {
    canonical: "/feedback",
  },
};

export default function FeedbackPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <section className="mx-auto max-w-3xl px-6 pb-20 pt-12 sm:pt-16">
        <p className="text-sm font-semibold uppercase tracking-wider text-green-400">
          Beta feedback
        </p>
        <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
          Help shape PricePeek
        </h1>
        <p className="mt-5 text-lg text-slate-300">
          Tell us what worked, what was confusing, or what should improve. The
          form intentionally does not request your name, email, account,
          product link, or device identifier.
        </p>

        <FeedbackForm />

        <p className="mt-8 text-sm text-slate-400">
          Need a response about your account or subscription? Use the support
          contact on the{" "}
          <Link
            href="/help"
            className="text-green-400 underline-offset-4 hover:underline"
          >
            Help page
          </Link>{" "}
          instead. Never send payment-card details or sign-in links.
        </p>
      </section>
    </main>
  );
}
