// Choosing a passage: the heading's button opens a full-screen list - the books (Old Testament, New Testament),
// then the chosen book's chapters - and picking a chapter goes there.

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
  for (const [testament, heading] of [["OT", "Old Testament - Hebrew"], ["NT", "New Testament - Greek"]]) {
    const h = document.createElement ("div");
    h.className = "src";
    h.textContent = heading;
    const list = document.createElement ("div");
    list.className = "choices";
    for (const b of books.filter ((b) => b.testament === testament))
      list.append (pill (b.name, () => (b.chapters === 1 ? (picker.hidden = true, go (b, 1)) : showChapters (b, books, go))));
    body.append (h, list);
  }
}

function showChapters (book: Book, books: Book[], go: (book: Book, chapter: number) => void) {
  title.textContent = book.name;
  body.textContent = "";
  const list = document.createElement ("div");
  list.className = "choices numbers";
  for (let c = 1; c <= book.chapters; c++)
    list.append (pill (String (c), () => { picker.hidden = true; go (book, c); }));
  body.append (list, pill ("‹ Books", () => showBooks (books, go)));
}

function pill (text: string, onClick: () => void) {
  const b = document.createElement ("button");
  b.className = "pill";
  b.textContent = text;
  b.addEventListener ("click", onClick);
  return b;
}
