"use client";

import { useEffect, useState } from "react";
import { getOrCreateDeviceId } from "../lib/deviceId";

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
  const [status, setStatus] = useState<
    "idle" | "loading" | "enabled" | "unsupported" | "denied" | "error"
  >("idle");

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
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  }

  if (status === "unsupported") {
    return (
      <p className="mt-4 text-sm text-slate-500">
        Browser notifications aren’t supported on this device.
      </p>
    );
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={enableNotifications}
        disabled={
          status === "loading" ||
          status === "enabled" ||
          status === "denied"
        }
        className="rounded-xl border border-green-500/50 bg-green-500/10 px-5 py-3 font-semibold text-green-300 transition hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "loading" && "Enabling…"}
        {status === "enabled" && "✓ Price alerts enabled"}
        {status === "denied" && "Notifications blocked"}
        {status === "error" && "Try enabling alerts again"}
        {status === "idle" && "🔔 Enable price-drop alerts"}
      </button>
    </div>
  );
}
