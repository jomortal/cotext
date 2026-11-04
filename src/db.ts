// The database: public/data/cotext.db (built by pipeline/build_db.py) and the notes panel's and lexicons' files
// (data/notes/<id>.db: pipeline/notes.py...), each opened only once it's needed. SQLite runs in a worker
// (dbworker.ts; what it does with the files - kept in OPFS and opened where they lie, or the old way in memory - is
// dbserver.ts'), so every query is asked for and answered by message: all () returns a promise. Where no worker starts
// the same server runs in the page (without OPFS: the old way).

/** The database's version, set by build.mjs from its contents: a new database gets a new URL (and file). */
declare const DB_VERSION: string;
/** The worker's script, its address with its content's hash (build.mjs): a new build's never an old copy. */
declare const DB_WORKER: string;

import { serve, type Request, type Reply } from "./dbserver";

export type Row = Record<string, string | number | null>;

export interface Db {
  /** Every row of a query, each an object keyed by column name; params bind to the ?s in order. */
  all (sql: string, params?: (string | number)[]): Promise<Row[]>;
  /** Frees it (a notes source swapped for another). */
  close (): void;
}

// The requests waiting for their answer, by id (each kept whole: resent to the page's own server if the worker fails
// to start).
type Waiting = { req: Request; ok: (v: any) => void; fail: (e: Error) => void; progress?: (p: number) => void };
const waiting = new Map<number, Waiting> ();
let nextId = 1;
function receive (r: Reply) {
  const w = waiting.get (r.id);
  if (! w) return;
  if ("progress" in r) { w.progress?. (r.progress); return; }
  waiting.delete (r.id);
  if ("error" in r) w.fail (new Error (r.error)); else w.ok (r.result);
}
const inPage = (req: Request) => { serve (req, receive); };
let send: (req: Request) => void = inPage;
// The worker, started as the app loads (the main database opens at once). If it fails to start (an error before any
// answer), everything sent is resent to the page's own server.
try {
  const worker = new Worker (DB_WORKER, { type: "module" });
  let answered = false;
  worker.addEventListener ("message", (e: MessageEvent<Reply>) => { answered = true; receive (e.data); });
  worker.addEventListener ("error", () => {
    if (answered) return;
    send = inPage;
    for (const w of waiting.values ()) inPage (w.req);
  });
  send = (req) => worker.postMessage (req);
} catch { /* no module workers: the page's own */ }

function ask<T> (req: Omit<Request, "id">, progress?: (p: number) => void): Promise<T> {
  return new Promise ((ok, fail) => {
    const full = { ...req, id: nextId++ } as Request;
    waiting.set (full.id, { req: full, ok, fail, progress });
    send (full);
  });
}

/** A file opened (url; kept under prefix + version), as a Db; onProgress gets 0-1 as it arrives. */
async function openFile (url: string, prefix: string, version: string, onProgress: (fraction: number) => void): Promise<Db> {
  const db = await ask<number> ({ op: "open", url, prefix, version }, onProgress);
  return {
    all: (sql, params = []) => ask<Row[]> ({ op: "all", db, sql, params }),
    close: () => { ask ({ op: "close", db }).catch (() => {}); },
  };
}

/** Opens the database - downloaded the first time (and for each new version), then kept; onProgress gets 0-1 as it
 *  arrives. */
export function openDb (onProgress: (fraction: number) => void): Promise<Db> {
  return openFile (`data/cotext.db?v=${DB_VERSION}`, "cotext-data-", DB_VERSION, onProgress);
}

/** A notes source's file (note_sources: its file and version), downloaded once and kept like the main database. */
export function openNotesDb (id: string, file: string, version: string, onProgress: (fraction: number) => void): Promise<Db> {
  return openFile (`${file}?v=${version}`, `cotext-notes-${id}-`, version, onProgress);
}
