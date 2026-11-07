// The page's layout - one for every screen, whatever its pointer (a finger, a pen or a mouse) or device: the window's
// size and which way up it is pick its form, so a desktop window and an iPad of the same size look the same. The model
// (CLAUDE.md's "One layout"): a single divider between the text and one panel; where the panel's place has room, that
// place split in two the other way (the word's panel's two parts, the notes and the search side by side or one over
// the other); and, with a mouse, ‹ and › in the text's margins (bars.ts' marginArrows). Nothing else changes with
// the screen but the side margins (style.css' --margin).
// - One panel at a time - the word's panel (#sheet - for a word of the text, or of a verse card -, or #besideSheet, for
//   a word tapped in the notes), the add-verse box (#verseSheet), the notes or the search -, beside the text: upright
//   (taller than wide) under it, sideways (bars.ts' SIDE_BAR, the play bar then down the right side) at its right the
//   full height (the heading over the text only), one divider between them (#sheetSplit upright, #notesSplit sideways).
//   The divider is at the same place on the screen both ways, measured from the window's foot upright and its right
//   edge sideways (the ends the panel is at - not the top, where the clock and the heading are) against the window's
//   long side (--long: its width or height, the larger, kept as the window resizes): --cardShare, % - 40 is 40 %
//   of the long side up from the foot upright, the same in from the right sideways -, so dragging in one sets the
//   other. No panel open: no divider, the text the full room. A verse card's word opens the same #sheet, at the same
//   place, over the Verse cards screen (beside its bar as the Bible's beside the play bar: style.css).
// - SPLIT (the panel's place split in two, perpendicular to the divider where it has room): decided from the place's own
//   size, worked out from the window and the divider (setSplit) - "row" (side by side) while it's ROW_W px wide or more,
//   else "column" (one over the other) while it's COLUMN_H px tall or more, else "one" (not split). Set as :root's
//   data-split (style.css' SPLIT rules). One rule for both splits: the word's panel's two parts - the word's info and
//   the lexicon (panel.ts' columns) - and the notes and the search sharing the place (open together, each opening the
//   other's place): side by side the notes at the left, the search at the right, #paneSplit (vertical) between them at
//   --rightShare (rightShareTo), the same place as the divider between the word's panel's two parts; one over the
//   other the search (or the word's info) on top, #paneSplit (horizontal) at the search's share of the height
//   (--searchH). "one": the word's panel one column, the notes and the search one at a time.
// Each divider set by dragging (pointer events: a finger, a pen or a mouse alike), kept on the device (localStorage).

import { SIDE_BAR } from "./bars";
import { box, px, winW, winH, onScale } from "./zoom";     // (Every measurement in the page's CSS px, whatever the UI's scale)

const KEY = "cotext.splits";
const root = document.documentElement.style;
const sizes: { searchH?: number; cardShare?: number; rightShare?: number; deckH?: number; deckW?: number; menuH?: number } = {};
try { Object.assign (sizes, JSON.parse (localStorage.getItem (KEY) ?? "{}")); } catch { /* none kept, or private mode */ }
if (sizes.searchH) root.setProperty ("--searchH", String (sizes.searchH));
if (sizes.cardShare) root.setProperty ("--cardShare", String (sizes.cardShare));
if (sizes.rightShare) root.setProperty ("--rightShare", String (sizes.rightShare));
if (sizes.deckH) root.setProperty ("--deckH", sizes.deckH + "px");
if (sizes.menuH) root.setProperty ("--menuH", sizes.menuH + "px");
if (sizes.deckW) root.setProperty ("--deckW", sizes.deckW + "px");
/** The window's long side (CSS px), either way up: the panel divider's measure (--long). The window's, not the
 *  screen's - a desktop window or an iPad's Split View can be smaller than the screen. With it the window's width and
 *  height (--winW, --winH: style.css' THE SCALE - in place of vw and vh). */
const long = () => Math.max (winW (), winH ());
const setLong = () => { root.setProperty ("--long", `${long ()}px`); root.setProperty ("--winW", `${winW ()}px`); root.setProperty ("--winH", `${winH ()}px`); };
setLong (); addEventListener ("resize", setLong); onScale (setLong);
/** SPLIT (the header's; setSplit, below). */
export type Split = "row" | "column" | "one";
let split = "" as Split;     // (Set as the module ends: setSplit)
const keep = () => { try { localStorage.setItem (KEY, JSON.stringify (sizes)); } catch { /* private mode: not kept */ } };

/** A divider dragged: move (x, y) called with the pointer's place (CSS px: zoom.ts) each frame it moves; kept when let go. */
function drag (el: HTMLElement, move: (x: number, y: number) => void) {
  el.addEventListener ("pointerdown", (e) => {
    e.preventDefault ();
    el.setPointerCapture (e.pointerId);
    el.classList.add ("on");
    const onMove = (m: PointerEvent) => move (px (m.clientX), px (m.clientY));
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

/** A screen's panel (style.css' .deckPane: the Verse cards' VERSE LIST, Flashcards' WORD LIST, the Study printout's EDIT
 *  and DOWNLOAD) - the screens' one panel, as the Bible's: at the foot over the bar upright, at the right beside the bar
 *  sideways, the screen's room giving way to it (its height kept on the screen as --deckPaneH while it's shown). Its
 *  title row (.paneHead) over its own scroller (headFrame, returned), and its divider, made and put after it: upright on
 *  its top edge, dragged its height (--deckH, px: 120 up, leaving the room a fifth of the window); sideways on its left
 *  edge, its width (--deckW: 240 up, leaving the room 240). Kept, one size for every screen's panel. */
/** A top row's drop-down sized by its own divider (style.css' .menuSized - for now the Reading plan's; the kind any top
 *  drop-down can take): the divider made and put after it, on its bottom edge, shown while it's open; dragged, its height
 *  (--menuH, px: 80 up, leaving a fifth of the window under it) - its contents scrolling within. Kept, one size for
 *  every drop-down sized so; until dragged, as tall as its contents (at most the screen's room). */
export function menuSplit (menu: HTMLElement) {
  menu.classList.add ("menuSized");
  const split = document.createElement ("div");
  split.className = "split menuSplit"; split.setAttribute ("role", "separator"); split.setAttribute ("aria-label", "Resize the menu");
  split.setAttribute ("aria-orientation", "horizontal");
  menu.after (split);
  drag (split, (_x, y) => {
    const r = box (menu);
    sizes.menuH = Math.round (clamp (y - r.top, 80, winH () * .8 - r.top)); root.setProperty ("--menuH", sizes.menuH + "px");
  });
}

export function deckPaneSplit (pane: HTMLElement): HTMLElement {
  const scroller = headFrame (pane);
  const screen = document.getElementById ("screen")!;
  new ResizeObserver (() => { if (pane.offsetHeight) screen.style.setProperty ("--deckPaneH", `${pane.offsetHeight}px`); }).observe (pane);     // (A hidden one - the printout's other - left out)
  const split = document.createElement ("div");
  split.className = "split deckSplit"; split.setAttribute ("role", "separator"); split.setAttribute ("aria-label", "Resize the panel");
  const turn = () => split.setAttribute ("aria-orientation", SIDE_BAR.matches ? "vertical" : "horizontal");
  turn (); SIDE_BAR.addEventListener ("change", turn);
  pane.after (split);
  drag (split, (x, y) => {
    const r = box (pane);
    if (SIDE_BAR.matches) { sizes.deckW = Math.round (clamp (r.right - x, 240, r.right - 240)); root.setProperty ("--deckW", sizes.deckW + "px"); }
    else { sizes.deckH = Math.round (clamp (r.bottom - y, 120, r.bottom - winH () / 5)); root.setProperty ("--deckH", sizes.deckH + "px"); }
  });
  return scroller;
}

// One place for two side-by-side dividers (SPLIT "row"): the word's panel's, between its two parts (the lexicon at the
// left, the word's info at the right), and the one between the notes and the search - --rightShare, % of the box's width from
// the divider's middle to its right edge (20-80 %), so the two stand at the same place; dragging either moves both.
/** The right-hand side's share (%), as last dragged; undefined until then - the word's info as wide as it needs and the
 *  search half (panel.ts' columns, style.css' SPLIT). */
export const rightShare = () => sizes.rightShare;
function rightShareTo (el: HTMLElement, x: number) {
  const r = box (el);
  sizes.rightShare = Math.round (clamp ((r.right - x) / r.width * 100, 20, 80) * 10) / 10;
  root.setProperty ("--rightShare", String (sizes.rightShare));
}
/** A word's panel's divider between its two parts (the panel's scroller, scroll): dragged, --rightShare side by side,
 *  --searchH one over the other (SPLIT); relayout () lays this panel out by it. */
export function wordSplit (el: HTMLElement, scroll: HTMLElement, relayout: () => void) {
  wordSplits.push (el); pairSplit ();
  drag (el, (x, y) => {
    if (split !== "column") { rightShareTo (scroll, x); relayout (); return; }
    const r = box (scroll), gap = parseFloat (getComputedStyle (scroll).rowGap) || 0, half = el.offsetHeight / 2;
    const room = r.height - 2 * (half + gap);     // (The info's and the lexicon's heights together, as the search's and the notes')
    sizes.searchH = Math.round (clamp ((y - r.top - half - gap) / room * 100, 20, 80) * 10) / 10;
    root.setProperty ("--searchH", String (sizes.searchH));
  });
}
const wordSplits: HTMLElement[] = [];
const notesEl = document.getElementById ("notes")!, searchEl = document.getElementById ("search")!;
// Sideways, the divider between the text and the panel (cardShareTo); upright it isn't shown (#sheetSplit is).
drag (document.getElementById ("notesSplit")!, (x) => cardShareTo (winW () - x));
// The search's height against the notes' (both open; the search on top): its share (%) of the room the two have
// between them (style.css gives them flex-grow by it), from the search's top to the divider's middle, each pane keeping
// 120 px at least - SPLIT "column". Side by side ("row": the search at the right): the divider's place, --rightShare
// (rightShareTo).
const paneSplit = document.getElementById ("paneSplit")!;
/** The dividers inside the panel's place turned as SPLIT is: vertical side by side, horizontal one over the other. */
function pairSplit () { for (const el of [paneSplit, ...wordSplits]) el.setAttribute ("aria-orientation", split === "column" ? "horizontal" : "vertical"); }
drag (paneSplit, (x, y) => {
  if (split === "row") { rightShareTo (paneSplit.parentElement!, x); return; }
  const s = box (searchEl), room = s.height + box (notesEl).height;
  if (room < 240) return;     // (Too short a column for two: left as it is)
  sizes.searchH = Math.round (clamp (y - 7 - s.top, 120, room - 120) / room * 1000) / 10;     // (7: the divider's half)
  root.setProperty ("--searchH", String (sizes.searchH));
});
// One panel at a time - the word's (#sheet, or #besideSheet), the add-verse box, the notes or the search: one opening closes
// the one open (by its ✕, as if tapped, so all it does on closing is done); its ✕ closes it, the divider going and
// the text taking the screen. SPLIT (not "one"): the notes and the search open together, sharing one place - and both
// closed for a word (paired), either opened again brings back the other too.
const PANES = ["notes", "search"];
const together = (a: HTMLElement, b: HTMLElement) => split !== "one" && PANES.includes (a.id) && PANES.includes (b.id);
const docks = [...document.querySelectorAll<HTMLElement> (".dock")];
const ONE = ["sheet", "besideSheet", "verseSheet", "notes", "search"];     // (The panels shown one at a time)
let shown: HTMLElement[] = [];     // (Those of them open, as last seen - so one just opened is told from the rest)
let paired = false;     // (SPLIT: the notes and the search both open when a word's panel closed them)
const countDocks = () => {
  const open = docks.filter ((d) => ONE.includes (d.id) && ! d.hidden), opened = open.filter ((d) => ! shown.includes (d));
  shown = open;
  if (! opened.length) return;
  const pane = opened.find ((d) => PANES.includes (d.id));
  if (pane && paired) {     // (One of the pair opened again after a word: the other with it, by its own button)
    paired = false;
    const other = PANES.find ((id) => id !== pane.id)!;
    if (split !== "one" && document.getElementById (other)!.hidden) document.getElementById (other + "Btn")!.click ();
  }
  const closing = open.filter ((o) => ! opened.includes (o) && ! opened.some ((d) => together (d, o)));
  if (! pane && closing.filter ((o) => PANES.includes (o.id)).length === 2) paired = split !== "one";     // (A word closing both)
  else if (closing.length) paired = false;
  for (const o of closing) o.querySelector<HTMLElement> (":scope > .xRow button, :scope > .top > #notesClose")?.click ();     // (The one open before closed by its own ✕ - unless the two share the place: SPLIT; the resources' ✕ on its picker's row, notes.ts)
};
countDocks ();
for (const d of docks) new MutationObserver (countDocks).observe (d, { attributes: true, attributeFilter: ["hidden"] });
// The divider dragged between the text and the panel - its middle d px from the window's foot (upright) or right
// edge (sideways), as a share of the window's long side, 20-80 %, kept for both orientations (--cardShare:
// style.css), so it stays put as the device turns.
function cardShareTo (d: number) {
  sizes.cardShare = Math.round (clamp (d / long () * 100, 20, 80) * 10) / 10;
  root.setProperty ("--cardShare", String (sizes.cardShare));
  setSplit ();
}

//==== SPLIT ====
// (The header's SPLIT.) The place's size from the window, not measured from the panel - so it's known before a panel
// opens: upright the window's width by the divider's middle (--cardShare of the long side up from the foot) less half
// the divider and the play bar; sideways the same in from the right, less the side bar, by the window's height.
const ROW_W = 600, COLUMN_H = 600, SPLIT_HALF = 7;     // (px; SPLIT_HALF: style.css' --split-half)
const splitWatch: (() => void)[] = [];
/** SPLIT now: how the panel's place is split. */
export const splitNow = () => split;
/** Calls f whenever SPLIT changes (the word's panels lay themselves out again). */
export const onSplit = (f: () => void) => { splitWatch.push (f); };
const playBar = document.getElementById ("playBar")!;
function setSplit () {
  const at = long () * (sizes.cardShare ?? 40) / 100 - SPLIT_HALF, side = SIDE_BAR.matches;
  const w = side ? at - playBar.offsetWidth : winW (), h = side ? winH () : at - playBar.offsetHeight;
  const now: Split = w >= ROW_W ? "row" : h >= COLUMN_H ? "column" : "one";
  if (now === split) return;
  split = now;
  document.documentElement.dataset.split = now;
  pairSplit ();
  // (Not split any more with both panes open: the search closed by its ✕, the notes keeping the place)
  if (now === "one" && ! notesEl.hidden && ! searchEl.hidden) document.getElementById ("searchClose")!.click ();
  for (const f of splitWatch) f ();
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
/** A panel's frame with a title row (.paneHead: the decks' VERSE LIST and WORD LIST, the printout's EDIT and DOWNLOAD -
 *  style.css): everything after the title moved into a scroller of its own (.paneBody), returned - so the title stays
 *  outside it and the scroll bar spans only what scrolls. */
function headFrame (pane: HTMLElement): HTMLElement {
  const body = document.createElement ("div");
  body.className = "paneBody";
  const head = pane.querySelector (":scope > .paneHead");
  body.append (...[...pane.children].filter ((c) => c !== head));
  pane.append (body);
  return body;
}
// Upright, the divider between the text and the panel (cardShareTo); sideways it isn't shown (#notesSplit is).
drag (document.getElementById ("sheetSplit")!, (_x, y) => cardShareTo (winH () - y));
setSplit (); addEventListener ("resize", setSplit); SIDE_BAR.addEventListener ("change", setSplit); onScale (setSplit);
