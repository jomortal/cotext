// The helps (a word's gloss and parsing code) and the ⋯ menu that controls them (design/mock-hebrew.html):
// - the frequency slider hides helps for words occurring N+ times - counted by lemma (the extended Strong's key, so
//   every form of a word together) over the whole OT / NT or the book shown (FREQUENCY);
// - a word's panel flips one word by hand ("I know this word" / "Show helps"), on top of the slider;
// - MY SELECTIONS off ignores those hand choices (kept, for turning back on); SHOW HELPS shows every hidden help, faded.
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
}

const s: Settings = { slider: 0, scope: "whole", showAll: false, mine: true, modes: {} };
try { Object.assign (s, JSON.parse (localStorage.getItem (KEY) ?? "{}")); } catch { /* none kept, or private mode */ }
const save = () => { try { localStorage.setItem (KEY, JSON.stringify (s)); } catch { /* private mode: not kept */ } };

/** One scope's counts: each lemma's, and all of them sorted high to low (for "learn the X most common"). */
interface Counts { byStrong: Map<string, number>; sorted: number[]; }
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
    c = { byStrong: new Map (rows.map ((r) => [String (r.strong), Number (r.count)])), sorted: rows.map ((r) => Number (r.count)) };
    cache.set (key, c);
  }
  return c;
}

/** The slider's limit: helps hidden at this count and above (Infinity: none). A log curve, so each step of the
 *  slider is the same ratio: 1 the most frequent word's count, 100 two. */
function limit (): number {
  if (s.slider <= 0) return Infinity;
  const top = Math.max (2, counts ().sorted[0] ?? 2);
  return Math.max (2, Math.round (top * Math.pow (2 / top, s.slider / 100)));
}

/** How many lemmas occur at least n times (sorted is high to low: a binary search for the first below n). */
function wordsAtLeast (n: number): number {
  const a = counts ().sorted;
  let lo = 0, hi = a.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] >= n) lo = m + 1; else hi = m; }
  return lo;
}

/** Whether a word's helps are hidden: its hand choice (if MY SELECTIONS), else the slider. */
export function isHidden (strong: string): boolean {
  const mode = s.mine ? s.modes[strong] : undefined;
  if (mode) return mode === "hide";
  return (counts ().byStrong.get (strong) ?? 0) >= limit ();
}

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

/** Marks the chapter's words: .known on those whose helps are hidden (style.css hides or fades them). */
export function applyHelps () {
  for (const el of document.querySelectorAll<HTMLElement> ("#chapter .w"))
    el.classList.toggle ("known", isHidden (el.dataset.strong!));
  document.body.classList.toggle ("showAll", s.showAll);
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
const mineBtn = document.getElementById ("mine")!;
const scopeBtn = document.getElementById ("scope")!;
const slider = document.getElementById ("freq") as HTMLInputElement;
const freqOut = document.getElementById ("freqOut")!;

function updateMenu () {
  showAllBtn.setAttribute ("aria-pressed", String (s.showAll));
  mineBtn.setAttribute ("aria-pressed", String (s.mine));
  const where = s.scope === "book" ? book.name : `whole ${book.testament}`;
  scopeBtn.textContent = `Frequency: ${where}`;
  scopeBtn.setAttribute ("aria-pressed", String (s.scope === "book"));
  slider.value = String (s.slider);
  const n = limit ();
  freqOut.innerHTML = n === Infinity ? "Helps for every word"
    : `Helps hidden for words occurring <b>${n.toLocaleString ()}+</b> times - learn the <b>${wordsAtLeast (n).toLocaleString ()}</b>`
      + ` most common words in ${s.scope === "book" ? book.name : "the " + book.testament} to read them`;
}

optionsBtn.addEventListener ("click", () => {
  const open = options.hidden;
  options.hidden = ! open;
  optionsBtn.setAttribute ("aria-expanded", String (open));
  optionsBtn.textContent = open ? "✕" : "⋯";     // ⋯ opens the menu; ✕ while open closes it
});
showAllBtn.addEventListener ("click", () => { s.showAll = ! s.showAll; changed (); });
mineBtn.addEventListener ("click", () => { s.mine = ! s.mine; changed (); });
scopeBtn.addEventListener ("click", () => { s.scope = s.scope === "book" ? "whole" : "book"; changed (); });
slider.addEventListener ("input", () => { s.slider = Number (slider.value); changed (); });
