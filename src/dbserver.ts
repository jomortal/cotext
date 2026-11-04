// The database server: opens COTEXT's database files in SQLite WebAssembly (public/sqlite/, the official build) and
// answers their queries - in a Worker (dbworker.ts), or in the page itself where no worker starts (db.ts sends the
// same messages either way). A file (the main database data/cotext.db, or a notes / lexicon file data/notes/<id>.db)
// is one version of it, named prefix + version: "cotext-data-" + the database's version, "cotext-notes-<id>-" + the
// file's (db.ts).
//
// - OPFS (the browser's private file system, through SQLite's "opfs-sahpool" VFS - Safari 16.4+ and iOS, Chrome,
//   Firefox; a worker only, no special headers): each file is downloaded once, streamed straight into its OPFS file
//   (never held whole in memory), then opened where it lies, read only - so a launch opens the text at once, reading
//   only the pages a query needs. A device that kept it in Cache Storage before (the old way, below) has it copied
//   across from there instead of downloaded. Once a new version is in place the same file's older versions are
//   deleted, and its Cache Storage copies too.
// - Otherwise (no OPFS - an old browser, a private window, the page without a worker): the old way - the whole file
//   read into memory and opened there, kept on the device in Cache Storage (IndexedDB where there's none; neither:
//   just downloaded), a version's copy replacing the older ones. Where OPFS is there but held by another tab of the
//   app (its files are one tab's at a time), that tab's files can't be read: the file is downloaded into memory,
//   not kept again.

/** A message to the server: open a file (url, its kept name's prefix and version), run a query on an open one (its
 *  handle), or close one. Each answered by its id. */
export type Request = { id: number; op: "open"; url: string; prefix: string; version: string }
                    | { id: number; op: "all"; db: number; sql: string; params: (string | number)[] }
                    | { id: number; op: "close"; db: number };
/** The answer: an open's handle, a query's rows, an error's message - or, while a file arrives, its progress (0-1). */
export type Reply = { id: number; progress: number } | { id: number; result: unknown } | { id: number; error: string };

// (Loaded at run time, not bundled: sqlite3.mjs finds sqlite3.wasm beside itself.)
const sqliteUrl = "./sqlite/sqlite3.mjs";

/** SQLite, and the OPFS pool: null where there's none ("none": no OPFS, "busy": another tab holds it). */
let started: Promise<{ sqlite3: any; pool: any; why: "" | "none" | "busy" }> | null = null;
const start = () => started ??= (async () => {
  const sqlite3 = await (await import (sqliteUrl)).default ({ print: () => {}, printErr: console.error });
  const [pool, why] = await installPool (sqlite3);
  return { sqlite3, pool, why };
}) ();

/** The pool of OPFS files ("cotext" in OPFS). Its files are held open by one worker at a time: just after a reload
 *  the old page's worker may still be letting go, so a held pool is tried again for 3 s before giving up. */
async function installPool (sqlite3: any): Promise<[any, "" | "none" | "busy"]> {
  if (! (globalThis as any).FileSystemFileHandle?.prototype?.createSyncAccessHandle) return [null, "none"];     // (Worker-only: the page itself has none)
  for (let tries = 0; ; tries++) {
    try {
      return [await sqlite3.installOpfsSAHPoolVfs ({ name: "cotext", directory: ".cotext", initialCapacity: 4, verbosity: 0,
                                                     // (A failed start keeps the files - by default it deletes them all - and may be tried again)
                                                     preserveOnInitFailure: true, forceReinitIfPreviouslyFailed: true }), ""];
    } catch (e) {
      const held = e instanceof DOMException && (e.name === "NoModificationAllowedError" || e.name === "InvalidStateError");
      if (! held) return [null, "none"];     // (A private window's OPFS, or another failure: the old way)
      if (tries >= 15) return [null, "busy"];
      await new Promise ((ok) => setTimeout (ok, 200));
    }
  }
}

const open = new Map<number, any> ();     // (The open databases, by handle)
let nextHandle = 1;
/** The OPFS files being filled, one at a time: the pool gives each new file its next free slot only once it's whole,
 *  so two filled at once would take the same slot. */
let filling: Promise<unknown> = Promise.resolve ();

/** Answers one request (reply: its answer, and an open's progress on the way). */
export async function serve (req: Request, reply: (r: Reply) => void) {
  try {
    const { sqlite3, pool, why } = await start ();
    if (req.op === "all") {
      reply ({ id: req.id, result: open.get (req.db).exec ({ sql: req.sql, bind: req.params, rowMode: "object", returnValue: "resultRows" }) });
    } else if (req.op === "close") {
      open.get (req.db)?.close ();
      open.delete (req.db);
      reply ({ id: req.id, result: true });
    } else {
      const progress = (p: number) => reply ({ id: req.id, progress: p });
      let db;
      if (pool) {
        const name = `/${req.prefix}${req.version}.db`;
        if (! pool.getFileNames ().includes (name)) {
          const done = filling.then (() => pool.getFileNames ().includes (name) || fill (pool, name, req, progress));
          filling = done.catch (() => {});
          await done;
        }
        db = new pool.OpfsSAHPoolDb (name, "r");     // (Read only: no journal, nothing written)
        db.exec ("PRAGMA cache_size = -16000; PRAGMA temp_store = MEMORY");     // (16 MB of pages kept: a page read again needn't come from the file)
      } else {
        db = inMemory (sqlite3, await (why === "none" ? kept (req, progress) : download (req.url, progress)));
      }
      progress (1);
      const handle = nextHandle++;
      open.set (handle, db);
      reply ({ id: req.id, result: handle });
    }
  } catch (e) {
    reply ({ id: req.id, error: String ((e as Error)?.message ?? e) });
  }
}

/** Streams a file into its OPFS file (name) - from the device's old Cache Storage copy if it has one, else
 *  downloaded - checked whole against its own header (its pages times their size: a cut-off download is never kept),
 *  then deletes the file's older versions, in OPFS and in Cache Storage. */
async function fill (pool: any, name: string, req: Extract<Request, { op: "open" }>, progress: (p: number) => void) {
  if (pool.getFileCount () >= pool.getCapacity ()) await pool.addCapacity (2);     // (A slot per file: two more when they're all used)
  const { body, total } = await source (req);
  const reader = body.getReader ();
  let got = 0, size = 0;
  await pool.importDb (name, async () => {
    const { done, value } = await reader.read ();
    if (done) return undefined;
    if (got === 0 && value.byteLength >= 32) {     // (The header: page size at 16 - 1 for 65,536 - and page count at 28)
      const v = new DataView (value.buffer, value.byteOffset, value.byteLength);
      size = ((v.getUint16 (16) === 1 ? 65536 : v.getUint16 (16)) * v.getUint32 (28));
    }
    got += value.byteLength;
    if (total) progress (Math.min (1, got / total));
    return value;
  });
  if (size && got !== size) { pool.unlink (name); throw new Error (`The database couldn't be loaded (${got} of ${size} bytes).`); }
  for (const f of pool.getFileNames ()) if (f.startsWith (`/${req.prefix}`) && f !== name) pool.unlink (f);
  try { for (const k of await caches.keys ()) if (k.startsWith (req.prefix)) await caches.delete (k); } catch { /* no Cache Storage */ }
}

/** A file's bytes as a stream, and their length if known: the old Cache Storage copy (db.ts' caches before OPFS,
 *  or the service worker's for the main database), else the network. */
async function source (req: Extract<Request, { op: "open" }>): Promise<{ body: ReadableStream<Uint8Array>; total: number }> {
  try {
    const name = req.prefix + req.version;
    const hit = (await caches.has (name)) && await (await caches.open (name)).match (new URL (req.url, location.href).href);
    if (hit && hit.body) return { body: hit.body, total: Number (hit.headers.get ("Content-Length")) || 0 };
  } catch { /* no Cache Storage */ }
  const res = await fetch (req.url);
  if (! res.ok || ! res.body) throw new Error (`The database couldn't be loaded (${res.status}).`);
  return { body: res.body, total: Number (res.headers.get ("Content-Length")) || 0 };
}

//==== WITHOUT OPFS ====

/** A database file's bytes opened in memory, read only. */
function inMemory (sqlite3: any, bytes: Uint8Array) {
  const db = new sqlite3.oo1.DB ();
  const p = sqlite3.wasm.allocFromTypedArray (bytes);
  const { capi } = sqlite3;
  // FREEONCLOSE: SQLite owns the copy; READONLY: the reader never writes to it.
  db.checkRc (capi.sqlite3_deserialize (db.pointer, "main", p, bytes.byteLength, bytes.byteLength,
                                        capi.SQLITE_DESERIALIZE_FREEONCLOSE | capi.SQLITE_DESERIALIZE_READONLY));
  return db;
}

/** A file's bytes: the device's copy of this version if there is one, else downloaded and kept. Cache Storage first
 *  (a cache per file and version, named prefix + version), IndexedDB where there's no Cache Storage (keyed the same
 *  way); neither (a private window): just downloaded. A new version's copy kept, the same prefix's older ones are
 *  deleted. */
async function kept (req: Extract<Request, { op: "open" }>, onProgress: (fraction: number) => void): Promise<Uint8Array> {
  const { url, prefix, version } = req;
  const name = prefix + version, key = new URL (url, location.href).href;
  try {
    const cache = await caches.open (name);
    const hit = await cache.match (key);
    if (hit) return new Uint8Array (await hit.arrayBuffer ());
    const bytes = await download (url, onProgress);
    await cache.put (key, new Response (bytes, { headers: { "Content-Type": "application/octet-stream" } }));
    for (const k of await caches.keys ()) if (k.startsWith (prefix) && k !== name) await caches.delete (k);
    return bytes;
  } catch { /* no Cache Storage: IndexedDB below */ }
  try {
    // (The main database's key is its bare version, as before; a notes file's its prefix + version.)
    const db = await idb (), main = prefix === "cotext-data-", k = main ? version : name;
    const hit = await idbGet (db, k);
    if (hit) return hit;
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

/** The file's bytes in memory, reporting progress when the server gives its length. */
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
    if (total) onProgress (Math.min (1, got / total));
  }
  const out = new Uint8Array (got);
  let at = 0;
  for (const c of chunks) { out.set (c, at); at += c.byteLength; }
  return out;
}
