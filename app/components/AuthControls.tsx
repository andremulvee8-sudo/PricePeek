"use client";

import { useState, type FormEvent } from "react";
import { getAuthErrorMessage } from "../lib/authMessages";
import { useAuth } from "./AuthProvider";

export default function AuthControls() {
  const { user, isLoading, sendMagicLink, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("");

    try {
      await sendMagicLink(email.trim());
      setStatus("Check your email for a secure sign-in link.");
    } catch (error) {
      setStatus(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <span className="text-sm text-slate-400">Checking account…</span>;
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="hidden max-w-48 truncate text-sm text-slate-300 sm:inline">
          {user.email}
        </span>
        <button
          type="button"
          onClick={() => void signOut()}
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm transition hover:border-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="pricepeek-sign-in"
        onClick={() => setIsOpen((open) => !open)}
        className="rounded-xl border border-slate-700 px-4 py-2 text-sm transition hover:border-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400"
      >
        Sign in
      </button>

      {isOpen && (
        <form
          id="pricepeek-sign-in"
          onSubmit={handleSubmit}
          className="absolute right-0 z-20 mt-3 w-80 rounded-2xl border border-slate-700 bg-slate-900 p-4 text-left shadow-2xl"
        >
          <label htmlFor="account-email" className="text-sm font-semibold">
            Email address
          </label>
          <p className="mt-1 text-xs text-slate-400">
            We’ll email you a passwordless sign-in link.
          </p>
          <input
            id="account-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-green-400"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-3 w-full rounded-lg bg-green-500 px-3 py-2 font-semibold text-slate-950 transition hover:bg-green-400 disabled:opacity-60"
          >
            {isSubmitting ? "Sending…" : "Email sign-in link"}
          </button>
          {status && (
            <p className="mt-3 text-sm text-slate-300" role="status">
              {status}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
