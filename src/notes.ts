// The notes panel: free commentaries, text-critical apparatuses and English translations beside the text, following it. The icon right of
// ▶ in the play bar opens and closes it; it takes its place in the page's column under the play bar (above the word's
// panel when that's open - nothing floats over the text), at most about a third of the screen, scrolling.
// - Its picker (a <select class="choose">: COTEXT's plain list) lists the sources for the testament shown, grouped
//   COMMENTARIES, APPARATUS and TRANSLATIONS - the database's note_sources (pipeline/notes.py) - so swapping one is a tap; the choice
//   is kept per testament on the device.
// - A source is its own database file, downloaded the first time it's picked and kept (db.ts: openNotesDb); one is
//   open at a time.
// - It shows the notes on one verse: the verse being read aloud while ▶ reads (audio.ts signals each word lit),
//   otherwise the verse at the top of the view (the first whose line shows under the heading, as ▶ starts from),
//   following as the reader scrolls. A note on a range (1:1-18) shows on each of its verses, its range above it; a
//   note on words (Translation Notes') shows them first. The list is redrawn only when the notes change, so a range
//   note read through several verses keeps its place. A translation is a source with a "note" per verse: its text.

import { openNotesDb, type Db } from "./db";
import type { Book } from "./reader";

interface Source { id: string; kind: "commentary" | "apparatus" | "translation"; name: string; testaments: string; credit: string;
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
let book: Book | null = null;
let chapter = 1;
let open: { id: string; db: Db } | null = null;     // The source's file open now
let loading = 0;                                   // (A load's number: a later pick wins over one still arriving)
let shownVerse = -1;
let shownIds: string | null = null;               // The notes drawn (their ids; null: none yet): redrawn only when they change

export function initNotes (db: Db) {
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
    pick.replaceChildren (...group ("commentary", "Commentaries"), ...group ("apparatus", "Apparatus"),
                       ...group ("translation", "Translations"));
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
    bodyEl.innerHTML = current ()?.kind === "translation" ? "<p>Not in this translation.</p>" : "<p>No notes on this verse.</p>";
  }
  for (const n of notes) {
    const el = document.createElement ("div");
    el.className = "note";
    // (The body is the pipeline's own HTML: a few tags only - notes.py's Clean)
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
