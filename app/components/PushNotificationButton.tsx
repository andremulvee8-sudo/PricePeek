"use client";

import { useEffect, useState } from "react";
import { getOrCreateDeviceId } from "../lib/deviceId";
import { useAuth } from "./AuthProvider";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);

  return Uint8Array.from(
    [...rawData].map((character) => character.charCodeAt(0))
  );
}

export default function PushNotificationButton() {
  const { accessToken } = useAuth();
  const [status, setStatus] = useState<
    | "idle"
    | "loading"
    | "enabled"
    | "disabling"
    | "disabled"
    | "unsupported"
    | "denied"
    | "error"
  >("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function detectNotificationStatus() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }

      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }

      if (Notification.permission === "granted") {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();

        setStatus(subscription ? "enabled" : "idle");
      }
    }

    void detectNotificationStatus();
  }, []);

  async function enableNotifications() {
    try {
      setStatus("loading");
      setMessage("");

      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!publicKey) {
        throw new Error("VAPID public key is missing");
      }

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : {}),
        },
        body: JSON.stringify({
          deviceId: getOrCreateDeviceId(),
          subscription,
        }),
      });

      if (!response.ok) {
        throw new Error("Could not save push subscription");
      }

      setStatus("enabled");
      setMessage("Price-drop alerts are enabled on this device.");
    } catch (error) {
      console.error(error);
      setStatus("error");
      setMessage("Could not enable alerts. Please try again.");
    }
  }

  async function disableNotifications() {
    setStatus("disabling");
    setMessage("");

    let serverCleanupFailed = false;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      await subscription?.unsubscribe();

      const response = await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : {}),
        },
        body: JSON.stringify({
          deviceId: getOrCreateDeviceId(),
          action: "unsubscribe",
        }),
      });

      serverCleanupFailed = !response.ok;
    } catch (error) {
      console.error("Could not fully remove push alerts:", error);
      serverCleanupFailed = true;
    }

    setStatus("disabled");
    setMessage(
      serverCleanupFailed
        ? "Alerts are disabled in this browser. Any expired server record will be removed during a future alert attempt."
        : "Price-drop alerts are disabled on this device."
    );
  }

  if (status === "unsupported") {
    return (
      <section
        id="notification-controls"
        className="mt-6"
        aria-labelledby="notification-heading"
      >
        <h2 id="notification-heading" className="text-lg font-semibold">
          Notification settings
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Browser notifications aren’t supported on this device.
        </p>
      </section>
    );
  }

  return (
    <section
      id="notification-controls"
      aria-labelledby="notification-heading"
      className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
    >
      <h2 id="notification-heading" className="text-lg font-semibold">
        Notification settings
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        Push alerts are controlled separately on each device. Email is used for
        sign-in only.
      </p>
      <button
        type="button"
        onClick={
          status === "enabled" ? disableNotifications : enableNotifications
        }
        disabled={
          status === "loading" ||
          status === "disabling" ||
          status === "denied"
        }
        aria-describedby={message ? "notification-status" : undefined}
        className="mt-4 rounded-xl border border-green-500/50 bg-green-500/10 px-5 py-3 font-semibold text-green-300 transition hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "loading" && "Enabling…"}
        {status === "enabled" && "Disable price alerts"}
        {status === "disabling" && "Disabling…"}
        {status === "disabled" && "🔔 Enable price-drop alerts"}
        {status === "denied" && "Notifications blocked"}
        {status === "error" && "Try enabling alerts again"}
        {status === "idle" && "🔔 Enable price-drop alerts"}
      </button>
      {message && (
        <p
          id="notification-status"
          className="mt-3 text-sm text-slate-300"
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      )}
    </section>
  );
}
