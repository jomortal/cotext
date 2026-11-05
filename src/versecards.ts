// Verse cards (☰ > Verse cards): flashcards for learning verses, built like My vocab's (cards.ts' showDeck - its
// flip, BACK / SHOW / NEXT, SHUFFLE and START OVER; a card removed by its ✕ in the list, not a REMOVE CARD).
// - DECKS: any number, each named ("Memory verses", "Greek NT") with its own cards and settings - the open deck's NAME
//   at the top, labelled VERSE CARD DECK (the screen without a title); SHOW DECKS at the bottom (beside SHOW LIST, hidden at first) shows a row of buttons, as My vocab's
//   lists, the one open lit (the last one used when the screen opens; "My verses" at first),
//   each with a ✕ to its right deleting it and its cards (asked first), then + NEW DECK; the NAME edited in place.
// - ADDING: picked on the add row - BOOK (the Hebrew Bible's books and the NT's; an OT card numbered as the Hebrew),
//   CHAPTER, FROM VERSE (a verse) and TO VERSE (blank: that verse alone, or one after it: a range within the
//   chapter) - then + ADD CARD. The pick starts blank, and is blank again after each card is added (each picker blank until
//   the one before it is picked, + ADD CARD greyed out until FROM VERSE is; TO VERSE optional,
//   blank for the one verse). The add row is
//   two lines, each wrapping where it doesn't fit: the deck's LANGUAGE, TRANSLATION, Transliteration, Interlinear
//   and Parsing; then the reference (BOOK, CHAPTER, FROM VERSE, TO VERSE) and + ADD CARD.
// - FOR ALL THE DECK'S CARDS (its settings, each change showing at once on the card shown): TRANSLATION - None or one
//   of the notes' English translations (notes.ts' translationSources, each file read as the notes read it:
//   openSource); LANGUAGE - what each testament's cards show: ENGLISH ONLY (no Greek or Hebrew), OT HEBREW - NT GREEK
//   (at first), OT GREEK - NT GREEK (the OT's Greek the Septuagint verses translating the Hebrew reference:
//   chapterstudy.ts' translatedWords, as the printout's Greek LXX text), OT HEBREW - NT ENGLISH or
//   OT ENGLISH - NT GREEK (while a choice leaves some cards in English only, TRANSLATION offers no None - switched to
//   the first if None was picked); and, for the original, Interlinear, Parsing and Transliteration (drawn as the
//   reader draws it: chapterstudy.ts' textBox, but the parsing without the verb colors; greyed out with ENGLISH ONLY). The translation where one is picked (and has the card's testament) -
//   for a card left in English only with none picked, the first translation that has it.
// - A CARD: its front the reference - and, where the card shows an original, the reference in its language
//   beside it (the Greek before the English; the Hebrew after it, first as read from the right) (the Hebrew or Greek book name, chapter and verses in letters, the Greek in capitals: "תְּהִלִּים כג:א",
//   "ΚΑΤΑ ΙΩΑΝΝΗΝ Γʹ:ΙϚʹ"; the Septuagint's own book and numbering, Psalms and Jeremiah's differing: "ΨΑΛΜΟΙ ΚΒʹ:Αʹ"); turned over, the back alone
//   - those references, the translation's verses (each numbered in a range), the original. Under the deck SHOW LIST / HIDE LIST (hidden at first) and the list, in the order added and laid out as the decks: each reference and ✕ removing it. The credits of what the cards show under it.
// - KEPT on the device (localStorage "cotext.versecards": the decks - each its cards and settings - and the one open).

import type { Db } from "./db";
import { chapterWords, type Book } from "./reader";
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
/** main.ts: the database and every book (the Hebrew Bible's and the NT's are the ones picked). */
let allBooks: Book[] = [];     // (The Septuagint's too: a Greek LXX card's own book)
export function initVerseCards (theDb: Db, all: Book[]) { db = theDb; allBooks = all; books = all.filter ((b) => b.testament !== "LXX"); }

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
    html += `<div class="vcTr"><div class="src">${esc (tr.name)}</div>` + (ns.length ? ns.map ((n) => many
      ? String (n.body).replace (/^(<p[^>]*>)?/, (p) => `${p || ""}<sup class="vcNum">${Number (n.start) % 1000}</sup> `) : String (n.body)).join ("")
      : "<p>Not in this translation.</p>") + "</div>";
  } else if (deckNow ().settings.tr) html += `<div class="vcTr"><p class="src">Not in this translation.</p></div>`;
  const orig = originalOf (b);
  let native = "";
  if (orig) {
    const lxx = orig === "lxx";
    used.set ("text", TEXT_CREDIT);
    const ws = lxx ? await translatedWords (db, b, c.chapter, lo, hi)
                   : (await chapterWords (db, b.id, c.chapter)).filter ((w) => w.verse >= lo && w.verse <= hi);
    const box = textBox (lxx ? { ...b, testament: "LXX" } : b, ws[0]?.chapter ?? c.chapter, ws, deckNow ().settings);
    if (! ws.length) box.innerHTML = "<p>No Septuagint verses for this reference.</p>";
    html += `<div class="vcOrig">${box.outerHTML}</div>`;
    // (The Septuagint's reference its own: its book and numbering - Psalms and Jeremiah's differ)
    const lb = lxx && ws.length ? allBooks.find ((x) => x.id === ws[0].book) : undefined, z = ws[ws.length - 1];
    native = lxx ? (lb ? nativeRef (lb.code, "gr", ws[0].chapter, c.from ? ws[0].verse : 0, z.chapter, z.verse) : "")
                 : nativeRef (b.code, orig, c.chapter, c.from, c.chapter, c.to);
  }
  return { front: ref (native), back: ref (native) + html };
}

// ---- The screen ----

const LANGUAGES: [Language, string][] = [["en", "English Only"], ["he", "OT Hebrew - NT Greek"], ["lxx", "OT Greek - NT Greek"],
                                         ["heEn", "OT Hebrew - NT English"], ["enGr", "OT English - NT Greek"]];
let listShown = false;     // (The deck's list of cards: hidden till SHOW LIST)
let decksShown = false;     // (The decks and + NEW DECK: hidden till SHOW DECKS)
/** The add row's reference: book (null: none picked), chapter (0: none picked), verses (from -1: none picked; to 0: blank,
 *  the from verse alone) - blank at first and again after each card is added. */
let pickAt: { book: Book | null; chapter: number; from: number; to: number } = { book: null, chapter: 0, from: -1, to: 0 };

/** The add row's BOOK, CHAPTER, FROM VERSE and TO VERSE, redrawn as one changes (each blank until the one before it is
 *  picked; + ADD CARD greyed out until FROM VERSE is). */
async function drawPick (el: HTMLElement, addBtn: HTMLButtonElement) {
  const p = pickAt, b = p.book;
  const r = b && p.chapter ? await db.all ("SELECT DISTINCT verse FROM words WHERE book = ? AND chapter = ? ORDER BY verse", [b.id, p.chapter]) : [];
  const vs = r.map ((x) => Number (x.verse)).filter ((v) => v > 0);
  const BLANK: [string, string] = ["", "\u00a0"];     // (Blank: a space, so the picker keeps its height)
  const pick = (label: string, options: [number | string, string][], value: number | string, set: (v: string) => void, off = false) => {
    const l = document.createElement ("label"); l.className = "vcPick"; l.textContent = label;
    const s = document.createElement ("select"); s.className = "choose"; s.disabled = off;
    s.append (...options.map (([v, t]) => new Option (t, String (v))));
    s.value = String (value);
    s.addEventListener ("change", () => { set (s.value); drawPick (el, addBtn); });
    l.append (s);
    return l;
  };
  const chosen = !! (b && p.chapter);
  el.replaceChildren (
    pick ("Book", [...(b ? [] : [BLANK]), ...books.map ((x): [string, string] => [x.code, x.name])], b?.code ?? "",
          (v) => { p.book = books.find ((x) => x.code === v) ?? null; p.chapter = 0; p.from = -1; p.to = 0; }),
    pick ("Chapter", [...(p.chapter ? [] : [BLANK]), ...Array.from ({ length: b?.chapters ?? 0 }, (_, i): [number, string] => [i + 1, String (i + 1)])],
          p.chapter || "", (v) => { p.chapter = +v; p.from = -1; p.to = 0; }, ! b),
    pick ("From verse", [...(p.from < 0 ? [BLANK] : []), ...(chosen ? vs.map ((v): [number, string] => [v, String (v)]) : [])],
          p.from < 0 ? "" : p.from, (v) => { p.from = +v; p.to = 0; }, ! chosen),
    pick ("To verse", p.from > 0 ? [[0, "\u00a0"], ...vs.filter ((v) => v > p.from).map ((v): [number, string] => [v, String (v)])] : [BLANK],
          p.from > 0 ? p.to : "", (v) => { p.to = +v; }, p.from <= 0));
  addBtn.disabled = ! chosen || p.from < 0;
}

async function draw (body: HTMLElement) {
  const trs = translationSources (), d = deckNow (), settings = d.settings;
  body.innerHTML = `<label class="vcPick vcName">Verse Card Deck<input class="choose" id="vcName" type="text" enterkeyhint="done" autocomplete="off" spellcheck="false"></label>
    <div class="vcAdd">
      <label class="vcPick">Language<select class="choose" id="vcLang">${LANGUAGES.map (([k, t]) => `<option value="${k}"${k === settings.lang ? " selected" : ""}>${t}</option>`).join ("")}</select></label>
      <label class="vcPick">Translation<select class="choose" id="vcTr"><option value="">None</option>${trs.map ((s) => `<option value="${s.id}">${esc (s.name)}</option>`).join ("")}</select></label>
      <button class="pill" data-o="translit">Transliteration</button><button class="pill" data-o="gloss">Interlinear</button><button class="pill" data-o="parse">Parsing</button>
      <div class="vcBreak"></div><div id="vcPlace"></div>
      <button class="pill" id="vcAddBtn">+ Add card</button></div>
    <div class="deck vcDeck"></div>
    <div class="bar"><button class="pill" id="vcShowList"></button><button class="pill" id="vcShowDecks"></button></div>
    <div class="bar vcList"></div>
    <div class="bar vcDecks">${decks.map ((x) => `<span class="vcDeckName"><button class="pill" data-deck="${x.id}" aria-pressed="${x === d}">${esc (x.name)}</button><button class="pill icon" data-del="${x.id}" aria-label="Delete ${esc (x.name)}">✕</button></span>`).join ("")}
      <button class="pill" id="vcNewDeck">+ New deck</button></div>
    <div class="src vcCredits"></div>`;
  const trPick = body.querySelector<HTMLSelectElement> ("#vcTr")!, placeEl = body.querySelector<HTMLElement> ("#vcPlace")!;
  const deckEl = body.querySelector<HTMLElement> (".vcDeck")!;
  const showList = body.querySelector<HTMLElement> ("#vcShowList")!;
  const showing = () => { listEl.hidden = ! listShown; showList.textContent = listShown ? "Hide list" : "Show list"; };
  showList.addEventListener ("click", () => { listShown = ! listShown; showing (); });
  // SHOW DECKS / HIDE DECKS: the decks (each to open or delete) and + NEW DECK, under the list
  const showDecks = body.querySelector<HTMLElement> ("#vcShowDecks")!, decksEl = body.querySelector<HTMLElement> (".vcDecks")!;
  const decksShowing = () => { decksEl.hidden = ! decksShown; showDecks.textContent = decksShown ? "Hide decks" : "Show decks"; };
  showDecks.addEventListener ("click", () => { decksShown = ! decksShown; decksShowing (); });
  decksShowing ();
  const listEl = body.querySelector<HTMLElement> (".vcList")!, credits = body.querySelector<HTMLElement> (".vcCredits")!;
  const langPick = body.querySelector<HTMLSelectElement> ("#vcLang")!;
  // Decks: one tapped opens it, + NEW DECK makes and opens one, its name edited in place, its ✕ deleting it (asked first).
  for (const b of body.querySelectorAll<HTMLElement> ("[data-deck]")) b.addEventListener ("click", () => { at = b.dataset.deck!; save (); draw (body); });
  body.querySelector ("#vcNewDeck")!.addEventListener ("click", () => { const x = newDeck (`Deck ${decks.length + 1}`); decks.push (x); at = x.id; save (); draw (body); });
  const nameIn = body.querySelector<HTMLInputElement> ("#vcName")!;
  nameIn.value = d.name;
  nameIn.addEventListener ("input", () => {
    d.name = nameIn.value; save ();
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
    showList.hidden = ! d.cards.length; showing ();
    if (! d.cards.length) { deckEl.innerHTML = "<p>No verse cards yet - pick a reference above.</p>"; credits.textContent = ""; shown = null; return; }
    const used = new Map<string, string> ();
    const made: (Card & { id: string })[] = [];
    for (const c of d.cards) made.push ({ id: c.id, ...await sidesOf (c, used) });
    if (n !== drawing) return;
    const ids = d.cards.map ((c) => c.id).join ();
    if (kept && shown && ids === shownIds) shown.update (made, (a, b) => a.id === b.id);
    else { shown = showDeck (deckEl, made, undefined, undefined, true); shownIds = ids; }     // (No REMOVE CARD - the list's ✕ removes one. Turned over: the back alone, the reference on it)
    credits.textContent = [...used.values ()].filter (Boolean).join (" ");
  };
  const addBtn = body.querySelector<HTMLButtonElement> ("#vcAddBtn")!;
  drawPick (placeEl, addBtn);
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
  deck ();
}

onScreen ("Verse cards", draw);
