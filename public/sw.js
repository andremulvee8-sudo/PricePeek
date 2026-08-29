const SHELL_CACHE = "pricepeek-shell-v1";
const OFFLINE_URL = "/offline";
const STATIC_SHELL = [
  "/",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/icon-maskable-512x512.png",
  "/apple-touch-icon.png",
  "/notification-badge-96x96.png",
];

function isSafeStaticPath(pathname) {
  return (
    pathname.startsWith("/_next/static/") || STATIC_SHELL.includes(pathname)
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(STATIC_SHELL))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("pricepeek-") && key !== SHELL_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data?.type === "CACHE_STATIC_ASSETS") {
    const safeUrls = (Array.isArray(event.data.urls) ? event.data.urls : [])
      .map((value) => {
        try {
          return new URL(value, self.location.origin);
        } catch {
          return null;
        }
      })
      .filter(
        (url) =>
          url &&
          url.origin === self.location.origin &&
          url.pathname.startsWith("/_next/static/")
      )
      .map((url) => url.href);

    event.waitUntil(
      caches.open(SHELL_CACHE).then((cache) => cache.addAll(safeUrls))
    );
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && isSafeStaticPath(url.pathname)) {
            const copy = response.clone();
            void caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          }

          return response;
        })
        .catch(async () => {
          const requestedShell = await caches.match(request);
          return requestedShell || caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  if (!isSafeStaticPath(url.pathname)) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request).then((response) => {
        if (!response.ok) return response;

        const copy = response.clone();
        void caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});

self.addEventListener("push", (event) => {
  let data = {
    title: "PricePeek price drop!",
    body: "A tracked product has reached your target price.",
    url: "/",
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192x192.png",
      badge: "/notification-badge-96x96.png",
      data: {
        url: data.url || "/",
      },
      tag: "pricepeek-price-drop",
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(
      (windowClients) => {
        for (const client of windowClients) {
          if ("focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }

        return clients.openWindow(url);
      }
    )
  );
});
