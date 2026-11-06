// The bottom bars (the play bar, the Verse cards' bar; ‹ and › at their ends, stepping - a swipe does the same: onSwipe): at the screen's foot - or, sideways
// (the window wider than tall: a phone held sideways, a tablet's or a desktop's window wider than a phone's - layout.ts),
// a vertical bar down its right side (style.css' SIDE BAR media query: keep the two the same), taking no room at the foot.

import { box } from "./zoom";

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

/** ‹ and › into the margins: with a mouse (a desktop), a column narrower than its room - margins either side at least
 *  ARROW_ROOM wide -, the two buttons out of their bar, each centered in its margin (style.css' .inMargin: --x, --y), at
 *  the room's middle height (mid "room": the Bible's text) or the column's (mid "column": a deck's card). Worked out
 *  again as the room, the column or the window changes size; the last call for a button (a deck drawn again) the one
 *  kept. */
const ARROW_ROOM = 64, FINE = matchMedia ("(pointer: fine)");
const watching = new WeakMap<HTMLElement, () => void> ();
export function marginArrows (room: HTMLElement, column: HTMLElement, prev: HTMLElement, next: HTMLElement, mid: "room" | "column" = "room") {
  watching.get (prev)?.();
  const place = () => {
    const m = box (room), t = box (column);     // (CSS px, whatever the UI's scale: zoom.ts)
    const left = t.left - m.left, right = m.right - t.right, on = FINE.matches && t.width > 0 && left >= ARROW_ROOM && right >= ARROW_ROOM;
    const y = mid === "room" ? m.top + m.height / 2 : t.top + t.height / 2;
    for (const [b, x] of [[prev, m.left + left / 2], [next, t.right + right / 2]] as const) {
      b.classList.toggle ("inMargin", on);
      if (on) { b.style.setProperty ("--x", `${x}px`); b.style.setProperty ("--y", `${y}px`); }
    }
  };
  const ro = new ResizeObserver (place);
  ro.observe (room); ro.observe (column);
  FINE.addEventListener ("change", place); addEventListener ("resize", place);
  watching.set (prev, () => { ro.disconnect (); FINE.removeEventListener ("change", place); removeEventListener ("resize", place); });
}
