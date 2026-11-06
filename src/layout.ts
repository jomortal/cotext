// The page's layout by the window's width (style.css's @media blocks, at the same 700 px; and the room left beside the panes):
// - Narrow (a phone, or an iPad's narrow Split View window): one column - the heading, the text, the word's panel, the
//   notes panel, the second word's panel, the search pane, the play bar - the panels sharing the room evenly with the
//   text (style.css; --docks, below).
// - Wide (an iPad, a desktop): columns between the heading and the play bar (index.html's #textCol, #paneCol) - the
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
// - A phone (PHONE: style.css' phone media query, the same), upright or sideways - a stack of three cards (below):
//   the word card (the word's panel, #sheet - or #besideSheet, for a word tapped in the notes), the notes and the
//   search. Only the front card shows, beside the text: upright under it, sideways at its right
//   the full height (the heading over the text only), one divider between them (#sheetSplit upright, #notesSplit
//   sideways). The divider is at the same place on the screen both ways, measured from the screen's own edge (not
//   from the heading or the bars): --share, % - its middle 60 % of the way down the screen upright is 60 % of the way
//   across sideways -, so dragging in one sets the other.
//   The add-verse box (#verseSheet) isn't a card: under the text, as narrow.
// The notes panel follows the text both ways while wide (notes.ts' TWO-WAY SCROLLING).

import { barRoom, SIDE_BAR } from "./bars";
const PHONE = matchMedia ("(max-width: 600px), (max-height: 500px)");     // (style.css' phone media query: keep the two the same)
const WIDE = matchMedia ("(min-width: 700px)");     // (style.css's breakpoint: keep the two the same)
/** Whether the page is laid out wide now. */
export const isWide = () => WIDE.matches;
/** Calls f whenever the layout changes between narrow and wide. */
export const onWideChange = (f: () => void) => WIDE.addEventListener ("change", f);

const KEY = "cotext.splits";
const root = document.documentElement.style;
const sizes: { notesW?: number; searchH?: number; sheetH?: number; sheetW?: number; besideH?: number; cardH?: number; paneH?: number; verseH?: number; share?: number } = {};
try { Object.assign (sizes, JSON.parse (localStorage.getItem (KEY) ?? "{}")); } catch { /* none kept, or private mode */ }
if (sizes.notesW) root.setProperty ("--notesW", String (sizes.notesW));
if (sizes.searchH) root.setProperty ("--searchH", String (sizes.searchH));
if (sizes.sheetH) root.setProperty ("--sheetH", sizes.sheetH + "px");
if (sizes.besideH) root.setProperty ("--besideH", sizes.besideH + "px");
if (sizes.cardH) root.setProperty ("--cardH", sizes.cardH + "px");
if (sizes.sheetW) root.setProperty ("--sheetW", String (sizes.sheetW));
if (sizes.paneH) root.setProperty ("--paneH", sizes.paneH + "px");
if (sizes.verseH) root.setProperty ("--verseH", sizes.verseH + "px");
if (sizes.share) root.setProperty ("--share", String (sizes.share));
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
const NOTES_W = 33.333;     // (The panes' column's width at first, % of the window: style.css' fallback the same)
const notesEl = document.getElementById ("notes")!, searchEl = document.getElementById ("search")!;
const notesSplit = document.getElementById ("notesSplit")!;
/** The panes' column's share of the window (%) while either pane is open, else 0. */
const panesShare = () => notesEl.hidden && searchEl.hidden ? 0 : sizes.notesW ?? NOTES_W;
// The panes' column's width: from its divider to the window's right edge, as a share of the width, 22-60 % (the
// text keeping 40 % at least).
// Narrow (not a phone), the same divider lies between the word's panel and the panes under it (both open): the panes'
// height (sizeBelow). A phone held sideways: the divider between the text and the front card (phoneShare).
const narrowSplit = () => notesSplit.setAttribute ("aria-orientation", WIDE.matches || SIDE_BAR.matches ? "vertical" : "horizontal");
narrowSplit (); WIDE.addEventListener ("change", narrowSplit); SIDE_BAR.addEventListener ("change", narrowSplit);
drag (notesSplit, (x, y) => {
  if (PHONE.matches) { phoneShare (x, innerWidth); return; }
  if (! WIDE.matches) { sizeBelow (notesSplit, y); return; }
  sizes.notesW = Math.round (clamp ((innerWidth - x) / innerWidth * 100, 22, 60) * 10) / 10;
  root.setProperty ("--notesW", String (sizes.notesW));
  placeWord ();
});
// The search's height against the notes' (both open; the search on top): its share (%) of the room the two have
// between them - the column less its dividers and the second word's panel (style.css gives them flex-grow by it) -,
// from the search's top to the divider's middle, each pane keeping 120 px at least.
drag (document.getElementById ("paneSplit")!, (_x, y) => {
  const s = searchEl.getBoundingClientRect (), room = s.height + notesEl.getBoundingClientRect ().height;
  if (room < 240) return;     // (Too short a column for two: left as it is)
  sizes.searchH = Math.round (clamp (y - 7 - s.top, 120, room - 120) / room * 1000) / 10;     // (7: the divider's half)
  root.setProperty ("--searchH", String (sizes.searchH));
});
// The word beside the text (body.sideWord: style.css): while wide, whenever the text and its word have at least
// SIDE px between them - the window less the panes' column and its divider, while either pane is open. Never on a phone:
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
  const now = WIDE.matches && ! PHONE.matches && innerWidth - panes >= SIDE;
  if (now === side) return;
  side = now;
  document.body.classList.toggle ("sideWord", side);
  sheetSplit.setAttribute ("aria-orientation", side ? "vertical" : "horizontal");
}
placeWord ();
addEventListener ("resize", placeWord);
WIDE.addEventListener ("change", placeWord);
for (const el of [notesEl, searchEl]) new MutationObserver (placeWord).observe (el, { attributes: true, attributeFilter: ["hidden"] });

// Narrow (not a phone), the panels open share the room with the text (style.css): their number set on the root as
// --docks, and body.docks while two or more are open (one alone keeps its own height limit).
// A phone: the cards' stack - the open cards in the order they came to the front, the front last, marked .front
// (style.css shows only it). One word at a time: a word's panel opening closes the other (by its ✕, as if tapped).
// Opening a card, or tapping its button while it's open, puts it in front; its ✕ closes it, showing the card in front
// before it; all closed, the divider goes and the text takes the screen.
const docks = [...document.querySelectorAll<HTMLElement> (".dock")];
const KINDS = [["sheet", "besideSheet"], ["notes"], ["search"]];     // (The word card - either word's panel -, the notes, the search)
const kindOf = (d: HTMLElement) => KINDS.find ((k) => k.includes (d.id));
const stack: HTMLElement[] = [];
const restack = () => { for (const d of docks) d.classList.toggle ("front", d === stack.at (-1)); };
const countDocks = () => {
  const n = docks.filter ((d) => ! d.hidden).length;
  root.setProperty ("--docks", String (n));
  document.body.classList.toggle ("docks", n >= 2);
  for (const d of docks) {
    const kind = kindOf (d), at = stack.indexOf (d);
    if (! kind) continue;
    if (d.hidden) { if (at >= 0) stack.splice (at, 1); continue; }
    if (at >= 0) continue;
    stack.push (d);     // (Just opened: in front)
    if (PHONE.matches) for (const o of stack) if (o !== d && kind.includes (o.id)) o.querySelector<HTMLElement> (":scope > .xRow button")?.click ();     // (The other of its kind closed - its own ✕, so all it does on closing is done)
  }
  restack ();
};
countDocks ();
for (const d of docks) new MutationObserver (countDocks).observe (d, { attributes: true, attributeFilter: ["hidden"] });
/** A card brought to the front (its button tapped while it's open, a new word in its panel): true when, on a phone, it
 *  was open behind another - so its button only brings it forward, not closing it. */
export function toFront (d: HTMLElement): boolean {
  const at = stack.indexOf (d);
  if (d.hidden || at < 0 || at === stack.length - 1) return false;
  stack.splice (at, 1); stack.push (d); restack ();
  return PHONE.matches;
}
// A phone: the divider dragged between the text and the front card - its middle at p (y upright, x sideways) as a
// share of the screen's size that way (from its top, from its left edge), 20-80 %, kept for both orientations
// (--share: style.css).
function phoneShare (p: number, size: number) {
  sizes.share = Math.round (clamp (p / size * 100, 20, 80) * 10) / 10;
  root.setProperty ("--share", String (sizes.share));
}

// Narrow (not a phone), a divider dragged sets the height of the panel just under it - the word's panel's --sheetH (the wide
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
// open - the height of the panel under it, sizeBelow; a phone upright: the text's share, phoneShare); beside the text the text's word's panel's width
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
    if (id === "sheetSplit" && PHONE.matches) { phoneShare (y, innerHeight); return; }     // (A phone upright: the divider between the text and the front card)
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
