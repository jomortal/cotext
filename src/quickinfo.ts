// QUICK INFO (the ⋯ menu; off at first, kept on the device: helps.ts): a word of the text touched - a finger, a pen or a
// mouse - shows its short info at once in a pop-up beside it, until the finger lifts. The pop-up (.quickPop: an
// overlay and a box, as the menus are - style.css) holds the head of the word's panel, written by the panel's own
// fillHead (panel.ts): the word as written, its English here, its parsing spelled out and the meaning to learn. It sits
// above the word, or below it where there's no room above, never over the word, and lets every touch through.
// A press on a word, in time (HOLD):
// - lifted sooner, not moved: a tap - the word's panel opens as before (the pop-up only flashed);
// - moved past SLOP sooner: a scroll (or a swipe turning the chapter) - the pop-up closes and the text scrolls;
// - held still till HOLD: the pop-up stays until the finger lifts (no panel), and the finger slid onto another word of
//   the same text shows that word instead - the text doesn't scroll meanwhile (its touchmove's default prevented).
// Off, nothing here acts: a tap opens the word's panel as before.

import type { Db } from "./db";
import { wordOf } from "./reader";
import { readHead, fillHead } from "./panel";
import { spelledInto } from "./grammar";
import { quickInfoOn } from "./helps";
import { box, px, winW } from "./zoom";

const HOLD = 300;     // (ms: shorter a tap or a scroll, longer a look)
const SLOP = 8;     // (CSS px the finger may move and still be a tap or a hold)
const GAP = 6;     // (CSS px between the word and the pop-up)

// The pop-up, one for the page: its pieces the panel head's (panel.ts' HeadParts), by the same classes.
const pop = document.createElement ("div");
pop.className = "quickPop";
pop.hidden = true;
const piece = (tag: string, cls: string) => { const e = document.createElement (tag); e.className = cls; return e; };
const parts = { form: piece ("span", "lemma form"), formTranslit: piece ("span", "translit formTranslit"),
                formGloss: piece ("span", "formGloss"), full: piece ("div", "full"), vocabGloss: piece ("div", "vocabGloss") };
{ const heads = piece ("div", "heads"), root = piece ("span", "root");     // (The word in a .root, as the panel's: at the start whatever its direction)
  root.append (parts.form);
  heads.append (root, parts.formTranslit, parts.formGloss, parts.full, parts.vocabGloss); pop.append (heads); document.body.append (pop); }

/** The press now: its pointer, where it began, the text it began in, the word shown, held (past HOLD, still). */
let press: { id: number; x: number; y: number; text: HTMLElement; db: Db; word: Element; held: boolean; timer: number } | null = null;
let ended: "tap" | "held" | "moved" = "tap";     // (How the last press ended: only a tap lets the click through, only a hold keeps a swipe from turning the chapter)
let showing = 0;     // (Counts the words asked for: an answer for one no longer wanted is dropped)

/** Shows the word's pop-up once its head is read (the press over or on another word by then: dropped). */
function show (word: Element, db: Db) {
  const w = wordOf (word);
  if (! w) return;
  const n = ++showing;
  readHead (db, w).then ((head) => {
    if (n !== showing || ! press) return;
    fillHead (parts, w, head, (el, spelled) => spelledInto (el, spelled));     // (The parsing plain: nothing in the pop-up is tapped)
    pop.hidden = false;
    place (word);
  }, () => {});
}

/** Above the word, its middle over the word's, inside the window's side margins; below where there's no room above. */
function place (word: Element) {
  pop.style.left = pop.style.top = "0px";
  const w = box (word), p = box (pop), m = parseFloat (getComputedStyle (pop).getPropertyValue ("--margin")) || 0;
  const left = Math.max (m, Math.min (w.left + w.width / 2 - p.width / 2, winW () - m - p.width));
  const above = w.top - GAP - p.height;
  pop.style.left = `${left}px`;
  pop.style.top = `${above >= m ? above : w.bottom + GAP}px`;
}

function end (how: typeof ended) {
  if (! press) return;
  clearTimeout (press.timer);
  press = null;
  ended = how;
  showing++;
  pop.hidden = true;
}

/** QUICK INFO for the words drawn into text (reader.ts' showChapter) - the chapter read, the notes' Hebrew OT. Once per
 *  element, whatever is drawn into it after. */
const wired = new WeakSet<HTMLElement> ();
export function quickInfo (text: HTMLElement, db: Db) {
  if (wired.has (text)) return;
  wired.add (text);
  text.addEventListener ("pointerdown", (e) => {
    const word = (e.target as Element).closest (".w");
    if (! quickInfoOn () || ! e.isPrimary || e.button !== 0 || ! word || ! text.contains (word)) return;
    end ("moved");
    const p = { id: e.pointerId, x: px (e.clientX), y: px (e.clientY), text, db, word, held: false, timer: 0 };
    p.timer = window.setTimeout (() => { p.held = true; }, HOLD);
    press = p;
    show (word, db);
  });
  // (A tap that wasn't one - held or moved - opens no panel: stopped before the word's own click, reader.ts)
  text.addEventListener ("click", (e) => { if (quickInfoOn () && ended !== "tap") e.stopPropagation (); }, { capture: true });
  // (A held finger slides from word to word: the text doesn't scroll under it, nor a long press select or call a menu)
  text.addEventListener ("touchmove", (e) => { if (press?.held) e.preventDefault (); }, { passive: false });
  text.addEventListener ("touchend", (e) => { if (ended === "held") e.preventDefault (); }, { passive: false });     // (No swipe after a hold - bars.ts' onSwipe)
  text.addEventListener ("contextmenu", (e) => { if (quickInfoOn ()) e.preventDefault (); });
}

addEventListener ("pointermove", (e) => {
  const p = press;
  if (! p || e.pointerId !== p.id) return;
  if (! p.held) { if (Math.hypot (px (e.clientX) - p.x, px (e.clientY) - p.y) > SLOP) end ("moved"); return; }
  const word = document.elementFromPoint (e.clientX, e.clientY)?.closest (".w");
  if (word && word !== p.word && p.text.contains (word)) { p.word = word; show (word, p.db); }
}, { passive: true });
addEventListener ("pointerup", (e) => { if (press && e.pointerId === press.id) end (press.held ? "held" : "tap"); });
addEventListener ("pointercancel", (e) => { if (press && e.pointerId === press.id) end ("moved"); });     // (The browser scrolling: the pop-up closes)
