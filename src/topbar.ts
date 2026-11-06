// A study screen's own top row (the Verse cards', the Study printout's, Vocab's): a title centered (topTitle) - for a set of named things (the Verse cards' decks, the Study printout's printouts) the
// open one's name centered, a drop-down arrow beside it (⌄, the pickers' own: choose.ts' button), tapped opening its
// drop-down under it - SELECT <NOUN> (each by name; picking one opens it), DELETE <NOUN> beside it (the open one, asked
// first) and + NEW <NOUN> at its right, then NAME (the open one's, edited in place, the title following as it's
// typed). Both screens build it here, one way (style.css' .topBar, .topRow, .topTitle, .topArrow, .vcMenu, .vcAdd).
// What each item is, and what opening, making, deleting and renaming do (saving, drawing the screen again), is the
// screen's: passed in as NameMenu's functions.

/** One of the set: its id and its name. */
export interface Named { id: string; name: string; }

/** A screen's set of named things, as the top row needs it. noun: "Deck", "Printout" (+ NEW DECK, SELECT deck);
 *  shown: the name shown for one (its own, or what stands for it while it has none); select: open another by id;
 *  make: a new one made and opened; ask: the question asked before deleting the open one; remove: delete it;
 *  renamed: the open one's name just set (to keep it); blank: the name a blank one is given once NAME is left ("": none -
 *  shown then stands for it). */
export interface NameMenu<T extends Named> {
  noun: string;
  all: () => T[];
  open: () => T;
  shown: (x: T) => string;
  select: (id: string) => void;
  make: () => void;
  ask: (x: T) => string;
  remove: (x: T) => void;
  renamed: (x: T) => void;
  blank: string;
}

const make = <K extends keyof HTMLElementTagNameMap> (tag: K, cls = "", text = "") => {
  const e = document.createElement (tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** A top row's title: an h1 holding a button - the name (text) and the drop-down arrow ⌄ beside it -, its label
 *  "<text>: <what>" for a screen reader; name: the span showing the text (set to change it; the label with it). The
 *  screen places the title in its .topRow and makes the button its drop-down's (dropDowns). Every top row's title
 *  (the Verse cards', the Study printout's, Vocab's) is made here. */
export function topTitle (text: string, what: string): { title: HTMLElement; button: HTMLButtonElement; name: HTMLElement; set: (t: string) => void } {
  const title = make ("h1"), button = make ("button", "pill icon topTitle"), name = make ("span", "topName", text);
  const arrow = make ("span", "topArrow", "⌄");
  arrow.setAttribute ("aria-hidden", "true");
  button.setAttribute ("aria-expanded", "false");
  button.append (name, arrow);
  title.append (button);
  const set = (t: string) => { name.textContent = t; button.setAttribute ("aria-label", `${t}: ${what}`); };
  set (text);
  return { title, button, name, set };
}

/** The top row's title (topTitle) and the name's drop-down's first rows (SELECT and
 *  DELETE, then NAME), for the screen to place: the title in its .topRow, the rows at the top of its .vcMenu. */
export function nameMenu<T extends Named> (o: NameMenu<T>): { title: HTMLElement; button: HTMLButtonElement; rows: HTMLElement[] } {
  const x = o.open (), noun = o.noun.toLowerCase ();
  const { title, button, set } = topTitle (o.shown (x), `${noun} options`);
  // SELECT <NOUN>, DELETE <NOUN> and + NEW <NOUN>
  const pickRow = make ("div", "vcAdd"), pickLabel = make ("label", "vcPick", `Select ${noun}`), pick = make ("select", "choose");
  pick.append (...o.all ().map ((y) => new Option (o.shown (y), y.id, false, y === x)));
  pick.addEventListener ("change", () => o.select (pick.value));
  pickLabel.append (pick);
  const del = make ("button", "pill", `Delete ${noun}`);
  del.addEventListener ("click", () => { if (confirm (o.ask (x))) o.remove (x); });
  const add = make ("button", "pill", `+ New ${o.noun}`);
  add.addEventListener ("click", () => o.make ());
  pickRow.append (pickLabel, del, add);
  // NAME: typed, the title and SELECT's choice follow; left blank, the blank name (or what's shown for none)
  const nameRow = make ("label", "vcPick vcName", "Name"), input = make ("input", "choose");
  Object.assign (input, { type: "text", value: x.name || o.shown (x), autocomplete: "off", spellcheck: false });
  input.setAttribute ("enterkeyhint", "done");
  const follow = () => {
    o.renamed (x);
    set (o.shown (x));
    pick.selectedOptions[0].textContent = o.shown (x);
  };
  input.addEventListener ("input", () => { x.name = input.value.trim () ? input.value : ""; follow (); });
  input.addEventListener ("change", () => { if (! x.name.trim ()) { x.name = o.blank; input.value = o.shown (x); follow (); } });
  nameRow.append (input);
  return { title, button, rows: [pickRow, nameRow] };
}

/** The top row's drop-downs, one open at a time: each its button and its menu (icon: the button's own glyph - a ✕ while
 *  its menu is open -, or "" for the title, which keeps its name); open: the one open at first ("" none); each change
 *  told to changed (the screen keeping which is open across redraws). */
export function dropDowns (tops: { key: string; button: HTMLElement; menu: HTMLElement; icon: string }[], open: string, changed: (k: string) => void = () => {}) {
  const show = (k: string) => {
    for (const t of tops) {
      t.menu.hidden = t.key !== k;
      t.button.setAttribute ("aria-expanded", String (t.key === k));
      if (t.icon) t.button.textContent = t.key === k ? "✕" : t.icon;
    }
    open = k; changed (k);
  };
  for (const t of tops) t.button.addEventListener ("click", () => show (open === t.key ? "" : t.key));
  show (open);
}

/** The top bar's height kept as the screen's --topH (its room starting under the bar, however tall a drop-down open in
 *  it makes it: style.css). */
export function watchTopBar (bar: HTMLElement) {
  const screen = document.getElementById ("screen")!;
  new ResizeObserver (() => screen.style.setProperty ("--topH", bar.offsetHeight + "px")).observe (bar);
}
