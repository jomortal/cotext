// Choosing a passage: the heading's button opens a full-screen list - the books under their headings (main.ts: the
// Old Testament in the language picked - Hebrew, or the Septuagint with the books the Hebrew Bible lacks under a
// heading of their own -, then the New Testament), one under another; a book tapped opens its chapters (numbers, six
// to a row; only those it has - Enoch's fragments) under it in the list - one book open at a time, tapped again
// closed - and picking a chapter goes there (a one-chapter book goes straight there).

import { nativeName } from "./booknames";
import type { Book } from "./reader";

const picker = document.getElementById ("picker")!;
const body = document.getElementById ("pickerBody")!;

document.getElementById ("pickerClose")!.addEventListener ("click", () => { picker.hidden = true; });

type Go = (book: Book, chapter: number) => void;
type Chapters = (book: Book) => Promise<number[]>;

/** groups: [heading, its books]...; chaptersOf: a book's chapter numbers (from the database: a promise). */
export function openPicker (groups: [string, Book[]][], go: Go, chaptersOf: Chapters) {
  showBooks (groups, go, chaptersOf);
  picker.hidden = false;
}

function showBooks (groups: [string, Book[]][], go: Go, chaptersOf: Chapters) {
  body.textContent = "";
  let open: HTMLElement | null = null;     // (The chapters open under their book: one at a time)
  for (const [heading, books] of groups) {
    const h = document.createElement ("div");
    h.className = "src";
    h.textContent = heading;
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
      if (native) { const n = document.createElement ("span"); n.className = "bookNative " + native[1]; n.textContent = native[0]; if (native[1] === "he") n.dir = "rtl"; row.append (" ", n); }
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
