// The search pane: the icon at the play bar's right opens and closes it (or its ✕). Built as the notes panel is
// (layout.ts' paneFrame: the same frame, ✕ and top row - here a search bar): on a narrow screen in the page's column
// above the play bar, on a wide one a column at the right, full height (layout.ts).
// - For now it finds one thing: a root word, from a word's panel's "Search" (panel.ts) - the dictionary form put in
//   the search bar, and every verse of the word's testament (the Hebrew OT, the NT, or the Septuagint's books the
//   list shows) with a word of that root (the same Strong's number), counted, each its reference and the verse's
//   original text with the root's words in the accent; tapping one goes to that verse (main.ts). Typing in the bar
//   does nothing yet: typed search is still to be defined (the user's).
// - The query: freq (strong, book) gives the books the root occurs in, and only those books' words are read, by their
//   key (book, ...) - the verses' places only, counted; then the results drawn CHUNK at a time as the list scrolls to
//   its end, each chunk's verses' words read by their key - so thousands show at once.

import type { Db, Row } from "./db";
import type { Book } from "./reader";
import { paneFrame } from "./layout";

const pane = document.getElementById ("search")!;
const btn = document.getElementById ("searchBtn")!;
const bar = document.getElementById ("searchBar") as HTMLInputElement;
const countEl = document.getElementById ("searchCount")!;
const hitsEl = document.getElementById ("searchHits")!;
const scroll = paneFrame (pane, document.getElementById ("searchClose")!);

let db: Db | null = null;
let books = new Map<number, Book> ();
let goVerse: (book: Book, chapter: number, verse: number) => void = () => {};

/** main.ts, once the books are read: the database, the books, and how to go to a verse. */
export function initSearch (d: Db, bs: Book[], go: (book: Book, chapter: number, verse: number) => void) {
  db = d; books = new Map (bs.map ((b) => [b.id, b])); goVerse = go;
}

/** Opened or closed (the icon, its ✕). */
function setOpen (open: boolean) {
  pane.hidden = ! open;
  btn.setAttribute ("aria-pressed", String (open));
}
btn.addEventListener ("click", () => setOpen (pane.hidden));
document.getElementById ("searchClose")!.addEventListener ("click", () => setOpen (false));

// (Each search numbered: one still arriving when another starts isn't shown)
let searching = 0;
// The verses with a word of the root: in the testament's books it occurs in (freq; the Septuagint's only those the
// book list shows - books.heb), in the book list's order.
const HITS = `SELECT DISTINCT w.book, w.chapter, w.verse FROM freq f JOIN books b ON b.id = f.book
                JOIN words w ON w.book = b.id AND w.strong = f.strong
              WHERE f.strong = ?1 AND b.testament = ?2 AND (b.testament <> 'LXX' OR b.heb > 0)
              ORDER BY CASE WHEN b.testament = 'LXX' THEN b.heb ELSE b.id END, b.id, w.chapter, w.verse`;
interface Hit { book: number; chapter: number; verse: number; }

/** A word's panel's Search (panel.ts): the pane opened, lemma in the bar, the verses of testament ('OT', 'NT' or
 *  'LXX') with a word of the root strong listed. */
export async function searchRoot (strong: string, lemma: string, testament: string) {
  setOpen (true);
  bar.value = lemma;
  bar.dir = strong.startsWith ("H") ? "rtl" : "ltr";
  const n = ++searching;
  countEl.textContent = "Searching…";
  hitsEl.textContent = "";
  scroll.scrollTop = 0;
  if (! db) return;
  const hits = await db.all (HITS, [strong, testament]) as unknown as Hit[];
  if (n !== searching) return;
  countEl.textContent = `${hits.length.toLocaleString ("en-US")} ${hits.length === 1 ? "verse" : "verses"}`;
  draw (hits, strong, n);
}

const CHUNK = 100;
/** The results drawn CHUNK at a time, each chunk's verses read as it's drawn (their words by their key): the next
 *  once the last drawn comes near the view (an observer on it). */
async function draw (hits: Hit[], strong: string, n: number, from = 0) {
  const chunk = hits.slice (from, from + CHUNK);
  if (! chunk.length || ! db) return;
  const words = await db.all (`SELECT book, chapter, verse, text, strong FROM words
                               WHERE (book, chapter, verse) IN (VALUES ${chunk.map (() => "(?,?,?)").join (",")})
                               ORDER BY book, chapter, verse, word`, chunk.flatMap ((h) => [h.book, h.chapter, h.verse]));
  if (n !== searching) return;
  const byVerse = new Map<string, Row[]> ();
  for (const w of words) { const k = `${w.book}.${w.chapter}.${w.verse}`; (byVerse.get (k) ?? byVerse.set (k, []).get (k)!).push (w); }
  const hebrew = strong.startsWith ("H");
  for (const h of chunk) {
    const row = document.createElement ("button");
    row.className = "hit";
    const b = books.get (h.book);
    const ref = document.createElement ("span");
    ref.className = "src";
    ref.textContent = `${b?.name ?? ""} ${h.chapter}:${h.verse}`;
    const text = document.createElement ("span");
    text.className = "hitText " + (hebrew ? "he" : "gr");
    text.dir = hebrew ? "rtl" : "ltr";
    (byVerse.get (`${h.book}.${h.chapter}.${h.verse}`) ?? []).forEach ((w, i) => {
      if (i) text.append (" ");
      const s = document.createElement ("span");
      if (w.strong === strong) s.className = "hitWord";     // (The root's words: in the accent)
      s.textContent = String (w.text);
      text.append (s);
    });
    row.append (ref, text);
    row.addEventListener ("click", () => { if (b) goVerse (b, h.chapter, h.verse); });
    hitsEl.append (row);
  }
  if (from + CHUNK >= hits.length) return;
  const watch = new IntersectionObserver (([e]) => {
    if (! e.isIntersecting) return;
    watch.disconnect ();
    if (n === searching) draw (hits, strong, n, from + CHUNK);
  }, { root: scroll, rootMargin: "400px" });
  watch.observe (hitsEl.lastElementChild!);
}
