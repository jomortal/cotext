// Chapter Study (☰ > Chapter Study): a printout made for the chapter being read - its text and any of the resources
// that have something for it, arranged by the reader, printed or saved as a PDF through the browser's own print.
// - TWO PANES: the EDITOR - a line per item added (its name; a drag handle ⠿ to move it up or down, by touch or mouse;
//   Options, opening that item's own settings under it; ✕ removing it), "+ Add item" under the last, Print / Save as
//   PDF - and the PREVIEW, the printout as it will print, redrawn as lines are added, moved, changed or removed (not
//   edited itself). Narrow (under 700 px) the preview the top half, the editor the bottom half, each scrolling on its
//   own; wide side by side, the editor at the left (style.css' .cstudy).
// - WHAT CAN BE ADDED ("+ Add item": a list of everything there is for this chapter):
//   TEXT - the Hebrew or Greek, its options Interlinear (the English under each word), Parsing, Transliteration and a
//     verse range; any number of times. With nothing added the printout is the chapter's text alone (original only).
//   NOTES - each source the notes panel has for the book (translations, commentaries - the church fathers where there
//     are some -, apparatus, ancient versions, the sentence diagram): the chapter's, or a verse range's, either
//     BESIDE EACH VERSE (under each verse of the first text item, study-Bible style, the source named) or AS ITS OWN
//     SECTION (each verse's notes under its reference). Beside each verse with no text item: as its own section.
//   ARTICLES - the dictionaries (Tyndale, ISBE: the articles the chapter's verses cite or its words lead to; the
//     Archaeology finds and the Ancient Near East parallels: those bearing on the chapter's verses), picked one or
//     several at a time from their list, each its own item, printed as the article opens in the app.
//   THE ATLAS - the map of the places the chapter names (or the range's), with the list of them and their verses; its
//     options BASE MAP, POLITICAL BOUNDARIES and ROUTE (the book's journeys, where it has any) - the map's own
//     pickers, moved onto its line. Printed as a picture of the map as it stands (it can be panned in the preview).
//   THE TIMELINE - the chapter's year (Theographic, as ☰ Timeline) and the lanes' items within 150 years of it, each a
//     bar, the chapter's own in the accent.
//   WORD LIST - the chapter's words (every word, those under a frequency in the testament, or ones picked from the
//     chapter's list), rarest first, each its dictionary form, transliteration (an option), definition - SHORT (the
//     vocab gloss) or LONG (the brief lexicon's full entry: abridged BDB or Abbott-Smith) - and how often it comes in
//     the testament.
// - PRINT / SAVE AS PDF: window.print with style.css' print rules - the preview alone, in the light colors, its fonts,
//   Hebrew right to left, a map as a picture (each canvas copied to an image first: prepare), verses, notes and
//   entries kept whole where they fit, the chapter's reference as its title, page numbers where the browser allows
//   (@page), and every source used credited at the end. On an iPhone: Share > Print > Save to Files.
// - KEPT on the device per chapter (localStorage, "cotext.study.<book>.<chapter>"): leaving and coming back keeps it;
//   another chapter starts blank.

import type { Db, Row } from "./db";
import { chapterWords, showChapter, latin, type Book, type Word } from "./reader";
import { onScreen } from "./study";
import { sourcesFor, openSource, noteElement, drawDiagram, type Source, type Note, type Sentence } from "./notes";
import { passageArticles, bookArticles, articleBlock } from "./dictionary";
import { passageMap } from "./atlas";
import { chapterTime } from "./timeline";

/** An item of the printout. from / to: a verse range (0: the chapter's first / last). */
type Item = { id: string } & (
  | { k: "text"; gloss: boolean; parse: boolean; translit: boolean; from: number; to: number }
  | { k: "note"; src: string; beside: boolean; from: number; to: number }
  | { k: "article"; src: string; art: string; title: string }
  | { k: "map"; from: number; to: number }
  | { k: "time" }
  | { k: "words"; which: "all" | "rare" | "picked"; under: number; picked: string[]; long: boolean; translit: boolean });

const TEXT_CREDIT = "Text, parsing and lexicons: STEPBible Data, Tyndale House, Cambridge (CC BY 4.0).";
const UNDER = [5, 10, 25, 50, 100, 200, 500];     // (WORD LIST's frequencies: words coming fewer times than this in the testament)
const DICT_NAMES: Record<string, string> = { tobd: "Tyndale", isbe: "ISBE", finds: "Find", ane: "Parallel" };     // (An article's line: "Tyndale: Jericho")

let db: Db;
let where: () => [Book, number] = () => { throw new Error ("Chapter Study: not started"); };
/** main.ts: the database and where the reader is (the book shown and its chapter). */
export function initChapterStudy (theDb: Db, place: () => [Book, number]) { db = theDb; where = place; }

const el = <K extends keyof HTMLElementTagNameMap> (tag: K, cls = "", text = "") => {
  const e = document.createElement (tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

//==== THE CHAPTER'S DATA ====
// Read once a chapter (reset when another is studied): its words, each notes source's notes, the word list's lexicon
// rows; and once per item, its article and its map (elements kept, moved into each redraw).
let at = "";     // ("<book id>.<chapter>": the chapter the caches are for)
let book: Book, chapter = 1;
let words: Promise<Word[]>;
const notesOf = new Map<string, Promise<Note[]>> ();
const files = new Map<string, Promise<Db>> ();     // (Each notes source's file, opened once: openSource)
let lexicon: Promise<Row[]> | null = null;
const articles = new Map<string, Promise<Awaited<ReturnType<typeof articleBlock>>>> ();
const maps = new Map<string, { view: ReturnType<typeof passageMap>; opts: HTMLElement[]; key: string; range: number[] }> ();

function study (b: Book, c: number) {
  const key = `${b.id}.${c}`;
  if (key === at) return;
  at = key; book = b; chapter = c;
  words = chapterWords (db, b.id, c);
  notesOf.clear (); lexicon = null; articles.clear (); maps.clear ();
}

const sources = () => sourcesFor (book);
const sourceOf = (id: string) => sources ().find ((s) => s.id === id);
/** The chapter's verse numbers. */
const verses = async () => [...new Set ((await words).map ((w) => w.verse))];
/** A range's verses (0: the chapter's first or last). */
const inRange = (vs: number[], from: number, to: number) => vs.filter ((v) => (! from || v >= from) && (! to || v <= to));

/** A source's notes touching the chapter, in the panel's order; a note from an earlier chapter (a range) among them. */
function chapterNotes (s: Source): Promise<Note[]> {
  let p = notesOf.get (s.id);
  if (! p) {
    let f = files.get (s.id);
    if (! f) { f = openSource (s, () => {}); files.set (s.id, f); f.catch (() => files.delete (s.id)); }
    p = f.then ((d) => d.all (`SELECT rowid AS id, start, "end", quote, body FROM notes WHERE book = ? AND "end" >= ? AND start <= ?
                               ORDER BY start, "end" DESC, ord`, [book.id, chapter * 1000, chapter * 1000 + 999]) as unknown as Promise<Note[]>);
    notesOf.set (s.id, p);
    p.catch (() => notesOf.delete (s.id));
  }
  return p;
}

/** A source's notes by the verse each is placed at - its first verse in the range (a note on 5:13-6:5 at 6:1). */
async function notesByVerse (s: Source, vs: number[]): Promise<Map<number, Note[]>> {
  const out = new Map<number, Note[]> ();
  for (const n of await chapterNotes (s)) {
    const v = vs.find ((x) => chapter * 1000 + x >= n.start && chapter * 1000 + x <= n.end);
    if (v === undefined) continue;
    (out.get (v) ?? out.set (v, []).get (v)!).push (n);
  }
  return out;
}

/** A verse's notes drawn: each as the panel draws it, a diagram's sentences as trees (text: the chapter's words). */
function drawNotes (s: Source, ns: Note[], text: Map<string, [string, string]>, v: number): HTMLElement[] {
  if (s.kind !== "syntax") return ns.map (noteElement);
  return ns.map ((n) => drawDiagram (JSON.parse (n.body) as Sentence, text, chapter * 1000 + v));
}

//==== THE ITEMS ====
const KEY = () => `cotext.study.${book.code}.${chapter}`;
let items: Item[] = [];
const load = () => { try { items = JSON.parse (localStorage.getItem (KEY ()) ?? "[]"); } catch { items = []; } };
const save = () => { try { localStorage.setItem (KEY (), JSON.stringify (items)); } catch { /* private mode: not kept */ } };
let nextId = 0;
const newId = () => `${Date.now ().toString (36)}${(nextId++).toString (36)}`;

/** An item's line in the editor, as the reader knows it. */
function nameOf (it: Item): string {
  const range = "from" in it && (it.from || it.to) ? ` (${chapter}:${it.from || "1"}-${it.to || "end"})` : "";
  switch (it.k) {
    case "text": return `${book.name} ${chapter} text` + (it.gloss ? " + interlinear" : "") + (it.parse ? " + parsing" : "")
                        + (it.translit ? " + transliteration" : "") + range;
    case "note": return (sourceOf (it.src)?.name ?? it.src) + (it.beside ? ", beside each verse" : "") + range;
    case "article": return `${DICT_NAMES[it.src] ?? it.src}: ${it.title}`;
    case "map": return "Atlas map" + range;
    case "time": return "Timeline";
    case "words": return "Word list" + (it.which === "rare" ? ` (under ${it.under}×)` : it.which === "picked" ? ` (${it.picked.length} picked)` : "");
  }
}

//==== THE SCREEN ====
let previewEl: HTMLElement, linesEl: HTMLElement, menuEl: HTMLElement;
const openOpts = new Set<string> ();     // (The lines whose options are open)

onScreen ("Chapter Study", async (body) => {
  const [b, c] = where ();
  study (b, c);
  load ();
  const box = el ("div", "cstudy");
  previewEl = el ("div", "csPreview");
  const editor = el ("div", "csEditor");
  linesEl = el ("div", "csLines");
  const add = el ("button", "pill csAdd", "+ Add item");
  menuEl = el ("div", "csMenu");
  menuEl.hidden = true;
  const print = el ("button", "pill csPrint", "Print / Save as PDF");
  add.addEventListener ("click", () => { if (menuEl.hidden) showMenu (); else menuEl.hidden = true; });
  print.addEventListener ("click", () => { prepare (); window.print (); });
  editor.append (linesEl, add, menuEl, print);
  box.append (previewEl, editor);
  body.append (box);
  drawLines ();
  render ();
});

/** The editor's lines, one per item, in order. */
function drawLines () {
  linesEl.replaceChildren (...items.map ((it) => {
    const line = el ("div", "csLine");
    line.dataset.id = it.id;
    const row = el ("div", "csRow");
    const handle = el ("button", "pill icon csHandle", "⠿");
    handle.setAttribute ("aria-label", "Drag to move");
    const opts = el ("button", "pill csOptsBtn", "Options");
    opts.setAttribute ("aria-expanded", String (openOpts.has (it.id)));
    const x = el ("button", "pill icon csRemove", "✕");
    x.setAttribute ("aria-label", "Remove");
    row.append (handle, el ("span", "csName", nameOf (it)), opts, x);
    const panel = el ("div", "csOpts");
    panel.hidden = ! openOpts.has (it.id);
    if (! panel.hidden) fillOptions (panel, it);
    opts.addEventListener ("click", () => {
      if (openOpts.has (it.id)) openOpts.delete (it.id); else openOpts.add (it.id);
      drawLines ();
    });
    x.addEventListener ("click", () => { items = items.filter ((i) => i !== it); openOpts.delete (it.id); changed (); });
    dragging (handle, line);
    line.append (row, panel);
    return line;
  }));
  if (! items.length) linesEl.append (el ("p", "csEmpty", "Nothing added yet: the printout is the chapter's text. Add the text with its options, notes, articles, the map, the timeline or a word list."));
}

/** The items changed: kept, the lines and the preview redrawn. */
function changed () { save (); drawLines (); render (); }

/** A line dragged by its handle (pointer events: touch and mouse alike): it moves among the lines as it passes their
 *  middles; let go, the new order is kept. */
function dragging (handle: HTMLElement, line: HTMLElement) {
  handle.style.touchAction = "none";
  handle.addEventListener ("pointerdown", (e) => {
    e.preventDefault ();
    handle.setPointerCapture (e.pointerId);
    line.classList.add ("dragged");
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
      const moved = order.join () !== items.map ((i) => i.id).join ();
      items.sort ((a, b) => order.indexOf (a.id) - order.indexOf (b.id));
      if (moved) changed ();
    };
    handle.addEventListener ("pointermove", move);
    handle.addEventListener ("pointerup", up);
    handle.addEventListener ("pointercancel", up);
  });
}

// ---- Options ----
const toggle = (label: string, on: boolean, set: (v: boolean) => void) => {
  const b = el ("button", "pill", label);
  b.setAttribute ("aria-pressed", String (on));
  b.addEventListener ("click", () => { set (! on); changed (); });
  return b;
};
const picker = (label: string, choices: [string, string][], value: string, set: (v: string) => void) => {
  const row = el ("label", "sheetPick", label);
  const s = el ("select", "choose");
  s.append (...choices.map (([v, t]) => new Option (t, v)));
  s.value = value;
  s.addEventListener ("change", () => { set (s.value); changed (); });
  row.append (s);
  return row;
};
/** A verse range's two pickers (0: the first / the last). */
async function rangeRows (it: { from: number; to: number }): Promise<HTMLElement[]> {
  const vs = await verses ();
  return [picker ("From verse", [["0", "First"], ...vs.map ((v): [string, string] => [String (v), String (v)])], String (it.from), (v) => { it.from = +v; }),
          picker ("To verse", [["0", "Last"], ...vs.map ((v): [string, string] => [String (v), String (v)])], String (it.to), (v) => { it.to = +v; })];
}

/** An item's own settings, under its line. */
async function fillOptions (panel: HTMLElement, it: Item) {
  const bar = el ("div", "bar");
  if (it.k === "text") {
    bar.append (toggle ("Interlinear", it.gloss, (v) => { it.gloss = v; }), toggle ("Parsing", it.parse, (v) => { it.parse = v; }),
                toggle ("Transliteration", it.translit, (v) => { it.translit = v; }));
    panel.append (bar, ...await rangeRows (it));
  } else if (it.k === "note") {
    bar.append (toggle ("Beside each verse", it.beside, (v) => { it.beside = v; }), toggle ("As its own section", ! it.beside, (v) => { it.beside = ! v; }));
    panel.append (bar, ...await rangeRows (it));
  } else if (it.k === "map") {
    panel.append (...await rangeRows (it), ...mapOf (it).opts);
  } else if (it.k === "words") {
    panel.append (picker ("Words", [["all", "Every word of the chapter"], ["rare", "Under a frequency"], ["picked", "Words picked"]], it.which, (v) => { it.which = v as typeof it.which; }));
    if (it.which === "rare") panel.append (picker ("Coming fewer times than", UNDER.map ((n): [string, string] => [String (n), `${n} in the ${testamentName ()}`]), String (it.under), (v) => { it.under = +v; }));
    panel.append (picker ("Definitions", [["short", "Short (the gloss)"], ["long", "Long (the lexicon's entry)"]], it.long ? "long" : "short", (v) => { it.long = v === "long"; }));
    bar.append (toggle ("Transliteration", it.translit, (v) => { it.translit = v; }));
    panel.append (bar);
    if (it.which === "picked") {
      const list = el ("div", "csPickList");
      for (const r of await chapterLexicon ()) {
        const k = String (r.strong), on = it.picked.includes (k);
        const b = el ("button", "pill csPickWord");
        b.setAttribute ("aria-pressed", String (on));
        b.append (el ("span", hebrew () ? "heWord" : "grWord", String (r.lemma)), el ("span", "csPickGloss", ` ${meaning (r)}`));
        b.addEventListener ("click", () => { it.picked = on ? it.picked.filter ((x) => x !== k) : [...it.picked, k]; changed (); });
        list.append (b);
      }
      panel.append (list);
    }
  } else panel.append (el ("p", "", "No options."));
}

const hebrew = () => book.testament === "OT";
const testamentName = () => book.testament === "OT" ? "Hebrew Bible" : book.testament === "NT" ? "New Testament" : "Septuagint";

// ---- + Add item ----
/** The list of what can be added: the text, the notes sources for the book (by kind), the dictionaries (each opening
 *  its articles for the chapter, to pick), the atlas, the timeline, the word list. */
function showMenu () {
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
  const push = (it: Item) => { items.push (it); menuEl.hidden = true; changed (); };
  menuEl.append (head ("Original text"), choice (`${hebrew () ? "Hebrew" : "Greek"} text of ${book.name} ${chapter}`,
    () => push ({ id: newId (), k: "text", gloss: true, parse: false, translit: false, from: 0, to: 0 })));
  const kinds: [string, string][] = [["translation", "Translations"], ["commentary", "Commentaries"], ["apparatus", "Apparatus"],
                                     ["version", "Ancient versions"], ["syntax", "Syntax"]];
  for (const [kind, label] of kinds) {
    const list = sources ().filter ((s) => s.kind === kind);
    if (! list.length) continue;
    menuEl.append (head (label), ...list.map ((s) => choice (s.name,
      () => push ({ id: newId (), k: "note", src: s.id, beside: kind !== "syntax", from: 0, to: 0 }))));
  }
  const dicts = sources ().filter ((s) => s.kind === "dictionary");
  if (dicts.length) menuEl.append (head ("Dictionaries"), ...dicts.map ((s) => choice (s.name + " ›", () => showArticles (s), "Pick from its entries")));
  menuEl.append (head ("Maps and time"));
  if (sources ().some ((s) => s.kind === "atlas")) menuEl.append (choice ("Atlas map", () => push ({ id: newId (), k: "map", from: 0, to: 0 }), "The chapter's places"));
  if (book.testament !== "LXX") menuEl.append (choice ("Timeline", () => push ({ id: newId (), k: "time" }), "The chapter's place in time"));
  menuEl.append (head ("Words"), choice ("Word list", () => push ({ id: newId (), k: "words", which: "all", under: 25, picked: [], long: false, translit: false }),
                                         "Its words with definitions, rarest first"));
  menuEl.scrollIntoView ({ block: "nearest" });
}

/** A dictionary's entries for the chapter, to pick one or several: the Tyndale's and the ISBE's by verse (those
 *  citing each, then those its words lead to - dictionary.ts' passageArticles), the finds and parallels those bearing
 *  on the chapter's verses (bookArticles). */
async function showArticles (s: Source) {
  menuEl.replaceChildren (el ("p", "", `Loading ${s.name}…`));
  const vs = await verses ();
  let list: { id: string; title: string; line: string }[] = [];
  try {
    if (s.id === "finds" || s.id === "ane")
      list = (await bookArticles (db, book.id, s.id)).filter ((a) => a.verses.some ((x) => Math.floor (x / 1000) === chapter));
    else list = (await passageArticles (db, vs.map ((v) => [[book.id, chapter, v]]), s.id)).flat ();
  } catch { menuEl.replaceChildren (el ("p", "", `${s.name} couldn't be loaded.`)); return; }
  const picked = new Set<string> ();
  const back = el ("button", "pill", "‹ Back");
  back.addEventListener ("click", showMenu);
  const addBtn = el ("button", "pill csAddPicked", "Add picked");
  addBtn.disabled = true;
  addBtn.addEventListener ("click", () => {
    for (const a of list) if (picked.has (a.id)) items.push ({ id: newId (), k: "article", src: s.id, art: a.id, title: a.title.replace (/\*/g, "") });
    menuEl.hidden = true;
    changed ();
  });
  const rows = list.map ((a) => {
    const b = el ("button", "hit csChoice");
    b.setAttribute ("aria-pressed", "false");
    b.append (el ("span", "csChoiceName", a.title.replace (/\*/g, "")), el ("span", "hitText dictLine", a.line));
    b.addEventListener ("click", () => {
      if (picked.has (a.id)) picked.delete (a.id); else picked.add (a.id);
      b.setAttribute ("aria-pressed", String (picked.has (a.id)));
      addBtn.disabled = ! picked.size;
      addBtn.textContent = picked.size > 1 ? `Add ${picked.size} picked` : "Add picked";
    });
    return b;
  });
  const top = el ("div", "bar");
  top.append (back, addBtn);
  menuEl.replaceChildren (top, el ("div", "src", s.name), ...(rows.length ? rows : [el ("p", "", "Nothing for this chapter.")]));
}

//==== THE PREVIEW ====
// Drawn whole on each change, off screen, then swapped in (a later draw winning over one still reading); the maps'
// and articles' elements are kept per item and moved in.
let drawing = 0;
async function render () {
  const n = ++drawing;
  const doc = el ("div", "csDoc");
  doc.dir = "ltr";
  doc.append (el ("h1", "csTitle", `${book.name} ${chapter}`), el ("div", "src csSub", "Chapter study"));
  const vs = await verses ();
  const used = new Map<string, string> ();     // (Each source credited: its name -> its credit)
  const credit = (name: string, text: string) => { if (text && ! used.has (name)) used.set (name, text); };
  const list: Item[] = items.length ? items : [{ id: "default", k: "text", gloss: false, parse: false, translit: false, from: 0, to: 0 }];
  const firstText = list.find ((i) => i.k === "text");
  const beside = firstText ? list.filter ((i): i is Item & { k: "note" } => i.k === "note" && i.beside) : [];
  const text = new Map<string, [string, string]> ();     // (A diagram's words: "ref:n" -> [text, gloss])
  for (const w of await words) text.set (`${chapter * 1000 + w.verse}:${w.word}`, [w.text, w.gloss]);
  const mapsNow: ReturnType<typeof mapOf>[] = [];
  for (const it of list) {
    if (it.k === "note" && beside.includes (it as Item & { k: "note" })) continue;     // (Drawn under the text's verses)
    const block = el ("section", "csBlock");
    const h = (t: string) => block.append (el ("h2", "csHead", t));
    try {
      if (it.k === "text") {
        h (`${hebrew () ? "Hebrew" : "Greek"} text`);
        credit ("text", TEXT_CREDIT);
        const box = el ("div", "csText");
        box.classList.toggle ("csGloss", it.gloss); box.classList.toggle ("csParse", it.parse); box.classList.toggle ("csTranslit", it.translit);
        const range = inRange (vs, it.from, it.to);
        showChapter (box, book, chapter, (await words).filter ((w) => range.includes (w.verse)), () => {});
        if (it === firstText) for (const b of beside) {
          const s = sourceOf (b.src);
          if (! s) continue;
          credit (s.name, s.credit);
          const by = await notesByVerse (s, inRange (range, b.from, b.to));
          for (const row of box.querySelectorAll<HTMLElement> (".vrow")) {
            const v = Number (row.dataset.verse), ns = by.get (v);
            if (! ns?.length) continue;
            // (After the row and any other source's notes already placed under it)
            let after: Element = row;
            while (after.nextElementSibling?.classList.contains ("csBeside")) after = after.nextElementSibling;
            const note = el ("div", "csBeside gBody");
            note.append (el ("div", "src", s.name), ...drawNotes (s, ns, text, v));
            after.after (note);
          }
        }
        block.append (box);
      } else if (it.k === "note") {
        const s = sourceOf (it.src);
        if (! s) continue;
        h (s.name);
        credit (s.name, s.credit);
        const range = inRange (vs, it.from, it.to);
        const by = await notesByVerse (s, range);
        const body = el ("div", "gBody csNotes");
        for (const v of range) {
          const ns = by.get (v);
          if (! ns?.length) continue;
          const one = el ("div", "csVerse");
          one.append (el ("div", "src verseHead", `${chapter}:${v}`), ...drawNotes (s, ns, text, v));
          body.append (one);
        }
        if (! body.children.length) body.append (el ("p", "", "Nothing on these verses."));
        block.append (body);
      } else if (it.k === "article") {
        let a = articles.get (it.id);
        if (! a) { a = articleBlock (db, it.art, it.src); articles.set (it.id, a); }
        const got = await a;
        if (! got) continue;
        h (got.title);
        block.append (el ("div", "src csSource", got.name), ...got.body);
        credit (got.name, got.credit);
      } else if (it.k === "map") {
        h ("Atlas");
        const m = mapOf (it);
        const s = sources ().find ((x) => x.kind === "atlas");
        if (s) credit (s.name, s.credit);
        block.append (m.view.el);
        const range = inRange (vs, it.from, it.to);
        const key = range.join (",");
        if (m.key !== key) { m.key = key; m.range = range; mapsNow.push (m); }
      } else if (it.k === "time") {
        h ("Timeline");
        const t = await chapterTime (book.id, chapter);
        if (t) { credit ("Timeline", t.credit); block.append (timelineBlock (t)); }
        else block.append (el ("p", "", "The timeline couldn't be loaded."));
      } else if (it.k === "words") {
        h ("Word list");
        credit ("text", TEXT_CREDIT);
        block.append (await wordList (it));
      }
    } catch (e) {
      block.append (el ("p", "", "This couldn't be loaded."));
      console.warn ("Chapter Study:", e);
    }
    if (n !== drawing) return;
    doc.append (block);
  }
  if (used.size) {
    const credits = el ("section", "csBlock csCredits");
    credits.append (el ("h2", "csHead", "Sources"), ...[...used.values ()].map ((t) => el ("p", "credit", t)));
    doc.append (credits);
  }
  if (n !== drawing) return;
  const scroll = previewEl.scrollTop;
  previewEl.replaceChildren (doc);
  previewEl.scrollTop = scroll;
  // (A map drawn once it's in the page: it needs its size)
  for (const m of mapsNow)
    m.view.update (book.id, chapter, m.range.map ((x) => ({ v: x, where: [[book.id, chapter, x]] })), "No places named in these verses.");
}

/** An Atlas item's map, made once (atlas.ts' passageMap): its pickers (BASE MAP, POLITICAL BOUNDARIES, ROUTE) moved
 *  out of the map's box onto the item's options. */
function mapOf (it: Item) {
  let m = maps.get (it.id);
  if (! m) {
    const view = passageMap (db);
    const opts = [...view.el.querySelectorAll<HTMLElement> (":scope > label.sheetPick")];
    for (const o of opts) o.remove ();
    m = { view, opts, key: "", range: [] as number[] };
    maps.set (it.id, m);
  }
  return m;
}

/** A year as the timeline says it (ISO astronomical in: -1450 is 1451 BC). */
const yearText = (y: number) => { const r = Math.round (y); return r <= 0 ? `${1 - r} BC` : `AD ${r}`; };
const SPAN = 150;     // (The years either side of the chapter's shown)

/** The chapter on the timeline: its year, then each lane's items within SPAN years of it as bars along the years
 *  shown (the chapter's own in the accent), the chapter's year a line across them. */
function timelineBlock (t: NonNullable<Awaited<ReturnType<typeof chapterTime>>>): HTMLElement {
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

/** The chapter's words' lexicon rows (each root once, in the order it first comes), with its count in the testament. */
function chapterLexicon (): Promise<Row[]> {
  lexicon ??= (async () => {
    const strongs = [...new Set ((await words).map ((w) => w.strong))];
    const out = new Map<string, Row> ();
    const whole = book.testament === "LXX" ? -1 : 0;
    for (let i = 0; i < strongs.length; i += 500) {     // (SQLite's bound parameters, a chunk at a time)
      const part = strongs.slice (i, i + 500);
      for (const r of await db.all (`SELECT l.strong, l.lemma, l.translit, l.gloss, l.concise, l.entry, f.count FROM lexicon l
                                     LEFT JOIN freq f ON f.strong = l.strong AND f.book = ? WHERE l.strong IN (${part.map (() => "?").join (",")})`, [whole, ...part]))
        out.set (String (r.strong), r);
    }
    return strongs.filter ((s) => out.has (s)).map ((s) => out.get (s)!);
  }) ();
  return lexicon;
}
const meaning = (r: Row) => String (r.concise || r.gloss || "");

/** WORD LIST: the words asked for, rarest first (then as they come), each its dictionary form, transliteration (an
 *  option), definition (short: the vocab gloss; long: the brief lexicon's entry - only <b>, <i>, <br>: build_db.py) and
 *  its count in the testament. */
async function wordList (it: Item & { k: "words" }): Promise<HTMLElement> {
  const rows = (await chapterLexicon ()).filter ((r) => it.which === "all" || (it.which === "rare" ? Number (r.count ?? 0) < it.under : it.picked.includes (String (r.strong))));
  const sorted = rows.map ((r, i) => ({ r, i })).sort ((a, b) => Number (a.r.count ?? 0) - Number (b.r.count ?? 0) || a.i - b.i).map ((x) => x.r);
  const box = el ("div", "csWords");
  if (! sorted.length) { box.append (el ("p", "", it.which === "picked" ? "No words picked yet: pick them in the line's options." : "No words.")); return box; }
  for (const r of sorted) {
    const row = el ("div", "csWord");
    const head = el ("div", "csWordHead");
    head.append (el ("span", hebrew () ? "heWord" : "grWord", String (r.lemma)));
    if (it.translit) head.append (el ("span", "csTr", latin (hebrew (), String (r.lemma), String (r.translit ?? ""))));
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
