// Verse cards (☰ > Verse cards): flashcards for learning verses, built like My vocab's (cards.ts' showDeck - its
// flip, BACK / NEXT (arrows), FLIP, SHUFFLE and START OVER; a card removed by its ✕ in the list, not a REMOVE CARD).
// - THE SCREEN (no title of its own, no ✕ - back to the Bible by ☰): the open deck's name centered in the top row (as
//   the Bible view's heading, staying as the screen scrolls) and ⋯ at its right end, where the Bible view's is, then the deck and the credits. ⋯ shows
//   everything else over the room above the card - pushing the deck down only as far as it would cover it (the Bible
//   view's ⋯ menu overlays; here the card stays in view) -, ⋯ a ✕ while open, closing it, in order: DECKS, NAME (edited in place), the deck's
//   settings (below), VERSE LIST and, last, the add row (below), the bold heading NEW VERSE at its start.
// - DECKS: any number, each named ("Memory verses", "Greek NT") with its own cards and settings; under DECKS (first in
//   ⋯'s options) a row of buttons, as My vocab's lists, the one open lit (the last one used when the screen opens; "My verses" at first),
//   each with a ✕ to its right deleting it and its cards (asked first), then + NEW DECK; the NAME edited in place.
// - ADDING: picked on the add row (NEW VERSE, last in ⋯'s options) - BOOK (the Hebrew Bible's books and the NT's; an OT card numbered as the Hebrew),
//   CHAPTER, ":", FROM VERSE (a verse), "-" and TO VERSE (blank: that verse alone, or one after it: a range within the
//   chapter) - then + ADD VERSE. The pick starts blank, and is blank again after each card is added (each picker blank until
//   the one before it is picked, + ADD VERSE greyed out until FROM VERSE is; TO VERSE optional,
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
//   edge; its words larger than a pill's): SHUFFLE, FLIP (turning it either way), START OVER; BACK and NEXT arrows either side of the card. A tap on it turns it over
//   or back, except on a word of its original: a word of the original tapped opens its panel at the screen's foot, as the reader's
//   (panel.ts' showCardPanel - tapped again, or the card changed, it closes). Under VERSE LIST (in ⋯'s options, while the deck has cards) the cards in the order added, laid out as the decks: each reference and ✕ removing it. The credits of what the cards show under it.
// - KEPT on the device (localStorage "cotext.versecards": the decks - each its cards and settings - and the one open).

import type { Db } from "./db";
import { chapterWords, type Book, type Word } from "./reader";
import { showCardPanel, hideCardPanel } from "./panel";
import { onScreen } from "./study";
import { showDeck, type Card, type DeckShown } from "./cards";
import { translationSources, openSource, type Source } from "./notes";
import { textBox, translatedWords, TEXT_CREDIT } from "./chapterstudy";
import { nativeName } from "./booknames";

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
// (Numbers in letters: Hebrew - 15 and 16 טו, טז, not the Name's letters; Greek - with a keraia, 6 ϛ, 90 ϟ)
function hebrewNumber (n: number) {
  const H = ["", "ק", "ר", "ש", "ת"], T = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"], O = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  const h = Math.floor (n / 100), rest = n % 100;
  return (H[h] ?? "") + (rest === 15 ? "טו" : rest === 16 ? "טז" : T[Math.floor (rest / 10)] + O[rest % 10]);
}
function greekNumber (n: number) {
  const H = ["", "ρ", "σ", "τ", "υ", "φ", "χ", "ψ", "ω", "ϡ"], T = ["", "ι", "κ", "λ", "μ", "ν", "ξ", "ο", "π", "ϟ"], O = ["", "α", "β", "γ", "δ", "ε", "ϛ", "ζ", "η", "θ"];
  return H[Math.floor (n / 100) % 10] + T[Math.floor (n / 10) % 10] + O[n % 10] + "ʹ";
}
/** A reference in the original's own language, beside the English: the book's Hebrew or Greek name (booknames.ts) and
 *  its chapter and verses in letters - "תְּהִלִּים כג:א", "ΚΑΤΑ ΙΩΑΝΝΗΝ Γʹ:ΙϚʹ" (the Septuagint's own book and
 *  numbering: "ΨΑΛΜΟΙ ΚΒʹ:Αʹ"). */
function nativeRef (code: string, lang: "he" | "gr", c1: number, v1: number, c2: number, v2: number) {
  const name = nativeName (code)?.[0];
  if (! name) return "";
  const num = lang === "he" ? hebrewNumber : greekNumber;
  const span = ! v1 ? num (c1) : `${num (c1)}:${num (v1)}` + (c2 !== c1 ? `–${num (c2)}:${num (v2)}` : v2 > v1 ? `–${num (v2)}` : "");
  // (Greek in capitals, as inscriptions and the oldest manuscripts: no accents or breathings - ΚΑΤΑ ΙΩΑΝΝΗΝ Γʹ:ΙϚʹ)
  const text = lang === "he" ? `${name} ${span}` : `${name} ${span}`.normalize ("NFD").replace (/[\u0300-\u036f]/g, "").toUpperCase ();
  return `<span class="vcNative ${lang}" dir="${lang === "he" ? "rtl" : "ltr"}" lang="${lang === "he" ? "he" : "grc"}">${esc (text)}</span>`;
}

/** A card's two sides: the front its reference (and, with an original, the reference in its language under it); the
 *  back those, the translation's verses (numbered in a range), the original. */
async function sidesOf (c: VerseCard, used: Map<string, string>): Promise<{ front: string; back: string }> {
  const b = bookOf (c);
  const ref = (native = "") => `<div class="vcRef"><span>${esc (refText (c))}</span>${native}</div>`;     // (The English and, beside it, the original's)
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
    // (Each verse number in the text's own letters, as a word - its number under it with INTERLINEAR, as a gloss)
    // (Each word keyed to its Word, for its panel when tapped - the card's HTML drawn as text, so kept here)
    box.querySelectorAll<HTMLElement> (".w").forEach ((el, i) => {
      const w = ws[i]; if (! w) return;
      const k = `${w.book}.${w.chapter}.${w.verse}.${w.word}`; cardWords.set (k, w); el.dataset.wk = k;
    });
    for (const v of box.querySelectorAll<HTMLElement> (".vnum")) {
      const n = Number (v.textContent), he = !! v.closest (".vrow.he");
      v.classList.add ("vcVnum");
      v.innerHTML = `<div class="orig"><span class="vcVnumN">${he ? hebrewNumber (n) : greekNumber (n)}</span></div><div class="gloss">${n}</div>`;     // (The number smaller, in a line as tall as the words')
    }
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
let menuOpen = false;     // (⋯'s options: hidden till ⋯)
/** The add row's reference: book (null: none picked), chapter (0: none picked), verses (from -1: none picked; to 0: blank,
 *  the from verse alone) - blank at first and again after each card is added. */
let pickAt: { book: Book | null; chapter: number; from: number; to: number } = { book: null, chapter: 0, from: -1, to: 0 };

/** The add row's BOOK, CHAPTER, FROM VERSE and TO VERSE, redrawn as one changes (each blank until the one before it is
 *  picked - a blank shows a dash, BOOK's "Select Book"; + ADD VERSE greyed out until FROM VERSE is). */
async function drawPick (el: HTMLElement, addBtn: HTMLButtonElement, p = pickAt) {     // (p: the screen's add row's, or the Bible's add-verse box's)
  const b = p.book;
  const r = b && p.chapter ? await db.all ("SELECT DISTINCT verse FROM words WHERE book = ? AND chapter = ? ORDER BY verse", [b.id, p.chapter]) : [];
  const vs = r.map ((x) => Number (x.verse)).filter ((v) => v > 0);
  const BLANK: [string, string] = ["", "–"];     // (Blank: a dash - BOOK's says "Select Book")
  const pick = (label: string, options: [number | string, string][], value: number | string, set: (v: string) => void, off = false) => {
    const l = document.createElement ("label"); l.className = "vcPick"; l.textContent = label;
    const s = document.createElement ("select"); s.className = "choose"; s.disabled = off;
    s.append (...options.map (([v, t]) => new Option (t, String (v))));
    s.value = String (value);
    s.addEventListener ("change", () => { set (s.value); drawPick (el, addBtn, p); });
    l.append (s);
    return l;
  };
  const chosen = !! (b && p.chapter);
  const sep = (t: string) => Object.assign (document.createElement ("span"), { className: "vcSep", textContent: t });     // (As a reference reads: 3:16-18)
  el.replaceChildren (
    Object.assign (pick ("Book", [...(b ? [] : [["", "Select Book"] as [string, string]]), ...books.map ((x): [string, string] => [x.code, x.name])], b?.code ?? "",
          (v) => { p.book = books.find ((x) => x.code === v) ?? null; p.chapter = 0; p.from = -1; p.to = 0; }), { className: "vcPick vcBook" }),
    pick ("Chapter", [...(p.chapter ? [] : [BLANK]), ...Array.from ({ length: b?.chapters ?? 0 }, (_, i): [number, string] => [i + 1, String (i + 1)])],
          p.chapter || "", (v) => { p.chapter = +v; p.from = -1; p.to = 0; }, ! b),
    sep (":"),
    pick ("From verse", [...(p.from < 0 ? [BLANK] : []), ...(chosen ? vs.map ((v): [number, string] => [v, String (v)]) : [])],
          p.from < 0 ? "" : p.from, (v) => { p.from = +v; p.to = 0; }, ! chosen),
    sep ("-"),
    pick ("To verse", p.from > 0 ? [[0, "–"], ...vs.filter ((v) => v > p.from).map ((v): [number, string] => [v, String (v)])] : [BLANK],
          p.from > 0 ? p.to : "", (v) => { p.to = +v; }, p.from <= 0));
  addBtn.disabled = ! chosen || p.from < 0;
}

async function draw (body: HTMLElement) {
  const trs = translationSources (), d = deckNow (), settings = d.settings;
  body.innerHTML = `<div class="vcTop"><div class="vcTopRow"><h1 class="vcTitle">${esc (d.name)}</h1>
      <button class="pill icon" id="vcMore" aria-label="Deck options" aria-expanded="${menuOpen}">${menuOpen ? "✕" : "⋯"}</button></div></div>
    <div class="vcMenu"${menuOpen ? "" : " hidden"}>
    <div class="vcHead">Decks</div>
    <div class="bar vcDecks">${decks.map ((x) => `<span class="vcDeckName"><button class="pill" data-deck="${x.id}" aria-pressed="${x === d}">${esc (x.name)}</button><button class="pill icon" data-del="${x.id}" aria-label="Delete ${esc (x.name)}">✕</button></span>`).join ("")}
      <button class="pill" id="vcNewDeck">+ New deck</button></div>
    <label class="vcPick vcName">Name<input class="choose" id="vcName" type="text" enterkeyhint="done" autocomplete="off" spellcheck="false"></label>
    <div class="vcAdd">
      <label class="vcPick">Language<select class="choose" id="vcLang">${LANGUAGES.map (([k, t]) => `<option value="${k}"${k === settings.lang ? " selected" : ""}>${t}</option>`).join ("")}</select></label>
      <label class="vcPick">Translation<select class="choose" id="vcTr"><option value="">None</option>${trs.map ((s) => `<option value="${s.id}">${esc (s.name)}</option>`).join ("")}</select></label>
      <button class="pill" data-o="translit">Transliteration</button><button class="pill" data-o="gloss">Interlinear</button><button class="pill" data-o="parse">Parsing</button>
</div>
    <div class="vcHead" id="vcListHead">Verse list</div>
    <div class="bar vcList"></div>
    <div class="vcAdd"><div class="vcNewHead">New Verse</div><div id="vcPlace"></div><button class="pill addVerse" id="vcAddBtn">+ Add Verse</button></div>
    </div>
    <div class="deck vcDeck"></div>
    <div class="src vcCredits"></div>`;
  // ⋯ at the top row's right: its options - the name, the settings, adding cards, the list, the decks - as the Bible
  // view's ⋯ menu (⋯ a ✕ while open that closes it), but over the deck, pushing it down - the card still in view (kept
  // so between drawings)
  const more = body.querySelector<HTMLElement> ("#vcMore")!, menu = body.querySelector<HTMLElement> (".vcMenu")!;
  more.addEventListener ("click", () => {
    menuOpen = ! menuOpen; menu.hidden = ! menuOpen;
    more.setAttribute ("aria-expanded", String (menuOpen)); more.textContent = menuOpen ? "✕" : "⋯";
    clearMenu ();
  });
  const trPick = body.querySelector<HTMLSelectElement> ("#vcTr")!, placeEl = body.querySelector<HTMLElement> ("#vcPlace")!;
  const deckEl = body.querySelector<HTMLElement> (".vcDeck")!;
  // A word tapped on a card: its panel at the screen's foot, as the reader's (tapped again, it closes); the card
  // changed (BACK, FLIP, NEXT...) closes it.
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
  // Decks: one tapped opens it, + NEW DECK makes and opens one, its name edited in place, its ✕ deleting it (asked first).
  for (const b of body.querySelectorAll<HTMLElement> ("[data-deck]")) b.addEventListener ("click", () => { at = b.dataset.deck!; save (); draw (body); });
  body.querySelector ("#vcNewDeck")!.addEventListener ("click", () => { const x = newDeck (`Deck ${decks.length + 1}`); decks.push (x); at = x.id; save (); draw (body); });
  const nameIn = body.querySelector<HTMLInputElement> ("#vcName")!;
  nameIn.value = d.name;
  nameIn.addEventListener ("input", () => {
    d.name = nameIn.value; save ();
    body.querySelector (".vcTitle")!.textContent = d.name || "Untitled";
    body.querySelector (`[data-deck="${d.id}"]`)!.textContent = d.name || "Untitled";
  });
  nameIn.addEventListener ("change", () => { if (! d.name.trim ()) { d.name = "Untitled"; nameIn.value = d.name; save (); } });
  for (const b of body.querySelectorAll<HTMLElement> ("[data-del]")) b.addEventListener ("click", () => {
    const x = decks.find ((y) => y.id === b.dataset.del)!;
    if (! confirm (`Delete the deck "${x.name}"${x.cards.length ? ` and its ${x.cards.length} card${x.cards.length > 1 ? "s" : ""}` : ""}?`)) return;
    decks = decks.filter ((y) => y !== x);
    if (! decks.length) decks = [newDeck ("My verses")];
    if (x === d) at = decks[0].id;
    save (); draw (body);
  });
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
    if (! d.cards.length) { deckEl.innerHTML = "<p>No verse cards yet - pick a reference above.</p>"; credits.textContent = ""; shown = null; return; }
    const used = new Map<string, string> ();
    const made: (Card & { id: string })[] = [];
    for (const c of d.cards) made.push ({ id: c.id, ...await sidesOf (c, used) });
    if (n !== drawing) return;
    const ids = d.cards.map ((c) => c.id).join ();
    if (kept && shown && ids === shownIds) shown.update (made, (a, b) => a.id === b.id);
    else {
      shown = showDeck (deckEl, made, undefined, undefined, true, ".w", "Flip"); shownIds = ids;
      // (SHUFFLE, FLIP and START OVER in one bar at the screen's foot, as the Bible view's play bar: SHUFFLE and START OVER in its corners)
      const bar = document.createElement ("div"); bar.className = "vcBar";
      bar.append (...["shuffle", "flip", "over"].map ((k) => deckEl.querySelector (`[data-k=${k}]`)!));
      // (BACK and NEXT as arrows inside the card's edges, as the Bible view's chapter arrows)
      const row = document.createElement ("div"); row.className = "vcCardRow";
      const arrows = [["back", "‹", "Back"], ["next", "›", "Next"]].map (([k, arrow, label]) => {
        const x = deckEl.querySelector<HTMLElement> (`[data-k=${k}]`)!;
        x.textContent = arrow; x.classList.add ("icon"); x.setAttribute ("aria-label", label);
        return x;
      });
      const card = deckEl.querySelector<HTMLElement> (".card")!;
      card.before (row); row.append (arrows[0], card, arrows[1]);
      deckEl.querySelectorAll (".cardBar").forEach ((x) => x.remove ());
      deckEl.append (bar);
    }     // (No REMOVE CARD - the list's ✕ removes one. Turned over: the back alone, the reference on it)
    credits.textContent = [...used.values ()].filter (Boolean).join (" ");
  };
  const addBtn = body.querySelector<HTMLButtonElement> ("#vcAddBtn")!;
  drawPick (placeEl, addBtn);
  // The NEW VERSE row on one line where it all fits; where not, stacked: NEW VERSE on its own line, the pickers, then
  // + ADD VERSE on its own line (.vcStacked) - checked laid out unstacked, on every resize and every redraw of the pickers.
  const addRow = placeEl.parentElement!;
  const fitRow = () => {
    addRow.classList.remove ("vcStacked");
    const tops = [...addRow.querySelectorAll<HTMLElement> (":scope > .vcNewHead, #vcPlace > *, :scope > .addVerse")].map ((x) => x.getBoundingClientRect ().bottom);
    addRow.classList.toggle ("vcStacked", tops.some ((t) => Math.abs (t - tops[0]) > 2));
  };
  new ResizeObserver (fitRow).observe (addRow.parentElement!);
  new MutationObserver (fitRow).observe (placeEl, { childList: true });
  addBtn.addEventListener ("click", () => {
    const p = pickAt;
    if (! p.book || ! p.chapter || p.from < 0) return;
    d.cards.push ({ id: newId (), code: p.book.code, chapter: p.chapter, from: p.from, to: Math.max (p.to, p.from) });
    pickAt = { book: null, chapter: 0, from: -1, to: 0 };     // (Blank for the next card)
    drawPick (placeEl, addBtn);
    save (); deck ();
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
  // ⋯'s options lie over the room above the centered card: the deck pushed down only as far as they'd cover it
  // (measured again as either changes size - a card turned, the window turned, the options opened)
  const clearMenu = () => {
    deckEl.style.marginTop = "";
    if (menu.hidden) return;
    const over = menu.getBoundingClientRect ().bottom + 12 - (deckEl.firstElementChild ?? deckEl).getBoundingClientRect ().top;
    if (over > 0) deckEl.style.marginTop = over + "px";
  };
  const watch = new ResizeObserver (() => clearMenu ());
  watch.observe (deckEl); watch.observe (menu);
  deck ();
}

//==== ADD VERSE (the Bible's) ====
// A verse number tapped in the Bible: a box from the bottom, the word's panel's width (#verseSheet, under it in the
// text's column - index.html), headed ADD TO VERSE CARDS, as the Verse cards' add row - DECK (the deck it's added to: the one open at first),
// BOOK, CHAPTER and FROM VERSE filled in with that verse, TO VERSE blank (optional), + ADD VERSE (adding it there, and
// closing the box); its ✕ closes it. A Septuagint book's verse (not a book the cards take): the book left blank.
const verseSheet = document.getElementById ("verseSheet")!;
verseSheet.querySelector (".close")!.addEventListener ("click", () => { verseSheet.hidden = true; });
document.getElementById ("chapter")!.addEventListener ("click", (e) => {
  const num = (e.target as HTMLElement).closest<HTMLElement> (".vnum"), row = num?.closest<HTMLElement> (".vrow");
  if (! num || ! row) return;
  const book = books.find ((b) => b.code === reading ().code) ?? null;
  addVerse ({ book, chapter: book ? Number (row.dataset.chapter) : 0, from: book ? Number (row.dataset.verse) : -1, to: 0 });
});
function addVerse (p: { book: Book | null; chapter: number; from: number; to: number }) {
  const body = verseSheet.querySelector<HTMLElement> (".verseBody")!;
  body.innerHTML = `<h2 class="avHead">Add to Verse Cards</h2><div class="vcAdd"><label class="vcPick">Deck<select class="choose" id="avDeck">${decks.map ((x) =>
      `<option value="${x.id}"${x === deckNow () ? " selected" : ""}>${esc (x.name)}</option>`).join ("")}</select></label>
    <div class="avPlace"></div><button class="pill addVerse" id="avAdd">+ Add Verse</button></div>`;
  const place = body.querySelector<HTMLElement> (".avPlace")!, add = body.querySelector<HTMLButtonElement> ("#avAdd")!;
  place.style.display = "contents";
  drawPick (place, add, p);
  add.addEventListener ("click", () => {
    const d = decks.find ((x) => x.id === body.querySelector<HTMLSelectElement> ("#avDeck")!.value);
    if (! d || ! p.book || ! p.chapter || p.from < 0) return;
    d.cards.push ({ id: newId (), code: p.book.code, chapter: p.chapter, from: p.from, to: Math.max (p.to, p.from) });
    save (); verseSheet.hidden = true;
  });
  verseSheet.hidden = false;
}

onScreen ("Verse cards", draw);
