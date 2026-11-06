// Flashcards' first things to learn (vocab.ts' ALPHABET, NUMBERS, BOOK NAMES), for the testament studied - the OT's in
// Hebrew, the NT's and the Septuagint's in Greek: each card a word (or letter) on the front, its English on the back,
// as the word lists' cards.
// - ALPHABET: each letter - Hebrew's 22 and its 5 final forms, Greek's 24 (capital and small) - with its name (said
//   aloud in the language) and the sound it stands for, as the transliteration writes it.
// - NUMBERS: the number words 1-10 (Hebrew's masculine and feminine forms, Greek's genders where it has them), the tens
//   to 100, 1,000 and 10,000; then the letters used as numbers (numerals.ts): 1-10, the tens, the hundreds (Hebrew to
//   400, with 15 and 16; Greek to 900, and 1,000).
// - BOOK NAMES: each book of the testament in its own language (booknames.ts), in the Bible's order.

import type { Db } from "./db";
import { nativeName } from "./booknames";
import { hebrewNumber, greekNumber } from "./numerals";

/** One card: the word (or letter) on the front, the text said aloud (none: no speaker), the English on the back. */
export interface Basic { word: string; say: string; meaning: string; }

// [letter, its name (said), English name, sound]
const HE_LETTERS: [string, string, string, string][] = [
  ["א", "אָלֶף", "Alef", "ʾ (silent)"], ["ב", "בֵּית", "Bet", "b, v"], ["ג", "גִּימֶל", "Gimel", "g"], ["ד", "דָּלֶת", "Dalet", "d"],
  ["ה", "הֵא", "He", "h"], ["ו", "וָו", "Vav", "w (v)"], ["ז", "זַיִן", "Zayin", "z"], ["ח", "חֵית", "Het", "ḥ"],
  ["ט", "טֵית", "Tet", "ṭ"], ["י", "יוֹד", "Yod", "y"], ["כ", "כַּף", "Kaf", "k, kh"], ["ל", "לָמֶד", "Lamed", "l"],
  ["מ", "מֵם", "Mem", "m"], ["נ", "נוּן", "Nun", "n"], ["ס", "סָמֶךְ", "Samekh", "s"], ["ע", "עַיִן", "Ayin", "ʿ (silent)"],
  ["פ", "פֵּא", "Pe", "p, f"], ["צ", "צָדִי", "Tsade", "ṣ (ts)"], ["ק", "קוֹף", "Qof", "q"], ["ר", "רֵישׁ", "Resh", "r"],
  ["שׁ", "שִׁין", "Shin", "š (sh)"], ["שׂ", "שִׂין", "Sin", "ś (s)"], ["ת", "תָּו", "Tav", "t"],
  ["ך", "כַּף סוֹפִית", "Final kaf", "k, kh"], ["ם", "מֵם סוֹפִית", "Final mem", "m"], ["ן", "נוּן סוֹפִית", "Final nun", "n"],
  ["ף", "פֵּא סוֹפִית", "Final pe", "f"], ["ץ", "צָדִי סוֹפִית", "Final tsade", "ṣ (ts)"],
];
const GR_LETTERS: [string, string, string, string][] = [
  ["Α α", "ἄλφα", "Alpha", "a"], ["Β β", "βῆτα", "Beta", "b"], ["Γ γ", "γάμμα", "Gamma", "g"], ["Δ δ", "δέλτα", "Delta", "d"],
  ["Ε ε", "ἒ ψιλόν", "Epsilon", "e (short)"], ["Ζ ζ", "ζῆτα", "Zeta", "z"], ["Η η", "ἦτα", "Eta", "ē (long e)"], ["Θ θ", "θῆτα", "Theta", "th"],
  ["Ι ι", "ἰῶτα", "Iota", "i"], ["Κ κ", "κάππα", "Kappa", "k"], ["Λ λ", "λάμβδα", "Lambda", "l"], ["Μ μ", "μῦ", "Mu", "m"],
  ["Ν ν", "νῦ", "Nu", "n"], ["Ξ ξ", "ξῖ", "Xi", "x (ks)"], ["Ο ο", "ὂ μικρόν", "Omicron", "o (short)"], ["Π π", "πῖ", "Pi", "p"],
  ["Ρ ρ", "ῥῶ", "Rho", "r"], ["Σ σ ς", "σίγμα", "Sigma", "s (ς at a word's end)"], ["Τ τ", "ταῦ", "Tau", "t"], ["Υ υ", "ὖ ψιλόν", "Upsilon", "u (y)"],
  ["Φ φ", "φῖ", "Phi", "ph"], ["Χ χ", "χῖ", "Chi", "ch"], ["Ψ ψ", "ψῖ", "Psi", "ps"], ["Ω ω", "ὦ μέγα", "Omega", "ō (long o)"],
];

// [the word (its forms), the number] - Hebrew 3-10 masculine (used with masculine nouns: the -ah form) · feminine
const HE_WORDS: [string, string][] = [
  ["אֶחָד · אַחַת", "one"], ["שְׁנַיִם · שְׁתַּיִם", "two"], ["שְׁלֹשָׁה · שָׁלֹשׁ", "three"], ["אַרְבָּעָה · אַרְבַּע", "four"],
  ["חֲמִשָּׁה · חָמֵשׁ", "five"], ["שִׁשָּׁה · שֵׁשׁ", "six"], ["שִׁבְעָה · שֶׁבַע", "seven"], ["שְׁמֹנָה · שְׁמֹנֶה", "eight"],
  ["תִּשְׁעָה · תֵּשַׁע", "nine"], ["עֲשָׂרָה · עֶשֶׂר", "ten"], ["עֶשְׂרִים", "twenty"], ["שְׁלֹשִׁים", "thirty"],
  ["אַרְבָּעִים", "forty"], ["חֲמִשִּׁים", "fifty"], ["שִׁשִּׁים", "sixty"], ["שִׁבְעִים", "seventy"], ["שְׁמֹנִים", "eighty"],
  ["תִּשְׁעִים", "ninety"], ["מֵאָה", "a hundred"], ["אֶלֶף", "a thousand"], ["רְבָבָה", "ten thousand"],
];
const GR_WORDS: [string, string][] = [
  ["εἷς · μία · ἕν", "one"], ["δύο", "two"], ["τρεῖς · τρία", "three"], ["τέσσαρες · τέσσαρα", "four"], ["πέντε", "five"],
  ["ἕξ", "six"], ["ἑπτά", "seven"], ["ὀκτώ", "eight"], ["ἐννέα", "nine"], ["δέκα", "ten"], ["εἴκοσι", "twenty"],
  ["τριάκοντα", "thirty"], ["τεσσεράκοντα", "forty"], ["πεντήκοντα", "fifty"], ["ἑξήκοντα", "sixty"], ["ἑβδομήκοντα", "seventy"],
  ["ὀγδοήκοντα", "eighty"], ["ἐνενήκοντα", "ninety"], ["ἑκατόν", "a hundred"], ["χίλιοι", "a thousand"], ["μύριοι", "ten thousand"],
];
/** The numbers shown as letters: 1-10, the tens, the hundreds (Hebrew to 400, with 15 and 16 - written טו, טז; Greek to 900, and 1,000). */
const numerals = (hebrew: boolean) => [...Array.from ({ length: 10 }, (_, i) => i + 1), ...(hebrew ? [15, 16] : []),
  ...Array.from ({ length: 8 }, (_, i) => (i + 2) * 10), ...(hebrew ? [100, 200, 300, 400] : [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000])];

/** The cards of ALPHABET ("alpha"), NUMBERS ("nums") or BOOK NAMES ("names") for the testament (OT: Hebrew; NT, LXX: Greek). */
export async function basics (db: Db, kind: string, testament: string): Promise<Basic[]> {
  const hebrew = testament === "OT";
  if (kind === "alpha")
    return (hebrew ? HE_LETTERS : GR_LETTERS).map (([word, say, name, sound]) => ({ word, say, meaning: `${name} · ${sound}` }));
  if (kind === "nums")
    return [...(hebrew ? HE_WORDS : GR_WORDS).map (([word, meaning]) => ({ word, say: word.split (" · ")[0], meaning })),
            ...numerals (hebrew).map ((n) => ({ word: hebrew ? hebrewNumber (n) : greekNumber (n), say: "", meaning: n.toLocaleString () }))];
  return (await db.all ("SELECT code, name FROM books WHERE testament = ? ORDER BY id", [testament])).flatMap ((r) => {
    const n = nativeName (String (r.code));
    return n ? [{ word: n[0], say: n[0], meaning: String (r.name) }] : [];
  });
}
