// The bottom bars (the play bar, the Verse cards' bar; ‹ and › at their ends, stepping - a swipe does the same: onSwipe): at the screen's foot - or, sideways
// (the window wider than tall: a phone held sideways, a tablet's or a desktop's window wider than a phone's - layout.ts),
// a vertical bar down its right side (style.css' SIDE BAR media query: keep the two the same), taking no room at the foot.

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
