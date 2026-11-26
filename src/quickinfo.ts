// QUICK INFO (the ⋯ menu; off at first, kept on the device: helps.ts): a word of the text touched - a finger, a pen or a
// mouse - shows its info at once in the word's own panel, in its place, as a tap would (panel.ts' peek: #sheet for the
// text read, #besideSheet for the notes' Hebrew OT), until the finger lifts. Lifted, the panel closes and whatever it
// covered (the notes, the search) comes back, as the word tapped again does (layout.ts' reopenUnderWord) - or, where the
// panel showed a word before the touch, it shows that word again.
// A press on a word, in time (HOLD):
// - lifted sooner, not moved: a tap - the word's panel stays open, as a tap opens it (a tap on the word the panel
//   already showed closes it, as before);
// - moved past SLOP sooner: a scroll (or a swipe turning the chapter) - the panel closes as on lifting, and the text scrolls;
// - held still till HOLD: the panel stays until the finger lifts, and the finger slid onto another word of the same
//   text shows that word instead - the text doesn't scroll meanwhile (its touchmove's default prevented).
// Off, nothing here acts: a tap opens the word's panel as before.

import type { Db } from "./db";
import { wordOf } from "./reader";
import type { Peek } from "./panel";
import { quickInfoOn } from "./helps";
import { px } from "./zoom";

const HOLD = 300;     // (ms: shorter a tap or a scroll, longer a look)
const SLOP = 8;     // (CSS px the finger may move and still be a tap or a hold)

/** The press now: its pointer, where it began, the text it began in and its panel, the word the panel showed before it
 *  (prior: null, none) and the word shown now, held (past HOLD, still). */
let press: { id: number; x: number; y: number; text: HTMLElement; db: Db; panel: Peek; prior: Element | null;
             word: Element; held: boolean; timer: number } | null = null;
let letClick = true;     // (The last press a tap on the word its panel already showed: its click through, to close it as before)
let afterHold = false;     // (The last press held: no swipe after it turns the chapter)

function showWord (p: NonNullable<typeof press>, word: Element) {
  const w = wordOf (word);
  if (w) p.panel.show (p.db, w, word as HTMLElement);
}

function end (how: "tap" | "held" | "moved") {
  const p = press;
  if (! p) return;
  clearTimeout (p.timer);
  press = null;
  afterHold = how === "held";
  letClick = how === "tap" && p.word === p.prior;
  if (how === "tap" || p.word === p.prior) return;     // (A tap keeps the panel it opened; a press that showed nothing new leaves it)
  const prior = p.prior && wordOf (p.prior);
  if (prior && p.prior!.isConnected) p.panel.show (p.db, prior, p.prior as HTMLElement);
  else p.panel.close ();
}

/** QUICK INFO for the words drawn into text (reader.ts' showChapter) - the chapter read, the notes' Hebrew OT -, shown
 *  in panel. Once per element, whatever is drawn into it after. */
const wired = new WeakSet<HTMLElement> ();
export function quickInfo (text: HTMLElement, db: Db, panel: Peek) {
  if (wired.has (text)) return;
  wired.add (text);
  text.addEventListener ("pointerdown", (e) => {
    const word = (e.target as Element).closest (".w");
    if (! quickInfoOn () || ! e.isPrimary || e.button !== 0 || ! word || ! text.contains (word)) return;
    end ("moved");
    const p = { id: e.pointerId, x: px (e.clientX), y: px (e.clientY), text, db, panel, prior: panel.shown (), word, held: false, timer: 0 };
    p.timer = window.setTimeout (() => { p.held = true; }, HOLD);
    press = p;
    if (word !== p.prior) showWord (p, word);
  });
  // (Only a tap on the word already shown reaches the word's own click (reader.ts): any other press has shown its word
  // already, or closed it)
  text.addEventListener ("click", (e) => { if (quickInfoOn () && ! letClick) e.stopPropagation (); }, { capture: true });
  // (A held finger slides from word to word: the text doesn't scroll under it, nor a long press select or call a menu)
  text.addEventListener ("touchmove", (e) => { if (press?.held) e.preventDefault (); }, { passive: false });
  text.addEventListener ("touchend", (e) => { if (afterHold) e.preventDefault (); }, { passive: false });     // (No swipe after a hold - bars.ts' onSwipe)
  text.addEventListener ("contextmenu", (e) => { if (quickInfoOn ()) e.preventDefault (); });
}

addEventListener ("pointermove", (e) => {
  const p = press;
  if (! p || e.pointerId !== p.id) return;
  if (! p.held) { if (Math.hypot (px (e.clientX) - p.x, px (e.clientY) - p.y) > SLOP) end ("moved"); return; }
  const word = document.elementFromPoint (e.clientX, e.clientY)?.closest (".w");
  if (word && word !== p.word && p.text.contains (word)) { p.word = word; showWord (p, word); }
}, { passive: true });
addEventListener ("pointerup", (e) => { if (press && e.pointerId === press.id) end (press.held ? "held" : "tap"); });
addEventListener ("pointercancel", (e) => { if (press && e.pointerId === press.id) end ("moved"); });     // (The browser scrolling: the panel closes)
