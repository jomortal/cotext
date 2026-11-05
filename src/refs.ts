// A reference in English and, beside it, in the original's own language (style.css' .refPair: the English in
// capitals, both bold; the Greek in capitals too; side by side, wrapping where narrow - the Hebrew on top) - the
// verse cards' (versecards.ts) and the heading's passage (main.ts).

import { nativeName } from "./booknames";
import { hebrewNumber, greekNumber } from "./numerals";

const esc = (s: string) => s.replace (/[&<>"]/g, (c) => `&#${c.charCodeAt (0)};`);

/** The reference in the original's own language: the book's Hebrew or Greek name (booknames.ts) and its chapter and
 *  verses in letters - "תְּהִלִּים כג:א", "ΚΑΤΑ ΙΩΑΝΝΗΝ Γʹ:ΙϚʹ" (the Septuagint's own book and numbering: "ΨΑΛΜΟΙ
 *  ΚΒʹ:Αʹ"); v1 0: the chapter alone. "" where the book has no name in its language. */
export function nativeRef (code: string, lang: "he" | "gr", c1: number, v1 = 0, c2 = c1, v2 = 0) {
  const name = nativeName (code)?.[0];
  if (! name) return "";
  const num = lang === "he" ? hebrewNumber : greekNumber;
  const span = ! v1 ? num (c1) : `${num (c1)}:${num (v1)}` + (c2 !== c1 ? `–${num (c2)}:${num (v2)}` : v2 > v1 ? `–${num (v2)}` : "");
  // (Greek in capitals, as inscriptions and the oldest manuscripts: no accents or breathings - ΚΑΤΑ ΙΩΑΝΝΗΝ Γʹ:ΙϚʹ)
  const text = lang === "he" ? `${name} ${span}` : `${name} ${span}`.normalize ("NFD").replace (/[̀-ͯ]/g, "").toUpperCase ();
  return `<span class="refNative ${lang}" dir="${lang === "he" ? "rtl" : "ltr"}" lang="${lang === "he" ? "he" : "grc"}">${esc (text)}</span>`;
}

/** The pair's markup: the English (any text) and the original's (nativeRef's: "" for none). */
export const refPair = (english: string, native = "") => `<span class="refPair"><span>${esc (english)}</span>${native}</span>`;
