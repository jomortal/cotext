// The page's layout by the window's width (style.css's @media blocks, at the same 700 px and 1200 px):
// - Narrow (a phone, or an iPad's narrow Split View window): one column - the heading, the text, the word's panel, the
//   notes panel, the second word's panel, the play bar - the panels sharing the room evenly with the text (style.css).
// - Wide (an iPad, a desktop): two columns between the heading and the play bar (index.html's #textCol, #notesCol) -
//   the text, and at the RIGHT the notes panel, a third of the width at first; each word's panel (below 1200 px) at the foot of the
//   column whose text it's about (the text's word under the text; a word of the notes' Hebrew OT under the notes), as
//   wide as its column. Dividers set the sizes by dragging (pointer events, so a finger, a pen or a mouse): #notesSplit,
//   between the columns (the notes' width, 22-60 % of the window), and #sheetSplit / #besideSplit, on each word's
//   panel's top edge (its height, from 120 px to the room between the bars less 160 px for what's above it). All kept
//   on the device (localStorage) and set on the root as --notesW (a percentage, unitless), --sheetH and --besideH (px).
// - Widest (1200 px and up, style.css's third block): the text's word's panel a column of its own between the text and
//   the notes - text | word | notes -, its width (--sheetW, a percentage, unitless: 15-40 % of the window, the text
//   keeping 30 % at least) set by #sheetSplit, now a vertical divider on its left edge.
// The notes panel follows the text both ways while wide (notes.ts' TWO-WAY SCROLLING).

const WIDE = matchMedia ("(min-width: 700px)");     // (style.css's breakpoint: keep the two the same)
/** Whether the page is laid out wide now. */
export const isWide = () => WIDE.matches;
/** Calls f whenever the layout changes between narrow and wide. */
export const onWideChange = (f: () => void) => WIDE.addEventListener ("change", f);
const WIDEST = matchMedia ("(min-width: 1200px)");     // (style.css's third block: keep the two the same)
/** Whether the text's word's panel is a column beside the text (1200 px and up). */
export const isWidest = () => WIDEST.matches;

const KEY = "cotext.splits";
const root = document.documentElement.style;
const sizes: { notesW?: number; sheetH?: number; sheetW?: number; besideH?: number } = {};
try { Object.assign (sizes, JSON.parse (localStorage.getItem (KEY) ?? "{}")); } catch { /* none kept, or private mode */ }
if (sizes.notesW) root.setProperty ("--notesW", String (sizes.notesW));
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
// The notes' width: from the divider to the window's right edge, as a share of the width.
drag (document.getElementById ("notesSplit")!, (x) => {
  sizes.notesW = Math.round (clamp ((innerWidth - x) / innerWidth * 100, 22, 60) * 10) / 10;
  root.setProperty ("--notesW", String (sizes.notesW));
});
// The text's word's divider: vertical at 1200 px and up (its panel a column: style.css draws a divider by its
// aria-orientation), else horizontal - kept so as the window crosses 1200 px.
const sheetSplit = document.getElementById ("sheetSplit")!;
const orient = () => sheetSplit.setAttribute ("aria-orientation", WIDEST.matches ? "vertical" : "horizontal");
orient ();
WIDEST.addEventListener ("change", orient);
// A word's panel's height: from its divider down to the play bar; at 1200 px and up the text's word's panel's width
// instead: from its divider to the notes' divider (the window's right edge while the notes are closed).
for (const [id, key] of [["sheetSplit", "sheetH"], ["besideSplit", "besideH"]] as const)
  drag (document.getElementById (id)!, (x, y) => {
    if (id === "sheetSplit" && WIDEST.matches) {
      const notes = document.getElementById ("notesSplit")!.getBoundingClientRect ();
      const right = notes.width ? notes.left : innerWidth;
      sizes.sheetW = Math.round (clamp ((right - x) / innerWidth * 100, 15, Math.max (15, Math.min (40, right / innerWidth * 100 - 30))) * 10) / 10;
      root.setProperty ("--sheetW", String (sizes.sheetW));
      return;
    }
    const bar = document.getElementById ("playBar")!.getBoundingClientRect ().top;
    const mid = bar - document.querySelector<HTMLElement> (".head")!.getBoundingClientRect ().bottom;
    sizes[key] = Math.round (clamp (bar - y, 120, Math.max (120, mid - 160)));
    root.setProperty ("--" + key, sizes[key] + "px");
  });
