// The search pane: the icon at the play bar's right opens and closes it (or its ✕). Built as the notes panel is
// (layout.ts' paneFrame: the same frame, ✕ and top row - here the search bar, the picker of what's searched under it): on a
// narrow screen in the page's column above the play bar, on a wide one in the panes' column at the right, over the
// notes when they're open, else its full height (layout.ts).
// - The picker (a <select class="choose">, as the notes'): ROOT WORD, INTERLINEAR (ENGLISH) - the default - and the
//   notes' sources that are text (notes.ts' textSources: apparatus, commentaries, the dictionary, translations, ancient
//   versions - not the diagrams), grouped and named as the notes' picker has them, those for the whole Bible. The choice is kept per
//   Old Testament (Hebrew, Septuagint) on the device (cotext.search); a word's panel's Search sets it to ROOT WORD (not kept).
// - Every kind searches the whole Bible: the Old Testament read (the Hebrew Bible, or the Septuagint's books the list
//   shows - HEBREW / GREEK) and the New; a New Testament result tapped opens the Greek NT there.
// - What's typed is searched on Enter (the phone keyboard's search key), not on every key; picking another kind
//   searches the bar's text again. Every kind lists its results alike: counted, each a row - its reference over its
//   text, what matched in the accent - drawn CHUNK at a time as the list scrolls to its end; a row tapped goes to that
//   verse in the text (main.ts) - a source's too: the notes are left as they are (opening them on it is the reader's
//   choice, the user's call).
// - ROOT WORD: every verse of the Bible with a
//   word of the root (the same Strong's number), its original text, the root's words marked. From a word's panel's
//   "Search" (panel.ts) the root is the word's and the bar shows its dictionary form; typed, the dictionary forms
//   (lexicon.lemma, Hebrew or Greek) equal to the typed word - accents, breathings and vowel points
//   ignored, a lemma's comma-separated forms each matched - are searched together (homonyms: all of them). Under each
//   verse its interlinear English too, as INTERLINEAR shows it, the root's glosses marked.
// - INTERLINEAR (ENGLISH): the verses whose words' interlinear English (words.gloss) has every
//   typed word, as a whole word, any case - each only its interlinear English, word by word in the text's order
//   ("in [the] beginning | he created | ..."), the matching words' marked.
// - A source: its entries (notes.body and its quote, the tags taken off) containing the typed
//   text as typed (any case) - each its reference and the stretch around the first match, every match in it marked.
//   Its file is the notes' (notes.ts' openSource: downloaded the first time, then kept), the pane showing it loading.
// - A dictionary (THE DICTIONARY, below: the Tyndale Bible Dictionary, the Archaeology finds): its articles, not verses -
//   those whose title has the typed text first -, each its title over the stretch that matched (a find its photo at the
//   right); tapped, the article opens under it, its cited verses tappable (dictionary.ts).
// - The queries, no indexes added: ROOT WORD reads only the books the root occurs in (freq), by their key - the
//   commonest root (אָמַר, 4,339 verses) about 0.9 s in the page; INTERLINEAR every word of the Bible read (LIKE, then
//   a whole-word check here); a source every entry (LIKE).

import type { Db, Row } from "./db";
import type { Book } from "./reader";
import { paneFrame } from "./layout";
import { textSources, sourceGroups, openSource, type Source } from "./notes";
import { currentLanguage } from "./study";
import { searchArticles, entry } from "./dictionary";

const pane = document.getElementById ("search")!;
const btn = document.getElementById ("searchBtn")!;
const pick = document.getElementById ("searchPick") as HTMLSelectElement;
const bar = document.getElementById ("searchBar") as HTMLInputElement;
const countEl = document.getElementById ("searchCount")!;
const hitsEl = document.getElementById ("searchHits")!;
const scroll = paneFrame (pane, document.getElementById ("searchClose")!);

let db: Db | null = null;
let books = new Map<number, Book> ();
let goVerse: (book: Book, chapter: number, verse: number) => Promise<void> = async () => {};
/** The Old Testament searched with the New - the whole Bible: the Hebrew Bible, or the Septuagint (HEBREW / GREEK). */
const ot = (): "OT" | "LXX" => currentLanguage () === "G" ? "LXX" : "OT";
let rootFor: string[] | null = null;                  // A word panel's root (its Strong's number), while the bar holds its dictionary form

const KEY = "cotext.search";
const kept: Record<string, string> = {};             // the Old Testament searched (OT, LXX) -> the picker's choice
try { Object.assign (kept, JSON.parse (localStorage.getItem (KEY) ?? "{}")); } catch { /* none kept, or private mode */ }

/** main.ts, once the books are read: the database, the books, and how to go to a verse. */
export function initSearch (d: Db, bs: Book[], go: (book: Book, chapter: number, verse: number) => Promise<void>) {
  db = d; books = new Map (bs.map ((b) => [b.id, b])); goVerse = go;
}

/** The chapter shown (main.ts): the picker's list remade when its sources change - with HEBREW / GREEK -, its kept
 *  choice picked (else INTERLINEAR) - unless a root from a word's panel is shown. */
let listed = "";
export function setSearchPassage (_b: Book) {
  const srcs = textSources (ot ());
  const ids = ot () + ":" + srcs.map ((s) => s.id).join (",");
  if (ids === listed) return;
  listed = ids;
  const was = pick.value;
  pick.replaceChildren (new Option ("Root word", "root"), new Option ("Interlinear (English)", "english"), ...sourceGroups (srcs));
  const want = was === "root" && rootFor ? "root" : kept[ot ()] ?? "english";
  pick.value = [...pick.options].some ((o) => o.value === want) ? want : "english";
}

pick.addEventListener ("change", () => {
  kept[ot ()] = pick.value;
  try { localStorage.setItem (KEY, JSON.stringify (kept)); } catch { /* private mode: not kept */ }
  if (bar.value.trim ()) search ();
});
bar.addEventListener ("input", () => { rootFor = null; });     // (Typed over: the dictionary form is matched again)
bar.addEventListener ("keydown", (e) => {
  if (e.key !== "Enter" || e.isComposing) return;
  e.preventDefault ();
  bar.blur ();     // (The phone's keyboard put away: the results in view)
  search ();
});

/** Opened or closed (the icon, its ✕). */
function setOpen (open: boolean) {
  pane.hidden = ! open;
  btn.setAttribute ("aria-pressed", String (open));
}
btn.addEventListener ("click", () => setOpen (pane.hidden));
document.getElementById ("searchClose")!.addEventListener ("click", () => setOpen (false));

/** A word's panel's Search (panel.ts): the pane opened on ROOT WORD, lemma in the bar, the Bible's verses with a word
 *  of the root strong listed (a Greek root's in the Septuagint too, when it's the Old Testament read). */
export function searchRoot (strong: string, lemma: string) {
  setOpen (true);
  pick.value = "root";
  bar.value = lemma;
  rootFor = [strong];
  searchRoots ([strong], start ());
}

/** What the bar holds searched as the picker says. */
async function search () {
  const text = bar.value.trim ();
  if (! text || ! db) return;
  const n = start ();
  if (pick.value === "root") {
    const strongs = rootFor ?? await lemmaRoots (text);
    if (n !== searching) return;
    if (! strongs.length) { countEl.textContent = `No dictionary form “${text}” found.`; return; }
    searchRoots (strongs, n);
  } else if (pick.value === "english") searchEnglish (text, n);
  else {
    const src = textSources (ot ()).find ((s) => s.id === pick.value);
    if (src?.kind === "dictionary") searchDictionary (src, text, n); else if (src) searchSource (src, text, n);
  }
}

// (Each search numbered: one still arriving when another starts isn't shown)
let searching = 0;
/** A new search's number, the list emptied for it. */
function start () {
  countEl.textContent = "Searching…";
  hitsEl.textContent = "";
  scroll.scrollTop = 0;
  return ++searching;
}

//==== ROOT WORD ====
// The verses with a word of the roots: in the Bible's books they occur in (freq) - the Old Testament read and the New;
// the Septuagint's only those the book list shows (books.heb) -, in the book list's order. (The books as a
// constraint on words' own book - not a join - so only those books' words are read: db.ts' words view.)
const hitsOf = (count: number) => {
  const roots = Array (count).fill ("?").join (",");
  return `SELECT DISTINCT w.book, w.chapter, w.verse FROM words w JOIN books b ON b.id = w.book
              WHERE w.strong IN (${roots}) AND w.book IN (SELECT book FROM freq WHERE strong IN (${roots}))
                AND b.testament IN (?, 'NT') AND (b.testament <> 'LXX' OR b.heb > 0)
              ORDER BY CASE WHEN b.testament = 'LXX' THEN b.heb ELSE b.id END, b.id, w.chapter, w.verse`;
};
/** A result: its verse (end: a note's last verse, chapter * 1000 + verse, when it covers several) and a source's text. */
interface Hit { book: number; chapter: number; verse: number; end?: number; text?: string; }

async function searchRoots (strongs: string[], n: number) {
  if (! db) return;
  const hits = await db.all (hitsOf (strongs.length), [...strongs, ...strongs, ot ()]) as unknown as Hit[];
  if (n !== searching) return;
  counted (hits.length, "verse");
  const set = new Set (strongs);
  draw (hits, n, both (original ((w) => set.has (String (w.strong)), false), original ((w) => set.has (String (w.strong)), true)));
}

/** A lemma as matched: no accents, breathings or vowel points (every combining mark), lower case, final sigma as σ. */
const bare = (s: string) => s.normalize ("NFD").replace (/\p{M}/gu, "").toLowerCase ().replace (/ς/g, "σ").trim ();
let lemmas: Promise<Row[]> | null = null;     // (The lexicon's dictionary forms, read once)
/** The Strong's numbers whose dictionary form is typed - Hebrew or Greek (each found only where it's read). */
async function lemmaRoots (typed: string): Promise<string[]> {
  lemmas ??= db!.all ("SELECT strong, lemma FROM lexicon");
  const want = bare (typed);
  return (await lemmas).filter ((r) => [String (r.lemma), ...String (r.lemma).split (",")].some ((l) => bare (l) === want)).map ((r) => String (r.strong));
}

//==== INTERLINEAR (ENGLISH) ====
const likeOf = (t: string) => `%${t.replace (/[\\%_]/g, (c) => "\\" + c)}%`;
const escRe = (t: string) => t.replace (/[.*+?^${}()|[\]\\]/g, "\\$&");

async function searchEnglish (typed: string, n: number) {
  if (! db) return;
  const terms = [...new Set (typed.toLowerCase ().split (/\s+/).filter (Boolean))];
  const res = terms.map ((t) => new RegExp (`(^|[^\\p{L}\\p{N}])${escRe (t)}($|[^\\p{L}\\p{N}])`, "iu"));
  // (Every word of the Bible read whose English has any term somewhere - LIKE - then each checked here as a whole word)
  const t0 = performance.now ();
  const rows = await db.all (`SELECT w.book, w.chapter, w.verse, w.word, w.gloss FROM books b JOIN words w ON w.book = b.id
                              WHERE b.testament IN (?, 'NT') AND (b.testament <> 'LXX' OR b.heb > 0)
                                AND (${terms.map (() => "w.gloss LIKE ? ESCAPE '\\'").join (" OR ")})
                              ORDER BY CASE WHEN b.testament = 'LXX' THEN b.heb ELSE b.id END, b.id, w.chapter, w.verse, w.word`,
                             [ot (), ...terms.map (likeOf)]);
  if (n !== searching) return;
  // Each verse's matching words, kept where every term matched one of them
  const verses = new Map<string, { hit: Hit; words: Row[]; found: Set<number> }> ();
  for (const r of rows) {
    const which = res.flatMap ((re, i) => re.test (String (r.gloss)) ? [i] : []);
    if (! which.length) continue;
    const k = `${r.book}.${r.chapter}.${r.verse}`;
    const v = verses.get (k) ?? verses.set (k, { hit: { book: +r.book!, chapter: +r.chapter!, verse: +r.verse! }, words: [], found: new Set () }).get (k)!;
    v.words.push (r);
    for (const i of which) v.found.add (i);
  }
  const all = [...verses.values ()].filter ((v) => v.found.size === terms.length);
  console.info (`Search: "${typed}" in the ${ot ()} and NT's English, ${Math.round (performance.now () - t0)} ms`);
  counted (all.length, "verse");
  const marked = new Set (all.flatMap ((v) => v.words.map ((w) => `${w.book}.${w.chapter}.${w.verse}.${w.word}`)));
  draw (all.map ((v) => v.hit), n, original ((w) => marked.has (`${w.book}.${w.chapter}.${w.verse}.${w.word}`), true));
}

//==== A SOURCE ====
let srcDb: { id: string; db: Promise<Db> } | null = null;     // (The search's handle on the last source searched)
const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " " };
/** A note's HTML (the pipeline's few tags) as plain text: tags off (a space each), entities read, spaces joined. */
const plain = (html: string) => html.replace (/<[^>]*>/g, " ")
  .replace (/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => e[0] !== "#" ? ENTITIES[e.toLowerCase ()] ?? m
    : String.fromCodePoint (/x/i.test (e[1]) ? parseInt (e.slice (2), 16) : parseInt (e.slice (1), 10)))
  .replace (/\s+/g, " ").trim ();

async function searchSource (src: Source, typed: string, n: number) {
  if (srcDb?.id !== src.id) {
    srcDb?.db.then ((d) => d.close ()).catch (() => {});
    srcDb = { id: src.id, db: openSource (src, (f) => { if (n === searching) countEl.textContent = `Loading ${src.name}… ${Math.round (f * 100)}%`; }) };
  }
  let d: Db;
  try { d = await srcDb.db; } catch {
    srcDb = null;
    if (n === searching) countEl.textContent = `${src.name} couldn't be loaded.`;
    return;
  }
  if (n !== searching) return;
  countEl.textContent = "Searching…";
  // (Its entries of the Bible read - the NT's, and the Old Testament's: a Hebrew-keyed source beside the Septuagint, the
  // Hebrew books')
  const where = ot () === "LXX" && ! src.testaments.split (" ").includes ("LXX") ? "OT" : ot ();
  const rows = await d.all (`SELECT book, start, "end", quote, body FROM notes WHERE body LIKE ?1 ESCAPE '\\' OR quote LIKE ?1 ESCAPE '\\'
                             ORDER BY book, start, ord`, [likeOf (typed)]);
  if (n !== searching) return;
  const re = new RegExp (escRe (typed), "iu");
  const order = (b: Book) => b.testament === "LXX" ? b.heb : b.id;
  const hits: Hit[] = [];
  for (const r of rows) {
    const b = books.get (Number (r.book));
    if (! b || (b.testament !== where && b.testament !== "NT")) continue;
    const text = plain ([r.quote, r.body].filter (Boolean).join (" "));
    if (! re.test (text)) continue;     // (Matched only inside a tag)
    const s = Number (r.start), e = Number (r.end);
    hits.push ({ book: b.id, chapter: Math.floor (s / 1000), verse: s % 1000, end: e !== s ? e : undefined, text });
  }
  hits.sort ((a, b) => order (books.get (a.book)!) - order (books.get (b.book)!) || a.book - b.book);     // (Stable: each book's in its order)
  counted (hits.length, src.kind === "translation" || src.kind === "version" ? "verse" : "note");
  draw (hits, n, async () => (h) => snippet (h.text!, typed));
}

//==== THE DICTIONARY ====
// A dictionary source's articles (dictionary.ts' searchArticles) - each an entry as the notes list them: its title over
// the stretch that matched (or, matched in the title alone, the article's opening), its photo at the right where it has
// one, tapped opening the article in place, its scripture references going to the verse.
async function searchDictionary (src: Source, typed: string, n: number) {
  let hits: Awaited<ReturnType<typeof searchArticles>>;
  try {
    hits = await searchArticles (db!, typed, (f) => { if (n === searching) countEl.textContent = `Loading the dictionary… ${Math.round (f * 100)}%`; }, src.id);
  } catch {
    if (n === searching) countEl.textContent = "The dictionary couldn't be loaded.";
    return;
  }
  if (n !== searching) return;
  counted (hits.length, "article");
  drawChunks (hits, n, async (chunk) => chunk.map ((h) => entry (db!, h.id, h.title,
    h.text.toLowerCase ().includes (typed.toLowerCase ()) ? snippet (h.text, typed) : h.text.slice (0, 200), "", src.id, h.photo)));
}

/** The stretch of a source's text around its first match (up to 80 characters before, 200 after, cut at spaces,
 *  "…" where cut), every match in it marked. */
function snippet (text: string, typed: string): HTMLElement {
  const at = text.search (new RegExp (escRe (typed), "iu"));
  let from = Math.max (0, at - 80), to = Math.min (text.length, at + typed.length + 200);
  if (from > 0) from = text.indexOf (" ", from) + 1 || from;
  if (to < text.length) { const sp = text.lastIndexOf (" ", to); if (sp > at + typed.length) to = sp; }
  const part = (from > 0 ? "… " : "") + text.slice (from, to) + (to < text.length ? " …" : "");
  const el = document.createElement ("span");
  el.className = "hitText";
  el.dir = "auto";     // (A Targum's Aramaic right to left)
  let last = 0;
  for (const m of part.matchAll (new RegExp (escRe (typed), "giu"))) {
    el.append (part.slice (last, m.index));
    const s = document.createElement ("span");
    s.className = "hitWord"; s.textContent = m[0];
    el.append (s);
    last = m.index! + m[0].length;
  }
  el.append (part.slice (last));
  return el;
}

//==== THE RESULTS ====
/** The count above the results: "1,234 verses". */
const counted = (n: number, what: string) => { countEl.textContent = `${n.toLocaleString ("en-US")} ${n === 1 ? what : what + "s"}`; };

/** A chunk's text maker: given the chunk (reading what it needs first), a function making each result's text. */
type Texts = (chunk: Hit[]) => Promise<(h: Hit) => HTMLElement>;

/** The verses' words (read by their key), those mark says marked (in the accent): english false, their original text
 *  (ROOT WORD); true, only their interlinear English, each word's in the text's order, joined by " | " (INTERLINEAR). */
const original = (mark: (w: Row) => boolean, english: boolean): Texts => async (chunk) => {
  const words = await db!.all (`SELECT book, chapter, verse, word, text, gloss, strong FROM words
                                WHERE (book, chapter, verse) IN (VALUES ${chunk.map (() => "(?,?,?)").join (",")})
                                ORDER BY book, chapter, verse, word`, chunk.flatMap ((h) => [h.book, h.chapter, h.verse]));
  const byVerse = new Map<string, Row[]> ();
  for (const w of words) { const k = `${w.book}.${w.chapter}.${w.verse}`; (byVerse.get (k) ?? byVerse.set (k, []).get (k)!).push (w); }
  return (h) => {
    const hebrew = books.get (h.book)?.testament === "OT";
    const text = document.createElement ("span");
    text.className = "hitText" + (english ? "" : hebrew ? " he" : " gr");
    text.dir = hebrew && ! english ? "rtl" : "ltr";
    (byVerse.get (`${h.book}.${h.chapter}.${h.verse}`) ?? []).forEach ((w, i) => {
      if (i) text.append (english ? " | " : " ");
      const s = document.createElement ("span");
      if (mark (w)) s.className = "hitWord";     // (What matched: in the accent)
      s.textContent = String ((english ? w.gloss : w.text) ?? "");
      text.append (s);
    });
    return text;
  };
};

/** Two text makers' texts, one under the other (ROOT WORD: the original, its interlinear English under it). */
const both = (a: Texts, b: Texts): Texts => async (chunk) => {
  const [ma, mb] = await Promise.all ([a (chunk), b (chunk)]);
  return (h) => { const pair = document.createElement ("span"); pair.className = "hitPair"; pair.append (ma (h), mb (h)); return pair; };
};

const CHUNK = 100;
/** The results drawn CHUNK at a time, each chunk's text made as it's drawn (texts): a row tapped goes to its verse in
 *  the text, whatever kind it is. */
function draw (hits: Hit[], n: number, texts: Texts) {
  drawChunks (hits, n, async (chunk) => {
    const make = await texts (chunk);
    return chunk.map ((h) => {
      const row = document.createElement ("button");
      row.className = "hit";
      const b = books.get (h.book);
      const ref = document.createElement ("span");
      ref.className = "src";
      const end = ! h.end ? "" : Math.floor (h.end / 1000) === h.chapter ? `–${h.end % 1000}` : `–${Math.floor (h.end / 1000)}:${h.end % 1000}`;
      ref.textContent = `${b?.name ?? ""} ${h.chapter}:${h.verse}${end}`;
      row.append (ref, make (h));
      row.addEventListener ("click", () => { if (b) goVerse (b, h.chapter, h.verse); });
      return row;
    });
  });
}

/** Any list drawn CHUNK at a time (rows: a chunk's elements): the next once the last drawn comes near the view (an
 *  observer on it). */
async function drawChunks<T> (items: T[], n: number, rows: (chunk: T[]) => Promise<HTMLElement[]>, from = 0) {
  const chunk = items.slice (from, from + CHUNK);
  if (! chunk.length || ! db) return;
  const els = await rows (chunk);
  if (n !== searching) return;
  hitsEl.append (...els);
  if (from + CHUNK >= items.length) return;
  const watch = new IntersectionObserver (([e]) => {
    if (! e.isIntersecting) return;
    watch.disconnect ();
    if (n === searching) drawChunks (items, n, rows, from + CHUNK);
  }, { root: scroll, rootMargin: "400px" });
  watch.observe (hitsEl.lastElementChild!);
}
