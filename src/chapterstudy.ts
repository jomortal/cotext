// Study printout (☰ > Study printout): printouts made for passages - their text and any of the resources that have
// something for them, arranged by the reader - printed or saved as a PDF through the browser's own print.
// - PRINTOUTS: any number, each named, with its own sections. The screen's top row (no title of its own, no ✕ - back to
//   the Bible by ☰) shows the open one's name centered with a drop-down arrow beside it; tapped, its drop-down
//   (topbar.ts, the Verse cards' own): SELECT PRINTOUT (+ NEW PRINTOUT first; picking one opens it), DELETE PRINTOUT
//   (the open one, asked first), NAME (edited in place), BIBLIOGRAPHY STYLE (SBL - the default -, Chicago, Turabian,
//   MLA or APA: the printout's own). The last used opens. A new printout starts as the chapter read (one section, all
//   its verses); until renamed (or its name left blank) it's named after its first reference.
// - SECTIONS: a printout is a list of sections, each a reference - BOOK, CHAPTER and VERSES (All, or a range from -
//   to) - with its own items, picked at its top, a ✕ removing it (any of them, the first too: every one removed, the
//   printout is empty until "+ Add passage" - the chapter read - starts it again; named "Untitled" meanwhile
//   unless renamed). "+ Add passage" (under the last section) adds one - at first the first's chapter, all its
//   verses -, its own pickers at its top with a ✕ removing it and its items. A section's verse range limits each of
//   its items to those verses (an item's own range within it); every item works for its section's reference as it
//   would for the first's.
// - TWO PANES: the EDITOR - each section: its reference, a line per item added (its name; a drag handle ⠿ to move it
//   up or down within the section, by touch or mouse; Options, opening that item's own settings under it; ✕ removing
//   it), "+ Add item" under the last -, then "+ Add passage", Download and Print under it - and the PREVIEW, the
//   printout as it will print: the sections in order, each headed with its reference, redrawn as anything is added,
//   moved, changed or removed (not edited itself). Narrow (under 700 px) the preview the top half, the editor the
//   bottom half, each scrolling on its own; wide side by side, the editor at the left (style.css' .cstudy).
// - WHAT CAN BE ADDED to a section ("+ Add item": a list of everything there is for its chapter):
//   TEXT - the Hebrew or Greek, its options Interlinear (the English under each word), Parsing, Transliteration, a
//     verse range and HELPS ONLY FOR RARER WORDS (Off, or 10 / 25 / 50 / 100 / 200 / 500: the interlinear, the parsing
//     or both printed only for words whose root comes fewer times than that in the testament - freq's whole-testament
//     count, as the WORD LIST's -, so a reader who knows the common words is helped only with the rarer ones); any
//     number of times. Beside it the other text: for a Hebrew book the Septuagint's Greek (the LXX verses translating
//     the chapter or range: the main database's lxx_heb - Psalms and Jeremiah number differently, so it's headed with
//     its own reference), for a Septuagint book the Hebrew it translates; drawn as the text is, the same options, Hebrew
//     right to left, Greek left to right. Nothing shows until something is added - the text too.
//   NOTES - each source the resources pane offers for the book (translations, commentaries - the church fathers where
//     there are some -, apparatus, ancient versions, the sentence diagram; beside the Septuagint the Hebrew book's too,
//     each LXX verse's notes those of the Hebrew verses it translates, as the pane shows them - notes.ts' sourcesFor
//     and placesOf): the chapter's, or a verse range's, either
//     BESIDE EACH VERSE (under each verse of the section's first text item, study-Bible style, the source named) or AS
//     ITS OWN SECTION (each verse's notes under its reference). Beside each verse with no text item in its section: as
//     its own section. Its options list the range's notes under their verses, each by its first words (the church
//     fathers' and the Catena's by father and work), a checkbox each - unticked, left out of the printout; the church
//     fathers' sources also a checkbox per father in the range (All / None), so only the fathers ticked print.
//   ARTICLES - a dictionary (Tyndale: the articles the verses cite or their words lead to; the Archaeology
//     finds, the Ancient Parallels and the Ancient Historians: those bearing on the verses; beside the Septuagint by
//     the Hebrew verses translated, as the pane's), one item: every entry for
//     the chapter or its verse range, printed as the article opens in the app; its options list the entries, a
//     checkbox each (all ticked at first) - unticked, left out.
//   THE ATLAS - the map of the places the chapter names (or the range's), with the list of them and their verses; its
//     options BASE MAP, POLITICAL BOUNDARIES and ROUTE (the book's journeys, where it has any) - the map's own
//     pickers, moved onto its line. Printed as a picture of the map as it stands (it can be panned in the preview).
//   Whatever the resources pane offers for the book is offered here (+ Add item, in the pane's groups) and by the
//   pane's + (draftResource) - the Hebrew OT beside a Septuagint book as the other text.
//   THE TIMELINE - the chapter's year (Theographic, as ☰ Timeline) and the lanes' items within 150 years of it, each a
//     bar, the chapter's own in the accent.
//   WORD LIST - the chapter's words (every word, those under a frequency in the testament, or ones picked from the
//     chapter's list), rarest first, each its dictionary form, transliteration (an option), definition - SHORT (the
//     vocab gloss) or LONG (the brief lexicon's full entry: abridged BDB or Abbott-Smith) - and how often it comes in
//     the testament.
// - PRINT (under DOWNLOAD): window.print with style.css' print rules - the preview alone, in the light colors, its fonts,
//   Hebrew right to left, a map as a picture (each canvas copied to an image first: prepare), verses, notes and
//   entries kept whole where they fit, each section's reference as its title, page numbers where the browser allows
//   (@page). On an iPhone in Safari: Share > Print > Save to Files. A Home Screen web app on an iPhone or iPad ignores
//   window.print: there the button makes the PDF itself (makePdf - the preview drawn page by page as pictures, in the
//   same print rules) and opens the share sheet with it (Print, Save to Files, Messages...).
// - THE BIBLIOGRAPHY, at the printout's end: every work it uses, in any section - the original texts and lexicons, the
//   translations, commentaries, apparatus, dictionaries and articles (an ancient text's translation where an article
//   prints it), the Atlas' places and the base map and boundaries its map shows, the timeline's sources -,
//   alphabetized in the printout's BIBLIOGRAPHY STYLE (bibliography.ts: the works, taken from their credits, and the
//   styles), then "Licenses": the licenses' notices (each license's works and address, what was changed).
// - DOWNLOAD (over Print): the printout as a file made on the device - Microsoft Word (.docx, .doc), OpenDocument
//   (.odt), Rich Text Format (.rtf), Plain Text (.txt), Web Page (.html, .htm) or PDF (.pdf: makePdf's) - each made from
//   the preview in the print rules (printfiles.ts, loaded only then): the same content, light colors, Hebrew and Greek
//   as real text with their fonts named, the maps as pictures. Named as the printout ("John 3.docx"); handed over as
//   the PDF is (handOver): a Home Screen iPhone or iPad's share sheet, elsewhere a download.
// - KEPT on the device, every printout under one key (localStorage "cotext.study": { at: the open one's id, printouts:
//   [{ id, name ("" until renamed), bib (its bibliography style; none: SBL), sections: [{ id, book (its code), chapter,
//   from, to, items }] }] }). The earlier
//   per-chapter printouts ("cotext.study.<book>.<chapter>") are brought in once as printouts of their own, their keys
//   removed; anything unreadable is skipped.

import type { Db, Row } from "./db";
import { chapterWords, verseWords, showChapter, latin, type Book, type Word } from "./reader";
import { onScreen } from "./study";
import { sourcesFor, placesOf, openSource, noteElement, drawDiagram, FOLDED, type Source, type Note, type Sentence } from "./notes";
import { passageArticles, bookArticles, articleBlock } from "./dictionary";
import { passageMap } from "./atlas";
import { chapterTime } from "./timeline";
import { nameMenu, dropDowns, watchTopBar } from "./topbar";
import { printSplit } from "./layout";
import { BIB_STYLES, isBibStyle, citedWorks, bibliography, bibHeading, licenses, type BibStyle } from "./bibliography";
import type { FileKind } from "./printfiles";

/** An item of the printout. from / to: a verse range (0: the section's first / last). A text's under: its helps only for
 *  words coming fewer times than this in the testament (0 or none: every word's), helps saying which (both at first),
 *  other: the other text (the Septuagint beside a Hebrew book, the Hebrew beside a Septuagint one: otherWords);
 *  a note's skip: the notes left out (their ids; a dictionary's, its entries' ids), noFathers: the fathers left out (their names, as fatherOf reads them). */
type Item = { id: string } & (
  | { k: "text"; gloss: boolean; parse: boolean; translit: boolean; from: number; to: number; under?: number; helps?: "both" | "gloss" | "parse"; other?: boolean }
  | { k: "note"; src: string; beside: boolean; from: number; to: number; skip?: number[]; noFathers?: string[] }
  | { k: "dict"; src: string; from: number; to: number; skip?: string[] }
  | { k: "map"; from: number; to: number }
  | { k: "time" }
  | { k: "words"; which: "all" | "rare" | "picked"; under: number; picked: string[]; long: boolean; translit: boolean });

/** A section of the printout: a reference - book, chapter, verses from - to (0: the chapter's first / last) - and its
 *  items in order. The first names the printout until it's renamed. */
type Section = { id: string; book: Book; chapter: number; from: number; to: number; items: Item[] };

export const TEXT_CREDIT = "Text, parsing and lexicons: STEPBible Data, Tyndale House, Cambridge (CC BY 4.0).";
const UNDER = [5, 10, 25, 50, 100, 200, 500];     // (WORD LIST's frequencies: words coming fewer times than this in the testament)
const HELPS_UNDER = [10, 25, 50, 100, 200, 500];     // (TEXT's HELPS ONLY FOR RARER WORDS: the same, 0 off)

let db: Db;
let where: () => [Book, number] = () => { throw new Error ("Study printout: not started"); };
let bookList: () => Book[] = () => [];
/** main.ts: the database, where the reader is (the book shown and its chapter: the first study's place) and the books
 *  to pick from (the Old Testament as read, Hebrew or Septuagint, and the New). */
export function initChapterStudy (theDb: Db, place: () => [Book, number], list: () => Book[]) { db = theDb; where = place; bookList = list; }

const el = <K extends keyof HTMLElementTagNameMap> (tag: K, cls = "", text = "") => {
  const e = document.createElement (tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

//==== THE CHAPTER'S DATA ====
// Read once a chapter, whichever sections show it (dropped when another printout is opened): its words, each notes
// source's notes, the word list's lexicon rows, each dictionary's entries, the other text's words. Each notes source's
// file, each article and each item's map (elements kept, moved into each redraw) once, for every chapter.
type Entry = { id: string; title: string; line: string };
type Chapter = {
  book: Book; chapter: number; words: Promise<Word[]>;
  notesOf: Map<string, Promise<Note[]>>;     // (By "<source id>|<book id>.<chapter>": its own chapter's, or beside the Septuagint the Hebrew's)
  lexicon: Promise<Row[]> | null;
  entries: Map<string, Promise<Entry[]>>;     // (A dictionary's entries for a range: "<src>|<verses>")
  others: Map<string, Promise<Word[]>>;     // (The other text's words by the verses: "<vs>")
};
const chapters = new Map<string, Chapter> ();     // (By "<book id>.<chapter>")
const files = new Map<string, Promise<Db>> ();     // (Each notes source's file, opened once: openSource)
const articles = new Map<string, Promise<Awaited<ReturnType<typeof articleBlock>>>> ();
const maps = new Map<string, { view: ReturnType<typeof passageMap>; opts: HTMLElement[]; key: string; range: number[] }> ();

/** A chapter's data, made once (its words read at once, the rest as asked for). */
function chapterOf (b: Book, c: number): Chapter {
  const key = `${b.id}.${c}`;
  let ch = chapters.get (key);
  if (! ch) { ch = { book: b, chapter: c, words: chapterWords (db, b.id, c), notesOf: new Map (), lexicon: null, entries: new Map (), others: new Map () }; chapters.set (key, ch); }
  return ch;
}
const dataOf = (sec: Section) => chapterOf (sec.book, sec.chapter);

const sourceOf = (b: Book, id: string) => sourcesFor (b).find ((s) => s.id === id);
const allVerses = async (ch: Chapter) => [...new Set ((await ch.words).map ((w) => w.verse))];
/** A section's verses: its chapter's, within its range (0: from the first, to the last). */
const verses = async (sec: Section) => inRange (await allVerses (dataOf (sec)), sec.from, sec.to);
/** A range's verses (0: the chapter's first or last). */
const inRange = (vs: number[], from: number, to: number) => vs.filter ((v) => (! from || v >= from) && (! to || v <= to));
/** A section's reference as its heading says it: Romans 5, Romans 5:8–end, Romans 5:1–8, Romans 5:8 (one verse). */
const refName = (sec: Section) => `${sec.book.name} ${sec.chapter}${! sec.from && ! sec.to ? "" : sec.from && sec.to === sec.from ? `:${sec.from}` : `:${sec.from || 1}–${sec.to || "end"}`}`;

/** A source's notes touching a chapter - ch's own, or another's (bk, c: beside the Septuagint, a Hebrew chapter it
 *  translates), kept with ch -, in the panel's order; a note from an earlier chapter (a range) among them. */
function chapterNotes (ch: Chapter, s: Source, bk = ch.book.id, c = ch.chapter): Promise<Note[]> {
  const key = `${s.id}|${bk}.${c}`;
  let p = ch.notesOf.get (key);
  if (! p) {
    let f = files.get (s.id);
    if (! f) { f = openSource (s, () => {}); files.set (s.id, f); f.catch (() => files.delete (s.id)); }
    p = f.then ((d) => d.all (`SELECT rowid AS id, start, "end", quote, body FROM notes WHERE book = ? AND "end" >= ? AND start <= ?
                               ORDER BY start, "end" DESC, ord`, [bk, c * 1000, c * 1000 + 999]) as unknown as Promise<Note[]>);
    ch.notesOf.set (key, p);
    p.catch (() => ch.notesOf.delete (key));
  }
  return p;
}

/** A source's notes by the verse each is placed at - its first verse in the range (a note on 5:13-6:5 at 6:1); with
 *  an item, only those it keeps (keeps). Each verse's notes are its places' (notes.ts' placesOf, as the panel's):
 *  beside the Septuagint, a Hebrew Bible source's those of the Hebrew verses it translates - none where the Hebrew
 *  lacks it -, each note once. */
async function notesByVerse (ch: Chapter, s: Source, vs: number[], it?: NoteItem): Promise<Map<number, Note[]>> {
  const out = new Map<number, Note[]> ();
  const per = await placesOf (s, ch.book, ch.chapter, vs);
  const seen = new Set<number> ();
  for (const { v, where } of per) for (const [bk, c, hv] of where) {
    const at = c * 1000 + hv;
    for (const n of await chapterNotes (ch, s, bk, c)) {
      if (seen.has (n.id) || at < n.start || at > n.end || (it && ! keeps (it, n))) continue;
      seen.add (n.id);
      (out.get (v) ?? out.set (v, []).get (v)!).push (n);
    }
  }
  return out;
}

type NoteItem = Item & { k: "note" };
/** Whether a notes item prints a note: not left out itself, nor its father. */
const keeps = (it: NoteItem, n: Note) => ! it.skip?.includes (n.id) && ! (it.noFathers?.length && it.noFathers.includes (fatherOf (n)?.name ?? ""));

/** A church father's note's father, his dates and work - the body's lead, <b>father <span class="life">(dates)</span>
 *  (anything more: "(quoting Severianus...)")</b> <small>(work)</small> (notes.py; notes.ts' foldedNote reads the same),
 *  the more put before the work; null for a note without one. */
function fatherOf (n: Note): { name: string; dates: string; work: string } | null {
  const m = n.body.match (/^<p><b>([^<]*?)\s*(?:<span class="life">\(([^)]*)\)<\/span>)?([^<]*)<\/b>\s*(?:<small>\((.*?)\)<\/small>)?/);
  return m ? { name: m[1].trim (), dates: m[2] ?? "", work: [m[3].trim (), m[4] ?? ""].filter (Boolean).join (" ") } : null;
}
/** A note's first words (its quote's, else its body's, tags dropped), for its checkbox. */
function firstWords (n: Note, after = 0): string {
  const t = `${n.quote ?? ""} ${n.body}`.replace (/<[^>]*>/g, " ").replace (/&nbsp;/g, " ").replace (/\s+/g, " ").trim ().split (" ");
  const words = t.slice (after, after + 10);
  return words.join (" ") + (t.length > after + 10 ? "…" : "");
}

/** A verse's notes drawn: each as the panel draws it, a diagram's sentences as trees (text: the chapter's words). */
function drawNotes (s: Source, ns: Note[], text: Map<string, [string, string]>, chapter: number, v: number): HTMLElement[] {
  if (s.kind !== "syntax") return ns.map (noteElement);
  return ns.map ((n) => drawDiagram (JSON.parse (n.body) as Sentence, text, chapter * 1000 + v));
}

//==== THE ITEMS ====
/** A printout: its name ("" until renamed: shown as its first section's reference - nameShown), its sections and its
 *  bibliography's style (none: SBL). */
type Printout = { id: string; name: string; sections: Section[]; bib?: BibStyle };
let printouts: Printout[] = [];
let at = "";     // (The printout open: its id - the last used)
let loaded = false;
/** The printout open (the first if the one kept is gone). */
const now = () => printouts.find ((p) => p.id === at) ?? printouts[0];
let sections: Section[] = [];     // (The open printout's sections: now ().sections, kept in step by openPrintout)
const first = () => sections[0];
const KEY = "cotext.study";
/** The name shown for a printout: its own, or, until renamed, its first section's reference ("John 3", "John 3:1-16"). */
function nameShown (p: Printout): string {
  if (p.name.trim ()) return p.name;
  const m = p.sections[0];
  return m ? `${m.book.name} ${m.chapter}` + (m.from ? `:${m.from}` + (m.to > m.from ? `-${m.to}` : "") : "") : "Untitled";
}
/** A new printout, as the reader's chapter: one section, the chapter read, all its verses, nothing added. */
const newPrintout = (): Printout => { const [b, c] = where (); return { id: newId (), name: "", sections: [{ id: newId (), book: b, chapter: c, from: 0, to: 0, items: [] }] }; };
/** Opens a printout (id): it becomes the open one, the last used. */
function openPrintout (id: string) { at = id; sections = now ().sections; openOpts.clear (); chapters.clear (); }
const KINDS = new Set (["text", "note", "dict", "map", "time", "words"]);
/** A saved list's items: those of a kind there is (anything else dropped: a list not a list, an older kind). */
const itemsOf = (x: unknown): Item[] => Array.isArray (x)
  ? x.filter ((i): i is Item => !! i && typeof i === "object" && typeof (i as Item).id === "string" && KINDS.has ((i as Item).k)) : [];
/** A saved printout's sections (none: an empty printout, kept): each whose book is among bookList's (its chapter kept within the book), the rest dropped. */
function sectionsOf (x: unknown): Section[] {
  const out: Section[] = [];
  for (const y of Array.isArray (x) ? x : []) {
    if (! y || typeof y !== "object") continue;
    const r = y as Record<string, unknown>;
    const bk = bookList ().find ((z) => z.code === r.book);
    if (! bk) continue;
    out.push ({ id: typeof r.id === "string" ? r.id : newId (), book: bk, chapter: Math.min (Math.max (Number (r.chapter) || 1, 1), bk.chapters),
                from: Number (r.from) || 0, to: Number (r.to) || 0, items: itemsOf (r.items) });
  }
  return out;
}
/** The printouts kept, read back once (the first time the screen opens or something is added to it); an earlier one-per-chapter printout ("cotext.study.<book>.<chapter>") brought
 *  in as a printout of its own and its key removed; anything unreadable skipped; none at all, a new one (newPrintout). */
function load () {
  if (loaded) return;
  loaded = true;
  let got: unknown = null;
  try { got = JSON.parse (localStorage.getItem (KEY) ?? "null"); } catch { /* unreadable, or private mode: none */ }
  const kept = got && typeof got === "object" ? got as { printouts?: unknown; at?: unknown } : {};
  for (const x of Array.isArray (kept.printouts) ? kept.printouts : []) {
    if (! x || typeof x !== "object") continue;
    const r = x as Record<string, unknown>, secs = sectionsOf (r.sections);
    printouts.push ({ id: typeof r.id === "string" ? r.id : newId (), name: typeof r.name === "string" ? r.name : "", sections: secs, bib: isBibStyle (r.bib) ? r.bib : undefined });
  }
  try {     // (The earlier kind: one printout per chapter studied, its first section the chapter)
    for (const k of Object.keys (localStorage)) {
      const m = /^cotext\.study\.([^.]+)\.(\d+)$/.exec (k);
      if (! m) continue;
      let old: unknown = null;
      try { old = JSON.parse (localStorage.getItem (k) ?? "null"); } catch { /* unreadable: dropped */ }
      const secs = sectionsOf ((old as { sections?: unknown } | null)?.sections);
      const b = bookList ().find ((z) => z.code === m[1]);
      if (b && (! secs.length || secs[0].book !== b)) secs.unshift ({ id: newId (), book: b, chapter: Math.min (Number (m[2]) || 1, b.chapters), from: 0, to: 0, items: [] });
      if (secs.some ((x) => x.items.length) || secs.length > 1) printouts.push ({ id: newId (), name: "", sections: secs });     // (One with nothing added: not kept)
      localStorage.removeItem (k);
    }
    localStorage.removeItem ("cotext.study.at");
  } catch { /* private mode */ }
  if (! printouts.length) printouts.push (newPrintout ());
  openPrintout (typeof kept.at === "string" && printouts.some ((p) => p.id === kept.at) ? kept.at : printouts[0].id);
  save ();
}
const save = () => {
  try {
    localStorage.setItem (KEY, JSON.stringify ({ at: now ().id, printouts: printouts.map ((p) => ({ id: p.id, name: p.name, bib: p.bib,
      sections: p.sections.map ((s) => ({ id: s.id, book: s.book.code, chapter: s.chapter, from: s.from, to: s.to, items: s.items })) })) }));
  } catch { /* private mode: not kept */ }
};
let nextId = 0;
const newId = () => `${Date.now ().toString (36)}${(nextId++).toString (36)}`;

/** An item's line in the editor, as the reader knows it (sec: its section). */
function nameOf (sec: Section, it: Item): string {
  const { book, chapter } = sec;
  const range = "from" in it && (it.from || it.to) ? ` (${chapter}:${it.from || "1"}-${it.to || "end"})` : "";
  switch (it.k) {
    case "text": return `${textName (book, it.other)} text of ${book.name} ${chapter}` + (it.gloss ? " + interlinear" : "") + (it.parse ? " + parsing" : "")
                        + (it.translit ? " + transliteration" : "") + ((it.gloss || it.parse) && it.under ? ` (helps under ${it.under}×)` : "") + range;
    case "note": return (sourceOf (book, it.src)?.name ?? it.src) + (it.beside ? ", beside each verse" : "") + range
                        + (it.noFathers?.length ? ", some fathers" : "") + (it.skip?.length ? `, ${it.skip.length} left out` : "");
    case "dict": return (sourceOf (book, it.src)?.name ?? it.src) + range + (it.skip?.length ? `, ${it.skip.length} left out` : "");
    case "map": return "Atlas map" + range;
    case "time": return "Timeline";
    case "words": return "Word list" + (it.which === "rare" ? ` (under ${it.under}×)` : it.which === "picked" ? ` (${it.picked.length} picked)` : "");
  }
}

//==== THE SCREEN ====
let previewEl: HTMLElement, sectionsEl: HTMLElement, printEl: HTMLButtonElement;
const openOpts = new Set<string> ();     // (The lines whose options are open)
const linesOf = new Map<Section, HTMLElement> ();     // (Each section's lines, as drawn)

/** A section's reference at its top: BOOK, CHAPTER and VERSES (from - to), changed in place, and a ✕ removing it (the
 *  first too; the last removed, the printout empty until + Add passage). The first's changed or removed, the
 *  printout's name follows while it has none of its own. */
async function drawPlace (placeEl: HTMLElement, sec: Section) {
  const isFirst = sec === first ();
  const pick = (label: string, options: [string, string][], value: string, set: (v: string) => void) => {
    const l = el ("label", "sheetPick", label);
    const s = el ("select", "choose");
    s.append (...options.map (([v, t]) => new Option (t, v)));
    s.value = value;
    s.addEventListener ("change", () => set (s.value));
    l.append (s);
    return l;
  };
  const vs = await allVerses (dataOf (sec));
  const nums = (from: number, to: number) => Array.from ({ length: to - from + 1 }, (_, i) => String (from + i));
  const go = (b: Book, c: number) => { sec.book = b; sec.chapter = c; sec.from = sec.to = 0; save (); drawSections (); render (); if (isFirst) nameFollows (); };
  const range = (from: number, to: number) => { sec.from = from; sec.to = to; save (); render (); if (isFirst) nameFollows (); };
  const kids: HTMLElement[] = [
    pick ("Book", bookList ().map ((b) => [b.code, b.name]), sec.book.code, (v) => { const b = bookList ().find ((x) => x.code === v); if (b) go (b, 1); }),
    pick ("Chapter", nums (1, sec.book.chapters).map ((n) => [n, n]), String (sec.chapter), (v) => go (sec.book, Number (v))),
    pick ("From verse", [["0", "Start"], ...vs.map ((v) => [String (v), String (v)] as [string, string])], String (sec.from), (v) => range (Number (v), sec.to)),
    pick ("To verse", [["0", "End"], ...vs.map ((v) => [String (v), String (v)] as [string, string])], String (sec.to), (v) => range (sec.from, Number (v)))];
  const x = el ("button", "pill icon csRemove", "✕");
  x.setAttribute ("aria-label", "Remove this reference");
  x.addEventListener ("click", () => {
    now ().sections = sections = sections.filter ((s) => s !== sec);
    for (const it of sec.items) openOpts.delete (it.id);
    save (); drawSections (); render ();
    if (isFirst) nameFollows ();     // (The next one first now: the name following it)
  });
  kids.push (x);
  placeEl.replaceChildren (...kids);
}

//==== THE TOP ROW ====
// The open printout's name centered, its drop-down arrow beside it, tapped opening its drop-down (topbar.ts, as the
// Verse cards' deck's name): SELECT PRINTOUT (+ NEW PRINTOUT first), DELETE PRINTOUT (asked first), NAME, then the
// printout's own BIBLIOGRAPHY STYLE (a change redraws the bibliography alone: drawSources). No title of its own and no
// ✕: back to the Bible by ☰ (style.css hides #screenTop here, as for the Verse cards).
let topEl: HTMLElement | null = null;
let topOpen = "";     // (Its drop-down open: "more", or "" - kept across redraws)
/** The top bar drawn (again) into topEl: the name and its drop-down. */
function drawTop () {
  if (! topEl) return;
  const named = nameMenu<Printout> ({
    noun: "Printout", all: () => printouts, open: now, shown: nameShown, blank: "",
    select: (id) => { openPrintout (id); again (); },
    make: () => { const p = newPrintout (); printouts.push (p); openPrintout (p.id); again (); },
    ask: (x) => `Delete the printout "${nameShown (x)}"?`,
    remove: (x) => { printouts = printouts.filter ((p) => p !== x); if (! printouts.length) printouts.push (newPrintout ()); openPrintout (printouts[0].id); again (); },
    renamed: () => save () });
  const row = el ("div", "topRow"), menu = el ("div", "vcMenu");
  row.append (named.title);
  const bibRow = el ("label", "vcPick", "Bibliography style"), bib = el ("select", "choose");
  bib.append (...BIB_STYLES.map (([k, t]) => new Option (t, k)));
  bib.value = now ().bib ?? "sbl";
  bib.addEventListener ("change", () => { now ().bib = bib.value as BibStyle; save (); drawSources (); });
  bibRow.append (bib);
  menu.append (...named.rows, bibRow);
  topEl.replaceChildren (row, menu);
  dropDowns ([{ key: "more", button: named.button, menu, icon: "" }], topOpen, (k) => { topOpen = k; });
}
/** Another printout opened, made or deleted: kept, everything drawn again (its drop-down left open). */
function again () { save (); drawTop (); drawSections (); render (); }
/** The first section's reference changed: the top row redrawn while the printout's name is its reference. */
const nameFollows = () => { if (! now ().name.trim ()) drawTop (); };

onScreen ("Study printout", async (body) => {
  load ();
  sections = now ().sections;
  topEl = el ("div", "topBar");
  drawTop ();
  watchTopBar (topEl);
  body.append (topEl);
  const box = el ("div", "cstudy");
  previewEl = el ("div", "csPreview");
  const editor = el ("div", "csEditor");
  sectionsEl = el ("div", "csSections");
  const more = el ("button", "pill csAdd", "+ Add passage");
  more.addEventListener ("click", () => {
    const [b, c] = first () ? [first ().book, first ().chapter] : where ();     // (The first's chapter; none, the chapter read)
    sections.push ({ id: newId (), book: b, chapter: c, from: 0, to: 0, items: [] });
    if (sections.length === 1) nameFollows ();
    save (); drawSections (); render ();
    sectionsEl.lastElementChild?.scrollIntoView ({ block: "nearest" });
  });
  const print = el ("button", "pill csPrint", PRINT);
  printEl = print;
  print.addEventListener ("click", () => {
    if (ready) void handOver (ready);
    else if (printIgnored ()) void makePdf ().then ((f) => f && handOver (f));
    else { prepare (); window.print (); }
  });
  // DOWNLOAD: a picker of the formats, PRINT under it, back to its first line once one's picked (which says the file's being made)
  const dlRow = el ("label", "vcPick", "Download"), dl = el ("select", "choose");
  downloadEl = dl;
  dl.append (new Option (DOWNLOAD, ""), ...FORMATS.map (([k, t]) => new Option (t, k)));
  dl.addEventListener ("change", () => { const k = dl.value as FileKind | "pdf" | ""; if (k) void download (k); });
  dlRow.append (dl);
  const out = el ("div", "csOut");
  out.append (dlRow, print);
  editor.append (sectionsEl, more, out);
  const split = el ("div", "split");     // (The preview's height dragged, narrow; its width, wide - layout.ts' printSplit)
  Object.assign (split, { role: "separator", ariaLabel: "Resize the preview" });     // (Its orientation: printSplit's, by the width)
  printSplit (split, box);
  box.append (previewEl, split, editor);
  // The bottom bar (the Verse cards' - .vcBar: down the right side sideways): its one button, in the middle, showing or
  // hiding the editor (shown: pressed) - hidden, the preview the whole room. Kept on the device.
  const bar = el ("div", "vcBar csEditBar"), toggle = el ("button", "pill icon csToggle");
  toggle.setAttribute ("aria-label", "Show or hide the editor");
  toggle.innerHTML = `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/></svg>`;     // (A pencil: editing)
  let shown = true;
  try { shown = localStorage.getItem (EDITOR_KEY) !== "0"; } catch { /* private mode */ }
  const show = (on: boolean) => { shown = on; box.classList.toggle ("csNoEditor", ! on); toggle.setAttribute ("aria-pressed", String (on)); };
  toggle.addEventListener ("click", () => { show (! shown); try { localStorage.setItem (EDITOR_KEY, shown ? "1" : "0"); } catch { /* private mode */ } });
  show (shown);
  // (Unseen stand-ins for the Bible's ‹, ▶ and ›, so the bar's room is shared out as the play bar's: the pencil exactly where its search is)
  const ghost = (g: string, c: number, r: number) => { const x = el ("span", "pill icon csGhost" + (g === "▶" ? "" : " arrow"), g); x.setAttribute ("aria-hidden", "true"); x.style.setProperty ("--c", String (c)); x.style.setProperty ("--r", String (r)); return x; };
  bar.append (ghost ("‹", 1, 1), ghost ("▶", 3, 3), toggle, ghost ("›", 5, 5));
  body.append (box, bar);
  drawSections ();
  render ();
});
const EDITOR_KEY = "cotext.study.editor";     // ("0": the editor hidden - the bar's toggle)

/** Another reference added to the Study printout from elsewhere (the Bible's Add to Verse Cards box): a new section -
 *  book code, chapter, verses from - to (from 0: the whole chapter; to 0, or not past from, the verse from alone) - with
 *  no items, as "+ Add passage" adds one, kept. Added to the open printout (the last used, whether
 *  the screen is open or not), redrawn if it's shown. False for a book not among bookList's. */
export function addStudyReference (code: string, chapter: number, from: number, to: number): boolean {
  return addStudy (code, chapter, from, to, "");
}

/** A resource (a source of the resources pane: its id) added to the Study printout from the resources pane's +: the
 *  item it makes (sourceItem) for the verses from - to (as addStudyReference's) put in the printout's section for that
 *  passage - the first of the same book and chapter whose verses take them in -, or, none, in a new section of those
 *  verses (added as addStudyReference adds one). False for a book or resource not there. */
export function addStudyResource (code: string, chapter: number, from: number, to: number, src: string): boolean {
  return addStudy (code, chapter, from, to, src);
}

/** A resource's line for the Bible's add box (versecards.ts, the resources pane's +), as the editor draws a line: its
 *  name and Options - its settings under it, as the editor's (fillOptions), for the verses picked -, not yet in the
 *  printout. range: the verses picked changed (from - to as addStudyReference's); add: it put in the printout with
 *  its settings, as addStudyResource puts one. Null for a book or resource not there. */
export function draftResource (code: string, chapter: number, from: number, to: number, src: string) {
  const b = bookList ().find ((x) => x.code === code), s = b ? sourceOf (b, src) : null;
  // (The resources pane's Hebrew OT beside a Septuagint book: the printout's other text - its Hebrew)
  const it: Item | null = s ? sourceItem (s, 0, 0)
    : src === "hebrew_ot" && b?.testament === "LXX" ? { id: newId (), k: "text", gloss: true, parse: false, translit: false, from: 0, to: 0, other: true } : null;
  if (! b || ! it) return null;
  const sec: Section = { id: "draft", book: b, chapter, from, to, items: [] };
  const line = el ("div", "csLine"), row = el ("div", "csRow"), name = el ("span", "csName", nameOf (sec, it));
  const opts = el ("button", "pill csOptsBtn", "Options"), panel = el ("div", "csOpts");
  panel.hidden = true; opts.setAttribute ("aria-expanded", "false");
  let drawing = 0;
  const redraw = () => {     // (The panel drawn again for the item as it now is - the latest drawing alone kept)
    const n = ++drawing, fresh = el ("div", "csOpts");
    name.textContent = nameOf (sec, it);
    if (panel.hidden) return;
    void fillOptions (fresh, sec, it, o).then (() => { if (n === drawing) panel.replaceChildren (...fresh.childNodes); });
  };
  const o: Opts = { changed: redraw, quietly: () => { name.textContent = nameOf (sec, it); }, range: false };
  opts.addEventListener ("click", () => { panel.hidden = ! panel.hidden; opts.setAttribute ("aria-expanded", String (! panel.hidden)); redraw (); });
  row.append (name, opts); line.append (row, panel);
  return {
    line,
    range (f: number, t: number) { sec.from = f; sec.to = t; it.from = it.to = 0; redraw (); },
    add: () => addStudy (code, sec.chapter, sec.from, sec.to, src, it),
  };
}

/** The item a resource makes, for the verses from - to (0: its section's first / last): a commentary's, an apparatus',
 *  a translation's or the syntax's notes (beside the text but for the syntax's diagrams), a dictionary's entries, the
 *  atlas' map, the timeline. (The + Add item menu's, and the resources pane's +.) */
function sourceItem (s: Source, from: number, to: number): Item {
  return s.kind === "dictionary" ? { id: newId (), k: "dict", src: s.id, from, to }
    : s.kind === "atlas" ? { id: newId (), k: "map", from, to }
    : s.kind === "timeline" ? { id: newId (), k: "time" }
    : { id: newId (), k: "note", src: s.id, beside: s.kind !== "syntax", from, to };
}

/** addStudyReference's, addStudyResource's and draftResource's work (made: the item with its settings, draftResource's): in the open printout (the last used: the printouts read back
 *  first if they haven't been), saved, redrawn if shown. */
function addStudy (code: string, chapter: number, from: number, to: number, src: string, made?: Item): boolean {
  const b = bookList ().find ((x) => x.code === code);
  const s = src && b ? sourceOf (b, src) : null;
  if (! b || (src && ! s && ! made)) return false;
  const open = !! sectionsEl?.isConnected;
  load ();
  const c = Math.min (Math.max (chapter || 1, 1), b.chapters);
  const f = Math.max (from || 0, 0), t = f && (to || 0) > f ? to : f;
  // (A section of the same passage taking the verses in: the item there, for those verses - the whole section's, 0 - 0)
  const holds = (x: Section) => x.book.id === b.id && x.chapter === c && (! x.from || (f && f >= x.from && t <= x.to));
  const sec = s || made ? now ().sections.find (holds) : undefined;
  const item = sec && { ...(made ?? sourceItem (s!, 0, 0)), id: newId (), from: f === sec.from ? 0 : f, to: t === sec.to ? 0 : t } as Item;
  const same = (x: Item) => JSON.stringify ({ ...x, id: "" }) === JSON.stringify ({ ...item, id: "" });
  if (sec && item) { if (! sec.items.some (same)) sec.items.push (item); }     // (Already there, the same: not again)
  else now ().sections.push ({ id: newId (), book: b, chapter: c, from: f, to: t, items: s || made ? [{ ...(made ?? sourceItem (s!, 0, 0)), id: newId () } as Item] : [] });
  save ();
  if (open) { drawSections (); render (); sectionsEl.lastElementChild?.scrollIntoView ({ block: "nearest" }); }
  return true;
}

/** The editor's sections, each its reference, its lines, + Add item and its menu (hidden until that's tapped). */
function drawSections () {
  linesOf.clear ();
  sectionsEl.replaceChildren (...sections.map ((sec) => {
    const box = el ("div", "csSection");
    const place = el ("div", "csPlace");
    void drawPlace (place, sec);
    const lines = el ("div", "csLines");
    linesOf.set (sec, lines);
    const add = el ("button", "pill csAdd", "+ Add item");
    const menu = el ("div", "csMenu");
    menu.hidden = true;
    add.addEventListener ("click", () => { if (menu.hidden) showMenu (sec, menu); else menu.hidden = true; });
    box.append (place, lines, add, menu);
    return box;
  }));
  drawLines ();
}

/** Each section's lines, one per item, in order. */
function drawLines () {
  for (const [sec, linesEl] of linesOf) {
    linesEl.replaceChildren (...sec.items.map ((it) => {
      const line = el ("div", "csLine");
      line.dataset.id = it.id;
      const row = el ("div", "csRow");
      const handle = el ("button", "pill icon csHandle", "⠿");
      handle.setAttribute ("aria-label", "Drag to move");
      const opts = el ("button", "pill csOptsBtn", "Options");
      opts.setAttribute ("aria-expanded", String (openOpts.has (it.id)));
      const x = el ("button", "pill icon csRemove", "✕");
      x.setAttribute ("aria-label", "Remove");
      row.append (handle, el ("span", "csName", nameOf (sec, it)), opts, x);
      const panel = el ("div", "csOpts");
      panel.hidden = ! openOpts.has (it.id);
      if (! panel.hidden) fillOptions (panel, sec, it);
      opts.addEventListener ("click", () => {
        if (openOpts.has (it.id)) openOpts.delete (it.id); else openOpts.add (it.id);
        drawLines ();
      });
      x.addEventListener ("click", () => { sec.items = sec.items.filter ((i) => i !== it); openOpts.delete (it.id); changed (); });
      dragging (handle, line, sec);
      line.append (row, panel);
      return line;
    }));
  }
}

/** The items changed: kept, the lines and the preview redrawn. */
function changed () { save (); drawLines (); render (); }

/** A line dragged by its handle (pointer events: touch and mouse alike): it moves among its section's lines as it
 *  passes their middles; let go, the section's new order is kept. */
function dragging (handle: HTMLElement, line: HTMLElement, sec: Section) {
  handle.addEventListener ("pointerdown", (e) => {
    e.preventDefault ();
    handle.setPointerCapture (e.pointerId);
    line.classList.add ("dragged");
    const linesEl = line.parentElement!;
    const move = (ev: PointerEvent) => {
      const prev = line.previousElementSibling as HTMLElement | null, next = line.nextElementSibling as HTMLElement | null;
      const mid = (x: HTMLElement) => { const r = x.getBoundingClientRect (); return r.top + r.height / 2; };
      if (prev && ev.clientY < mid (prev)) linesEl.insertBefore (line, prev);
      else if (next && ev.clientY > mid (next)) linesEl.insertBefore (next, line);
    };
    const up = () => {
      handle.removeEventListener ("pointermove", move);
      handle.removeEventListener ("pointerup", up);
      handle.removeEventListener ("pointercancel", up);
      line.classList.remove ("dragged");
      const order = [...linesEl.querySelectorAll<HTMLElement> (".csLine")].map ((l) => l.dataset.id);
      const moved = order.join () !== sec.items.map ((i) => i.id).join ();
      sec.items.sort ((a, b) => order.indexOf (a.id) - order.indexOf (b.id));
      if (moved) changed ();
    };
    handle.addEventListener ("pointermove", move);
    handle.addEventListener ("pointerup", up);
    handle.addEventListener ("pointercancel", up);
  });
}

// ---- Options ----
/** What an option's change does where its panel is: the editor's (kept, its lines - the panel with them - and the
 *  preview redrawn; a tick, quietly), or a resource's line in the Bible's add box (draftResource: its panel redrawn). */
type Opts = { changed: () => void; quietly: (sec: Section, it: Item) => void; range: boolean };     // (range: its verses picked here - not in the add box, whose verses are picked above it)
const EDITOR: Opts = { changed: () => changed (), quietly: (sec, it) => quietly (sec, it), range: true };
const toggle = (o: Opts, label: string, on: boolean, set: (v: boolean) => void) => {
  const b = el ("button", "pill", label);
  b.setAttribute ("aria-pressed", String (on));
  b.addEventListener ("click", () => { set (! on); o.changed (); });
  return b;
};
const picker = (o: Opts, label: string, choices: [string, string][], value: string, set: (v: string) => void) => {
  const row = el ("label", "sheetPick", label);
  const s = el ("select", "choose");
  s.append (...choices.map (([v, t]) => new Option (t, v)));
  s.value = value;
  s.addEventListener ("change", () => { set (s.value); o.changed (); });
  row.append (s);
  return row;
};
/** A verse range's two pickers, among its section's verses (0: the first / the last). */
async function rangeRows (o: Opts, sec: Section, it: { from: number; to: number }): Promise<HTMLElement[]> {
  if (! o.range) return [];
  const vs = await verses (sec);
  return [picker (o, "From verse", [["0", "First"], ...vs.map ((v): [string, string] => [String (v), String (v)])], String (it.from), (v) => { it.from = +v; }),
          picker (o, "To verse", [["0", "Last"], ...vs.map ((v): [string, string] => [String (v), String (v)])], String (it.to), (v) => { it.to = +v; })];
}

/** An item's own settings, under its line (sec: its section; o: what a change does there). */
async function fillOptions (panel: HTMLElement, sec: Section, it: Item, o: Opts = EDITOR) {
  const book = sec.book;
  const bar = el ("div", "bar");
  if (it.k === "text") {
    bar.append (toggle (o, "Interlinear", it.gloss, (v) => { it.gloss = v; }), toggle (o, "Parsing", it.parse, (v) => { it.parse = v; }),
                toggle (o, "Transliteration", it.translit, (v) => { it.translit = v; }));
    panel.append (bar, ...await rangeRows (o, sec, it));
    panel.append (picker (o, "Helps only for words coming fewer times than", [["0", "Off (every word)"], ...HELPS_UNDER.map ((n): [string, string] => [String (n), `${n} in the ${testamentName (it.other ? otherTestament (book) : book.testament)}`])],
                          String (it.under ?? 0), (v) => { it.under = +v; }));
    if (it.under) panel.append (picker (o, "For", [["both", "Interlinear and parsing"], ["gloss", "Interlinear only"], ["parse", "Parsing only"]],
                                        it.helps ?? "both", (v) => { it.helps = v as typeof it.helps; }));
  } else if (it.k === "note") {
    bar.append (toggle (o, "Beside each verse", it.beside, (v) => { it.beside = v; }), toggle (o, "As its own section", ! it.beside, (v) => { it.beside = ! v; }));
    panel.append (bar, ...await rangeRows (o, sec, it));
    await noteChoices (panel, sec, it, o);
  } else if (it.k === "dict") {
    panel.append (...await rangeRows (o, sec, it));
    await entryChoices (panel, sec, it, o);
  } else if (it.k === "map") {
    panel.append (...await rangeRows (o, sec, it), ...mapOf (it).opts);
  } else if (it.k === "words") {
    panel.append (picker (o, "Words", [["all", "Every word of the chapter"], ["rare", "Under a frequency"], ["picked", "Words picked"]], it.which, (v) => { it.which = v as typeof it.which; }));
    if (it.which === "rare") panel.append (picker (o, "Coming fewer times than", UNDER.map ((n): [string, string] => [String (n), `${n} in the ${testamentName (book.testament)}`]), String (it.under), (v) => { it.under = +v; }));
    panel.append (picker (o, "Definitions", [["short", "Short (the gloss)"], ["long", "Long (the lexicon's entry)"]], it.long ? "long" : "short", (v) => { it.long = v === "long"; }));
    bar.append (toggle (o, "Transliteration", it.translit, (v) => { it.translit = v; }));
    panel.append (bar);
    if (it.which === "picked") {
      const list = el ("div", "csPickList");
      for (const r of await chapterLexicon (dataOf (sec))) {
        const k = String (r.strong), on = it.picked.includes (k);
        const b = el ("button", "pill csPickWord");
        b.setAttribute ("aria-pressed", String (on));
        b.append (el ("span", hebrew (book) ? "heWord" : "grWord", String (r.lemma)), el ("span", "csPickGloss", ` ${meaning (r)}`));
        b.addEventListener ("click", () => { it.picked = on ? it.picked.filter ((x) => x !== k) : [...it.picked, k]; o.changed (); });
        list.append (b);
      }
      panel.append (list);
    }
  } else panel.append (el ("p", "", "No options."));
}

/** A tick kept and printed at once, the options left as they are (not redrawn: a list keeps its scroll), the line's
 *  name brought up to date. */
function quietly (sec: Section, it: Item) {
  save (); render ();
  const name = sectionsEl.querySelector (`.csLine[data-id="${it.id}"] .csName`);
  if (name) name.textContent = nameOf (sec, it);
}
/** A checkbox and its label (an option's list: notes, fathers, entries). */
function check (on: boolean, set: (v: boolean) => void, ...label: HTMLElement[]) {
  const l = el ("label", "csCheck");
  const box = el ("input");
  box.type = "checkbox"; box.checked = on;
  box.addEventListener ("change", () => set (box.checked));
  const text = el ("span", "csCheckText");
  text.append (...label);
  l.append (box, text);
  return l;
}

/** A dictionary item's entries to tick, each its title over a line of it: unticked, left out. */
async function entryChoices (panel: HTMLElement, sec: Section, it: Item & { k: "dict" }, o: Opts) {
  let list: Entry[];
  try { list = await entriesOf (sec, it); }
  catch { panel.append (el ("p", "", `${sourceOf (sec.book, it.src)?.name ?? it.src} couldn't be loaded.`)); return; }
  const box = el ("div", "csNoteList");
  box.append (...list.map ((a) => check (! it.skip?.includes (a.id), (on) => {
    it.skip = on ? (it.skip ?? []).filter ((x) => x !== a.id) : [...(it.skip ?? []), a.id];
    o.quietly (sec, it);
  }, el ("span", "csCheckName", a.title), el ("span", "csPickGloss", ` ${a.line}`))));
  if (! list.length) box.append (el ("p", "", "Nothing for these verses."));
  const top = el ("div", "bar");
  const all = el ("button", "pill", "All"), none = el ("button", "pill", "None");
  all.addEventListener ("click", () => { it.skip = []; o.changed (); });
  none.addEventListener ("click", () => { it.skip = list.map ((a) => a.id); o.changed (); });
  top.append (el ("span", "src", "Entries (unticked: left out)"), all, none);
  panel.append (top, box);
}

/** A notes item's own notes to tick: the church fathers' fathers first (a checkbox each, with its count; All / None),
 *  then the range's notes under their verses, a checkbox each (only the fathers ticked). A tick is kept and printed at
 *  once, the options left as they are (not redrawn: the list keeps its scroll) - but the line's name and, after a
 *  father's tick, the notes' list. */
async function noteChoices (panel: HTMLElement, sec: Section, it: NoteItem, o: Opts) {
  const s = sourceOf (sec.book, it.src);
  if (! s) return;
  let by: Map<number, Note[]>;
  try { by = await notesByVerse (dataOf (sec), s, inRange (await verses (sec), it.from, it.to)); }
  catch { panel.append (el ("p", "", `${s.name} couldn't be loaded.`)); return; }
  const quiet = () => o.quietly (sec, it);
  const fathers = FOLDED.has (s.id);
  const list = el ("div", "csNoteList");
  const drawList = () => {
    list.replaceChildren ();
    for (const [v, ns] of by) {
      const shown = ns.filter ((n) => ! it.noFathers?.includes (fatherOf (n)?.name ?? ""));
      if (! shown.length) continue;
      list.append (el ("div", "src verseHead", `${sec.chapter}:${v}`));
      for (const n of shown) {
        const f = fathers ? fatherOf (n) : null;
        const label = f ? [el ("span", "csCheckName", `${f.name}${f.dates ? ` (${f.dates})` : ""}${f.work ? ` · ${f.work}` : ""}`),
                           el ("span", "csPickGloss", ` ${firstWords ({ ...n, quote: "", body: n.body.replace (/^<p><b>.*?<\/b>\s*(?:<small>.*?<\/small>)?/, "<p>") })}`)]
                        : [el ("span", "csCheckName", firstWords (n))];
        list.append (check (! it.skip?.includes (n.id), (on) => {
          it.skip = on ? (it.skip ?? []).filter ((x) => x !== n.id) : [...(it.skip ?? []), n.id];
          quiet ();
        }, ...label));
      }
    }
    if (! list.children.length) list.append (el ("p", "", "No notes on these verses."));
  };
  if (fathers) {
    const counts = new Map<string, number> ();
    for (const ns of by.values ()) for (const n of ns) { const f = fatherOf (n)?.name ?? ""; counts.set (f, (counts.get (f) ?? 0) + 1); }
    const names = [...counts.keys ()].filter (Boolean);
    if (names.length) {
      const boxes = el ("div", "csFathers");
      const drawFathers = () => boxes.replaceChildren (...names.map ((f) => check (! it.noFathers?.includes (f), (on) => {
        it.noFathers = on ? (it.noFathers ?? []).filter ((x) => x !== f) : [...(it.noFathers ?? []), f];
        drawList (); quiet ();
      }, el ("span", "csCheckName", f), el ("span", "csPickGloss", ` ${counts.get (f)}`))));
      const all = el ("button", "pill", "All"), none = el ("button", "pill", "None");
      all.addEventListener ("click", () => { it.noFathers = []; drawFathers (); drawList (); quiet (); });
      none.addEventListener ("click", () => { it.noFathers = [...names]; drawFathers (); drawList (); quiet (); });
      const top = el ("div", "bar");
      top.append (el ("span", "src", "Fathers"), all, none);
      drawFathers ();
      panel.append (top, boxes);
    }
  }
  drawList ();
  panel.append (el ("div", "src", "Notes (unticked: left out)"), list);
}

const hebrew = (b: Book) => b.testament === "OT";
const testamentName = (t: string) => t === "OT" ? "Hebrew Bible" : t === "NT" ? "New Testament" : "Septuagint";
/** The other text's testament: the Septuagint beside the Hebrew Bible, the Hebrew beside the Septuagint. */
const otherTestament = (b: Book) => b.testament === "OT" ? "LXX" : "OT";
/** A text item's language as the reader knows it: Hebrew, Greek (the NT), Greek LXX. */
const textName = (b: Book, other = false) => { const t = other ? otherTestament (b) : b.testament; return t === "OT" ? "Hebrew" : t === "LXX" ? "Greek LXX" : "Greek"; };

// ---- + Add item ----
/** A section's list of what can be added (into menuEl, under its + Add item): the text, the notes sources for its book
 *  (by kind), the dictionaries, the atlas, the timeline, the word list. */
function showMenu (sec: Section, menuEl: HTMLElement) {
  const { book, chapter } = sec;
  menuEl.hidden = false;
  menuEl.replaceChildren ();
  const choice = (name: string, add: () => void, sub = "") => {
    const b = el ("button", "hit csChoice");
    b.append (el ("span", "csChoiceName", name));
    if (sub) b.append (el ("span", "src", sub));
    b.addEventListener ("click", add);
    return b;
  };
  const head = (t: string) => el ("div", "src", t);
  const push = (it: Item) => { sec.items.push (it); menuEl.hidden = true; changed (); };
  const sources = sourcesFor (book);
  menuEl.append (head ("Original text"), choice (`${textName (book)} text of ${book.name} ${chapter}`,
    () => push ({ id: newId (), k: "text", gloss: true, parse: false, translit: false, from: 0, to: 0 })));
  if (book.testament === "OT" || book.heb) menuEl.append (choice (`${textName (book, true)} text of ${book.name} ${chapter}`,     // (The OT's other text)
    () => push ({ id: newId (), k: "text", gloss: true, parse: false, translit: false, from: 0, to: 0, other: true })));
  // (The resources in the resources pane's order - notes.ts' sourceGroups: Syntax, Bible Background, Textual Studies,
  // Commentaries, Translations - then the timeline and the word list)
  const notes = (kinds: string[]) => sources.filter ((s) => kinds.includes (s.kind)).map ((s) => choice (s.name, () => push (sourceItem (s, 0, 0))));
  const group = (label: string, els: HTMLElement[]) => { if (els.length) menuEl.append (head (label), ...els); };
  group ("Syntax", notes (["syntax"]));
  group ("Bible Background", [
    ...notes (["dictionary"]),
    ...(sources.some ((s) => s.kind === "atlas") ? [choice ("Atlas map", () => push ({ id: newId (), k: "map", from: 0, to: 0 }), "The chapter's places")] : [])]);
  group ("Textual Studies", notes (["apparatus", "version"]));
  group ("Commentaries", notes (["commentary"]));
  group ("Translations", notes (["translation"]));
  group ("Time", sources.filter ((s) => s.kind === "timeline").map ((s) => choice ("Timeline", () => push (sourceItem (s, 0, 0)), "The chapter's place in time")));
  menuEl.append (head ("Words"), choice ("Word list", () => push ({ id: newId (), k: "words", which: "all", under: 25, picked: [], long: false, translit: false }),
                                         "Its words with definitions, rarest first"));
  menuEl.scrollIntoView ({ block: "nearest" });
}

/** A dictionary item's entries for its verses (sec: its section), each once, in order: the Tyndale's by verse (those
 *  citing each, then those its words lead to - dictionary.ts' passageArticles), the finds', parallels' and historians'
 *  those bearing on the verses (bookArticles). Beside the Septuagint, as the panel's, all by verse - a Hebrew Bible
 *  dictionary's by the Hebrew verses each translates (placesOf). */
async function entriesOf (sec: Section, it: Item & { k: "dict" }): Promise<Entry[]> {
  const { book, chapter } = sec, ch = dataOf (sec);
  const vs = inRange (await verses (sec), it.from, it.to);
  const key = `${it.src}|${vs.join (",")}`;
  let p = ch.entries.get (key);
  if (! p) {
    p = (async () => {
      const s = sourceOf (book, it.src);
      const got: Entry[] = (it.src === "finds" || it.src === "ane" || it.src === "historians") && book.testament !== "LXX"
        ? (await bookArticles (db, book.id, it.src)).filter ((a) => a.verses.some ((x) => Math.floor (x / 1000) === chapter && vs.includes (x % 1000)))
        : (await passageArticles (db, s ? (await placesOf (s, book, chapter, vs)).map ((p) => p.where) : vs.map ((v) => [[book.id, chapter, v]]), it.src)).flat ();
      const seen = new Set<string> ();
      return got.filter ((a) => ! seen.has (a.id) && !! seen.add (a.id)).map ((a) => ({ id: a.id, title: a.title.replace (/\*/g, ""), line: a.line }));
    }) ();
    ch.entries.set (key, p);
    p.catch (() => ch.entries.delete (key));
  }
  return p;
}

//==== THE PREVIEW ====
// Drawn whole on each change, off screen, then swapped in (a later draw winning over one still reading): each section
// in order, headed with its reference (the first's "Study printout" under it), its items under it, then the
// bibliography of every section's works (drawSources); the maps' and articles' elements are kept per item and moved in.
let cited = new Set<string> ();     // (What the printout shown cites: bibliography.ts' keys - a text's "text:<testament>", a source's id...)
let sourcesEl: HTMLElement | null = null;     // (Its bibliography: drawSources fills it)
let drawing = 0;
async function render () {
  const n = ++drawing;
  const doc = el ("div", "csDoc");
  doc.dir = "ltr";
  const used = new Set<string> ();     // (Each thing cited, in any section: bibliography.ts' keys)
  const cite = (key: string) => used.add (key);
  const mapsNow: { m: ReturnType<typeof mapOf>; sec: Section; per: { v: number; where: number[][] }[] }[] = [];
  for (const [i, sec] of sections.entries ()) {
    const { book, chapter } = sec, ch = dataOf (sec);
    const part = el ("div", "csPart");
    part.append (el ("h1", "csTitle", refName (sec)));
    if (! i) part.append (el ("div", "src csSub", "Study printout"));
    const vs = await verses (sec);
    const list: Item[] = sec.items;     // (Nothing added: nothing shown, not even the text)
    const firstText = list.find ((i) => i.k === "text" && ! i.other);     // (The other text numbers its own verses: notes go under this one's)
    const beside = firstText ? list.filter ((i): i is Item & { k: "note" } => i.k === "note" && i.beside) : [];
    const text = new Map<string, [string, string]> ();     // (A diagram's words: "ref:n" -> [text, gloss])
    for (const w of await ch.words) text.set (`${chapter * 1000 + w.verse}:${w.word}`, [w.text, w.gloss]);
    for (const it of list) {
      if (it.k === "note" && beside.includes (it as Item & { k: "note" })) continue;     // (Drawn under the text's verses)
      const block = el ("section", "csBlock");
      const h = (t: string) => block.append (el ("h2", "csHead", t));
      try {
        if (it.k === "text") {
          cite (`text:${it.other ? otherTestament (book) : book.testament}`);
          const range = inRange (vs, it.from, it.to);
          let box: HTMLElement;
          if (it.other) {
            const ws = await otherWords (ch, range);
            h (`${textName (book, true)} text` + (ws.length ? ` (${wordsSpan (ws)})` : ""));
            box = textBox ({ ...book, testament: otherTestament (book) }, ws[0]?.chapter ?? chapter, ws, it);
            if (! ws.length) box.append (el ("p", "", `No ${testamentName (otherTestament (book))} verses for these verses.`));
          } else {
            h (`${textName (book)} text`);
            box = textBox (book, chapter, (await ch.words).filter ((w) => range.includes (w.verse)), it);
          }
          if (it.under) {     // (A common word's helps taken off: its root coming under times or more in its testament)
            const count = it.other ? await countsOf ([...box.querySelectorAll<HTMLElement> (".w")].map ((w) => w.dataset.strong ?? ""), otherTestament (book) === "LXX" ? -1 : 0)
                                   : new Map ((await chapterLexicon (ch)).map ((r) => [String (r.strong), Number (r.count ?? 0)]));
            const helps = it.helps ?? "both";
            for (const w of box.querySelectorAll<HTMLElement> (".w")) {
              const common = (count.get (w.dataset.strong ?? "") ?? 0) >= it.under;
              w.classList.toggle ("csNoGloss", common && helps !== "parse");
              w.classList.toggle ("csNoParse", common && helps !== "gloss");
            }
          }
          if (it === firstText) for (const b of beside) {
            const s = sourceOf (book, b.src);
            if (! s) continue;
            cite (s.id);
            const by = await notesByVerse (ch, s, inRange (range, b.from, b.to), b);
            for (const row of box.querySelectorAll<HTMLElement> (".vrow")) {
              const v = Number (row.dataset.verse), ns = by.get (v);
              if (! ns?.length) continue;
              // (After the row and any other source's notes already placed under it)
              let after: Element = row;
              while (after.nextElementSibling?.classList.contains ("csBeside")) after = after.nextElementSibling;
              const note = el ("div", "csBeside gBody");
              note.append (el ("div", "src", s.name), ...drawNotes (s, ns, text, chapter, v));
              after.after (note);
            }
          }
          block.append (box);
        } else if (it.k === "note") {
          const s = sourceOf (book, it.src);
          if (! s) continue;
          h (s.name);
          cite (s.id);
          const range = inRange (vs, it.from, it.to);
          const by = await notesByVerse (ch, s, range, it);
          const body = el ("div", "gBody csNotes");
          for (const v of range) {
            const ns = by.get (v);
            if (! ns?.length) continue;
            const one = el ("div", "csVerse");
            one.append (el ("div", "src verseHead", `${chapter}:${v}`), ...drawNotes (s, ns, text, chapter, v));
            body.append (one);
          }
          if (! body.children.length) body.append (el ("p", "", "Nothing on these verses."));
          block.append (body);
        } else if (it.k === "dict") {
          const s = sourceOf (book, it.src);
          h (s?.name ?? it.src);
          cite (it.src);
          const list = (await entriesOf (sec, it)).filter ((a) => ! it.skip?.includes (a.id));
          for (const e of list) {
            const key = `${it.src}:${e.id}`;
            let a = articles.get (key);
            if (! a) { a = articleBlock (db, e.id, it.src); articles.set (key, a); }
            const got = await a;
            if (! got) continue;
            block.append (el ("h3", "csArticle", got.title), ...got.body);
          }
          if (! list.length) block.append (el ("p", "", "Nothing for these verses."));
        } else if (it.k === "map") {
          h ("Atlas");
          const m = mapOf (it);
          const s = sourcesFor (book).find ((x) => x.kind === "atlas");
          cite ("atlas");
          block.append (m.view.el);
          const range = inRange (vs, it.from, it.to);
          const key = `${book.id}.${chapter}:${range.join (",")}`;
          // (Its places' verses as the panel's: beside the Septuagint, the Hebrew verses translated - placesOf)
          if (m.key !== key) { m.key = key; m.range = range; mapsNow.push ({ m, sec, per: s ? await placesOf (s, book, chapter, range) : range.map ((x) => ({ v: x, where: [[book.id, chapter, x]] })) }); }
        } else if (it.k === "time") {
          h ("Timeline");
          const t = await chapterTime (book.id, chapter);
          if (t) { cite ("timeline"); block.append (timelineBlock (t, book, chapter)); }
          else block.append (el ("p", "", "The timeline couldn't be loaded."));
        } else if (it.k === "words") {
          h ("Word list");
          cite (`text:${book.testament}`); cite (`lex:${book.testament}`);
          block.append (await wordList (ch, it));
        }
      } catch (e) {
        block.append (el ("p", "", "This couldn't be loaded."));
        console.warn ("Study printout:", e);
      }
      if (n !== drawing) return;
      part.append (block);
    }
    if (n !== drawing) return;
    doc.append (part);
  }
  const bib = el ("section", "csBlock csBib");
  doc.append (bib);
  if (n !== drawing) return;
  if (ready) { ready = null; printEl.textContent = PRINT; }     // (A file made before this change is out of date)
  const scroll = previewEl.scrollTop;
  previewEl.replaceChildren (doc);
  previewEl.scrollTop = scroll;
  cited = used; sourcesEl = bib;
  drawSources ();
  // (A map drawn once it's in the page: it needs its size; its base map's and boundaries' credits then cited)
  const drawn = mapsNow.map (({ m, sec, per }) => m.view.update (sec.book.id, sec.chapter, per, "No places named in these verses."));
  if (drawn.length) void Promise.allSettled (drawn).then (() => { if (n === drawing) drawSources (); });
}

/** The bibliography at the printout's end (sourcesEl), drawn again from what it cites and what it shows (a map's base
 *  map and boundaries, an article's translation: their credit lines in the printout - an article's source credit, its
 *  last line, not counted) in the printout's style: its heading, the entries (bibliography.ts), then "Licenses". */
function drawSources () {
  if (! sourcesEl?.isConnected) return;
  const doc = sourcesEl.parentElement!;
  let shown = "";
  const walker = document.createTreeWalker (doc, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode (); t; t = walker.nextNode ()) if (! t.parentElement?.closest (".csBib, .lexCredit")) shown += t.textContent + "\n";
  const ids = citedWorks (cited, shown);
  sourcesEl.hidden = ! ids.length;
  if (! ids.length) { sourcesEl.replaceChildren (); return; }
  const style = now ().bib ?? "sbl";
  const entries = bibliography (ids, style).map ((segs) => {
    const p = el ("p", "csBibEntry");
    p.append (...segs.map ((s) => s.i ? el ("i", "", s.text) : document.createTextNode (s.text)));
    return p;
  });
  const notes = licenses (ids);
  sourcesEl.replaceChildren (el ("h2", "csHead", bibHeading (style)), ...entries,
                             ...(notes.length ? [el ("h3", "csArticle", "Licenses"), ...notes.map ((t) => el ("p", "credit", t))] : []));
}

/** An Atlas item's map, made once (atlas.ts' passageMap): its pickers (BASE MAP, POLITICAL BOUNDARIES, ROUTE) moved
 *  out of the map's box onto the item's options. */
function mapOf (it: Item) {
  let m = maps.get (it.id);
  if (! m) {
    const view = passageMap (db);
    const opts = [...view.el.querySelectorAll<HTMLElement> (":scope > label.sheetPick")];
    for (const o of opts) { o.remove (); o.addEventListener ("change", () => drawSources ()); }     // (Another base map or boundaries: their credits cited)
    m = { view, opts, key: "", range: [] as number[] };
    maps.set (it.id, m);
  }
  return m;
}

/** A year as the timeline says it (ISO astronomical in: -1450 is 1451 BC). */
const yearText = (y: number) => { const r = Math.round (y); return r <= 0 ? `${1 - r} BC` : `AD ${r}`; };
const SPAN = 150;     // (The years either side of the chapter's shown)

/** A chapter (of book) on the timeline: its year, then each lane's items within SPAN years of it as bars along the
 *  years shown (the chapter's own in the accent), the chapter's year a line across them. */
function timelineBlock (t: NonNullable<Awaited<ReturnType<typeof chapterTime>>>, book: Book, chapter: number): HTMLElement {
  const box = el ("div", "csTime");
  if (t.year === null) { box.append (el ("p", "", "This chapter isn't dated on the timeline.")); return box; }
  const y = t.year, lo = y - SPAN, hi = y + SPAN;
  const pct = (x: number) => `${((Math.min (Math.max (x, lo), hi) - lo) / (hi - lo)) * 100}%`;
  box.append (el ("p", "csYear", `${book.name} ${chapter}: c. ${yearText (y)}`),
              el ("p", "timelineNote", "Dates follow Floyd Nolen Jones's chronology (after Ussher); before the kings they are approximate and disputed."));
  const axis = el ("div", "csAxis");
  axis.append (el ("span", "", yearText (lo)), el ("span", "", yearText (y)), el ("span", "", yearText (hi)));
  box.append (axis);
  t.lanes.forEach ((lane, i) => {
    const its = t.items.filter ((x) => x.lane === i).filter ((x) => x.end >= lo && x.start <= hi).sort ((a, b) => a.start - b.start);
    if (! its.length) return;
    const l = el ("div", "csLane");
    l.append (el ("div", "src", lane));
    for (const x of its) {
      const row = el ("div", "csBarRow");
      const bar = el ("span", "csBar" + (t.here.has (x.id) ? " here" : ""));
      bar.style.left = pct (x.start);
      bar.style.width = `max(3px, calc(${pct (x.end)} - ${pct (x.start)}))`;
      const label = el ("span", "csBarLabel" + (t.here.has (x.id) ? " here" : ""),
                        `${x.label}, c. ${yearText (x.start)}${Math.round (x.end) !== Math.round (x.start) ? ` - ${yearText (x.end)}` : ""}`);
      row.append (bar, label);
      l.append (row);
    }
    const line = el ("span", "csHere");
    line.style.left = pct (y);
    l.append (line);
    box.append (l);
  });
  return box;
}

/** Words drawn as the reader draws them (reader.ts' showChapter), their lines by the options - Interlinear (gloss),
 *  Parsing, Transliteration - whatever the ⋯ menu says for the reader (style.css' .csText): a text item here, a verse
 *  card's original (versecards.ts). Words not tapped (cursor default). */
export function textBox (b: Book, chapter: number, ws: Word[], o: { gloss: boolean; parse: boolean; translit: boolean }): HTMLElement {
  const box = el ("div", "csText");
  box.classList.toggle ("csGloss", o.gloss); box.classList.toggle ("csParse", o.parse); box.classList.toggle ("csTranslit", o.translit);
  showChapter (box, b, chapter, ws, () => {});
  return box;
}

/** Where words stand, as a heading's reference: 22:1–3, 21:1–22:2 (the other text numbering its own). */
export const wordsSpan = (ws: Word[]) => { const [a, z] = [ws[0], ws[ws.length - 1]];
  if (a.chapter === z.chapter && a.verse === z.verse) return `${a.chapter}:${a.verse}`;     // (One verse: 22:1, not 22:1–1)
  return `${a.chapter}:${a.verse}–${z.chapter === a.chapter ? "" : `${z.chapter}:`}${z.verse}`; };

/** The other text's words for verses lo-hi of a chapter of b: beside a Hebrew book the Septuagint verses translating
 *  them (the main database's lxx_heb - Psalms and Jeremiah number differently; Daniel's two Greek forms: the later,
 *  Theodotion's, as the reader's language switch takes), beside a Septuagint book the Hebrew verses it translates -
 *  each verse once, in order. (The printout's other text; a verse card's Greek LXX: versecards.ts.) */
export async function translatedWords (theDb: Db, b: Book, chapter: number, lo: number, hi: number): Promise<Word[]> {
  let refs = (b.testament === "OT"
    ? await theDb.all ("SELECT DISTINCT book AS b, chapter AS c, verse AS v FROM lxx_heb WHERE hbook = ? AND hchapter = ? AND hverse BETWEEN ? AND ? ORDER BY book, chapter, verse", [b.id, chapter, lo, hi])
    : await theDb.all ("SELECT DISTINCT hbook AS b, hchapter AS c, hverse AS v FROM lxx_heb WHERE book = ? AND chapter = ? AND verse BETWEEN ? AND ? ORDER BY hchapter, hverse", [b.id, chapter, lo, hi]))
    .map ((r) => [Number (r.b), Number (r.c), Number (r.v)]);
  const last = Math.max (...refs.map ((r) => r[0]));
  refs = refs.filter ((r) => r[0] === last);
  return (await Promise.all (refs.map (([bk, c, v]) => verseWords (theDb, bk, c, v)))).flat ();
}

/** The other text's words for a chapter's verses (vs): translatedWords, kept per range. */
function otherWords (ch: Chapter, vs: number[]): Promise<Word[]> {
  const key = vs.join (",");
  let p = ch.others.get (key);
  if (! p && vs.length) {
    p = translatedWords (db, ch.book, ch.chapter, Math.min (...vs), Math.max (...vs));
    ch.others.set (key, p);
    p.catch (() => ch.others.delete (key));
  }
  return p ?? Promise.resolve ([]);
}

/** Roots' counts in a testament (freq's book 0: the Hebrew Bible's or the NT's; -1 the Septuagint's), read 500 at a time. */
async function countsOf (strongs: string[], freqBook: number): Promise<Map<string, number>> {
  const keys = [...new Set (strongs)], out = new Map<string, number> ();
  for (let i = 0; i < keys.length; i += 500) {
    const part = keys.slice (i, i + 500);
    for (const r of await db.all (`SELECT strong, count FROM freq WHERE book = ? AND strong IN (${part.map (() => "?").join (",")})`, [freqBook, ...part]))
      out.set (String (r.strong), Number (r.count));
  }
  return out;
}

/** A chapter's words' lexicon rows (each root once, in the order it first comes), with its count in the testament. */
function chapterLexicon (ch: Chapter): Promise<Row[]> {
  ch.lexicon ??= (async () => {
    const strongs = [...new Set ((await ch.words).map ((w) => w.strong))];
    const out = new Map<string, Row> ();
    const whole = ch.book.testament === "LXX" ? -1 : 0;
    for (let i = 0; i < strongs.length; i += 500) {     // (SQLite's bound parameters, a chunk at a time)
      const part = strongs.slice (i, i + 500);
      for (const r of await db.all (`SELECT l.strong, l.lemma, l.translit, l.gloss, l.concise, l.entry, f.count FROM lexicon l
                                     LEFT JOIN freq f ON f.strong = l.strong AND f.book = ? WHERE l.strong IN (${part.map (() => "?").join (",")})`, [whole, ...part]))
        out.set (String (r.strong), r);
    }
    return strongs.filter ((s) => out.has (s)).map ((s) => out.get (s)!);
  }) ();
  return ch.lexicon;
}
const meaning = (r: Row) => String (r.concise || r.gloss || "");

/** WORD LIST: a chapter's words asked for, rarest first (then as they come), each its dictionary form, transliteration
 *  (an option), definition (short: the vocab gloss; long: the brief lexicon's entry - only <b>, <i>, <br>: build_db.py)
 *  and its count in the testament. */
async function wordList (ch: Chapter, it: Item & { k: "words" }): Promise<HTMLElement> {
  const rows = (await chapterLexicon (ch)).filter ((r) => it.which === "all" || (it.which === "rare" ? Number (r.count ?? 0) < it.under : it.picked.includes (String (r.strong))));
  const sorted = rows.map ((r, i) => ({ r, i })).sort ((a, b) => Number (a.r.count ?? 0) - Number (b.r.count ?? 0) || a.i - b.i).map ((x) => x.r);
  const box = el ("div", "csWords");
  if (! sorted.length) { box.append (el ("p", "", it.which === "picked" ? "No words picked yet: pick them in the line's options." : "No words.")); return box; }
  const he = hebrew (ch.book);
  for (const r of sorted) {
    const row = el ("div", "csWord");
    const head = el ("div", "csWordHead");
    head.append (el ("span", he ? "heWord" : "grWord", String (r.lemma)));
    if (it.translit) head.append (el ("span", "csTr", latin (he, String (r.lemma), String (r.translit ?? ""))));
    head.append (el ("span", "csCount", `${Number (r.count ?? 0)}×`));
    const def = el ("div", "csDef");
    if (it.long && r.entry) def.innerHTML = String (r.entry); else def.textContent = meaning (r);
    row.append (head, def);
    box.append (row);
  }
  return box;
}

//==== PRINTING ====
/** Before printing: each canvas in the printout (a map) copied to a picture beside it, which prints in its place. */
function prepare () {
  for (const old of previewEl.querySelectorAll (".csSnap")) old.remove ();
  for (const c of previewEl.querySelectorAll ("canvas")) {
    try {
      const img = el ("img", "csSnap");
      img.src = c.toDataURL ("image/png");
      img.alt = "Map";
      c.after (img);
    } catch { /* (A canvas that can't be read: printed as it is) */ }
  }
}
window.addEventListener ("beforeprint", () => { if (previewEl?.isConnected) prepare (); });

// THE PDF MADE HERE: a Home Screen web app on an iPhone or iPad ignores window.print (Safari's tab and every other
// browser print as above). There the button turns the preview into a PDF and opens the share sheet with it, from which
// it prints, saves to Files or is sent. Its pages are pictures (the text not selectable): the preview laid out at the
// page's width in the print rules themselves (printRules: style.css' @media print rules for the printout's own
// classes, scoped to the PDF's frame - one set of rules, the light colors whatever the theme), cut into pages between
// verses, notes and entries (the rules' break-inside: avoid and a heading's break-after: avoid, read back from the
// page: pageCuts), the whole made one SVG picture by modern-screenshot (loaded only then: its own file, not in the
// app's first load), each page drawn from its slice at the screen's sharpness and written as a JPEG into a PDF (pdfOf). A4, or Letter where the device's region uses it; @page's margins; the page
// number at each foot. Named as the printout ("John 3.pdf"). The same PDF is DOWNLOAD's PDF, on any device.
const PRINT = "Print";
const DOWNLOAD = "Choose a format";
/** DOWNLOAD's formats, as the picker lists them. */
const FORMATS: [FileKind | "pdf", string][] = [
  ["docx", "Microsoft Word (.docx)"], ["doc", "Microsoft Word 97-2003 (.doc)"], ["odt", "OpenDocument (.odt)"], ["rtf", "Rich Text Format (.rtf)"],
  ["txt", "Plain Text (.txt)"], ["html", "Web Page (.html)"], ["htm", "Web Page (.htm)"], ["pdf", "PDF (.pdf)"]];
let downloadEl: HTMLSelectElement;
let ready: File | null = null;     // (A file made but not yet shared: the share sheet refused it - see handOver)

/** Whether window.print does nothing here: a Home Screen web app on iOS (an iPad says it's a Mac, but has touch),
 *  which can share a file (file: that one; none, a PDF) instead - there a file made is shared, not downloaded. */
function printIgnored (file = new File ([""], "x.pdf", { type: "application/pdf" })): boolean {
  const ios = /iPhone|iPad|iPod/.test (navigator.userAgent) || (/Macintosh/.test (navigator.userAgent) && navigator.maxTouchPoints > 1);
  const standalone = (navigator as { standalone?: boolean }).standalone === true || matchMedia ("(display-mode: standalone)").matches;
  try { return ios && standalone && navigator.canShare?.({ files: [file] }) === true; }
  catch { return false; }
}

/** The page in PDF points (72 an inch): Letter in the US, Canada and the Americas that use it, A4 elsewhere; the margins
 *  @page's (16 mm top and foot, 14 mm the sides). */
function paper () {
  const letter = /-(US|CA|MX|PH|CL|CO|VE|GT|PR)\b/i.test (navigator.language);
  const mm = 72 / 25.4;
  return { w: letter ? 612 : 595.28, h: letter ? 792 : 841.89, side: 14 * mm, top: 16 * mm };
}

/** style.css' @media print rules for the printout's own classes (each of whose selectors names a .cs class), every
 *  selector put under .csPdf: the PDF's frame gets the print look with no copy of the rules - the rest (the page's
 *  own body, menus) left out, so the app on screen doesn't change while the PDF is made. */
function printRules (): string {
  let css = "";
  const visit = (rules: CSSRuleList, print: boolean) => {
    for (const r of rules) {
      if (r instanceof CSSMediaRule) visit (r.cssRules, print || /\bprint\b/.test (r.conditionText));
      else if (print && r instanceof CSSStyleRule) {
        const sels = r.selectorText.split (",").map ((x) => x.trim ());
        if (sels.every ((x) => /\.cs/.test (x))) css += `${sels.map ((x) => `.csPdf ${x}`).join (", ")} { ${r.style.cssText} }\n`;
      }
    }
  };
  for (const sheet of document.styleSheets) {
    try { visit (sheet.cssRules, false); } catch { /* (A sheet that can't be read: another origin's) */ }
  }
  return css;
}

/** Where the pages end (CSS px from the printout's top), each at most height: at the top of a verse, note, entry or
 *  line of text - never through one, nor between a heading and what follows it -, the latest that fits; a single
 *  thing taller than a page cut at its last line that fits (or, with none in the page's lower half, at the page's foot). */
function pageCuts (doc: HTMLElement, height: number): number[] {
  const t0 = doc.getBoundingClientRect ().top;
  const atoms: [number, number][] = [];     // (Spans no cut may go through: a whole thing kept together, a line of text, a picture)
  const glued: number[] = [];     // (The feet of headings kept with what follows)
  const lines: number[] = [];     // (Every line's top, inside kept things too: where a too-tall one is cut)
  const range = document.createRange ();
  const walk = (e: Element, kept: boolean) => {
    const cs = getComputedStyle (e);
    if (cs.display === "none") return;
    const r = e.getBoundingClientRect ();
    const keep = ! kept && /avoid/.test (cs.breakInside);
    if (keep || (! kept && /^(img|canvas|svg|video)$/i.test (e.tagName))) atoms.push ([r.top - t0, r.bottom - t0]);
    if (/avoid/.test (cs.breakAfter)) glued.push (r.bottom - t0);
    for (const n of e.childNodes) {
      if (n instanceof Element) walk (n, kept || keep);
      else if (n.nodeType === Node.TEXT_NODE && n.textContent?.trim ()) {
        range.selectNodeContents (n);
        for (const q of range.getClientRects ()) {
          lines.push (q.top - t0);
          if (! kept && ! keep) atoms.push ([q.top - t0, q.bottom - t0]);
        }
      }
    }
  };
  walk (doc, false);
  const end = doc.getBoundingClientRect ().height;
  const nextTop = (y: number) => Math.min (end, ...atoms.filter (([a]) => a >= y - 0.5).map (([a]) => a));
  const glue = glued.map ((b) => [b, nextTop (b)]);
  const clean = (y: number) => ! atoms.some (([a, b]) => a < y - 0.5 && b > y + 0.5) && ! glue.some (([b, n]) => y > b - 0.5 && y <= n + 0.5);
  const cuts: number[] = [];
  let y = 0;
  while (end - y > 1) {
    const limit = y + height;
    if (limit >= end) { cuts.push (end); break; }
    let cut = 0;
    for (const [a] of atoms) if (a > y + 1 && a <= limit && a > cut && clean (a)) cut = a;
    if (! cut) for (const a of lines) if (a > y + height / 2 && a <= limit && a > cut) cut = a;
    cuts.push (y = cut || limit);
  }
  return cuts;
}

/** fn run on a copy of the preview laid out as it prints (the print rules - printRules - in an off-screen frame at the
 *  page's text width: px, CSS px; the maps as pictures - prepare), the frame removed after; null with no preview. */
async function withPrintCopy<T> (fn: (copy: HTMLElement, page: ReturnType<typeof paper>, width: number) => Promise<T>): Promise<T | null> {
  const doc = previewEl.querySelector<HTMLElement> (".csDoc");
  if (! doc) return null;
  const style = el ("style", "", printRules ());
  const host = el ("div", "csPdf");
  try {
    prepare ();     // (The maps as pictures)
    const page = paper ();
    const width = (page.w - 2 * page.side) * 96 / 72;
    const copy = doc.cloneNode (true) as HTMLElement;
    host.style.width = `${width}px`;
    host.append (copy);
    document.head.append (style);
    document.body.append (host);
    await document.fonts.ready;
    return await fn (copy, page, width);
  } finally {
    style.remove ();
    host.remove ();
  }
}

/** The printout's file name with an extension: its name as shown, a file name's forbidden marks made dashes. */
const fileName = (ext: string) => `${nameShown (now ()).replace (/[\\/:*?"<>|]/g, "-")}.${ext}`;

/** The PDF made from the preview (the Print button saying so meanwhile; a second tap while it's made ignored); null
 *  when it couldn't be made. */
async function makePdf (): Promise<File | null> {
  if (printEl.disabled) return null;
  printEl.disabled = true;
  printEl.textContent = "Making PDF…";
  try {
    const { domToForeignObjectSvg, loadMedia } = await import ("modern-screenshot");
    return await withPrintCopy (async (copy, page, width) => {
      const px = 96 / 72;     // (CSS px a point)
      const height = (page.h - 2 * page.top) * px;
      const cuts = pageCuts (copy, height);
      const scale = Math.min (window.devicePixelRatio || 1, 300 / 96);     // (The screen's sharpness, no finer than 300 dpi)
      const look = getComputedStyle (copy), soft = look.getPropertyValue ("--soft"), paperColor = look.backgroundColor;
      // The whole printout made one SVG picture (every element's look copied into it, the fonts embedded), loaded once;
      // each page drawn from its slice - a vector picture, so drawn sharp at the canvas' scale.
      const full = copy.getBoundingClientRect ().height;
      const svg = await domToForeignObjectSvg (copy, { width, height: full });
      const img = await loadMedia (`data:image/svg+xml;charset=utf-8,${encodeURIComponent (new XMLSerializer ().serializeToString (svg))}`) as HTMLImageElement;     // (A data URL: a blob's would taint the canvas)
      const shots: Shot[] = [];
      let top = 0;
      for (const cut of cuts) {
        const h = cut - top;
        const canvas = el ("canvas");
        canvas.width = Math.round (width * scale);
        canvas.height = Math.round (h * scale);
        const g = canvas.getContext ("2d")!;
        const draw = () => { g.fillStyle = paperColor; g.fillRect (0, 0, canvas.width, canvas.height); g.drawImage (img, 0, top, width, h, 0, 0, canvas.width, canvas.height); };
        draw ();
        await new Promise ((done) => setTimeout (done, 100));     // (Drawn again a moment later: Safari may not have decoded an SVG's own pictures the first time)
        draw ();
        const blob = await new Promise<Blob | null> ((done) => canvas.toBlob (done, "image/jpeg", 0.9));
        const [pw, ph] = [canvas.width, canvas.height];
        canvas.width = canvas.height = 0;     // (Freed at once: an iPhone holds few big canvases)
        if (! blob) throw new Error ("A page couldn't be drawn");
        shots.push ({ jpeg: new Uint8Array (await blob.arrayBuffer ()), pw, ph, h: h / px });
        top = cut;
      }
        return new File ([pdfOf (shots, page, soft)], fileName ("pdf"), { type: "application/pdf" });
    });
  } catch (e) {
    console.warn ("Study printout: the PDF couldn't be made:", e);
    return null;
  } finally {
    printEl.textContent = PRINT;
    printEl.disabled = false;
  }
}

/** DOWNLOAD's work: the printout made into a file of the format picked (the PDF: makePdf; the rest printfiles.ts,
 *  loaded now, from the preview's print copy) and handed over; the picker says so meanwhile, then is back to its
 *  first line. A failure: nothing handed over, the reason logged. */
async function download (kind: FileKind | "pdf") {
  const first = downloadEl.options[0];
  first.textContent = `Making ${kind.toUpperCase ()}…`;
  downloadEl.value = ""; downloadEl.disabled = true;
  try {
    let file: File | null;
    if (kind === "pdf") file = await makePdf ();
    else {
      const { printFile, MIME } = await import ("./printfiles");
      file = await withPrintCopy (async (copy, page) => new File ([await printFile (kind, copy, nameShown (now ()), page)], fileName (kind), { type: MIME[kind] }));
    }
    if (file) await handOver (file);
  } catch (e) {
    console.warn (`Study printout: the ${kind} couldn't be made:`, e);
  } finally {
    first.textContent = DOWNLOAD;
    downloadEl.value = ""; downloadEl.disabled = false;
  }
}

/** A file made handed over: on a Home Screen iPhone or iPad (printIgnored) the share sheet (Print, Save to Files,
 *  Messages...) - cancelled, nothing more; refused because the making took too long after the tap (iOS shares only
 *  straight after one), the Print button turns to "Share <FORMAT>", a tap sharing the file made; any other failure, it
 *  downloads. Elsewhere it downloads. */
async function handOver (file: File) {
  const ext = file.name.replace (/^.*\./, "").toUpperCase ();
  if (printIgnored (file)) {
    try {
      await navigator.share ({ files: [file], title: file.name.replace (/\.[^.]*$/, "") });
      ready = null;
      printEl.textContent = PRINT;
      return;
    } catch (e) {
      const why = (e as Error).name;
      if (why === "AbortError") { ready = null; printEl.textContent = PRINT; return; }
      if (why === "NotAllowedError" && ready !== file) { ready = file; printEl.textContent = `Share ${ext}`; return; }
    }
  }
  ready = null;
  printEl.textContent = PRINT;
  const a = el ("a");
  a.href = URL.createObjectURL (file);
  a.download = file.name;
  a.click ();
  setTimeout (() => URL.revokeObjectURL (a.href), 60_000);
}

/** A page drawn: its JPEG, pw x ph pixels, h points tall on the page. */
type Shot = { jpeg: Uint8Array; pw: number; ph: number; h: number };

/** A PDF of the pages: each its JPEG at the page's top margin, the content's width, and its number at the foot's
 *  middle in the printout's soft color (color: a CSS color). */
function pdfOf (shots: Shot[], page: ReturnType<typeof paper>, color: string): Blob {
  const parts: (string | Uint8Array)[] = [];
  const offsets: number[] = [];
  let at = 0;
  const put = (x: string | Uint8Array) => { parts.push (x); at += typeof x === "string" ? x.length : x.length; };     // (The strings are ASCII: a char a byte)
  const obj = (n: number, body: string, stream?: Uint8Array) => {
    offsets[n] = at;
    put (`${n} 0 obj\n${body}\n`);
    if (stream) { put ("stream\n"); put (stream); put ("\nendstream\n"); }
    put ("endobj\n");
  };
  const ink = document.createElement ("canvas").getContext ("2d")!;
  ink.fillStyle = color.trim () || "gray";
  const rgb = /^#([0-9a-f]{6})$/i.exec (ink.fillStyle)?.[1] ?? "808080";
  const [r, g, b] = [0, 2, 4].map ((i) => (parseInt (rgb.slice (i, i + 2), 16) / 255).toFixed (3));
  const n = shots.length;
  put ("%PDF-1.4\n");
  obj (1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj (2, `<< /Type /Pages /Count ${n} /Kids [${shots.map ((_, i) => `${4 + 3 * i} 0 R`).join (" ")}] >>`);
  obj (3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const w = page.w - 2 * page.side, ascii = new TextEncoder ();
  shots.forEach ((s, i) => {
    const p = 4 + 3 * i, num = String (i + 1);
    const draw = `q ${w.toFixed (2)} 0 0 ${s.h.toFixed (2)} ${page.side.toFixed (2)} ${(page.h - page.top - s.h).toFixed (2)} cm /Im Do Q `
               + `BT /F1 9 Tf ${r} ${g} ${b} rg ${(page.w / 2 - num.length * 2.5).toFixed (2)} ${(page.top / 2).toFixed (2)} Td (${num}) Tj ET`;
    obj (p, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.w} ${page.h}] /Resources << /Font << /F1 3 0 R >> /XObject << /Im ${p + 2} 0 R >> >> /Contents ${p + 1} 0 R >>`);
    obj (p + 1, `<< /Length ${draw.length} >>`, ascii.encode (draw));
    obj (p + 2, `<< /Type /XObject /Subtype /Image /Width ${s.pw} /Height ${s.ph} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${s.jpeg.length} >>`, s.jpeg);
  });
  const xref = at, count = 4 + 3 * n;
  put (`xref\n0 ${count}\n0000000000 65535 f \n` + offsets.slice (1).map ((o) => `${String (o).padStart (10, "0")} 00000 n \n`).join (""));
  put (`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob (parts, { type: "application/pdf" });
}
