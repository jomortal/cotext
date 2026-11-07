// The UI's scale (style.css' --ui-scale: the whole page zoomed as one - 1 now; a device that has shown a mouse or
// trackpad gets smaller icons instead, --icon-scale), and the page's measurements brought into one space under it: the page's own CSS px, the
// units style lengths and scroll positions are in. Browsers differ under CSS zoom (measured 2026-11-06): pointer events'
// clientX / clientY and innerWidth / innerHeight are the screen's px in Chrome and Safari alike - divided by the scale
// (px) -; an element's getBoundingClientRect (and a Range's rects) is the screen's px in Chrome but already CSS px in
// Safari (WebKit) - box / rectPx divide by whichever it is (rectScale, measured on the root); scrollTop, offsetWidth and
// clientWidth are CSS px in both. Viewport units (vh, vw) are scaled by Chrome's zoom and not by Safari's, so the page
// sizes by the window's CSS size instead (--winW, --winH: layout.ts).

/* THE INPUT: a mouse or trackpad seen - the browser saying it has one (any-pointer: fine), or one used (a pointer event
   of type "mouse" or "pen") - marks the device (localStorage cotext.pointer "fine": the root's data-pointer, style.css'
   icons' --icon-scale) for good; touch never unmarks it. Not the browser's word alone: Chrome on a Windows touchscreen laptop can say
   it has touch only (measured 2026-11-06: any-pointer: fine false, the trackpad there), and that changes from one start
   to the next. index.html sets the mark before the first paint, by the same test. */
const KEY = "cotext.pointer", FINE = matchMedia ("(any-pointer: fine)");
const html = document.documentElement, listeners: (() => void)[] = [];
let seen = html.dataset.pointer === "fine";
/** Whether this device has shown a mouse or trackpad (style.css' --icon-scale, 0.8; bars.ts' margin arrows). */
export const mouseSeen = () => seen;
function markFine () {
  if (seen) return;
  seen = true; html.dataset.pointer = "fine";
  try { localStorage.setItem (KEY, "fine"); } catch {}
  measure (); for (const f of listeners) f ();
}
FINE.addEventListener ("change", () => { if (FINE.matches) markFine (); });
addEventListener ("pointermove", (e) => { if (e.pointerType === "mouse" || e.pointerType === "pen") markFine (); }, { capture: true, passive: true });
addEventListener ("pointerdown", (e) => { if (e.pointerType === "mouse" || e.pointerType === "pen") markFine (); }, { capture: true, passive: true });

let scale = 1, rectScale = 1;
function measure () {
  scale = parseFloat (getComputedStyle (html).getPropertyValue ("--ui-scale")) || 1;
  // (The root fills the window: its rect as wide as the window's px - Chrome - or as its CSS px - Safari)
  rectScale = Math.abs (html.getBoundingClientRect ().width - innerWidth) < 2 ? scale : 1;
}
measure ();
if (seen || FINE.matches) { seen = false; markFine (); }     // (Kept, so a later start the browser says touch only keeps it)
/** Calls f when a mouse or trackpad is first seen (the icons' and bars' sizes changed) - after it's measured again. */
export const onScale = (f: () => void) => { listeners.push (f); };
/** Stops calling f (onScale's). */
export const offScale = (f: () => void) => { const i = listeners.indexOf (f); if (i >= 0) listeners.splice (i, 1); };

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
