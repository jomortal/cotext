// The notes panel: free commentaries, text-critical apparatuses, English translations and the ancient versions beside the
// text, following it. The icon right of
// ▶ in the play bar opens and closes it; it takes its place in the page's column above the play bar (under the word's
// panel when that's open - nothing floats over the text), at most half the screen, scrolling.
// - Its picker (a <select class="choose">: COTEXT's plain list) lists the sources for the testament shown, grouped
//   SYNTAX, APPARATUS, COMMENTARIES, TRANSLATIONS and ANCIENT VERSIONS - the database's note_sources (pipeline/notes.py) - so
//   swapping one is a tap; the choice is kept per testament on the device.
// - A source is its own database file, downloaded the first time it's picked and kept (db.ts: openNotesDb); one is
//   open at a time.
// - It shows the notes on one verse: the verse being read aloud while ▶ reads (audio.ts signals each word lit),
//   otherwise the verse at the top of the view (the first whose line shows under the heading, as ▶ starts from),
//   following as the reader scrolls. A note on a range (1:1-18) shows on each of its verses, its range above it; a
//   note on words (Translation Notes') shows them first. The list is redrawn only when the notes change, so a range
//   note read through several verses keeps its place. A translation or an ancient version (a Targum: its Aramaic,
//   right to left, with the English under it) is a source with a "note" per verse: its text.
// - A sentence diagram (SYNTAX: MACULA's trees, pipeline/diagram.py) is a "note" per sentence, its body the sentence's
//   tree as JSON, drawn here (drawDiagram) - so the drawing changes without the data rebuilt. A sentence running over
//   several verses shows on each, the words of the others dimmed.

import { openNotesDb, type Db } from "./db";
import type { Book } from "./reader";

interface Source { id: string; kind: "commentary" | "apparatus" | "translation" | "version" | "syntax"; name: string; testaments: string; credit: string;
                   file: string; version: string; }
interface Note { id: number; start: number; end: number; quote: string; body: string; }

const KEY = "cotext.notes";
const picked: Record<string, string> = {};     // testament -> source id
try { Object.assign (picked, JSON.parse (localStorage.getItem (KEY) ?? "{}")); } catch { /* none kept, or private mode */ }

const panel = document.getElementById ("notes")!;
const btn = document.getElementById ("notesBtn")!;
const pick = document.getElementById ("notesPick") as HTMLSelectElement;
const refEl = document.getElementById ("notesRef")!;
const bodyEl = document.getElementById ("notesBody")!;
const creditEl = document.getElementById ("notesCredit")!;
const main = document.querySelector ("main")!;

let sources: Source[] = [];
let textDb: Db | null = null;                     // The main database: a diagram's matched words are read from it
let book: Book | null = null;
let chapter = 1;
let open: { id: string; db: Db } | null = null;     // The source's file open now
let loading = 0;                                   // (A load's number: a later pick wins over one still arriving)
let shownVerse = -1;
let shownIds: string | null = null;               // The notes drawn (their ids; null: none yet): redrawn only when they change

export function initNotes (db: Db) {
  textDb = db;
  sources = db.all ("SELECT id, kind, name, testaments, credit, file, version FROM note_sources") as unknown as Source[];
  btn.hidden = ! sources.length;
}

/** The chapter shown (main.ts): the picker's sources follow its testament; the notes its verses. */
export function setNotesPassage (b: Book, c: number) {
  const testament = book?.testament;
  book = b; chapter = c;
  if (b.testament !== testament) {
    const group = (kind: string, label: string) => {
      const g = document.createElement ("optgroup");
      g.label = label;
      g.append (...mine ().filter ((s) => s.kind === kind).map ((s) => new Option (s.name, s.id)));
      return g.children.length ? [g] : [];
    };
    pick.replaceChildren (...group ("syntax", "Syntax"), ...group ("apparatus", "Apparatus"),     // (The user's order)
                       ...group ("commentary", "Commentaries"), ...group ("translation", "Translations"),
                       ...group ("version", "Ancient versions"));
    pick.value = current ()?.id ?? "";
  }
  shownVerse = -1; shownIds = null;
  if (! panel.hidden) show ();
}

const mine = () => sources.filter ((s) => book && s.testaments.split (" ").includes (book.testament));
const current = () => mine ().find ((s) => s.id === picked[book?.testament ?? ""]) ?? mine ()[0];

pick.addEventListener ("change", () => {
  if (! book) return;
  picked[book.testament] = pick.value;
  try { localStorage.setItem (KEY, JSON.stringify (picked)); } catch { /* private mode: not kept */ }
  shownVerse = -1; shownIds = null;
  show ();
});

btn.addEventListener ("click", () => {
  panel.hidden = ! panel.hidden;
  btn.setAttribute ("aria-pressed", String (! panel.hidden));
  shownVerse = -1; shownIds = null;
  if (! panel.hidden) show ();
});
document.getElementById ("notesClose")!.addEventListener ("click", () => { if (! panel.hidden) btn.click (); });

/** The verse to show: the one being read aloud, else the first whose line shows at the top of the view. */
function verseNow (): number {
  const reading = document.querySelector ("#chapter .w.reading")?.closest<HTMLElement> (".vrow");
  const top = main.getBoundingClientRect ().top;
  const row = reading ?? [...document.querySelectorAll<HTMLElement> ("#chapter .vrow")]
    .find ((r) => r.getBoundingClientRect ().bottom > top + 8);
  return Number (row?.querySelector (".vnum")?.textContent ?? 1);
}

/** Draws the notes for the verse now - loading the source's file first if it isn't open. */
async function show () {
  const src = current ();
  if (! book || ! src) return;
  creditEl.textContent = src.credit;
  if (open?.id !== src.id) {
    const n = ++loading;
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

/** The notes for the verse now, drawn if they differ from those shown. */
function update () {
  if (panel.hidden || ! open || ! book) return;
  const v = verseNow ();
  if (v === shownVerse) return;
  shownVerse = v;
  refEl.textContent = `${book.name} ${chapter}:${v}`;
  const at = chapter * 1000 + v;
  const notes = open.db.all (`SELECT rowid AS id, start, "end", quote, body FROM notes WHERE book = ? AND start <= ? AND "end" >= ?
                              ORDER BY start, "end" DESC, ord`, [book.id, at, at]) as unknown as Note[];
  const ids = notes.map ((n) => n.id).join (",");
  if (ids === shownIds) return;
  shownIds = ids;
  bodyEl.replaceChildren ();
  if (! notes.length) {
    const kind = current ()?.kind;
    bodyEl.innerHTML = kind === "translation" ? "<p>Not in this translation.</p>"
                     : kind === "version" ? "<p>Not in this version.</p>"
                     : kind === "syntax" ? "<p>No diagram for this verse.</p>" : "<p>No notes on this verse.</p>";
  }
  if (current ()?.kind === "syntax") {
    for (const n of notes) bodyEl.append (drawDiagram (JSON.parse (n.body) as Sentence, n.start, n.end, at));
    panel.scrollTop = 0;
    return;
  }
  for (const n of notes) {
    const el = document.createElement ("div");
    el.className = "note";
    // (The body is the pipeline's own HTML: a few tags only - notes.py's docstring lists them)
    el.innerHTML = (n.start !== n.end ? `<div class="src">${range (n.start, n.end)}</div>` : "")
                 + (n.quote ? `<p class="nQuote">${n.quote}</p>` : "") + n.body;
    bodyEl.append (el);
  }
  panel.scrollTop = 0;
}

/** A note's range as the panel labels it: 1:2–5, 1:1–2:3. */
function range (start: number, end: number): string {
  const [c1, v1, c2, v2] = [Math.floor (start / 1000), start % 1000, Math.floor (end / 1000), end % 1000];
  return c1 === c2 ? `${c1}:${v1}–${v2}` : `${c1}:${v1}–${c2}:${v2}`;
}

// Following: the text scrolled (a frame at a time), and each word lit while reading aloud (audio.ts).
let frame = 0;
const follow = () => { if (! frame && ! panel.hidden) frame = requestAnimationFrame (() => { frame = 0; update (); }); };
main.addEventListener ("scroll", follow, { passive: true });
document.addEventListener ("cotext:reading", follow);

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

function drawDiagram (s: Sentence, start: number, end: number, at: number): HTMLElement {
  // The text's words of the sentence's verses, read once: "ref:n" -> [text, gloss]
  const text = new Map<string, [string, string]> ();
  if (textDb && book) {
    for (const r of textDb.all (`SELECT chapter * 1000 + verse AS ref, word, text, gloss FROM words
                                 WHERE book = ? AND chapter * 1000 + verse BETWEEN ? AND ?`, [book.id, start, end]))
      text.set (`${r.ref}:${r.word}`, [String (r.text), String (r.gloss ?? "")]);
  }
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

// The room between the heading and the play bar (--mid, style.css): with the word's panel and the notes both open,
// each gets at most a third of it. Measured at start and whenever the window or either bar changes size.
const midRoom = () => document.documentElement.style.setProperty ("--mid",
  `${innerHeight - document.querySelector<HTMLElement> (".head")!.offsetHeight - document.getElementById ("playBar")!.offsetHeight}px`);
midRoom ();
addEventListener ("resize", midRoom);
new ResizeObserver (midRoom).observe (document.querySelector (".head")!);
new ResizeObserver (midRoom).observe (document.getElementById ("playBar")!);
