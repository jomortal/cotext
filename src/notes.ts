// The notes panel: free commentaries, text-critical apparatuses, English translations and the ancient versions beside the
// text, following it. The icon at the play bar's right (right of the search's)
// opens and closes it. On a narrow screen it takes its place in the page's column above the play bar
// (under the word's panel when that's open, over the second word's panel, a Hebrew OT word's - nothing floats over the
// text), at most half the screen, scrolling; on a wide one in the panes' column at the right of the text, under the search when it's open (layout.ts).
// - Its picker (a <select class="choose">: COTEXT's plain list) lists the sources for the book shown (those with notes
//   for it: note_sources.books, pipeline/source_books.py - Rashi only in the Torah), grouped
//   ORIGINAL TEXT (beside the Septuagint: the Hebrew OT), SYNTAX, BIBLE BACKGROUND (the dictionaries and the
//   atlas), TEXTUAL STUDIES (the apparatus and the Targums), COMMENTARIES and TRANSLATIONS - the database's note_sources (pipeline/notes.py; the dictionary's: tyndale_dict.py) - so
//   swapping one is a tap; the choice is kept per testament on the device, and stays through every book it covers.
// - A source is its own database file, downloaded the first time it's picked and kept (db.ts: openNotesDb); one is
//   open at a time.
// - Narrow: the notes on one verse - the one being read aloud while ▶ reads (audio.ts signals each word lit), otherwise
//   the first whose last line is still in view at the text's top (until half of it is gone) - following as the text scrolls. Wide: the
//   notes on every verse of the chapter, each under its reference, following the text both ways (TWO-WAY SCROLLING,
//   below: a translation in step, any other kind loosely). A note on a range (1:1-18) shows once, at its first verse shown, its range above it; a
//   note on words (Translation Notes') shows them first. The list is redrawn only when the notes change, so a range
//   note read through several verses keeps its place. A translation or an ancient version (a Targum: its Aramaic,
//   right to left, with the English under it) is a source with a "note" per verse: its text.
// - A sentence diagram (SYNTAX: MACULA's trees, pipeline/diagram.py) is a "note" per sentence, its body the sentence's
//   tree as JSON, drawn here (drawDiagram) - so the drawing changes without the data rebuilt. A sentence running over
//   several verses shows on each, the words of the others dimmed.
// - A dictionary (DICTIONARY: the Tyndale Bible Dictionary, the Archaeology finds) lists articles, not notes: for each
//   verse those citing it, then those its words lead to (dictionary.ts' passageArticles), each its title over a line of
//   it (a find its photo at the right), tapped opening the article in place - drawn as the notes are (narrow one verse,
//   wide the chapter in step with the text; an article listed once, at the first verse shown it's for) - except the
//   Archaeology finds, the Ancient Parallels and the Ancient Historians, listed by book (BY BOOK, below).
// - The atlas (MAPS: atlas.ts) is one map of the places the verses shown name (narrow the verse, wide the chapter),
//   kept while it's picked and given the places as the verses change, the places listed under it with their verses.

import { openNotesDb, type Db } from "./db";
import type { Book } from "./reader";
import { drawInterlinear, clearInterlinear } from "./interlinear";
import { isWide, onWideChange, paneFrame } from "./layout";
import { passageArticles, entry, bookArticles, verseLinks, markVerse } from "./dictionary";
import { passageMap } from "./atlas";

export interface Source { id: string; kind: "original" | "commentary" | "dictionary" | "apparatus" | "translation" | "version" | "syntax" | "atlas"; name: string; testaments: string; credit: string;
                   file: string; version: string; books?: string; }     // (books: the book ids it has notes for, space-separated - pipeline/source_books.py; '' or none: every book of its testaments)

//==== BESIDE THE SEPTUAGINT ====
// An LXX book with a Hebrew counterpart (books.heb) is offered the Hebrew book's sources, each LXX verse showing the
// notes of the Hebrew verse or verses it translates (the main database's lxx_heb: pipeline/lxx_heb.py) - or, where it
// has none, that it's in the Septuagint only - and, at the top (ORIGINAL TEXT), the Hebrew OT: those Hebrew verses as
// COTEXT's interlinear (interlinear.ts), a word tapped opening the word's panel. Brenton's Septuagint is offered in the
// LXX's own numbering (brenton_lxx), not on the Hebrew's. A book the Hebrew Bible lacks has only brenton_lxx.
const HEBREW_OT: Source = { id: "hebrew_ot", kind: "original", name: "Hebrew OT", testaments: "LXX", file: "", version: "",
  credit: "Hebrew text, parsing and glosses: STEPBible Data's TAHOT, Tyndale House, Cambridge (CC BY 4.0)." };
/** The sources about the Hebrew text itself, not offered beside the Septuagint (the user's choice): the Hebrew's
 *  sentence diagram, its Masoretic notes, text-critical apparatus and Dead Sea Scrolls readings. */
const HEBREW_TEXT = new Set (["diagram_ot", "hottp", "stepbible", "dss", "tn"]);     // (tn: the Translation Notes, each on the Hebrew words it quotes)
const NOT_BESIDE_LXX = new Set ([...HEBREW_TEXT, "brenton"]);     // (Brenton: brenton_lxx instead, in the LXX's own numbers)
const LXX_ONLY = "<p>This verse is in the Septuagint only - not in the Hebrew Bible.</p>";
export interface Note { id: number; start: number; end: number; quote: string; body: string; }

const KEY = "cotext.notes";
const picked: Record<string, string> = {};     // testament -> source id
try { Object.assign (picked, JSON.parse (localStorage.getItem (KEY) ?? "{}")); } catch { /* none kept, or private mode */ }

const panel = document.getElementById ("notes")!;
// Its frame (layout.ts' paneFrame, as the search pane's): the ✕ fixed at the upper right, the picker's row narrow
// scrolling away with the notes, wide fixed at the column's top; the rest in the scroller.
const notesScroll = paneFrame (panel, document.getElementById ("notesClose")!);
const btn = document.getElementById ("notesBtn")!;
const pick = document.getElementById ("notesPick") as HTMLSelectElement;
const refEl = document.getElementById ("notesRef")!;
const bodyEl = document.getElementById ("notesBody")!;
const creditEl = document.getElementById ("notesCredit")!;
const main = document.querySelector ("main")!;

let sources: Source[] = [];
let textDb: Db | null = null;                     // The main database: a diagram's matched words are read from it
let book: Book | null = null;
let heb: Book | null = null;                      // An LXX book's Hebrew Bible book (null: none, or not an LXX book)
let books: Book[] = [];
let chapter = 1;
let open: { id: string; db: Db } | null = null;     // The source's file open now
let loading = 0;                                   // (A load's number: a later pick wins over one still arriving)
let shownVerse = "";      // The verses shown ("1,2,3"): redrawn only when they change
let shownIds: string | null = null;               // The notes drawn (their ids; null: none yet): redrawn only when they change
let blocks: [number, HTMLElement][] = [];          // Wide: each verse shown and where its notes start in the panel (TWO-WAY SCROLLING)

export async function initNotes (db: Db) {
  textDb = db;
  const [s, b] = await Promise.all ([db.all ("SELECT id, kind, name, testaments, credit, file, version, books FROM note_sources")
                                       .catch (() => db.all ("SELECT id, kind, name, testaments, credit, file, version FROM note_sources")),     // (A copy kept from before books: every source in every book, till the new one's used),
                                     db.all ("SELECT id, code, name, testament, chapters, heb, notes FROM books")]);
  sources = s as unknown as Source[];
  books = b as unknown as Book[];
  btn.hidden = ! sources.length;
}

/** The chapter shown (main.ts): the picker's sources follow its book (those with notes for it); the notes its verses.
 *  The source picked stays picked wherever it has notes; in a book it has none for, the first offered shows meanwhile,
 *  and the picked one comes back in the next book it covers. */
export function setNotesPassage (b: Book, c: number) {
  const was = book?.id;
  book = b; chapter = c;
  heb = b.testament === "LXX" ? books.find ((x) => x.id === b.heb) ?? null : null;
  clearInterlinear ();
  if (b.id !== was) {
    pick.replaceChildren (...sourceGroups (mine ()));
    pick.value = current ()?.id ?? "";
  }
  shownVerse = ""; shownIds = null;
  if (! panel.hidden) show ();
}

/** Sources as a picker's choices (the notes' picker, the search's resources - search.ts): grouped by kind (optgroups;
 *  the dictionaries and the atlas together as BIBLE BACKGROUND, the apparatus and the ancient versions as TEXTUAL
 *  STUDIES), in the user's order, each by its name; a group with
 *  none left out. */
export function sourceGroups (list: Source[]): HTMLOptGroupElement[] {
  const group = (kinds: string, label: string) => {
    const g = document.createElement ("optgroup");
    g.label = label;
    g.append (...list.filter ((s) => kinds.split (" ").includes (s.kind)).map ((s) => new Option (s.name, s.id)));
    return g.children.length ? [g] : [];
  };
  return [...group ("original", "Original text"), ...group ("syntax", "Syntax"), ...group ("dictionary atlas", "Bible Background"),
          ...group ("apparatus version", "Textual Studies"), ...group ("commentary", "Commentaries"), ...group ("translation", "Translations")];
}

/** The sources the search pane searches (search.ts): those for the whole Bible read - the Old Testament as picked
 *  (ot: the Hebrew Bible's, or beside the Septuagint as the picker offers them there) and the New - that are text in a
 *  file of their own: not the Hebrew OT (the main database's interlinear), the sentence diagrams (trees, not text) nor
 *  the atlas (places on a map). */
export const textSources = (ot: "OT" | "LXX") => sources.filter ((s) => s.file && s.kind !== "syntax" && s.kind !== "atlas"
  && (offers (s, "NT") || (ot === "OT" ? offers (s, "OT") : offers (s, "LXX") || (offers (s, "OT") && ! NOT_BESIDE_LXX.has (s.id)))));

/** A source's file opened as the notes open it (db.ts' openNotesDb: downloaded the first time, then kept) - the
 *  search's own handle on it, so searching never closes the notes' open source. */
export const openSource = (s: Source, onProgress: (fraction: number) => void) => openNotesDb (s.id, s.file, s.version, onProgress);

/** The picker's list and its kept choice: per testament, an LXX book with a Hebrew counterpart apart (LXXH). */
const scope = () => book?.testament === "LXX" && heb ? "LXXH" : book?.testament ?? "";
const offers = (s: Source, t: string) => s.testaments.split (" ").includes (t);
/** Whether a source has notes for a book (none listed: every book). */
const covers = (s: Source, b: Book | null) => !! b && (! s.books || s.books.split (" ").includes (String (b.id)));
const mine = () => ! book ? [] : scope () === "LXXH"
  ? [HEBREW_OT, ...sources.filter ((s) => (offers (s, "OT") && ! NOT_BESIDE_LXX.has (s.id) && covers (s, heb)) || (offers (s, "LXX") && covers (s, book)))]
  : sources.filter ((s) => offers (s, book!.testament) && covers (s, book));
const current = () => mine ().find ((s) => s.id === picked[scope ()]) ?? mine ()[0];

pick.addEventListener ("change", () => {
  if (! book) return;
  picked[scope ()] = pick.value;
  try { localStorage.setItem (KEY, JSON.stringify (picked)); } catch { /* private mode: not kept */ }
  shownVerse = ""; shownIds = null;
  show ();
});

btn.addEventListener ("click", () => {
  panel.hidden = ! panel.hidden;
  btn.setAttribute ("aria-pressed", String (! panel.hidden));
  shownVerse = ""; shownIds = null;
  if (! panel.hidden) show (); else clearInterlinear ();
});
document.getElementById ("notesClose")!.addEventListener ("click", () => { if (! panel.hidden) btn.click (); });

/** The verses to show. Wide: every verse of the chapter. Narrow: one - the verse being read aloud, else the first
 *  whose last line is still in view: the middle of its last word's original (the Hebrew or Greek, not the word's
 *  column, which has room above it) at or below the text's top edge - so the notes move on once a verse's last line is
 *  half gone under the heading. */
function versesNow (): number[] {
  const rows = [...document.querySelectorAll<HTMLElement> ("#chapter .vrow")];
  const num = (row: HTMLElement) => Number (row.dataset.verse ?? 1);
  if (isWide ()) return rows.length ? rows.map (num) : [1];
  const reading = document.querySelector ("#chapter .w.reading")?.closest<HTMLElement> (".vrow");
  const top = main.getBoundingClientRect ().top;
  const row = reading ?? rows.find ((r) => { const o = r.querySelector (".verse")?.lastElementChild?.querySelector (".orig")?.getBoundingClientRect ();
                                       return !! o && (o.top + o.bottom) / 2 >= top; })
              ?? rows[rows.length - 1];
  return [row ? num (row) : 1];
}

/** Draws the notes for the verses now - loading the source's file first if it isn't open. */
async function show () {
  const src = current ();
  if (! book || ! src) return;
  creditEl.textContent = src.credit;
  const n = ++loading;     // (A file still arriving for a source picked before: not shown)
  if (src.file && ! ownFile (src) && open?.id !== src.id) {     // (The Hebrew OT has no file: it's the main database's)
    ++updating;     // (Any update still reading the old source: dropped)
    open?.db.close (); open = null;
    refEl.textContent = "";
    bodyEl.innerHTML = "<p>Loading…</p>";
    try {
      const db = await openNotesDb (src.id, src.file, src.version, (f) => {
        if (n === loading) bodyEl.innerHTML = `<p>Loading ${src.name}… ${Math.round (f * 100)}%</p>`;
      });
      if (n !== loading) { db.close (); return; }
      open = { id: src.id, db };
    } catch (e) {
      if (n === loading) bodyEl.innerHTML = `<p>${src.name} couldn't be loaded.</p>`;
      return;
    }
  }
  update ();
}

/** The notes for the verses now, drawn if they differ from those shown: each verse's in turn, under its reference
 *  when there are several (a note on a range of verses shown once, at the first); the Hebrew OT, all their Hebrew
 *  verses as one interlinear; the diagram, each sentence once. Drawn once they're read from the database - a later
 *  update (the text scrolled on, another source) winning over one still arriving (updating). */
let updating = 0;
/** A source whose file another module opens itself: the dictionary's (dictionary.ts), the atlas' (atlas.ts). */
const ownFile = (s: Source) => s.kind === "dictionary" || s.kind === "atlas";
// (A query of a source closed meanwhile - another picked - fails: that update was already superseded)
const update = () => { drawNotes ().catch ((e) => console.warn ("Notes:", e)); };
async function drawNotes () {
  const src = current ();
  if (panel.hidden || ! book || ! src || ! textDb || (src.file && ! ownFile (src) && open?.id !== src.id)) return;
  if (BY_BOOK.has (src.id) && book.testament !== "LXX") { drawBookFinds (src.id); return; }
  bookShown = "";     // (Anything else drawn: the book's list gone)
  const vs = versesNow ();
  const key = vs.join (",");
  if (key === shownVerse) return;
  shownVerse = key;
  const n = ++updating, still = () => n === updating;
  const wide = isWide ();
  const many = wide || vs.length > 1;
  const b = book, db = open?.db;
  // Each verse's places whose notes show: beside the Septuagint, a Hebrew-keyed source's the Hebrew verses it
  // translates ([book, chapter, verse]; none: the Hebrew lacks it); otherwise its own.
  const hebrewKeyed = !! heb && (src.kind === "original" || offers (src, "OT"));
  const per = await Promise.all (vs.map (async (v) => ({ v, where: hebrewKeyed
    ? (await textDb.all ("SELECT hbook, hchapter, hverse FROM lxx_heb WHERE book = ? AND chapter = ? AND verse = ? ORDER BY hchapter, hverse",
                         [b.id, chapter, v])).map ((r) => [Number (r.hbook), Number (r.hchapter), Number (r.hverse)])
    : [[b.id, chapter, v]] })));
  if (! still ()) return;
  blocks = []; anchors = null;
  refEl.textContent = wide ? `${b.name} ${chapter}` : `${b.name} ${chapter}:${vs[0]}`;
  const all = per.flatMap ((p) => p.where);
  // (The interlinear out of .gBody: its .he would restyle the reader's rows as inline Hebrew text)
  bodyEl.classList.toggle ("gBody", src.kind !== "original");
  if (hebrewKeyed && all.length) refEl.textContent += ` - Hebrew ${heb!.name} ${refs (all)}`;
  if (! all.length) {
    if (shownIds === "lxx") return;
    shownIds = "lxx";
    clearInterlinear ();
    bodyEl.innerHTML = LXX_ONLY;
    return;
  }
  if (src.kind === "original") {
    const ids = "he " + all.join (" ");
    if (ids === shownIds) return;
    shownIds = ids;
    const el = document.createElement ("div");
    el.className = "besideText";
    // (Each Hebrew verse once, though two LXX verses may translate it; wide, each LXX verse placed at the first of its own)
    const once = [...new Map (all.map (([, c, vv]) => [c * 1000 + vv, [c, vv] as [number, number]])).values ()];
    await drawInterlinear (el, textDb, heb!, once, () => still () && (bodyEl.replaceChildren (el), true));
    if (! still ()) return;
    if (wide) for (const p of per) {
      const row = p.where.length && el.querySelector<HTMLElement> (`.vrow[data-chapter="${p.where[0][1]}"][data-verse="${p.where[0][2]}"]`);
      if (row) blocks.push ([p.v, row]);
    }
    placed ();
    return;
  }
  if (src.kind === "dictionary") { drawArticles (src.id, per, n, wide, many); return; }
  if (src.kind === "atlas") { drawAtlas (per, n, many); return; }
  // Each verse's notes, a note already shown for an earlier verse (a range, a sentence) not again
  const seen = new Set<number> ();
  const read = await Promise.all (per.map (({ where }) => Promise.all (where.map (([nb, c, vv]) =>
    db!.all (`SELECT rowid AS id, start, "end", quote, body FROM notes WHERE book = ? AND start <= ? AND "end" >= ?
              ORDER BY start, "end" DESC, ord`, [nb, c * 1000 + vv, c * 1000 + vv]) as unknown as Promise<Note[]>))));
  if (! still ()) return;
  const groups = per.map (({ v, where }, i) => {
    const notes: Note[] = [];
    for (const n of read[i].flat ()) if (! seen.has (n.id)) { seen.add (n.id); notes.push (n); }
    return { v, where, notes };
  });
  const ids = groups.map ((g) => g.v + ":" + (g.where.length ? g.notes.map ((n) => n.id).join (".") : "-")).join (",");
  if (ids === shownIds) return;
  // (A diagram's words: the text's words of its sentences' verses, read first - "ref:n" -> [text, gloss])
  const text = new Map<string, [string, string]> ();
  if (src.kind === "syntax") {
    const spans = groups.flatMap ((g) => g.notes.map ((nt) => [nt.start, nt.end]));
    for (const rows of await Promise.all (spans.map (([s0, s1]) => textDb!.all (`SELECT chapter * 1000 + verse AS ref, word, text, gloss FROM words
                                                                               WHERE book = ? AND chapter * 1000 + verse BETWEEN ? AND ?`, [b.id, s0, s1]))))
      for (const r of rows) text.set (`${r.ref}:${r.word}`, [String (r.text), String (r.gloss ?? "")]);
    if (! still ()) return;
  }
  shownIds = ids;
  clearInterlinear ();
  bodyEl.replaceChildren ();
  const kind = src.kind;
  const none = kind === "translation" ? "Not in this translation." : kind === "version" ? "Not in this version."
             : kind === "syntax" ? "No diagram for this verse." : "No notes on this verse.";
  for (const g of groups) {
    // (Wide: each verse's notes in a block of their own, marked with its verse, for TWO-WAY SCROLLING)
    const box = wide ? document.createElement ("div") : bodyEl;
    if (wide) { box.className = "vBlock"; box.dataset.verse = String (g.v); bodyEl.append (box); blocks.push ([g.v, box]); }
    if (many) {
      const h = document.createElement ("div");
      h.className = "src verseHead";
      h.textContent = `${chapter}:${g.v}`;
      box.append (h);
    }
    if (! g.where.length) { box.insertAdjacentHTML ("beforeend", LXX_ONLY); continue; }
    if (! g.notes.length) {
      // (A verse whose note began at an earlier verse shown above: nothing more to say for it)
      if (many && seen.size) {
        if (wide) { box.remove (); blocks.pop (); } else bodyEl.lastElementChild?.remove ();
        continue;
      }
      box.insertAdjacentHTML ("beforeend", `<p>${none}</p>`);
      continue;
    }
    if (kind === "syntax") {
      const at = g.where[0][1] * 1000 + g.where[0][2];
      for (const n of g.notes) box.append (drawDiagram (JSON.parse (n.body) as Sentence, text, at));
      continue;
    }
    for (const n of g.notes) box.append (FOLDED.has (src.id) ? foldedNote (n) : noteElement (n));
  }
  if (! bodyEl.children.length) bodyEl.innerHTML = `<p>${none}</p>`;
  placed ();
}

/** A dictionary's (id: its source) articles for the verses (dictionary.ts' passageArticles: those citing each verse,
 *  then those its words lead to - one listed for an earlier verse not again), drawn as the notes are: each verse's
 *  under its reference when there are several (wide, each in its block; a verse with none of its own left out), each
 *  article an entry - its title over a line of it (its photo at the right, where it has one), tapped opening it in
 *  place. */
async function drawArticles (id: string, per: { v: number; where: number[][] }[], n: number, wide: boolean, many: boolean) {
  const lists = await passageArticles (textDb!, per.map ((p) => p.where), id);
  if (n !== updating) return;
  const ids = id + " " + per.map ((p, i) => p.v + ":" + lists[i].map ((a) => a.id).join (".")).join (",");
  if (ids === shownIds) return;
  shownIds = ids;
  clearInterlinear ();
  bodyEl.replaceChildren ();
  per.forEach (({ v, where }, i) => {
    if (! lists[i].length && (many || ! where.length)) { if (! where.length && ! many) bodyEl.innerHTML = LXX_ONLY; return; }
    const box = wide ? document.createElement ("div") : bodyEl;
    if (wide) { box.className = "vBlock"; box.dataset.verse = String (v); bodyEl.append (box); blocks.push ([v, box]); }
    if (many) {
      const h = document.createElement ("div");
      h.className = "src verseHead";
      h.textContent = `${chapter}:${v}`;
      box.append (h);
    }
    for (const a of lists[i]) box.append (entry (textDb!, a.id, a.title, a.line, a.why, id, a.photo));
  });
  if (! bodyEl.children.length) bodyEl.innerHTML = "<p>No articles on this verse.</p>";
  placed ();
}

//==== BY BOOK ====
// The Archaeology finds, the Ancient Parallels and the Ancient Historians (BY_BOOK) list the whole book's at once (dictionary.ts' bookArticles), each with its verses
// there, in the order of the first: drawn once a book, then following the text one way - the text scrolled, the list
// goes to the find of the verse read (the first find at it, else the next after it) unless that find is in view
// already, and every find's link to that verse is marked; the list scrolled (to look through it) moves nothing. Beside the Septuagint they're by verse as the
// dictionary's.
const BY_BOOK = new Set (["finds", "ane", "historians"]);
const NONE_IN_BOOK: Record<string, string> = { finds: "No finds bear on this book.", ane: "No parallels for this book.",
                                               historians: "No historians' passages for this book." };
let bookShown = "";     // (The book drawn: "<source> <book id>")
let bookAt = -1;        // (The verse last followed to: chapter * 1000 + verse)
let bookRows: [number[], HTMLElement][] = [];     // (Each find's verses and its entry, in the list's order)
async function drawBookFinds (id: string) {
  const b = book!;
  const key = `${id} ${b.id}`;
  refEl.textContent = b.name;
  if (key !== bookShown) {
    bookShown = key; shownIds = key; bookAt = -1; bookRows = [];
    const n = ++updating;
    clearInterlinear ();
    blocks = []; anchors = null;
    bodyEl.innerHTML = "<p>Loading…</p>";
    const list = await bookArticles (textDb!, b.id, id);
    if (n !== updating) return;
    bodyEl.replaceChildren ();
    for (const a of list) {
      const el = entry (textDb!, a.id, a.title, a.line, "", id, a.photo);
      el.append (verseLinks (b.id, a.verses));
      bodyEl.append (el);
      bookRows.push ([a.verses, el]);
    }
    if (! list.length) bodyEl.innerHTML = `<p>${NONE_IN_BOOK[id]}</p>`;
    notesScroll.scrollTop = 0;
  }
  followBook ();
}
/** The list taken to the verse read (above), once that verse changes and the text leads. */
function followBook () {
  if (leader !== "text" || ! bookRows.length) return;
  const rows = [...document.querySelectorAll<HTMLElement> ("#chapter .vrow")];
  const top = main.getBoundingClientRect ().top + 6;
  const row = isWide () ? rows.find ((r) => r.getBoundingClientRect ().bottom > top) : null;
  const v = chapter * 1000 + (row ? Number (row.dataset.verse ?? 1) : versesNow ()[0]);
  if (v === bookAt) return;
  bookAt = v;
  markVerse (bodyEl, v);     // (Every find's link to the verse read marked, shown even among those "+ more" hides)
  const target = (bookRows.find (([vs]) => vs.includes (v)) ?? bookRows.find (([vs]) => vs.some ((x) => x >= v)) ?? bookRows[bookRows.length - 1])[1];
  const nt = notesScroll.getBoundingClientRect (), t = target.getBoundingClientRect ();
  if (t.top >= nt.top && t.top < nt.bottom - 40) return;     // (Its heading in view already: stays)
  notesScroll.scrollTop += t.top - nt.top - parseFloat (getComputedStyle (notesScroll).paddingTop);
}

/** The atlas for the verses (atlas.ts' passageMap): its one map, kept while the atlas is picked, set to their places. */
let atlasView: ReturnType<typeof passageMap> | null = null;
async function drawAtlas (per: { v: number; where: number[][] }[], n: number, many: boolean) {
  const ids = "atlas " + per.map ((p) => p.v + ":" + p.where.join ("/")).join (",");
  if (ids === shownIds) return;
  shownIds = ids;
  atlasView ??= passageMap (textDb!);
  if (atlasView.el.parentElement !== bodyEl) { clearInterlinear (); bodyEl.replaceChildren (atlasView.el); }
  await atlasView.update (book!.id, chapter, per, many ? "No places named in this chapter." : "No places named in this verse.");
  if (n === updating) placed ();
}

/** The notes just drawn placed: narrow, from their top; wide, at the text's place (TWO-WAY SCROLLING). */
function placed () {
  if (! isWide ()) { notesScroll.scrollTop = 0; return; }
  leader = "text"; anchors = null; jump = true; sync ();
}

/** The Hebrew verses an LXX verse translates, as the panel labels them: 23:0–1, 10:18; 11:0. */
function refs (where: number[][]): string {
  const out: string[] = [];
  for (let i = 0; i < where.length;) {
    let k = i;
    while (k + 1 < where.length && where[k + 1][1] === where[i][1] && where[k + 1][2] === where[k][2] + 1) k++;
    out.push (`${where[i][1]}:${where[i][2]}` + (k > i ? `–${where[k][2]}` : ""));
    i = k + 1;
  }
  return out.join ("; ");
}

/** A note as the panel draws it (Chapter Study's too: chapterstudy.ts): its range when it spans verses, the words it's
 *  on, its body - the pipeline's own HTML, a few tags only (notes.py's docstring lists them). */
export function noteElement (n: Note): HTMLElement {
  const el = document.createElement ("div");
  el.className = "note";
  el.innerHTML = (n.start !== n.end ? `<div class="src">${range (n.start, n.end)}</div>` : "")
               + (n.quote ? `<p class="nQuote">${n.quote}</p>` : "") + n.body;
  return el;
}

/** The church fathers' sources (FOLDED), whose quotes can run long: each note folded to its father and work over a
 *  line of it, as a dictionary's entry is (the same row, .hit) - tapped, the quote opens under it; tapped again, it
 *  folds - so the reader goes from Tertullian to Hippolytus without scrolling through Tertullian. The father and work
 *  are the body's lead (<b>father</b> <small>(work)</small>), taken off the quote. */
const FOLDED = new Set (["catena", "fathers"]);
function foldedNote (n: Note): HTMLElement {
  const full = noteElement (n);
  const lead = full.querySelector ("p > b");
  const work = lead?.nextElementSibling?.tagName === "SMALL" ? lead.nextElementSibling : null;
  const el = document.createElement ("div");
  const row = document.createElement ("button");
  row.className = "hit";
  row.setAttribute ("aria-expanded", "false");
  const head = document.createElement ("span");
  head.className = "src";
  head.textContent = lead?.textContent ?? "";
  if (work) {
    const w = document.createElement ("span");
    w.className = "dictWhy";     // (The work as written, not in the heading's capitals)
    w.textContent = ` · ${(work.textContent ?? "").replace (/^\(|\)$/g, "")}`;
    head.append (w);
  }
  lead?.remove (); work?.remove ();
  const line = document.createElement ("span");
  line.className = "hitText dictLine";     // (One line, cut: style.css)
  line.textContent = (full.textContent ?? "").trim ();
  row.append (head, line);
  full.classList.add ("dictBody");
  full.hidden = true;
  row.addEventListener ("click", () => { full.hidden = ! full.hidden; line.hidden = ! full.hidden; row.setAttribute ("aria-expanded", String (! full.hidden)); });
  el.append (row, full);
  return el;
}

/** The sources with notes for a book in its own testament (Chapter Study's list: chapterstudy.ts) - beside the
 *  Septuagint only its own (not the Hebrew's, as the picker offers them). */
export const sourcesFor = (b: Book) => sources.filter ((s) => offers (s, b.testament) && covers (s, b));

/** A note's range as the panel labels it: 1:2–5, 1:1–2:3. */
function range (start: number, end: number): string {
  const [c1, v1, c2, v2] = [Math.floor (start / 1000), start % 1000, Math.floor (end / 1000), end % 1000];
  return c1 === c2 ? `${c1}:${v1}–${v2}` : `${c1}:${v1}–${c2}:${v2}`;
}

// Following: the text scrolled (a frame at a time), and each word lit while reading aloud (audio.ts).
let frame = 0;
// (The verses not changed while the word's panel shows a word of the Hebrew OT here: the panel scrolls the text to keep
// a word in view, which would move the notes on to another verse, the word tapped with them.)
const follow = () => {
  if (! frame && ! panel.hidden) frame = requestAnimationFrame (() => { frame = 0; if (! panel.querySelector (".w.on")) update (); sync (); });
};
main.addEventListener ("scroll", follow, { passive: true });
document.addEventListener ("cotext:reading", () => { leader = "text"; follow (); });     // (The text leads while ▶ reads)
// Narrow and wide show different verses: redrawn on crossing over.
onWideChange (() => { shownVerse = ""; shownIds = null; if (! panel.hidden) show (); });

//==== TWO-WAY SCROLLING ====
// Wide, the text and the notes scroll together: whichever the finger, pen or wheel was last put on leads (pointerdown,
// touchstart, wheel), the other follows - set a frame at a time from the leader's place. The follower's own scroll
// events (from being set) are ignored, so neither drives the other back: no loop, no jitter. Two ways of following:
// - In step (a translation, and the Hebrew OT beside the Septuagint: read verse for verse against the text): the
//   follower moves with every bit of the leader's scroll, below.
// - Loosely (every other kind - commentaries, apparatus, ancient versions, diagrams, the dictionary - not tied line
//   for line to the text, so the reader can move about in them): the follower stays put while the verse it leads with
//   (its first verse in view - the panel's block at its top, the text's first row in view) is still in the leader's
//   view, and only once that verse has left it jumps straight to the leader's first verse (loose, below). The atlas
//   is one map, no blocks: neither follows.
// In step, places map through anchors -
// each verse's row top in the text paired with its notes' top in the panel, plus both tops and both ends - piecewise
// linearly, so at a verse's start in either the other is at the same verse's start, and in between both move smoothly
// (a long note on one verse scrolls through while the text moves through that verse). A verse whose notes are another
// verse's (inside a range note) has no anchor: it's within the range's span. Anchors are measured once and again only
// when either side's content changes size (a redraw, a width dragged, helps shown or hidden).
let leader: "text" | "notes" = "text";
let anchors: { t: number; r: number }[] | null = null;
for (const [el, who] of [[main, "text"], [notesScroll, "notes"]] as const)
  for (const ev of ["pointerdown", "touchstart", "wheel"]) el.addEventListener (ev, () => { leader = who; }, { passive: true });
notesScroll.addEventListener ("scroll", () => { if (leader === "notes") follow (); }, { passive: true });
const remeasure = () => { anchors = null; follow (); };
new ResizeObserver (remeasure).observe (document.getElementById ("chapter")!);
new ResizeObserver (remeasure).observe (bodyEl);

/** The anchors (above): [text scrollTop, panel scrollTop] pairs, rising in both. */
function anchorsNow () {
  if (anchors) return anchors;
  const t0 = main.getBoundingClientRect ().top - main.scrollTop;
  const r0 = notesScroll.getBoundingClientRect ().top - notesScroll.scrollTop + parseFloat (getComputedStyle (notesScroll).paddingTop);
  const rows = new Map ([...document.querySelectorAll<HTMLElement> ("#chapter .vrow")].map ((r) => [Number (r.dataset.verse), r]));
  const a = [{ t: 0, r: 0 }];
  for (const [v, el] of blocks) {
    const row = rows.get (v);
    if (! row) continue;
    const t = row.getBoundingClientRect ().top - t0 - 6, r = el.getBoundingClientRect ().top - r0;     // (6: the row a little below the edge)
    if (t > a[a.length - 1].t && r > a[a.length - 1].r) a.push ({ t, r });
  }
  const end = { t: main.scrollHeight, r: notesScroll.scrollHeight };
  if (end.t > a[a.length - 1].t && end.r > a[a.length - 1].r) a.push (end);
  return anchors = a;
}

/** x on one side (from) to the place on the other (to), between the anchors around it. */
function across (x: number, from: "t" | "r", to: "t" | "r") {
  const a = anchorsNow ();
  let i = 0;
  while (i < a.length - 2 && a[i + 1][from] <= x) i++;
  if (a.length < 2) return x;
  const f = (x - a[i][from]) / (a[i + 1][from] - a[i][from]);
  return a[i][to] + Math.max (0, Math.min (1, f)) * (a[i + 1][to] - a[i][to]);
}

/** The follower set from the leader (wide, the panel open with its notes drawn). */
function sync () {
  if (! isWide () || panel.hidden || ! blocks.length) return;
  const kind = current ()?.kind;
  if (kind !== "translation" && kind !== "original") { loose (); return; }
  const [lead, follower, from, to] = leader === "text" ? [main, notesScroll, "t", "r"] as const : [notesScroll, main, "r", "t"] as const;
  const want = Math.round (across (lead.scrollTop, from, to));
  if (Math.abs (follower.scrollTop - want) >= 1) follower.scrollTop = want;
}

// (Loose following. jump: the notes just drawn - the panel goes to the text's first verse whatever it showed before)
let jump = false;

/** Loose following (above): the follower jumps to the leader's first verse in view only once its own first verse has
 *  left the leader's view. A verse with no block of its own (inside a range note) is its block's - the last at or
 *  before it. */
function loose () {
  const mt = main.getBoundingClientRect (), nt = notesScroll.getBoundingClientRect ();
  const top = { t: mt.top + 6, r: nt.top + parseFloat (getComputedStyle (notesScroll).paddingTop) };     // (6: as the anchors')
  const bottom = { t: mt.bottom, r: nt.bottom };
  const rows = [...document.querySelectorAll<HTMLElement> ("#chapter .vrow")];
  const verse = (r: HTMLElement) => Number (r.dataset.verse ?? 1);
  // Each side's verses as [verse, its element's top and the next's top (its end)] in order; its first in view the first
  // ending more than 2 px below its top (a block just scrolled to sits a fraction of a pixel off)
  const textSpans = rows.map ((r, i) => [verse (r), r.getBoundingClientRect ().top,
                                         i + 1 < rows.length ? rows[i + 1].getBoundingClientRect ().top : r.getBoundingClientRect ().bottom] as const);
  const noteSpans = blocks.map (([v, el], i) => [v, el.getBoundingClientRect ().top,
                                                 i + 1 < blocks.length ? blocks[i + 1][1].getBoundingClientRect ().top : el.getBoundingClientRect ().bottom] as const);
  const spans = { t: textSpans, r: noteSpans };
  const first = (side: "t" | "r") => spans[side].find (([, , e]) => e > top[side] + 2) ?? spans[side][spans[side].length - 1];
  const at = (side: "t" | "r", v: number) => spans[side].filter (([w]) => w <= v).pop () ?? spans[side][0];
  const seen = (side: "t" | "r", v: number) => { const [, a, e] = at (side, v); return e > top[side] && a < bottom[side]; };
  const [from, to, follower] = leader === "text" ? ["t", "r", notesScroll] as const : ["r", "t", main] as const;
  if (! spans.t.length || ! spans.r.length) return;
  const mine = first (to);
  if (! jump && mine && seen (from, mine[0])) return;
  jump = false;
  const target = at (to, first (from)[0]);
  const want = Math.round (follower.scrollTop + target[1] - top[to]);
  if (Math.abs (follower.scrollTop - want) >= 1) follower.scrollTop = want;
}

//==== SENTENCE DIAGRAM ====
// A sentence (diagram.py's tree): its clauses, each a box - its joining words (καί, ὅτι, וְ, כִּי, אֲשֶׁר...) first,
// then its phrases side by side, wrapping onto more lines as the width needs, each labeled by its role (subject,
// verb, object...) above its words - the original, the English under it. A clause inside a phrase (a "that..." clause,
// a relative, a participle's or an infinitive's, speech) is a box of its own inside that phrase, taking the phrase's
// whole width, so the nesting reads as indents. Hebrew right to left (the phrases in the text's order from the
// right), the labels and glosses left to right. Words of another verse (a sentence over several) dimmed.

type DWord = [number, number] | [string, string, number];     // [ref, word number]: the text's word; [text, gloss, ref]: MACULA's own
interface DClause { j?: DWord[]; t?: string; p: DPhrase[]; }
interface DPhrase { r: string; w: (DWord | DClause)[]; }
export interface Sentence { l: "he" | "grc"; c: DClause[]; }

const ROLES: Record<string, string> = { s: "subject", v: "verb", vc: "verb (linking)", o: "object", o2: "second object",
  io: "indirect object", p: "predicate", adv: "adverbial", aux: "particle", "": "" };
const KINDS: Record<string, string> = { relative: "relative clause", participle: "participle clause",
  infinitive: "infinitive clause" };

/** A sentence's diagram; text: the text's words of its verses ("ref:n" -> [text, gloss], read by update); at: the verse
 *  shown (ref), the others' words dimmed. */
export function drawDiagram (s: Sentence, text: Map<string, [string, string]>, at: number): HTMLElement {
  const he = s.l === "he";
  const el = (tag: string, cls: string, txt?: string) => {
    const e = document.createElement (tag);
    e.className = cls;
    if (txt !== undefined) e.textContent = txt;
    return e;
  };
  // (Punctuation left off the words and glosses: the boxes do its work)
  const bare = (t: string) => t.replace (/[,.;:·\u0387\u05C3\u05C0\u05BE\u05C6]+$/u, "").replace (/^[\u05C0\s]+/u, "");
  const word = (w: DWord) => {
    const [t, g, ref] = typeof w[0] === "number" ? [...(text.get (`${w[0]}:${w[1]}`) ?? ["", ""]), w[0]] : w;
    const e = el ("span", "dgW" + (ref !== at ? " dgOff" : ""));
    e.append (el ("span", "dgT", bare (String (t))), el ("span", "dgG", bare (String (g)) || "\u00a0"));
    return e;
  };
  const clause = (c: DClause, nested: boolean) => {
    const box = el ("div", nested ? "dgC dgIn" : "dgC");
    // Its joining words first in the row of phrases, labeled with the clause's kind (or nothing) as a phrase is
    // with its role, so their words line up; a kind with no joining words a line over the phrases.
    const ps = el ("div", "dgPs");
    const kind = c.t ? KINDS[c.t] ?? "" : "";
    if (c.j?.length) {
      const j = el ("div", "dgP dgJ");
      const ws = el ("div", "dgWs");
      ws.append (...c.j.map (word));
      j.append (el ("div", "dgR", kind || "\u00a0"), ws);
      ps.append (j);
    } else if (kind) box.append (el ("div", "dgK", kind));
    for (const p of c.p) {
      const ph = el ("div", "dgP" + (p.w.some ((x) => ! Array.isArray (x)) ? " dgWide" : "") + (p.r ? " dg-" + p.r : ""));
      if (ROLES[p.r] ?? p.r) ph.append (el ("div", "dgR", ROLES[p.r] ?? p.r));
      const ws = el ("div", "dgWs");
      ws.append (...p.w.map ((x) => Array.isArray (x) ? word (x) : clause (x, true)));
      ph.append (ws);
      ps.append (ph);
    }
    box.append (ps);
    return box;
  };
  const root = el ("div", "dg " + (he ? "dgHe" : "dgGrc"));     // (Not .he / .grc: .gBody styles those as inline text)
  root.dir = he ? "rtl" : "ltr";
  root.append (...s.c.map ((c) => clause (c, false)));
  return root;
}

// The room between the heading and the play bar (--mid, style.css): with several of the panels open (the word's,
// the notes, the notes' Hebrew word's), they share it evenly with the text - a third each for two, a quarter for three. Measured at start and whenever the window or either bar changes size.
const midRoom = () => document.documentElement.style.setProperty ("--mid",
  `${innerHeight - document.querySelector<HTMLElement> (".head")!.offsetHeight - document.getElementById ("playBar")!.offsetHeight}px`);
midRoom ();
addEventListener ("resize", midRoom);
new ResizeObserver (midRoom).observe (document.querySelector (".head")!);
new ResizeObserver (midRoom).observe (document.getElementById ("playBar")!);
