// The notes panel: free commentaries, text-critical apparatuses, English translations and the ancient versions beside the
// text, following it. The icon at the play bar's right (left of the search's)
// opens and closes it. On a narrow screen it takes its place in the page's column above the play bar
// (under the word's panel when that's open, over the second word's panel, a Hebrew OT word's - nothing floats over the
// text), at most half the screen, scrolling; on a wide one in the panes' column at the right of the text, under the search when it's open (layout.ts).
// - Its picker (a <select class="choose">: COTEXT's plain list) lists the sources for the testament shown, grouped
//   ORIGINAL TEXT (beside the Septuagint: the Hebrew OT), SYNTAX, APPARATUS, COMMENTARIES, TRANSLATIONS and ANCIENT
//   VERSIONS - the database's note_sources (pipeline/notes.py) - so
//   swapping one is a tap; the choice is kept per testament on the device.
// - A source is its own database file, downloaded the first time it's picked and kept (db.ts: openNotesDb); one is
//   open at a time.
// - Narrow: the notes on one verse - the one being read aloud while ▶ reads (audio.ts signals each word lit), otherwise
//   the first whose last line is still in view at the text's top (until half of it is gone) - following as the text scrolls. Wide: the
//   notes on every verse of the chapter, each under its reference, scrolled in step with the text both ways (TWO-WAY
//   SCROLLING, below). A note on a range (1:1-18) shows once, at its first verse shown, its range above it; a
//   note on words (Translation Notes') shows them first. The list is redrawn only when the notes change, so a range
//   note read through several verses keeps its place. A translation or an ancient version (a Targum: its Aramaic,
//   right to left, with the English under it) is a source with a "note" per verse: its text.
// - A sentence diagram (SYNTAX: MACULA's trees, pipeline/diagram.py) is a "note" per sentence, its body the sentence's
//   tree as JSON, drawn here (drawDiagram) - so the drawing changes without the data rebuilt. A sentence running over
//   several verses shows on each, the words of the others dimmed.

import { openNotesDb, type Db } from "./db";
import type { Book } from "./reader";
import { drawInterlinear, clearInterlinear } from "./interlinear";
import { isWide, onWideChange, paneFrame } from "./layout";

export interface Source { id: string; kind: "original" | "commentary" | "apparatus" | "translation" | "version" | "syntax"; name: string; testaments: string; credit: string;
                   file: string; version: string; }

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
const HEBREW_TEXT = new Set (["diagram_ot", "mam", "minchatshai", "hottp", "stepbible", "dss", "tn"]);     // (tn: the Translation Notes, each on the Hebrew words it quotes)
const NOT_BESIDE_LXX = new Set ([...HEBREW_TEXT, "brenton"]);     // (Brenton: brenton_lxx instead, in the LXX's own numbers)
const LXX_ONLY = "<p>This verse is in the Septuagint only - not in the Hebrew Bible.</p>";
interface Note { id: number; start: number; end: number; quote: string; body: string; }

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
  const [s, b] = await Promise.all ([db.all ("SELECT id, kind, name, testaments, credit, file, version FROM note_sources"),
                                     db.all ("SELECT id, code, name, testament, chapters, heb, notes FROM books")]);
  sources = s as unknown as Source[];
  books = b as unknown as Book[];
  btn.hidden = ! sources.length;
}

/** The chapter shown (main.ts): the picker's sources follow its testament; the notes its verses. */
export function setNotesPassage (b: Book, c: number) {
  const was = book && scope ();
  book = b; chapter = c;
  heb = b.testament === "LXX" ? books.find ((x) => x.id === b.heb) ?? null : null;
  clearInterlinear ();
  if (scope () !== was) {
    pick.replaceChildren (...sourceGroups (mine ()));
    pick.value = current ()?.id ?? "";
  }
  shownVerse = ""; shownIds = null;
  if (! panel.hidden) show ();
}

/** Sources as a picker's choices (the notes' picker, the search's resources - search.ts): grouped by kind (optgroups),
 *  in the user's order, each by its name; a kind with none left out. */
export function sourceGroups (list: Source[]): HTMLOptGroupElement[] {
  const group = (kind: string, label: string) => {
    const g = document.createElement ("optgroup");
    g.label = label;
    g.append (...list.filter ((s) => s.kind === kind).map ((s) => new Option (s.name, s.id)));
    return g.children.length ? [g] : [];
  };
  return [...group ("original", "Original text"), ...group ("syntax", "Syntax"), ...group ("apparatus", "Apparatus"),
          ...group ("commentary", "Commentaries"), ...group ("translation", "Translations"), ...group ("version", "Ancient versions")];
}

/** The sources the search pane searches (search.ts): those for the whole Bible read - the Old Testament as picked
 *  (ot: the Hebrew Bible's, or beside the Septuagint as the picker offers them there) and the New - that are text in a
 *  file of their own: not the Hebrew OT (the main database's interlinear) nor the sentence diagrams (trees, not text). */
export const textSources = (ot: "OT" | "LXX") => sources.filter ((s) => s.file && s.kind !== "syntax"
  && (offers (s, "NT") || (ot === "OT" ? offers (s, "OT") : offers (s, "LXX") || (offers (s, "OT") && ! NOT_BESIDE_LXX.has (s.id)))));

/** A source's file opened as the notes open it (db.ts' openNotesDb: downloaded the first time, then kept) - the
 *  search's own handle on it, so searching never closes the notes' open source. */
export const openSource = (s: Source, onProgress: (fraction: number) => void) => openNotesDb (s.id, s.file, s.version, onProgress);

/** The picker's list and its kept choice: per testament, an LXX book with a Hebrew counterpart apart (LXXH). */
const scope = () => book?.testament === "LXX" && heb ? "LXXH" : book?.testament ?? "";
const offers = (s: Source, t: string) => s.testaments.split (" ").includes (t);
const mine = () => ! book ? [] : scope () === "LXXH"
  ? [HEBREW_OT, ...sources.filter ((s) => (offers (s, "OT") && ! NOT_BESIDE_LXX.has (s.id)) || offers (s, "LXX"))]
  : sources.filter ((s) => offers (s, book!.testament));
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
  if (src.file && open?.id !== src.id) {     // (The Hebrew OT has no file: it's the main database's)
    const n = ++loading;
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
// (A query of a source closed meanwhile - another picked - fails: that update was already superseded)
const update = () => { drawNotes ().catch ((e) => console.warn ("Notes:", e)); };
async function drawNotes () {
  const src = current ();
  if (panel.hidden || ! book || ! src || ! textDb || (src.file && open?.id !== src.id)) return;
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
    for (const n of g.notes) {
      const el = document.createElement ("div");
      el.className = "note";
      // (The body is the pipeline's own HTML: a few tags only - notes.py's docstring lists them)
      el.innerHTML = (n.start !== n.end ? `<div class="src">${range (n.start, n.end)}</div>` : "")
                   + (n.quote ? `<p class="nQuote">${n.quote}</p>` : "") + n.body;
      box.append (el);
    }
  }
  if (! bodyEl.children.length) bodyEl.innerHTML = `<p>${none}</p>`;
  placed ();
}

/** The notes just drawn placed: narrow, from their top; wide, at the text's place (TWO-WAY SCROLLING). */
function placed () {
  if (! isWide ()) { notesScroll.scrollTop = 0; return; }
  leader = "text"; anchors = null; sync ();
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
// events (from being set) are ignored, so neither drives the other back: no loop, no jitter. Places map through anchors -
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
  const [lead, follower, from, to] = leader === "text" ? [main, notesScroll, "t", "r"] as const : [notesScroll, main, "r", "t"] as const;
  const want = Math.round (across (lead.scrollTop, from, to));
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
interface Sentence { l: "he" | "grc"; c: DClause[]; }

const ROLES: Record<string, string> = { s: "subject", v: "verb", vc: "verb (linking)", o: "object", o2: "second object",
  io: "indirect object", p: "predicate", adv: "adverbial", aux: "particle", "": "" };
const KINDS: Record<string, string> = { relative: "relative clause", participle: "participle clause",
  infinitive: "infinitive clause" };

/** A sentence's diagram; text: the text's words of its verses ("ref:n" -> [text, gloss], read by update); at: the verse
 *  shown (ref), the others' words dimmed. */
function drawDiagram (s: Sentence, text: Map<string, [string, string]>, at: number): HTMLElement {
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
