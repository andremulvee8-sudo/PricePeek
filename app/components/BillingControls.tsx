"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import type { SubscriptionAccess } from "../lib/subscription";

type BillingResponse = {
  subscription?: SubscriptionAccess;
  error?: string;
  url?: string;
  billingStatus?: string;
  canManageBilling?: boolean;
};

async function readBillingResponse(response: Response) {
  return (await response.json()) as BillingResponse;
}

export default function BillingControls() {
  const { accessToken, isLoading, user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionAccess | null>(null);
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<"checkout" | "portal" | null>(null);
  const [billingStatus, setBillingStatus] = useState("inactive");
  const [canManageBilling, setCanManageBilling] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;

    fetch("/api/billing/subscription", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    })
      .then(async (response) => {
        const data = await readBillingResponse(response);

        if (!response.ok || !data.subscription) {
          throw new Error(data.error || "Could not load your plan.");
        }

        if (active) {
          setSubscription(data.subscription);
          setBillingStatus(data.billingStatus ?? "inactive");
          setCanManageBilling(data.canManageBilling === true);
          setMessage("");
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setMessage(
            error instanceof Error ? error.message : "Could not load your plan."
          );
        }
      });

    return () => {
      active = false;
    };
  }, [accessToken]);

  async function openBillingPath(path: "checkout" | "portal") {
    if (!accessToken) return;
    setPendingAction(path);
    setMessage("");

    try {
      const response = await fetch(`/api/billing/${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await readBillingResponse(response);

      if (!response.ok || !data.url) {
        throw new Error(data.error || "Billing is not available right now.");
      }

      window.location.assign(data.url);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Billing is not available right now."
      );
      setPendingAction(null);
    }
  }

  if (isLoading) {
    return <p className="mt-6 text-sm text-slate-400">Checking your plan…</p>;
  }

  if (!user) {
    return (
      <p className="mt-6 rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-300">
        Sign in to upgrade or manage a subscription. You can keep using the Free plan without payment details.
      </p>
    );
  }

  const periodLabel = subscription?.currentPeriodEnd
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
        new Date(subscription.currentPeriodEnd)
      )
    : null;

  return (
    <div className="mt-6">
      {subscription?.isPaid || (canManageBilling && ["past_due", "paused"].includes(billingStatus)) ? (
        <>
          <p className={subscription?.isPaid ? "text-sm text-green-300" : "text-sm text-amber-300"}>
            {subscription?.isPaid
              ? `Plus is active${periodLabel ? subscription.cancelAtPeriodEnd ? ` until ${periodLabel}` : ` · renews ${periodLabel}` : ""}`
              : "Your subscription needs attention in the billing portal."}
          </p>
          <button
            type="button"
            onClick={() => void openBillingPath("portal")}
            disabled={pendingAction !== null}
            className="mt-4 rounded-xl bg-green-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-green-400 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400"
          >
            {pendingAction === "portal" ? "Opening…" : "Manage billing"}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => void openBillingPath("checkout")}
          disabled={pendingAction !== null || subscription === null}
          className="rounded-xl bg-green-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-green-400 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400"
        >
          {pendingAction === "checkout" ? "Opening secure checkout…" : "Upgrade to Plus"}
        </button>
      )}
      {message ? (
        <p role="status" className="mt-3 text-sm text-amber-300">
          {message}
        </p>
      ) : null}
    </div>
  );
}
