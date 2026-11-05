// Verse cards (☰ > Verse cards): flashcards for learning verses, built like My vocab's (cards.ts' showDeck - its
// flip, BACK / SHOW / NEXT, SHUFFLE and START OVER; a card removed by its ✕ in the list, not a REMOVE CARD).
// - DECKS: any number, each named ("Memory verses", "Greek NT") with its own cards and settings - a row of buttons at
//   the top, as My vocab's lists, the one open lit (the last one used when the screen opens; "My verses" at first),
//   each with a ✕ to its right deleting it and its cards (asked first), then + NEW DECK; the open deck's NAME edited in place.
// - ADDING: picked on the add row - BOOK (the Hebrew Bible's books and the NT's; an OT card numbered as the Hebrew),
//   CHAPTER, FROM VERSE (Whole chapter, or a verse) and TO VERSE (that verse alone, or one after it: a range within the
//   chapter) - then + ADD CARD. The pick starts at the chapter read; after each card is added it's blank (each picker blank until
//   the one before it is picked, + ADD CARD greyed out until a chapter is). The add row is
//   two lines, each wrapping where it doesn't fit: TRANSLATION, LANGUAGE, the deck's Interlinear, Parsing and
//   Transliteration; then the reference (BOOK, CHAPTER, FROM VERSE, TO VERSE) and + ADD CARD.
// - A CARD'S LANGUAGE (picked on the add row when it's added - OT Hebrew at first): OT HEBREW, OT LXX GREEK (the Septuagint verses translating the Hebrew reference: chapterstudy.ts' translatedWords, as the
//   printout's Greek LXX text - Psalms and Jeremiah numbering differently, so headed with their own reference, "LXX 22:1–2";
//   otherwise the original has no heading) or
//   ENGLISH ONLY (no Greek or Hebrew). An NT card the Greek with either OT choice.
// - FOR ALL THE DECK'S CARDS (its settings): TRANSLATION - None or one of the notes' English translations (notes.ts'
//   translationSources, each file read as the notes read it: openSource) - and, for the cards showing an original,
//   Interlinear, Parsing and Transliteration (the original drawn as the reader draws it: chapterstudy.ts' textBox).
//   A card shows its original unless its LANGUAGE is ENGLISH ONLY (while that's picked, TRANSLATION offers no None -
//   switched to the first if None was picked); the translation where one is picked (and has the card's testament) - an
//   English-only card with none picked the first translation that has it, so it always shows something.
// - A CARD: its front the reference; turned over, the back alone - the reference, the translation's verses (each
//   numbered in a range), the original. Under the deck the list, in the order added: each reference and ✕ removing it (its
//   text set as it was added). The credits of what the cards show under it.
// - KEPT on the device (localStorage "cotext.versecards": the decks - each its cards and settings - and the one open).

import type { Db } from "./db";
import { chapterWords, type Book } from "./reader";
import { onScreen } from "./study";
import { showDeck, type Card } from "./cards";
import { translationSources, openSource, type Source } from "./notes";
import { textBox, translatedWords, wordsSpan, TEXT_CREDIT } from "./chapterstudy";

/** A card's original: Hebrew or Greek LXX (OT), Greek (NT). */
type Original = "he" | "lxx" | "gr";
/** A card: its book (code), chapter and verses (from - to; 0 and 0: the whole chapter), its original. */
interface VerseCard { id: string; code: string; chapter: number; from: number; to: number; orig: Original; en?: boolean; }     // (en: English only - no original)
/** The deck's settings: the translation's source id ("" none), the original's lines. */
interface Settings { tr: string; gloss: boolean; parse: boolean; translit: boolean; }

/** A deck: its name, its cards in the order added, its settings. */
interface Deck { id: string; name: string; cards: VerseCard[]; settings: Settings; }

const KEY = "cotext.versecards";
const newId = () => Date.now ().toString (36) + Math.random ().toString (36).slice (2, 6);
const newDeck = (name: string): Deck => ({ id: newId (), name, cards: [], settings: { tr: "web", gloss: true, parse: false, translit: false } });
let decks: Deck[] = [];
let at = "";     // (The deck open: its id)
try {
  const kept = JSON.parse (localStorage.getItem (KEY) ?? "null");
  if (kept?.decks) { decks = kept.decks; at = kept.at ?? ""; }
  // (Cards kept from before ENGLISH ONLY was its own box: "none" now English only, "both" Hebrew)
  for (const d of decks) for (const c of d.cards) {
    if ((c.orig as string) === "none") { c.en = true; c.orig = "he"; }
    if ((c.orig as string) === "both") c.orig = "he";
  }
} catch { /* none kept, or private mode */ }
if (! decks.length) decks = [newDeck ("My verses")];
/** The deck open (the first if the one kept is gone). */
const deckNow = () => decks.find ((d) => d.id === at) ?? decks[0];
const save = () => { try { localStorage.setItem (KEY, JSON.stringify ({ decks, at: deckNow ().id })); } catch { /* private mode: not kept */ } };

let db: Db;
let books: Book[] = [];
let reading: () => [Book, number];
/** main.ts: the database, every book (the Hebrew Bible's and the NT's are the ones picked) and the chapter read. */
export function initVerseCards (theDb: Db, all: Book[], place: () => [Book, number]) {
  db = theDb; books = all.filter ((b) => b.testament !== "LXX"); reading = place;
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
/** The translation a card shows: the one picked, if it has the card's testament; else, for an English-only card, the
 *  first that has it (a card always shows something); else none. */
function translationOf (c: VerseCard, b: Book): Source | null {
  const all = translationSources (), has = (s: Source) => s.testaments.split (" ").includes (b.testament);
  const picked = all.find ((s) => s.id === deckNow ().settings.tr);
  if (picked && has (picked)) return picked;
  return c.en ? all.find (has) ?? null : null;
}

/** A card's back: the reference, the translation's verses (numbered in a range), the original(s). */
async function backOf (c: VerseCard, used: Map<string, string>): Promise<string> {
  const b = bookOf (c);
  if (! b) return `<div class="vcRef">${esc (refText (c))}</div>`;
  const [lo, hi] = c.from ? [c.from, c.to] : [0, 999];
  let html = `<div class="vcRef">${esc (refText (c))}</div>`;
  const tr = translationOf (c, b);
  if (tr) {
    used.set (tr.name, tr.credit);
    const ns = await (await fileOf (tr)).all (`SELECT start, body FROM notes WHERE book = ? AND start >= ? AND start <= ? ORDER BY start, ord`,
                                              [b.id, c.chapter * 1000 + lo, c.chapter * 1000 + hi]);
    const many = new Set (ns.map ((n) => n.start)).size > 1;
    html += `<div class="vcTr"><div class="src">${esc (tr.name)}</div>` + (ns.length ? ns.map ((n) => many
      ? String (n.body).replace (/^(<p[^>]*>)?/, (p) => `${p || ""}<sup class="vcNum">${Number (n.start) % 1000}</sup> `) : String (n.body)).join ("")
      : "<p>Not in this translation.</p>") + "</div>";
  } else if (deckNow ().settings.tr) html += `<div class="vcTr"><p class="src">Not in this translation.</p></div>`;
  const original = async (lxx: boolean) => {
    used.set ("text", TEXT_CREDIT);
    const ws = lxx ? await translatedWords (db, b, c.chapter, lo, hi)
                   : (await chapterWords (db, b.id, c.chapter)).filter ((w) => w.verse >= lo && w.verse <= hi);
    // (No heading - the text shows its language - but the Septuagint's own reference where it numbers otherwise)
    const own = lxx && ws.length && (ws[0].chapter !== c.chapter || (c.from && ws[0].verse !== c.from));
    const box = textBox (lxx ? { ...b, testament: "LXX" } : b, ws[0]?.chapter ?? c.chapter, ws, deckNow ().settings);
    if (! ws.length) box.innerHTML = "<p>No Septuagint verses for this reference.</p>";
    return `<div class="vcOrig">${own ? `<div class="src">LXX ${wordsSpan (ws)}</div>` : ""}${box.outerHTML}</div>`;
  };
  if (! c.en) html += await original (c.orig === "lxx");
  return html;
}

// ---- The screen ----

/** The add row's LANGUAGE: "en" English only; else an OT card's original (an NT card Greek with either). */
type Language = "he" | "lxx" | "en";
const LANGUAGES: [Language, string][] = [["he", "OT Hebrew"], ["lxx", "OT LXX Greek"], ["en", "English only"]];
let language: Language = "he";
/** The add row's reference: book (null: none picked), chapter (0: none picked), verses (from 0: the whole chapter;
 *  to 0: the from verse alone) - null till the screen first opens (then the chapter read); blank again after each card
 *  is added. */
let pickAt: { book: Book | null; chapter: number; from: number; to: number } | null = null;

/** The add row's BOOK, CHAPTER, FROM VERSE and TO VERSE, redrawn as one changes (each blank until the one before it is
 *  picked; + ADD CARD greyed out until a chapter is). */
async function drawPick (el: HTMLElement, addBtn: HTMLButtonElement) {
  if (! pickAt) {
    const [b, c] = reading ();
    const book = books.find ((x) => x.code === b.code) ?? null;
    pickAt = { book, chapter: book ? c : 0, from: 0, to: 0 };
  }
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
          (v) => { p.book = books.find ((x) => x.code === v) ?? null; p.chapter = 0; p.from = p.to = 0; }),
    pick ("Chapter", [...(p.chapter ? [] : [BLANK]), ...Array.from ({ length: b?.chapters ?? 0 }, (_, i): [number, string] => [i + 1, String (i + 1)])],
          p.chapter || "", (v) => { p.chapter = +v; p.from = p.to = 0; }, ! b),
    pick ("From verse", chosen ? [[0, "Whole chapter"], ...vs.map ((v): [number, string] => [v, String (v)])] : [BLANK], chosen ? p.from : "",
          (v) => { p.from = +v; p.to = 0; }, ! chosen),
    pick ("To verse", p.from ? [[0, String (p.from)], ...vs.filter ((v) => v > p.from).map ((v): [number, string] => [v, String (v)])] : [BLANK],
          p.from ? p.to : "", (v) => { p.to = +v; }, ! p.from));
  addBtn.disabled = ! chosen;
}

async function draw (body: HTMLElement) {
  const trs = translationSources (), d = deckNow (), settings = d.settings;
  body.innerHTML = `<div class="bar vcDecks">${decks.map ((x) => `<span class="vcDeckName"><button class="pill" data-deck="${x.id}" aria-pressed="${x === d}">${esc (x.name)}</button><button class="pill icon" data-del="${x.id}" aria-label="Delete ${esc (x.name)}">✕</button></span>`).join ("")}
      <button class="pill" id="vcNewDeck">+ New deck</button></div>
    <div class="vcAdd"><input class="choose" id="vcName" type="text" enterkeyhint="done" aria-label="Deck name" autocomplete="off" spellcheck="false"></div>
    <div class="vcAdd">
      <label class="vcPick">Translation<select class="choose" id="vcTr"><option value="">None</option>${trs.map ((s) => `<option value="${s.id}">${esc (s.name)}</option>`).join ("")}</select></label>
      <label class="vcPick">Language<select class="choose" id="vcLang">${LANGUAGES.map (([k, t]) => `<option value="${k}"${k === language ? " selected" : ""}>${t}</option>`).join ("")}</select></label>
      <button class="pill" data-o="gloss">Interlinear</button><button class="pill" data-o="parse">Parsing</button><button class="pill" data-o="translit">Transliteration</button>
      <div class="vcBreak"></div><div id="vcPlace"></div>
      <button class="pill" id="vcAddBtn">+ Add card</button></div>
    <div class="deck vcDeck"></div>
    <div class="vcList"></div>
    <div class="src vcCredits"></div>`;
  const trPick = body.querySelector<HTMLSelectElement> ("#vcTr")!, placeEl = body.querySelector<HTMLElement> ("#vcPlace")!;
  const deckEl = body.querySelector<HTMLElement> (".vcDeck")!;
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
  // The deck, drawn afresh from the cards and settings as they are (a later drawing winning over one still arriving).
  let drawing = 0;
  const deck = async () => {
    const n = ++drawing;
    for (const b of body.querySelectorAll<HTMLElement> ("[data-o]")) b.setAttribute ("aria-pressed", String (settings[b.dataset.o as "gloss"]));
    listEl.innerHTML = d.cards.map ((c) => `<div class="vcRow" data-id="${c.id}"><span>${esc (refText (c))}</span>
        <button class="pill icon" aria-label="Remove">✕</button></div>`).join ("");
    if (! d.cards.length) { deckEl.innerHTML = "<p>No verse cards yet - pick a reference above.</p>"; credits.textContent = ""; return; }
    const used = new Map<string, string> ();
    const made: (Card & { id: string })[] = [];
    for (const c of d.cards) made.push ({ id: c.id, front: `<div class="vcRef">${esc (refText (c))}</div>`, back: await backOf (c, used) });
    if (n !== drawing) return;
    showDeck (deckEl, made, undefined, undefined, true);     // (No REMOVE CARD - the list's ✕ removes one. Turned over: the back alone, the reference on it)
    credits.textContent = [...used.values ()].filter (Boolean).join (" ");
  };
  const addBtn = body.querySelector<HTMLButtonElement> ("#vcAddBtn")!;
  drawPick (placeEl, addBtn);
  addBtn.addEventListener ("click", () => {
    const p = pickAt;
    if (! p?.book || ! p.chapter) return;
    const orig: Original = p.book.testament === "NT" ? "gr" : language === "lxx" ? "lxx" : "he";
    d.cards.push ({ id: newId (), code: p.book.code, chapter: p.chapter, from: p.from, to: Math.max (p.to, p.from), orig, en: language === "en" });
    pickAt = { book: null, chapter: 0, from: 0, to: 0 };     // (Blank for the next card)
    drawPick (placeEl, addBtn);
    save (); deck ();
  });
  // ENGLISH ONLY: the original left off - TRANSLATION offering no None (an English-only card shows a translation:
  // the first, if None was picked)
  const noNone = () => {
    const en = language === "en";
    trPick.querySelector<HTMLOptionElement> ('option[value=""]')!.hidden = en;
    if (en && ! trPick.value && trs.length) { trPick.value = settings.tr = trs[0].id; save (); deck (); }
  };
  langPick.addEventListener ("change", () => { language = langPick.value as Language; noNone (); });
  noNone ();
  trPick.addEventListener ("change", () => { settings.tr = trPick.value; save (); deck (); });
  for (const b of body.querySelectorAll<HTMLElement> ("[data-o]"))
    b.addEventListener ("click", () => { const k = b.dataset.o as "gloss" | "parse" | "translit"; settings[k] = ! settings[k]; save (); deck (); });
  listEl.addEventListener ("click", (e) => {
    const x = (e.target as HTMLElement).closest ("button.icon"), row = x?.closest<HTMLElement> (".vcRow");
    if (row) { d.cards = d.cards.filter ((c) => c.id !== row.dataset.id); save (); deck (); }
  });
  deck ();
}

onScreen ("Verse cards", draw);
