const CACHE_NAME = "elite-shop-v4";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k).catch(() => false)))
    ).then(() => self.clients.claim()).catch(() => {})
  );
});

function isFlightRequest(request) {
  if (
    request.headers.has("rsc") ||
    request.headers.has("next-router-state-tree") ||
    request.headers.has("next-router-prefetch") ||
    request.headers.has("next-router-segment-prefetch") ||
    request.headers.has("next-hmr-refresh")
  ) {
    return true;
  }
  try {
    return new URL(request.url).searchParams.has("_rsc");
  } catch {
    return false;
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (isFlightRequest(event.request)) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone).catch(() => {})).catch(() => {});
        }
        return response;
      }).catch(() => caches.match(event.request).then((cached) => cached || new Response("Offline", { status: 503 })).catch(() => new Response("Offline", { status: 503 })))
    );
    return;
  }

  if (event.request.url.includes("/_next/")) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone).catch(() => {})).catch(() => {});
        }
        return response;
      }).catch(() => caches.match(event.request).then((cached) => cached || new Response("Offline", { status: 503 })).catch(() => new Response("Offline", { status: 503 })))
    );
    return;
  }

  if (event.request.url.includes("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() => new Response(JSON.stringify({ error: "Service unavailable" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone).catch(() => {})).catch(() => {});
        }
        return response;
      }).catch(() => new Response("", { status: 503 }));
    }).catch(() => fetch(event.request).catch(() => new Response("", { status: 503 })))
  );
});

self.addEventListener("push", (event) => {
  let payload = { title: "Elite Tech Shop", body: "You have a new notification.", url: "/" };
  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload = { ...payload, body: event.data.text() };
    }
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/elitetech.webp",
      badge: "/elitetech.webp",
      tag: payload.tag || "elite-shop-push",
      data: { url: payload.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(target).catch(() => undefined);
          return;
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(target);
    })()
  );
});
