"use client";

import { useEffect, useState } from "react";
import {
  getInstallExperience,
  isAppleMobileDevice,
  isStandaloneDisplay,
} from "../lib/pwa";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

export default function PwaControls() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isAppleMobile, setIsAppleMobile] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let refreshing = false;
    const displayMode = window.matchMedia("(display-mode: standalone)");

    function updateEnvironmentState() {
      const navigatorWithStandalone = navigator as NavigatorWithStandalone;

      setIsStandalone(
        isStandaloneDisplay(
          displayMode.matches,
          navigatorWithStandalone.standalone === true
        )
      );
      setIsAppleMobile(
        isAppleMobileDevice(
          navigator.userAgent,
          navigator.platform,
          navigator.maxTouchPoints
        )
      );
      setIsOnline(navigator.onLine);
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    function handleInstalled() {
      setDeferredPrompt(null);
      setIsStandalone(true);
    }

    function handleControllerChange() {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    }

    async function registerServiceWorker() {
      if (!("serviceWorker" in navigator)) return;

      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        const readyRegistration = await navigator.serviceWorker.ready;
        const staticAssetUrls = performance
          .getEntriesByType("resource")
          .map((entry) => entry.name)
          .filter((name) => {
            const url = new URL(name);
            return (
              url.origin === window.location.origin &&
              url.pathname.startsWith("/_next/static/")
            );
          });

        readyRegistration.active?.postMessage({
          type: "CACHE_STATIC_ASSETS",
          urls: staticAssetUrls,
        });

        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;

          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              worker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      } catch (error) {
        console.error("PricePeek service worker registration failed:", error);
      }
    }

    const frame = window.requestAnimationFrame(updateEnvironmentState);
    void registerServiceWorker();

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("online", updateEnvironmentState);
    window.addEventListener("offline", updateEnvironmentState);
    displayMode.addEventListener("change", updateEnvironmentState);
    navigator.serviceWorker?.addEventListener(
      "controllerchange",
      handleControllerChange
    );

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("online", updateEnvironmentState);
      window.removeEventListener("offline", updateEnvironmentState);
      displayMode.removeEventListener("change", updateEnvironmentState);
      navigator.serviceWorker?.removeEventListener(
        "controllerchange",
        handleControllerChange
      );
    };
  }, []);

  const installExperience = getInstallExperience({
    standalone: isStandalone,
    isAppleMobile,
    canPrompt: deferredPrompt != null,
  });

  async function installApp() {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  return (
    <>
      {!isOnline && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 top-0 z-50 bg-amber-300 px-4 py-2 text-center text-sm font-semibold text-slate-950"
        >
          You&apos;re offline. Saved prices may be outdated until PricePeek
          reconnects.
        </div>
      )}

      {installExperience === "browser-prompt" && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => void installApp()}
            aria-label="Install PricePeek on this device"
            className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 font-semibold text-slate-200 transition hover:border-green-400 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400"
          >
            Install PricePeek
          </button>
        </div>
      )}

      {installExperience === "ios-help" && (
        <aside
          aria-label="Install PricePeek on iPhone or iPad"
          className="mt-4 max-w-xl rounded-2xl border border-slate-700 bg-slate-900/80 px-5 py-4 text-sm text-slate-300"
        >
          To install PricePeek, open the Share menu and choose
          <span className="font-semibold text-white"> Add to Home Screen</span>.
        </aside>
      )}
    </>
  );
}
