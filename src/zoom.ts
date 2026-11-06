// The UI's scale (style.css' --ui-scale: the whole page zoomed as one - 0.75 with a mouse or trackpad (pointer: fine),
// 1 on a touch screen), and the page's measurements brought into one space under it: the page's own CSS px, the units
// style lengths and scroll positions are in. Browsers differ under CSS zoom (measured 2026-11-06): pointer events'
// clientX / clientY and innerWidth / innerHeight are the screen's px in Chrome and Safari alike - divided by the scale
// (px) -; an element's getBoundingClientRect (and a Range's rects) is the screen's px in Chrome but already CSS px in
// Safari (WebKit) - box / rectPx divide by whichever it is (rectScale, measured on the root); scrollTop, offsetWidth and
// clientWidth are CSS px in both. Viewport units (vh, vw) are scaled by Chrome's zoom and not by Safari's, so the page
// sizes by the window's CSS size instead (--winW, --winH: layout.ts).

const FINE = matchMedia ("(pointer: fine)");     // (style.css' --ui-scale query: keep the two the same)
let scale = 1, rectScale = 1;
function measure () {
  const html = document.documentElement;
  scale = parseFloat (getComputedStyle (html).getPropertyValue ("--ui-scale")) || 1;
  // (The root fills the window: its rect as wide as the window's px - Chrome - or as its CSS px - Safari)
  rectScale = Math.abs (html.getBoundingClientRect ().width - innerWidth) < 2 ? scale : 1;
}
measure ();
FINE.addEventListener ("change", measure);
/** Calls f whenever the scale changes (a mouse plugged into a tablet, a window moved to a touch screen) - after it's
 *  measured again. */
export const onScale = (f: () => void) => FINE.addEventListener ("change", f);

/** The scale now (1 on a touch screen). */
export const uiScale = () => scale;
/** A window or pointer measurement (clientX / Y, innerWidth / Height, the visual viewport's) in the page's CSS px. */
export const px = (v: number) => v / scale;
/** A getBoundingClientRect (or Range rect) length in the page's CSS px. */
export const rectPx = (v: number) => v / rectScale;
/** An element's box in the page's CSS px, from the window's top left (as px (clientX) is). */
export function box (el: Element) {
  const r = el.getBoundingClientRect (), k = rectScale;
  return { left: r.left / k, top: r.top / k, right: r.right / k, bottom: r.bottom / k, width: r.width / k, height: r.height / k };
}
/** The window's width and height in the page's CSS px. */
export const winW = () => px (innerWidth), winH = () => px (innerHeight);
