// Flashcards (☰ > Flashcards) and My vocab. MY VOCAB: each person's own list. A word's panel adds it ("+ My vocab";
// "✓ In my vocab" takes it off again); "+ Known words" makes it known - known is the helps' own hand choice (helps.ts:
// its gloss then hidden), so the two never disagree, and a known word leaves My vocab.
// THE SCREEN (no title of its own, no ✕ - back to the Bible by ☰), built as the Verse cards' (versecards.ts):
// - THE TOP ROW: the list studied centered ("OT frequency 1–20", "Genesis frequency 21–40", "My vocab", "Alphabet",
//   "Paradigms: Qal"), a drop-down arrow beside it (topbar.ts' topTitle) - tapped, its drop-down under it, part of the
//   top bar (the bar growing as it opens, the card's room under it; tapped again closing it): LANGUAGE (Hebrew or Greek -
//   at first the language of the testament read, then the reader's own pick, kept on the device), the lists (below),
//   BOOK and WORDS (the frequency lists' book and 20s), STEM / TENSE AND VOICE and FILL IN (the verb paradigms'), then
//   ENGLISH TO HEBREW / GREEK and SHOW LIST.
// - THE LISTS, for the language: OT FREQUENCY (Hebrew) or NT and LXX FREQUENCY (Greek - the Septuagint's counts its own;
//   the one picked last is Greek's testament, for its counts and BOOK NAMES; at first the one read) and BOOK FREQUENCY
//   (a book picked from the language's - Greek's the NT's and the Septuagint's -, the one read at first where it's in
//   that language) (the testament's or the book's words not yet known, most frequent first, picked 20 at a time: 1-20
//   the 20 most frequent; a known word stays in its place in the list, greyed, but isn't a card), MY VOCAB and KNOWN WORDS (a Greek word's the same in the NT and LXX), then the first things to
//   learn - ALPHABET, NUMBERS (the number words, then the letters used as numbers) and BOOK NAMES (basics.ts) -, then
//   VERB PARADIGMS: a deck per stem (Hebrew) or tense and voice (Greek) - every form the Verb chart shows for it, from
//   the same templates (paradigm.ts), shuffled; FILL IN picks the cards' verb: PATTERN - the front the form's pattern,
//   the back its parsing spelled out ("Qal perfect, 3rd masculine singular"), its meaning on "do" and the form on the
//   first model root (קָטַל, λύω) - or a model verb - the front the form on that verb, the back its parsing spelled out
//   and its meaning on that verb. The one picked (the frequency list at first) shown as flashcards (cards.ts' showDeck).
// - A WORD'S CARD: front the word with a speaker that says it, turned over its concise meaning alone (the word hidden) -
//   or, with ENGLISH TO HEBREW / GREEK, the other way round (the first things to learn the same way; not the paradigms).
//   A tap turns it, a swipe across it or ‹ › steps; under it its action: REMOVE FROM LIST (in My vocab off that list, in
//   Known words no longer known) or, in the frequency lists, + KNOWN WORDS (made known, into Known words); none in the
//   first things to learn or the paradigms.
// - THE WORD LIST (the bar's middle icon; closed at first, so the answers stay hidden while quizzing): in a panel of its
//   own, the list's words (the word, its concise meaning, how often it occurs in the whole testament - in the book, for
//   Book frequency), each with a mark: − to make it known, + (a known word, greyed) to learn it again - in Known words
//   itself, − taking it off (no longer known: back in the lists it's in).
// Kept on the device: My vocab, and the language picked (with Greek's testament).

import type { Db } from "./db";
import { onScreen, currentTestament, type Testament } from "./study";
import { showDeck, fitDeck, shuffle, BAR_ICONS, type Card } from "./cards";
import { topTitle, dropDowns, watchTopBar } from "./topbar";
import { HEBREW_STEMS, GREEK_TENSES, HEBREW_MODELS, GREEK_MODELS, hebrewCells, hebrewForm, greekCells, greekForm, spellCode, type Form } from "./paradigm";
import { knownWords, setKnown, unsetKnown, onHelpsChange, currentBook, setLearning, applyHelps } from "./helps";
import { basics } from "./basics";

const KEY = "cotext.vocab";
let learning: Record<string, true> = {};
try { learning = JSON.parse (localStorage.getItem (KEY) ?? "{}"); } catch { /* none kept, or private mode */ }
const save = () => { try { localStorage.setItem (KEY, JSON.stringify (learning)); } catch { /* private mode: not kept */ } };

// LANGUAGE: Hebrew ("H") or Greek ("G") - none kept: the testament read's -; greek: which Greek testament (NT or LXX
// FREQUENCY, the one picked last - none kept: the one read, else the NT). Kept on the device once picked.
const LANG_KEY = "cotext.flashcards";
let picks: { lang?: "H" | "G"; greek?: "NT" | "LXX" } = {};
try { picks = JSON.parse (localStorage.getItem (LANG_KEY) ?? "{}") ?? {}; } catch { /* none kept, or private mode */ }
const keepPicks = () => { try { localStorage.setItem (LANG_KEY, JSON.stringify (picks)); } catch { /* private mode: not kept */ } };
const lang = (): "H" | "G" => picks.lang ?? (currentTestament () === "OT" ? "H" : "G");
/** The testament studied: Hebrew's the OT, Greek's the NT or the Septuagint (above). */
const testament = (): Testament => lang () === "H" ? "OT" : picks.greek ?? (currentTestament () === "LXX" ? "LXX" : "NT");

let db: Db;
export function initVocab (theDb: Db) { db = theDb; }

const esc = (s: string) => s.replace (/[&<>"]/g, (c) => `&#${c.charCodeAt (0)};`);

// Each word's panel's button (panel.ts: the text's word's and the notes' Hebrew OT word's), each following its word.
const panelBtns: { btn: HTMLElement; strong: string }[] = [];
const label = () => { for (const b of panelBtns) b.btn.textContent = learning[b.strong] ? "✓ In my vocab" : "+ My vocab"; };
/** A panel's + My vocab (btn): returns the setter for the word that panel shows, the button following it. */
export function vocabButton (btn: HTMLElement): (strong: string) => void {
  const b = { btn, strong: "" };
  panelBtns.push (b);
  btn.addEventListener ("click", () => {
    if (learning[b.strong]) delete learning[b.strong]; else learning[b.strong] = true;
    save (); label (); applyHelps ();     // (SHOW MY VOCAB: its helps follow)
  });
  return (strong) => { b.strong = strong; label (); };
}
setLearning ((k) => !! learning[k]);
onHelpsChange (() => {
  for (const k of knownWords ()) if (learning[k]) { delete learning[k]; save (); }     // (Known: no longer learning)
  label ();
});

interface WordCard extends Card { strong: string; }

/** The whole testament's counts in freq: the Septuagint's book -1, the OT's and NT's 0 (by their keys' H / G). */
const whole = () => testament () === "LXX" ? -1 : 0;

/** The words' details: lemma, concise meaning and count - in the whole testament, or in the book (its id), by Strong's key. */
async function details (strongs: string[], bookId = whole ()): Promise<Map<string, { lemma: string; meaning: string; count: number }>> {
  const out = new Map<string, { lemma: string; meaning: string; count: number }> ();
  for (let i = 0; i < strongs.length; i += 500) {     // (SQLite's bound parameters, a chunk at a time)
    const part = strongs.slice (i, i + 500), q = part.map (() => "?").join (",");
    for (const r of await db.all (`SELECT l.strong, l.lemma, l.concise, l.gloss, f.count FROM lexicon l
                             LEFT JOIN freq f ON f.strong = l.strong AND f.book = ? WHERE l.strong IN (${q})`, [bookId, ...part]))
      out.set (String (r.strong), { lemma: String (r.lemma), meaning: String (r.concise || r.gloss || ""), count: Number (r.count ?? 0) });
  }
  return out;
}

/** The speaker icon, as the word panel's (index.html). */
const SPEAKER = document.querySelector ("#sheet .speakRoot")!.innerHTML;

async function cardsFor (strongs: string[]): Promise<WordCard[]> {
  const d = await details (strongs), hebrew = lang () === "H";
  return strongs.filter ((k) => d.has (k)).map ((k) => {
    const w = d.get (k)!;
    const word = `<span class="root"><span class="${hebrew ? "heWord" : "grWord"}">${esc (w.lemma)}</span><button class="pill icon" data-say="${esc (w.lemma)}" aria-label="Say the word">${SPEAKER}</button></span>`, meaning = `<div class="meaning">${esc (w.meaning)}</div>`;
    return reversed ? { strong: k, front: meaning, back: word } : { strong: k, front: word, back: meaning };
  });
}

/** A card of ALPHABET, NUMBERS or BOOK NAMES (basics.ts), drawn as a word's: the word with its speaker (where it's
 *  said), its English - ENGLISH TO HEBREW / GREEK the other way round. */
function basicCard (x: { word: string; say: string; meaning: string }): Card {
  const hebrew = lang () === "H";
  const say = x.say ? `<button class="pill icon" data-say="${esc (x.say)}" aria-label="Say the word">${SPEAKER}</button>` : "";
  const word = `<span class="root"><span class="${hebrew ? "heWord" : "grWord"}">${esc (x.word)}</span>${say}</span>`, meaning = `<div class="meaning">${esc (x.meaning)}</div>`;
  return reversed ? { front: meaning, back: word } : { front: word, back: meaning };
}

/** The testament's words (Strong's keys, by its H / G prefix), most frequent first - in the whole testament, or in the
 *  book (its id): the frequency lists (known words among them - left out of the cards, greyed in the list). */
async function byFrequency (prefix: string, bookId = 0): Promise<string[]> {
  return (await db.all (`SELECT f.strong FROM freq f JOIN lexicon l ON l.strong = f.strong WHERE f.book = ? AND f.strong LIKE ?
                         ORDER BY f.count DESC, f.strong`, [bookId, prefix + "%"])).map ((r) => String (r.strong));
}
const LIST = 20;                       // (Words in each frequency list)
const pickedList: Record<string, number> = {};     // (The 20s picked, by testament - or by book, "b" + its id: 0 the first)
let picked = "freq";                   // (The list shown: freq - OT / NT / LXX FREQUENCY -, book - BOOK FREQUENCY -, learn - My vocab -, known, the first things to learn: alpha - ALPHABET -, nums - NUMBERS -, names - BOOK NAMES - basics.ts; or verbs - VERB PARADIGMS)
const isBasic = () => ["alpha", "nums", "names"].includes (picked);
const byFreq = () => picked === "freq" || picked === "book";
const pickedBook: Record<string, number> = {};     // (BOOK FREQUENCY's book, by language: the book read until one is picked, where it's in that language)
let bookList: { id: number; name: string; testament: string }[] = [];     // (BOOK's choices: the language's books - Greek's the NT's, then the Septuagint's)
const theBook = () => pickedBook[lang ()] ?? (bookList.some ((b) => b.id === currentBook ().id) ? currentBook ().id : bookList[0]?.id ?? 0);
const bookId = () => picked === "book" ? theBook () : whole ();
const listKey = () => picked === "book" ? "b" + theBook () : testament ();
let reversed = false;                  // (ENGLISH TO HEBREW / GREEK: the cards' front the meaning, turned over the word)
let listShown = false;                 // (The word list's panel open - closed at first, the answers hidden while quizzing)
let menuOpen = "";                     // (The top row's drop-down open - "more" - or not: kept as the screen is drawn again)
const pickedStem = { H: 0, G: 0 };     // (VERB PARADIGMS' STEM / TENSE AND VOICE, by language)
const fillIn = { H: -1, G: -1 };       // (FILL IN, by language: -1 the pattern, else a model verb's index)

/** The lists' names, as their buttons and the title say them. */
const NAMES: Record<string, string> = { book: "Book frequency", learn: "My vocab", known: "Known words", alpha: "Alphabet", nums: "Numbers", names: "Book names", verbs: "Verb paradigms" };

/** The word lists (frequency, My vocab, Known words) for the language, worked out afresh (on drawing, and after each card's REMOVE FROM LIST / + KNOWN WORDS). */
async function lists () {
  const prefix = lang ();
  const known = knownWords ().filter ((k) => k.startsWith (prefix));
  const learn = Object.keys (learning).filter ((k) => k.startsWith (prefix) && ! known.includes (k));
  const [ranked, d] = await Promise.all ([byFrequency (prefix, bookId ()), details ([...learn, ...known])]);
  const byCount = (a: string, b: string) => (d.get (b)?.count ?? 0) - (d.get (a)?.count ?? 0);
  return { known: known.filter ((k) => d.has (k)).sort (byCount), learn: learn.filter ((k) => d.has (k)).sort (byCount), ranked, d,
           count: Math.ceil (ranked.length / LIST) };
}

/** A form's card; filled: on a model verb (its front that verb's form, so the back needs no form of its own). */
const paradigmCard = (f: Form & { text: string }, hebrew: boolean, filled: boolean): Card => ({
  front: f.pattern,
  back: `<div class="paradigm">${spellCode (f.code, hebrew)}</div><div>${f.meaning}</div>${filled ? "" : `<div class="${hebrew ? "heWord" : "grWord"}">${f.text}</div>`}`,
});
/** VERB PARADIGMS' deck: every form of the stem (or tense and voice) picked, on FILL IN's verb, shuffled. */
function paradigmCards (): Card[] {
  if (lang () === "H") {
    const stem = HEBREW_STEMS[pickedStem.H], c = hebrewCells (stem);
    const cells = [...Object.values (c.grid).flatMap ((g) => Object.values (g)), ...c.ptc, ...(c.ptp ?? []), c.inc, c.ina];
    const m = HEBREW_MODELS[fillIn.H] ?? null;
    return shuffle (cells.map ((x) => paradigmCard (hebrewForm (stem, x, m), true, !! m)));
  }
  const tv = GREEK_TENSES[pickedStem.G], c = greekCells (tv);
  const cells = [...Object.values (c.grid).flatMap ((g) => Object.values (g)), ...(c.inf ? [c.inf] : []), ...c.ptc];
  const m = GREEK_MODELS[fillIn.G] ?? null;
  return shuffle (cells.map ((x) => paradigmCard (greekForm (tv, x, m), false, !! m)));
}

async function draw (body: HTMLElement) {
  const l = lang (), hebrew = l === "H", t = testament ();
  const stems = hebrew ? HEBREW_STEMS.map ((s) => s.name) : GREEK_TENSES.map ((x) => x.name);
  const models = hebrew ? HEBREW_MODELS.map ((m) => `${m.root} - ${m.english[0]}`) : GREEK_MODELS.map ((m) => `${m.lemma} - ${m.english[0]}`);
  const opts = (xs: string[]) => xs.map ((x, i) => `<option value="${i}">${esc (x)}</option>`).join ("");
  // (The frequency lists: Hebrew's OT FREQUENCY; Greek's NT and LXX FREQUENCY, each setting Greek's testament)
  const freqs = (hebrew ? ["OT"] : ["NT", "LXX"]).map ((x) => `<button class="pill" data-list="freq" data-t="${x}">${x} frequency</button>`).join ("");
  body.innerHTML = `<div class="topBar"><div class="topRow"><span id="fcTitle"></span></div>
    <div class="vcMenu" data-menu="more">
      <div class="vcAdd"><label class="vcPick">Language<select class="choose" id="fcLang"><option value="H">Hebrew</option><option value="G">Greek</option></select></label></div>
      <div class="bar">${freqs}${["book", "learn", "known", "alpha", "nums", "names", "verbs"].map ((k) => `<button class="pill" data-list="${k}">${NAMES[k]}</button>`).join ("")}</div>
      <div class="vcAdd" id="freqRow"><label class="vcPick" id="bookRow">Book<select class="choose" id="bookPick"></select></label><label class="vcPick">Words<select class="choose" id="freqPick"></select></label></div>
      <div class="vcAdd" id="verbRow"><label class="vcPick">${hebrew ? "Stem" : "Tense and voice"}<select class="choose" id="stemPick">${opts (stems)}</select></label>
        <label class="vcPick">Fill in<select class="choose" id="fillPick"><option value="-1">Pattern</option>${opts (models)}</select></label></div>
      <p id="verbNote">Each card a form - its pattern, or on the verb picked in Fill in; turned over, its parsing and meaning (on a pattern, also the form on ${hebrew ? "קָטַל" : "λύω"}).</p>
      <div class="bar" id="toggles"><button class="pill" id="reverse">English to ${hebrew ? "Hebrew" : "Greek"}</button></div>
    </div></div>
    <div class="deck"></div>
    <div class="deckPane" hidden><div class="top csEditHead"><h2 class="gTitle">Word list</h2><button class="pill icon" id="fcListClose" aria-label="Close">✕</button></div>
    <div class="vocabLists"></div></div>`;
  // The top row: the list studied as its title, its drop-down the screen's choices (topbar.ts, as the Verse cards')
  const top = topTitle ("", "flashcard options");
  body.querySelector ("#fcTitle")!.replaceWith (top.title);
  dropDowns ([{ key: "more", button: top.button, menu: body.querySelector<HTMLElement> (".vcMenu")!, icon: "" }], menuOpen, (k) => { menuOpen = k; });
  watchTopBar (body.querySelector<HTMLElement> (".topBar")!);
  const deckEl = body.querySelector<HTMLElement> (".deck")!;
  fitDeck (deckEl);     // (The card centered on the screen; the list, shown, scrolled to under it)
  const langPick = body.querySelector<HTMLSelectElement> ("#fcLang")!;
  const freqPick = body.querySelector<HTMLSelectElement> ("#freqPick")!, bookPick = body.querySelector<HTMLSelectElement> ("#bookPick")!;
  const stemPick = body.querySelector<HTMLSelectElement> ("#stemPick")!, fillPick = body.querySelector<HTMLSelectElement> ("#fillPick")!;
  // The word list: in a panel of its own (as the Verse cards' NEW VERSE: at the foot upright, at the right sideways), shown
  // or hidden by the list icon in the bar's middle (cards.ts' middle) and closed by its ✕ - the card's room giving way
  // to it (--deckPaneH, style.css)
  const listEl = body.querySelector<HTMLElement> (".vocabLists")!, pane = body.querySelector<HTMLElement> (".deckPane")!;
  const listBtn = document.createElement ("button");
  Object.assign (listBtn, { className: "pill icon", innerHTML: BAR_ICONS.list }); listBtn.setAttribute ("aria-label", "Word list");
  new ResizeObserver (() => document.getElementById ("screen")!.style.setProperty ("--deckPaneH", `${pane.offsetHeight}px`)).observe (pane);
  body.querySelector ("#fcListClose")!.addEventListener ("click", () => { listShown = false; refresh (); });
  langPick.value = l;
  stemPick.value = String (pickedStem[l]); fillPick.value = String (fillIn[l]);
  // BOOK: the language's books (Greek's the NT's, then the Septuagint's)
  bookList = (await db.all ("SELECT id, name, testament FROM books WHERE testament IN (?, ?) ORDER BY testament = 'LXX', id", hebrew ? ["OT", "OT"] : ["NT", "LXX"]))
    .map ((r) => ({ id: Number (r.id), name: String (r.name), testament: String (r.testament) }));
  bookPick.innerHTML = bookList.map ((b) => `<option value="${b.id}">${esc (b.name)}</option>`).join ("");
  // The words of the list picked, from the lists as they are now.
  const words = (x: Awaited<ReturnType<typeof lists>>) => picked === "learn" ? x.learn : picked === "known" ? x.known
    : x.ranked.slice ((pickedList[listKey ()] ?? 0) * LIST, ((pickedList[listKey ()] ?? 0) + 1) * LIST);
  // Everything but the deck shown, from the lists as they are now: a card made known moves into Known words at once,
  // and the frequency lists move up (the deck open keeps its cards until it's opened again). (Each drawn once its words
  // are read, a later one winning over one still arriving: refreshing, opening.)
  let refreshing = 0, opening = 0;
  const refresh = async () => {
    const n = ++refreshing;
    for (const b of body.querySelectorAll<HTMLElement> ("[data-list]"))
      b.setAttribute ("aria-pressed", String (b.dataset.list === picked && (! b.dataset.t || b.dataset.t === testament ())));
    body.querySelector<HTMLElement> ("#verbRow")!.hidden = body.querySelector<HTMLElement> ("#verbNote")!.hidden = picked !== "verbs";     // (Its stem and verb only for the paradigms)
    body.querySelector<HTMLElement> ("#toggles")!.hidden = picked === "verbs";     // (Nothing to reverse or list for the paradigms)
    listBtn.setAttribute ("aria-pressed", String (listShown));
    body.querySelector ("#reverse")!.setAttribute ("aria-pressed", String (reversed));
    pane.hidden = ! listShown || picked === "verbs";
    const freqRow = body.querySelector<HTMLElement> ("#freqRow")!;
    if (! byFreq ()) freqRow.hidden = true;
    if (picked === "verbs") { top.set (`Paradigms: ${stems[pickedStem[l]]}`); return; }
    if (isBasic ()) {     // (ALPHABET, NUMBERS, BOOK NAMES: each word and its English)
      top.set (NAMES[picked]);
      const bs = await basics (db, picked, t);
      if (n !== refreshing) return;
      listEl.innerHTML = bs.map ((x) => `<div class="vocabRow"><span class="${hebrew ? "heWord" : "grWord"}">${esc (x.word)}</span><span>${esc (x.meaning)}</span><span class="n"></span></div>`).join ("");
      return;
    }
    const x = await lists ();
    pickedList[listKey ()] = Math.min (pickedList[listKey ()] ?? 0, Math.max (0, x.count - 1));
    const d = byFreq () ? await details (words (x), bookId ()) : x.d;
    if (n !== refreshing) return;
    freqRow.hidden = ! byFreq ();     // (Its 20s only for the frequency lists)
    body.querySelector<HTMLElement> ("#bookRow")!.hidden = picked !== "book";     // (And the book only for Book frequency)
    bookPick.value = String (theBook ());
    const range = (i: number) => `${(i * LIST + 1).toLocaleString ()}–${Math.min ((i + 1) * LIST, x.ranked.length).toLocaleString ()}`;
    freqPick.innerHTML = Array.from ({ length: x.count }, (_, i) => `<option value="${i}">${range (i)}</option>`).join ("");
    freqPick.value = String (pickedList[listKey ()]);
    const book = bookList.find ((b) => b.id === theBook ())?.name ?? "";
    top.set (byFreq () ? `${picked === "book" ? book : t} frequency${x.count ? " " + range (pickedList[listKey ()]) : ""}` : NAMES[picked]);
    // (Each row's mark: − a word not known - made known -, + a known one - back to learn -; a known word greyed. In
    // KNOWN WORDS itself, its words as any list's: − taking one off - no longer known, back in the lists it's in)
    const known = new Set (picked === "known" ? [] : knownWords ());
    listEl.innerHTML = words (x).filter ((k) => d.has (k)).map ((k) => {
      const w = d.get (k)!, isKnown = known.has (k);
      return `<div class="vocabRow${isKnown ? " vocabKnown" : ""}"><span class="${hebrew ? "heWord" : "grWord"}">${esc (w.lemma)}</span><span>${esc (w.meaning)}</span><span class="n">${w.count.toLocaleString ()}</span>`
        + `<button class="pill icon vocabMark" data-mark="${esc (k)}" aria-label="${isKnown ? "Back to learn" : picked === "known" ? "Off Known words" : "Known"}">${isKnown ? "+" : "−"}</button></div>`;
    }).join ("");
  };
  // The list picked as flashcards. Under the card (cards.ts' remove): in My vocab REMOVE FROM LIST (off My vocab); in
  // Known words REMOVE FROM LIST (no longer known: its helps back); in the frequency lists + KNOWN WORDS (known: into
  // Known words). The bar's middle: the word list's icon.
  const open = async () => {
    const remove = (c: WordCard) => {
      if (picked === "learn") { delete learning[c.strong]; save (); }
      else if (picked === "known") unsetKnown (c.strong);
      else { delete learning[c.strong]; save (); setKnown (c.strong); }
      refresh ();
    };
    const n = ++opening;
    if (picked === "verbs") { showDeck (deckEl, paradigmCards ()); return; }     // (Front the form, the back under it once turned)
    if (isBasic ()) {     // (ALPHABET, NUMBERS, BOOK NAMES: their cards as the words', nothing to take off)
      const cs = (await basics (db, picked, t)).map ((x) => basicCard (x));
      if (n === opening) showDeck (deckEl, cs, { backOnly: true, middle: listBtn });
      return;
    }
    const known = new Set (knownWords ());
    const cards = await cardsFor (words (await lists ()).filter ((k) => picked === "known" || ! known.has (k)));     // (A known word in the frequency lists: listed, not a card)
    if (n !== opening) return;
    if (! cards.length) { deckEl.innerHTML = `<p>No words here yet.</p>`; return; }
    showDeck (deckEl, cards, { backOnly: true, middle: listBtn,     // (Turned over: only the English)
      remove: { label: byFreq () ? "+ Known words" : "Remove from list", done: remove } });     // (Under the card)
  };
  const both = () => { refresh (); open (); };
  langPick.addEventListener ("change", () => { picks.lang = langPick.value as "H" | "G"; keepPicks (); draw (body); });     // (Another language: its lists, books and stems)
  listBtn.addEventListener ("click", () => { listShown = ! listShown; refresh (); });
  // A list row's mark: − made known (off My vocab, into Known words), + no longer known (its helps back) - the list and
  // the cards following
  listEl.addEventListener ("click", (e) => {
    const k = (e.target as HTMLElement).closest<HTMLElement> ("[data-mark]")?.dataset.mark;
    if (! k) return;
    if (knownWords ().includes (k)) unsetKnown (k); else { delete learning[k]; save (); setKnown (k); }
    both ();
  });
  body.querySelector ("#reverse")!.addEventListener ("click", () => { reversed = ! reversed; both (); });
  bookPick.addEventListener ("change", () => { pickedBook[l] = Number (bookPick.value); both (); });
  freqPick.addEventListener ("change", () => { pickedList[listKey ()] = Number (freqPick.value); both (); });
  stemPick.addEventListener ("change", () => { pickedStem[l] = Number (stemPick.value); both (); });
  fillPick.addEventListener ("change", () => { fillIn[l] = Number (fillPick.value); both (); });
  for (const b of body.querySelectorAll<HTMLElement> ("[data-list]")) b.addEventListener ("click", () => {
    picked = b.dataset.list!;
    if (! hebrew && b.dataset.t && b.dataset.t !== t) { picks.greek = b.dataset.t as "NT" | "LXX"; keepPicks (); draw (body); return; }     // (NT or LXX FREQUENCY: Greek's testament - its counts, its book names)
    both ();
  });
  both ();
}

onScreen ("Flashcards", draw);
