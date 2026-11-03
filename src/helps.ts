// The helps (a word's gloss and parsing code) and the ⋯ menu that controls them (design/mock-hebrew.html):
// - the frequency slider, in steps of 20 words up to 1,000 (as My vocab's frequency lists) - with how much of the text they cover (every occurrence counted) shown: it hides the gloss of the N most
//   common lemmas (the extended Strong's key, every form together), and the parsing code of a lemma in a form (lemma +
//   COTEXT's code, the database's form_freq) occurring as often as the Nth word does - so a rare form of a common word
//   keeps its parsing. Counted over the whole OT / NT or the book shown (FREQUENCY);
// - a word's panel flips one word by hand: "+ Known words" hides its gloss everywhere (its parsing still by the
//   form rule above), "Show helps" shows both, on top of the slider;
// - HIDE KNOWN WORDS off ignores those hand choices (kept, for turning back on).
// - INTERLINEAR, PARSING and TRANSLITERATION show or hide that line under every word (transliteration off at first).
// Settings and choices are kept on the device (localStorage).

import type { Db } from "./db";
import type { Book } from "./reader";
import { onScreen, openScreen } from "./study";

const KEY = "cotext.helps";

interface Settings {
  slider: number;                       // how many of the most common words the slider hides: 0 none, 20s up to 1,000
  scope: "whole" | "book";              // frequency counted over the whole testament or the book shown
  mine: boolean;                        // HIDE KNOWN WORDS: the hand choices apply
  modes: Record<string, "show" | "hide">;   // hand choices, by Strong's key
  gloss?: boolean;                      // INTERLINEAR: each word's English shown (default on)
  parse?: boolean;                      // PARSING: each word's code shown (default on)
  translit?: boolean;                   // TRANSLITERATION: each word in Latin letters under it (default off)
  verbColors?: boolean;                 // VERB COLORS: verbs' parsing colored by form (Hebrew) or tense (Greek) (default on)
}

const s: Settings = { slider: 0, scope: "whole", mine: true, modes: {} };
try { Object.assign (s, JSON.parse (localStorage.getItem (KEY) ?? "{}")); } catch { /* none kept, or private mode */ }
const save = () => { try { localStorage.setItem (KEY, JSON.stringify (s)); } catch { /* private mode: not kept */ } };

/** One scope's counts: each lemma's, each lemma + form's (key strong|code), the lemmas' counts sorted high to low,
 *  and each lemma's place in that order (0 the most common; ties by key, so it never changes). */
interface Counts { byStrong: Map<string, number>; byForm: Map<string, number>; sorted: number[]; rank: Map<string, number>;
  cum: number[]; }     // (cum[i]: the occurrences of the i most common lemmas, cum[0] 0 - the coverage's)
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
      ? db.all ("SELECT strong, count FROM freq WHERE book = ? ORDER BY count DESC, strong", [book.id])
      : db.all ("SELECT strong, count FROM freq WHERE book = 0 AND strong LIKE ? ORDER BY count DESC, strong",
                [book.testament === "OT" ? "H%" : "G%"]);
    const forms = s.scope === "book"
      ? db.all ("SELECT strong, code, count FROM form_freq WHERE book = ?", [book.id])
      : db.all ("SELECT strong, code, count FROM form_freq WHERE book = 0 AND strong LIKE ?", [book.testament === "OT" ? "H%" : "G%"]);
    c = { byStrong: new Map (rows.map ((r) => [String (r.strong), Number (r.count)])),
          byForm: new Map (forms.map ((r) => [r.strong + "|" + r.code, Number (r.count)])),
          sorted: rows.map ((r) => Number (r.count)), rank: new Map (rows.map ((r, i) => [String (r.strong), i])), cum: [0] };
    for (const n of c.sorted) c.cum.push (c.cum[c.cum.length - 1] + n);
    cache.set (key, c);
  }
  return c;
}

/** How many of the most common words the slider hides in the scope shown: at most every word there. */
function hiddenWords (): number { return Math.min (s.slider, 1000, counts ().sorted.length); }

/** How much of the scope's text the n most common words make up, 0-1. */
function coverage (n: number): number { const c = counts ().cum; return c[Math.min (n, c.length - 1)] / (c[c.length - 1] || 1); }

/** The slider's positions: 0 none, 1-50 20 to 1,000 words in 20s - past that the ⋯ menu's INTERLINEAR and PARSING
 *  turn the helps off. A scope with fewer words ends sooner (sliderMax), its last position every word. */
const wordsAt = (pos: number) => Math.max (0, pos) * 20;
function sliderMax (): number { return Math.min (50, Math.ceil (counts ().sorted.length / 20)); }
function wordsFor (pos: number): number { return wordsAt (Math.min (pos, sliderMax ())); }

/** The parsing's limit: a form's parsing hidden at this count and above - the last hidden word's count (Infinity:
 *  none hidden; all the way over, 1: every parsing). */
function limit (): number {
  const n = hiddenWords (), c = counts ();
  return n <= 0 ? Infinity : n >= c.sorted.length ? 1 : c.sorted[n - 1];
}

/** Whether a word's gloss is hidden: its hand choice (if HIDE KNOWN WORDS), else the slider by its lemma's place. */
export function isHidden (strong: string): boolean {
  const mode = s.mine ? s.modes[strong] : undefined;
  if (mode) return mode === "hide";
  return (counts ().rank.get (strong) ?? Infinity) < hiddenWords ();
}

/** Whether a word's parsing is hidden: "Show helps" by hand shows it; otherwise the slider by the lemma's count in this
 *  form (whether or not the word is known by hand: a known word's rare forms keep their parsing). */
export function isFormHidden (strong: string, code: string): boolean {
  if (s.mine && s.modes[strong] === "show") return false;
  return (counts ().byForm.get (strong + "|" + code) ?? 0) >= limit ();
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

/** A lemma's count in the scope shown. */
export function wordCount (strong: string): number { return counts ().byStrong.get (strong) ?? 0; }

/** The panel's button: flips the word. If the slider alone would now give the flipped state, the hand choice is
 *  dropped (back to the slider); otherwise it's set. HIDE KNOWN WORDS turns on, so the choice shows. */
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
/** The book shown (Vocab's BOOK FREQUENCY, until another is picked). */
export function currentBook (): Book { return book; }

/** Marks the chapter's words: .known on those whose gloss is hidden, .knownForm on those whose parsing is (style.css
 *  hides or fades them). */
export function applyHelps () {
  for (const el of document.querySelectorAll<HTMLElement> ("#chapter .w")) {
    el.classList.toggle ("known", isHidden (el.dataset.strong!));
    el.classList.toggle ("knownForm", isFormHidden (el.dataset.strong!, el.dataset.code ?? ""));
  }
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
const mineBtn = document.getElementById ("mine")!;
const scopeBtn = document.getElementById ("scope")!;
const slider = document.getElementById ("freq") as HTMLInputElement;
const freqOut = document.getElementById ("freqOut")!;

function updateMenu () {
  glossBtn.setAttribute ("aria-pressed", String (s.gloss !== false));
  parseBtn.setAttribute ("aria-pressed", String (s.parse !== false));
  translitBtn.setAttribute ("aria-pressed", String (s.translit === true));
  colorsBtn.setAttribute ("aria-pressed", String (s.verbColors !== false));
  mineBtn.setAttribute ("aria-pressed", String (s.mine));
  const where = s.scope === "book" ? book.name : `whole ${book.testament}`;
  scopeBtn.textContent = `Frequency: ${where}`;
  scopeBtn.setAttribute ("aria-pressed", String (s.scope === "book"));
  const all = counts ().sorted.length, n = hiddenWords ();
  slider.max = String (sliderMax ());
  slider.value = String (Math.ceil (n / 20));
  const pct = coverage (n) * 100, inWhat = s.scope === "book" ? book.name : "the " + book.testament;
  freqOut.innerHTML = n === 0 ? "Helps for every word" : n >= all ? "No helps"
    : `Helps hidden for the <b>${n.toLocaleString ()}</b> most common words - <b>${pct < 99.95 ? pct.toFixed (1) : "99.9"}%</b> of the words in ${inWhat}`
      + ` (and forms occurring <b>${limit ().toLocaleString ()}+</b> times)`;
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
    <p>The colors pair up: red the main line of a story (wayyiqtol, aorist), blue the plainest form (qatal, present), teal the ongoing (yiqtol, imperfect).</p>`;
});
mineBtn.addEventListener ("click", () => { s.mine = ! s.mine; changed (); });
scopeBtn.addEventListener ("click", () => { s.scope = s.scope === "book" ? "whole" : "book"; changed (); });
slider.addEventListener ("input", () => { s.slider = wordsFor (Number (slider.value)); changed (); });
