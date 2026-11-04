// The study menu: ☰ opens a drawer from the left, above everything (design/mock-hebrew.html) - the study screens:
// Vocab, Verb paradigms, Verb chart, Parsing guide. Each opens full screen, with ☰ at its top left (to move between
// them) and ✕ at its top right (back to the text); its contents drawn by its own module (onScreen: vocab.ts, cards.ts, chart.ts, guide.ts), each for the
// testament shown; one not built says it's coming. Picking an item, ✕ or tapping outside closes the drawer.
// At its top, HEBREW / GREEK: the Old Testament read - Hebrew (the Hebrew Bible) or Greek (the Septuagint, its
// books the Hebrew Bible lacks too); the New Testament is Greek either way. Kept on the device; main.ts goes to the
// same place in the other (onLanguage), and a book shown sets it (an LXX book Greek, a Hebrew one Hebrew).

const drawer = document.getElementById ("drawer")!;
const screen = document.getElementById ("screen")!;
const screenTitle = document.getElementById ("screenTitle")!;
const screenBody = document.getElementById ("screenBody")!;

const open = () => { drawer.hidden = false; };
const close = () => { drawer.hidden = true; };
/** The testament shown: the Hebrew OT, the Greek NT or the Septuagint (Greek: every Greek tool follows it, its
 *  own frequency counts apart). */
export type Testament = "OT" | "NT" | "LXX";
let testament: Testament = "OT";
const screens = new Map<string, (body: HTMLElement) => void | Promise<void>> ();

/** The testament shown (the study screens follow it); an OT or LXX book sets the language too. */
export function setTestament (t: Testament) {
  testament = t;
  showLanguage (t === "OT" ? "H" : "G");     // (The NT is Greek's, as the Septuagint is)
}
/** The testament shown: the study screens follow it. */
export const currentTestament = () => testament;

// ---- HEBREW / GREEK ----

const LANG = "cotext.lang";
let language: "H" | "G" = "H";
try { if (localStorage.getItem (LANG) === "G") language = "G"; } catch { /* private mode: Hebrew */ }
let languageChanged: (l: "H" | "G") => void = () => {};
/** The Old Testament's language picked: H the Hebrew Bible, G the Septuagint. */
export const currentLanguage = () => language;
/** main.ts: what to do when it's changed in the drawer (go to the same place in the other). */
export function onLanguage (f: (l: "H" | "G") => void) { languageChanged = f; }
function showLanguage (l: "H" | "G") {
  language = l;
  try { localStorage.setItem (LANG, l); } catch { /* private mode: not kept */ }
  for (const b of document.querySelectorAll<HTMLElement> ("#langPick [data-lang]")) b.setAttribute ("aria-pressed", String (b.dataset.lang === l));
}
showLanguage (language);
for (const b of document.querySelectorAll<HTMLElement> ("#langPick [data-lang]"))
  b.addEventListener ("click", () => {
    const l = b.dataset.lang as "H" | "G";
    if (l === language) return;
    showLanguage (l);
    languageChanged (l);
  });

/** A study screen's drawing: called with its body each time it opens (it may draw later, once the database answers). */
export function onScreen (name: string, draw: (body: HTMLElement) => void | Promise<void>) { screens.set (name, draw); }

/** Opens a study screen by its name (as the drawer's items name them). */
export function openScreen (name: string) {
  screenTitle.textContent = name;
  // (Each opening drawn into a body of its own, laid out as #screenBody's own children: a screen still drawing when
  // another opens draws into one no longer shown)
  const body = document.createElement ("div");
  body.style.display = "contents";
  screenBody.replaceChildren (body);
  const draw = screens.get (name);
  if (draw) draw (body); else body.innerHTML = "<p>Coming soon.</p>";
  screen.hidden = false;
  screen.scrollTop = 0;
}

document.getElementById ("drawerBtn")!.addEventListener ("click", open);
document.getElementById ("screenMenu")!.addEventListener ("click", open);
document.getElementById ("drawerClose")!.addEventListener ("click", close);
drawer.addEventListener ("click", (e) => { if (e.target === drawer) close (); });
document.getElementById ("screenClose")!.addEventListener ("click", () => { screen.hidden = true; });     // (✕: back to the text)
for (const b of document.querySelectorAll<HTMLElement> ("#drawerPanel [data-screen]"))
  b.addEventListener ("click", () => { openScreen (b.dataset.screen!); close (); });
