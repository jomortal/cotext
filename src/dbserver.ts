// The database server: opens COTEXT's database files in SQLite WebAssembly (public/sqlite/, the official build) and
// answers their queries - in a Worker (dbworker.ts), or in the page itself where no worker starts (db.ts sends the
// same messages either way). An open is a set of files under one connection: the main database's parts
// (data/db/<part>.db - core the main schema, the others ATTACHed under their part's name: db.ts), or one notes /
// lexicon file (data/notes/<id>.db). Each file is one version of it, kept on the device under its prefix + version
// ("cotext-data-<part>-" + the part's version, "cotext-notes-<id>-" + the file's: db.ts).
//
// Never waiting on an update: a file whose kept version is older than the one asked for is opened as it is (the
// text shows at once) and the new version is fetched in the background, kept beside the old one; the next open (the
// next start) uses it and deletes the old. The switch waits for the next start rather than being made at once
// because the page keeps what it has read (the books, the notes' sources and their versions, the chapter shown, the
// helps' counts): a swap under it could mix two versions' rows, while the next start reads everything afresh from
// one. Only a file with no version on the device is downloaded before it opens (its progress reported). A device
// that still has the main database whole (before it was split: "cotext-data-" + a version) opens that until every
// part has some version kept - all fetched in the background - then deletes it.
//
// - OPFS (the browser's private file system, through SQLite's "opfs-sahpool" VFS - Safari 16.4+ and iOS, Chrome,
//   Firefox; a worker only, no special headers): each file is downloaded once, streamed straight into its OPFS file
//   (never held whole in memory), then opened where it lies, read only - so a launch opens the text at once, reading
//   only the pages a query needs. The parts are ATTACHed by their pool names: an attached file opens through the
//   connection's own VFS (the pool), read only as the main one is. A device that kept a file in Cache Storage before
//   (the old way, below) has it copied across from there instead of downloaded.
// - Otherwise (no OPFS - an old browser, a private window, the page without a worker): the old way - each file read
//   whole into memory and opened there (the parts deserialized into attached in-memory schemas), kept on the device
//   in Cache Storage (IndexedDB where there's none; neither: just downloaded). Where OPFS is there but held by
//   another tab of the app (its files are one tab's at a time), that tab's files can't be read: each file is
//   downloaded into memory, not kept again.

/** A file of an open: its schema ("main" for the first, else the name it's attached under), its address, the name
 *  its versions are kept under (prefix + version) and, if known, its size in bytes (for the progress over several;
 *  else the download's own length). */
export interface DbFile { schema: string; url: string; prefix: string; version: string; bytes?: number; }
/** A message to the server: open a set of files as one database (legacy: the prefix of an older whole file that can
 *  stand in for all of them; setup: SQL run once the set itself is open, not on the legacy file - its temporary
 *  views), run a query on an open one (its handle), or close one. Each answered by its id. */
export type Request = { id: number; op: "open"; files: DbFile[]; legacy?: string; setup?: string }
                    | { id: number; op: "all"; db: number; sql: string; params: (string | number)[] }
                    | { id: number; op: "close"; db: number };
/** The answer: an open's handle, a query's rows, an error's message - or, while files arrive, the progress (0-1). */
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
      return [await sqlite3.installOpfsSAHPoolVfs ({ name: "cotext", directory: ".cotext", initialCapacity: 8, verbosity: 0,
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

const open = new Map<number, { db: any; names: string[] }> ();     // (The open databases by handle, each with the kept files it reads)
let nextHandle = 1;
/** Whether a kept file (its kept name) is read by an open database: never deleted while it is. */
const inUse = (name: string) => [...open.values ()].some ((o) => o.names.includes (name));
let store: Promise<Store> | null = null;     // (Where the files are kept: chosen once)

/** Answers one request (reply: its answer, and an open's progress on the way). */
export async function serve (req: Request, reply: (r: Reply) => void) {
  try {
    const { sqlite3, pool, why } = await start ();
    if (req.op === "all") {
      reply ({ id: req.id, result: open.get (req.db)!.db.exec ({ sql: req.sql, bind: req.params, rowMode: "object", returnValue: "resultRows" }) });
    } else if (req.op === "close") {
      open.get (req.db)?.db.close ();
      open.delete (req.db);
      reply ({ id: req.id, result: true });
    } else {
      const progress = (p: number) => reply ({ id: req.id, progress: p });
      store ??= pool ? Promise.resolve (opfsStore (pool)) : why === "none" ? keptStore () : Promise.resolve (memoryStore (noBytes));
      const { db, names } = await openSet (sqlite3, await store, req, progress);
      progress (1);
      const handle = nextHandle++;
      open.set (handle, { db, names });
      reply ({ id: req.id, result: handle });
    }
  } catch (e) {
    reply ({ id: req.id, error: String ((e as Error)?.message ?? e) });
  }
}

//==== CHOOSING THE VERSIONS ====

/** Where files are kept, by kept name (prefix + version): OPFS, Cache Storage / IndexedDB, or nowhere. */
interface Store {
  /** Every kept name. */
  names (): Promise<string[]>;
  /** Fetches a file's version (f) and keeps it under name; progress (bytes so far, the download's length or 0) as it
   *  arrives. */
  fill (name: string, f: DbFile, progress: (got: number, length: number) => void): Promise<void>;
  /** Deletes a kept name. */
  remove (name: string): Promise<void>;
  /** Opens the set: the files' kept names, the first as the main schema, the others attached as their files' schemas. */
  connect (sqlite3: any, names: string[], files: DbFile[]): Promise<any>;
}

/** The kept name of a file's version. */
const keptName = (f: DbFile) => f.prefix + f.version;
/** Whether a kept name is some version of the file kept under prefix (a version is hex, so "cotext-data-" - the
 *  legacy whole file's - never matches "cotext-data-core-..."). */
const isVersionOf = (name: string, prefix: string) => name.startsWith (prefix) && /^[0-9a-f]+$/.test (name.slice (prefix.length));

/** Opens a set of files, choosing each one's version (above): the one asked for if kept, else any kept one (the new
 *  one fetched in the background), else downloaded first; or the legacy whole file while some part has none. Then
 *  deletes every other version of each file (and the legacy file once the parts are used) - none in use, none being
 *  fetched. */
async function openSet (sqlite3: any, store: Store, req: Extract<Request, { op: "open" }>, progress: (p: number) => void) {
  const kept = await store.names ();
  const chosen: (string | null)[] = req.files.map ((f) => kept.includes (keptName (f)) ? keptName (f) : kept.find ((n) => isVersionOf (n, f.prefix)) ?? null);
  const behind = req.files.filter ((f, i) => chosen[i] !== null && chosen[i] !== keptName (f));     // (An older version kept)
  const missing = req.files.filter ((_, i) => chosen[i] === null);
  const legacy = req.legacy ? kept.find ((n) => isVersionOf (n, req.legacy!)) : undefined;
  if (legacy && missing.length) {
    // The whole database stands in until every part has some version kept: all fetched in the background
    for (const f of [...behind, ...missing]) background (store, f);
    return { db: await store.connect (sqlite3, [legacy], [{ ...req.files[0], schema: "main" }]), names: [legacy] };
  }
  // The files with no version kept, downloaded now - one after another, the progress over all of them (by their
  // sizes if known, else each download's own)
  const total = missing.every ((f) => f.bytes) ? missing.reduce ((n, f) => n + f.bytes!, 0) : 0;
  let before = 0;
  for (const f of missing) {
    await queued (store, f, true, (got, length) => {
      if (total) progress (Math.min (1, (before + got) / total)); else if (length) progress (Math.min (1, got / length));
    });
    before += f.bytes ?? 0;
    chosen[req.files.indexOf (f)] = keptName (f);
  }
  for (const f of behind) background (store, f);
  const names = chosen as string[];
  const db = await store.connect (sqlite3, names, req.files);
  if (req.setup) db.exec (req.setup);
  // The versions not opened (older ones, the legacy whole file) deleted - a newer one fetched for the next open kept
  const wanted = new Set (behind.map (keptName));
  for (const n of await store.names ())
    if (! names.includes (n) && ! wanted.has (n) && ! inUse (n)
        && (req.files.some ((f) => isVersionOf (n, f.prefix)) || (req.legacy && isVersionOf (n, req.legacy))))
      await store.remove (n).catch (() => {});
  return { db, names };
}

/** The files being fetched, one at a time (the OPFS pool gives each new file its next free slot only once it's
 *  whole, so two filled at once would take the same slot; and an open's own downloads get the bandwidth): those an
 *  open waits for first, then the background ones. Each by its kept name, so one asked for twice is fetched once. */
interface Job { fg: boolean; run: () => Promise<void>; done: Promise<void>; progress: (got: number, length: number) => void; }
const jobs: Job[] = [];
const fetching = new Map<string, Job> ();
let pumping = false;
/** A file's version fetched and kept (fg: an open waits for it - it goes before the background ones). */
function queued (store: Store, f: DbFile, fg: boolean, progress: (got: number, length: number) => void = () => {}): Promise<void> {
  const name = keptName (f);
  const was = fetching.get (name);
  if (was) {     // (Already queued or under way: waited for now, its progress reported here)
    if (fg) { was.fg = true; was.progress = progress; }
    return was.done;
  }
  let ok!: () => void, fail!: (e: unknown) => void;
  const job: Job = {
    fg, progress, done: new Promise<void> ((y, n) => { ok = y; fail = n; }),
    run: async () => {
      try { await store.fill (name, f, (got, length) => job.progress (got, length)); ok (); }
      catch (e) { fail (e); }
      finally { fetching.delete (name); }
    },
  };
  fetching.set (name, job);
  jobs.push (job);
  pump ();
  return job.done;
}
/** A file's new version fetched in the background, for the next open; a failure (offline) is tried again then. */
function background (store: Store, f: DbFile) { queued (store, f, false).catch (() => {}); }
async function pump () {
  if (pumping) return;
  pumping = true;
  while (jobs.length) {
    const i = Math.max (0, jobs.findIndex ((j) => j.fg));
    await jobs.splice (i, 1)[0].run ();
  }
  pumping = false;
}

//==== OPFS ====

/** The OPFS pool as a store: each kept name a pool file "/<name>.db". */
function opfsStore (pool: any): Store {
  const file = (name: string) => `/${name}.db`;
  return {
    names: async () => pool.getFileNames ().map ((n: string) => n.replace (/^\//, "").replace (/\.db$/, "")),
    fill: (name, f, progress) => fill (pool, file (name), f, progress),
    remove: async (name) => { pool.unlink (file (name)); },
    connect: async (_sqlite3, names, files) => {
      const db = new pool.OpfsSAHPoolDb (file (names[0]), "r");     // (Read only: no journal, nothing written)
      for (let i = 1; i < names.length; i++) db.exec (`ATTACH '${file (names[i])}' AS "${files[i].schema}"`);
      // (8 MB of pages kept per file - each fills only as it's read: a page read again needn't come from the file)
      for (const f of files.slice (0, names.length)) db.exec (`PRAGMA "${f.schema}".cache_size = -8000`);
      db.exec ("PRAGMA temp_store = MEMORY");
      return db;
    },
  };
}

/** Streams a file into its OPFS file (name) - from the device's old Cache Storage copy if it has one, else
 *  downloaded - checked whole against its own header (its pages times their size: a cut-off download is never kept);
 *  then deletes its Cache Storage copies (the old way's: it's in OPFS now). */
async function fill (pool: any, name: string, f: DbFile, progress: (got: number, length: number) => void) {
  if (pool.getFileCount () >= pool.getCapacity ()) await pool.addCapacity (2);     // (A slot per file: two more when they're all used)
  const { body, length } = await source (f);
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
    progress (got, length);
    return value;
  });
  if (size && got !== size) { pool.unlink (name); throw new Error (`The database couldn't be loaded (${got} of ${size} bytes).`); }
  try { for (const k of await caches.keys ()) if (isVersionOf (k, f.prefix)) await caches.delete (k); } catch { /* no Cache Storage */ }
}

/** A file's bytes as a stream, and their length if known: the old way's Cache Storage copy of this version, else the
 *  network. */
async function source (f: DbFile): Promise<{ body: ReadableStream<Uint8Array>; length: number }> {
  try {
    const hit = (await caches.has (keptName (f))) && (await (await caches.open (keptName (f))).matchAll ())[0];
    if (hit && hit.body) return { body: hit.body, length: Number (hit.headers.get ("Content-Length")) || 0 };
  } catch { /* no Cache Storage */ }
  const res = await fetch (f.url);
  if (! res.ok || ! res.body) throw new Error (`The database couldn't be loaded (${res.status}).`);
  return { body: res.body, length: Number (res.headers.get ("Content-Length")) || 0 };
}

//==== WITHOUT OPFS ====

/** The set opened in memory, read only: the first file's bytes as the main schema, each other's deserialized into an
 *  in-memory schema attached under its name. */
function inMemory (sqlite3: any, bytes: Uint8Array[], files: DbFile[]) {
  const db = new sqlite3.oo1.DB ();
  const { capi } = sqlite3;
  bytes.forEach ((b, i) => {
    const schema = i === 0 ? "main" : files[i].schema;
    if (i > 0) db.exec (`ATTACH ':memory:' AS "${schema}"`);
    const p = sqlite3.wasm.allocFromTypedArray (b);
    // FREEONCLOSE: SQLite owns the copy; READONLY: the reader never writes to it.
    db.checkRc (capi.sqlite3_deserialize (db.pointer, schema, p, b.byteLength, b.byteLength,
                                          capi.SQLITE_DESERIALIZE_FREEONCLOSE | capi.SQLITE_DESERIALIZE_READONLY));
  });
  return db;
}

/** Whole files' bytes by kept name: listed, read, kept, deleted. */
interface Bytes {
  names (): Promise<string[]>;
  get (name: string): Promise<Uint8Array | undefined>;
  put (name: string, url: string, b: Uint8Array): Promise<void>;
  remove (name: string): Promise<void>;
}

/** The old way's store: Cache Storage (a cache per kept name, the file under its address), else IndexedDB (a key per
 *  kept name), else nothing (a private window: each file downloaded, not kept). */
async function keptStore (): Promise<Store> {
  try { await caches.keys (); return memoryStore (cacheBytes); } catch { /* no Cache Storage */ }
  try { return memoryStore (idbBytes (await idb ())); } catch { return memoryStore (noBytes); }
}

/** A store keeping files whole in Bytes and opening them in memory. A file that couldn't be kept (or where nothing is
 *  kept) waits in memory for the open that asked for it. */
function memoryStore (b: Bytes): Store {
  const fresh = new Map<string, Uint8Array> ();
  return {
    names: () => b.names (),
    fill: async (name, f, progress) => {
      const bytes = await download (f.url, progress);
      try { await b.put (name, f.url, bytes); } catch { fresh.set (name, bytes); }
    },
    remove: (name) => b.remove (name),
    connect: async (sqlite3, names, files) => {
      const bytes = await Promise.all (names.map (async (n) => {
        const got = fresh.get (n) ?? await b.get (n);
        fresh.delete (n);
        if (! got) throw new Error ("The database couldn't be read.");
        return got;
      }));
      return inMemory (sqlite3, bytes, files);
    },
  };
}

/** Nowhere to keep anything (a private window, or OPFS held by another tab): every file downloaded each time. */
const noBytes: Bytes = { names: async () => [], get: async () => undefined, put: async () => { throw 0; }, remove: async () => {} };

const cacheBytes: Bytes = {
  names: () => caches.keys (),
  get: async (name) => {
    if (! await caches.has (name)) return undefined;
    const hit = (await (await caches.open (name)).matchAll ())[0];
    return hit ? new Uint8Array (await hit.arrayBuffer ()) : undefined;
  },
  put: async (name, url, b) => {
    await (await caches.open (name)).put (new URL (url, location.href).href,
                                          new Response (b, { headers: { "Content-Type": "application/octet-stream" } }));
  },
  remove: async (name) => { await caches.delete (name); },
};

function idb (): Promise<IDBDatabase> {
  return new Promise ((ok, fail) => {
    const r = indexedDB.open ("cotext", 1);
    r.onupgradeneeded = () => r.result.createObjectStore ("db");
    r.onsuccess = () => ok (r.result);
    r.onerror = () => fail (r.error);
  });
}
/** IndexedDB's "db" store as Bytes, a key per kept name - but for the whole main database's from before it was split,
 *  kept under its bare version: listed as the legacy "cotext-data-" + version, so it's read and deleted as that. */
function idbBytes (db: IDBDatabase): Bytes {
  const ask = <T> (mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>) => new Promise<T> ((ok, fail) => {
    const t = db.transaction ("db", mode), r = f (t.objectStore ("db"));
    t.oncomplete = () => ok (r.result);
    t.onerror = () => fail (t.error);
  });
  const key = new Map<string, string> ();     // (Each listed name's key)
  const keyOf = (name: string) => key.get (name) ?? name;
  return {
    names: async () => (await ask ("readonly", (s) => s.getAllKeys ())).map ((k) => {
      const name = String (k).startsWith ("cotext-") ? String (k) : "cotext-data-" + String (k);
      key.set (name, String (k));
      return name;
    }),
    get: async (name) => await ask ("readonly", (s) => s.get (keyOf (name))) as Uint8Array | undefined,
    put: async (name, _url, b) => { await ask ("readwrite", (s) => s.put (b, name)); },
    remove: async (name) => { await ask ("readwrite", (s) => s.delete (keyOf (name))); },
  };
}

/** The file's bytes in memory, reporting the bytes so far (and the download's length, or 0) as they arrive. */
async function download (url: string, progress: (got: number, length: number) => void): Promise<Uint8Array> {
  const res = await fetch (url);
  if (! res.ok || ! res.body) throw new Error (`The database couldn't be loaded (${res.status}).`);
  const length = Number (res.headers.get ("Content-Length")) || 0;
  const reader = res.body.getReader ();
  const chunks: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read ();
    if (done) break;
    chunks.push (value);
    got += value.byteLength;
    progress (got, length);
  }
  const out = new Uint8Array (got);
  let at = 0;
  for (const c of chunks) { out.set (c, at); at += c.byteLength; }
  return out;
}
