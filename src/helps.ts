// The helps (a word's gloss and parsing code) and the ⋯ menu that controls them (design/mock-hebrew.html):
// - the frequency slider, in steps of 20 words up to 1,000 (as My vocab's frequency lists) - with how much of the text they cover (every occurrence counted) shown: it hides the gloss and the parsing
//   of the N most common words, by the root word (the lemma, its extended Strong's key: every form together), as the
//   printed reader's editions do - except a hard form's parsing and gloss, always shown: a verb whose form is hard to recognize
//   (a weak root's, an irregular one's: paradigm.ts' hardForm). Counted over the whole OT / NT / LXX (the Septuagint's
//   words counted apart from the NT's) or the book shown (FREQUENCY);
// - a word's panel marks one word known by hand: "+ Known words" hides its gloss everywhere (its parsing still by the
//   slider), on top of the slider; tapped again (✓ In known words) taken off;
// - HIDE KNOWN WORDS off ignores those hand choices (kept, for turning back on); SHOW MY VOCAB (on at first) keeps every
//   word in My vocab helped - its gloss and parsing - whatever the slider says.
// - INTERLINEAR, PARSING and TRANSLITERATION show or hide that line under every word (transliteration off at first).
// Settings and choices are kept on the device (localStorage).

import type { Db } from "./db";
import type { Book } from "./reader";
import { onScreen, openScreen } from "./study";
import { hardForm } from "./paradigm";

const KEY = "cotext.helps";

interface Settings {
  slider: number;                       // how many of the most common words the slider hides: 0 none, 20s up to 1,000
  scope: "whole" | "book";              // frequency counted over the whole testament or the book shown
  mine: boolean;                        // HIDE KNOWN WORDS: the hand choices apply
  modes: Record<string, "hide">;          // the words known by hand, by Strong's key
  gloss?: boolean;                      // INTERLINEAR: each word's English shown (default on)
  parse?: boolean;                      // PARSING: each word's code shown (default on)
  translit?: boolean;                   // TRANSLITERATION: each word in Latin letters under it (default off)
  verbColors?: boolean;
  showVocab?: boolean;                  // SHOW MY VOCAB: the words in My vocab always helped, over the slider (default on)                 // VERB COLORS: verbs' parsing colored by form (Hebrew) or tense (Greek) (default on)
}

const s: Settings = { slider: 0, scope: "whole", mine: true, modes: {} };
try { Object.assign (s, JSON.parse (localStorage.getItem (KEY) ?? "{}")); } catch { /* none kept, or private mode */ }
for (const k in s.modes) if (s.modes[k] !== "hide") delete s.modes[k];     // (A word shown by hand - SHOW HELPS, gone - back to the slider)
const save = () => { try { localStorage.setItem (KEY, JSON.stringify (s)); } catch { /* private mode: not kept */ } };

/** One scope's counts: each lemma's, each lemma + form's (key strong|code), the lemmas' counts sorted high to low,
 *  and each lemma's place in that order (0 the most common; ties by key, so it never changes). */
interface Counts { byStrong: Map<string, number>; sorted: number[]; rank: Map<string, number>;
  cum: number[]; }     // (cum[i]: the occurrences of the i most common lemmas, cum[0] 0 - the coverage's)
const cache = new Map<string, Counts> ();
let db: Db;
let book: Book;
const listeners: (() => void)[] = [];

/** Counts for the scope chosen: the whole testament (freq's book 0, its Strong's keys starting H or G; the
 *  Septuagint's book -1) or the book - the reader's, or another text's shown beside it (b: the notes panel's Hebrew OT). */
function counts (b: Book = book): Counts {
  const key = s.scope === "book" ? String (b.id) : b.testament;
  let c = cache.get (key);
  if (! c) {
    const rows = s.scope === "book" || b.testament === "LXX"
      ? db.all ("SELECT strong, count FROM freq WHERE book = ? ORDER BY count DESC, strong", [s.scope === "book" ? b.id : -1])
      : db.all ("SELECT strong, count FROM freq WHERE book = 0 AND strong LIKE ? ORDER BY count DESC, strong",
                [b.testament === "OT" ? "H%" : "G%"]);
    c = { byStrong: new Map (rows.map ((r) => [String (r.strong), Number (r.count)])),
          sorted: rows.map ((r) => Number (r.count)), rank: new Map (rows.map ((r, i) => [String (r.strong), i])), cum: [0] };
    for (const n of c.sorted) c.cum.push (c.cum[c.cum.length - 1] + n);
    cache.set (key, c);
  }
  return c;
}

/** How many of the most common words the slider hides in the scope shown: at most every word there. */
function hiddenWords (b: Book = book): number { return Math.min (s.slider, 1000, counts (b).sorted.length); }

/** How much of the scope's text the n most common words make up, 0-1. */
function coverage (n: number): number { const c = counts ().cum; return c[Math.min (n, c.length - 1)] / (c[c.length - 1] || 1); }

/** The slider's positions: 0 none, 1-50 20 to 1,000 words in 20s - past that the ⋯ menu's INTERLINEAR and PARSING
 *  turn the helps off. A scope with fewer words ends sooner (sliderMax), its last position every word. */
const wordsAt = (pos: number) => Math.max (0, pos) * 20;
function sliderMax (): number { return Math.min (50, Math.ceil (counts ().sorted.length / 20)); }
function wordsFor (pos: number): number { return wordsAt (Math.min (pos, sliderMax ())); }

// SHOW MY VOCAB: whether a word is in My vocab - vocab.ts tells (setLearning), so this module needn't know its list.
let learning: (strong: string) => boolean = () => false;
export function setLearning (f: (strong: string) => boolean) { learning = f; }

/** Whether a word's gloss is hidden: its hand choice (if HIDE KNOWN WORDS), else the slider by its lemma's place
 *  (in b's counts: the reader's book, or the text beside it). */
export function isHidden (strong: string, b: Book = book): boolean {
  if (s.showVocab !== false && learning (strong)) return false;
  const mode = s.mine ? s.modes[strong] : undefined;
  if (mode) return mode === "hide";
  return (counts (b).rank.get (strong) ?? Infinity) < hiddenWords (b);
}

const lemmas = new Map<string, string> ();     // (Strong's key -> its dictionary form, the language's - H or G - read once)
function lemmaOf (strong: string): string {
  const l = strong[0];
  if (! lemmas.has (strong) && ! lemmas.has (l))
    for (const r of db.all ("SELECT strong, lemma FROM lexicon WHERE strong LIKE ?", [l + "%"]).concat ([{ strong: l, lemma: "" }]))
      lemmas.set (String (r.strong), String (r.lemma));
  return lemmas.get (strong) ?? "";
}

/** Whether a word's parsing is hidden: a hard form's always shows; otherwise the
 *  slider by its root word's place, as its gloss (whether or not the word is known by hand: + Known words hides only
 *  the gloss). */
export function isFormHidden (strong: string, code: string, b: Book = book): boolean {
  if (s.showVocab !== false && learning (strong)) return false;
  if (hardForm (lemmaOf (strong), code, strong.startsWith ("H"))) return false;
  return (counts (b).rank.get (strong) ?? Infinity) < hiddenWords (b);
}

/** Marks a word known by hand (as "+ Known words"; a slider deck's REMOVE FROM LIST): its gloss hidden. */
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

/** The words known by hand ("+ Known words"), by Strong's key. */
export function knownWords (): string[] {
  return Object.keys (s.modes).filter ((k) => s.modes[k] === "hide");
}


/** Called when anything here changes (the panel relabels its button). */
export function onHelpsChange (f: () => void) { listeners.push (f); }

/** The passage shown changed: book-scoped counts follow it. */
export function setBook (theDb: Db, b: Book) { db = theDb; book = b; }
/** The book shown (Vocab's BOOK FREQUENCY, until another is picked). */
export function currentBook (): Book { return book; }

/** Marks the words in root: .known on those whose gloss is hidden, .knownForm on those whose parsing is (style.css
 *  hides or fades them) - counted in b's scope. */
function mark (root: ParentNode, b: Book) {
  for (const el of root.querySelectorAll<HTMLElement> (".w")) {
    // (A hard form's gloss shows as its parsing does, however common the word - unless it's known by hand)
    const strong = el.dataset.strong!, byHand = s.mine && s.modes[strong] === "hide";
    el.classList.toggle ("known", isHidden (strong, b) && (byHand || ! hardForm (lemmaOf (strong), el.dataset.code ?? "", strong.startsWith ("H"))));
    el.classList.toggle ("knownForm", isFormHidden (strong, el.dataset.code ?? "", b));
  }
}

// Another text drawn as an interlinear beside the reader's (interlinear.ts: the notes panel's Hebrew OT): its words
// helped as the reader's are, counted in its own book's scope (the slider's N most common words of the Hebrew OT, or
// of its book), marked again with every change.
let beside: [HTMLElement, Book] | null = null;
/** Helps for a text beside the reader's (its root and book), from now on; null: none. */
export function helpsBeside (root: HTMLElement | null, b?: Book) {
  beside = root && b ? [root, b] : null;
  if (beside) mark (...beside);
}

/** Marks the chapter's words (and the text's beside it), and the body's switches for every word's lines. */
export function applyHelps () {
  mark (document.getElementById ("chapter")!, book);
  if (beside) mark (...beside);
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
const glossBtn = document.getElementById ("showGloss")!, parseBtn = document.getElementById ("showParse")!;
const translitBtn = document.getElementById ("showTranslit")!, colorsBtn = document.getElementById ("verbColors")!;
const vocabBtn = document.getElementById ("showVocab")!;
const mineBtn = document.getElementById ("mine")!;
const scopeBtn = document.getElementById ("scope")!;
const slider = document.getElementById ("freq") as HTMLInputElement;
const freqOut = document.getElementById ("freqOut")!;

function updateMenu () {
  glossBtn.setAttribute ("aria-pressed", String (s.gloss !== false));
  parseBtn.setAttribute ("aria-pressed", String (s.parse !== false));
  translitBtn.setAttribute ("aria-pressed", String (s.translit === true));
  colorsBtn.setAttribute ("aria-pressed", String (s.verbColors !== false));
  vocabBtn.setAttribute ("aria-pressed", String (s.showVocab !== false));
  mineBtn.setAttribute ("aria-pressed", String (s.mine));
  const where = s.scope === "book" ? book.name : `whole ${book.testament}`;
  scopeBtn.textContent = `Frequency: ${where}`;
  scopeBtn.setAttribute ("aria-pressed", String (s.scope === "book"));
  const all = counts ().sorted.length, n = hiddenWords ();
  slider.max = String (sliderMax ());
  slider.value = String (Math.ceil (n / 20));
  const pct = coverage (n) * 100, inWhat = s.scope === "book" ? book.name : "the " + book.testament;
  freqOut.innerHTML = n === 0 ? "Helps for every word" : n >= all ? "No helps"
    : `Helps hidden for the <b>${n.toLocaleString ()}</b> most common words - <b>${pct < 99.95 ? pct.toFixed (1) : "99.9"}%</b> of the words in ${inWhat}, each occurring <b>${counts ().sorted[n - 1].toLocaleString ()}+</b> times`;     // (The last hidden word's count)
}

optionsBtn.addEventListener ("click", () => {
  const open = options.hidden;
  options.hidden = ! open;
  optionsBtn.setAttribute ("aria-expanded", String (open));
  optionsBtn.textContent = open ? "✕" : "⋯";     // ⋯ opens the menu; ✕ while open closes it
});
// INTERLINEAR, PARSING and TRANSLITERATION: each shows or hides that line of every word (the body's noGloss, noParse,
// showTranslit: style.css), over what the slider and the hand choices hide.
glossBtn.addEventListener ("click", () => { s.gloss = s.gloss === false; changed (); });
parseBtn.addEventListener ("click", () => { s.parse = s.parse === false; changed (); });
translitBtn.addEventListener ("click", () => { s.translit = s.translit !== true; changed (); });
// VERB COLORS: the verbs' parsing colored by form (Hebrew) or tense (Greek), or all plain (body.noVerbColors).
colorsBtn.addEventListener ("click", () => { s.verbColors = s.verbColors === false; changed (); });
vocabBtn.addEventListener ("click", () => { s.showVocab = s.showVocab === false; changed (); });
// ABOUT VERB COLORS: what each color means (reader.ts's verbForm groups, style.css's .vf- colors), Hebrew then Greek.
document.getElementById ("aboutColors")!.addEventListener ("click", () => { optionsBtn.click (); openScreen ("About verb colors"); });
const KEY_ROWS = (rows: [string, string, string][]) => `<div class="colorKey">${rows.map (([vf, name, what]) =>
  `<div class="vf-${vf}"><span class="parse">${name}</span><span>${what}</span></div>`).join ("")}</div>`;
onScreen ("About verb colors", (body) => {
  body.innerHTML = `<p>Each verb's parsing is colored by what matters most for following a passage: in Hebrew its form, in Greek its tense. Turn the colors off with <b>Verb colors</b> in the ⋯ menu.</p>
    <div class="ref">Hebrew: the verb's form</div>${KEY_ROWS ([
      ["wayyiqtol", "Wayyiqtol", "\"And he did…\": the main line of a story, each event after the last"],
      ["qatal", "Qatal (perfect)", "an action as a whole - background, or done before"],
      ["weqatal", "Weqatal", "\"and he will do…\": the main line of instructions, prophecy or what happens habitually"],
      ["yiqtol", "Yiqtol (imperfect)", "the future, what happens again and again, or what may be"],
      ["volitive", "Imperative, cohortative, jussive", "wishes and commands: do!, let me…, let him…"],
      ["participle", "Participle", "someone doing, or an action going on: describing"],
      ["infinitive", "Infinitive", "the action named: to do, doing"]])}
    <div class="ref">Greek: the verb's tense (its aspect - how the action is seen)</div>${KEY_ROWS ([
      ["aorist", "Aorist", "the action as a whole, as one event: the main line of a story"],
      ["present", "Present", "the action going on, or as a habit"],
      ["imperfect", "Imperfect", "the action going on in the past: the background, scene-setting"],
      ["future", "Future", "what will happen"],
      ["perfect", "Perfect", "an action done, its result still standing"],
      ["pluperfect", "Pluperfect", "an action done, its result standing in the past"]])}
    <p>The colors pair up across the languages: orange the main line of a story (wayyiqtol, aorist), red the plainest form (qatal, present), teal the ongoing (yiqtol, imperfect), green what's done or doing (participle, perfect).</p>`;
});
mineBtn.addEventListener ("click", () => { s.mine = ! s.mine; changed (); });
scopeBtn.addEventListener ("click", () => { s.scope = s.scope === "book" ? "whole" : "book"; changed (); });
slider.addEventListener ("input", () => { s.slider = wordsFor (Number (slider.value)); changed (); });
