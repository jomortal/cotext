// COTEXT's start: opens the database, then shows a chapter - the one in the address (#Gen.1, #Jhn.1), else the last
// one read (kept in localStorage), else Genesis 1. The heading's ‹ and › step through chapters (across books), its
// middle button opens the picker; ☰ the study drawer (study.ts), ⋯ the helps' menu (helps.ts); ▶ reads aloud (audio.ts),
// the icon beside it opens the notes panel (notes.ts).

import { openDb, type Db } from "./db";
import { chapterWords, showChapter, type Book } from "./reader";
import { showPanel, hidePanel } from "./panel";
import { openPicker } from "./picker";
import { setBook, applyHelps } from "./helps";
import { setTestament } from "./study";
import { setAudioTestament } from "./audio";
import { initGrammar, setGrammarTestament } from "./grammar";
import { initChart, setChartPassage } from "./chart";
import "./cards";     // (Registers the Verb paradigms screen)
import { initGuide } from "./guide";
import { initVocab } from "./vocab";
import { initChoose } from "./choose";
import "./pronounce";     // (Registers the Pronunciation screen)
import { initNotes, setNotesPassage } from "./notes";

const status = document.getElementById ("status")!;
const chapterEl = document.getElementById ("chapter")!;
const placeBtn = document.getElementById ("place")!;
const LAST = "cotext.last";

let db: Db;
let books: Book[] = [];
let book: Book;
let chapter = 1;

// The heading's place: the book's name and chapter on one line, or - when that would wrap (a narrow screen, a long
// name) - its SBL abbreviation with a full stop: 1 Thessalonians 1 -> 1 Thess. 1. Checked again when the window resizes.
const ABBR: Record<string, string> = { Genesis: "Gen", Exodus: "Exod", Leviticus: "Lev", Numbers: "Num", Deuteronomy: "Deut",
  Joshua: "Josh", Judges: "Judg", "1 Samuel": "1 Sam", "2 Samuel": "2 Sam", "1 Kings": "1 Kgs", "2 Kings": "2 Kgs",
  "1 Chronicles": "1 Chr", "2 Chronicles": "2 Chr", Nehemiah: "Neh", Esther: "Esth", Psalms: "Ps", Proverbs: "Prov",
  Ecclesiastes: "Eccl", "Song of Songs": "Song", Isaiah: "Isa", Jeremiah: "Jer", Lamentations: "Lam", Ezekiel: "Ezek",
  Daniel: "Dan", Hosea: "Hos", Obadiah: "Obad", Micah: "Mic", Nahum: "Nah", Habakkuk: "Hab", Zephaniah: "Zeph",
  Haggai: "Hag", Zechariah: "Zech", Malachi: "Mal", Matthew: "Matt", Romans: "Rom", "1 Corinthians": "1 Cor",
  "2 Corinthians": "2 Cor", Galatians: "Gal", Ephesians: "Eph", Philippians: "Phil", Colossians: "Col",
  "1 Thessalonians": "1 Thess", "2 Thessalonians": "2 Thess", "1 Timothy": "1 Tim", "2 Timothy": "2 Tim",
  Philemon: "Phlm", Hebrews: "Heb", James: "Jas", "1 Peter": "1 Pet", "2 Peter": "2 Pet", Revelation: "Rev" };
function showPlace () {
  if (! book) return;
  placeBtn.textContent = `${book.name} ${chapter}`;
  const line = parseFloat (getComputedStyle (placeBtn).lineHeight) || 20;
  if (placeBtn.scrollHeight > line * 1.6 + 16 && ABBR[book.name]) placeBtn.textContent = `${ABBR[book.name]}. ${chapter}`;
}
window.addEventListener ("resize", showPlace);

function go (b: Book, c: number) {
  book = b;
  chapter = c;
  hidePanel ();
  showPlace ();
  document.title = `${b.name} ${c} - COTEXT`;
  setBook (db, b);
  setTestament (b.testament);
  setAudioTestament (b.testament);     // (Reading stops)
  setGrammarTestament (b.testament);
  const words = chapterWords (db, b.id, c);
  setChartPassage (words);     // (The Verb chart offers the chapter's verbs)
  showChapter (chapterEl, b, c, words, (w, el) => showPanel (db, w, el));
  applyHelps ();
  document.querySelector ("main")!.scrollTo (0, 0);     // (main scrolls, not the page: style.css)
  setNotesPassage (b, c);     // (After the scroll to the top: the notes panel shows the first verse)
  const ref = `${b.code}.${c}`;
  history.replaceState (null, "", "#" + ref);
  try { localStorage.setItem (LAST, ref); } catch { /* private mode: not kept */ }
}

/** "Gen.1" -> that book and chapter, if it exists. */
function parseRef (ref: string | null): [Book, number] | null {
  const m = ref?.match (/^(\w+)\.(\d+)$/);
  const b = m && books.find ((x) => x.code === m[1]);
  return b && +m![2] >= 1 && +m![2] <= b.chapters ? [b, +m![2]] : null;
}

/** The chapter before (-1) or after (+1), across books; nothing past Genesis 1 or Revelation 22. */
function step (dir: number) {
  if (chapter + dir >= 1 && chapter + dir <= book.chapters) return go (book, chapter + dir);
  const next = books[books.indexOf (book) + dir];
  if (next) go (next, dir > 0 ? 1 : next.chapters);
}

async function start () {
  registerWorker();
  try {
    db = await openDb ((f) => { status.textContent = `Loading the text… ${Math.round (f * 100)}%`; });
  } catch (e) {
    status.textContent = String ((e as Error).message ?? e);
    return;
  }
  status.hidden = true;
  initGrammar (db);
  initChart (db);
  initGuide (db);
  initVocab (db);
  initNotes (db);
  initChoose ();
  books = db.all ("SELECT id, code, name, testament, chapters FROM books ORDER BY id") as unknown as Book[];
  let last: string | null = null;
  try { last = localStorage.getItem (LAST); } catch { /* none */ }
  const [b, c] = parseRef (location.hash.slice (1)) ?? parseRef (last) ?? [books[0], 1];
  go (b, c);
  document.getElementById ("prev")!.addEventListener ("click", () => step (-1));
  document.getElementById ("next")!.addEventListener ("click", () => step (1));
  placeBtn.addEventListener ("click", () => openPicker (books, go));
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
