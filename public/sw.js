const CACHE_NAME = "backyard-relief-crm-v1";

const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/pwa/icon-192.png",
  "/pwa/icon-512.png",
  "/pwa/icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      ),
      self.clients.claim()
    ])
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (
    request.method !== "GET" ||
    new URL(request.url).origin !== self.location.origin
  ) {
    return;
  }

  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() || "" };
  }

  event.waitUntil(
    self.registration.showNotification(
      payload.title || "New Backyard Relief message",
      {
        body:
          payload.body ||
          "A customer sent you a new message.",
        icon: payload.icon || "/pwa/icon-192.png",
        badge: payload.badge || "/pwa/icon-192.png",
        tag: payload.tag || "backyard-relief-message",
        renotify: true,
        data: {
          url: payload.url || "/messages",
          ...payload.data
        }
      }
    )
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const destination =
    event.notification.data?.url || "/messages";

  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true
      })
      .then((clients) => {
        const existingClient = clients.find((client) =>
          client.url.includes(self.location.origin)
        );

        if (existingClient) {
          return existingClient
            .focus()
            .then(() => existingClient.navigate(destination));
        }

        return self.clients.openWindow(destination);
      })
  );
});
