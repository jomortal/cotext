// The page's layout - one for every screen, whatever its pointer (a finger, a pen or a mouse): the window's size and
// which way up it is pick its form (style.css' ONE PANE, SIDE BAR and PAIR media queries: keep them the same).
// - One panel at a time - the word's panel (#sheet - or #besideSheet, for a word tapped in the notes), the add-verse
//   box (#verseSheet), the notes or the search -, beside the text: upright (taller than wide) under it, sideways
//   (bars.ts' SIDE_BAR, the play bar then down the right side) at its right the full height (the heading over the text
//   only), one divider between them (#sheetSplit upright, #notesSplit sideways). The divider is at the same place on
//   the screen both ways, measured from the window's foot upright and its right edge sideways (the ends the card is at -
//   not the top, where the clock and the heading are) against the window's long side (--long: innerWidth or
//   innerHeight, the larger, kept as the window resizes): --cardShare, % - 40 is 40 % of the long side up from the foot
//   upright, the same in from the right sideways -, so dragging in one sets the other. No panel open: no divider, the
//   text the full room.
// - A phone (style.css' phone media query: a window at most 600 px wide or 500 px tall - an iPad's narrow Split View, a narrow desktop window
//   too): the word's panel one column. Anything bigger (PAIR: a tablet, a desktop window) - the word's panel in two
//   parts (wordColumns): upright side by side, sideways one over the other (wordStacked); and the notes and the search
//   share the panel's place: upright side by side - the notes at the left, the search at the right, #paneSplit
//   (vertical) between them at --rightShare (rightShareTo), the same place as the divider between the word's panel's
//   two columns -; sideways one over the other - the search on top, #paneSplit (horizontal) at the search's share of
//   the height (--searchH).
// - A verse card's word's panel (over the Verse cards screen, at its foot: panel.ts' #cardSheet) has its own divider,
//   #cardSplit: its height (--cardH, px; 120 px to the window's height less 160).
// Each divider set by dragging (pointer events: a finger, a pen or a mouse alike), kept on the device (localStorage).
// The notes panel follows the text both ways while the window is 700 px wide or more (isWide: notes.ts' TWO-WAY
// SCROLLING).

import { barRoom, SIDE_BAR } from "./bars";
const PAIR = matchMedia ("(min-width: 600.02px) and (min-height: 500.02px)");     // (style.css' PAIR media queries - not its phone's: keep them the same)
/** PAIR upright: the notes and the search side by side (sideways - SIDE_BAR -, one over the other). */
const sideBySide = () => PAIR.matches && ! SIDE_BAR.matches;
/** The word's panel's columns now: 1 on a phone, 2 on anything bigger (PAIR). */
export const wordColumns = (): 1 | 2 => PAIR.matches ? 2 : 1;
/** PAIR sideways: the word's panel's two parts one over the other, as the search over the notes - the word's info on
 *  top, the lexicon under it (style.css), #wordSplit at the search's share of the height (--searchH). */
export const wordStacked = () => PAIR.matches && SIDE_BAR.matches;
const WIDE = matchMedia ("(min-width: 700px)");     // (style.css's 700 px: keep the two the same)
/** Whether the window is 700 px wide or more now (the notes' two-way scrolling: notes.ts). */
export const isWide = () => WIDE.matches;
/** Calls f whenever the window crosses 700 px wide. */
export const onWideChange = (f: () => void) => WIDE.addEventListener ("change", f);

const KEY = "cotext.splits";
const root = document.documentElement.style;
const sizes: { searchH?: number; cardH?: number; cardShare?: number; rightShare?: number; printShare?: number; printW?: number; deckH?: number; deckW?: number } = {};
try { Object.assign (sizes, JSON.parse (localStorage.getItem (KEY) ?? "{}")); } catch { /* none kept, or private mode */ }
if (sizes.searchH) root.setProperty ("--searchH", String (sizes.searchH));
if (sizes.cardH) root.setProperty ("--cardH", sizes.cardH + "px");
if (sizes.cardShare) root.setProperty ("--cardShare", String (sizes.cardShare));
if (sizes.rightShare) root.setProperty ("--rightShare", String (sizes.rightShare));
if (sizes.printShare) root.setProperty ("--printShare", String (sizes.printShare));
if (sizes.printW) root.setProperty ("--printW", String (sizes.printW));
if (sizes.deckH) root.setProperty ("--deckH", sizes.deckH + "px");
if (sizes.deckW) root.setProperty ("--deckW", sizes.deckW + "px");
/** The window's long side (px), either way up: the panel divider's measure (--long). The window's, not the screen's -
 *  a desktop window or an iPad's Split View can be smaller than the screen. */
const long = () => Math.max (innerWidth, innerHeight);
const setLong = () => root.setProperty ("--long", `${long ()}px`);
setLong (); addEventListener ("resize", setLong);
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

/** A deck's panel's divider (the Verse cards' NEW VERSE, Flashcards' word list: style.css' .deckPane), made and put
 *  after it: upright on its top edge, dragged its height (--deckH, px: 120 up, leaving the card a fifth of the window);
 *  sideways (SIDE_BAR) on its left edge, its width (--deckW: 240 up, leaving the card 240). Kept, each for every deck. */
export function deckPaneSplit (pane: HTMLElement) {
  const split = document.createElement ("div");
  split.className = "split deckSplit"; split.setAttribute ("role", "separator"); split.setAttribute ("aria-label", "Resize the panel");
  const turn = () => split.setAttribute ("aria-orientation", SIDE_BAR.matches ? "vertical" : "horizontal");
  turn (); SIDE_BAR.addEventListener ("change", turn);
  pane.after (split);
  drag (split, (x, y) => {
    const r = pane.getBoundingClientRect ();
    if (SIDE_BAR.matches) { sizes.deckW = Math.round (clamp (r.right - x, 240, r.right - 240)); root.setProperty ("--deckW", sizes.deckW + "px"); }
    else { sizes.deckH = Math.round (clamp (r.bottom - y, 120, r.bottom - innerHeight / 5)); root.setProperty ("--deckH", sizes.deckH + "px"); }
  });
}

/** The Study printout's divider (chapterstudy.ts; style.css' .cstudy) - upright, horizontal, the preview over the
 *  editor: the preview's share of the room's height, % (--printShare, 15-85; half until dragged); sideways, vertical,
 *  the preview at the left: its share of the width (--printW, 30-80; two thirds until dragged). Each kept. */
const SIDEWAYS = matchMedia ("(orientation: landscape)");     // (style.css' .cstudy query: keep the two the same)
export function printSplit (split: HTMLElement, box: HTMLElement) {
  const turn = () => split.setAttribute ("aria-orientation", SIDEWAYS.matches ? "vertical" : "horizontal");
  turn (); SIDEWAYS.addEventListener ("change", turn);
  drag (split, (x, y) => {
    const r = box.getBoundingClientRect ();
    if (SIDEWAYS.matches) {
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
const notesEl = document.getElementById ("notes")!, searchEl = document.getElementById ("search")!;
// Sideways, the divider between the text and the panel (cardShareTo); upright it isn't shown (#sheetSplit is).
drag (document.getElementById ("notesSplit")!, (x) => cardShareTo (innerWidth - x));
// The search's height against the notes' (both open; the search on top): its share (%) of the room the two have
// between them (style.css gives them flex-grow by it), from the search's top to the divider's middle, each pane keeping 120 px at least - PAIR sideways. PAIR upright
// (side by side, the search at the right): the divider's place, --rightShare (rightShareTo).
const paneSplit = document.getElementById ("paneSplit")!;
function pairSplit () { for (const el of [paneSplit, ...wordSplits]) el?.setAttribute ("aria-orientation", sideBySide () || (el !== paneSplit && ! wordStacked ()) ? "vertical" : "horizontal"); }     // (The word's panels' too: vertical but sideways)
pairSplit (); PAIR.addEventListener ("change", pairSplit); SIDE_BAR.addEventListener ("change", pairSplit);
drag (paneSplit, (x, y) => {
  if (sideBySide ()) { rightShareTo (paneSplit.parentElement!, x); return; }
  const s = searchEl.getBoundingClientRect (), room = s.height + notesEl.getBoundingClientRect ().height;
  if (room < 240) return;     // (Too short a column for two: left as it is)
  sizes.searchH = Math.round (clamp (y - 7 - s.top, 120, room - 120) / room * 1000) / 10;     // (7: the divider's half)
  root.setProperty ("--searchH", String (sizes.searchH));
});
// One panel at a time - the word's (#sheet, or #besideSheet), the add-verse box, the notes or the search: one opening closes
// the one open (by its ✕, as if tapped, so all it does on closing is done); its ✕ closes it, the divider going and
// the text taking the screen. PAIR: the notes and the search open together, sharing one place - and both closed for
// a word (paired), either opened again brings back the other too.
const PANES = ["notes", "search"];
const together = (a: HTMLElement, b: HTMLElement) => PAIR.matches && PANES.includes (a.id) && PANES.includes (b.id);
const docks = [...document.querySelectorAll<HTMLElement> (".dock")];
const ONE = ["sheet", "besideSheet", "verseSheet", "notes", "search"];     // (The panels shown one at a time)
let shown: HTMLElement[] = [];     // (Those of them open, as last seen - so one just opened is told from the rest)
let paired = false;     // (PAIR: the notes and the search both open when a word's panel closed them)
const countDocks = () => {
  const open = docks.filter ((d) => ONE.includes (d.id) && ! d.hidden), opened = open.filter ((d) => ! shown.includes (d));
  shown = open;
  if (! opened.length) return;
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
// The divider dragged between the text and the panel - its middle d px from the window's foot (upright) or right
// edge (sideways), as a share of the window's long side, 20-80 %, kept for both orientations (--cardShare:
// style.css), so it stays put as the device turns.
function cardShareTo (d: number) {
  sizes.cardShare = Math.round (clamp (d / long () * 100, 20, 80) * 10) / 10;
  root.setProperty ("--cardShare", String (sizes.cardShare));
}

/** The second word's panel (panel.ts clones it from #sheet after this module ran): one of the panels shown one at a time. */
export function addDock (d: HTMLElement) {
  docks.push (d);
  new MutationObserver (countDocks).observe (d, { attributes: true, attributeFilter: ["hidden"] });
  countDocks ();
}

/** A pane's frame (the notes', the search's - style.css): its ✕ in a row of its own outside the scroller, fixed at the
 *  pane's upper right while the rest scrolls (even in the bounce at a scroll's end); everything else moved into the
 *  scroller (.panelScroll), returned. Its top row (.top: a picker or the search bar, then the ✕'s room) a row of its
 *  own over the scroller, fixed at the pane's top (not sticky: outside the scroller, so not even the bounce moves it). */
export function paneFrame (pane: HTMLElement, close: HTMLElement): HTMLElement {
  const scroll = document.createElement ("div");
  scroll.className = "panelScroll";
  const x = document.createElement ("div"); x.className = "xRow"; x.append (close);
  scroll.append (...pane.children); pane.append (x, scroll);
  scroll.before (scroll.querySelector<HTMLElement> (":scope > .top")!);     // (Its top row frozen over the scroller, every width)
  return scroll;
}
// Upright, the divider between the text and the panel (cardShareTo); sideways it isn't shown (#notesSplit is).
drag (document.getElementById ("sheetSplit")!, (_x, y) => cardShareTo (innerHeight - y));
// A verse card's word's panel's height: from its divider down to the deck's bar.
drag (document.getElementById ("cardSplit")!, (_x, y) => {
  const bar = barRoom (document.querySelector<HTMLElement> (".vcBar"));     // (The panel stands on the deck's bar - at the foot)
  sizes.cardH = Math.round (clamp (innerHeight - bar - y, 120, Math.max (120, innerHeight - bar - 160)));
  root.setProperty ("--cardH", sizes.cardH + "px");
});
