// COTEXT's start: opens the database, then shows a chapter - the one in the address (#Gen.1, #Jhn.1), else the last
// one read (kept in localStorage), else Genesis 1. The heading's ‹ and › step through chapters (across books), its
// middle button opens the picker.

import { openDb, type Db } from "./db";
import { chapterWords, showChapter, type Book } from "./reader";
import { showPanel, hidePanel } from "./panel";
import { openPicker } from "./picker";

const status = document.getElementById ("status")!;
const chapterEl = document.getElementById ("chapter")!;
const placeBtn = document.getElementById ("place")!;
const LAST = "cotext.last";

let db: Db;
let books: Book[] = [];
let book: Book;
let chapter = 1;

function go (b: Book, c: number) {
  book = b;
  chapter = c;
  hidePanel ();
  placeBtn.textContent = `${b.name} ${c}`;
  document.title = `${b.name} ${c} - COTEXT`;
  showChapter (chapterEl, b, c, chapterWords (db, b.id, c), (w, el) => showPanel (db, w, el));
  window.scrollTo (0, 0);
  const ref = `${b.code}.${c}`;
  history.replaceState (null, "", "#" + ref);
  try { localStorage.setItem (LAST, ref); } catch { /* private mode: not kept */ }
}

/** "Gen.1" -> that book and chapter, if it exists. */
function parseRef (ref: string | null): [Book, number] | null {
  const m = ref?.match (/^(\w+)\.(\d+)$/);
  const b = m && books.find ((x) => x.code === m[1]);
  return b && +m![2] >= 1 && +m![2] <= b.chapters ? [b, +m![2]] : null;
}

/** The chapter before (-1) or after (+1), across books; nothing past Genesis 1 or Revelation 22. */
function step (dir: number) {
  if (chapter + dir >= 1 && chapter + dir <= book.chapters) return go (book, chapter + dir);
  const next = books[books.indexOf (book) + dir];
  if (next) go (next, dir > 0 ? 1 : next.chapters);
}

async function start () {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register ("sw.js").catch (() => {});
  try {
    db = await openDb ((f) => { status.textContent = `Loading the text… ${Math.round (f * 100)}%`; });
  } catch (e) {
    status.textContent = String ((e as Error).message ?? e);
    return;
  }
  status.hidden = true;
  books = db.all ("SELECT id, code, name, testament, chapters FROM books ORDER BY id") as unknown as Book[];
  let last: string | null = null;
  try { last = localStorage.getItem (LAST); } catch { /* none */ }
  const [b, c] = parseRef (location.hash.slice (1)) ?? parseRef (last) ?? [books[0], 1];
  go (b, c);
  document.getElementById ("prev")!.addEventListener ("click", () => step (-1));
  document.getElementById ("next")!.addEventListener ("click", () => step (1));
  placeBtn.addEventListener ("click", () => openPicker (books, go));
  window.addEventListener ("hashchange", () => { const r = parseRef (location.hash.slice (1)); if (r) go (...r); });
}

start ();
