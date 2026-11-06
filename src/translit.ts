// Greek in Latin letters. modernGreek - the reader's, and ☰ Learn's with MODERN picked - as modern Greek says it (the
// Pronunciation guide's modern sounds, pronounce.ts; what COTEXT reads aloud in): the word made monotonic first (audio.ts: breathings and iota subscripts dropped, one acute), then letter
// by letter, pairs first - αι e, ει οι υι i, ου ou, αυ ευ ηυ av / ev / iv (af / ef / if before a voiceless sound), μπ
// ντ γκ b d g at a word's start (mb nd ng inside), γγ ng, γξ nx, γχ nch, τσ ts, τζ dz - then β v, γ gh (y before
// e and i sounds), δ dh, η ι υ i, θ th, ξ x, φ f, χ ch, ψ ps, ω o. The stressed vowel keeps its acute (logos ->
// lógos); a diaeresis (ϊ ϋ) splits a pair. λόγος -> lógos, ἦν -> in, ὁ -> o, αὐτοῦ -> aftoú, ἀρχῇ -> archí.

import { monotonic } from "./audio";

const ACUTE = "́", DIAERESIS = "̈";
const SINGLE: Record<string, string> = { α: "a", β: "v", δ: "dh", ε: "e", ζ: "z", η: "i", θ: "th", ι: "i", κ: "k", λ: "l",
  μ: "m", ν: "n", ξ: "x", ο: "o", π: "p", ρ: "r", σ: "s", ς: "s", τ: "t", υ: "i", φ: "f", χ: "ch", ψ: "ps", ω: "o" };
const VOICELESS = "θκξπστφχψ";
const FRONT = /^(ε|ι|η|υ|αι|ει|οι|υι)/;     // (γ before these sounds is y)
const STRESS: Record<string, string> = { a: "á", e: "é", i: "í", o: "ó", u: "ú" };

export function modernGreek (word: string): string {
  // Each letter with its marks: [base, acute?, diaeresis?]
  const chars = [...monotonic (word).toLowerCase ().normalize ("NFD")];
  const letters: { b: string; acute: boolean; dia: boolean }[] = [];
  for (const c of chars) {
    if (c === ACUTE && letters.length) letters[letters.length - 1].acute = true;
    else if (c === DIAERESIS && letters.length) letters[letters.length - 1].dia = true;
    else if (/\p{L}/u.test (c)) letters.push ({ b: c, acute: false, dia: false });
  }
  const at = (i: number) => letters[i]?.b ?? "";
  const rest = (i: number) => letters.slice (i).map ((l) => l.b).join ("");
  let out = "";
  const put = (s: string, stressed: boolean) => {     // (The stress on the sound's last vowel: ou -> oú)
    if (stressed) { const m = s.match (/[aeiou](?!.*[aeiou])/); if (m) s = s.slice (0, m.index) + STRESS[m[0]] + s.slice (m.index! + 1); }
    out += s;
  };
  for (let i = 0; i < letters.length; ) {
    const a = at (i), b = at (i + 1), pair = a + b, l2 = letters[i + 1];
    const joins = l2 && ! l2.dia;     // (A diaeresis on the second letter keeps the two apart)
    const stressed = letters[i].acute || (joins && l2.acute);
    if (joins && (pair === "αι")) { put ("e", stressed); i += 2; continue; }
    if (joins && /^(ει|οι|υι)$/.test (pair)) { put ("i", stressed); i += 2; continue; }
    if (joins && pair === "ου") { put ("ou", stressed); i += 2; continue; }
    if (joins && /^(αυ|ευ|ηυ)$/.test (pair)) {
      const next = at (i + 2), v = { α: "a", ε: "e", η: "i" }[a as "α" | "ε" | "η"];
      put (v + (! next || VOICELESS.includes (next) ? "f" : "v"), stressed); i += 2; continue;
    }
    if (pair === "μπ" || pair === "ντ" || pair === "γκ") { out += (i === 0 ? "" : { μ: "m", ν: "n", γ: "n" }[a as "μ" | "ν" | "γ"]) + { π: "b", τ: "d", κ: "g" }[b as "π" | "τ" | "κ"]; i += 2; continue; }
    if (pair === "γγ") { out += "ng"; i += 2; continue; }
    if (pair === "γξ") { out += "nx"; i += 2; continue; }
    if (pair === "γχ") { out += "nch"; i += 2; continue; }
    if (pair === "τσ") { out += "ts"; i += 2; continue; }
    if (pair === "τζ") { out += "dz"; i += 2; continue; }
    if (a === "γ") { out += FRONT.test (rest (i + 1)) ? "y" : "gh"; i++; continue; }
    put (SINGLE[a] ?? a, letters[i].acute); i++;
  }
  return out;
}

/** Greek in Latin letters as Erasmian Greek says it (the Pronunciation guide's Erasmian sounds), in the usual
 *  scholarly spelling - ☰ Learn's letters lesson with ERASMIAN picked (learn.ts): η ē, ω ō, υ y (u in a pair: αυ au,
 *  ευ eu, ηυ ēu, ου ou, υι ui), β b, δ d, φ ph, χ ch, ξ x, ψ ps, θ th; γ before γ κ ξ χ n; a rough breathing h before
 *  the word (ῥ rh); accents, the smooth breathing and iota subscripts dropped; a diaeresis splits a pair.
 *  λόγος -> logos, ἡμέρα -> hēmera, εὐαγγέλιον -> euangelion, υἱός -> huios, ῥῆμα -> rhēma. */
export function erasmianGreek (word: string): string {
  const chars = [...word.toLowerCase ().normalize ("NFD")];
  const rough = chars.includes ("̔");
  const letters: { b: string; dia: boolean }[] = [];
  for (const c of chars) {
    if (c === DIAERESIS && letters.length) letters[letters.length - 1].dia = true;
    else if (/\p{L}/u.test (c)) letters.push ({ b: c, dia: false });
  }
  const ONE: Record<string, string> = { α: "a", β: "b", γ: "g", δ: "d", ε: "e", ζ: "z", η: "ē", θ: "th", ι: "i", κ: "k",
    λ: "l", μ: "m", ν: "n", ξ: "x", ο: "o", π: "p", ρ: "r", σ: "s", ς: "s", τ: "t", υ: "y", φ: "ph", χ: "ch", ψ: "ps", ω: "ō" };
  let out = "";
  for (let i = 0; i < letters.length; i++) {
    const a = letters[i].b, n = letters[i + 1];
    if (n && ! n.dia && ((n.b === "υ" && "αεηο".includes (a)) || (a === "υ" && n.b === "ι"))) { out += ONE[a].replace ("y", "u") + (n.b === "υ" ? "u" : "i"); i++; continue; }
    out += a === "γ" && n && "γκξχ".includes (n.b) ? "n" : ONE[a] ?? a;
  }
  return ! rough ? out : out.startsWith ("r") ? "rh" + out.slice (1) : "h" + out;
}
