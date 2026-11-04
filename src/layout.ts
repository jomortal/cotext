// The page's layout by the window's width (style.css's two @media blocks, at the same 700 px):
// - Narrow (a phone, or an iPad's narrow Split View window): one column - the heading, the text, the word's panel, the
//   notes panel, the second word's panel, the play bar - the panels sharing the room evenly with the text (style.css).
// - Wide (an iPad, a desktop): two columns between the heading and the play bar (index.html's #textCol, #notesCol) -
//   the text, and at the RIGHT the notes panel, a third of the width at first; each word's panel at the foot of the
//   column whose text it's about (the text's word under the text; a word of the notes' Hebrew OT under the notes), as
//   wide as its column. Dividers set the sizes by dragging (pointer events, so a finger, a pen or a mouse): #notesSplit,
//   between the columns (the notes' width, 22-60 % of the window), and #sheetSplit / #besideSplit, on each word's
//   panel's top edge (its height, from 120 px to the room between the bars less 160 px for what's above it). All kept
//   on the device (localStorage) and set on the root as --notesW (a percentage, unitless), --sheetH and --besideH (px).
// The notes panel follows the text both ways while wide (notes.ts' TWO-WAY SCROLLING).

const WIDE = matchMedia ("(min-width: 700px)");     // (style.css's breakpoint: keep the two the same)
/** Whether the page is laid out wide now. */
export const isWide = () => WIDE.matches;
/** Calls f whenever the layout changes between narrow and wide. */
export const onWideChange = (f: () => void) => WIDE.addEventListener ("change", f);

const KEY = "cotext.splits";
const root = document.documentElement.style;
const sizes: { notesW?: number; sheetH?: number; besideH?: number } = {};
try { Object.assign (sizes, JSON.parse (localStorage.getItem (KEY) ?? "{}")); } catch { /* none kept, or private mode */ }
if (sizes.notesW) root.setProperty ("--notesW", String (sizes.notesW));
if (sizes.sheetH) root.setProperty ("--sheetH", sizes.sheetH + "px");
if (sizes.besideH) root.setProperty ("--besideH", sizes.besideH + "px");
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
// A word's panel's height: from its divider down to the play bar.
for (const [id, key] of [["sheetSplit", "sheetH"], ["besideSplit", "besideH"]] as const)
  drag (document.getElementById (id)!, (_x, y) => {
    const bar = document.getElementById ("playBar")!.getBoundingClientRect ().top;
    const mid = bar - document.querySelector<HTMLElement> (".head")!.getBoundingClientRect ().bottom;
    sizes[key] = Math.round (clamp (bar - y, 120, Math.max (120, mid - 160)));
    root.setProperty ("--" + key, sizes[key] + "px");
  });
