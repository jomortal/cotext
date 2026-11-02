// The pickers (every <select class="choose">: the Verb chart's stem and verb, the paradigms' stem and FILL IN, My
// vocab's frequency lists, the LEXICON and GRAMMAR settings) shown as COTEXT's own: a button with the choice, tapped to
// open the choices as a plain list just under it, over the page (no animation - iOS's own picker grows out of the control as a
// bubble), the current one marked; a choice tapped is picked and the list closes, as does tapping the button again or
// anywhere else. The <select> stays, hidden, as the value: its change event and value work as before, so the screens'
// code is unchanged (setting value or selectedIndex updates the button too).

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
  const label = () => { btn.textContent = LABEL (sel); };
  // (Set from code: the button follows. The prototype's own setter still sets the select.)
  for (const prop of ["value", "selectedIndex"] as const) {
    const d = Object.getOwnPropertyDescriptor (HTMLSelectElement.prototype, prop)!;
    Object.defineProperty (sel, prop, { get () { return d.get!.call (sel); }, set (v) { d.set!.call (sel, v); label (); }, configurable: true });
  }
  new MutationObserver (label).observe (sel, { childList: true, subtree: true });     // (Options filled in later: GRAMMAR)
  sel.addEventListener ("change", label);
  const close = () => { list.hidden = true; btn.setAttribute ("aria-expanded", "false"); };
  btn.addEventListener ("click", (e) => {
    e.stopPropagation ();
    if (! list.hidden) { close (); return; }
    for (const l of document.querySelectorAll<HTMLElement> (".chooseList")) l.hidden = true;     // (One open at a time)
    list.innerHTML = "";
    for (const el of sel.children) {
      const opts = el instanceof HTMLOptGroupElement ? [...el.children] : [el];
      if (el instanceof HTMLOptGroupElement) { const h = document.createElement ("div"); h.className = "ref"; h.textContent = el.label; list.append (h); }
      for (const o of opts as HTMLOptionElement[]) {
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
    list.hidden = false; btn.setAttribute ("aria-expanded", "true");
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
