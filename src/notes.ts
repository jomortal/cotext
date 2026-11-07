// The notes panel: free commentaries, text-critical apparatuses, English translations and the ancient versions beside the
// text, following it. The icon at the play bar's right (right of the search's)
// opens and closes it. It takes the panel's place beside the text (layout.ts: under it upright, at its right sideways
// - nothing floats over the text), scrolling; where that place has room (layout.ts' SPLIT) it shares it with the search
// (side by side the notes at the left, one over the other under the search).
// - Its picker (a <select class="choose">: COTEXT's plain list) lists the sources for the book shown (those with notes
//   for it: note_sources.books, pipeline/source_books.py - Rashi only in the Torah), grouped
//   ORIGINAL TEXT (beside the Septuagint: the Hebrew OT), SYNTAX, BIBLE BACKGROUND (the dictionaries, the
//   atlas and the timeline), TEXTUAL STUDIES (the apparatus and the Targums), COMMENTARIES and TRANSLATIONS - the database's note_sources (pipeline/notes.py; the dictionary's: tyndale_dict.py) - so
//   swapping one is a tap; the choice is kept per testament on the device, and stays through every book it covers.
// - A source is its own database file, downloaded the first time it's picked and kept (db.ts: openNotesDb); one is
//   open at a time.
// - Which verses show, and how the panel follows the text - the same on every screen, whatever its size:
//   - A translation, and the Hebrew OT beside the Septuagint: every verse of the chapter, in step with the text both
//     ways (TWO-WAY SCROLLING, below).
//   - A spotty source (SPOTTY, below: notes on under half the book's verses - HOTTP, John Lightfoot, Ramban, STEPBible's
//     and some books' Dead Sea Scrolls, church fathers, Rashi...): the whole book's notes at once, each verse's under
//     its chapter:verse, following the text one way (ONE-WAY FOLLOWING).
//   - Any other (commentaries with notes on most verses, apparatus, the Targums, diagrams, the dictionary): every verse
//     of the chapter, each verse's under its reference (verses with none left out), following the text both ways
//     loosely (TWO-WAY SCROLLING).
//   Following one way, the heading line names the verse read, and when it has no notes, where the next are ("Genesis
//   1:4 - no notes; next at 1:7"). A note on a range (1:1-18) shows once, at its first verse shown, its range above it; a
//   note on words (Translation Notes') shows them first. The list is redrawn only when the notes change, so a range
//   note read through several verses keeps its place. A translation or an ancient version (a Targum: its Aramaic,
//   right to left, with the English under it) is a source with a "note" per verse: its text.
// - A sentence diagram (SYNTAX: MACULA's trees, pipeline/diagram.py) is a "note" per sentence, its body the sentence's
//   tree as JSON, drawn here (drawDiagram) - so the drawing changes without the data rebuilt. A sentence running over
//   several verses shows on each, the words of the others dimmed.
// - A dictionary (DICTIONARY: the Tyndale Bible Dictionary, the Archaeology finds) lists articles, not notes: for each
//   verse those citing it, then those its words lead to (dictionary.ts' passageArticles), each its title over a line of
//   it (a find its photo at the right), tapped opening the article in place - drawn as the notes are (the chapter,
//   followed both ways loosely; an article listed once, at the first verse shown it's for) - except the
//   Archaeology finds, the Ancient Parallels and the Ancient Historians, listed by book (BY BOOK, below).
// - The atlas (MAPS: atlas.ts) is one map of the places the chapter names,
//   kept while it's picked and given the places as the verses change, the places listed under it with their verses.
// - The timeline (timeline.ts' timelinePane: the ☰ Timeline's drawing) is centered on the chapter's year, moving to
//   each new chapter's as the text changes.
// - The reading plan (READING: readingplan.ts' planPane, the ☰ Reading plan's days, read-only) is offered in every
//   book, not following the text: on the calendar today's month, else its days' list; a reading tapped going to its passage.

import { openNotesDb, type Db } from "./db";
import type { Book } from "./reader";
import { drawInterlinear, clearInterlinear } from "./interlinear";
import { paneFrame } from "./layout";
import { box } from "./zoom";     // (Boxes in CSS px, as scrollTop is, whatever the UI's scale)
import { passageArticles, entry, bookArticles, verseLinks, markVerse } from "./dictionary";
import { passageMap } from "./atlas";
import { timelinePane } from "./timeline";
import { planPane, planToToday } from "./readingplan";
import { setIcon } from "./icons";

export interface Source { id: string; kind: "original" | "commentary" | "dictionary" | "apparatus" | "translation" | "version" | "syntax" | "atlas" | "timeline" | "readingplan"; name: string; testaments: string; credit: string;
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
// Its frame (layout.ts' paneFrame, as the search pane's): the picker's row frozen over the scroller, the rest in the
// scroller; the ✕ then put back on the picker's row - the picker, the + (adding the resource to the Study printout:
// versecards.ts) and the ✕ on one line, evenly spaced (style.css' #notes > .top).
const notesClose = document.getElementById ("notesClose")!;
const notesScroll = paneFrame (panel, notesClose);
notesClose.parentElement!.remove (); panel.querySelector (":scope > .top")!.append (notesClose);
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
/** The reading plan (readingplan.ts): no file, every book's - after the database's sources, so never the first offered. */
const READING_PLAN: Source = { id: "readingplan", kind: "readingplan", name: "Reading plan", testaments: "OT NT LXX", file: "", version: "", credit: "" };
let shownIds: string | null = null;               // The notes drawn (their ids; null: none yet): redrawn only when they change
let blocks: [number, HTMLElement][] = [];          // Each verse shown and where its notes start in the panel (TWO-WAY SCROLLING)

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
 *  and the picked one comes back in the next book it covers. The timeline or the reading plan picked stays picked in
 *  the other testaments too. */
export function setNotesPassage (b: Book, c: number) {
  const was = book?.id, everywhere = ["timeline", "readingplan"].includes (current ()?.kind ?? "") ? current ()!.id : "";
  book = b; chapter = c;
  heb = hebrewOf (b);
  if (everywhere && picked[scope ()] !== everywhere) {     // (The timeline and the reading plan, covering every book, stay picked into another testament - the timeline following the text, the plan's readings tapped)
    picked[scope ()] = everywhere;
    try { localStorage.setItem (KEY, JSON.stringify (picked)); } catch { /* private mode: not kept */ }
  }
  clearInterlinear ();
  if (b.id !== was) {
    pick.replaceChildren (...sourceGroups (mine ()));
    pick.value = current ()?.id ?? "";
  }
  shownVerse = ""; shownIds = null;
  if (! panel.hidden) show ();
}

/** Sources as a picker's choices (the notes' picker, the search's resources - search.ts): grouped by kind (optgroups;
 *  the dictionaries, the atlas and the timeline together as BIBLE BACKGROUND, the apparatus and the ancient versions as TEXTUAL
 *  STUDIES), in the user's order (the timeline right after the atlas; the reading plan last, READING), each by its name; a group with none left out. */
export function sourceGroups (list: Source[]): HTMLOptGroupElement[] {
  const group = (kinds: string, label: string) => {
    const g = document.createElement ("optgroup");
    g.label = label;
    const these = list.filter ((s) => kinds.split (" ").includes (s.kind));
    const tl = these.findIndex ((s) => s.kind === "timeline"), at = these.findIndex ((s) => s.kind === "atlas");
    if (tl >= 0 && at >= 0) these.splice (at + (tl > at ? 1 : 0), 0, ...these.splice (tl, 1));     // (The timeline right after the atlas)
    g.append (...these.map ((s) => new Option (s.name, s.id)));
    return g.children.length ? [g] : [];
  };
  return [...group ("original", "Original text"), ...group ("syntax", "Syntax"), ...group ("dictionary atlas timeline", "Bible Background"),
          ...group ("apparatus version", "Textual Studies"), ...group ("commentary", "Commentaries"), ...group ("translation", "Translations"),
          ...group ("readingplan", "Reading")];
}

/** The sources the search pane searches (search.ts): those for the whole Bible read - the Old Testament as picked
 *  (ot: the Hebrew Bible's, or beside the Septuagint as the picker offers them there) and the New - that are text in a
 *  file of their own: not the Hebrew OT (the main database's interlinear), the sentence diagrams (trees, not text) nor
 *  the atlas (places on a map) nor the timeline. */
export const textSources = (ot: "OT" | "LXX") => sources.filter ((s) => s.file && s.kind !== "syntax" && s.kind !== "atlas" && s.kind !== "timeline"
  && (offers (s, "NT") || (ot === "OT" ? offers (s, "OT") : offers (s, "LXX") || (offers (s, "OT") && ! NOT_BESIDE_LXX.has (s.id)))));

/** The English translations keyed by the Hebrew Bible's and the NT's verses (not Brenton's own-numbered Septuagint),
 *  in the notes' order: the verse cards' TRANSLATION (versecards.ts). */
export const translationSources = () => sources.filter ((s) => s.kind === "translation" && (offers (s, "OT") || offers (s, "NT")));

/** Every source in the database (note_sources), as read at the start: the Resource reader's (resreader.ts). */
export const allSources = () => sources;

/** A source's file opened as the notes open it (db.ts' openNotesDb: downloaded the first time, then kept) - the
 *  search's own handle on it, so searching never closes the notes' open source. */
export const openSource = (s: Source, onProgress: (fraction: number) => void) => openNotesDb (s.id, s.file, s.version, onProgress);

/** The picker's list and its kept choice: per testament, an LXX book with a Hebrew counterpart apart (LXXH). */
const scope = () => book?.testament === "LXX" && heb ? "LXXH" : book?.testament ?? "";
const offers = (s: Source, t: string) => s.testaments.split (" ").includes (t);
/** Whether a source has notes for a book (none listed: every book). */
const covers = (s: Source, b: Book | null) => !! b && (! s.books || s.books.split (" ").includes (String (b.id)));
/** The Hebrew Bible book an LXX book translates (books.heb; null: none, or not an LXX book). */
export const hebrewOf = (b: Book) => b.testament === "LXX" ? books.find ((x) => x.id === b.heb) ?? null : null;
/** The sources offered for a book, in the notes' order: those with notes for it in its own testament - and, for an
 *  LXX book with a Hebrew counterpart, the Hebrew OT first and the Hebrew book's sources beside its own (BESIDE THE
 *  SEPTUAGINT). The picker's list (mine) and the Study printout's (sourcesFor). */
function offeredFor (b: Book): Source[] {
  const h = hebrewOf (b);
  return h ? [HEBREW_OT, ...sources.filter ((s) => (offers (s, "OT") && ! NOT_BESIDE_LXX.has (s.id) && covers (s, h)) || (offers (s, "LXX") && covers (s, b)))]
    : sources.filter ((s) => offers (s, b.testament) && covers (s, b));
}
const mine = () => book ? [...offeredFor (book), READING_PLAN] : [];     // (The reading plan the pane's alone: not the printout's - sourcesFor)
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

/** The resources pane opened on a source (search.ts: a result of it tapped, once the text has gone to its verse): picked
 *  as the picker picks - where the book read offers it - and the pane opened, showing the verse read. */
export function openNotesOn (id: string) {
  if (! book) return;
  if ([...pick.options].some ((o) => o.value === id) && pick.value !== id) { pick.value = id; pick.dispatchEvent (new Event ("change")); }
  if (panel.hidden) btn.click ();
}

/** The verses to show: every verse of the chapter. */
function versesNow (): number[] {
  const rows = [...document.querySelectorAll<HTMLElement> ("#chapter .vrow")].map ((r) => Number (r.dataset.verse ?? 1));
  return rows.length ? rows : [1];
}

/** Draws the notes for the verses now - loading the source's file first if it isn't open. */
// A dictionary's entries (articles, not verse by verse) each with its own + - adding that entry to the Study printout
// as an item of its own (chapterstudy.ts' addStudyEntry, given by setEntryAdd), turned ✓ once in; the panel's + over them hidden (the rest
// keep it: their notes go in by passage).
let addEntry: ((book: Book, chapter: number, src: string, id: string, title: string) => boolean) | null = null;
export const setEntryAdd = (f: typeof addEntry) => { addEntry = f; };
function withAdd (el: HTMLElement, src: string, id: string, title: string): HTMLElement {
  const b = document.createElement ("button");
  b.className = "pill icon entryAdd"; b.setAttribute ("aria-label", "Add to the Study printout");
  setIcon (b, "plus");
  b.addEventListener ("click", (e) => { e.stopPropagation (); if (book && addEntry?. (book, chapter, src, id, title)) setIcon (b, "check"); });
  el.classList.add ("withAdd"); el.prepend (b);
  return el;
}

async function show () {
  const src = current ();
  if (! book || ! src) return;
  document.getElementById ("notesAdd")!.hidden = src.kind === "dictionary" || src.kind === "readingplan";     // (A dictionary's + by each entry instead; the reading plan none)
  creditEl.textContent = src.credit;
  const n = ++loading;     // (A file still arriving for a source picked before: not shown)
  if (src.file && ! ownFile (src) && open?.id !== src.id) {     // (The Hebrew OT has no file: it's the main database's)
    ++updating;     // (Any update still reading the old source: dropped)
    open?.db.close (); open = null;
    refEl.textContent = "";
    bodyEl.innerHTML = "<p>Loading…</p>";
    bookShown = "";     // (The body no longer the book's list: drawn again once the file's open, not taken as still there)
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
/** A source whose file another module opens itself: the dictionary's (dictionary.ts), the atlas' (atlas.ts), the
 *  timeline's (timeline.ts). */
const ownFile = (s: Source) => s.kind === "dictionary" || s.kind === "atlas" || s.kind === "timeline";
// (A query of a source closed meanwhile - another picked - fails: that update was already superseded)
const update = () => { drawNotes ().catch ((e) => console.warn ("Notes:", e)); };
async function drawNotes () {
  const src = current ();
  if (panel.hidden || ! book || ! src || ! textDb || (src.file && ! ownFile (src) && open?.id !== src.id)) return;
  if (BY_BOOK.has (src.id) && book.testament !== "LXX") { drawBookFinds (src.id); return; }
  const b = book, db = open?.db;
  if (await spotty (src, b)) { if (current () === src && book === b) drawBookNotes (src); return; }
  if (current () !== src || book !== b) return;     // (Another source or book meanwhile: its own update draws it)
  bookShown = "";     // (Anything else drawn: the book's list gone)
  if (src.kind === "timeline") { drawTimeline (b); return; }
  if (src.kind === "readingplan") { drawPlan (); return; }
  const vs = versesNow ();
  const key = vs.join (",");
  if (key === shownVerse) return;     // (The same chapter: following meanwhile, follow's frame, below)
  shownVerse = key;
  const n = ++updating, still = () => n === updating;
  const hebrewKeyed = hebrewSide (src, b);
  const per = await placesOf (src, b, chapter, vs);
  if (! still ()) return;
  blocks = []; forget ();
  refEl.textContent = `${b.name} ${chapter}`;
  const all = per.flatMap ((p) => p.where);
  // (The interlinear out of .gBody: its .he would restyle the reader's rows as inline Hebrew text)
  bodyEl.classList.toggle ("gBody", src.kind !== "original");
  if (hebrewKeyed && all.length) refEl.textContent += ` - Hebrew ${heb!.name} ${refs (all)}`;
  if (! all.length) {
    if (shownIds === "lxx") return;
    shownIds = "lxx";
    oneWayFrom ("");
    clearInterlinear ();
    bodyEl.innerHTML = LXX_ONLY;
    return;
  }
  if (src.kind === "original") {
    const ids = "he " + all.join (" ");
    if (ids === shownIds) return;
    shownIds = ids;
    oneWayFrom ("");
    const el = document.createElement ("div");
    el.className = "besideText";
    // (Each Hebrew verse once, though two LXX verses may translate it; each LXX verse placed at the first of its own)
    const once = [...new Map (all.map (([, c, vv]) => [c * 1000 + vv, [c, vv] as [number, number]])).values ()];
    await drawInterlinear (el, textDb, heb!, once, () => still () && (bodyEl.replaceChildren (el), true));
    if (! still ()) return;
    for (const p of per) {
      const row = p.where.length && el.querySelector<HTMLElement> (`.vrow[data-chapter="${p.where[0][1]}"][data-verse="${p.where[0][2]}"]`);
      if (row) blocks.push ([p.v, row]);
    }
    placed ();
    return;
  }
  if (src.kind === "dictionary") { drawArticles (src.id, per, n); return; }
  if (src.kind === "atlas") { drawAtlas (per, n); return; }
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
  oneWayFrom ("");
  clearInterlinear ();
  bodyEl.replaceChildren ();
  const kind = src.kind;
  const none = kind === "translation" ? "Not in this translation." : kind === "version" ? "Not in this version."
             : kind === "syntax" ? "No diagram for this verse." : "No notes on this verse.";
  for (const g of groups) {
    const box = verseBlock (`${chapter}:${g.v}`, g.v);
    bodyEl.append (box); blocks.push ([g.v, box]);
    if (! g.where.length) { box.insertAdjacentHTML ("beforeend", LXX_ONLY); continue; }
    if (! g.notes.length) {
      // (A verse whose note began at an earlier verse shown above, or with none at all: left out)
      if (seen.size) { box.remove (); blocks.pop (); continue; }
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

/** A verse's block: its reference (label) as a heading, then its notes - marked with its verse (v) for TWO-WAY
 *  SCROLLING. The Resource reader's too (resreader.ts). */
export function verseBlock (label: string, v?: number): HTMLElement {
  const box = document.createElement ("div");
  box.className = "vBlock";
  if (v !== undefined) box.dataset.verse = String (v);
  const h = document.createElement ("div");
  h.className = "src verseHead";
  h.textContent = label;
  box.append (h);
  return box;
}

/** A dictionary's (id: its source) articles for the verses (dictionary.ts' passageArticles: those citing each verse,
 *  then those its words lead to - one listed for an earlier verse not again), drawn as the notes are: each verse's
 *  in its block under its reference (a verse with none of its own left out), each
 *  article an entry - its title over a line of it (its photo at the right, where it has one), tapped opening it in
 *  place. */
async function drawArticles (id: string, per: { v: number; where: number[][] }[], n: number) {
  const lists = await passageArticles (textDb!, per.map ((p) => p.where), id);
  if (n !== updating) return;
  const ids = id + " " + per.map ((p, i) => p.v + ":" + lists[i].map ((a) => a.id).join (".")).join (",");
  if (ids === shownIds) return;
  shownIds = ids;
  oneWayFrom ("");
  clearInterlinear ();
  bodyEl.replaceChildren ();
  per.forEach (({ v, where }, i) => {
    if (! lists[i].length) return;
    const box = verseBlock (`${chapter}:${v}`, v);
    bodyEl.append (box); blocks.push ([v, box]);
    for (const a of lists[i]) box.append (withAdd (entry (textDb!, a.id, a.title, a.line, a.why, id, a.photo), id, a.id, a.title));
  });
  if (! bodyEl.children.length) bodyEl.innerHTML = per.some ((p) => p.where.length) ? "<p>No articles in this chapter.</p>" : LXX_ONLY;
  placed ();
}

//==== ONE-WAY FOLLOWING ====
// The panel's list of a book's notes or entries (SPOTTY, BY BOOK) follows the text one way: the text scrolled (or read
// aloud), the list goes to the entry of the verse read - the text's first row in view - (the first at it, else the
// next after it) unless that entry's heading is in view already; the list scrolled (to read on in it) moves nothing.
// Every drawing that follows one way fills oneRows; followOneWay, run from follow's frame and after each such drawing,
// does the rest.
const IN_STEP = new Set (["translation", "original"]);     // (Read verse for verse against the text: followed in step - TWO-WAY SCROLLING)
let oneRows: [number[], HTMLElement][] = [];     // (Each entry's verses - chapter * 1000 + verse - and its element, in the list's order)
let oneAt = -1;                                  // (The verse last followed to)
let oneSay = "";                                 // (What the entries are, for the heading line - "notes"; "": the heading not changed - BY BOOK's)
let oneScope = "chapter";                        // (What the list holds: "chapter" or "book")

/** What a source's entries are called in the heading line ("Genesis 1:4 - no notes; next at 1:7"): a diagram, articles, text or notes. */
const noneWord = (kind: string) => kind === "syntax" ? "diagram" : kind === "dictionary" ? "articles" : kind === "version" ? "text" : "notes";

/** A drawing begun: following one way with nothing yet (say: what its entries are, as oneSay - "" for a drawing that
 *  doesn't follow one way, or keeps its heading; scope: what it holds). */
function oneWayFrom (say: string, scope = "chapter") {
  oneRows = []; oneAt = -1; oneSay = say; oneScope = scope;
}

/** The list just drawn placed: from its top, then at the verse read - the text leading, whatever was touched last. */
function placedOneWay () {
  leader = "text"; oneAt = -1;
  notesScroll.scrollTop = 0;
  followOneWay ();
}

/** The list taken to the verse read (above), once that verse changes and the text leads; the heading line (oneSay)
 *  names that verse, and when it has no entry, the next one's ("Genesis 1:4 - no notes; next at 1:7"). The entry is
 *  placed at the panel's top (the heading scrolls away with the rest - not held). */
function followOneWay () {
  if (leader !== "text" || ! oneRows.length || panel.hidden || ! book) return;
  const rows = [...document.querySelectorAll<HTMLElement> ("#chapter .vrow")];
  const top = box (main).top + 6;
  const row = rows.find ((r) => box (r).bottom > top);
  const v = chapter * 1000 + Number (row?.dataset.verse ?? 1);
  if (v === oneAt) return;
  oneAt = v;
  markVerse (bodyEl, v);     // (BY BOOK: every find's link to the verse read marked, shown even among those "+ more" hides)
  const hit = oneRows.find (([vs]) => vs.includes (v));
  const next = hit ?? oneRows.find (([vs]) => vs.some ((x) => x >= v));
  if (oneSay) {
    const at = (r: number) => `${Math.floor (r / 1000)}:${r % 1000}`;
    const after = next ? Math.min (...next[0].filter ((x) => x >= v)) : 0;
    refEl.textContent = `${book.name} ${at (v)}`
      + (hit ? "" : after ? ` - no ${oneSay}; next at ${at (after)}` : ` - no ${oneSay}; none after it in this ${oneScope}`);
  }
  const target = (next ?? oneRows[oneRows.length - 1])[1];
  const nt = box (notesScroll), t = box (target);
  // (The entry placed at the scroller's top, under its padding)
  const edge = nt.top + parseFloat (getComputedStyle (notesScroll).paddingTop);
  if (t.top >= edge - 1 && t.top < nt.bottom - 40) return;     // (Its heading in view already: stays)
  notesScroll.scrollTop += t.top - edge;
}

//==== SPOTTY ====
// A source with notes on under half a book's verses (SPOTTY: the verses a note covers, its range counted, against the
// book's verses in the text) shows that book's notes all at once, each verse's under its chapter:verse in order, and
// follows the text one way (above), so a reader sees what there is and where, rather than
// "no notes" verse after verse. Decided per source and book from the data, once (spottiness). Measured 2026-11-04:
// HOTTP (5-43 %), John Lightfoot (13-29 %), Ramban (19-36 %) in every book; STEPBible's apparatus in every OT book
// (1-24 %) and some NT letters (Romans, Philippians, the Pastorals, Hebrews...: 35-47 %); the SBLGNT apparatus in
// about half the NT; the Dead Sea Scrolls, the church fathers and Rashi in some books (the Dead Sea Scrolls' Joshua,
// Kings, Jeremiah; the fathers' Deuteronomy, Chronicles...; Rashi's Joshua, Judges, Samuel, Kings, Chronicles);
// Vincent's Matthew (41 %). Every other source covers more (Codex Sinaiticus, IGNTP, J. B. Lightfoot's Colossians,
// the Targums: every verse). Only commentaries, apparatus and ancient versions are measured: a diagram covers every
// sentence, and the dictionary's articles come from each verse's words too. Beside the Septuagint never (by verse, as
// BY BOOK's there).
const SPOTTY = 0.5;
const NOTE_KINDS = new Set (["commentary", "apparatus", "version"]);
const spottiness = new Map<string, Promise<boolean>> ();     // ("<source> <book id>" -> whether it's spotty there)
const bookVerses = new Map<number, Promise<number[]>> ();     // (A book's verses in the text, chapter * 1000 + verse, rising)
const versesOf = (id: number) => {
  let p = bookVerses.get (id);
  if (! p) {
    p = textDb!.all ("SELECT DISTINCT chapter * 1000 + verse AS r FROM words WHERE book = ? ORDER BY r", [id]).then ((rs) => rs.map ((r) => Number (r.r)));
    bookVerses.set (id, p);
    p.catch (() => bookVerses.delete (id));
  }
  return p;
};
/** The first index in a rising list at or above x. */
function lowerBound (xs: number[], x: number) {
  let lo = 0, hi = xs.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (xs[m] < x) lo = m + 1; else hi = m; }
  return lo;
}
/** Whether a source (its file open) is spotty in a book (above). */
function spotty (s: Source, b: Book): Promise<boolean> {
  if (! NOTE_KINDS.has (s.kind) || b.testament === "LXX" || open?.id !== s.id) return Promise.resolve (false);
  const k = `${s.id} ${b.id}`, db = open.db;
  let p = spottiness.get (k);
  if (! p) {
    p = Promise.all ([versesOf (b.id), db.all (`SELECT start, "end" FROM notes WHERE book = ?`, [b.id])]).then (([vs, ns]) => {
      const covered = new Set<number> ();
      for (const r of ns) for (let i = lowerBound (vs, Number (r.start)); i < vs.length && vs[i] <= Number (r.end); i++) covered.add (i);
      return vs.length > 0 && covered.size < SPOTTY * vs.length;
    });
    spottiness.set (k, p);
    p.catch (() => spottiness.delete (k));     // (Its file closed meanwhile: measured again next time)
  }
  return p;
}

/** A spotty source's notes on the whole book (above): each verse's in a block under its chapter:verse, a note on a
 *  range under its first verse (its range above it), the church fathers' folded; drawn once a book, then followed. */
async function drawBookNotes (src: Source) {
  const b = book!, key = `${src.id} ${b.id}`;
  if (key !== bookShown) {
    bookShown = key; shownIds = key; shownVerse = "";
    oneWayFrom (noneWord (src.kind), "book");
    const n = ++updating;
    clearInterlinear ();
    blocks = []; forget ();
    bodyEl.classList.add ("gBody");
    refEl.textContent = b.name;
    bodyEl.innerHTML = "<p>Loading…</p>";
    const [notes, vs] = await Promise.all ([open!.db.all (`SELECT rowid AS id, start, "end", quote, body FROM notes WHERE book = ?
                                                           ORDER BY start, "end" DESC, ord`, [b.id]) as unknown as Promise<Note[]>, versesOf (b.id)])
      .catch ((e) => { unshown (key); throw e; });
    if (n !== updating) { unshown (key); return; }
    bodyEl.replaceChildren ();
    let at = -1, box: HTMLElement | null = null, refsHere: number[] = [];
    for (const nt of notes) {
      if (nt.start !== at || ! box) {
        at = nt.start;
        box = verseBlock (`${Math.floor (at / 1000)}:${at % 1000}`);
        refsHere = [];
        bodyEl.append (box);
        oneRows.push ([refsHere, box]);
      }
      box.append (FOLDED.has (src.id) ? foldedNote (nt) : noteElement (nt));
      for (let i = lowerBound (vs, nt.start); i < vs.length && vs[i] <= nt.end; i++) if (! refsHere.includes (vs[i])) refsHere.push (vs[i]);
      if (! refsHere.includes (nt.start)) refsHere.unshift (nt.start);     // (A note on a verse the text lacks: still its own)
    }
    if (! notes.length) bodyEl.innerHTML = `<p>No ${oneSay} on this book.</p>`;
    placedOneWay ();
    return;
  }
  followOneWay ();
}

//==== BY BOOK ====
// The Archaeology finds, the Ancient Parallels and the Ancient Historians (BY_BOOK) list the whole book's at once
// (dictionary.ts' bookArticles), each with its verses there, in the order of the first: drawn once a book, then
// following the text one way (ONE-WAY FOLLOWING), every find's link to the verse read marked. Beside the Septuagint
// they're by verse as the dictionary's.
const BY_BOOK = new Set (["finds", "ane", "historians"]);
const NONE_IN_BOOK: Record<string, string> = { finds: "No finds bear on this book.", ane: "No parallels for this book.",
                                               historians: "No historians' passages for this book." };
let bookShown = "";     // (The book drawn - here or by SPOTTY: "<source> <book id>"; "" once anything else is in the body)
/** A book's list not drawn after all (superseded, or its query failed - the body left saying "Loading…"): forgotten, so
 *  it's drawn the next time it's asked for, not taken as already there. */
const unshown = (key: string) => { if (bookShown === key) bookShown = ""; };
async function drawBookFinds (id: string) {
  const b = book!;
  const key = `${id} ${b.id}`;
  refEl.textContent = b.name;
  if (key !== bookShown) {
    bookShown = key; shownIds = key; shownVerse = "";
    oneWayFrom ("");
    const n = ++updating;
    clearInterlinear ();
    blocks = []; forget ();
    bodyEl.innerHTML = "<p>Loading…</p>";
    const list = await bookArticles (textDb!, b.id, id).catch ((e) => { unshown (key); throw e; });
    if (n !== updating) { unshown (key); return; }
    bodyEl.replaceChildren ();
    for (const a of list) {
      const el = withAdd (entry (textDb!, a.id, a.title, a.line, "", id, a.photo), id, a.id, a.title);
      el.append (verseLinks (b.id, a.verses));
      bodyEl.append (el);
      oneRows.push ([a.verses, el]);
    }
    if (! list.length) bodyEl.innerHTML = `<p>${NONE_IN_BOOK[id]}</p>`;
    placedOneWay ();
    return;
  }
  followOneWay ();
}

/** The atlas for the verses (atlas.ts' passageMap): its one map, kept while the atlas is picked, set to their places. */
let atlasView: ReturnType<typeof passageMap> | null = null;
async function drawAtlas (per: { v: number; where: number[][] }[], n: number) {
  const ids = "atlas " + per.map ((p) => p.v + ":" + p.where.join ("/")).join (",");
  if (ids === shownIds) return;
  shownIds = ids;
  oneWayFrom ("");
  atlasView ??= passageMap (textDb!);
  if (atlasView.el.parentElement !== bodyEl) { clearInterlinear (); bodyEl.replaceChildren (atlasView.el); }
  await atlasView.update (book!.id, chapter, per, "No places named in this chapter.");
  if (n === updating) placed ();
}

/** The timeline for the chapter (timeline.ts' timelinePane: one view, eased from chapter to chapter). */
async function drawTimeline (b: Book) {
  const ids = `timeline ${b.id}:${chapter}`;
  if (ids === shownIds) return;
  shownIds = ids; shownVerse = "";
  const n = ++updating;
  oneWayFrom ("");
  blocks = []; forget ();
  refEl.textContent = `${b.name} ${chapter}`;
  bodyEl.classList.remove ("gBody");     // (Its line in its own small type, not the notes')
  const got = await timelinePane (b.id, chapter, b.name);
  if (n !== updating) return;
  if (typeof got === "string") { clearInterlinear (); bodyEl.innerHTML = `<p>${got}</p>`; return; }
  if (got.parentElement !== bodyEl) { clearInterlinear (); bodyEl.replaceChildren (got); }
  placed ();
  fitTimeline ();
}

/** The reading plan (readingplan.ts' planPane): put in at today's month (on the calendar), today in view; already shown (the
 *  text moved on - a reading tapped -, the pane opened again), its month and scroll kept, the plans read again. */
function drawPlan () {
  if (shownIds === "readingplan") return;
  shownIds = "readingplan"; shownVerse = "";
  ++updating;
  oneWayFrom ("");
  blocks = []; forget ();
  refEl.textContent = "";
  bodyEl.classList.remove ("gBody");
  const fresh = ! bodyEl.querySelector (".planPane");
  if (fresh) clearInterlinear ();
  const top = notesScroll.scrollTop;
  const el = planPane (fresh);
  if (fresh) { bodyEl.replaceChildren (el); planToToday (); }
  else notesScroll.scrollTop = top;     // (Drawn again in place - a reading tapped: kept where it was read - Safari would put it back at the top)
}

/** Under 700 px wide, the timeline as tall as the panel's room under its top (its canvas takes every drag, so the panel
 *  can't be scrolled by it: none of it may lie below the panel's edge) - 200 px at least; wider, its CSS height (style.css'
 *  .timelinePane, the same 700 px: the Timeline's height rule, the user still deciding it). Again whenever the panel's
 *  size changes. */
const TIMELINE_WIDE = matchMedia ("(min-width: 700px)");
function fitTimeline () {
  const t = bodyEl.querySelector<HTMLElement> (".timelinePane");
  if (! t) return;
  if (TIMELINE_WIDE.matches) { t.style.height = ""; return; }
  const pad = parseFloat (getComputedStyle (notesScroll).paddingBottom) || 0;
  const room = box (notesScroll).bottom - pad - (box (t).top + notesScroll.scrollTop);
  t.style.height = `${Math.max (200, Math.floor (room))}px`;
}
new ResizeObserver (() => fitTimeline ()).observe (notesScroll);

/** The notes just drawn placed at the text's place (TWO-WAY SCROLLING). */
function placed () {
  leader = "text"; forget (); jump = true; sync ();
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

/** A note as the panel draws it (Study printout's too: chapterstudy.ts): its range when it spans verses, the words it's
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
 *  are the body's lead (<b>father <span class="life">(dates)</span></b> <small>(work)</small>), taken off the quote;
 *  the dates keep their span, out of the heading's capitals (style.css' .life). */
export const FOLDED = new Set (["catena", "fathers"]);     // (Study printout filters them by father too)
export function foldedNote (n: Note): HTMLElement {
  const full = noteElement (n);
  const lead = full.querySelector ("p > b");
  const work = lead?.nextElementSibling?.tagName === "SMALL" ? lead.nextElementSibling : null;
  const el = document.createElement ("div");
  const row = document.createElement ("button");
  row.className = "hit";
  row.setAttribute ("aria-expanded", "false");
  const head = document.createElement ("span");
  head.className = "src";
  if (lead) head.append (...lead.childNodes);
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

/** The sources the Study printout offers for a book (chapterstudy.ts): the picker's (offeredFor) - beside the
 *  Septuagint the Hebrew book's too, each LXX verse's notes the Hebrew verses' (placesOf) - but the Hebrew OT, the
 *  printout's other text. */
export const sourcesFor = (b: Book) => offeredFor (b).filter ((s) => s !== HEBREW_OT);

/** Whether a source's notes beside a book are keyed by the Hebrew verses it translates: an LXX book with a Hebrew
 *  counterpart, and a source of the Hebrew Bible's (or the Hebrew OT itself). */
export const hebrewSide = (s: Source, b: Book) => !! hebrewOf (b) && (s.kind === "original" || offers (s, "OT"));
/** An LXX chapter's verses' Hebrew verses (the main database's lxx_heb: verse -> [book, chapter, verse][], in order),
 *  read once a chapter. */
const lxxHeb = new Map<string, Promise<Map<number, number[][]>>> ();
function hebrewVerses (b: Book, chapter: number) {
  const key = `${b.id}.${chapter}`;
  let p = lxxHeb.get (key);
  if (! p) {
    p = textDb!.all ("SELECT verse, hbook, hchapter, hverse FROM lxx_heb WHERE book = ? AND chapter = ? ORDER BY verse, hchapter, hverse", [b.id, chapter])
      .then ((rows) => {
        const m = new Map<number, number[][]> ();
        for (const r of rows) { const v = Number (r.verse); (m.get (v) ?? m.set (v, []).get (v)!).push ([Number (r.hbook), Number (r.hchapter), Number (r.hverse)]); }
        return m;
      });
    lxxHeb.set (key, p);
    p.catch (() => lxxHeb.delete (key));
  }
  return p;
}
/** Each verse's places whose notes show ([book, chapter, verse]): beside the Septuagint, a Hebrew-keyed source's
 *  (hebrewSide) the Hebrew verses it translates (none: the Hebrew lacks it - the Septuagint only); otherwise its own.
 *  The panel's and the Study printout's. */
export async function placesOf (s: Source, b: Book, chapter: number, vs: number[]): Promise<{ v: number; where: number[][] }[]> {
  if (! hebrewSide (s, b)) return vs.map ((v) => ({ v, where: [[b.id, chapter, v]] }));
  const m = await hebrewVerses (b, chapter);
  return vs.map ((v) => ({ v, where: m.get (v) ?? [] }));
}

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
  if (! frame && ! panel.hidden) frame = requestAnimationFrame (() => { frame = 0; if (! panel.querySelector (".w.on")) update (); sync (); followOneWay (); });
};
main.addEventListener ("scroll", follow, { passive: true });
document.addEventListener ("cotext:reading", () => { leader = "text"; follow (); });     // (The text leads while ▶ reads)

//==== TWO-WAY SCROLLING ====
// For a source that's not spotty (SPOTTY and BY BOOK: those follow one way, ONE-WAY FOLLOWING), the text and the notes scroll together: whichever the finger, pen or wheel was last put on leads (pointerdown,
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
/** The measurements kept (the anchors, loose following's spans) forgotten: measured again when next needed. */
function forget () { anchors = null; spansKept = null; }
for (const [el, who] of [[main, "text"], [notesScroll, "notes"]] as const)
  for (const ev of ["pointerdown", "touchstart", "wheel"]) el.addEventListener (ev, () => { leader = who; }, { passive: true });
notesScroll.addEventListener ("scroll", () => { if (leader === "notes") follow (); }, { passive: true });
const remeasure = () => { forget (); follow (); };
new ResizeObserver (remeasure).observe (document.getElementById ("chapter")!);
new ResizeObserver (remeasure).observe (bodyEl);

/** The anchors (above): [text scrollTop, panel scrollTop] pairs, rising in both. */
function anchorsNow () {
  if (anchors) return anchors;
  const t0 = box (main).top - main.scrollTop;
  const r0 = box (notesScroll).top - notesScroll.scrollTop + parseFloat (getComputedStyle (notesScroll).paddingTop);
  const rows = new Map ([...document.querySelectorAll<HTMLElement> ("#chapter .vrow")].map ((r) => [Number (r.dataset.verse), r]));
  const a = [{ t: 0, r: 0 }];
  for (const [v, el] of blocks) {
    const row = rows.get (v);
    if (! row) continue;
    const t = box (row).top - t0 - 6, r = box (el).top - r0;     // (6: the row a little below the edge)
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

/** The follower set from the leader (the panel open with its notes drawn). */
function sync () {
  if (panel.hidden || ! blocks.length) return;
  const kind = current ()?.kind;
  if (! IN_STEP.has (kind ?? "")) { loose (); return; }
  const [lead, follower, from, to] = leader === "text" ? [main, notesScroll, "t", "r"] as const : [notesScroll, main, "r", "t"] as const;
  const want = Math.round (across (lead.scrollTop, from, to));
  if (Math.abs (follower.scrollTop - want) >= 1) follower.scrollTop = want;
}

// (Loose following. jump: the notes just drawn - the panel goes to the text's first verse whatever it showed before)
let jump = false;

type Span = readonly [number, number, number];
let spansKept: { t: Span[]; r: Span[]; pad: number } | null = null;
/** Each side's verses as [verse, its element's top and the next's top (its end)] in order, measured within the side's
 *  scrolled content (0 its top) - once, and again only when the anchors are (forget: a redraw, a size changed) - and
 *  the panel's top padding. */
function spansNow () {
  if (spansKept && spansKept.r.length === blocks.length) return spansKept;     // (Blocks added since: measured again)
  const measure = <T,> (scroller: HTMLElement, items: T[], el: (x: T) => HTMLElement, verse: (x: T) => number): Span[] => {
    const base = box (scroller).top - scroller.scrollTop;
    const r = items.map ((x) => box (el (x)));
    return items.map ((x, i) => [verse (x), r[i].top - base, (i + 1 < r.length ? r[i + 1].top : r[i].bottom) - base] as const);
  };
  const rows = [...document.querySelectorAll<HTMLElement> ("#chapter .vrow")];
  return spansKept = { t: measure (main, rows, (r) => r, (r) => Number (r.dataset.verse ?? 1)),
                       r: measure (notesScroll, blocks, ([, el]) => el, ([v]) => v),
                       pad: parseFloat (getComputedStyle (notesScroll).paddingTop) };
}

/** Loose following (above): the follower jumps to the leader's first verse in view only once its own first verse has
 *  left the leader's view. A verse with no block of its own (inside a range note) is its block's - the last at or
 *  before it. */
function loose () {
  const mt = box (main), nt = box (notesScroll);
  const kept = spansNow ();
  const top = { t: mt.top + 6, r: nt.top + kept.pad };     // (6: as the anchors')
  const bottom = { t: mt.bottom, r: nt.bottom };
  // Each side's spans (spansNow) where they are now on the screen; its first in view the first ending more than 2 px
  // below its top (a block just scrolled to sits a fraction of a pixel off)
  const onScreen = (s: Span[], base: number) => s.map (([v, a, e]) => [v, a + base, e + base] as const);
  const spans = { t: onScreen (kept.t, mt.top - main.scrollTop), r: onScreen (kept.r, nt.top - notesScroll.scrollTop) };
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
