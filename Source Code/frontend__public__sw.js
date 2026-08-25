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

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

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
