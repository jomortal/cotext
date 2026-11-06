// Verse cards (☰ > Verse cards): flashcards for learning verses, built as Flashcards' (cards.ts' showDeck - its bar's
// BACK / NEXT (arrows), SHUFFLE and START OVER, + in its middle; no Flip: a tap on the card turns it -; a card removed by its ✕ in the list, not a REMOVE CARD).
// - THE SCREEN (no title of its own, no ✕ - back to the Bible by ☰): the open deck's name centered in the top row (as
//   the Bible view's heading, staying as the screen scrolls; a drop-down arrow beside it - topbar.ts, the Study
//   printout's the same) and + at its right end, where the Bible view's ⋯ is, then
//   the deck and the credits. The name tapped shows the deck's options as part of the top bar - fixed, not scrolling
//   with the card, the bar growing as it opens and the card's room under it (the Bible view's ⋯ menu overlays; here the
//   card stays in view) -, tapped again closing them, in order: SELECT DECK, NAME (edited in place), the deck's settings (below), VERSE LIST; + shows
//   the add row the same way (below), the bold heading NEW VERSE at its start, + a ✕ while open. One open at a time.
// - DECKS: any number, each named ("Memory verses", "Greek NT") with its own cards and settings; first in the name's options
//   the one open (the last one used when the screen opens; "My verses" at first) -
//   SELECT DECK a drop-down of them, its first choice + NEW DECK, DELETE DECK beside it deleting the open one and its cards (asked first); the NAME edited in place.
// - ADDING: picked on the add row (NEW VERSE, +'s drop-down) - BOOK (the Hebrew Bible's books and the NT's; an OT card numbered as the Hebrew),
//   CHAPTER, ":", FROM VERSE (a verse), "-" and TO VERSE (blank: that verse alone, or one after it: a range within the
//   chapter) - then + ADD VERSE. The pick starts blank, and is blank again after each card is added (picked in any order -
//   before a book, CHAPTER and the verses offer up to the most in any book or chapter, moved to the book's or chapter's
//   last where it's shorter -, + ADD VERSE greyed out until BOOK, CHAPTER and FROM VERSE are; TO VERSE optional,
//   blank for the one verse). The deck's settings one line, wrapping where it doesn't fit: LANGUAGE, TRANSLATION,
//   Transliteration, Interlinear and Parsing.
// - FOR ALL THE DECK'S CARDS (its settings, each change showing at once on the card shown): TRANSLATION - None or one
//   of the notes' English translations (notes.ts' translationSources, each file read as the notes read it:
//   openSource); LANGUAGE - what each testament's cards show: ENGLISH ONLY (no Greek or Hebrew), OT HEBREW - NT GREEK
//   (at first), OT GREEK - NT GREEK (the OT's Greek the Septuagint verses translating the Hebrew reference:
//   chapterstudy.ts' translatedWords, as the printout's Greek LXX text), OT HEBREW - NT ENGLISH or
//   OT ENGLISH - NT GREEK (while a choice leaves some cards in English only, TRANSLATION offers no None - switched to
//   the first if None was picked); and, for the original, Interlinear, Parsing and Transliteration (drawn as the
//   reader draws it: chapterstudy.ts' textBox, but the parsing without the verb colors, and each verse number in the
//   text's own letters - "ιϛʹ", "טז" - with its number under it as a gloss when Interlinear is on; greyed out with ENGLISH ONLY). The translation where one is picked (and has the card's testament) -
//   for a card left in English only with none picked, the first translation that has it.
// - A CARD: its front the reference - and, where the card shows an original, the reference in its language
//   beside it (the Greek before the English; the Hebrew after it, first as read from the right) (the Hebrew or Greek book name, chapter and verses in letters, the Greek in capitals: "תְּהִלִּים כג:א",
//   "ΚΑΤΑ ΙΩΑΝΝΗΝ Γʹ:ΙϚʹ"; the Septuagint's own book and numbering, Psalms and Jeremiah's differing: "ΨΑΛΜΟΙ ΚΒʹ:Αʹ"); turned over, the back alone
//   - those references, the translation's verses (each numbered in a range; its name only in the credits below), the original. The card centered on the
//   screen, its buttons in a bar at the screen's foot, as the Bible view's play bar (its size, clear of the swipe-up
//   edge; its words larger than a pill's): BACK and NEXT as ‹ and › at its ends (as the chapters'; a swipe across the card does the same), SHUFFLE, + (NEW VERSE) in its middle and START OVER between them (cards.ts' showDeck). A tap on it turns it over
//   or back, except on a word of its original: a word of the original tapped opens its panel at the screen's foot, as the reader's
//   (panel.ts' showCardPanel - tapped again, or the card changed, it closes). Under VERSE LIST (in the name's options, while the deck has cards) the cards in the order added, laid out as the decks: each reference and ✕ removing it. The credits of what the cards show under it.
// - KEPT on the device (localStorage "cotext.versecards": the decks - each its cards and settings - and the one open).

import type { Db } from "./db";
import { chapterWords, type Book, type Word } from "./reader";
import { showCardPanel, hideCardPanel } from "./panel";
import { onScreen } from "./study";
import { showDeck, fitDeck, BAR_ICONS, type Card, type DeckShown } from "./cards";
import { translationSources, openSource, type Source } from "./notes";
import { textBox, translatedWords, TEXT_CREDIT, addStudyReference, draftResource, printoutChoices } from "./chapterstudy";
import { nativeRef, refPair } from "./refs";
import { nameMenu, dropDowns, watchTopBar } from "./topbar";
import { deckPaneSplit } from "./layout";

/** A card: its book (code), chapter and verses (from - to; 0 and 0: the whole chapter - cards kept from before). */
interface VerseCard { id: string; code: string; chapter: number; from: number; to: number; }
/** LANGUAGE: what each testament's cards show - "en" English only (no original), "he" OT Hebrew - NT Greek, "lxx" OT
 *  Greek (the LXX) - NT Greek, "heEn" OT Hebrew - NT English, "enGr" OT English - NT Greek. */
type Language = "en" | "he" | "lxx" | "heEn" | "enGr";
/** A card's original under LANGUAGE: "he" Hebrew, "lxx" the Greek LXX, "gr" the NT's Greek, "" none (English only). */
function originalOf (b: Book): "he" | "lxx" | "gr" | "" {
  const lang = deckNow ().settings.lang;
  if (b.testament === "NT") return lang === "en" || lang === "heEn" ? "" : "gr";
  return lang === "he" || lang === "heEn" ? "he" : lang === "lxx" ? "lxx" : "";
}
/** LANGUAGE leaves some cards English only: TRANSLATION offers no None. */
const someEnglish = () => ["en", "heEn", "enGr"].includes (deckNow ().settings.lang);
/** The deck's settings: the translation's source id ("" none), LANGUAGE, the original's lines. */
interface Settings { tr: string; lang: Language; gloss: boolean; parse: boolean; translit: boolean; }

/** A deck: its name, its cards in the order added, its settings. */
interface Deck { id: string; name: string; cards: VerseCard[]; settings: Settings; }

const KEY = "cotext.versecards";
const newId = () => Date.now ().toString (36) + Math.random ().toString (36).slice (2, 6);
const newDeck = (name: string): Deck => ({ id: newId (), name, cards: [], settings: { tr: "web", lang: "he", gloss: true, parse: false, translit: false } });
let decks: Deck[] = [];
let at = "";     // (The deck open: its id)
try {
  const kept = JSON.parse (localStorage.getItem (KEY) ?? "null");
  if (kept?.decks) { decks = kept.decks; at = kept.at ?? ""; }
  for (const d of decks) if (! ["en", "he", "lxx", "heEn", "enGr"].includes (d.settings.lang)) d.settings.lang = "he";     // (Decks kept from before LANGUAGE was the deck's)
} catch { /* none kept, or private mode */ }
if (! decks.length) decks = [newDeck ("My verses")];
/** The deck open (the first if the one kept is gone). */
const deckNow = () => decks.find ((d) => d.id === at) ?? decks[0];
const save = () => { try { localStorage.setItem (KEY, JSON.stringify ({ decks, at: deckNow ().id })); } catch { /* private mode: not kept */ } };

let db: Db;
let books: Book[] = [];
let reading: () => Book;     // (The Bible's book read: a verse number tapped there opens the add-verse box)
let allBooks: Book[] = [];     // (The Septuagint's too: a Greek LXX card's own book)
const cardWords = new Map<string, Word> ();     // (The cards' words by "book.chapter.verse.word" - word counting within its verse: a tapped word's panel)
/** main.ts: the database, every book (the Hebrew Bible's and the NT's are the ones picked) and the book read. */
export function initVerseCards (theDb: Db, all: Book[], book: () => Book) {
  db = theDb; allBooks = all; books = all.filter ((b) => b.testament !== "LXX"); reading = book;
}

const esc = (s: string) => s.replace (/[&<>"]/g, (c) => `&#${c.charCodeAt (0)};`);
const bookOf = (c: VerseCard) => books.find ((b) => b.code === c.code);

/** A card's reference: John 3:16, Romans 8:28–29, Psalms 23. */
function refText (c: VerseCard) {
  const b = bookOf (c);
  return `${b?.name ?? c.code} ${c.chapter}` + (c.from ? `:${c.from}` + (c.to > c.from ? `–${c.to}` : "") : "");
}

// ---- A card's back ----

const files = new Map<string, Promise<Db>> ();     // (Each translation's file, opened once)
function fileOf (s: Source) {
  let f = files.get (s.id);
  if (! f) { f = openSource (s, () => {}); files.set (s.id, f); f.catch (() => files.delete (s.id)); }
  return f;
}
/** The translation a card shows: the one picked, if it has the card's testament; else, for a card LANGUAGE leaves in
 *  English only, the first that has it (a card always shows something); else none. */
function translationOf (b: Book): Source | null {
  const all = translationSources (), has = (s: Source) => s.testaments.split (" ").includes (b.testament);
  const picked = all.find ((s) => s.id === deckNow ().settings.tr);
  if (picked && has (picked)) return picked;
  return originalOf (b) ? null : all.find (has) ?? null;
}

/** A card's back: the reference, the translation's verses (numbered in a range), the original(s). */
/** A card's two sides: the front its reference (and, with an original, the reference in its language under it); the
 *  back those, the translation's verses (numbered in a range), the original. */
async function sidesOf (c: VerseCard, used: Map<string, string>): Promise<{ front: string; back: string }> {
  const b = bookOf (c);
  const ref = (native = "") => `<div class="vcRefRow">${refPair (refText (c), native)}</div>`;     // (The English and, beside it, the original's)
  if (! b) return { front: ref (), back: ref () };
  const [lo, hi] = c.from ? [c.from, c.to] : [0, 999];
  let html = "";
  const tr = translationOf (b);
  if (tr) {
    used.set (tr.name, tr.credit);
    const ns = await (await fileOf (tr)).all (`SELECT start, body FROM notes WHERE book = ? AND start >= ? AND start <= ? ORDER BY start, ord`,
                                              [b.id, c.chapter * 1000 + lo, c.chapter * 1000 + hi]);
    const many = new Set (ns.map ((n) => n.start)).size > 1;
    html += `<div class="vcTr">` + (ns.length ? ns.map ((n) => many
      ? String (n.body).replace (/^(<p[^>]*>)?/, (p) => `${p || ""}<sup class="vcNum">${Number (n.start) % 1000}</sup> `) : String (n.body)).join ("")
      : "<p>Not in this translation.</p>") + "</div>";
  } else if (deckNow ().settings.tr) html += `<div class="vcTr"><p>Not in this translation.</p></div>`;
  const orig = originalOf (b);
  let native = "";
  if (orig) {
    const lxx = orig === "lxx";
    used.set ("text", TEXT_CREDIT);
    const ws = lxx ? await translatedWords (db, b, c.chapter, lo, hi)
                   : (await chapterWords (db, b.id, c.chapter)).filter ((w) => w.verse >= lo && w.verse <= hi);
    const box = textBox (lxx ? { ...b, testament: "LXX" } : b, ws[0]?.chapter ?? c.chapter, ws, deckNow ().settings);
    if (! ws.length) box.innerHTML = "<p>No Septuagint verses for this reference.</p>";
    // (Each word keyed to its Word, for its panel when tapped - the card's HTML drawn as text, so kept here)
    box.querySelectorAll<HTMLElement> (".w").forEach ((el, i) => {
      const w = ws[i]; if (! w) return;
      const k = `${w.book}.${w.chapter}.${w.verse}.${w.word}`; cardWords.set (k, w); el.dataset.wk = k;
    });
    html += `<div class="vcOrig">${box.outerHTML}</div>`;
    // (The Septuagint's reference its own: its book and numbering - Psalms and Jeremiah's differ)
    const lb = lxx && ws.length ? allBooks.find ((x) => x.id === ws[0].book) : undefined, z = ws[ws.length - 1];
    native = lxx ? (lb ? nativeRef (lb.code, "gr", ws[0].chapter, c.from ? ws[0].verse : 0, z.chapter, z.verse) : "")
                 : nativeRef (b.code, orig, c.chapter, c.from, c.chapter, c.to);
  }
  return { front: ref (native), back: ref (native) + html };
}

// ---- The screen ----

/** The word's panel's height, until its divider is dragged (wide, its two columns): just the word's info - the
 *  lexicon scrolling in its column beside it - set as --cardFit (style.css). */
function fitPanel () {
  const sheet = document.getElementById ("cardSheet")!, info = sheet.querySelector<HTMLElement> (".infoBox");
  if (sheet.hidden || ! info || ! sheet.classList.contains ("twoCol")) return;
  // (The info stretched to the panel's height: its own height measured from its contents - its last shown child's foot
  // - and its padding; plus what's around the scroller)
  const scroll = sheet.querySelector<HTMLElement> (".panelScroll")!, top = info.getBoundingClientRect ().top;
  const foot = Math.max (...[...info.children].map ((c) => (c as HTMLElement).offsetParent ? c.getBoundingClientRect ().bottom : top));
  const need = foot - top + info.scrollTop + parseFloat (getComputedStyle (info).paddingBottom) + sheet.offsetHeight - scroll.clientHeight;
  document.documentElement.style.setProperty ("--cardFit", Math.ceil (need) + "px");
}

const LANGUAGES: [Language, string][] = [["en", "English Only"], ["he", "OT Hebrew - NT Greek"], ["lxx", "OT Greek - NT Greek"],
                                         ["heEn", "OT Hebrew - NT English"], ["enGr", "OT English - NT Greek"]];
let goTo = "";     // (A card just added - here or from the Bible's verse numbers -: shown first when its deck is next drawn)
let menuOpen: "" | "more" = "";     // (The top row's drop-down open: the name's options, or none)
let addOpen = false;     // (The VERSE LIST panel open - kept so between drawings)
/** The add row's reference: book (null: none picked), chapter (0: none picked), verses (from -1: none picked; to 0: blank,
 *  the from verse alone) - blank at first and again after each card is added. */
let pickAt: { book: Book | null; chapter: number; from: number; to: number } = { book: null, chapter: 0, from: -1, to: 0 };

/** The most chapters in any book and the most verses in any chapter (Psalm 119's 176 - a fact of the text, not read: a
 *  scan of every word for it took most of a second): CHAPTER's and the verses' choices before a book (or chapter) is picked. */
const mostVerses = 176;
const mostChapters = () => Math.max (...books.map ((x) => x.chapters));

/** The add row's BOOK, CHAPTER, FROM VERSE and TO VERSE, redrawn as one changes, picked in any order: before a book,
 *  CHAPTER offers up to the most chapters in any book, and before a book and chapter the verses up to the most verses in
 *  any chapter; a book (or chapter) picked that doesn't go that far moves the chapter (or verses) to its last. A blank
 *  shows a dash, BOOK's "Select Book"; TO VERSE waits for FROM VERSE, + ADD VERSE for BOOK, CHAPTER and FROM VERSE. */
async function drawPick (el: HTMLElement, addBtn: HTMLButtonElement, p = pickAt, list = books) {     // (p: the screen's add row's, or the Bible's add-verse box's; list: the books offered - the cards', or every book for a resource)
  const b = p.book;
  if (b && p.chapter > b.chapters) p.chapter = b.chapters;     // (The book shorter: its last chapter)
  const r = b && p.chapter ? await db.all ("SELECT DISTINCT verse FROM words WHERE book = ? AND chapter = ? ORDER BY verse", [b.id, p.chapter]) : [];
  const chosen = !! (b && p.chapter);
  const vs = chosen ? r.map ((x) => Number (x.verse)).filter ((v) => v > 0) : Array.from ({ length: mostVerses }, (_, i) => i + 1);
  const last = vs[vs.length - 1] ?? 0;
  if (p.from > last) p.from = last;     // (The chapter shorter: its last verse)
  if (p.to > last) p.to = last;
  if (p.to <= p.from) p.to = 0;
  const BLANK: [string, string] = ["", "–"];     // (Blank: a dash - BOOK's says "Select Book")
  const pick = (label: string, options: [number | string, string][], value: number | string, set: (v: string) => void, off = false) => {
    const l = document.createElement ("label"); l.className = "vcPick";
    l.append (Object.assign (document.createElement ("span"), { className: "vcPickName", textContent: label }));     // (Its name: no wider than the box - running on over the gap)
    const s = document.createElement ("select"); s.className = "choose"; s.disabled = off; s.setAttribute ("aria-label", label);
    s.append (...options.map (([v, t]) => new Option (t, String (v))));
    s.value = String (value);
    s.addEventListener ("change", () => { set (s.value); drawPick (el, addBtn, p, list); });
    l.append (s);
    return l;
  };
  const sep = (t: string) => Object.assign (document.createElement ("span"), { className: "vcSep", textContent: t });     // (As a reference reads: 3:16-18)
  // FROM VERSE, "-" and TO VERSE under one name, VERSES (each box named only for a screen reader)
  const verses = (...items: HTMLElement[]) => {
    const g = document.createElement ("div"); g.className = "vcPick vcVerses";
    const row = document.createElement ("div"); row.className = "vcVerseRow"; row.append (...items);
    g.append (Object.assign (document.createElement ("span"), { className: "vcPickName", textContent: "Verses" }), row);
    return g;
  };
  el.replaceChildren (
    Object.assign (pick ("Book", [...(b ? [] : [["", "Select Book"] as [string, string]]), ...list.map ((x): [string, string] => [x.code, x.name])], b?.code ?? "",
          (v) => { p.book = list.find ((x) => x.code === v) ?? null; }), { className: "vcPick vcBook" }),
    pick ("Chapter", [...(p.chapter ? [] : [BLANK]), ...Array.from ({ length: b?.chapters ?? mostChapters () }, (_, i): [number, string] => [i + 1, String (i + 1)])],
          p.chapter || "", (v) => { p.chapter = +v; }),
    sep (":"),
    verses (
      pick ("From verse", [...(p.from > 0 ? [] : [BLANK]), ...vs.map ((v): [number, string] => [v, String (v)])],
            p.from > 0 ? p.from : "", (v) => { p.from = +v; }),
      sep ("-"),
      pick ("To verse", p.from > 0 ? [[0, "–"], ...vs.filter ((v) => v > p.from).map ((v): [number, string] => [v, String (v)])] : [BLANK],
            p.from > 0 ? p.to : "", (v) => { p.to = +v; }, p.from <= 0)));
  addBtn.disabled = ! chosen || p.from <= 0;
}

async function draw (body: HTMLElement) {
  const trs = translationSources (), d = deckNow (), settings = d.settings;
  body.innerHTML = `<div class="topBar"><div class="topRow"><span id="vcTitle"></span></div>
    <div class="vcMenu" data-menu="more">
    <div class="vcAdd">
      <label class="vcPick">Language<select class="choose" id="vcLang">${LANGUAGES.map (([k, t]) => `<option value="${k}"${k === settings.lang ? " selected" : ""}>${t}</option>`).join ("")}</select></label>
      <label class="vcPick">Translation<select class="choose" id="vcTr"><option value="">None</option>${trs.map ((s) => `<option value="${s.id}">${esc (s.name)}</option>`).join ("")}</select></label>
      <button class="pill" data-o="translit">Transliteration</button><button class="pill" data-o="gloss">Interlinear</button><button class="pill" data-o="parse">Parsing</button>
</div>
    </div>
    </div>
    <div class="deck vcDeck"></div>
    <div class="src vcCredits"></div>
    <div class="deckPane" hidden><div class="top csEditHead"><h2 class="gTitle">Verse list</h2><button class="pill icon" id="vcAddClose" aria-label="Close">✕</button></div>
    <div class="vcAdd"><div id="vcPlace"></div><button class="pill addVerse" id="vcAddBtn">+ Add Verse</button></div>
    <div class="vcHead" id="vcListHead">Verses</div>
    <div class="bar vcList"></div></div>`;
  // The deck's name (the title, tapped): its options - the decks, the name, the settings - a drop-down under the top
  // row as the Bible view's ⋯ menu (the title tapped again closing it), the top row growing with it - the card's room
  // under it (kept so between drawings). The list icon in the bar's middle: the VERSE LIST panel - adding a card at its
  // top, the cards under it. The name, its arrow and the first rows of its drop-down - SELECT DECK, DELETE
  // DECK, NAME - are topbar.ts' (the Study printout's the same)
  const named = nameMenu<Deck> ({
    noun: "Deck", all: () => decks, open: deckNow, shown: (x) => x.name || "Untitled", blank: "Untitled",
    select: (id) => { at = id; save (); draw (body); },
    make: () => { const x = newDeck (`Deck ${decks.length + 1}`); decks.push (x); at = x.id; save (); draw (body); },
    ask: (x) => `Delete the deck "${x.name}"${x.cards.length ? ` and its ${x.cards.length} card${x.cards.length > 1 ? "s" : ""}` : ""}?`,
    remove: (x) => { decks = decks.filter ((y) => y !== x); if (! decks.length) decks = [newDeck ("My verses")]; at = decks[0].id; save (); draw (body); },
    renamed: () => save () });
  body.querySelector ("#vcTitle")!.replaceWith (named.title);
  const moreMenu = body.querySelector<HTMLElement> ('.vcMenu[data-menu="more"]')!;
  moreMenu.prepend (...named.rows);
  const plus = document.createElement ("button");     // (The list icon: the bar's middle, with cards or without - deck)
  Object.assign (plus, { className: "pill icon vcMid", id: "vcPlus", innerHTML: BAR_ICONS.list }); plus.setAttribute ("aria-label", "Verse list");
  dropDowns ([{ key: "more", button: named.button, menu: moreMenu, icon: "" }], menuOpen, (k) => { menuOpen = k as typeof menuOpen; });
  // The list icon: VERSE LIST in a panel of its own - at the foot over the bar upright, at the right beside the bar
  // sideways (as the Bible's panels) -, NEW VERSE at its top (Book, Chapter, Verses, + ADD VERSE), the cards under it
  // (each its ✕); the card's room giving way to it (--deckPaneH, style.css); the icon pressed while it's open, its ✕ closing it
  const sheet = body.querySelector<HTMLElement> (".deckPane")!;
  const openAdd = (on: boolean) => { addOpen = on; sheet.hidden = ! on; plus.setAttribute ("aria-pressed", String (on)); };
  plus.addEventListener ("click", () => openAdd (! addOpen));
  body.querySelector ("#vcAddClose")!.addEventListener ("click", () => openAdd (false));
  new ResizeObserver (() => document.getElementById ("screen")!.style.setProperty ("--deckPaneH", `${sheet.offsetHeight}px`)).observe (sheet);
  deckPaneSplit (sheet);     // (Its divider: dragged, its size - layout.ts)
  openAdd (addOpen);
  const trPick = body.querySelector<HTMLSelectElement> ("#vcTr")!, placeEl = body.querySelector<HTMLElement> ("#vcPlace")!;
  const deckEl = body.querySelector<HTMLElement> (".vcDeck")!;
  // A word tapped on a card: its panel at the screen's foot, as the reader's (tapped again, it closes); the card
  // changed (BACK, NEXT...) closes it.
  hideCardPanel ();
  deckEl.addEventListener ("click", (e) => {
    const t = e.target as HTMLElement, wordEl = t.closest<HTMLElement> (".w[data-wk]");
    const w = wordEl && cardWords.get (wordEl.dataset.wk!);
    if (w && wordEl) showCardPanel (db, w, wordEl).then (fitPanel);
    else if (t.closest ("[data-k], .card")) hideCardPanel ();     // (The card turned or changed: its word's panel closed)
  });
  const listHead = body.querySelector<HTMLElement> ("#vcListHead")!;
  const listEl = body.querySelector<HTMLElement> (".vcList")!, credits = body.querySelector<HTMLElement> (".vcCredits")!;
  const langPick = body.querySelector<HTMLSelectElement> ("#vcLang")!;
  // Decks: SELECT DECK opens the one picked - its first choice, + NEW DECK, makes and opens one -, DELETE DECK beside
  // it deletes the open one (asked first); its name edited in place.
  trPick.value = trs.some ((s) => s.id === settings.tr) ? settings.tr : "";
  // The deck, drawn afresh from the cards and settings as they are (a later drawing winning over one still arriving);
  // kept: a setting changed - the cards' backs redrawn in place, the card shown and whether it's turned over kept, so
  // the change shows on it.
  let drawing = 0, shown: DeckShown<Card & { id: string }> | null = null, shownIds = "";
  const deck = async (kept = false) => {
    const n = ++drawing;
    for (const b of body.querySelectorAll<HTMLButtonElement> ("[data-o]")) {     // (English Only: no original - its lines greyed out)
      b.setAttribute ("aria-pressed", String (settings[b.dataset.o as "gloss"])); b.disabled = settings.lang === "en";
    }
    listEl.innerHTML = d.cards.map ((c) => `<span class="vcDeckName vcRow" data-id="${c.id}"><span>${esc (refText (c))}</span><button class="pill icon" aria-label="Remove">✕</button></span>`).join ("");
    listHead.hidden = listEl.hidden = ! d.cards.length;     // (VERSE LIST only with cards)
    if (! d.cards.length) {     // (No cards: the bar with + alone)
      deckEl.innerHTML = "<p>Open the verse list to add a verse.</p>"; credits.textContent = ""; shown = null;
      const bar = document.createElement ("div"); bar.className = "vcBar"; bar.append (plus); deckEl.append (bar);
      return;
    }
    const used = new Map<string, string> ();
    const made: (Card & { id: string })[] = [];
    for (const c of d.cards) made.push ({ id: c.id, ...await sidesOf (c, used) });
    if (n !== drawing) return;
    const ids = d.cards.map ((c) => c.id).join ();
    if (kept && shown && ids === shownIds) shown.update (made, (a, b) => a.id === b.id);
    else {
      // (Its bar at the screen's foot, as the Bible view's play bar - cards.ts': ‹ and › at its ends, SHUFFLE and START
      // OVER, + (NEW VERSE) in its middle; a tap on the card turns it)
      shown = showDeck (deckEl, made, { middle: plus, backOnly: true, noTurn: ".w" }); shownIds = ids;
      if (goTo) { shown.go ((c) => c.id === goTo); goTo = ""; }
    }     // (No REMOVE CARD - the list's ✕ removes one. Turned over: the back alone, the reference on it)
    credits.textContent = [...used.values ()].filter (Boolean).join (" ");
  };
  const addBtn = body.querySelector<HTMLButtonElement> ("#vcAddBtn")!;
  drawPick (placeEl, addBtn);
  stackWhenWrapped (placeEl);
  addBtn.addEventListener ("click", () => {
    const p = pickAt;
    if (! p.book || ! p.chapter || p.from <= 0) return;
    const id = newId ();
    d.cards.push ({ id, code: p.book.code, chapter: p.chapter, from: p.from, to: Math.max (p.to, p.from) });
    pickAt = { book: null, chapter: 0, from: -1, to: 0 };     // (Blank for the next card)
    drawPick (placeEl, addBtn);
    goTo = id; save (); deck ();
  });
  // A LANGUAGE leaving some cards English only (no original): TRANSLATION offering no None (those cards show a
  // translation: the first, if None was picked)
  const noNone = () => {
    const en = someEnglish ();
    trPick.querySelector<HTMLOptionElement> ('option[value=""]')!.hidden = en;
    if (en && ! trPick.value && trs.length) { trPick.value = settings.tr = trs[0].id; save (); deck (true); }
  };
  langPick.addEventListener ("change", () => { settings.lang = langPick.value as Language; save (); noNone (); deck (true); });
  noNone ();
  trPick.addEventListener ("change", () => { settings.tr = trPick.value; save (); deck (true); });
  for (const b of body.querySelectorAll<HTMLElement> ("[data-o]"))
    b.addEventListener ("click", () => { const k = b.dataset.o as "gloss" | "parse" | "translit"; settings[k] = ! settings[k]; save (); deck (true); });
  listEl.addEventListener ("click", (e) => {
    const x = (e.target as HTMLElement).closest ("button.icon"), row = x?.closest<HTMLElement> (".vcRow");
    if (row) { d.cards = d.cards.filter ((c) => c.id !== row.dataset.id); save (); deck (); }
  });
  // The top row and a drop-down open under it act as one bar, growing as it opens: fixed, not scrolling with the card,
  // the screen's room starting under it (--topH: its height, the screen's padding - topbar.ts' watchTopBar, style.css)
  watchTopBar (body.querySelector<HTMLElement> (".topBar")!);
  // The card centered on the screen, the credits at its foot, all on one screen without scrolling where they fit (cards.ts' fitDeck)
  fitDeck (deckEl, credits);
  deck ();
}

/** An add row (the Verse cards' NEW VERSE row, the Bible's ADD TO VERSE CARDS) on one line where it all fits; where
 *  not, stacked: its first item (NEW VERSE, or DECK) on its own line, the pickers, then + ADD VERSE on its own line
 *  (.vcStacked) - checked laid out unstacked, on every resize and every redraw of the pickers (place: the row's
 *  drawPick element, its items the row's). */
function stackWhenWrapped (place: HTMLElement) {
  const row = place.parentElement!;
  const fit = () => {
    row.classList.remove ("vcStacked");
    const ends = [row.firstElementChild!, ...place.children, row.querySelector (":scope > .addVerse")!].map ((x) => x.getBoundingClientRect ().bottom);
    row.classList.toggle ("vcStacked", ends.some ((t) => Math.abs (t - ends[0]) > 2));
  };
  new ResizeObserver (fit).observe (row);
  new MutationObserver (fit).observe (place, { childList: true });
}

//==== ADD VERSE (the Bible's) ====
// A verse's margin tapped in the Bible (its number and the + under it, the verse's height): a box from the bottom, the word's panel's width (#verseSheet, under it in the
// text's column - index.html), headed by a drop-down - ADD TO VERSE CARDS or ADD TO STUDY PRINTOUT (the last picked; the
// printout: a new section with the verse, chapterstudy.ts' addStudyReference, no DECK) -, as the Verse cards' add row - DECK (the deck it's added to: the one open at first),
// BOOK, CHAPTER and FROM VERSE filled in with that verse, TO VERSE blank (optional), + ADD VERSE (adding it there, and
// closing the box); its ✕ closes it. A Septuagint book's verse (not a book the cards take): the book left blank.
const verseSheet = document.getElementById ("verseSheet")!;
// (Closed - by its ✕ or once added: the resources pane back where the box came from it - one-pane shows one at a time)
let fromNotes = false;
const closeBox = () => { verseSheet.hidden = true; if (fromNotes && document.getElementById ("notes")!.hidden) document.getElementById ("notesBtn")!.click (); fromNotes = false; };
verseSheet.querySelector (".close")!.addEventListener ("click", closeBox);
document.getElementById ("chapter")!.addEventListener ("click", (e) => {
  const num = (e.target as HTMLElement).closest<HTMLElement> (".vnum"), row = num?.closest<HTMLElement> (".vrow");
  if (! num || ! row) return;
  const book = books.find ((b) => b.code === reading ().code) ?? null;
  addVerse ({ book, chapter: book ? Number (row.dataset.chapter) : 0, from: book ? Number (row.dataset.verse) : -1, to: 0 });
});
// The resources pane's + (beside its picker): the box for the resource shown (addVerse's src), the verse at the top of
// the text filled in - one verse, to be widened -, + ADD putting it in the printout's section for
// that passage, made if there's none (chapterstudy.ts' draftResource)
const notesPick = document.getElementById ("notesPick") as HTMLSelectElement;
document.getElementById ("notesAdd")!.addEventListener ("click", () => {
  const book = allBooks.find ((b) => b.code === reading ().code) ?? null, rows = [...document.querySelectorAll<HTMLElement> ("#chapter .vrow")];     // (Any book read - the Septuagint's too)
  const top = document.querySelector ("main")!.getBoundingClientRect ().top, at = rows.find ((r) => r.getBoundingClientRect ().bottom > top + 1) ?? rows[0];     // (The verse at the top of the text)
  if (! notesPick.value || ! rows.length) return;
  addVerse ({ book, chapter: book ? Number (at.dataset.chapter) : 0, from: book ? Number (at.dataset.verse) : -1, to: 0 },
            notesPick.value, Number (rows[rows.length - 1].dataset.verse));
});
let addTo = "cards";     // (Where the box adds: "cards" or "study" - the last picked, while the app runs)
/** PRINTOUT: a picker of the Study printouts, the open one (the last used) picked at first - where the box adds to the
 *  Study printout (as DECK for the Verse cards). */
function printoutPick (): HTMLLabelElement {
  const { list, open } = printoutChoices ();
  const l = document.createElement ("label"); l.className = "vcPick"; l.textContent = "Printout";
  const sel = document.createElement ("select"); sel.className = "choose";
  sel.append (...list.map ((x) => new Option (x.name, x.id, false, x.id === open)));
  l.append (sel);
  return l;
}
/** The box: for a verse (from a verse's margin), or for a resource (src: its id - from the resources pane's +: headed
 *  ADD TO STUDY PRINTOUT, the verses picked, then the resource's line as the Study printout draws it, its Options under it -
 *  chapterstudy.ts' draftResource -, then + ADD; last: the chapter filled in's last verse - all its
 *  verses picked, the whole chapter's, 0 - 0). */
function addVerse (p: { book: Book | null; chapter: number; from: number; to: number }, src?: string, last = 0) {
  const body = verseSheet.querySelector<HTMLElement> (".verseBody")!;
  fromNotes = !! src;
  if (src) {
    body.innerHTML = `<h2 class="avHead">Add to Study Printout</h2><div class="vcAdd avTarget"><div class="avPlace"></div></div><div class="avItem"></div>
      <button class="pill addVerse" id="avAdd">+ Add</button>`;
    const place = body.querySelector<HTMLElement> (".avPlace")!, add = body.querySelector<HTMLButtonElement> ("#avAdd")!, itemEl = body.querySelector<HTMLElement> (".avItem")!;
    drawPick (place, add, p, allBooks);     // (Every book, the Septuagint's too; alone on its row: nothing to stack - stackWhenWrapped)
    // (The resource's line for the passage picked: made again for another book or chapter, its verses changed in place)
    let made = "", draft: ReturnType<typeof draftResource> = null;
    const first = { ...p };
    const follow = () => {
      if (! p.book || ! p.chapter) { itemEl.replaceChildren (); draft = null; made = ""; return; }
      const whole = p.book === first.book && p.chapter === first.chapter && p.from === 1 && Math.max (p.to, p.from) === last;
      const key = `${p.book.code} ${p.chapter}`, f = whole ? 0 : Math.max (p.from, 0), t = whole ? 0 : Math.max (p.to, p.from, 0);
      if (key !== made) {
        made = key; draft = draftResource (p.book.code, p.chapter, f, t, src);
        itemEl.replaceChildren (draft ? draft.line : Object.assign (document.createElement ("p"), { className: "src", textContent: "The Study printout doesn't offer this resource for this book." }));
        add.disabled = ! draft;
      }
      else draft?.range (f, t);
    };
    follow ();
    place.addEventListener ("change", () => setTimeout (follow));     // (After drawPick has taken the pick in)
    const into = printoutPick ();     // (Which printout: over the verses)
    body.querySelector (".avTarget")!.prepend (into);
    add.addEventListener ("click", () => { if (draft && p.from > 0 && draft.add (into.querySelector ("select")!.value)) closeBox (); });
    verseSheet.hidden = false;
    return;
  }
  body.innerHTML = `<h2 class="avHead"><select class="choose" id="avTo" aria-label="Add to"><option value="cards">Add to Verse Cards</option>
    <option value="study">Add to Study Printout</option></select></h2><div class="vcAdd"><label class="vcPick" id="avDeckRow">Deck<select class="choose" id="avDeck">${decks.map ((x) =>
      `<option value="${x.id}"${x === deckNow () ? " selected" : ""}>${esc (x.name)}</option>`).join ("")}</select></label>
    <div class="avPlace"></div><button class="pill addVerse" id="avAdd">+ Add Verse</button></div>`;
  const place = body.querySelector<HTMLElement> (".avPlace")!, add = body.querySelector<HTMLButtonElement> ("#avAdd")!;
  drawPick (place, add, p); stackWhenWrapped (place);
  const to = body.querySelector<HTMLSelectElement> ("#avTo")!, deckRow = body.querySelector<HTMLElement> ("#avDeckRow")!, into = printoutPick ();
  deckRow.after (into);
  const pickTo = () => { addTo = to.value; deckRow.hidden = addTo !== "cards"; into.hidden = addTo !== "study"; };     // (DECK for the Verse cards, PRINTOUT for the Study printout)
  to.value = addTo; pickTo ();
  to.addEventListener ("change", pickTo);
  add.addEventListener ("click", () => {
    if (! p.book || ! p.chapter || p.from <= 0) return;
    if (addTo === "study") { addStudyReference (p.book.code, p.chapter, p.from, p.to, into.querySelector ("select")!.value); closeBox (); return; }     // (A new section of the Study printout)
    const d = decks.find ((x) => x.id === body.querySelector<HTMLSelectElement> ("#avDeck")!.value);
    if (! d) return;
    goTo = newId ();
    d.cards.push ({ id: goTo, code: p.book.code, chapter: p.chapter, from: p.from, to: Math.max (p.to, p.from) });
    save (); closeBox ();
  });
  verseSheet.hidden = false;
}

onScreen ("Verse cards", draw);
