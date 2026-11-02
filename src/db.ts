// The database: public/data/cotext.db (built by pipeline/build_db.py) opened in memory in the official SQLite
// WebAssembly build (public/sqlite/, vendored from sqlite.org). The service worker keeps the file for offline use, so
// it downloads once per database version.

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
  const [sqlite3, bytes] = await Promise.all ([init ({ print: () => {}, printErr: console.error }),
                                               download (url, onProgress)]);
  keepOffline (url, bytes);
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

/** On the first visit the service worker isn't yet in charge of the page, so the page caches the database itself -
 *  in the cache the worker reads it from (public/sw.js: "cotext-data-" + its version). */
async function keepOffline (url: string, bytes: Uint8Array) {
  try {
    const cache = await caches.open (`cotext-data-${DB_VERSION}`);
    if (! await cache.match (url))
      await cache.put (new URL (url, location.href).href, new Response (bytes, { headers: { "Content-Type": "application/octet-stream" } }));
  } catch { /* no Cache Storage (private mode, plain http): it downloads again next time */ }
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
