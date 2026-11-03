// Choosing a passage: the heading's button opens a full-screen list - the books (Old Testament, New Testament), one
// under another; a book tapped opens its chapters (numbers, six to a row) under it in the list - one book open at a
// time, tapped again closed - and picking a chapter goes there (a one-chapter book goes straight there).

import type { Book } from "./reader";

const picker = document.getElementById ("picker")!;
const body = document.getElementById ("pickerBody")!;
const title = document.getElementById ("pickerTitle")!;

document.getElementById ("pickerClose")!.addEventListener ("click", () => { picker.hidden = true; });

export function openPicker (books: Book[], go: (book: Book, chapter: number) => void) {
  showBooks (books, go);
  picker.hidden = false;
}

function showBooks (books: Book[], go: (book: Book, chapter: number) => void) {
  title.textContent = "Books";
  body.textContent = "";
  let open: HTMLElement | null = null;     // (The chapters open under their book: one at a time)
  for (const [testament, heading] of [["OT", "Old Testament - Hebrew"], ["NT", "New Testament - Greek"]]) {
    const h = document.createElement ("div");
    h.className = "src";
    h.textContent = heading;
    const list = document.createElement ("div");
    list.className = "chooseList inline";     // (A vertical list, a row per book: the pickers' list, style.css)
    for (const b of books.filter ((b) => b.testament === testament)) {
      const row = pill (b.name, () => {
        if (b.chapters === 1) { picker.hidden = true; go (b, 1); return; }
        const same = open?.previousElementSibling === row;
        open?.remove (); open = null;
        for (const r of body.querySelectorAll (".chooseItem[aria-pressed=true]")) r.setAttribute ("aria-pressed", "false");
        if (same) return;     // (Its own book tapped again: closed)
        open = chapters (b, go);
        row.after (open);
        row.setAttribute ("aria-pressed", "true");
        open.scrollIntoView ({ block: "nearest" });
      });
      row.className = "chooseItem";
      list.append (row);
    }
    body.append (h, list);
  }
}

/** A book's chapter numbers, six to a row (style.css: .numbers). */
function chapters (book: Book, go: (book: Book, chapter: number) => void): HTMLElement {
  const list = document.createElement ("div");
  list.className = "choices numbers";
  for (let c = 1; c <= book.chapters; c++)
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
