// COTEXT's service worker: keeps the app and its database for offline reading.
// build.mjs fills in the three placeholders below: a hash of the app's files, the database's version and the list of
// the app's files. The app's files are cached together under their hash, the database on its own under
// its version, so an app update doesn't download the database again; old caches are deleted once a new worker runs.
const SHELL = "cotext-shell-__SHELL__";
const DATA = "cotext-data-__DATA__";
const FILES = __FILES__;

self.addEventListener ("install", (e) => {
  e.waitUntil (caches.open (SHELL).then ((c) => c.addAll (FILES)).then (() => self.skipWaiting ()));
});

self.addEventListener ("activate", (e) => {
  e.waitUntil (caches.keys ()
    .then ((keys) => Promise.all (keys.filter ((k) => k !== SHELL && k !== DATA).map ((k) => caches.delete (k))))
    .then (() => self.clients.claim ()));
});

// Cache first; anything not cached is fetched and kept (the database the first time it's read). The page itself
// ("./" or index.html) is the same cached file however it's asked for.
self.addEventListener ("fetch", (e) => {
  const url = new URL (e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  const cacheName = url.pathname.endsWith ("/data/cotext.db") ? DATA : SHELL;
  const key = e.request.mode === "navigate" ? new URL ("index.html", location.href).href : e.request;
  e.respondWith (caches.open (cacheName).then ((c) => c.match (key, { ignoreSearch: e.request.mode === "navigate" })
    .then ((hit) => hit || fetch (e.request).then ((res) => {
      if (res.ok) c.put (key, res.clone ());
      return res;
    }))));
});
