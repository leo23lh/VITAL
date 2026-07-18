/* Service worker: offline shell + local dose notifications.
 * Notification scheduling is driven from the page via postMessage (see
 * lib/notifications.ts). This keeps all schedule logic in one place. */

const CACHE = "companion-shell-v1";
const SHELL = ["/", "/catalog", "/protocols", "/tracker", "/settings", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL).catch(() => {})),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (request.mode === "navigate") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(request).then((r) => r || caches.match("/"))),
  );
});

// Pending timeouts keyed by dose id so re-scheduling replaces them.
const timers = new Map();

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SCHEDULE_DOSE") {
    const { id, title, body, at } = data;
    const delay = at - Date.now();
    if (timers.has(id)) clearTimeout(timers.get(id));
    if (delay <= 0 || delay > 24 * 60 * 60 * 1000) return; // only within 24h
    const handle = setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        tag: id,
        icon: "/icons/icon.svg",
        badge: "/icons/icon.svg",
      });
      timers.delete(id);
    }, delay);
    timers.set(id, handle);
  }
  if (data.type === "CLEAR_DOSE" && timers.has(data.id)) {
    clearTimeout(timers.get(data.id));
    timers.delete(data.id);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const existing = clients.find((c) => "focus" in c);
      if (existing) return existing.focus();
      return self.clients.openWindow("/tracker");
    }),
  );
});
