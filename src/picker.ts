// Choosing a passage: the heading's button opens a list where the text is - under the heading, over the play bar (both
// kept in view), over any panes open (the word's, the notes', the search) - the books under their headings (main.ts: the Old Testament in
// the language picked - Hebrew, or the Septuagint's books that have a Hebrew counterpart: HEBREW / GREEK LXX in its
// heading -, then the New Testament, always), one under another; a book tapped opens its chapters (numbers, six
// to a row; only those it has - Enoch's fragments) under it in the list - one book open at a time, tapped again
// closed - and picking a chapter goes there (a one-chapter book goes straight there). No ✕: the heading's passage
// tapped again closes it.

import { nativeName } from "./booknames";
import type { Book } from "./reader";
import { barRoom } from "./bars";

const picker = document.getElementById ("picker")!;
const body = document.getElementById ("pickerBody")!;

// While the book list is open, the heading's ⋯ and the play bar's buttons (▶, search, notes) are inactive (greyed out:
// .pill:disabled)
const idle = ["optionsBtn", "playBtn", "searchBtn", "notesBtn"].map ((id) => document.getElementById (id) as HTMLButtonElement);
new MutationObserver (() => { for (const b of idle) b.disabled = ! picker.hidden; }).observe (picker, { attributes: true, attributeFilter: ["hidden"] });

// (On a wide screen it - and a study screen, ☰'s, but for its right edge (below) - starts and ends where the text's column does, so the panes' column
// at the right stays in view: --textL and --textR, the text's insets from the window's edges, set on the root for
// style.css; kept so as the column changes - a pane opened or closed, a split dragged, the window resized)
// (Measured on the text itself, main: with the word beside the text #textCol has no box of its own - style.css)
const text = document.querySelector ("main")!;
// A study screen also covers the word's panel beside the text: its right inset, --studyR, the panes' column's (from
// their divider), else the window's edge.
const panesSplit = document.getElementById ("notesSplit")!;
// The picker between the heading and the play bar: --headB, the heading's bottom, and --playB, the play bar's height
// from the window's foot (style.css' #picker)
const head = document.querySelector<HTMLElement> (".head")!, playBar = document.getElementById ("playBar")!;
const fit = () => {
  const root0 = document.documentElement.style;
  root0.setProperty ("--headB", `${head.getBoundingClientRect ().bottom}px`);
  root0.setProperty ("--playB", `${barRoom (playBar)}px`);
  const r = text.getBoundingClientRect (), root = document.documentElement.style, split = panesSplit.getBoundingClientRect ();
  root.setProperty ("--textL", `${Math.max (0, r.left)}px`);
  root.setProperty ("--textR", `${Math.max (0, innerWidth - r.right)}px`);
  root.setProperty ("--studyR", `${split.width ? Math.max (0, innerWidth - split.left) : 0}px`);
};
new ResizeObserver (fit).observe (text); new ResizeObserver (fit).observe (head); new ResizeObserver (fit).observe (playBar);
addEventListener ("resize", fit);

type Go = (book: Book, chapter: number) => void;
type Chapters = (book: Book) => Promise<number[]>;

/** groups: [heading - its text, or what it's made of (the Old Testament's: its language buttons) -, its books]...;
 *  chaptersOf: a book's chapter numbers (from the database: a promise). */
/** The heading's passage tapped: the book list opened - or, open, closed (it has no ✕). */
export function togglePicker (groups: [string | Node[], Book[]][], go: Go, chaptersOf: Chapters) {
  if (! picker.hidden) picker.hidden = true; else openPicker (groups, go, chaptersOf);
}

export function openPicker (groups: [string | Node[], Book[]][], go: Go, chaptersOf: Chapters) {
  showBooks (groups, go, chaptersOf);
  fit (); picker.hidden = false;
}

function showBooks (groups: [string | Node[], Book[]][], go: Go, chaptersOf: Chapters) {
  body.textContent = "";
  let open: HTMLElement | null = null;     // (The chapters open under their book: one at a time)
  for (const [heading, books] of groups) {
    const h = document.createElement ("div");
    h.className = "src";
    if (typeof heading === "string") h.textContent = heading; else h.replaceChildren (...heading);
    const list = document.createElement ("div");
    list.className = "chooseList inline";     // (A vertical list, a row per book: the pickers' list, style.css)
    for (const b of books) {
      const row = pill (b.name, async () => {
        const cs = await chaptersOf (b);
        if (cs.length === 1) { picker.hidden = true; go (b, cs[0]); return; }
        const same = open?.previousElementSibling === row;
        open?.remove (); open = null;
        for (const r of body.querySelectorAll (".chooseItem[aria-pressed=true]")) r.setAttribute ("aria-pressed", "false");
        if (same) return;     // (Its own book tapped again: closed)
        open = chapters (b, cs, go);
        row.after (open);
        row.setAttribute ("aria-pressed", "true");
        open.scrollIntoView ({ block: "nearest" });
      });
      row.className = "chooseItem";
      // (Its English name, then its name in its own language: style.css)
      const en = document.createElement ("span"); en.className = "bookEn"; en.textContent = b.name; row.replaceChildren (en);
      const native = nativeName (b.code);
      if (native) { const n = document.createElement ("span"); n.className = "bookNative " + native[1]; n.textContent = native[0]; if (native[1] === "he") n.dir = "rtl"; row.append (n); }
      list.append (row);
    }
    body.append (h, list);
  }
}

/** A book's chapter numbers, six to a row (style.css: .numbers). */
function chapters (book: Book, cs: number[], go: Go): HTMLElement {
  const list = document.createElement ("div");
  list.className = "choices numbers";
  for (const c of cs)
    list.append (pill (String (c), () => { picker.hidden = true; go (book, c); }));
  return list;
}

function pill (text: string, onClick: () => void) {
  const b = document.createElement ("button");
  b.className = "pill";
  b.textContent = text;
  b.addEventListener ("click", onClick);
  return b;
}
