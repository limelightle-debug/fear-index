// Offline shell; the page and the data are always fetched fresh when online. Bump CACHE when the app files change.
const CACHE = "mo-v1";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "../suite.js"];
const fresh = req => fetch(req.url, { cache: "no-cache", credentials: "same-origin" });
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  const keep = res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(url.origin + url.pathname, copy)); } return res; };
  const fallback = () => caches.match(url.origin + url.pathname).then(r => r || fetch(e.request.url).then(keep)
    .catch(() => e.request.mode === "navigate" ? caches.match("index.html") : Response.error()));
  e.respondWith(fresh(e.request).then(res => res.ok ? keep(res) : fallback()).catch(fallback));
});
