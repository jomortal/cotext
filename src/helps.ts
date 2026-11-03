// The helps (a word's gloss and parsing code) and the ⋯ menu that controls them (design/mock-hebrew.html):
// - the frequency slider, one number N for words and forms: a word's gloss hides when its lemma (the extended Strong's
//   key, every form together) occurs N+ times; its parsing code when the lemma in that exact form (lemma + COTEXT's
//   code, the database's form_freq) does - so a rare form of a common word keeps its parsing. Counted over the whole
//   OT / NT or the book shown (FREQUENCY);
// - a word's panel flips one word by hand: "I know this word" hides its gloss everywhere (its parsing still by the
//   form rule above), "Show helps" shows both, on top of the slider;
// - MY SELECTIONS off ignores those hand choices (kept, for turning back on); SHOW HELPS shows every hidden help, faded.
// - INTERLINEAR, PARSING and TRANSLITERATION show or hide that line under every word (transliteration off at first).
// Settings and choices are kept on the device (localStorage).

import type { Db } from "./db";
import type { Book } from "./reader";

const KEY = "cotext.helps";

interface Settings {
  slider: number;                       // 0-100: 0 hides nothing; 1-100 a limit on a curve from the most frequent word to 2
  scope: "whole" | "book";              // frequency counted over the whole testament or the book shown
  showAll: boolean;                     // SHOW HELPS: hidden helps shown, faded
  mine: boolean;                        // MY SELECTIONS: the hand choices apply
  modes: Record<string, "show" | "hide">;   // hand choices, by Strong's key
  gloss?: boolean;                      // INTERLINEAR: each word's English shown (default on)
  parse?: boolean;                      // PARSING: each word's code shown (default on)
  translit?: boolean;                   // TRANSLITERATION: each word in Latin letters under it (default off)
  verbColors?: boolean;                 // VERB COLORS: verbs' parsing colored by form (Hebrew) or tense (Greek) (default on)
}

const s: Settings = { slider: 0, scope: "whole", showAll: false, mine: true, modes: {} };
try { Object.assign (s, JSON.parse (localStorage.getItem (KEY) ?? "{}")); } catch { /* none kept, or private mode */ }
const save = () => { try { localStorage.setItem (KEY, JSON.stringify (s)); } catch { /* private mode: not kept */ } };

/** One scope's counts: each lemma's, each lemma + form's (key strong|code), and the lemmas' sorted high to low (for
 *  "learn the X most common"). */
interface Counts { byStrong: Map<string, number>; byForm: Map<string, number>; sorted: number[]; }
const cache = new Map<string, Counts> ();
let db: Db;
let book: Book;
const listeners: (() => void)[] = [];

/** Counts for the scope chosen: the whole testament (freq's book 0, its Strong's keys starting H or G) or the book. */
function counts (): Counts {
  const key = s.scope === "book" ? String (book.id) : book.testament;
  let c = cache.get (key);
  if (! c) {
    const rows = s.scope === "book"
      ? db.all ("SELECT strong, count FROM freq WHERE book = ? ORDER BY count DESC", [book.id])
      : db.all ("SELECT strong, count FROM freq WHERE book = 0 AND strong LIKE ? ORDER BY count DESC",
                [book.testament === "OT" ? "H%" : "G%"]);
    const forms = s.scope === "book"
      ? db.all ("SELECT strong, code, count FROM form_freq WHERE book = ?", [book.id])
      : db.all ("SELECT strong, code, count FROM form_freq WHERE book = 0 AND strong LIKE ?", [book.testament === "OT" ? "H%" : "G%"]);
    c = { byStrong: new Map (rows.map ((r) => [String (r.strong), Number (r.count)])),
          byForm: new Map (forms.map ((r) => [r.strong + "|" + r.code, Number (r.count)])),
          sorted: rows.map ((r) => Number (r.count)) };
    cache.set (key, c);
  }
  return c;
}

/** The slider's limit: helps hidden at this count and above (Infinity: none). A log curve, so each step of the
 *  slider is the same ratio: 1 the most frequent word's count, 99 two; 100 (all the way over) one - every help hidden. */
function limit (): number {
  if (s.slider <= 0) return Infinity;
  if (s.slider >= 100) return 1;
  const top = Math.max (2, counts ().sorted[0] ?? 2);
  return Math.max (2, Math.round (top * Math.pow (2 / top, s.slider / 99)));
}

/** How many lemmas occur at least n times (sorted is high to low: a binary search for the first below n). */
function wordsAtLeast (n: number): number {
  const a = counts ().sorted;
  let lo = 0, hi = a.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] >= n) lo = m + 1; else hi = m; }
  return lo;
}

/** Whether a word's gloss is hidden: its hand choice (if MY SELECTIONS), else the slider by its lemma's count. */
export function isHidden (strong: string): boolean {
  const mode = s.mine ? s.modes[strong] : undefined;
  if (mode) return mode === "hide";
  return (counts ().byStrong.get (strong) ?? 0) >= limit ();
}

/** Whether a word's parsing is hidden: "Show helps" by hand shows it; otherwise the slider by the lemma's count in this
 *  form (whether or not the word is known by hand: a known word's rare forms keep their parsing). */
export function isFormHidden (strong: string, code: string): boolean {
  if (s.mine && s.modes[strong] === "show") return false;
  return (counts ().byForm.get (strong + "|" + code) ?? 0) >= limit ();
}

/** Marks a word known by hand (as "I know this word"; a slider deck's REMOVE FROM LIST): its gloss hidden. */
export function setKnown (strong: string) {
  s.modes[strong] = "hide";
  s.mine = true;
  changed ();
}

/** No longer known by hand: the slider decides its helps again. */
export function unsetKnown (strong: string) {
  delete s.modes[strong];
  changed ();
}

/** The words known by hand ("I know this word"), by Strong's key. */
export function knownWords (): string[] {
  return Object.keys (s.modes).filter ((k) => s.modes[k] === "hide");
}

/** The words whose gloss the slider alone hides in the scope shown (book or testament), most frequent first, with
 *  their counts - "Flashcards for these words" (vocab.ts). */
export function sliderWords (): [string, number][] {
  const n = limit (), out: [string, number][] = [];
  if (n === Infinity) return out;
  for (const [k, c] of counts ().byStrong) if (c >= n) out.push ([k, c]);
  return out.sort ((a, b) => b[1] - a[1]);
}

/** A lemma's count in the scope shown. */
export function wordCount (strong: string): number { return counts ().byStrong.get (strong) ?? 0; }

/** The panel's button: flips the word. If the slider alone would now give the flipped state, the hand choice is
 *  dropped (back to the slider); otherwise it's set. MY SELECTIONS turns on, so the choice shows. */
export function flip (strong: string) {
  const hidden = isHidden (strong);
  delete s.modes[strong];
  s.mine = true;
  if (isHidden (strong) === hidden) s.modes[strong] = hidden ? "show" : "hide";
  changed ();
}

/** Called when anything here changes (the panel relabels its button). */
export function onHelpsChange (f: () => void) { listeners.push (f); }

/** The passage shown changed: book-scoped counts follow it. */
export function setBook (theDb: Db, b: Book) { db = theDb; book = b; }

/** Marks the chapter's words: .known on those whose gloss is hidden, .knownForm on those whose parsing is (style.css
 *  hides or fades them). */
export function applyHelps () {
  for (const el of document.querySelectorAll<HTMLElement> ("#chapter .w")) {
    el.classList.toggle ("known", isHidden (el.dataset.strong!));
    el.classList.toggle ("knownForm", isFormHidden (el.dataset.strong!, el.dataset.code ?? ""));
  }
  document.body.classList.toggle ("showAll", s.showAll);
  document.body.classList.toggle ("noGloss", s.gloss === false);
  document.body.classList.toggle ("noParse", s.parse === false);
  document.body.classList.toggle ("showTranslit", s.translit === true);
  document.body.classList.toggle ("noVerbColors", s.verbColors === false);
  updateMenu ();
}

function changed () {
  save ();
  applyHelps ();
  for (const f of listeners) f ();
}

// The ⋯ menu (index.html's #options).
const optionsBtn = document.getElementById ("optionsBtn")!;
const options = document.getElementById ("options")!;
const showAllBtn = document.getElementById ("showAll")!;
const glossBtn = document.getElementById ("showGloss")!, parseBtn = document.getElementById ("showParse")!;
const translitBtn = document.getElementById ("showTranslit")!, colorsBtn = document.getElementById ("verbColors")!;
const mineBtn = document.getElementById ("mine")!;
const scopeBtn = document.getElementById ("scope")!;
const slider = document.getElementById ("freq") as HTMLInputElement;
const freqOut = document.getElementById ("freqOut")!;

function updateMenu () {
  showAllBtn.setAttribute ("aria-pressed", String (s.showAll));
  glossBtn.setAttribute ("aria-pressed", String (s.gloss !== false));
  parseBtn.setAttribute ("aria-pressed", String (s.parse !== false));
  translitBtn.setAttribute ("aria-pressed", String (s.translit === true));
  colorsBtn.setAttribute ("aria-pressed", String (s.verbColors !== false));
  mineBtn.setAttribute ("aria-pressed", String (s.mine));
  const where = s.scope === "book" ? book.name : `whole ${book.testament}`;
  scopeBtn.textContent = `Frequency: ${where}`;
  scopeBtn.setAttribute ("aria-pressed", String (s.scope === "book"));
  slider.value = String (s.slider);
  const n = limit ();
  freqOut.innerHTML = n === Infinity ? "Helps for every word" : n === 1 ? "No helps"
    : `Helps hidden for words and forms occurring <b>${n.toLocaleString ()}+</b> times - learn the <b>${wordsAtLeast (n).toLocaleString ()}</b>`
      + ` most common words in ${s.scope === "book" ? book.name : "the " + book.testament} to read them`;
}

optionsBtn.addEventListener ("click", () => {
  const open = options.hidden;
  options.hidden = ! open;
  optionsBtn.setAttribute ("aria-expanded", String (open));
  optionsBtn.textContent = open ? "✕" : "⋯";     // ⋯ opens the menu; ✕ while open closes it
});
showAllBtn.addEventListener ("click", () => { s.showAll = ! s.showAll; changed (); });
// INTERLINEAR, PARSING and TRANSLITERATION: each shows or hides that line of every word (the body's noGloss, noParse,
// showTranslit: style.css), over what the slider and the hand choices hide.
glossBtn.addEventListener ("click", () => { s.gloss = s.gloss === false; changed (); });
parseBtn.addEventListener ("click", () => { s.parse = s.parse === false; changed (); });
translitBtn.addEventListener ("click", () => { s.translit = s.translit !== true; changed (); });
// VERB COLORS: the verbs' parsing colored by form (Hebrew) or tense (Greek), or all plain (body.noVerbColors).
colorsBtn.addEventListener ("click", () => { s.verbColors = s.verbColors === false; changed (); });
mineBtn.addEventListener ("click", () => { s.mine = ! s.mine; changed (); });
scopeBtn.addEventListener ("click", () => { s.scope = s.scope === "book" ? "whole" : "book"; changed (); });
slider.addEventListener ("input", () => { s.slider = Number (slider.value); changed (); });
