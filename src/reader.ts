// The reader: one chapter as an interlinear - each verse its number in the margin (right for Hebrew, left for Greek:
// where the line starts), then its words, each word a column of the
// original, its English gloss and COTEXT's parsing code (design/mock-hebrew.html, mock-greek.html). Hebrew runs right
// to left, Greek left to right. A verb's code is coloured by its stem (Hebrew) - or the one verb colour (Greek) -
// from the parsings table's stem group (style.css: .stem-qal, .stem-piel...).

import type { Db } from "./db";

export interface Book { id: number; code: string; name: string; testament: "OT" | "NT"; chapters: number; }

/** One word as the chapter shows it; the panel reads the rest from the database when it's tapped. */
export interface Word { verse: number; text: string; gloss: string; strong: string; morph: string; code: string;
                        stem: string; }

/** The chapter's words, in order. */
export function chapterWords (db: Db, book: number, chapter: number): Word[] {
  return db.all (`SELECT w.verse, w.text, w.gloss, w.strong, w.morph, p.code, p.stem
                  FROM words w LEFT JOIN parsings p ON p.morph = w.morph
                  WHERE w.book = ? AND w.chapter = ? ORDER BY w.verse, w.word`, [book, chapter]) as unknown as Word[];
}

/** Draws the chapter into el; onTap gets the tapped word and its element. */
export function showChapter (el: HTMLElement, book: Book, chapter: number, words: Word[],
                             onTap: (w: Word, wordEl: HTMLElement) => void) {
  el.textContent = "";
  const hebrew = book.testament === "OT";
  let verseEl: HTMLElement | null = null;
  let verse = -1;
  for (const w of words) {
    if (w.verse !== verse) {
      verse = w.verse;
      const row = document.createElement ("div");     // (Its direction puts the number first: right for Hebrew, left for Greek)
      row.className = "vrow " + (hebrew ? "he" : "gr");
      verseEl = document.createElement ("div");
      verseEl.className = "verse " + (hebrew ? "he" : "gr");
      row.append (span ("vnum", String (verse)), verseEl);
      el.append (row);
    }
    const wordEl = document.createElement ("div");
    wordEl.className = "w" + (w.stem ? ` verb stem-${w.stem}` : "");
    wordEl.dataset.strong = w.strong;     // the lemma's key: helps.ts hides helps by it
    wordEl.append (span ("orig", w.text), span ("gloss", w.gloss), span ("parse", w.code ?? ""));
    wordEl.addEventListener ("click", () => onTap (w, wordEl));
    verseEl!.append (wordEl);
  }
}

function span (cls: string, text: string) {
  const s = document.createElement ("span");
  s.className = cls;
  s.textContent = text;
  return s;
}
