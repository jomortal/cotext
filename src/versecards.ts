// Verse cards (☰ > Verse cards): flashcards for learning verses, built like My vocab's (cards.ts' showDeck - its
// flip, BACK / SHOW / NEXT, SHUFFLE, START OVER and REMOVE CARD).
// - DECKS: any number, each named ("Memory verses", "Greek NT") with its own cards and settings - a row of buttons at
//   the top, as My vocab's lists, the one open lit (the last one used when the screen opens; "My verses" at first),
//   then + NEW DECK; the open deck's NAME edited in place, DELETE DECK (asked first) taking it and its cards away.
// - ADDING: a reference typed ("John 3:16", "Rom 8:28-29", "Ps 23", "Gen 1:1-3", "1 Cor 13:4–7": a verse, a range within
//   a chapter, or a whole chapter), its book by its English name, its code or SBL abbreviation (booknames.ts' ABBR),
//   else the first book whose name starts so - the Hebrew Bible's books and the NT's (an OT card numbered as the
//   Hebrew). A reference the text hasn't (no such book, chapter or verse) says so and adds nothing.
// - AN OT CARD'S TEXT ("OT": picked when it's added - Hebrew at first - and changed on its line in the list): Hebrew or
//   Greek LXX (the Septuagint verses translating the Hebrew reference: chapterstudy.ts' translatedWords, as the
//   printout's Greek LXX text - Psalms and Jeremiah numbering differently, so headed with their own reference). An NT
//   card the Greek.
// - FOR ALL THE DECK'S CARDS (its settings): TRANSLATION - None or one of the notes' English translations (notes.ts'
//   translationSources, each file read as the notes read it: openSource) - and, for the cards showing an original,
//   Interlinear, Parsing and Transliteration (the original drawn as the reader draws it: chapterstudy.ts' textBox).
//   Every card shows its original; the translation too where one is picked (and has the card's testament).
// - A CARD: its front the reference; turned over, the back alone - the reference, the translation's verses (each
//   numbered in a range), the original. Under the deck the list, in the order added: each reference, an OT card's OT
//   picker, ✕ removing it. The credits of what the cards show under it.
// - KEPT on the device (localStorage "cotext.versecards": the decks - each its cards and settings - and the one open).

import type { Db } from "./db";
import { chapterWords, type Book } from "./reader";
import { onScreen } from "./study";
import { showDeck, type Card } from "./cards";
import { ABBR } from "./booknames";
import { translationSources, openSource, type Source } from "./notes";
import { textBox, translatedWords, wordsSpan, TEXT_CREDIT } from "./chapterstudy";

/** A card's original: Hebrew or Greek LXX (OT), Greek (NT). */
type Original = "he" | "lxx" | "gr";
/** A card: its book (code), chapter and verses (from - to; 0 and 0: the whole chapter), its original. */
interface VerseCard { id: string; code: string; chapter: number; from: number; to: number; orig: Original; }
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
  // (Cards kept from before the OT picker was Hebrew / Greek LXX only: "both" read as Hebrew, English only as the original)
  for (const d of decks) for (const c of d.cards) if ((c.orig as string) === "both" || (c.orig as string) === "none") c.orig = "he";
} catch { /* none kept, or private mode */ }
if (! decks.length) decks = [newDeck ("My verses")];
/** The deck open (the first if the one kept is gone). */
const deckNow = () => decks.find ((d) => d.id === at) ?? decks[0];
const save = () => { try { localStorage.setItem (KEY, JSON.stringify ({ decks, at: deckNow ().id })); } catch { /* private mode: not kept */ } };

let db: Db;
let books: Book[] = [];
/** main.ts: the database and every book (the Hebrew Bible's and the NT's are the ones a reference finds). */
export function initVerseCards (theDb: Db, all: Book[]) { db = theDb; books = all.filter ((b) => b.testament !== "LXX"); }

const esc = (s: string) => s.replace (/[&<>"]/g, (c) => `&#${c.charCodeAt (0)};`);
const bookOf = (c: VerseCard) => books.find ((b) => b.code === c.code);
const flat = (s: string) => s.toLowerCase ().replace (/[\s.]/g, "");

/** A card's reference: John 3:16, Romans 8:28–29, Psalms 23. */
function refText (c: VerseCard) {
  const b = bookOf (c);
  return `${b?.name ?? c.code} ${c.chapter}` + (c.from ? `:${c.from}` + (c.to > c.from ? `–${c.to}` : "") : "");
}

/** A reference typed, as a card (its original still to set), or why it isn't one. */
async function parse (typed: string): Promise<Omit<VerseCard, "id" | "orig"> & { book: Book } | string> {
  const m = typed.match (/^\s*(.*?\D)\s*(\d+)(?:\s*[:.]\s*(\d+)(?:\s*[-–—]\s*(\d+))?)?\s*$/);
  if (! m) return "Type a reference: John 3:16, Rom 8:28-29, Ps 23.";
  const name = flat (m[1]);
  const book = books.find ((b) => [b.name, b.code, ABBR[b.name] ?? ""].some ((k) => flat (k) === name))
            ?? (name ? books.find ((b) => flat (b.name).startsWith (name)) : undefined);
  if (! book) return `No book "${m[1].trim ()}".`;
  const chapter = +m[2];
  const r = await db.all ("SELECT MIN(verse) AS lo, MAX(verse) AS hi FROM words WHERE book = ? AND chapter = ?", [book.id, chapter]);
  const lo = Number (r[0]?.lo ?? 0), hi = Number (r[0]?.hi ?? 0);
  if (! hi) return `${book.name} has no chapter ${chapter}.`;
  const from = m[3] ? +m[3] : 0, to = m[4] ? +m[4] : from;
  if (from && (from < lo || from > hi || to < from)) return `${book.name} ${chapter} has verses ${lo}–${hi}.`;
  return { book, code: book.code, chapter, from, to: Math.min (to, hi) };
}

// ---- A card's back ----

const files = new Map<string, Promise<Db>> ();     // (Each translation's file, opened once)
function fileOf (s: Source) {
  let f = files.get (s.id);
  if (! f) { f = openSource (s, () => {}); files.set (s.id, f); f.catch (() => files.delete (s.id)); }
  return f;
}
/** The translation a card shows: the one picked, if it has the card's testament; else none. */
function translationOf (b: Book): Source | null {
  const picked = translationSources ().find ((s) => s.id === deckNow ().settings.tr);
  return picked && picked.testaments.split (" ").includes (b.testament) ? picked : null;
}

/** A card's back: the reference, the translation's verses (numbered in a range), the original(s). */
async function backOf (c: VerseCard, used: Map<string, string>): Promise<string> {
  const b = bookOf (c);
  if (! b) return `<div class="vcRef">${esc (refText (c))}</div>`;
  const [lo, hi] = c.from ? [c.from, c.to] : [0, 999];
  let html = `<div class="vcRef">${esc (refText (c))}</div>`;
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
  const original = async (lxx: boolean) => {
    used.set ("text", TEXT_CREDIT);
    const ws = lxx ? await translatedWords (db, b, c.chapter, lo, hi)
                   : (await chapterWords (db, b.id, c.chapter)).filter ((w) => w.verse >= lo && w.verse <= hi);
    const head = lxx ? `Greek LXX${ws.length ? ` (${wordsSpan (ws)})` : ""}` : b.testament === "OT" ? "Hebrew" : "Greek";
    const box = textBox (lxx ? { ...b, testament: "LXX" } : b, ws[0]?.chapter ?? c.chapter, ws, deckNow ().settings);
    if (! ws.length) box.innerHTML = "<p>No Septuagint verses for this reference.</p>";
    return `<div class="vcOrig"><div class="src">${head}</div>${box.outerHTML}</div>`;
  };
  html += await original (c.orig === "lxx");
  return html;
}

// ---- The screen ----

const OT_CHOICES: [Original, string][] = [["he", "Hebrew"], ["lxx", "Greek LXX"]];
const options = (cs: [Original, string][], v: string) => cs.map (([k, t]) => `<option value="${k}"${k === v ? " selected" : ""}>${t}</option>`).join ("");
let newOT: Original = "he";     // (The add row's OT: an OT card's Hebrew or Greek LXX; an NT card Greek whatever it says)

async function draw (body: HTMLElement) {
  const trs = translationSources (), d = deckNow (), settings = d.settings;
  body.innerHTML = `<div class="bar vcDecks">${decks.map ((x) => `<button class="pill" data-deck="${x.id}" aria-pressed="${x === d}">${esc (x.name)}</button>`).join ("")}
      <button class="pill" id="vcNewDeck">+ New deck</button></div>
    <div class="vcAdd"><input class="choose" id="vcName" type="text" enterkeyhint="done" aria-label="Deck name" autocomplete="off" spellcheck="false">
      <button class="pill" id="vcDelDeck">Delete deck</button></div>
    <div class="chartPick">
      <label>Translation<select class="choose" id="vcTr"><option value="">None</option>${trs.map ((s) => `<option value="${s.id}">${esc (s.name)}</option>`).join ("")}</select></label></div>
    <div class="bar" id="vcLines"><button class="pill" data-o="gloss">Interlinear</button><button class="pill" data-o="parse">Parsing</button><button class="pill" data-o="translit">Transliteration</button></div>
    <div class="vcAdd"><input class="choose" id="vcRef" type="text" enterkeyhint="done" placeholder="John 3:16" aria-label="Reference" autocomplete="off" spellcheck="false">
      <label class="vcPick">OT<select class="choose" id="vcNew">${options (OT_CHOICES, newOT)}</select></label>
      <button class="pill" id="vcAddBtn">+ Add card</button></div>
    <p class="src" id="vcMsg" hidden></p>
    <div class="deck vcDeck"></div>
    <div class="vcList"></div>
    <div class="src vcCredits"></div>`;
  const trPick = body.querySelector<HTMLSelectElement> ("#vcTr")!, refIn = body.querySelector<HTMLInputElement> ("#vcRef")!;
  const msg = body.querySelector<HTMLElement> ("#vcMsg")!, deckEl = body.querySelector<HTMLElement> (".vcDeck")!;
  const listEl = body.querySelector<HTMLElement> (".vcList")!, credits = body.querySelector<HTMLElement> (".vcCredits")!;
  const newPick = body.querySelector<HTMLSelectElement> ("#vcNew")!;
  // Decks: one tapped opens it, + NEW DECK makes and opens one, its name edited in place, DELETE DECK (asked first).
  for (const b of body.querySelectorAll<HTMLElement> ("[data-deck]")) b.addEventListener ("click", () => { at = b.dataset.deck!; save (); draw (body); });
  body.querySelector ("#vcNewDeck")!.addEventListener ("click", () => { const x = newDeck (`Deck ${decks.length + 1}`); decks.push (x); at = x.id; save (); draw (body); });
  const nameIn = body.querySelector<HTMLInputElement> ("#vcName")!;
  nameIn.value = d.name;
  nameIn.addEventListener ("input", () => {
    d.name = nameIn.value; save ();
    body.querySelector (`[data-deck="${d.id}"]`)!.textContent = d.name || "Untitled";
  });
  nameIn.addEventListener ("change", () => { if (! d.name.trim ()) { d.name = "Untitled"; nameIn.value = d.name; save (); } });
  body.querySelector ("#vcDelDeck")!.addEventListener ("click", () => {
    if (! confirm (`Delete the deck "${d.name}"${d.cards.length ? ` and its ${d.cards.length} card${d.cards.length > 1 ? "s" : ""}` : ""}?`)) return;
    decks = decks.filter ((x) => x !== d);
    if (! decks.length) decks = [newDeck ("My verses")];
    at = decks[0].id; save (); draw (body);
  });
  trPick.value = trs.some ((s) => s.id === settings.tr) ? settings.tr : "";
  // The deck, drawn afresh from the cards and settings as they are (a later drawing winning over one still arriving).
  let drawing = 0;
  const deck = async () => {
    const n = ++drawing;
    for (const b of body.querySelectorAll<HTMLElement> ("[data-o]")) b.setAttribute ("aria-pressed", String (settings[b.dataset.o as "gloss"]));
    listEl.innerHTML = d.cards.map ((c) => `<div class="vcRow" data-id="${c.id}"><span>${esc (refText (c))}</span>
        ${bookOf (c)?.testament === "NT" ? "" : `<select class="choose" aria-label="OT">${options (OT_CHOICES, c.orig)}</select>`}
        <button class="pill icon" aria-label="Remove">✕</button></div>`).join ("");
    if (! d.cards.length) { deckEl.innerHTML = "<p>No verse cards yet - type a reference above.</p>"; credits.textContent = ""; return; }
    const used = new Map<string, string> ();
    const made: (Card & { id: string })[] = [];
    for (const c of d.cards) made.push ({ id: c.id, front: `<div class="vcRef">${esc (refText (c))}</div>`, back: await backOf (c, used) });
    if (n !== drawing) return;
    showDeck (deckEl, made, (c) => { d.cards = d.cards.filter ((x) => x.id !== c.id); save (); deck (); }, "Remove card", true);     // (Turned over: the back alone, the reference on it)
    credits.textContent = [...used.values ()].filter (Boolean).join (" ");
  };
  const add = async () => {
    const r = await parse (refIn.value);
    msg.hidden = typeof r !== "string";
    if (typeof r === "string") { msg.textContent = r; return; }
    const orig: Original = r.book.testament === "NT" ? "gr" : newOT;
    d.cards.push ({ id: newId (), code: r.code, chapter: r.chapter, from: r.from, to: r.to, orig });
    refIn.value = ""; save (); deck ();
  };
  body.querySelector ("#vcAddBtn")!.addEventListener ("click", add);
  refIn.addEventListener ("keydown", (e) => { if (e.key === "Enter") { e.preventDefault (); add (); } });
  newPick.addEventListener ("change", () => { newOT = newPick.value as Original; });
  trPick.addEventListener ("change", () => { settings.tr = trPick.value; save (); deck (); });
  for (const b of body.querySelectorAll<HTMLElement> ("[data-o]"))
    b.addEventListener ("click", () => { const k = b.dataset.o as "gloss" | "parse" | "translit"; settings[k] = ! settings[k]; save (); deck (); });
  // A card's line: its original changed, or ✕ removing it.
  listEl.addEventListener ("change", (e) => {
    const row = (e.target as HTMLElement).closest<HTMLElement> (".vcRow"), c = d.cards.find ((x) => x.id === row?.dataset.id);
    if (c) { c.orig = (e.target as HTMLSelectElement).value as Original; save (); deck (); }
  });
  listEl.addEventListener ("click", (e) => {
    const x = (e.target as HTMLElement).closest ("button.icon"), row = x?.closest<HTMLElement> (".vcRow");
    if (row) { d.cards = d.cards.filter ((c) => c.id !== row.dataset.id); save (); deck (); }
  });
  deck ();
}

onScreen ("Verse cards", draw);
