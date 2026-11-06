// The Resource reader (☰ > Resource reader): any resource the resources pane offers - and the grammars - read through
// as an ebook, chapter by chapter, apart from the text.
// - THE TOP ROW (topbar.ts' topTitle, as Flashcards'): the chapter shown centered ("Genesis 1", "A", "The Alphabet"),
//   a drop-down arrow beside it - tapped, its drop-down under it (part of the top bar): RESOURCE (every source in the
//   database but those that aren't text - the sentence diagrams, the atlas, the timeline -, grouped as the resources
//   pane's picker groups them (notes.ts' sourceGroups), then GRAMMARS: the grammar sections' books), then where to go -
//   BOOK and CHAPTER for a verse-keyed resource, LETTER for a dictionary, SECTION for a grammar. A name two resources
//   share (Brenton's, in the Hebrew Bible's numbering and the Septuagint's own) is told apart by its testament. Open at
//   first, until a resource has been picked.
// - THE CHAPTERS, in the resource's order: a verse-keyed resource (commentary, translation, apparatus, ancient version)
//   each Bible book and chapter it has notes in (a note on a range in its first verse's chapter); a dictionary its
//   articles alphabetically, a letter a chapter (dictionary.ts' articleBlock: photo, place's map, text) - drawn 20 at a
//   time as the reading nears the end of what's drawn, a letter running to hundreds; a grammar its sections in order, a
//   run of sections under one heading a chapter (grammar.ts' sectionHtml). The resource's name over the chapter, its
//   credit under it - once, not under every article.
// - COMPACT, as a grammar's sections are everywhere: each unit folded to a row (grammar.ts' foldEl / sectionHtml - the
//   church fathers' and the dictionary entries' row, .hit), tapped open under it, tapped again folded - a verse's notes
//   under its reference ("Genesis 1:3" over their first words: notes.ts' noteElement), a dictionary's article under its
//   title, a grammar's section under its § (a chapter of one section open). Not folded, the units too short for it to
//   matter: a translation's or ancient version's verses, read on as continuous text, each under its reference
//   (notes.ts' verseBlock); and the church fathers' verses, whose notes are folded already, each to its father and
//   work (foldedNote, as the pane's).
// - THE READING TEXT in the serif, larger (style.css' .readText - a grammar's text's own rule): the notes, the articles'
//   text, the sections; the rows, captions, pickers and credits in the page's sans; Hebrew and Greek in their fonts.
// - THE PLACE: the unit last opened in each resource is kept, and opened again (scrolled to) when its chapter is.
// - ‹ and › at the bottom bar's ends (bars.ts; with a mouse and room, in the reading's margins: marginArrows) - and a
//   swipe across the reading (onSwipe) - go to the previous and next chapter, across books; at the first or last
//   nothing. Each chapter opens at its top.
// - A scripture reference in an article (underlined) goes to its verse in the Bible, the screen closed.
// Kept on the device (localStorage cotext.resreader): the resource last read, the chapter reached in each and the
// unit last opened in each.

import type { Db, Row } from "./db";
import { onScreen, closeScreen } from "./study";
import { allSources, sourceGroups, openSource, verseBlock, noteElement, foldedNote, FOLDED, type Note, type Source } from "./notes";
import { dictionary, articleBlock } from "./dictionary";
import { sectionHtml, folding, foldEl, setFold } from "./grammar";
import { topTitle, dropDowns, watchTopBar } from "./topbar";
import { onSwipe, marginArrows } from "./bars";
import { ICONS } from "./icons";

/** A chapter of a resource: key (kept on the device: a verse-keyed one's "book.chapter", a dictionary's letter, a
 *  grammar's first section's seq), group (the first picker's choice: a book's name; "" none - a dictionary, a
 *  grammar), label (the second picker's: the chapter number, the letter, the section's § and heading), title (the top
 *  row's). */
interface Chapter { key: string; group: string; label: string; title: string; }
/** A resource as the reader opens it: its chapters, what the second picker calls one (unit: Chapter, Letter, Section),
 *  its credit, how to draw one into el (still: whether it's still the chapter asked for; target: the unit to reach - a
 *  fold's data-unit, drawn even past the first batch) and to close its file. */
interface Opened { chapters: Chapter[]; unit: string; credit: string; draw: (c: Chapter, el: HTMLElement, still: () => boolean, target?: string) => Promise<void>; close?: () => void; }

const KEY = "cotext.resreader";
const kept: { src: string; at: Record<string, string>; unit: Record<string, string> } = { src: "", at: {}, unit: {} };
try { Object.assign (kept, JSON.parse (localStorage.getItem (KEY) ?? "{}")); kept.unit ??= {}; } catch { /* none kept, or private mode */ }
const keep = () => { try { localStorage.setItem (KEY, JSON.stringify (kept)); } catch { /* private mode: not kept */ } };

let db: Db;
let books = new Map<number, string> ();     // (Book id -> its name)
let grammars: Row[] = [];
/** main.ts: the database (the books' names, the grammars). */
export async function initResReader (theDb: Db) {
  db = theDb;
  const [bs, gs] = await Promise.all ([db.all ("SELECT id, name FROM books"), db.all ("SELECT id, name, lang, credit FROM grammars ORDER BY rowid")]);
  books = new Map (bs.map ((b) => [Number (b.id), String (b.name)]));
  grammars = gs;
}

const esc = (s: string) => s.replace (/[&<>"]/g, (c) => `&#${c.charCodeAt (0)};`);
/** The resources read: every source that's text (not the diagrams, the atlas, the timeline). */
const readable = () => allSources ().filter ((s) => s.file && s.kind !== "syntax" && s.kind !== "atlas" && s.kind !== "timeline");
/** A resource's name as RESOURCE lists it: its own, a name two share told apart by its testament. */
function nameOf (s: Source, all: Source[]) {
  return all.some ((x) => x !== s && x.name === s.name) ? `${s.name} - ${s.testaments === "LXX" ? "Septuagint numbering" : "Hebrew Bible numbering"}` : s.name;
}

//==== VERSE-KEYED ====
/** A commentary's, translation's, apparatus' or ancient version's chapters (each book and chapter it has notes in) and
 *  their notes - each verse's folded under its reference (data-unit "book.start"), but where the verse is short or its
 *  notes folded already (above). */
async function openNotes (s: Source, progress: (f: number) => void): Promise<Opened> {
  const file = await openSource (s, progress);
  const rows = await file.all (`SELECT DISTINCT book, start / 1000 AS c FROM notes ORDER BY book, c`);
  const chapters = rows.filter ((r) => books.has (Number (r.book))).map ((r) => {
    const name = books.get (Number (r.book))!;
    return { key: `${r.book}.${r.c}`, group: name, label: String (r.c), title: `${name} ${r.c}` };
  });
  return {
    chapters, unit: "Chapter", credit: s.credit, close: () => file.close (),
    async draw (c, el, still) {
      const [b, ch] = c.key.split (".").map (Number);
      const notes = await file.all (`SELECT rowid AS id, start, "end", quote, body FROM notes WHERE book = ? AND start BETWEEN ? AND ?
                                     ORDER BY start, "end" DESC, ord`, [b, ch * 1000, ch * 1000 + 999]) as unknown as Note[];
      if (! still ()) return;
      const fold = ! FOLDED.has (s.id) && s.kind !== "translation" && s.kind !== "version";
      const verses: Note[][] = [];
      for (const n of notes) if (verses[verses.length - 1]?.[0].start === n.start) verses[verses.length - 1].push (n); else verses.push ([n]);
      for (const vs of verses) {     // (Each verse's notes under its reference)
        const ref = `${c.group} ${ch}:${vs[0].start % 1000}`;
        const els = vs.map ((n) => FOLDED.has (s.id) ? foldedNote (n) : noteElement (n));
        for (const e of els) (e.classList.contains ("note") ? e : e.querySelector (".note"))?.classList.add ("readText");
        if (! fold) { const block = verseBlock (ref); block.append (...els); el.append (block); continue; }
        const body = document.createElement ("div");
        body.append (...els);
        const line = els.map ((e) => [...e.childNodes].filter ((x) => ! (x instanceof Element && x.classList.contains ("src"))).map ((x) => x.textContent).join (" ")).join (" ");     // (A range's caption left out)
        const f = foldEl (ref, line, body);
        f.dataset.unit = `${b}.${vs[0].start}`;
        el.append (f);
      }
    },
  };
}

//==== DICTIONARIES ====
/** A dictionary's chapters (its articles' first letters, alphabetically: "#" for a title starting otherwise) and their
 *  articles, each folded under its title (data-unit its id) - 20 drawn at a time (the first time as many as reach the
 *  target), the next 20 as the reading nears the end of those drawn. */
const BATCH = 20;
async function openDictionary (s: Source, progress: (f: number) => void): Promise<Opened> {
  const file = await dictionary (db, progress, s.id);
  if (! file) throw new Error ("none");
  const letter = (t: string) => { const l = t.replace (/^[^\p{L}\d]+/u, "").normalize ("NFD").charAt (0).toUpperCase (); return /\p{L}/u.test (l) ? l : "#"; };
  const all = (await file.all ("SELECT id, title FROM articles ORDER BY title COLLATE NOCASE")).map ((r) => ({ id: String (r.id), title: String (r.title), l: letter (String (r.title)) }));
  const letters = [...new Set (all.map ((a) => a.l))];
  return {
    chapters: letters.map ((l) => ({ key: l, group: "", label: l, title: l })), unit: "Letter", credit: s.credit,
    async draw (c, el, still, target) {
      const ids = all.filter ((a) => a.l === c.key).map ((a) => a.id);
      const sentinel = document.createElement ("div");
      let next = 0, busy = false;
      const more = async (count = BATCH) => {
        if (! still ()) { watch.disconnect (); return; }
        if (busy || next >= ids.length) return;
        busy = true;
        const part = await Promise.all (ids.slice (next, next + count).map ((id) => articleBlock (db, id, s.id).then ((a) => [id, a] as const)));
        next += count;
        busy = false;
        if (! still ()) return;
        for (const [id, a] of part) {
          if (! a) continue;
          const body = document.createElement ("div");
          body.append (...a.body.filter ((e) => ! e.classList.contains ("lexCredit")));     // (The credit once, at the chapter's foot)
          const text = body.querySelector (".gBody");
          text?.classList.add ("readText");     // (The article's text; its photo's and map's captions stay the page's)
          const f = foldEl (a.title, text?.textContent ?? "", body);
          f.dataset.unit = id;
          sentinel.before (f);
        }
        if (next >= ids.length) { watch.disconnect (); sentinel.remove (); } else if (near ()) more ();
      };
      const scroller = document.getElementById ("screen")!;
      const near = () => sentinel.isConnected && sentinel.getBoundingClientRect ().top < scroller.getBoundingClientRect ().bottom + scroller.clientHeight;
      const watch = new IntersectionObserver ((es) => { if (es.some ((e) => e.isIntersecting)) more (); }, { root: scroller, rootMargin: "0px 0px 100% 0px" });
      el.append (sentinel);
      watch.observe (sentinel);
      await more (Math.max (BATCH, ids.indexOf (target ?? "") + 1));
    },
  };
}

//==== GRAMMARS ====
/** A grammar's chapters (each run of its sections under one heading: Smyth's The Alphabet §§1-3) and their sections. */
async function openGrammar (g: Row): Promise<Opened> {
  const rows = await db.all ("SELECT seq, label, heading FROM grammar_sections WHERE grammar = ? ORDER BY seq", [String (g.id)]);
  const runs: { first: number; last: number; heading: string; labels: string[] }[] = [];
  for (const r of rows) {
    const last = runs[runs.length - 1];
    if (last && last.heading === String (r.heading)) { last.last = Number (r.seq); if (r.label) last.labels.push (String (r.label)); }
    else runs.push ({ first: Number (r.seq), last: Number (r.seq), heading: String (r.heading), labels: r.label ? [String (r.label)] : [] });
  }
  const span = (ls: string[]) => ! ls.length ? "" : ls.length === 1 ? `§${ls[0]} ` : `§§${ls[0]}–${ls[ls.length - 1]} `;
  return {
    chapters: runs.map ((r) => ({ key: String (r.first), group: "", label: span (r.labels) + r.heading, title: r.heading })), unit: "Section", credit: String (g.credit),
    async draw (c, el, still) {
      const run = runs.find ((r) => String (r.first) === c.key)!;
      const secs = await db.all ("SELECT seq, label, heading, body FROM grammar_sections WHERE grammar = ? AND seq BETWEEN ? AND ? ORDER BY seq", [String (g.id), run.first, run.last]);
      if (! still ()) return;
      const text = document.createElement ("div");
      text.innerHTML = secs.map ((r) => sectionHtml (r, secs.length === 1, false)).join ("");     // (One heading over them all: the chapter's title)
      text.querySelectorAll<HTMLElement> (".fold").forEach ((f, k) => { f.dataset.unit = String (secs[k].seq); });
      el.append (...text.childNodes);
    },
  };
}

//==== THE SCREEN ====
let opened: Opened | null = null, openedId = "";
let menuOpen: string | null = null;     // (The drop-down open, kept across openings; null: not yet - open until a resource is picked)

async function draw (body: HTMLElement) {
  const sources = readable ();
  const gName = (g: Row) => `${g.name} (${g.lang === "H" ? "Hebrew" : "Greek"})`;
  const resource = document.createElement ("select");
  resource.className = "choose";
  const named = sources.map ((s) => ({ ...s, name: nameOf (s, sources) }));
  const gGroup = document.createElement ("optgroup");
  gGroup.label = "Grammars";
  gGroup.append (...grammars.map ((g) => new Option (gName (g), "grammar:" + g.id)));
  resource.append (...sourceGroups (named), ...(grammars.length ? [gGroup] : []));
  body.innerHTML = `<div class="topBar"><div class="topRow"><span id="rrTitle"></span></div>
    <div class="vcMenu" data-menu="more">
      <div class="fieldRow"><label class="field" id="rrResource">Resource</label></div>
      <div class="fieldRow"><label class="field" id="rrGroupRow">Book<select class="choose" id="rrGroup"></select></label><label class="field"><span id="rrChapterName">Chapter</span><select class="choose" id="rrChapter"></select></label></div>
    </div></div>
    <div class="rrRead"><div class="src" id="rrName"></div><div class="rrBook gBody"></div><p class="credit" id="rrCredit"></p></div>
    <div class="bottomBar"><button class="pill icon arrow" data-k="back" aria-label="Previous chapter">${ICONS.back}</button><button class="pill icon arrow" data-k="next" aria-label="Next chapter">${ICONS.next}</button></div>`;
  body.querySelector ("#rrResource")!.append (resource);
  const top = topTitle ("Resource reader", "resource and chapter");
  body.querySelector ("#rrTitle")!.replaceWith (top.title);
  const menu = body.querySelector<HTMLElement> (".vcMenu")!;
  dropDowns ([{ key: "more", button: top.button, menu }], menuOpen ?? (kept.src ? "" : "more"), (k) => { menuOpen = k; });
  watchTopBar (body.querySelector<HTMLElement> (".topBar")!);
  const groupPick = body.querySelector<HTMLSelectElement> ("#rrGroup")!, chapterPick = body.querySelector<HTMLSelectElement> ("#rrChapter")!;
  const read = body.querySelector<HTMLElement> (".rrRead")!, bookEl = body.querySelector<HTMLElement> (".rrBook")!;
  folding (bookEl);     // (Every unit's row opens and folds: grammar.ts)
  // (The unit opened kept as the place in the resource - folded again, forgotten; folding's own listener runs first)
  bookEl.addEventListener ("click", (e) => {
    const f = (e.target as Element).closest (".fold > .hit")?.parentElement;
    if (! f?.dataset.unit) return;
    if (f.querySelector (":scope > .hit")!.getAttribute ("aria-expanded") === "true") kept.unit[openedId] = f.dataset.unit!;
    else if (kept.unit[openedId] === f.dataset.unit) delete kept.unit[openedId];
    keep ();
  });
  const nameEl = body.querySelector<HTMLElement> ("#rrName")!, creditEl = body.querySelector<HTMLElement> ("#rrCredit")!;
  const prev = body.querySelector<HTMLElement> ("[data-k=back]")!, next = body.querySelector<HTMLElement> ("[data-k=next]")!;
  const screen = document.getElementById ("screen")!;
  let shown = 0;     // (The chapter asked for last: one still arriving for an earlier ask isn't drawn)

  const ids = [...resource.options].map ((o) => o.value);
  const src = ids.includes (kept.src) ? kept.src : ids[0] ?? "";
  resource.value = src;

  /** The chapter at index i of the resource open: drawn, the pickers and the arrows following, kept. */
  const go = async (i: number) => {
    if (! opened) return;
    const cs = opened.chapters, c = cs[i];
    if (! c) return;
    const n = ++shown, still = () => n === shown && bookEl.isConnected;
    kept.at[openedId] = c.key; keep ();
    top.set (c.title);
    const groups = [...new Set (cs.map ((x) => x.group))];
    groupPick.closest ("label")!.hidden = groups.length < 2 && ! c.group;
    groupPick.replaceChildren (...groups.map ((g) => new Option (g, g)));
    groupPick.value = c.group;
    chapterPick.replaceChildren (...cs.map ((x, j) => [x, j] as const).filter (([x]) => x.group === c.group).map (([x, j]) => new Option (x.label, String (j))));
    chapterPick.value = String (i);
    body.querySelector ("#rrChapterName")!.textContent = opened.unit;
    prev.toggleAttribute ("disabled", i === 0); next.toggleAttribute ("disabled", i === cs.length - 1);
    bookEl.innerHTML = "<p>Loading…</p>";
    screen.scrollTop = 0;
    try {
      const el = document.createElement ("div");
      el.className = "rrChapter";
      bookEl.replaceChildren (el);
      const target = kept.unit[openedId];
      await opened.draw (c, el, still, target);
      if (still () && ! el.childNodes.length) bookEl.innerHTML = "<p>Nothing in this chapter.</p>";
      const f = target && still () ? [...el.querySelectorAll<HTMLElement> (".fold")].find ((x) => x.dataset.unit === target) : undefined;
      if (f) { setFold (f, true); f.scrollIntoView ({ block: "start" }); }     // (The place kept: its unit opened and in view)
    } catch {
      if (still ()) bookEl.innerHTML = "<p>This chapter couldn't be read.</p>";
    }
  };
  const at = () => Number (chapterPick.value);

  /** The resource picked opened (its file downloaded the first time, then kept), at the chapter reached in it. */
  const openResource = async (id: string) => {
    kept.src = id; keep ();
    const n = ++shown;
    const name = resource.selectedOptions[0]?.textContent ?? "";
    nameEl.textContent = name;
    creditEl.textContent = "";
    top.set (name);
    bookEl.innerHTML = "<p>Loading…</p>";
    if (openedId !== id) {
      opened?.close?.(); opened = null; openedId = "";
      const progress = (f: number) => { if (n === shown) bookEl.innerHTML = `<p>Loading ${esc (name)}… ${Math.round (f * 100)}%</p>`; };
      try {
        const g = grammars.find ((x) => "grammar:" + x.id === id), s = sources.find ((x) => x.id === id);
        const o = g ? await openGrammar (g) : s?.kind === "dictionary" ? await openDictionary (s, progress) : s ? await openNotes (s, progress) : null;
        if (! o) return;
        if (n !== shown) { o.close?.(); return; }
        opened = o; openedId = id;
      } catch {
        if (n === shown) bookEl.innerHTML = `<p>${esc (name)} couldn't be loaded.</p>`;
        return;
      }
    }
    creditEl.textContent = opened!.credit;
    const i = opened!.chapters.findIndex ((c) => c.key === kept.at[id]);
    go (Math.max (0, i));
  };

  resource.addEventListener ("change", () => openResource (resource.value));
  groupPick.addEventListener ("change", () => go (opened?.chapters.findIndex ((c) => c.group === groupPick.value) ?? -1));     // (A book: its first chapter)
  chapterPick.addEventListener ("change", () => { go (at ()); top.button.click (); });     // (Jumped: the drop-down closed, the chapter in view)
  prev.addEventListener ("click", () => go (at () - 1));
  next.addEventListener ("click", () => go (at () + 1));
  onSwipe (read, (by) => go (at () + by));
  marginArrows (screen, read, prev, next);
  // (An article's scripture reference: dictionary.ts takes the text there - the screen closed to show it)
  bookEl.addEventListener ("click", (e) => { if ((e.target as HTMLElement).closest ("a[data-ref]")) closeScreen (); });
  if (src) openResource (src);
  else bookEl.innerHTML = "<p>No resources in this database.</p>";
}

onScreen ("Resource reader", draw);
