// The reader: one chapter as an interlinear - each verse its number in the margin (right for Hebrew, left for Greek:
// where the line starts), then its words, each word a column of the
// original, its English gloss and COTEXT's parsing code (design/mock-hebrew.html, mock-greek.html). Hebrew runs right
// to left, Greek left to right. A verb's code is colored (VERB COLORS, the ⋯ menu) by its form in Hebrew - the
// form carries the passage's flow: wayyiqtol the story's main line, qatal background - and by its tense in Greek
// (its aspect): verbForm, style.css's .vf-...

import { hebrewNumber, greekNumber } from "./numerals";
import type { Db } from "./db";
import type { Testament } from "./study";
import { modernGreek } from "./translit";

// A verb's color group, from its code (pipeline/morph.py's scheme), or "" for anything not a verb.
// Hebrew - the verb's segment is STEM-FORM-PGN, after any prefixes (CONJ+PREP+HSH-INC): wayyiqtol (W), qatal (P),
// weqatal (WP), yiqtol (I, and weyiqtol WI), the volitives (imperative, cohortative, jussive), participles, infinitives.
// Greek - the tense is the code's first letter, after a second aorist's or future's 2 (2AAI-3S): present, imperfect,
// future, aorist, perfect, pluperfect.
const HEB_FORM: Record<string, string> = { W: "wayyiqtol", P: "qatal", WP: "weqatal", I: "yiqtol", WI: "yiqtol",
  IMP: "volitive", COH: "volitive", J: "volitive", PTC: "participle", PTP: "participle", INA: "infinitive", INC: "infinitive" };
const GRK_TENSE: Record<string, string> = { P: "present", I: "imperfect", F: "future", A: "aorist", R: "perfect", L: "pluperfect" };
function verbForm (w: Word): string {
  if (! w.stem || ! w.code) return "";
  if (w.stem === "verb") return GRK_TENSE[w.code.match (/^2?([PIFARL])[A-Z]/)?.[1] ?? ""] ?? "";
  for (const seg of w.code.split ("+")) { const f = HEB_FORM[seg.split ("-")[1] ?? ""]; if (f && /^[A-Z]+-/.test (seg)) return f; }
  return "";
}

/** A book: testament OT (Hebrew), NT or LXX (Greek); heb - an LXX book's Hebrew Bible book (its id; 0 none); notes -
 *  the book whose notes the panel shows (its own, or an LXX book's Hebrew one where both number alike). */
export interface Book { id: number; code: string; name: string; testament: Testament; chapters: number; heb: number; notes: number; }

/** One word as the chapter shows it; the panel reads the rest from the database when it's tapped. */
export interface Word { verse: number; text: string; translit: string; gloss: string; strong: string; morph: string; code: string;
                        stem: string; book: number; chapter: number; word: number; }     // (book, chapter, word: where it stands - the panel's UBS "used here")

const WORDS = `SELECT w.book, w.chapter, w.word, w.verse, w.text, w.translit, w.gloss, w.strong, w.morph, p.code, p.stem
               FROM words w LEFT JOIN parsings p ON p.morph = w.morph`;

/** The chapter's words, in order. */
export async function chapterWords (db: Db, book: number, chapter: number): Promise<Word[]> {
  return await db.all (`${WORDS} WHERE w.book = ? AND w.chapter = ? ORDER BY w.verse, w.word`, [book, chapter]) as unknown as Word[];
}

/** One verse's words, in order (interlinear.ts: a verse shown beside another text). */
export async function verseWords (db: Db, book: number, chapter: number, verse: number): Promise<Word[]> {
  return await db.all (`${WORDS} WHERE w.book = ? AND w.chapter = ? AND w.verse = ? ORDER BY w.word`, [book, chapter, verse]) as unknown as Word[];
}

/** Draws the chapter (or any run of verses: interlinear.ts) into el; onTap gets the tapped word and its element. */
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
      row.dataset.chapter = String (w.chapter); row.dataset.verse = String (verse);     // (Where it stands: the notes panel finds verses by it)
      verseEl = document.createElement ("div");
      verseEl.className = "verse " + (hebrew ? "he" : "gr");
      // (The verse number as a word: in the text's own letters on the words' line, smaller - טז, ιϛʹ -, its number on the
      // interlinear's line under it, shown with the glosses; a + down the margin, where there's room (style.css' .vadd):
      // the verse's margin, tapped anywhere, adds it to the Verse cards - versecards.ts)
      const num = span ("vnum", ""), orig = span ("orig", ""), n = span ("vnumN", hebrew ? hebrewNumber (verse) : greekNumber (verse));
      orig.append (n); num.append (orig, span ("gloss", String (verse)), span ("vadd", "+"));
      row.append (num, verseEl);
      el.append (row);
    }
    const wordEl = document.createElement ("div");
    const vf = verbForm (w);
    wordEl.className = "w" + (vf ? ` verb vf-${vf}` : "");
    wordEl.dataset.strong = w.strong;     // the lemma's key: helps.ts hides its gloss by it
    wordEl.dataset.code = w.code ?? "";     // its parsing code: helps.ts always shows a hard form's parsing (paradigm.ts' hardForm)
    wordEl.append (span ("orig", w.text), span ("translit", translitOf (w)),
                   span ("gloss", w.gloss), span ("parse", w.code ?? ""));
    wordEl.addEventListener ("click", () => onTap (w, wordEl));
    verseEl!.append (wordEl);
  }
}

/** A word in Latin letters: Hebrew as STEPBible gives it (`step`), its syllable dots dropped and in lower case -
 *  be.re.Shit -> bereshit; Greek as modern Greek says it - translit.ts. (The interlinear's line, and the word's panel's
 *  for the word and its root.) */
export function latin (hebrew: boolean, text: string, step: string | null | undefined) {
  return hebrew ? (step ?? "").replace (/\./g, "").toLowerCase () : modernGreek (text);
}
export const translitOf = (w: Word) => latin (w.strong.startsWith ("H"), w.text, w.translit);

function span (cls: string, text: string) {
  const s = document.createElement ("span");
  s.className = cls;
  s.textContent = text;
  return s;
}
