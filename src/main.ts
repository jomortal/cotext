// COTEXT's start: opens the database, then shows a chapter - the one in the address (#Gen.1, #Jhn.1, #LXXGen.1), else
// the last one read (kept in localStorage), else Genesis 1. The heading's ‹ and › step through chapters (across the
// books of the language picked: the Hebrew OT or the Septuagint, then the NT), its middle button opens the picker; ☰ the study drawer (study.ts), ⋯ the helps' menu (helps.ts); ▶ reads aloud (audio.ts),
// the two icons at the play bar's right open the notes panel (notes.ts) and the search pane (search.ts).

import { openDb, type Db, type Row } from "./db";
import { chapterWords, showChapter, type Book } from "./reader";
import { showPanel, hidePanel } from "./panel";
import { openPicker, togglePicker } from "./picker";
import { ABBR, nativeName } from "./booknames";
import { nativeRef, refPair } from "./refs";
import { initHelps, prepareHelps, setBook, applyHelps } from "./helps";
import { setTestament, currentLanguage, onLanguage, languageButtons } from "./study";
import { setAudioTestament } from "./audio";
import { initGrammar, setGrammarTestament } from "./grammar";
import { initChart, setChartPassage } from "./chart";
import { initGuide } from "./guide";
import { initVocab } from "./vocab";
import { initChoose } from "./choose";
import "./pronounce";     // (Registers the Pronunciation screen)
import { initNotes, setNotesPassage } from "./notes";
import { initSearch, setSearchPassage } from "./search";
import { initDictionary } from "./dictionary";
import { initAtlas } from "./atlas";
import { initTimeline } from "./timeline";
import { initChapterStudy } from "./chapterstudy";
import { initVerseCards } from "./versecards";
import "./layout";     // (The layout's dividers)
import { onSwipe } from "./bars";

const status = document.getElementById ("status")!;
const chapterEl = document.getElementById ("chapter")!;
const placeBtn = document.getElementById ("place")!;
const LAST = "cotext.last";

let db: Db;
let books: Book[] = [];
let book: Book;
let chapter = 1;

// The heading's place, a reference pair (refs.ts: bold capitals) on one line across the heading, never wrapped: the
// book's name and chapter in English and in its own language, each centered in its side (its width and an even share
// of the room left) - the Greek at the left, the Hebrew (read from the right) at the right: "GENESIS 1 | בְּרֵאשִׁית א"
// (style.css' #place .refPair). The two too wide for the heading together: the English abbreviated first, to its SBL
// abbreviation (booknames.ts' ABBR) with a full stop (1 THESS. 1), then the Greek, without its leading ΚΑΤΑ or ΠΡΟΣ
// (ΘΕΣΣΑΛΟΝΙΚΕΙΣ Α΄ Εʹ), then its long words cut short (ΘΕΣ. Α΄ Εʹ); still too wide, both made smaller to fit. Between
// the two (after the English alone), the drop-down arrow: tapped, the passage opens the book list.
const crowded = () => [...placeBtn.querySelectorAll (".refPair > *")].some ((e) => e.scrollWidth > e.clientWidth + 0.5);
function showPlace () {
  if (! book) return;
  const lang = nativeName (book.code)?.[1], native = lang ? nativeRef (book.code, lang, chapter) : "";
  // (Between the two, the drop-down arrow - the top rows' own, topbar.ts' - saying the passage opens the book list)
  const draw = (en: string) => { placeBtn.innerHTML = refPair (en, native); placeBtn.querySelector (".refPair")!.append (Object.assign (document.createElement ("span"), { className: "topArrow", ariaHidden: "true" })); };
  draw (`${book.name} ${chapter}`);
  if (crowded () && ABBR[book.name]) draw (`${ABBR[book.name]}. ${chapter}`);
  const n = placeBtn.querySelector (".refNative.gr");
  if (n && crowded ()) n.textContent = n.textContent!.replace (/^(ΚΑΤΑ|ΠΡΟΣ) /, "");
  if (n && crowded ()) {     // (Still too wide: the name's long words cut to three letters - ΨΑΛ. ΣΟΛ. ΙΗʹ - the chapter kept whole)
    const w = n.textContent!.split (" "), num = w.pop ()!;
    n.textContent = [...w.map ((x) => x.length > 5 ? x.slice (0, 3) + "." : x), num].join (" ");
  }
  // (Still too wide - a very narrow screen: the pair made smaller, a pixel at a time, to fit - 12 px the least)
  const pair = placeBtn.querySelector<HTMLElement> (".refPair")!;
  for (let px = parseFloat (getComputedStyle (pair).fontSize); crowded () && px > 12; ) pair.style.fontSize = --px + "px";
}
document.fonts.addEventListener ("loadingdone", showPlace);     // (Measured again once a font arrives: the text's width changes with it)
// (Worked out again whenever the heading's width changes - measured once laid out, so a phone turned upright from
// sideways is measured at its new width, not mid-turn as the window's resize can be)
let headW = 0;
new ResizeObserver (([e]) => { const w = Math.round (e.contentRect.width); if (w === headW) return; headW = w; showPlace (); }).observe (document.querySelector (".head")!);

// (Each go numbered: a chapter still arriving from the database when another is picked isn't shown)
let going = 0;
async function go (b: Book, c: number) {
  const n = ++going;
  const [words] = await Promise.all ([chapterWords (db, b.id, c), prepareHelps (b)]);
  if (n !== going) return;
  if (! words.length) { const cs = await chaptersOf (b); if (n === going && cs.length && ! cs.includes (c)) go (b, cs[0]); return; }     // (Enoch's fragments: a chapter it lacks)
  book = b;
  chapter = c;
  hidePanel ();
  showPlace ();
  document.title = `${b.name} ${c} - COTEXT`;
  setBook (b);
  setTestament (b.testament);
  setAudioTestament (b.testament);     // (Reading stops)
  setGrammarTestament (b.testament);
  setChartPassage (words);     // (The Verb chart offers the chapter's verbs)
  showChapter (chapterEl, b, c, words, (w, el) => showPanel (db, w, el));
  applyHelps ();
  document.querySelector ("main")!.scrollTo (0, 0);     // (main scrolls, not the page: style.css)
  // (After the scroll to the top: the notes panel shows the first verse. An LXX book with a Hebrew counterpart has the
  // Hebrew's notes, verse by verse on the Hebrew verses it translates, and the Hebrew OT beside it; any other only
  // Brenton's, by its own numbers - notes.ts)
  setNotesPassage (b, c);
  setSearchPassage (b);     // (After the notes: the search offers their sources for the testament)
  const ref = `${b.code}.${c}`;
  history.replaceState (null, "", "#" + ref);
  try { localStorage.setItem (LAST, ref); } catch { /* private mode: not kept */ }
}

/** A verse gone to (a search result: search.ts) - its chapter shown unless it's the one shown, then the text scrolled
 *  to put its row at the top (a little below the edge). */
async function goVerse (b: Book, c: number, v: number) {
  if (b !== book || c !== chapter) await go (b, c);
  if (b !== book || c !== chapter) return;     // (Another chapter picked meanwhile)
  const main = document.querySelector ("main")!;
  const row = chapterEl.querySelector<HTMLElement> (`.vrow[data-chapter="${c}"][data-verse="${v}"]`);
  if (row) main.scrollTo ({ top: row.getBoundingClientRect ().top - main.getBoundingClientRect ().top + main.scrollTop - 6 });
}

/** "Gen.1" -> that book and chapter, if the book has it (a chapter within its count: one of Enoch's it lacks goes to
 *  its first - go). */
function parseRef (ref: string | null): [Book, number] | null {
  const m = ref?.match (/^(\w+)\.(\d+)$/);
  const b = m && books.find ((x) => x.code === m[1]);
  return b && +m![2] >= 1 && +m![2] <= b.chapters ? [b, +m![2]] : null;
}

/** A book's chapters: 1 to its last, but for Enoch's fragments only those it has (read once). */
const chapterCache = new Map<number, Promise<number[]>> ();
function chaptersOf (b: Book): Promise<number[]> {
  let cs = chapterCache.get (b.id);
  if (! cs) {
    cs = db.all ("SELECT DISTINCT chapter FROM words WHERE book = ? ORDER BY chapter", [b.id]).then ((rows) => rows.map ((r) => Number (r.chapter)));
    chapterCache.set (b.id, cs);
  }
  return cs;
}

/** The books of the language picked, in order: the Hebrew OT or the Septuagint, then the NT. */
// (The Old Testament picked - Hebrew or the Septuagint - then always the NT)
const shown = () => (currentLanguage () === "H" ? books.filter ((b) => b.testament === "OT") : lxxBooks ()).concat (books.filter ((b) => b.testament === "NT"));     // (‹ › step through them in this order)

/** The picker's groups: the OT as picked (the Septuagint's books the Hebrew Bible has, in the traditional English
 *  order), its heading the choice of the two (study.ts' languageButtons), then the NT, whichever is picked. */
function groups (): [string | Node[], Book[]][] {
  const ot = currentLanguage () === "H" ? books.filter ((b) => b.testament === "OT") : lxxBooks ();
  return [[["Old Testament - ", ...languageButtons ()], ot], ["New Testament - Greek", books.filter ((b) => b.testament === "NT")]];
}

// The Septuagint's books in the traditional English order (Genesis to Malachi, by the Hebrew book each matches;
// Daniel's two Greek forms together) - only those the Hebrew Bible has: the Apocrypha and the other books it lacks
// are left out (the user's choice), though their text stays in the database.
function lxxBooks (): Book[] {
  return books.filter ((b) => b.testament === "LXX" && b.heb).sort ((a, b) => a.heb - b.heb || a.id - b.id);
}

/** The chapter before (-1) or after (+1), across the books shown; nothing past the first or Revelation 22. */
async function step (dir: number) {
  const cs = await chaptersOf (book), i = cs.indexOf (chapter) + dir;
  if (i >= 0 && i < cs.length) return go (book, cs[i]);
  const list = shown (), next = list[list.indexOf (book) + dir];
  if (next) { const ncs = await chaptersOf (next); go (next, dir > 0 ? ncs[0] : ncs[ncs.length - 1]); }
}

/** HEBREW / GREEK changed (the drawer): the same place in the other - the Septuagint's book for a Hebrew one (Daniel:
 *  Theodotion's, the one usually read) or the Hebrew's for an LXX one, at the same chapter where it has it (else its
 *  first); Genesis 1 where the other has no such book. The NT stays. */
async function switchLanguage (l: "H" | "G") {
  if (book.testament === "NT") {     // (The NT stays: only the list's Old Testament changes)
    if (! document.getElementById ("picker")!.hidden) openPicker (groups (), go, chaptersOf);
    return;
  }
  const to = l === "G" ? books.filter ((b) => b.testament === "LXX" && b.heb === book.id).pop ()
                       : books.find ((b) => b.id === book.heb);
  const target = to ?? books.find ((b) => b.testament === (l === "G" ? "LXX" : "OT"))!;
  const cs = await chaptersOf (target);
  go (target, to && cs.includes (chapter) ? chapter : cs[0]);
  if (! document.getElementById ("picker")!.hidden) openPicker (groups (), go, chaptersOf);     // (Switched in the book list, which it heads: its books follow)
}

async function start () {
  registerWorker();
  try {
    db = await openDb ((f) => { status.textContent = `Loading the text… ${Math.round (f * 100)}%`; });
  } catch (e) {
    status.textContent = String ((e as Error).message ?? e);
    return;
  }
  initChart (db);
  initGuide (db);
  initVocab (db);
  initHelps (db);
  initChoose ();
  // (What every chapter needs, read once and together: the books, the grammars' terms, the notes' sources)
  let rows: Row[];
  try {
    [rows] = await Promise.all ([db.all ("SELECT id, code, name, testament, chapters, heb, notes FROM books ORDER BY id"), initGrammar (db), initNotes (db)]);
  } catch (e) {
    status.textContent = String ((e as Error).message ?? e);
    return;
  }
  status.hidden = true;
  books = rows as unknown as Book[];
  initSearch (db, books, goVerse);
  initDictionary ((id, c, v) => { const b = books.find ((x) => x.id === id); if (b) goVerse (b, c, v); });     // (An article's scripture references)
  initAtlas ((id, c, v) => { const b = books.find ((x) => x.id === id); if (b) goVerse (b, c, v); });     // (A verse listed under the atlas' map)
  initTimeline (db, () => [book?.id ?? 0, chapter], (id, c, v) => { const b = books.find ((x) => x.id === id); if (b) goVerse (b, c, v); });     // (The Timeline: the chapter read, an item tapped)
  initChapterStudy (db, () => [book, chapter], shown);
  initVerseCards (db, books, () => book);     // (☰ Verse cards: the Hebrew Bible's and the NT's books to pick from; the book read, for a verse number tapped)     // (☰ Study printout: the chapter read, its first time; the books to pick from)
  onLanguage (switchLanguage);
  let last: string | null = null;
  try { last = localStorage.getItem (LAST); } catch { /* none */ }
  const [b, c] = parseRef (location.hash.slice (1)) ?? parseRef (last) ?? [shown ()[0], 1];
  go (b, c);
  document.getElementById ("prev")!.addEventListener ("click", () => step (-1));
  document.getElementById ("next")!.addEventListener ("click", () => step (1));
  onSwipe (document.querySelector ("main")!, step);     // (A swipe across the text turns the chapter, as ‹ and ›)
  placeBtn.addEventListener ("click", () => togglePicker (groups (), go, chaptersOf));     // (Tapped again: closed)
  window.addEventListener ("hashchange", () => { const r = parseRef (location.hash.slice (1)); if (r) go (...r); });
}

start ();

/** The service worker, and staying up to date: a Home Screen app has no reload, so a new version must arrive by itself.
    Each time the app opens or comes back to the front it asks for a new worker (registration.update); a new one takes
    over at once (sw.js: skipWaiting, clients.claim), and when it does the page reloads into the new version - once,
    keeping its place (the chapter is in the address: #Gen.1). The first worker ever taking over doesn't reload. */
function registerWorker() {
  if (! ("serviceWorker" in navigator)) return;
  const hadWorker = !! navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener ("controllerchange", () => {
    if (! hadWorker || reloading) return;
    reloading = true;
    location.reload();
  });
  navigator.serviceWorker.register ("sw.js").then ((reg) => {
    document.addEventListener ("visibilitychange", () => { if (document.visibilityState === "visible") reg.update().catch (() => {}); });
  }).catch (() => {});
}
