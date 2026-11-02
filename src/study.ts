// The study menu: ☰ opens a drawer from the left, above everything (design/mock-hebrew.html) - first the text itself
// (HEBREW OT or GREEK NT, by the testament shown: back to reading, any study screen closed), then the study screens:
// My vocab, Verb paradigms, Verb chart, Parsing guide. Each opens full screen, with ☰ at its top left (to move between
// them); its contents drawn by its own module (onScreen: vocab.ts, cards.ts, chart.ts, guide.ts), each for the
// testament shown; one not built says it's coming. Picking an item, ✕ or tapping outside closes the drawer.
// Under them, the settings: LEXICON (panel.ts) and GRAMMAR (grammar.ts), each a menu that applies at once.

const drawer = document.getElementById ("drawer")!;
const homeBtn = document.getElementById ("homeBtn")!;
const screen = document.getElementById ("screen")!;
const screenTitle = document.getElementById ("screenTitle")!;
const screenBody = document.getElementById ("screenBody")!;

const open = () => { drawer.hidden = false; };
const close = () => { drawer.hidden = true; };
let testament: "OT" | "NT" = "OT";
const screens = new Map<string, (body: HTMLElement) => void> ();

/** Names the drawer's first item after the testament shown. */
export function setTestament (t: "OT" | "NT") {
  testament = t;
  homeBtn.textContent = t === "OT" ? "HEBREW OT" : "GREEK NT";
}
/** The testament shown: the study screens follow it. */
export const currentTestament = () => testament;

/** A study screen's drawing: called with its body each time it opens. */
export function onScreen (name: string, draw: (body: HTMLElement) => void) { screens.set (name, draw); }

/** Opens a study screen by its name (as the drawer's items name them). */
export function openScreen (name: string) {
  screenTitle.textContent = name;
  screenBody.textContent = "";
  const draw = screens.get (name);
  if (draw) draw (screenBody); else screenBody.innerHTML = "<p>Coming soon.</p>";
  screen.hidden = false;
  screen.scrollTop = 0;
}

document.getElementById ("drawerBtn")!.addEventListener ("click", open);
document.getElementById ("screenMenu")!.addEventListener ("click", open);
document.getElementById ("drawerClose")!.addEventListener ("click", close);
drawer.addEventListener ("click", (e) => { if (e.target === drawer) close (); });
homeBtn.addEventListener ("click", () => { screen.hidden = true; close (); });
for (const b of document.querySelectorAll<HTMLElement> ("#drawerPanel [data-screen]"))
  b.addEventListener ("click", () => { openScreen (b.dataset.screen!); close (); });
