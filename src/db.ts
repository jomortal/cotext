// The database: public/data/cotext.db (built by pipeline/build_db.py) opened in memory in the official SQLite
// WebAssembly build (public/sqlite/, vendored from sqlite.org). Kept on the device once per database version - the page
// reads its own copy first (Cache Storage, or IndexedDB where there's none) before the network, so an app update, a
// reload, or a browser without the service worker (Chrome and app web views on iOS - Vider) doesn't download it again.
// Older versions' copies are deleted once a new one is kept. The notes panel's sources (data/notes/<id>.db:
// pipeline/notes.py) are opened the same way, each only once it's picked, kept per source and version beside it.

/** The database's version, set by build.mjs from its contents: a new database gets a new URL (and cache). */
declare const DB_VERSION: string;

export type Row = Record<string, string | number | null>;

export interface Db {
  /** Every row of a query, each an object keyed by column name; params bind to the ?s in order. */
  all (sql: string, params?: (string | number)[]): Row[];
  /** Frees it (a notes source swapped for another). */
  close (): void;
}

// (Loaded at run time, not bundled: sqlite3.mjs finds sqlite3.wasm beside itself. Started once, shared by every file.)
let sqlite: Promise<any> | null = null;
const sqliteUrl = "./sqlite/sqlite3.mjs";
const loadSqlite = () => sqlite ??= import (sqliteUrl).then ((m) => m.default ({ print: () => {}, printErr: console.error }));

/** A database file's bytes opened in memory, read only. */
function open (sqlite3: any, bytes: Uint8Array): Db {
  const db = new sqlite3.oo1.DB ();
  const p = sqlite3.wasm.allocFromTypedArray (bytes);
  const { capi } = sqlite3;
  // FREEONCLOSE: SQLite owns the copy; READONLY: the reader never writes to it.
  db.checkRc (capi.sqlite3_deserialize (db.pointer, "main", p, bytes.byteLength, bytes.byteLength,
                                        capi.SQLITE_DESERIALIZE_FREEONCLOSE | capi.SQLITE_DESERIALIZE_READONLY));
  return {
    all: (sql, params = []) => db.exec ({ sql, bind: params, rowMode: "object", returnValue: "resultRows" }),
    close: () => db.close (),
  };
}

/** Downloads (or reads from the cache) and opens the database; onProgress gets 0-1 as it arrives. */
export async function openDb (onProgress: (fraction: number) => void): Promise<Db> {
  const [sqlite3, bytes] = await Promise.all ([loadSqlite (),
    kept (`data/cotext.db?v=${DB_VERSION}`, "cotext-data-", DB_VERSION, onProgress)]);
  return open (sqlite3, bytes);
}

/** A notes source's file (note_sources: its file and version), downloaded once and kept like the main database. */
export async function openNotesDb (id: string, file: string, version: string, onProgress: (fraction: number) => void): Promise<Db> {
  const [sqlite3, bytes] = await Promise.all ([loadSqlite (),
    kept (`${file}?v=${version}`, `cotext-notes-${id}-`, version, onProgress)]);
  return open (sqlite3, bytes);
}

/** A file's bytes: the device's copy of this version if there is one, else downloaded and kept. Cache Storage first
 *  (a cache per file and version, named prefix + version - the main database's "cotext-data-" + its version is the
 *  one the service worker reads too: public/sw.js), IndexedDB where there's no Cache Storage (keyed the same way);
 *  neither (a private window): just downloaded. A new version's copy kept, the same prefix's older ones are deleted. */
async function kept (url: string, prefix: string, version: string, onProgress: (fraction: number) => void): Promise<Uint8Array> {
  const name = prefix + version, key = new URL (url, location.href).href;
  try {
    const cache = await caches.open (name);
    const hit = await cache.match (key);
    if (hit) { onProgress (1); return new Uint8Array (await hit.arrayBuffer ()); }
    const bytes = await download (url, onProgress);
    await cache.put (key, new Response (bytes, { headers: { "Content-Type": "application/octet-stream" } }));
    for (const k of await caches.keys ()) if (k.startsWith (prefix) && k !== name) await caches.delete (k);
    return bytes;
  } catch { /* no Cache Storage: IndexedDB below */ }
  try {
    // (The main database's key is its bare version, as before; a notes file's its prefix + version.)
    const db = await idb (), main = prefix === "cotext-data-", k = main ? version : name;
    const hit = await idbGet (db, k);
    if (hit) { onProgress (1); return hit; }
    const bytes = await download (url, onProgress);
    await idbReplace (db, k, bytes, (old) => main ? ! old.startsWith ("cotext-notes-") : old.startsWith (prefix));
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
/** Keeps this version's bytes, the older versions' (the keys isOld picks: the same file's) deleted. */
function idbReplace (db: IDBDatabase, k: string, bytes: Uint8Array, isOld: (key: string) => boolean): Promise<void> {
  return new Promise ((ok, fail) => {
    const t = db.transaction ("db", "readwrite"), store = t.objectStore ("db");
    const keys = store.getAllKeys ();
    keys.onsuccess = () => {
      for (const old of keys.result) if (typeof old === "string" && old !== k && isOld (old)) store.delete (old);
      store.put (bytes, k);
    };
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
