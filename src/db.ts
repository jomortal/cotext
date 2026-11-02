// The database: public/data/cotext.db (built by pipeline/build_db.py) opened in memory in the official SQLite
// WebAssembly build (public/sqlite/, vendored from sqlite.org). Kept on the device once per database version - the page
// reads its own copy first (Cache Storage, or IndexedDB where there's none) before the network, so an app update, a
// reload, or a browser without the service worker (Chrome and app web views on iOS - Vider) doesn't download it again.
// Older versions' copies are deleted once a new one is kept.

/** The database's version, set by build.mjs from its contents: a new database gets a new URL (and cache). */
declare const DB_VERSION: string;

export type Row = Record<string, string | number | null>;

export interface Db {
  /** Every row of a query, each an object keyed by column name; params bind to the ?s in order. */
  all (sql: string, params?: (string | number)[]): Row[];
}

/** Downloads (or reads from the cache) and opens the database; onProgress gets 0-1 as it arrives. */
export async function openDb (onProgress: (fraction: number) => void): Promise<Db> {
  // Loaded at run time, not bundled: sqlite3.mjs finds sqlite3.wasm beside itself.
  const sqliteUrl = "./sqlite/sqlite3.mjs";
  const init = (await import (sqliteUrl)).default;
  const url = `data/cotext.db?v=${DB_VERSION}`;
  const [sqlite3, bytes] = await Promise.all ([init ({ print: () => {}, printErr: console.error }), kept (url, onProgress)]);
  const db = new sqlite3.oo1.DB ();
  const p = sqlite3.wasm.allocFromTypedArray (bytes);
  const { capi } = sqlite3;
  // FREEONCLOSE: SQLite owns the copy; READONLY: the reader never writes to it.
  db.checkRc (capi.sqlite3_deserialize (db.pointer, "main", p, bytes.byteLength, bytes.byteLength,
                                        capi.SQLITE_DESERIALIZE_FREEONCLOSE | capi.SQLITE_DESERIALIZE_READONLY));
  return {
    all: (sql, params = []) => db.exec ({ sql, bind: params, rowMode: "object", returnValue: "resultRows" }),
  };
}

/** The database's bytes: the device's copy of this version if there is one, else downloaded and kept. Cache Storage
 *  first (the cache the service worker reads too - public/sw.js: "cotext-data-" + the version), IndexedDB where there's
 *  no Cache Storage; neither (a private window): just downloaded. */
async function kept (url: string, onProgress: (fraction: number) => void): Promise<Uint8Array> {
  const name = `cotext-data-${DB_VERSION}`, key = new URL (url, location.href).href;
  try {
    const cache = await caches.open (name);
    const hit = await cache.match (key);
    if (hit) { onProgress (1); return new Uint8Array (await hit.arrayBuffer ()); }
    const bytes = await download (url, onProgress);
    await cache.put (key, new Response (bytes, { headers: { "Content-Type": "application/octet-stream" } }));
    for (const k of await caches.keys ()) if (k.startsWith ("cotext-data-") && k !== name) await caches.delete (k);
    return bytes;
  } catch { /* no Cache Storage: IndexedDB below */ }
  try {
    const db = await idb ();
    const hit = await idbGet (db, DB_VERSION);
    if (hit) { onProgress (1); return hit; }
    const bytes = await download (url, onProgress);
    await idbReplace (db, DB_VERSION, bytes);
    return bytes;
  } catch { return download (url, onProgress); }
}

function idb (): Promise<IDBDatabase> {
  return new Promise ((ok, fail) => {
    const r = indexedDB.open ("cotext", 1);
    r.onupgradeneeded = () => r.result.createObjectStore ("db");
    r.onsuccess = () => ok (r.result);
    r.onerror = () => fail (r.error);
  });
}
function idbGet (db: IDBDatabase, k: string): Promise<Uint8Array | undefined> {
  return new Promise ((ok, fail) => {
    const r = db.transaction ("db").objectStore ("db").get (k);
    r.onsuccess = () => ok (r.result as Uint8Array | undefined);
    r.onerror = () => fail (r.error);
  });
}
/** Keeps this version's bytes, the older versions' deleted. */
function idbReplace (db: IDBDatabase, k: string, bytes: Uint8Array): Promise<void> {
  return new Promise ((ok, fail) => {
    const t = db.transaction ("db", "readwrite"), store = t.objectStore ("db");
    store.clear ();
    store.put (bytes, k);
    t.oncomplete = () => ok ();
    t.onerror = () => fail (t.error);
  });
}

/** The file's bytes, reporting progress when the server gives its length. */
async function download (url: string, onProgress: (fraction: number) => void): Promise<Uint8Array> {
  const res = await fetch (url);
  if (! res.ok || ! res.body) throw new Error (`The database couldn't be loaded (${res.status}).`);
  const total = Number (res.headers.get ("Content-Length")) || 0;
  const reader = res.body.getReader ();
  const chunks: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read ();
    if (done) break;
    chunks.push (value);
    got += value.byteLength;
    if (total) onProgress (got / total);
  }
  const out = new Uint8Array (got);
  let at = 0;
  for (const c of chunks) { out.set (c, at); at += c.byteLength; }
  return out;
}
