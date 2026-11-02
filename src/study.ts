// The study menu: ☰ opens a drawer from the left, above everything (design/mock-hebrew.html) - first the text itself
// (HEBREW OT or GREEK NT, by the testament shown: back to reading, any study screen closed), then the study screens:
// My vocab, Verb paradigms, Verb chart, Parsing guide. Those aren't built yet: each opens a screen of its own, with
// ☰ at its top left (to move between them), saying it's coming. Picking an item, ✕ or tapping outside closes it.

const drawer = document.getElementById ("drawer")!;
const homeBtn = document.getElementById ("homeBtn")!;
const screen = document.getElementById ("screen")!;
const screenTitle = document.getElementById ("screenTitle")!;

const open = () => { drawer.hidden = false; };
const close = () => { drawer.hidden = true; };

/** Names the drawer's first item after the testament shown. */
export function setTestament (testament: "OT" | "NT") {
  homeBtn.textContent = testament === "OT" ? "HEBREW OT" : "GREEK NT";
}

document.getElementById ("drawerBtn")!.addEventListener ("click", open);
document.getElementById ("screenMenu")!.addEventListener ("click", open);
document.getElementById ("drawerClose")!.addEventListener ("click", close);
drawer.addEventListener ("click", (e) => { if (e.target === drawer) close (); });
homeBtn.addEventListener ("click", () => { screen.hidden = true; close (); });
for (const b of document.querySelectorAll<HTMLElement> ("#drawerPanel [data-screen]"))
  b.addEventListener ("click", () => {
    screenTitle.textContent = b.dataset.screen!;
    screen.hidden = false;
    screen.scrollTop = 0;
    close ();
  });
