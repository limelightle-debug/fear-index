// Offline shell; the page and the data are always fetched fresh when online. Bump CACHE when the app files change.
// Fetch by URL, not with the request itself: a page navigation can't be re-sent with options, and doing so used to fall
// through to the cached (old) page, so updates never showed.
const CACHE = "fi-v59";
const SHELL = ["./", "index.html", "manifest.webmanifest", "books.js", "icons/app.png", "icons/masthead.png", "icons/icon-192.png", "icons/book-map.jpg",
  "icons/book-vix.jpg", "icons/book-vix-en.jpg", "icons/book-kinri.jpg", "icons/book-chobo.jpg", "icons/book-shippai.jpg",
  "icons/book-heiho.jpg", "icons/book-anomaly.jpg"];
const fresh = req => fetch(req.url, { cache: "no-cache", credentials: "same-origin" });
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  // Online: the fresh copy (kept for offline). A failed or bad answer falls back to the kept copy, then to one
  // plain retry; only a page navigation falls back to the app page, so an image never turns into HTML.
  const keep = res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(url.origin + url.pathname, copy)); } return res; };
  const fallback = () => caches.match(url.origin + url.pathname).then(r => r || fetch(e.request.url).then(keep)
    .catch(() => e.request.mode === "navigate" ? caches.match("index.html") : Response.error()));
  e.respondWith(fresh(e.request).then(res => res.ok ? keep(res) : fallback()).catch(fallback));
});
