// My vocab (☰ > My vocab): each person's own list. A word's panel adds it ("+ My vocab": learning; "✓ In my vocab"
// takes it off again); "I know this word" makes it known - known is the helps' own hand choice
// (helps.ts: its gloss then hidden), so the two never disagree, and a known word leaves the learning list. The screen,
// for the testament shown: how many are learning and known, the FREQUENCY LISTS - the testament's words not yet known,
// most frequent first, in ready-made lists of 20 (list 1 the 20 most frequent; a word made known leaves its list and the
// next word moves up, so list 1 is always the 20 most frequent still to learn) -, each list (the word, its concise
// meaning, how often it occurs in the whole testament), and three decks - the learning words, the known ones, and
// "Flashcards for these words": the words the ⋯ slider hides in the book or testament (its FREQUENCY), most frequent
// first (also from ⋯). A card's front the word with a speaker that says it, turned over its concise meaning; REMOVE FROM LIST takes it off that
// list (on a frequency list's card, I KNOW THIS WORD: made known, into the known stack). Kept on the device.

import type { Db } from "./db";
import { onScreen, currentTestament, openScreen } from "./study";
import { showDeck, type Card } from "./cards";
import { knownWords, setKnown, unsetKnown, sliderWords, onHelpsChange } from "./helps";

const KEY = "cotext.vocab";
let learning: Record<string, true> = {};
try { learning = JSON.parse (localStorage.getItem (KEY) ?? "{}"); } catch { /* none kept, or private mode */ }
const save = () => { try { localStorage.setItem (KEY, JSON.stringify (learning)); } catch { /* private mode: not kept */ } };

let db: Db;
export function initVocab (theDb: Db) { db = theDb; }

const esc = (s: string) => s.replace (/[&<>"]/g, (c) => `&#${c.charCodeAt (0)};`);

// The panel's button.
const addBtn = document.getElementById ("addVocab")!;
let panelStrong = "";
const label = () => { addBtn.textContent = learning[panelStrong] ? "✓ In my vocab" : "+ My vocab"; };
/** The word the panel shows (panel.ts): its button follows it. */
export function setVocabWord (strong: string) { panelStrong = strong; label (); }
addBtn.addEventListener ("click", () => {
  if (learning[panelStrong]) delete learning[panelStrong]; else learning[panelStrong] = true;
  save (); label ();
});
onHelpsChange (() => {
  for (const k of knownWords ()) if (learning[k]) { delete learning[k]; save (); }     // (Known: no longer learning)
  if (panelStrong) label ();
});

interface WordCard extends Card { strong: string; }

/** The words' details: lemma, concise meaning and whole-testament count, by Strong's key. */
function details (strongs: string[]): Map<string, { lemma: string; meaning: string; count: number }> {
  const out = new Map<string, { lemma: string; meaning: string; count: number }> ();
  for (let i = 0; i < strongs.length; i += 500) {     // (SQLite's bound parameters, a chunk at a time)
    const part = strongs.slice (i, i + 500), q = part.map (() => "?").join (",");
    for (const r of db.all (`SELECT l.strong, l.lemma, l.concise, l.gloss, f.count FROM lexicon l
                             LEFT JOIN freq f ON f.strong = l.strong AND f.book = 0 WHERE l.strong IN (${q})`, part))
      out.set (String (r.strong), { lemma: String (r.lemma), meaning: String (r.concise || r.gloss || ""), count: Number (r.count ?? 0) });
  }
  return out;
}

/** The speaker icon, as the word panel's (index.html). */
const SPEAKER = document.getElementById ("speakRoot")!.innerHTML;

function cardsFor (strongs: string[]): WordCard[] {
  const d = details (strongs), hebrew = currentTestament () === "OT";
  return strongs.filter ((k) => d.has (k)).map ((k) => {
    const w = d.get (k)!;
    return { strong: k, back: `<div>${esc (w.meaning)}</div>`,
             front: `<span class="root"><span class="${hebrew ? "heWord" : "grWord"}">${esc (w.lemma)}</span><button class="pill icon" data-say="${esc (w.lemma)}" aria-label="Say the word">${SPEAKER}</button></span>` };
  });
}

/** The testament's words (Strong's keys, by its H / G prefix) not yet known, most frequent first: the frequency lists. */
function toLearn (prefix: string, known: string[]): string[] {
  const k = new Set (known);
  return db.all (`SELECT f.strong FROM freq f JOIN lexicon l ON l.strong = f.strong WHERE f.book = 0 AND f.strong LIKE ?
                  ORDER BY f.count DESC, f.strong`, [prefix + "%"]).map ((r) => String (r.strong)).filter ((s) => ! k.has (s));
}
const LIST = 20;                       // (Words in each frequency list)
const pickedList = { OT: 0, NT: 0 };   // (The frequency list picked, by testament: 0 the first)

let startSlider = false;
/** ⋯'s "Flashcards for these words": My vocab opened on that deck. */
export function openSliderDeck () { startSlider = true; openScreen ("My vocab"); }
document.getElementById ("sliderCards")!.addEventListener ("click", () => {
  document.getElementById ("optionsBtn")!.click ();     // (⋯ closes)
  openSliderDeck ();
});

/** My vocab's lists, worked out afresh (on drawing, and after each card's REMOVE FROM LIST / I KNOW THIS WORD). */
function lists () {
  const t = currentTestament (), prefix = t === "OT" ? "H" : "G";
  const known = knownWords ().filter ((k) => k.startsWith (prefix));
  const learn = Object.keys (learning).filter ((k) => k.startsWith (prefix) && ! known.includes (k));
  const ranked = toLearn (prefix, known);
  const d = details ([...learn, ...known]);
  const byCount = (a: string, b: string) => (d.get (b)?.count ?? 0) - (d.get (a)?.count ?? 0);
  return { t, known: known.filter ((k) => d.has (k)).sort (byCount), learn: learn.filter ((k) => d.has (k)).sort (byCount), ranked, d,
           slider: sliderWords (), count: Math.ceil (ranked.length / LIST) };
}

function draw (body: HTMLElement) {
  const t = currentTestament ();
  body.innerHTML = `<p class="vocabCount"></p>
    <div class="chartPick"><label>Frequency lists<select class="choose" id="freqPick"></select></label>
      <button class="pill" data-d="freq">Flashcards for this list</button></div>
    <div class="bar"><button class="pill" data-d="learn">Learning words as flashcards</button><button class="pill" data-d="known">Known words as flashcards</button>
      <button class="pill" data-d="slider" id="sliderDeck"></button></div>
    <div class="deck"></div>
    <div class="vocabLists"></div>`;
  const deckEl = body.querySelector<HTMLElement> (".deck")!;
  const freqPick = body.querySelector<HTMLSelectElement> ("#freqPick")!;
  // Everything but the deck shown, from the lists as they are now: a card made known moves into Known at once, and the
  // frequency lists move up (the deck open keeps its cards until it's opened again).
  const refresh = () => {
    const l = lists ();
    pickedList[t] = Math.min (pickedList[t], Math.max (0, l.count - 1));
    body.querySelector (".vocabCount")!.innerHTML = `<b>${l.learn.length.toLocaleString ()}</b> learning · <b>${l.known.length.toLocaleString ()}</b> known (${t === "OT" ? "Hebrew OT" : "Greek NT"}). Add words from a word's panel (+ My vocab); I know this word makes a word known - its gloss then hidden. On a card, Remove from list takes it off that list; on a frequency list's card, I know this word makes it known.`;
    freqPick.innerHTML = Array.from ({ length: l.count }, (_, i) =>
      `<option value="${i}">${(i * LIST + 1).toLocaleString ()}-${Math.min ((i + 1) * LIST, l.ranked.length).toLocaleString ()}</option>`).join ("");
    freqPick.value = String (pickedList[t]);
    body.querySelector ("#sliderDeck")!.textContent = `Flashcards for the slider's ${l.slider.length.toLocaleString ()} words`;
    const rows = (keys: string[]) => keys.map ((k) => {
      const w = l.d.get (k)!;
      return `<div class="vocabRow"><span class="${t === "OT" ? "heWord" : "grWord"}">${esc (w.lemma)}</span><span>${esc (w.meaning)}</span><span class="n">${w.count.toLocaleString ()}</span></div>`;
    }).join ("") || "<p>None yet.</p>";
    body.querySelector (".vocabLists")!.innerHTML = `<div class="ref">Learning</div>${rows (l.learn)}<div class="ref">Known</div>${rows (l.known)}`;
  };
  const open = (which: string) => {
    // REMOVE FROM LIST: off the list the deck is - learning (off My vocab), known (no longer known: its helps back), the
    // slider's (known: its gloss stays hidden, as the slider has it, and it leaves this deck); a frequency list's card
    // I KNOW THIS WORD: known, into the known stack.
    const remove = (c: WordCard) => {
      if (which === "learn") { delete learning[c.strong]; save (); }
      else if (which === "known") unsetKnown (c.strong);
      else { delete learning[c.strong]; save (); setKnown (c.strong); }
      refresh ();
    };
    const l = lists ();
    const cards = cardsFor (which === "learn" ? l.learn : which === "known" ? l.known
      : which === "freq" ? l.ranked.slice (pickedList[t] * LIST, (pickedList[t] + 1) * LIST) : l.slider.map ((x) => x[0]));
    if (! cards.length) { deckEl.innerHTML = `<p>${which === "slider" ? "The slider hides no words: move it in ⋯ first." : "No words here yet."}</p>`; return; }
    showDeck (deckEl, cards, remove, which === "freq" ? "I know this word" : undefined);
  };
  freqPick.addEventListener ("change", () => { pickedList[t] = Number (freqPick.value); open ("freq"); });
  for (const b of body.querySelectorAll<HTMLElement> ("[data-d]")) b.addEventListener ("click", () => open (b.dataset.d!));
  refresh ();
  if (startSlider) { startSlider = false; open ("slider"); }
}

onScreen ("My vocab", draw);
