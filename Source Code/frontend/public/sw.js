const CACHE_NAME = "elite-shop-v5";
// Bounded cache: generic (non-API, non-asset) responses are revalidated via
// stale-while-revalidate below and trimmed back to this many entries.
const MAX_CACHE_ENTRIES = 200;

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

// CacheStorage preserves insertion order, so once the cache exceeds the cap
// the oldest entries are the first ones in keys().
async function trimCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_CACHE_ENTRIES) return;
  const oldest = keys.slice(0, keys.length - MAX_CACHE_ENTRIES);
  await Promise.all(oldest.map((key) => cache.delete(key).catch(() => false)));
}

// Every cache write goes through here so it is tied to the event's lifetime —
// the service worker can otherwise be killed mid-write.
function putInCache(event, request, response) {
  const write = caches
    .open(CACHE_NAME)
    .then((cache) => cache.put(request, response).then(() => trimCache(cache)))
    .catch(() => undefined);
  try {
    event.waitUntil(write);
  } catch {
    // Event already settling; let the write run as-is rather than break
    // the response.
    write.then(() => undefined);
  }
  return write;
}

// Only same-origin targets may be opened from a push payload — otherwise a
// compromised backend could turn the notification into an open redirect.
function sanitizePushUrl(url) {
  try {
    const target = new URL(url || "/", self.location.origin);
    if (target.origin === self.location.origin) return target.href;
  } catch {
    // Fall through to the home page.
  }
  return self.location.origin + "/";
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (isFlightRequest(event.request)) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok) {
          putInCache(event, event.request, response.clone());
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
          putInCache(event, event.request, response.clone());
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

  // Everything else: stale-while-revalidate. Serve the cached copy (if any)
  // immediately while a fresh copy is fetched and cached in the background,
  // so entries can never be stuck forever with no revalidation.
  const network = fetch(event.request)
    .then((response) => {
      if (response && response.ok) {
        putInCache(event, event.request, response.clone());
      }
      return response;
    })
    .catch(() => null);
  // Keep the background refresh alive even when a cached copy is served.
  try {
    event.waitUntil(network);
  } catch {
    // Event already settling — the refresh still runs.
  }

  event.respondWith(
    caches.match(event.request)
      .then((cached) => cached || network)
      .then((response) => response || new Response("", { status: 503 }))
      .catch(() => network.then((r) => r || new Response("", { status: 503 })))
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
      icon: "/elitetech.avif",
      badge: "/elitetech.avif",
      tag: payload.tag || "elite-shop-push",
      data: { url: sanitizePushUrl(payload.url) },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = sanitizePushUrl((event.notification.data && event.notification.data.url) || "/");
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
