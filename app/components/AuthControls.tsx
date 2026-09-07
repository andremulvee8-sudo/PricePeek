"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { getRemainingMagicLinkCooldownSeconds } from "../lib/authCooldown";
import { getAuthErrorMessage } from "../lib/authMessages";
import { useAuth } from "./AuthProvider";

export default function AuthControls() {
  const { user, isLoading, sendMagicLink, signOut, deleteAccount } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeletion, setShowDeletion] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [magicLinkSentAt, setMagicLinkSentAt] = useState<number | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (magicLinkSentAt == null) return;

    const updateCooldown = () => {
      const remaining = getRemainingMagicLinkCooldownSeconds(magicLinkSentAt);
      setCooldownSeconds(remaining);

      if (remaining === 0) window.clearInterval(timer);
    };

    const timer = window.setInterval(updateCooldown, 1_000);
    return () => window.clearInterval(timer);
  }, [magicLinkSentAt]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || cooldownSeconds > 0) return;

    setIsSubmitting(true);
    setStatus("");

    try {
      await sendMagicLink(email.trim());
      setMagicLinkSentAt(Date.now());
      setCooldownSeconds(60);
      setStatus("Check your email for a secure sign-in link.");
    } catch (error) {
      setStatus(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    setIsSubmitting(true);
    setStatus("");

    try {
      await signOut();
      setIsOpen(false);
    } catch {
      setStatus("Could not sign out. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteAccount() {
    setIsSubmitting(true);
    setStatus("");

    try {
      await deleteAccount(confirmationEmail);
      setIsOpen(false);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Could not delete the account."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <span className="text-sm text-slate-400">Checking account…</span>;
  }

  if (user) {
    return (
      <div className="relative">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls="pricepeek-account-menu"
          onClick={() => setIsOpen((open) => !open)}
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm transition hover:border-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400"
        >
          Account
        </button>

        {isOpen && (
          <section
            id="pricepeek-account-menu"
            role="dialog"
            aria-labelledby="pricepeek-account-heading"
            onKeyDown={(event) => {
              if (event.key === "Escape") setIsOpen(false);
            }}
            className="absolute right-0 z-30 mt-3 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-700 bg-slate-900 p-5 text-left shadow-2xl"
          >
            <h2 id="pricepeek-account-heading" className="font-semibold">
              Your account
            </h2>
            <p className="mt-1 truncate text-sm text-slate-300">{user.email}</p>
            <p className="mt-4 text-sm text-slate-400">
              Your email is used only for secure sign-in. PricePeek does not
              send marketing emails or price alerts by email.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="#notification-controls"
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm transition hover:border-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400"
              >
                Notification settings
              </a>
              <Link
                href="/privacy"
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm transition hover:border-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm transition hover:border-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400"
              >
                Terms
              </Link>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleSignOut()}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm transition hover:border-green-400 disabled:opacity-60"
              >
                Sign out
              </button>
            </div>

            <div className="mt-5 border-t border-slate-700 pt-4">
              {!showDeletion ? (
                <button
                  type="button"
                  onClick={() => setShowDeletion(true)}
                  className="text-sm text-red-300 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300"
                >
                  Delete account and data
                </button>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-red-300">
                    Permanently delete this account?
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    This removes your tracked products, price history, and push
                    subscriptions. It cannot be undone. Type your email to
                    confirm.
                  </p>
                  <label
                    htmlFor="delete-account-email"
                    className="mt-3 block text-xs font-medium text-slate-300"
                  >
                    Confirmation email
                  </label>
                  <input
                    id="delete-account-email"
                    type="email"
                    autoComplete="off"
                    value={confirmationEmail}
                    onChange={(event) => setConfirmationEmail(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-red-400"
                  />
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={
                        isSubmitting ||
                        confirmationEmail.trim().toLowerCase() !==
                          user.email?.trim().toLowerCase()
                      }
                      onClick={() => void handleDeleteAccount()}
                      className="rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-400 disabled:opacity-50"
                    >
                      {isSubmitting ? "Deleting…" : "Delete permanently"}
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        setShowDeletion(false);
                        setConfirmationEmail("");
                        setStatus("");
                      }}
                      className="rounded-lg border border-slate-700 px-3 py-2 text-sm disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {status && (
              <p className="mt-3 text-sm text-red-300" role="alert">
                {status}
              </p>
            )}
          </section>
        )}
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
          onKeyDown={(event) => {
            if (event.key === "Escape") setIsOpen(false);
          }}
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
            disabled={isSubmitting || cooldownSeconds > 0}
            className="mt-3 w-full rounded-lg bg-green-500 px-3 py-2 font-semibold text-slate-950 transition hover:bg-green-400 disabled:opacity-60"
          >
            {isSubmitting
              ? "Sending…"
              : cooldownSeconds > 0
                ? `Retry in ${cooldownSeconds}s`
                : "Email sign-in link"}
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
