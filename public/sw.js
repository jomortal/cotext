// COTEXT's service worker: keeps the app for offline reading.
// build.mjs fills in the two placeholders below: a hash of the app's files and the list of them. The app's files are
// cached together under their hash; old caches are deleted once a new worker runs.
// The data (data/: the database, the notes panel's sources, the lexicons, recorded audio) is left to the page, which
// keeps its own: the database's worker in OPFS (src/dbserver.ts), or - without OPFS - in its "cotext-data-" and
// "cotext-notes-" caches, which the worker neither fills nor deletes. The pictures (data/images/: the dictionaries'
// full pictures, pipeline/finds.py) are online only: fetched from the network every time, kept by neither.
const SHELL = "cotext-shell-__SHELL__";
const FILES = __FILES__;

self.addEventListener ("install", (e) => {
  e.waitUntil (caches.open (SHELL).then ((c) => c.addAll (FILES)).then (() => self.skipWaiting ()));
});

self.addEventListener ("activate", (e) => {
  e.waitUntil (caches.keys ()
    .then ((keys) => Promise.all (keys.filter ((k) => k !== SHELL && ! k.startsWith ("cotext-data-") && ! k.startsWith ("cotext-notes-"))
      .map ((k) => caches.delete (k))))
    .then (() => self.clients.claim ()));
});

// Cache first; anything not cached is fetched and kept. The page itself ("./" or index.html) is the same cached file
// however it's asked for.
self.addEventListener ("fetch", (e) => {
  const url = new URL (e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.includes ("/data/")) return;     // (The data: the page's own, above; data/images/ the network's alone)
  const key = e.request.mode === "navigate" ? new URL ("index.html", location.href).href : e.request;
  e.respondWith (caches.open (SHELL).then ((c) => c.match (key, { ignoreSearch: e.request.mode === "navigate" })
    .then ((hit) => hit || fetch (e.request).then ((res) => {
      if (res.ok) c.put (key, res.clone ());
      return res;
    }))));
});
