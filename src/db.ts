// The database: the main one, data/db/<part>.db (pipeline/split_db.py splits it by what changes together, so an
// update downloads only the parts that changed), and the notes panel's and lexicons' files (data/notes/<id>.db:
// pipeline/notes.py...), each opened only once it's needed. SQLite runs in a worker (dbworker.ts; what it does with
// the files - kept in OPFS and opened where they lie, or the old way in memory; an older version kept opened at once
// while the new one comes in the background - is dbserver.ts'), so every query is asked for and answered by message:
// all () returns a promise. Where no worker starts the same server runs in the page (without OPFS: the old way).

/** The main database's parts, set by build.mjs: core first (the main schema), each with its version (a hash of its
 *  bytes: a new one gets a new URL and file) and size. */
declare const DB_FILES: { part: string; version: string; bytes: number }[];
/** The worker's script, its address with its content's hash (build.mjs): a new build's never an old copy. */
declare const DB_WORKER: string;

import { serve, type DbFile, type Request, type Reply } from "./dbserver";

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

/** A set of files opened as one database (dbserver.ts' open), as a Db; onProgress gets 0-1 as they arrive. */
async function openFiles (files: DbFile[], onProgress: (fraction: number) => void, more: { legacy?: string; setup?: string } = {}): Promise<Db> {
  const db = await ask<number> ({ op: "open", files, ...more }, onProgress);
  return {
    all: (sql, params = []) => ask<Row[]> ({ op: "all", db, sql, params }),
    close: () => { ask ({ op: "close", db }).catch (() => {}); },
  };
}

/** The words, split by testament (ot.words, nt.words, lxx.words: split_db.py), as one table again - a temporary view
 *  named words, found before any table of that name - so every query reads them as before. A query's constraints on
 *  words' own columns reach into each testament's table (its key: book, chapter, verse, word); a join's from another
 *  table don't (the view is read whole first), so a query joining words is written with its constraints on words'
 *  columns (search.ts' root search). */
const WORDS_VIEW = "CREATE TEMP VIEW words AS SELECT * FROM ot.words UNION ALL SELECT * FROM nt.words UNION ALL SELECT * FROM lxx.words";

/** Opens the main database - its parts, each downloaded the first time and for each new version (only that part),
 *  then kept; one kept from before is opened at once while its new version comes in the background (dbserver.ts).
 *  core is the main schema, the others attached under their part's name. onProgress gets 0-1 as they arrive. */
export function openDb (onProgress: (fraction: number) => void): Promise<Db> {
  const files = DB_FILES.map ((f, i) => ({ schema: i === 0 ? "main" : f.part, url: `data/db/${f.part}.db?v=${f.version}`,
                                            prefix: `cotext-data-${f.part}-`, version: f.version, bytes: f.bytes }));
  // (legacy: the whole database as kept before the split, "cotext-data-" + its version)
  return openFiles (files, onProgress, { legacy: "cotext-data-", setup: WORDS_VIEW });
}

/** A notes source's file (note_sources: its file and version), downloaded once and kept like the main database's
 *  parts. */
export function openNotesDb (id: string, file: string, version: string, onProgress: (fraction: number) => void): Promise<Db> {
  return openFiles ([{ schema: "main", url: `${file}?v=${version}`, prefix: `cotext-notes-${id}-`, version }], onProgress);
}
