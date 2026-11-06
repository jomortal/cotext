// The page's layout by the window's width and the pointer (style.css's @media blocks, at the same 700 px; and the room
// left beside the panes):
// - Narrow (a desktop's narrow window - a phone's or a touch screen's is one-pane, below): one column - the heading, the text, the word's panel, the
//   notes panel, the second word's panel, the search pane, the play bar - the panels sharing the room evenly with the
//   text (style.css; --docks, below).
// - Wide (a desktop - a touch screen's is one-pane, below): columns between the heading and the play bar (index.html's #textCol, #paneCol) - the
//   text, then at the RIGHT one column, a third of the width at first, for the panes: the search pane on top, the
//   notes panel under it - text | search over notes. Both open, each takes half the column's room at first (the room
//   its dividers and the second word's panel leave); one alone takes it all; neither, and the column and its divider
//   are gone, the text taking the room. Each word's panel (unless beside the text, below) at the foot of what it's
//   about (the text's word under the text; a word of the notes' Hebrew OT under the notes, at the column's foot), as wide
//   as its column. Dividers set the sizes by dragging (pointer events, so a finger, a pen or a mouse): #notesSplit, on
//   the column's left edge (its width, 22-60 % of the window), #paneSplit, between the search and the notes (the
//   search's share of the two, each keeping 120 px at least), and #sheetSplit / #besideSplit, on each word's panel's top edge
//   (its height, from 120 px to the room between the bars less 160 px for what's above it). All kept on the device
//   (localStorage) and set on the root as --notesW, --searchH (percentages, unitless), --sheetH and --besideH (px).
//   A verse card's word's panel (over the Verse cards screen, at its foot: panel.ts' #cardSheet) has its own, #cardSplit:
//   its height (--cardH, px; 120 px to the window's height less 160).
// - The word beside the text (wide, with 1200 px or more for the text and its word once the panes' column is taken
//   off, while either pane is open: placeWord, body.sideWord in style.css): the text's word's panel a column of its
//   own between the text and the panes - text | word | panes -, its width (--sheetW, a percentage, unitless: 15 % up -
//   as wide as the text keeping 30 % of the window allows) set by #sheetSplit, now a vertical divider on its left edge.
// - One pane (ONE_PANE: style.css' ONE PANE media query, the same): a phone (PHONE), or any touch screen - an iPad,
//   its narrow Split View windows too (pointer: coarse) -, upright or sideways - one panel at a time (below):
//   the word's panel (#sheet - or #besideSheet, for a word tapped in the notes), the add-verse box, the notes or the
//   search, beside the text: upright under it, sideways (bars.ts' SIDE_BAR, the play bar then down the right side) at
//   its right the full height (the heading over the text only), one divider between them (#sheetSplit upright,
//   #notesSplit sideways). The divider is at the same place on the screen both ways, measured from the screen's foot upright and
//   its right edge sideways (the ends the card is at - not the top, where the clock and the heading are) against the
//   screen's long side (--long): --cardShare, % - 40 is 40 % of the long side up from the foot upright, the same in
//   from the right sideways -, so dragging in one sets the other. The word's panel one column on a phone and sideways,
//   two upright on a touch screen wider than a phone's (wordColumns).
//   The add-verse box (#verseSheet) a card as the rest, in the same place.
//   An iPad (PAIR: a touch screen bigger than a phone's) lets the notes and the search share the panel's place:
//   upright side by side - the notes at the left, the search at the right, #paneSplit (vertical) between them at
//   --rightShare (rightShareTo), the same place as the divider between the word's panel's two columns -; sideways one
//   over the other - the search on top, #paneSplit (horizontal) at the search's share of the height (--searchH).
// The notes panel follows the text both ways while wide (notes.ts' TWO-WAY SCROLLING).

import { barRoom, SIDE_BAR } from "./bars";
const PHONE = matchMedia ("(max-width: 600px), (max-height: 500px)");     // (style.css' phone media query: keep the two the same)
const ONE_PANE = matchMedia ("(max-width: 600px), (max-height: 500px), (pointer: coarse)");     // (style.css' ONE PANE media query: keep the two the same)
const PAIR = matchMedia ("(min-width: 600.02px) and (min-height: 500.02px) and (pointer: coarse)");     // (style.css' PAIR media queries: keep them the same)
/** PAIR upright: the notes and the search side by side (sideways - SIDE_BAR -, one over the other). */
const sideBySide = () => PAIR.matches && ! SIDE_BAR.matches;
/** The word's panel's columns now while one-pane: 1 on a phone, 2 on a touch screen bigger than a phone's (an iPad's:
 *  PAIR); null otherwise - as many as fit (panel.ts' columns). */
export const wordColumns = (): 1 | 2 | null => ! ONE_PANE.matches ? null : PAIR.matches ? 2 : 1;
/** PAIR sideways: the word's panel's two parts one over the other, as the search over the notes - the word's info on
 *  top, the lexicon under it (style.css), #wordSplit at the search's share of the height (--searchH). */
export const wordStacked = () => PAIR.matches && SIDE_BAR.matches;
const WIDE = matchMedia ("(min-width: 700px)");     // (style.css's breakpoint: keep the two the same)
/** Whether the page is laid out wide now. */
export const isWide = () => WIDE.matches;
/** Calls f whenever the layout changes between narrow and wide. */
export const onWideChange = (f: () => void) => WIDE.addEventListener ("change", f);

const KEY = "cotext.splits";
const root = document.documentElement.style;
const sizes: { notesW?: number; searchH?: number; sheetH?: number; sheetW?: number; besideH?: number; cardH?: number; paneH?: number; verseH?: number; cardShare?: number; rightShare?: number; printShare?: number; printW?: number } = {};
try { Object.assign (sizes, JSON.parse (localStorage.getItem (KEY) ?? "{}")); } catch { /* none kept, or private mode */ }
if (sizes.notesW) root.setProperty ("--notesW", String (sizes.notesW));
if (sizes.searchH) root.setProperty ("--searchH", String (sizes.searchH));
if (sizes.sheetH) root.setProperty ("--sheetH", sizes.sheetH + "px");
if (sizes.besideH) root.setProperty ("--besideH", sizes.besideH + "px");
if (sizes.cardH) root.setProperty ("--cardH", sizes.cardH + "px");
if (sizes.sheetW) root.setProperty ("--sheetW", String (sizes.sheetW));
if (sizes.paneH) root.setProperty ("--paneH", sizes.paneH + "px");
if (sizes.verseH) root.setProperty ("--verseH", sizes.verseH + "px");
if (sizes.cardShare) root.setProperty ("--cardShare", String (sizes.cardShare));
if (sizes.rightShare) root.setProperty ("--rightShare", String (sizes.rightShare));
if (sizes.printShare) root.setProperty ("--printShare", String (sizes.printShare));
if (sizes.printW) root.setProperty ("--printW", String (sizes.printW));
root.setProperty ("--long", `${Math.max (screen.width, screen.height)}px`);     // (The screen's long side, either way up: the card divider's measure)
if (sizes.paneH || sizes.verseH || sizes.sheetH) document.body.classList.add ("panesSized");     // (Narrow: the panels at their heights as last dragged, the text taking the rest - sizeBelow)
const keep = () => { try { localStorage.setItem (KEY, JSON.stringify (sizes)); } catch { /* private mode: not kept */ } };

/** A divider dragged: move (x, y) called with the pointer's place each frame it moves; kept when let go. */
function drag (el: HTMLElement, move: (x: number, y: number) => void) {
  el.addEventListener ("pointerdown", (e) => {
    e.preventDefault ();
    el.setPointerCapture (e.pointerId);
    el.classList.add ("on");
    const onMove = (m: PointerEvent) => move (m.clientX, m.clientY);
    const end = () => {
      el.classList.remove ("on");
      el.removeEventListener ("pointermove", onMove);
      el.removeEventListener ("pointerup", end);
      el.removeEventListener ("pointercancel", end);
      keep ();
    };
    el.addEventListener ("pointermove", onMove);
    el.addEventListener ("pointerup", end);
    el.addEventListener ("pointercancel", end);
  });
}

const clamp = (v: number, lo: number, hi: number) => Math.min (hi, Math.max (lo, v));

/** The Study printout's divider (chapterstudy.ts; style.css' .cstudy) - narrow, horizontal, the preview over the editor:
 *  the preview's share of the room's height, % (--printShare, 15-85; half until dragged); wide, vertical, the preview
 *  at the left: its share of the width (--printW, 30-80; two thirds until dragged). Each kept. */
export function printSplit (split: HTMLElement, box: HTMLElement) {
  const turn = () => split.setAttribute ("aria-orientation", WIDE.matches ? "vertical" : "horizontal");
  turn (); WIDE.addEventListener ("change", turn);
  drag (split, (x, y) => {
    const r = box.getBoundingClientRect ();
    if (WIDE.matches) {
      sizes.printW = Math.round (clamp ((x - r.left) / r.width * 100, 30, 80));
      root.setProperty ("--printW", String (sizes.printW));
    } else {
      sizes.printShare = Math.round (clamp ((y - r.top) / r.height * 100, 15, 85));
      root.setProperty ("--printShare", String (sizes.printShare));
    }
  });
}

// One place for two side-by-side dividers: the word's panel's, between its two columns (the lexicon at the left, the
// word's info at the right), and PAIR's, between the notes and the search - --rightShare, % of the box's width from
// the divider's middle to its right edge (20-80 %), so the two stand at the same place; dragging either moves both.
/** The right-hand side's share (%), as last dragged; undefined until then - the word's info as wide as it needs and the
 *  search half (panel.ts' columns, style.css' PAIR). */
export const rightShare = () => sizes.rightShare;
function rightShareTo (box: HTMLElement, x: number) {
  const r = box.getBoundingClientRect ();
  sizes.rightShare = Math.round (clamp ((r.right - x) / r.width * 100, 20, 80) * 10) / 10;
  root.setProperty ("--rightShare", String (sizes.rightShare));
}
/** A word's panel's divider between its two columns (the panel's scroller, scroll): dragged, --rightShare; relayout ()
 *  lays this panel out by it. */
export function wordSplit (split: HTMLElement, scroll: HTMLElement, relayout: () => void) {
  wordSplits.push (split); pairSplit ();
  drag (split, (x, y) => {
    if (! wordStacked ()) { rightShareTo (scroll, x); relayout (); return; }
    const r = scroll.getBoundingClientRect (), gap = parseFloat (getComputedStyle (scroll).rowGap) || 0, half = split.offsetHeight / 2;
    const room = r.height - 2 * (half + gap);     // (The info's and the lexicon's heights together, as the search's and the notes')
    sizes.searchH = Math.round (clamp ((y - r.top - half - gap) / room * 100, 20, 80) * 10) / 10;
    root.setProperty ("--searchH", String (sizes.searchH));
  });
}
const wordSplits: HTMLElement[] = [];
const NOTES_W = 33.333;     // (The panes' column's width at first, % of the window: style.css' fallback the same)
const notesEl = document.getElementById ("notes")!, searchEl = document.getElementById ("search")!;
const notesSplit = document.getElementById ("notesSplit")!;
/** The panes' column's share of the window (%) while either pane is open, else 0. */
const panesShare = () => notesEl.hidden && searchEl.hidden ? 0 : sizes.notesW ?? NOTES_W;
// The panes' column's width: from its divider to the window's right edge, as a share of the width, 22-60 % (the
// text keeping 40 % at least).
// Narrow (not one-pane), the same divider lies between the word's panel and the panes under it (both open): the panes'
// height (sizeBelow). One-pane sideways: the divider between the text and the panel (cardShareTo).
const narrowSplit = () => notesSplit.setAttribute ("aria-orientation", WIDE.matches || SIDE_BAR.matches ? "vertical" : "horizontal");
narrowSplit (); WIDE.addEventListener ("change", narrowSplit); SIDE_BAR.addEventListener ("change", narrowSplit);
drag (notesSplit, (x, y) => {
  if (ONE_PANE.matches) { cardShareTo (innerWidth - x); return; }
  if (! WIDE.matches) { sizeBelow (notesSplit, y); return; }
  sizes.notesW = Math.round (clamp ((innerWidth - x) / innerWidth * 100, 22, 60) * 10) / 10;
  root.setProperty ("--notesW", String (sizes.notesW));
  placeWord ();
});
// The search's height against the notes' (both open; the search on top): its share (%) of the room the two have
// between them - the column less its dividers and the second word's panel (style.css gives them flex-grow by it) -,
// from the search's top to the divider's middle, each pane keeping 120 px at least - PAIR sideways too. PAIR upright
// (side by side, the search at the right): the divider's place, --rightShare (rightShareTo).
const paneSplit = document.getElementById ("paneSplit")!;
function pairSplit () { for (const el of [paneSplit, ...wordSplits]) el?.setAttribute ("aria-orientation", sideBySide () || (el !== paneSplit && ! wordStacked ()) ? "vertical" : "horizontal"); }     // (The word's panels' too: vertical but sideways on an iPad)
pairSplit (); PAIR.addEventListener ("change", pairSplit); SIDE_BAR.addEventListener ("change", pairSplit);
drag (paneSplit, (x, y) => {
  if (sideBySide ()) { rightShareTo (paneSplit.parentElement!, x); return; }
  const s = searchEl.getBoundingClientRect (), room = s.height + notesEl.getBoundingClientRect ().height;
  if (room < 240) return;     // (Too short a column for two: left as it is)
  sizes.searchH = Math.round (clamp (y - 7 - s.top, 120, room - 120) / room * 1000) / 10;     // (7: the divider's half)
  root.setProperty ("--searchH", String (sizes.searchH));
});
// The word beside the text (body.sideWord: style.css): while wide, whenever the text and its word have at least
// SIDE px between them - the window less the panes' column and its divider, while either pane is open. Never one-pane:
// there the word's panel is a card (below).
// Kept so as the window resizes, a pane opens or closes and a divider is dragged; the text's word's divider with it,
// vertical beside the text (style.css draws a divider by its aria-orientation), else horizontal.
const SIDE = 1200;
const sheetSplit = document.getElementById ("sheetSplit")!;
let side = false;
/** Whether the text's word's panel is a column beside the text now. */
export const isSideWord = () => side;
function placeWord () {
  const w = panesShare (), panes = w ? innerWidth * w / 100 + 14 : 0;
  const now = WIDE.matches && ! ONE_PANE.matches && innerWidth - panes >= SIDE;
  if (now === side) return;
  side = now;
  document.body.classList.toggle ("sideWord", side);
  sheetSplit.setAttribute ("aria-orientation", side ? "vertical" : "horizontal");
}
placeWord ();
addEventListener ("resize", placeWord);
WIDE.addEventListener ("change", placeWord);
for (const el of [notesEl, searchEl]) new MutationObserver (placeWord).observe (el, { attributes: true, attributeFilter: ["hidden"] });

// Narrow (not one-pane), the panels open share the room with the text (style.css): their number set on the root as
// --docks, and body.docks while two or more are open (one alone keeps its own height limit).
// One-pane: one panel at a time - the word's (#sheet, or #besideSheet), the add-verse box, the notes or the search: one opening closes
// the one open (by its ✕, as if tapped, so all it does on closing is done); its ✕ closes it, the divider going and
// the text taking the screen. PAIR: the notes and the search open together, sharing one place - and both closed for
// a word (paired), either opened again brings back the other too.
const PANES = ["notes", "search"];
const together = (a: HTMLElement, b: HTMLElement) => PAIR.matches && PANES.includes (a.id) && PANES.includes (b.id);
const docks = [...document.querySelectorAll<HTMLElement> (".dock")];
const ONE = ["sheet", "besideSheet", "verseSheet", "notes", "search"];     // (The panels one-pane shows one at a time)
let shown: HTMLElement[] = [];     // (Those of them open, as last seen - so one just opened is told from the rest)
let paired = false;     // (PAIR: the notes and the search both open when a word's panel closed them)
const countDocks = () => {
  const n = docks.filter ((d) => ! d.hidden).length;
  root.setProperty ("--docks", String (n));
  document.body.classList.toggle ("docks", n >= 2);
  const open = docks.filter ((d) => ONE.includes (d.id) && ! d.hidden), opened = open.filter ((d) => ! shown.includes (d));
  shown = open;
  if (! ONE_PANE.matches || ! opened.length) return;
  const pane = opened.find ((d) => PANES.includes (d.id));
  if (pane && paired) {     // (One of the pair opened again after a word: the other with it, by its own button)
    paired = false;
    const other = PANES.find ((id) => id !== pane.id)!;
    if (PAIR.matches && document.getElementById (other)!.hidden) document.getElementById (other + "Btn")!.click ();
  }
  const closing = open.filter ((o) => ! opened.includes (o) && ! opened.some ((d) => together (d, o)));
  if (! pane && closing.filter ((o) => PANES.includes (o.id)).length === 2) paired = PAIR.matches;     // (A word closing both)
  else if (closing.length) paired = false;
  for (const o of closing) o.querySelector<HTMLElement> (":scope > .xRow button, :scope > .top > #notesClose")?.click ();     // (The resources' ✕ on its picker's row: notes.ts)     // (The one open before closed by its own ✕ - unless the two share the place: PAIR)
};
countDocks ();
for (const d of docks) new MutationObserver (countDocks).observe (d, { attributes: true, attributeFilter: ["hidden"] });
// One-pane: the divider dragged between the text and the panel - its middle d px from the window's foot
// (upright) or right edge (sideways), as a share of the screen's long side, 20-80 %, kept for both orientations
// (--cardShare: style.css), so it stays put as the device turns.
function cardShareTo (d: number) {
  sizes.cardShare = Math.round (clamp (d / Math.max (screen.width, screen.height) * 100, 20, 80) * 10) / 10;
  root.setProperty ("--cardShare", String (sizes.cardShare));
}

// Narrow (not one-pane), a divider dragged sets the height of the panel just under it - the word's panel's --sheetH (the wide
// layout's too), the panes' --paneH (the search's and the notes' alike), the add-verse box's --verseH, the second
// word's panel's --besideH (px; body.panesSized, style.css) - from the divider's middle to the panel's foot. Each
// panel then keeps its height as another is resized, opened or closed: the text alone takes up the change, keeping
// 120 px at least (and each panel 120 px).
const DOCK_H: Record<string, "sheetH" | "paneH" | "verseH" | "besideH"> = { sheet: "sheetH", search: "paneH", notes: "paneH", verseSheet: "verseH", besideSheet: "besideH" };
function sizeBelow (split: HTMLElement, y: number) {
  const d = docks.find ((p) => ! p.hidden && split.compareDocumentPosition (p) & Node.DOCUMENT_POSITION_FOLLOWING);
  if (! d) return;
  const r = d.getBoundingClientRect (), text = document.querySelector ("main")!.getBoundingClientRect ().height, key = DOCK_H[d.id];
  sizes[key] = Math.round (clamp (r.bottom - y - 7, 120, Math.max (120, r.height + text - 120)));     // (7: the divider's half)
  root.setProperty ("--" + key, sizes[key] + "px"); document.body.classList.add ("panesSized");
}
/** The second word's panel (panel.ts clones it from #sheet after this module ran): counted with the others. */
export function addDock (d: HTMLElement) {
  docks.push (d);
  new MutationObserver (countDocks).observe (d, { attributes: true, attributeFilter: ["hidden"] });
  countDocks ();
}

/** A pane's frame (the notes', the search's - style.css): its ✕ in a row of its own outside the scroller, fixed at the
 *  pane's upper right while the rest scrolls (even in the bounce at a scroll's end); everything else moved into the
 *  scroller (.panelScroll), returned. Its top row (.top: a picker or the search bar, then the ✕'s room) narrow is
 *  the scroller's first line, scrolling away with the rest; wide, a row of its own over the scroller, fixed at the
 *  column's top (not sticky: outside the scroller, so not even the bounce moves it). */
export function paneFrame (pane: HTMLElement, close: HTMLElement): HTMLElement {
  const scroll = document.createElement ("div");
  scroll.className = "panelScroll";
  const x = document.createElement ("div"); x.className = "xRow"; x.append (close);
  scroll.append (...pane.children); pane.append (x, scroll);
  scroll.before (scroll.querySelector<HTMLElement> (":scope > .top")!);     // (Its top row frozen over the scroller, every width)
  return scroll;
}
// A word's panel's height: from its divider down to the play bar (narrow: the divider under the text, with any panel
// open - the height of the panel under it, sizeBelow; one-pane upright: the card's share, cardShareTo); beside the text the text's word's panel's width
// instead: from its divider to the panes' divider (the window's right edge while both are closed), the text keeping
// 30 % of the window.
for (const [id, key] of [["sheetSplit", "sheetH"], ["besideSplit", "besideH"]] as const)
  drag (document.getElementById (id)!, (x, y) => {
    if (id === "sheetSplit" && side) {
      const r = notesSplit.getBoundingClientRect (), right = r.width ? r.left : document.body.getBoundingClientRect ().right, left = document.querySelector ("main")!.getBoundingClientRect ().left;
      sizes.sheetW = Math.round (clamp ((right - x) / innerWidth * 100, 15, Math.max (15, (right - left) / innerWidth * 100 - 30)) * 10) / 10;     // (As wide as the text's 30 % allows - the window's edge less a side bar)
      root.setProperty ("--sheetW", String (sizes.sheetW));
      return;
    }
    const bar = innerHeight - barRoom (document.getElementById ("playBar"));     // (The play bar's top - the window's foot while it's down the side)
    const head = document.querySelector<HTMLElement> (".head")!.getBoundingClientRect ().bottom, mid = bar - head;
    if (id === "sheetSplit" && ONE_PANE.matches) { cardShareTo (innerHeight - y); return; }     // (One-pane upright: the divider between the text and the panel)
    if (id === "sheetSplit" && ! WIDE.matches) { sizeBelow (sheetSplit, y); return; }
    sizes[key] = Math.round (clamp (bar - y, 120, Math.max (120, mid - 160)));
    root.setProperty ("--" + key, sizes[key] + "px");
  });
// A verse card's word's panel's height: from its divider down to the deck's bar.
drag (document.getElementById ("cardSplit")!, (_x, y) => {
  const bar = barRoom (document.querySelector<HTMLElement> (".vcBar"));     // (The panel stands on the deck's bar - at the foot)
  sizes.cardH = Math.round (clamp (innerHeight - bar - y, 120, Math.max (120, innerHeight - bar - 160)));
  root.setProperty ("--cardH", sizes.cardH + "px");
});
