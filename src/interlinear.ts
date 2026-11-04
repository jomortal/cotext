// A few verses of another text as COTEXT's own interlinear, beside the one read: the notes panel's "Hebrew OT" (notes.ts),
// the Hebrew verse or verses an LXX verse translates. Drawn by the reader's own code (reader.ts' showChapter: the
// word columns - original, transliteration, gloss, parsing, verb colors - right to left for Hebrew, the verse number
// in the margin), its helps hidden by the ⋯ menu as the reader's are, counted in its own book's scope (helps.ts'
// helpsBeside). A word tapped opens the word's panel as a tap in the reader does (panel.ts: it works from the word's
// Strong's key and morph, so a Hebrew word's lexicons, grammar and Verb chart are Hebrew's while Greek is read).
// Any book's verses can be drawn: the Septuagint beside the Hebrew (for later) is the same call with the map read the
// other way (lxx_heb by hbook, hchapter, hverse).

import type { Db } from "./db";
import { showChapter, verseWords, type Book } from "./reader";
import { helpsBeside } from "./helps";
import { showPanel } from "./panel";

/** Draws book's verses (refs: [chapter, verse], in order) into el as the interlinear. */
export function drawInterlinear (el: HTMLElement, db: Db, book: Book, refs: [number, number][]) {
  const words = refs.flatMap (([c, v]) => verseWords (db, book.id, c, v));
  showChapter (el, book, refs[0]?.[0] ?? 1, words, (w, wordEl) => showPanel (db, w, wordEl));
  helpsBeside (el, book);
}

/** The interlinear no longer shown (another source picked, the panel closed): its helps no longer kept. */
export function clearInterlinear () { helpsBeside (null); }
