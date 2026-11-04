// The page's layout by the window's width (style.css's @media blocks, at the same 700 px; and the room left beside the panes):
// - Narrow (a phone, or an iPad's narrow Split View window): one column - the heading, the text, the word's panel, the
//   notes panel, the second word's panel, the search pane, the play bar - the panels sharing the room evenly with the
//   text (style.css; --docks, below).
// - Wide (an iPad, a desktop): columns between the heading and the play bar (index.html's #notesCol, #textCol,
//   #searchCol) - the text, then at the RIGHT the notes panel, a third of the width at first, and the search pane, a
//   quarter at first: text | notes | search. Each word's panel (unless beside the text, below) at the foot of the
//   column whose text it's about (the text's word under the text; a word of the notes' Hebrew OT under the notes), as
//   wide as its column. Dividers set the sizes by dragging (pointer events, so a finger, a pen or a mouse): #notesSplit,
//   on the notes' left edge (their width, 22-60 % of the window), #searchSplit, on the search's left edge (its width,
//   22-60 %) - each leaving the text 25 % at least -, and #sheetSplit / #besideSplit, on each word's panel's top edge
//   (its height, from 120 px to the room between the bars less 160 px for what's above it). All kept on the device
//   (localStorage) and set on the root as --notesW, --searchW (percentages, unitless), --sheetH and --besideH (px).
// - The word beside the text (wide, with 1200 px or more for the text and its word once the notes' and the search's
//   columns are taken off: placeWord, body.sideWord in style.css): the text's word's panel a column of its own between
//   the text and the notes - text | word | notes | search -, its width (--sheetW, a percentage, unitless: 15-40 % of
//   the window, the text keeping 30 % at least) set by #sheetSplit, now a vertical divider on its left edge.
// The notes panel follows the text both ways while wide (notes.ts' TWO-WAY SCROLLING).

const WIDE = matchMedia ("(min-width: 700px)");     // (style.css's breakpoint: keep the two the same)
/** Whether the page is laid out wide now. */
export const isWide = () => WIDE.matches;
/** Calls f whenever the layout changes between narrow and wide. */
export const onWideChange = (f: () => void) => WIDE.addEventListener ("change", f);

const KEY = "cotext.splits";
const root = document.documentElement.style;
const sizes: { notesW?: number; searchW?: number; sheetH?: number; sheetW?: number; besideH?: number } = {};
try { Object.assign (sizes, JSON.parse (localStorage.getItem (KEY) ?? "{}")); } catch { /* none kept, or private mode */ }
if (sizes.notesW) root.setProperty ("--notesW", String (sizes.notesW));
if (sizes.searchW) root.setProperty ("--searchW", String (sizes.searchW));
if (sizes.sheetH) root.setProperty ("--sheetH", sizes.sheetH + "px");
if (sizes.besideH) root.setProperty ("--besideH", sizes.besideH + "px");
if (sizes.sheetW) root.setProperty ("--sheetW", String (sizes.sheetW));
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
const NOTES_W = 33.333, SEARCH_W = 25;     // (Their widths at first, % of the window: style.css' fallbacks the same)
const notesEl = document.getElementById ("notes")!, searchEl = document.getElementById ("search")!;
/** A pane's share of the window (%) while open, else 0. */
const notesShare = () => notesEl.hidden ? 0 : sizes.notesW ?? NOTES_W;
const searchShare = () => searchEl.hidden ? 0 : sizes.searchW ?? SEARCH_W;
// The notes' width: from the divider to the search's divider (the window's right edge while the search is closed); the
// search's: from its divider to the right edge - as a share of the width, each 22-60 %, and never so wide the text
// keeps less than 25 % beside the other.
/** The left edge of the first open divider of ids (else the window's right edge): where a column beside the text ends. */
const edgeOf = (...ids: string[]) => {
  for (const id of ids) { const r = document.getElementById (id)!.getBoundingClientRect (); if (r.width) return r.left; }
  return innerWidth;
};
drag (document.getElementById ("notesSplit")!, (x) => {
  sizes.notesW = Math.round (clamp ((edgeOf ("searchSplit") - x) / innerWidth * 100, 22, Math.max (22, Math.min (60, 75 - searchShare ()))) * 10) / 10;
  root.setProperty ("--notesW", String (sizes.notesW));
  placeWord ();
});
drag (document.getElementById ("searchSplit")!, (x) => {
  sizes.searchW = Math.round (clamp ((innerWidth - x) / innerWidth * 100, 22, Math.max (22, Math.min (60, 75 - notesShare ()))) * 10) / 10;
  root.setProperty ("--searchW", String (sizes.searchW));
  placeWord ();
});
// The word beside the text (body.sideWord: style.css): while wide, whenever the text and its word have at least
// SIDE px between them - the window less the notes' and the search's columns and their dividers, while they're open.
// Kept so as the window resizes, a pane opens or closes and a divider is dragged; the text's word's divider with it,
// vertical beside the text (style.css draws a divider by its aria-orientation), else horizontal.
const SIDE = 1200;
const sheetSplit = document.getElementById ("sheetSplit")!;
let side = false;
/** Whether the text's word's panel is a column beside the text now. */
export const isSideWord = () => side;
function placeWord () {
  const panes = [notesShare (), searchShare ()].reduce ((sum, w) => sum + (w ? innerWidth * w / 100 + 14 : 0), 0);
  const now = WIDE.matches && innerWidth - panes >= SIDE;
  if (now === side) return;
  side = now;
  document.body.classList.toggle ("sideWord", side);
  sheetSplit.setAttribute ("aria-orientation", side ? "vertical" : "horizontal");
}
placeWord ();
addEventListener ("resize", placeWord);
WIDE.addEventListener ("change", placeWord);
for (const el of [notesEl, searchEl]) new MutationObserver (placeWord).observe (el, { attributes: true, attributeFilter: ["hidden"] });

// Narrow, the panels open share the room with the text (style.css): their number set on the root as --docks, and
// body.docks while two or more are open (one alone keeps its own height limit).
const docks = [...document.querySelectorAll<HTMLElement> (".dock")];
const countDocks = () => {
  const n = docks.filter ((d) => ! d.hidden).length;
  root.setProperty ("--docks", String (n));
  document.body.classList.toggle ("docks", n >= 2);
};
countDocks ();
for (const d of docks) new MutationObserver (countDocks).observe (d, { attributes: true, attributeFilter: ["hidden"] });
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
  const top = scroll.querySelector<HTMLElement> (":scope > .top")!;
  const place = () => { if (WIDE.matches) scroll.before (top); else scroll.prepend (top); };
  place ();
  onWideChange (place);
  return scroll;
}
// A word's panel's height: from its divider down to the play bar; beside the text the text's word's panel's width
// instead: from its divider to the notes' divider (else the search's, else the window's right edge), the text keeping
// 30 % of the window.
for (const [id, key] of [["sheetSplit", "sheetH"], ["besideSplit", "besideH"]] as const)
  drag (document.getElementById (id)!, (x, y) => {
    if (id === "sheetSplit" && side) {
      const right = edgeOf ("notesSplit", "searchSplit"), left = document.querySelector ("main")!.getBoundingClientRect ().left;
      sizes.sheetW = Math.round (clamp ((right - x) / innerWidth * 100, 15, Math.max (15, Math.min (40, (right - left) / innerWidth * 100 - 30))) * 10) / 10;
      root.setProperty ("--sheetW", String (sizes.sheetW));
      return;
    }
    const bar = document.getElementById ("playBar")!.getBoundingClientRect ().top;
    const mid = bar - document.querySelector<HTMLElement> (".head")!.getBoundingClientRect ().bottom;
    sizes[key] = Math.round (clamp (bar - y, 120, Math.max (120, mid - 160)));
    root.setProperty ("--" + key, sizes[key] + "px");
  });
