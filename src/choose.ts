// The pickers (every <select class="choose">: the Verb chart's stem and verb, Flashcards' lists, the paradigms' stem and FILL IN, the
// word panel's GRAMMAR) shown as COTEXT's own: a button with the choice, tapped to
// open the choices as a plain list just under it (or over it, near the bottom of the screen), over the page (no animation - iOS's own picker grows out of the control as a
// bubble), the current one marked; a choice tapped is picked and the list closes, as does tapping the button again or
// anywhere else. The <select> stays, hidden, as the value: its change event and value work as before, so the screens'
// code is unchanged (setting value or selectedIndex updates the button too).

import { box, px } from "./zoom";

const LABEL = (s: HTMLSelectElement) => s.selectedOptions[0]?.textContent ?? "";

function enhance (sel: HTMLSelectElement) {
  if (sel.dataset.plain) return;
  sel.dataset.plain = "1";
  sel.hidden = true;
  const btn = document.createElement ("button");
  btn.type = "button"; btn.className = "choose chooseBtn"; btn.setAttribute ("aria-expanded", "false");
  const list = document.createElement ("div");
  list.className = "chooseList"; list.hidden = true;
  const wrap = document.createElement ("span");     // (The list placed from it, over what's under)
  wrap.className = "chooseWrap";
  wrap.append (btn, list);
  sel.after (wrap);
  const label = () => { btn.textContent = LABEL (sel); btn.disabled = sel.disabled; };     // (A select disabled: its button greyed out, not opening)
  // (Set from code: the button follows. The prototype's own setter still sets the select.)
  for (const prop of ["value", "selectedIndex"] as const) {
    const d = Object.getOwnPropertyDescriptor (HTMLSelectElement.prototype, prop)!;
    Object.defineProperty (sel, prop, { get () { return d.get!.call (sel); }, set (v) { d.set!.call (sel, v); label (); }, configurable: true });
  }
  new MutationObserver (label).observe (sel, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled"] });     // (Options filled in later: GRAMMAR)
  sel.addEventListener ("change", label);
  // Open, the list is moved to the end of the page, so it's over everything (no panel's layer under another's: the
  // notes panel's under the play bar, a sticky ✕); closed, it goes back beside its button.
  const close = () => { list.hidden = true; btn.setAttribute ("aria-expanded", "false"); if (list.parentElement !== wrap) wrap.append (list); };
  // Fixed to the screen, under the button - or over it when there's more room above (a picker near the bottom, as
  // the notes panel's) - and as tall as the room there, so its last choice can always be reached; not clipped by
  // a scrolling panel it's in. Scrolling it never scrolls what's behind (overscroll contained, style.css); anything
  // else scrolled closes it, as the button has moved from under it.
  const place = () => {
    const r = box (btn), h = px (window.visualViewport?.height ?? innerHeight), gap = 12;     // (CSS px, whatever the UI's scale: zoom.ts)
    const below = h - r.bottom - gap, above = r.top - gap, up = below < 240 && above > below;
    // (As tall as the room there and as wide as its choices - at least its button's width, no further than the screen's
    // right edge: a choice on one line where it fits)
    Object.assign (list.style, { left: `${r.left}px`, width: "max-content", minWidth: `${r.width}px`, maxWidth: `${px (innerWidth) - r.left - gap}px`,
      top: up ? "" : `${r.bottom}px`, bottom: up ? `${h - r.top}px` : "",
      maxHeight: `${up ? above : below}px`, marginTop: up ? "0" : "4px", marginBottom: up ? "4px" : "0" });
  };
  addEventListener ("scroll", (e) => { if (! list.hidden && ! list.contains (e.target as Node)) close (); }, true);
  addEventListener ("resize", () => { if (! list.hidden) place (); });
  btn.addEventListener ("click", (e) => {
    e.stopPropagation ();
    if (! list.hidden) { close (); return; }
    for (const l of document.querySelectorAll<HTMLElement> (".chooseList:not(.inline)")) l.hidden = true;     // (One open at a time)
    list.innerHTML = "";
    for (const el of sel.children) {
      const opts = el instanceof HTMLOptGroupElement ? [...el.children] : [el];
      if (el instanceof HTMLOptGroupElement) { const h = document.createElement ("div"); h.className = "ref"; h.textContent = el.label; list.append (h); }
      for (const o of opts as HTMLOptionElement[]) {
        if (o.hidden) continue;     // (A choice not offered just now: Verse cards' None while English only is ticked)
        const b = document.createElement ("button");
        b.type = "button"; b.className = "chooseItem"; b.textContent = o.textContent;
        b.setAttribute ("aria-pressed", String (o.selected));
        b.addEventListener ("click", (ev) => {
          ev.stopPropagation (); close ();
          if (! o.selected) { sel.value = o.value; sel.dispatchEvent (new Event ("change", { bubbles: true })); }
        });
        list.append (b);
      }
    }
    document.body.append (list);
    list.hidden = false; btn.setAttribute ("aria-expanded", "true");
    place ();
    list.querySelector<HTMLElement> ("[aria-pressed=true]")?.scrollIntoView ({ block: "nearest" });
  });
  document.addEventListener ("click", (e) => { if (! list.contains (e.target as Node)) close (); });
  label ();
}

/** Every picker now and any a screen draws later. */
export function initChoose () {
  const all = () => { for (const s of document.querySelectorAll<HTMLSelectElement> ("select.choose")) enhance (s); };
  all ();
  new MutationObserver (all).observe (document.body, { childList: true, subtree: true });
}
