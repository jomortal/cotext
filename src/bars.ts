// The bottom bars (the play bar, the Verse cards' bar; ‹ and › at their ends, stepping - a swipe does the same: onSwipe): at the screen's foot - or, sideways
// (the window wider than tall: a phone held sideways, a tablet's or a desktop's window wider than a phone's - layout.ts),
// a vertical bar down its right side (style.css' SIDE BAR media query: keep the two the same), taking no room at the foot.
// One size on every device: a row the heading's height, under it (or, down the side, at its right) only the device's
// own inset as plain room, no button in it (style.css' BOTTOM BAR).

import { box, winW, winH, mouseSeen, onScale, offScale } from "./zoom";

export const SIDE_BAR = matchMedia ("(orientation: landscape) and (max-height: 500px), (orientation: landscape) and (min-width: 600.02px)");

/** The room a bottom bar takes at the screen's foot: its height - none while it's down the side. */
export const barRoom = (bar: HTMLElement | null) => ! bar || SIDE_BAR.matches ? 0 : bar.offsetHeight;

/** A swipe across el steps as the bars' ‹ and › do: step (1) to the left (the next), step (-1) to the right (the
 *  previous) - one finger, at least 60 px across, more than twice as far across as down (not a scroll), within 0.8 s,
 *  nothing selected. */
export function onSwipe (el: HTMLElement, step: (by: 1 | -1) => void) {
  let from: { x: number; y: number; t: number } | null = null;
  el.addEventListener ("touchstart", (e) => {
    from = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY, t: e.timeStamp } : null;
  }, { passive: true });
  el.addEventListener ("touchcancel", () => { from = null; });
  el.addEventListener ("touchend", (e) => {
    const f = from, t = e.changedTouches[0];
    from = null;
    if (! f || e.touches.length || e.timeStamp - f.t > 800 || document.getSelection ()?.isCollapsed === false) return;
    const dx = t.clientX - f.x, dy = t.clientY - f.y;
    if (Math.abs (dx) >= 60 && Math.abs (dx) > 2 * Math.abs (dy)) step (dx < 0 ? 1 : -1);
  }, { passive: true });
}

/** ‹ and › into the margins: on a device that has shown a mouse or trackpad (zoom.ts' mouseSeen), once each side of the column (the Bible's text, a deck's card)
 *  has room for a margin, the arrow and a margin again (M + A + M: M the side margin, style.css' --margin, read from
 *  it; A the arrow's width) the two buttons come out of their bar and stand beside the column - ‹ its right edge M left
 *  of the column's left edge, › its left edge M right of its right edge (style.css' .inMargin: --x, --y, their middles)
 *  -, staying that close however wide the window grows; with less room they stay in the bar. Vertically at the room's
 *  middle height (mid "room": the Bible's text) or the column's (mid "column": a deck's card). Worked out again as the
 *  room, the column or the window changes size; the last call for a button (a deck drawn again) the one kept. */
const watching = new WeakMap<HTMLElement, () => void> ();
export function marginArrows (room: HTMLElement, column: HTMLElement, prev: HTMLElement, next: HTMLElement, mid: "room" | "column" = "room") {
  watching.get (prev)?.();
  const place = () => {
    const m = box (room), t = box (column);     // (CSS px, whatever the UI's scale: zoom.ts)
    const M = parseFloat (getComputedStyle (document.documentElement).getPropertyValue ("--margin")) || 16;     // (CSS px, as box's)
    const left = t.left - m.left, right = m.right - t.right;
    const fits = (b: HTMLElement) => mouseSeen () && t.width > 0 && Math.min (left, right) >= 2 * M + b.offsetWidth;
    const on = fits (prev) && fits (next);
    const y = mid === "room" ? m.top + m.height / 2 : t.top + t.height / 2;
    for (const [b, x] of [[prev, t.left - M - prev.offsetWidth / 2], [next, t.right + M + next.offsetWidth / 2]] as const) {
      b.classList.toggle ("inMargin", on);
      if (on) { b.style.setProperty ("--x", `${x}px`); b.style.setProperty ("--y", `${y}px`); }
    }
  };
  const ro = new ResizeObserver (place);
  ro.observe (room); ro.observe (column);
  onScale (place); addEventListener ("resize", place);     // (A mouse or trackpad first seen: zoom.ts)
  watching.set (prev, () => { ro.disconnect (); offScale (place); removeEventListener ("resize", place); });
}

/** The notch's side, sideways: an iPhone gives both sides the notch's room (safe-area-inset-left and -right alike), so
 *  the side away from the notch is told none (style.css' --inset-l / --inset-r) - the side bar, the text's margin there
 *  no wider than their own. Which side has it by the way the phone is turned (window.orientation: 90 turned to the
 *  left, its top - the notch - at the left; -90 to the right; else screen.orientation's angle, the other way round);
 *  upright, both sides as the screen says. Worked out again as it turns. */
function notchSide () {
  const wo = (window as { orientation?: number }).orientation;
  const a = typeof wo === "number" ? wo : (360 - (screen.orientation?.angle ?? 0)) % 360;
  const turn = a === 90 ? "left" : a === -90 || a === 270 ? "right" : "";
  const s = document.documentElement.style;
  s.setProperty ("--inset-l", turn === "right" ? "0px" : "env(safe-area-inset-left, 0px)");
  s.setProperty ("--inset-r", turn === "left" ? "0px" : "env(safe-area-inset-right, 0px)");
}
notchSide ();
addEventListener ("orientationchange", notchSide); screen.orientation?.addEventListener ("change", notchSide);

/** The room a menu or list laid over the screen may take: up to the bar shown - its top, at the foot; its left edge,
 *  down the side - never over it (the pickers' lists, + Add item's menu). In CSS px, whatever the UI's scale. */
export function openRoom (): { right: number; bottom: number } {
  const bars = [...document.querySelectorAll<HTMLElement> (".bottomBar")].filter ((b) => b.getBoundingClientRect ().width);
  const bar = bars.find ((b) => b.closest ("#screen")) ?? bars[0];     // (A ☰ screen's own over the Bible's play bar)
  if (! bar) return { right: winW (), bottom: winH () };
  const r = box (bar);
  return SIDE_BAR.matches ? { right: r.left, bottom: winH () } : { right: winW (), bottom: r.top };
}
