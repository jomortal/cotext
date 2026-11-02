// The verb paradigms: every form the Verb chart and the paradigm flashcards show, from one set of templates (one
// source for both). A form is its pattern - Hebrew: the root's three letters as dotted squares with their vowels, the
// form's own letters (prefixes, endings) written; Greek: the stem one dotted square, the augment, reduplication and
// endings written - its COTEXT code (Q-P-3MS, AAI-3S: the codes the reader shows, pipeline/morph.py) and its meaning
// on "do" ("he did"). Filled with a model verb, it's that verb's form.
//
// The templates are hand-written from the standard paradigms of the regular verb: Hebrew - Gesenius' strong verb
// (Kautzsch-Cowley 1910, Paradigm B, קָטַל) as the grammars set it out (the Niphal imperfect 1cs as אֶקָּטֵל, the Hophal
// with qamets hatuf, written as qamets); Greek - λύω (Smyth §383; the NT's Koine endings: λύῃ for λύει, -έτωσαν, the
// aorist passive's -θῆναι...). The model verbs' forms were checked against every form of the same verbs the text has
// (2026-11-02: all agree but pausal and plene spellings - מָשָׁל, תִּמְשׁוֹל - and the Greek's grave accents in context).

/** What the screens need of a form. */
export interface Form { code: string; meaning: string; pattern: string; /* HTML */ }

// ---- Hebrew ----

// A template is written in a short ASCII notation, so its points can be read and checked:
//   1 2 3      the root's letters (a slot), each followed by its marks: + doubled (dagesh forte), * dagesh lene if a
//              begadkefat letter (after a silent shewa; a word's first letter takes it anyway), then its vowels
//   vowels     : shewa, :a :e :A hateph patah / segol / qamets, i hireq, E tsere, e segol, a patah, A qamets, O holam,
//              u qubuts, . dagesh (in a written letter)
//   letters    ' א, h ה, w ו, y י, m מ, n נ, t ת, M ם, N ן (final)
const LETTER: Record<string, string> = { "'": "א", h: "ה", w: "ו", y: "י", m: "מ", n: "נ", t: "ת", M: "ם", N: "ן" };
const VOWEL: Record<string, string> = { ":": "ְ", ":e": "ֱ", ":a": "ֲ", ":A": "ֳ", i: "ִ",
  E: "ֵ", e: "ֶ", a: "ַ", A: "ָ", O: "ֹ", u: "ֻ", ".": "ּ" };
const DAGESH = "ּ", HOLAM = "ֹ", SHEWA = "ְ";

type Part = string | { n: number; doubled: boolean; lene: boolean; vowels: string };

/** "yi1:2*O3" -> [written "יִ", slot 1 (shewa), slot 2 (lene, holam), slot 3]. */
function parse (t: string): Part[] {
  const out: Part[] = [];
  let i = 0;
  const marks = () => {
    let v = "";
    while (i < t.length) {
      const two = t.slice (i, i + 2);
      if (VOWEL[two] && two.length === 2 && two[0] === ":") { v += VOWEL[two]; i += 2; }
      else if (VOWEL[t[i]]) { v += VOWEL[t[i]]; i++; }
      else break;
    }
    return v;
  };
  while (i < t.length) {
    const c = t[i++];
    if (c >= "1" && c <= "3") {
      const slot = { n: +c, doubled: false, lene: false, vowels: "" };
      while (t[i] === "+" || t[i] === "*") { if (t[i] === "+") slot.doubled = true; else slot.lene = true; i++; }
      slot.vowels = marks ();
      out.push (slot);
    } else {
      const s = (LETTER[c] ?? c) + marks ();
      if (typeof out[out.length - 1] === "string") out[out.length - 1] += s; else out.push (s);
    }
  }
  return out;
}

/** The pattern drawn: written letters as they are, each root letter a dotted square, its vowels under it (holam over
 *  it), a doubled one's dagesh in it. (style.css: .pattern, .slot) */
function hebrewPattern (parts: Part[]): string {
  return `<span class="pattern he">${parts.map ((p) => typeof p === "string" ? `<span>${p}</span>`
    : `<span class="slot">${p.vowels || p.doubled ? `<span class="v${p.vowels.includes (HOLAM) ? " above" : ""}">${p.doubled ? DAGESH : ""}${p.vowels}</span>` : ""}</span>`).join ("")}</span>`;
}

const BEGADKEFAT = "בגדכפת", FINALS: Record<string, string> = { כ: "ך", מ: "ם", נ: "ן", פ: "ף", צ: "ץ" };
const SIBILANTS = "סשצ";

/** The pattern filled with a root's letters ("שׁמר": each with its shin / sin dot), as HTML (the root's letters in
 *  .rootL) or plain text: the dagesh lene on a begadkefat letter starting the word or marked *, a doubled letter's
 *  dagesh, a last letter in its final form, and the Hithpael's ת changing places with a sibilant first letter
 *  (הִשְׁתַּמֵּר - the text's own spelling; with צ it becomes ט: הִצְטַדֵּק). */
function hebrewFill (parts: Part[], root: string[], html: boolean): string {
  const out: string[] = [];
  parts.forEach ((p, i) => {
    if (typeof p === "string") { out.push (p); return; }
    const letter = root[p.n - 1], base = letter[0];
    const last = i === parts.length - 1;
    let shape = last && ! p.vowels && FINALS[base] ? FINALS[base] + letter.slice (1) : letter;
    if (p.doubled || (BEGADKEFAT.includes (base) && (p.lene || i === 0))) shape += DAGESH;
    let tail = "";
    const prev = out[out.length - 1];
    if (p.n === 1 && SIBILANTS.includes (base) && typeof prev === "string" && prev.endsWith ("ת" + SHEWA)) {
      out[out.length - 1] = prev.slice (0, -2);      // (Metathesis: the prefix's תְ moves after the letter)
      tail = (base === "צ" ? "ט" : "ת" + DAGESH) + p.vowels;     // (After the letter's silent shewa: תּ)
      shape += SHEWA;
    } else shape += p.vowels;
    out.push (html ? `<span class="rootL">${shape}</span>${tail}` : shape + tail);
  });
  return out.join ("").normalize ("NFC");
}

// The rows a stem's forms fill: person / gender / number in the chart's order. The perfect's 3rd plural is common (3CP)
// - one form for both genders, shown in the 3MP row.
export const HEBREW_PGN = ["3MS", "3FS", "2MS", "2FS", "1CS", "3MP", "3FP", "2MP", "2FP", "1CP"];
const PERFECT_PGN = ["3MS", "3FS", "2MS", "2FS", "1CS", "3CP", "2MP", "2FP", "1CP"];
const IMPV_PGN = ["2MS", "2FS", "2MP", "2FP"];
export const HEBREW_GN = ["MS", "FS", "MP", "FP"];

/** A stem's templates: perfect (PERFECT_PGN's order), imperfect (HEBREW_PGN's), imperative (2MS 2FS 2MP 2FP; none for
 *  the passives), participle (MS FS MP FP), the Qal's passive participle, infinitive construct and absolute; the
 *  wayyiqtol made from the imperfect (wayyiqtol()), its own short forms where they differ (the Hiphil's). */
interface Stem { code: string; name: string; kind: Voice; P: string[]; I: string[]; IMP?: string[]; PTC: string[];
                 PTP?: string[]; INC: string; INA: string; W?: Record<string, string>; }
type Voice = "active" | "passive" | "intensive" | "intensive passive" | "causative" | "causative passive" | "reflexive";

export const HEBREW_STEMS: Stem[] = [
  { code: "Q", name: "Qal", kind: "active",
    P: ["1A2a3", "1A2:3Ah", "1A2a3:t.A", "1A2a3:t.:", "1A2a3:t.iy", "1A2:3w.", "1:2a3:t.eM", "1:2a3:t.eN", "1A2a3:nw."],
    I: ["yi1:2*O3", "t.i1:2*O3", "t.i1:2*O3", "t.i1:2*:3iy", "'e1:2*O3", "yi1:2*:3w.", "t.i1:2*O3:nAh", "t.i1:2*:3w.", "t.i1:2*O3:nAh", "ni1:2*O3"],
    IMP: ["1:2O3", "1i2:3iy", "1i2:3w.", "1:2O3:nAh"],
    PTC: ["1O2E3", "1O2e3et", "1O2:3iyM", "1O2:3wOt"], PTP: ["1A2w.3", "1:2w.3Ah", "1:2w.3iyM", "1:2w.3wOt"],
    INC: "1:2O3", INA: "1A2wO3" },
  { code: "N", name: "Niphal", kind: "passive",
    P: ["ni1:2*a3", "ni1:2*:3Ah", "ni1:2*a3:t.A", "ni1:2*a3:t.:", "ni1:2*a3:t.iy", "ni1:2*:3w.", "ni1:2*a3:t.eM", "ni1:2*a3:t.eN", "ni1:2*a3:nw."],
    I: ["yi1+A2E3", "t.i1+A2E3", "t.i1+A2E3", "t.i1+A2:3iy", "'e1+A2E3", "yi1+A2:3w.", "t.i1+A2a3:nAh", "t.i1+A2:3w.", "t.i1+A2a3:nAh", "ni1+A2E3"],
    IMP: ["hi1+A2E3", "hi1+A2:3iy", "hi1+A2:3w.", "hi1+A2a3:nAh"],
    PTC: ["ni1:2*A3", "ni1:2*e3et", "ni1:2*A3iyM", "ni1:2*A3wOt"], INC: "hi1+A2E3", INA: "ni1:2*O3" },
  { code: "P", name: "Piel", kind: "intensive",
    P: ["1i2+E3", "1i2+:3Ah", "1i2+a3:t.A", "1i2+a3:t.:", "1i2+a3:t.iy", "1i2+:3w.", "1i2+a3:t.eM", "1i2+a3:t.eN", "1i2+a3:nw."],
    I: ["y:1a2+E3", "t.:1a2+E3", "t.:1a2+E3", "t.:1a2+:3iy", "':a1a2+E3", "y:1a2+:3w.", "t.:1a2+E3:nAh", "t.:1a2+:3w.", "t.:1a2+E3:nAh", "n:1a2+E3"],
    IMP: ["1a2+E3", "1a2+:3iy", "1a2+:3w.", "1a2+E3:nAh"],
    PTC: ["m:1a2+E3", "m:1a2+e3et", "m:1a2+:3iyM", "m:1a2+:3wOt"], INC: "1a2+E3", INA: "1a2+E3" },
  { code: "PU", name: "Pual", kind: "intensive passive",
    P: ["1u2+a3", "1u2+:3Ah", "1u2+a3:t.A", "1u2+a3:t.:", "1u2+a3:t.iy", "1u2+:3w.", "1u2+a3:t.eM", "1u2+a3:t.eN", "1u2+a3:nw."],
    I: ["y:1u2+a3", "t.:1u2+a3", "t.:1u2+a3", "t.:1u2+:3iy", "':a1u2+a3", "y:1u2+:3w.", "t.:1u2+a3:nAh", "t.:1u2+:3w.", "t.:1u2+a3:nAh", "n:1u2+a3"],
    PTC: ["m:1u2+A3", "m:1u2+e3et", "m:1u2+A3iyM", "m:1u2+A3wOt"], INC: "1u2+a3", INA: "1u2+O3" },
  { code: "HI", name: "Hiphil", kind: "causative",
    P: ["hi1:2*iy3", "hi1:2*iy3Ah", "hi1:2*a3:t.A", "hi1:2*a3:t.:", "hi1:2*a3:t.iy", "hi1:2*iy3w.", "hi1:2*a3:t.eM", "hi1:2*a3:t.eN", "hi1:2*a3:nw."],
    I: ["ya1:2*iy3", "t.a1:2*iy3", "t.a1:2*iy3", "t.a1:2*iy3iy", "'a1:2*iy3", "ya1:2*iy3w.", "t.a1:2*E3:nAh", "t.a1:2*iy3w.", "t.a1:2*E3:nAh", "na1:2*iy3"],
    W: { "3MS": "way.a1:2*E3", "3FS": "wat.a1:2*E3", "2MS": "wat.a1:2*E3", "1CP": "wan.a1:2*E3" },     // (The short form: וַיַּקְטֵל)
    IMP: ["ha1:2*E3", "ha1:2*iy3iy", "ha1:2*iy3w.", "ha1:2*E3:nAh"],
    PTC: ["ma1:2*iy3", "ma1:2*e3et", "ma1:2*iy3iyM", "ma1:2*iy3wOt"], INC: "ha1:2*iy3", INA: "ha1:2*E3" },
  { code: "HO", name: "Hophal", kind: "causative passive",
    P: ["hA1:2*a3", "hA1:2*:3Ah", "hA1:2*a3:t.A", "hA1:2*a3:t.:", "hA1:2*a3:t.iy", "hA1:2*:3w.", "hA1:2*a3:t.eM", "hA1:2*a3:t.eN", "hA1:2*a3:nw."],
    I: ["yA1:2*a3", "t.A1:2*a3", "t.A1:2*a3", "t.A1:2*:3iy", "'A1:2*a3", "yA1:2*:3w.", "t.A1:2*a3:nAh", "t.A1:2*:3w.", "t.A1:2*a3:nAh", "nA1:2*a3"],
    PTC: ["mA1:2*A3", "mA1:2*e3et", "mA1:2*A3iyM", "mA1:2*A3wOt"], INC: "hA1:2*a3", INA: "hA1:2*E3" },
  { code: "HT", name: "Hithpael", kind: "reflexive",
    P: ["hit:1*a2+E3", "hit:1*a2+:3Ah", "hit:1*a2+a3:t.A", "hit:1*a2+a3:t.:", "hit:1*a2+a3:t.iy", "hit:1*a2+:3w.", "hit:1*a2+a3:t.eM", "hit:1*a2+a3:t.eN", "hit:1*a2+a3:nw."],
    I: ["yit:1*a2+E3", "t.it:1*a2+E3", "t.it:1*a2+E3", "t.it:1*a2+:3iy", "'et:1*a2+E3", "yit:1*a2+:3w.", "t.it:1*a2+E3:nAh", "t.it:1*a2+:3w.", "t.it:1*a2+E3:nAh", "nit:1*a2+E3"],
    IMP: ["hit:1*a2+E3", "hit:1*a2+:3iy", "hit:1*a2+:3w.", "hit:1*a2+E3:nAh"],
    PTC: ["mit:1*a2+E3", "mit:1*a2+e3et", "mit:1*a2+:3iyM", "mit:1*a2+:3wOt"], INC: "hit:1*a2+E3", INA: "hit:1*a2+E3" },
];

/** The wayyiqtol from the imperfect: וַ + the prefix letter doubled (וַיִּקְטֹל), but א (not doubled: וָאֶקְטֹל) and a
 *  yod with shewa (its dagesh dropped: וַיְקַטֵּל). */
function wayyiqtol (impf: string): string {
  if (impf[0] === "'") return "wA" + impf;
  if (impf[1] === "." || (impf[0] === "y" && impf[1] === ":")) return "wa" + impf;
  return "wa" + impf[0] + "." + impf.slice (1);
}

/** English on "do" (or a model verb's): [do, did, done, doing, does]. */
export type English = [string, string, string, string, string];
export const DO: English = ["do", "did", "done", "doing", "does"];

const HEB_SUBJECT: Record<string, string> = { "3MS": "he", "3FS": "she", "2MS": "you (m.)", "2FS": "you (f.)", "1CS": "I",
  "3CP": "they", "3MP": "they (m.)", "3FP": "they (f.)", "2MP": "you (m. pl.)", "2FP": "you (f. pl.)", "1CP": "we" };
const GN_WORDS: Record<string, string> = { MS: "m. sg.", FS: "f. sg.", MP: "m. pl.", FP: "f. pl." };
const was = (subj: string) => /^(he|she|I)\b/.test (subj) ? "was" : "were";

/** A Hebrew form's meaning on "do": by its form (P I W IMP PTC PTP INC INA), person / gender / number and the stem's
 *  kind (passive "was done", causative "caused to do", the Piel and Pual "(intensive)", the Hithpael "(reflexive)"). */
function hebrewMeaning (kind: Voice, form: string, pgn: string, e: English): string {
  const [d, did, done, doing] = e;
  const passive = kind.includes ("passive"), causative = kind.startsWith ("causative");
  const verb = (aux: "past" | "will" | "bare" | "ing") => {
    if (causative) {
      const c = aux === "past" ? "caused" : aux === "will" ? "will cause" : aux === "ing" ? "causing" : "cause";
      return passive ? `${aux === "past" ? "{was}" : aux === "will" ? "will be" : aux === "ing" ? "being" : "be"} caused to ${d}` : `${c} to ${d}`;
    }
    if (passive) return `${aux === "past" ? "{was}" : aux === "will" ? "will be" : aux === "ing" ? "being" : "be"} ${done}`;
    return aux === "past" ? did : aux === "will" ? `will ${d}` : aux === "ing" ? doing : d;
  };
  const subj = HEB_SUBJECT[pgn] ?? "";
  let m: string;
  if (form === "P") m = `${subj} ${verb ("past")}`;
  else if (form === "I") m = `${subj} ${verb ("will")}`;
  else if (form === "W") m = `and ${subj} ${verb ("past")}`;
  else if (form === "IMP") m = `${verb ("bare")}! (${GN_WORDS[pgn.slice (1)]})`;
  else if (form === "PTC") m = `${verb ("ing")} (${GN_WORDS[pgn]})`;
  else if (form === "PTP") m = `${done} (${GN_WORDS[pgn]})`;
  else if (form === "INC") m = `to ${verb ("bare")}`;
  else m = `(surely) ${verb ("bare")}`;
  m = m.replace ("{was}", was (subj));
  return m + (kind.startsWith ("intensive") ? " (intensive)" : kind === "reflexive" ? " (reflexive)" : "");
}

/** One Hebrew cell: the template and its code. */
export interface HebrewCell { code: string; template: string; form: string; pgn: string; }

/** A stem's cells by kind: the finite forms' grid (form -> pgn -> cell) and the rest in order. */
export function hebrewCells (stem: Stem) {
  const grid: Record<string, Record<string, HebrewCell>> = { P: {}, I: {}, W: {}, IMP: {} };
  const cell = (form: string, pgn: string, template: string): HebrewCell =>
    ({ code: `${stem.code}-${form}${pgn ? "-" + pgn : ""}`, template, form, pgn });
  PERFECT_PGN.forEach ((g, i) => { grid.P[g === "3CP" ? "3MP" : g] = cell ("P", g, stem.P[i]); });
  HEBREW_PGN.forEach ((g, i) => {
    grid.I[g] = cell ("I", g, stem.I[i]);
    grid.W[g] = cell ("W", g, stem.W?.[g] ?? wayyiqtol (stem.I[i]));
  });
  IMPV_PGN.forEach ((g, i) => { if (stem.IMP) grid.IMP[g] = cell ("IMP", g, stem.IMP[i]); });
  const ptc = HEBREW_GN.map ((g, i) => cell ("PTC", g, stem.PTC[i]));
  const ptp = stem.PTP ? HEBREW_GN.map ((g, i) => cell ("PTP", g, stem.PTP![i])) : null;
  return { grid, ptc, ptp, inc: cell ("INC", "", stem.INC), ina: cell ("INA", "", stem.INA) };
}

/** A Hebrew model verb: its root's letters and English. */
export interface HebrewModel { root: string; english: English; }
export const HEBREW_MODELS: HebrewModel[] = [
  { root: "קטל", english: ["kill", "killed", "killed", "killing", "kills"] },
  { root: "שׁמר", english: ["keep", "kept", "kept", "keeping", "keeps"] },
  { root: "משׁל", english: ["rule", "ruled", "ruled", "ruling", "rules"] },
  { root: "כתב", english: ["write", "wrote", "written", "writing", "writes"] },
];
const rootLetters = (root: string) => root.match (/.[ׁׂ]?/g)!;     // (Each letter with its shin / sin dot)

/** A Hebrew cell as the screens show it: the pattern, or with a model verb its form (rootL coloured); text: the form
 *  as plain text (the flashcards' "on a model root"). */
export function hebrewForm (stem: Stem, c: HebrewCell, model: HebrewModel | null): Form & { text: string } {
  const parts = parse (c.template);
  const text = hebrewFill (parts, rootLetters ((model ?? HEBREW_MODELS[0]).root), false);
  return { code: c.code, meaning: hebrewMeaning (stem.kind, c.form, c.pgn, model?.english ?? DO), text,
           pattern: model ? `<span class="pattern he filled">${hebrewFill (parts, rootLetters (model.root), true)}</span>` : hebrewPattern (parts) };
}

// ---- Greek ----

// A form is [augment][reduplication][stem][ending]; its accent placed by rule (accent()): "R" recessive (finite
// verbs), a number - on that syllable from the end (participles and infinitives, whose accent stays where the
// paradigm has it), "^" a circumflex on the last (the aorist passive subjunctive's contraction: λυθῶ). In an ending, a
// long α ι υ is marked with a macron (stripped when shown): λύσᾱς. ν in brackets is the movable nu.
export const GREEK_PN = ["1S", "2S", "3S", "1P", "2P", "3P"];
const IMPV_PN = ["2S", "3S", "2P", "3P"];
export const GREEK_PTC = ["NSM", "NSF", "NSN", "GSM"];
type Ending = [string, string];     // (ending, accent)
const R = (...e: string[]): Ending[] => e.map ((x) => [x, "R"]);

interface TenseVoice { code: string; name: string; tense: string; voice: "A" | "M" | "P"; augment: boolean;
  redup: boolean; stem: "present" | "future" | "aorist" | "passive" | "perfect"; long: boolean;
  I: Ending[]; S?: Ending[]; M?: Ending[]; N: Ending; P: Ending[]; }

const PRES_A = { I: R ("ω", "εις", "ει", "ομεν", "ετε", "ουσι(ν)"), S: R ("ω", "ῃς", "ῃ", "ωμεν", "ητε", "ωσι(ν)"),
  M: R ("ε", "ετω", "ετε", "ετωσαν"), N: ["ειν", "R"] as Ending, P: [["ων", "2"], ["ουσα", "3"], ["ον", "2"], ["οντος", "3"]] as Ending[] };
const PRES_M = { I: R ("ομαι", "ῃ", "εται", "ομεθα", "εσθε", "ονται"), S: R ("ωμαι", "ῃ", "ηται", "ωμεθα", "ησθε", "ωνται"),
  M: R ("ου", "εσθω", "εσθε", "εσθωσαν"), N: ["εσθαι", "R"] as Ending, P: [["ομενος", "3"], ["ομενη", "2"], ["ομενον", "3"], ["ομενου", "2"]] as Ending[] };
const IMPF_A = R ("ον", "ες", "ε(ν)", "ομεν", "ετε", "ον"), IMPF_M = R ("ομην", "ου", "ετο", "ομεθα", "εσθε", "οντο");
const ptc = (stem: string, acc: string[]) => ["ος", "η", "ον", "ου"].map ((e, i) => [stem + e, acc[i]] as Ending);

export const GREEK_TENSES: TenseVoice[] = [
  { code: "PA", name: "Present active", tense: "P", voice: "A", augment: false, redup: false, stem: "present", long: true, ...PRES_A },
  { code: "PM", name: "Present middle", tense: "P", voice: "M", augment: false, redup: false, stem: "present", long: true, ...PRES_M },
  { code: "PP", name: "Present passive", tense: "P", voice: "P", augment: false, redup: false, stem: "present", long: true, ...PRES_M },
  { code: "IA", name: "Imperfect active", tense: "I", voice: "A", augment: true, redup: false, stem: "present", long: true, I: IMPF_A, N: ["", ""], P: [] },
  { code: "IM", name: "Imperfect middle", tense: "I", voice: "M", augment: true, redup: false, stem: "present", long: true, I: IMPF_M, N: ["", ""], P: [] },
  { code: "IP", name: "Imperfect passive", tense: "I", voice: "P", augment: true, redup: false, stem: "present", long: true, I: IMPF_M, N: ["", ""], P: [] },
  { code: "FA", name: "Future active", tense: "F", voice: "A", augment: false, redup: false, stem: "future", long: true,
    I: R ("σω", "σεις", "σει", "σομεν", "σετε", "σουσι(ν)"), N: ["σειν", "R"], P: [["σων", "2"], ["σουσα", "3"], ["σον", "2"], ["σοντος", "3"]] },
  { code: "FM", name: "Future middle", tense: "F", voice: "M", augment: false, redup: false, stem: "future", long: true,
    I: R ("σομαι", "σῃ", "σεται", "σομεθα", "σεσθε", "σονται"), N: ["σεσθαι", "R"], P: ptc ("σομεν", ["3", "2", "3", "2"]) },
  { code: "FP", name: "Future passive", tense: "F", voice: "P", augment: false, redup: false, stem: "passive", long: false,
    I: R ("θησομαι", "θησῃ", "θησεται", "θησομεθα", "θησεσθε", "θησονται"), N: ["θησεσθαι", "R"], P: ptc ("θησομεν", ["3", "2", "3", "2"]) },
  { code: "AA", name: "Aorist active", tense: "A", voice: "A", augment: true, redup: false, stem: "aorist", long: true,
    I: R ("σα", "σας", "σε(ν)", "σαμεν", "σατε", "σαν"), S: R ("σω", "σῃς", "σῃ", "σωμεν", "σητε", "σωσι(ν)"),
    M: R ("σον", "σατω", "σατε", "σατωσαν"), N: ["σαι", "2"], P: [["σᾱς", "2"], ["σασα", "3"], ["σαν", "2"], ["σαντος", "3"]] },
  { code: "AM", name: "Aorist middle", tense: "A", voice: "M", augment: true, redup: false, stem: "aorist", long: true,
    I: R ("σαμην", "σω", "σατο", "σαμεθα", "σασθε", "σαντο"), S: R ("σωμαι", "σῃ", "σηται", "σωμεθα", "σησθε", "σωνται"),
    M: R ("σαι", "σασθω", "σασθε", "σασθωσαν"), N: ["σασθαι", "3"], P: ptc ("σαμεν", ["3", "2", "3", "2"]) },
  { code: "AP", name: "Aorist passive", tense: "A", voice: "P", augment: true, redup: false, stem: "passive", long: false,
    I: R ("θην", "θης", "θη", "θημεν", "θητε", "θησαν"), S: [["θω", "^"], ["θῃς", "^"], ["θῃ", "^"], ["θωμεν", "2"], ["θητε", "2"], ["θωσι(ν)", "2"]],
    M: R ("θητι", "θητω", "θητε", "θητωσαν"), N: ["θηναι", "2"], P: [["θεις", "1"], ["θεισα", "2"], ["θεν", "1"], ["θεντος", "2"]] },
  { code: "RA", name: "Perfect active", tense: "R", voice: "A", augment: false, redup: true, stem: "perfect", long: false,
    I: R ("κα", "κας", "κε(ν)", "καμεν", "κατε", "κασι(ν)"), N: ["κεναι", "2"], P: [["κως", "1"], ["κυια", "2"], ["κος", "1"], ["κοτος", "2"]] },
  { code: "RM", name: "Perfect middle", tense: "R", voice: "M", augment: false, redup: true, stem: "perfect", long: false,
    I: R ("μαι", "σαι", "ται", "μεθα", "σθε", "νται"), N: ["σθαι", "2"], P: ptc ("μεν", ["2", "2", "2", "2"]) },
  { code: "RP", name: "Perfect passive", tense: "R", voice: "P", augment: false, redup: true, stem: "perfect", long: false,
    I: R ("μαι", "σαι", "ται", "μεθα", "σθε", "νται"), N: ["σθαι", "2"], P: ptc ("μεν", ["2", "2", "2", "2"]) },
];

const ACUTE = "́", CIRCUMFLEX = "͂", MACRON = "̄", IOTA_SUB = "ͅ", DIAERESIS = "̈";
const VOWELS = "αεηιουω";
const DIPHTHONGS = ["αι", "ει", "οι", "υι", "αυ", "ευ", "ου", "ηυ"];

/** Places a Greek word's accent (see above). The word unaccented (NFD inside); its long α ι υ macron-marked; final
 *  -αι / -οι count short. Returns it accented, NFC, macrons gone. */
export function accent (word: string, how: string): string {
  const nu = word.endsWith ("(ν)");
  const w = [...(nu ? word.slice (0, -3) : word).normalize ("NFD")];
  // The vowel nuclei: [index of the mark's place (the nucleus's last vowel), long?]
  const nuclei: { at: number; long: boolean }[] = [];
  for (let i = 0; i < w.length; i++) {
    if (! VOWELS.includes (w[i])) continue;
    let j = i, k = i + 1;
    const marksAfter = (x: number) => { let y = x; while (y < w.length && /\p{M}/u.test (w[y])) y++; return y; };
    k = marksAfter (i + 1);
    let isDiph = false;
    if (k < w.length && DIPHTHONGS.includes (w[i] + w[k]) && ! w.slice (k + 1, marksAfter (k + 1)).includes (DIAERESIS)
        && ! w.slice (i + 1, k).includes (MACRON)) { isDiph = true; j = k; k = marksAfter (k + 1); }
    const marks = w.slice (i + 1, k);
    const long = isDiph || "ηω".includes (w[i]) || marks.includes (MACRON) || marks.includes (IOTA_SUB);
    nuclei.push ({ at: j, long });
    i = k - 1;
  }
  const n = nuclei.length;
  if (! n) return word;
  const last = nuclei[n - 1];
  // Final -αι / -οι are short for the accent.
  const tail = w.slice (nuclei[n - 1].at - 1).join ("");
  if (/^(αι|οι)$/.test (tail)) last.long = false;
  let pos: number;      // (Counted from the end: 1 the last syllable)
  if (how === "R") pos = last.long ? Math.min (2, n) : Math.min (3, n);
  else if (how === "^") pos = 1;
  else pos = Math.min (Number (how), n, last.long ? 2 : 3);
  const nuc = nuclei[n - pos];
  const circ = how === "^" || (pos === 2 && nuc.long && ! last.long);
  // The mark goes after the nucleus's last vowel and its own marks (a breathing first: ἔ).
  let at = nuc.at + 1;
  while (at < w.length && /\p{M}/u.test (w[at]) && w[at] !== IOTA_SUB) at++;
  w.splice (at, 0, circ ? CIRCUMFLEX : ACUTE);
  return (w.join ("").replace (new RegExp (MACRON, "g"), "") + (nu ? "(ν)" : "")).normalize ("NFC");
}

/** A Greek model verb: its stems (unaccented; a long υ / ι / α macron-marked where it's long: λῡ in the present,
 *  future and aorist, short in the perfect and aorist passive), reduplication and English. */
export interface GreekModel { lemma: string; stem: string; short: string; redup: string; english: English; }
export const GREEK_MODELS: GreekModel[] = [
  { lemma: "λύω", stem: "λῡ", short: "λυ", redup: "λε", english: ["loose", "loosed", "loosed", "loosing", "looses"] },
  { lemma: "πιστεύω", stem: "πιστευ", short: "πιστευ", redup: "πε", english: ["believe", "believed", "believed", "believing", "believes"] },
  { lemma: "παιδεύω", stem: "παιδευ", short: "παιδευ", redup: "πε", english: ["train", "trained", "trained", "training", "trains"] },
];

const GRK_SUBJECT: Record<string, string> = { "1S": "I", "2S": "you", "3S": "he", "1P": "we", "2P": "you (pl.)", "3P": "they" };
const SELF: Record<string, string> = { "1S": "myself", "2S": "yourself", "3S": "himself", "1P": "ourselves", "2P": "yourselves", "3P": "themselves" };
const BE: Record<string, string> = { "1S": "am", "2S": "are", "3S": "is", "1P": "are", "2P": "are", "3P": "are" };
const HAVE = (pn: string) => pn === "3S" ? "has" : "have";
const PTC_WORDS: Record<string, string> = { NSM: "m.", NSF: "f.", NSN: "n.", GSM: "m. gen." };

/** A Greek form's meaning on "do": by tense, voice, mood and person (the middle "(for myself)" and so on). */
function greekMeaning (tv: TenseVoice, mood: string, pn: string, e: English): string {
  const [d, did, done, doing, does] = e;
  const pass = tv.voice === "P", t = tv.tense;
  const self = tv.voice === "M" ? ` (for ${mood === "N" || mood === "P" ? "oneself" : SELF[pn] ?? "oneself"})` : "";
  const s = GRK_SUBJECT[pn];
  let m = "";
  if (mood === "I") {
    if (t === "P") m = pass ? `${s} ${BE[pn]} ${done}` : `${s} ${pn === "3S" ? does : d}`;
    else if (t === "I") m = pass ? `${s} ${pn[1] === "S" && pn !== "2S" ? "was" : "were"} being ${done}` : `${s} ${pn[1] === "S" && pn !== "2S" ? "was" : "were"} ${doing}`;
    else if (t === "F") m = pass ? `${s} will be ${done}` : `${s} will ${d}`;
    else if (t === "A") m = pass ? `${s} ${pn[1] === "S" && pn !== "2S" ? "was" : "were"} ${done}` : `${s} ${did}`;
    else m = pass ? `${s} ${HAVE (pn)} been ${done}` : `${s} ${HAVE (pn)} ${done}`;
  } else if (mood === "S") m = pass ? `${s} may be ${done}` : `${s} may ${d}`;
  else if (mood === "M") {
    const v = pass ? `be ${done}` : d;
    m = pn === "3S" ? `let him ${v}!` : pn === "3P" ? `let them ${v}!` : `${v}!${pn === "2P" ? " (pl.)" : ""}`;
  } else if (mood === "N") {
    m = t === "F" ? (pass ? `to be about to be ${done}` : `to be about to ${d}`)
      : t === "R" ? (pass ? `to have been ${done}` : `to have ${done}`) : pass ? `to be ${done}` : `to ${d}`;
  } else {
    const v = t === "F" ? (pass ? `about to be ${done}` : `about to ${d}`) : t === "A" || t === "R"
      ? (pass ? (t === "R" ? `(having been) ${done}` : `having been ${done}`) : `having ${done}`) : pass ? `being ${done}` : doing;
    m = `${v} (${PTC_WORDS[pn]})`;
  }
  return m + self;
}

/** One Greek cell: its code (Robinson's, as the reader shows: PAI-1S, AAN, PAP-NSM), mood and person. */
export interface GreekCell { code: string; mood: string; pn: string; ending: Ending; }

/** A tense / voice's cells: the finite moods' grid (mood -> person -> cell), the infinitive and participle. */
export function greekCells (tv: TenseVoice) {
  const head = tv.tense + tv.voice;
  const grid: Record<string, Record<string, GreekCell>> = {};
  const moods: [string, Ending[] | undefined, string[]][] = [["I", tv.I, GREEK_PN], ["S", tv.S, GREEK_PN], ["M", tv.M, IMPV_PN]];
  for (const [mood, ends, pns] of moods) {
    if (! ends) continue;
    grid[mood] = {};
    pns.forEach ((pn, i) => { grid[mood][pn] = { code: `${head}${mood}-${pn}`, mood, pn, ending: ends[i] }; });
  }
  const inf = tv.N[0] ? { code: `${head}N`, mood: "N", pn: "", ending: tv.N } : null;
  const ptc = tv.P.map ((e, i) => ({ code: `${head}P-${GREEK_PTC[i]}`, mood: "P", pn: GREEK_PTC[i], ending: e }));
  return { grid, inf, ptc };
}

/** A Greek cell as the screens show it: the pattern (the augment ἐ, a reduplication's consonant a small square + ε,
 *  the stem a square, the ending unaccented), or with a model verb its form, accented; text: the form on λύω. */
export function greekForm (tv: TenseVoice, c: GreekCell, model: GreekModel | null): Form & { text: string } {
  const word = (m: GreekModel) => {
    const stem = tv.long ? m.stem : m.short;
    return accent ((tv.augment && c.mood === "I" ? "ἐ" : "") + (tv.redup ? m.redup : "") + stem + c.ending[0], c.ending[1]);
  };
  const plain = (s: string) => s.replace (/̄/g, "").normalize ("NFC");
  const aug = tv.augment && c.mood === "I";
  const pattern = model
    ? (() => {     // (The model's stem coloured: the word split where its stem ends)
        const full = word (model), cut = [...plain ((aug ? "ἐ" : "") + (tv.redup ? model.redup : "") + (tv.long ? model.stem : model.short))].length;
        const chars = [...full.normalize ("NFD")];
        let base = 0, at = 0;
        while (at < chars.length && base < cut) { at++; while (at < chars.length && /\p{M}/u.test (chars[at])) at++; base++; }
        const pre = (aug ? 1 : 0) + (tv.redup ? [...model.redup].length : 0);
        let at2 = 0, b2 = 0;
        while (at2 < chars.length && b2 < pre) { at2++; while (at2 < chars.length && /\p{M}/u.test (chars[at2])) at2++; b2++; }
        const j = (a: number, b: number) => chars.slice (a, b).join ("").normalize ("NFC");
        return `<span class="pattern gr filled">${j (0, at2)}<span class="rootL">${j (at2, at)}</span>${j (at)}</span>`;
      }) ()
    : `<span class="pattern gr">${aug ? "<span>ἐ</span>" : ""}${tv.redup ? `<span class="slot small"></span><span>ε</span>` : ""}<span class="slot wide"></span><span>${plain (c.ending[0])}</span></span>`;
  return { code: c.code, meaning: greekMeaning (tv, c.mood, c.pn, model?.english ?? DO), pattern,
           text: word (model ?? GREEK_MODELS[0]) };
}

export type { Stem, TenseVoice };

/** A paradigm code spelled out, in the words the word panel uses (pipeline/morph.py's): "Q-P-3MS" -> "Qal perfect, 3rd
 *  masculine singular", "PAP-NSF" -> "Present active participle, nominative singular feminine" - for the flashcards,
 *  whose forms the text doesn't always have (the database's parsings list only the codes it does). */
const H_FORMS: Record<string, string> = { P: "perfect", I: "imperfect", W: "wayyiqtol (sequential imperfect)", IMP: "imperative",
  PTC: "participle", PTP: "passive participle", INC: "infinitive construct", INA: "infinitive absolute" };
const PERSON: Record<string, string> = { "1": "1st", "2": "2nd", "3": "3rd" };
const H_GENDER: Record<string, string> = { M: "masculine", F: "feminine", C: "common" };
const NUMBER: Record<string, string> = { S: "singular", P: "plural" };
const G_TENSE: Record<string, string> = { P: "Present", I: "Imperfect", F: "Future", A: "Aorist", R: "Perfect", L: "Pluperfect" };
const G_VOICE: Record<string, string> = { A: "active", M: "middle", P: "passive" };
const G_MOOD: Record<string, string> = { I: "indicative", S: "subjunctive", M: "imperative", O: "optative", N: "infinitive", P: "participle" };
const G_CASE: Record<string, string> = { N: "nominative", G: "genitive", D: "dative", A: "accusative", V: "vocative" };
const G_GENDER: Record<string, string> = { M: "masculine", F: "feminine", N: "neuter" };
export function spellCode (code: string, hebrew: boolean): string {
  const parts = code.split ("-");
  if (hebrew) {
    const [stem, form, pgn] = parts;
    const head = `${HEBREW_STEMS.find ((s) => s.code === stem)?.name ?? stem} ${H_FORMS[form] ?? form}`;
    if (! pgn) return head;
    const words = pgn.length === 3 ? [PERSON[pgn[0]], H_GENDER[pgn[1]], NUMBER[pgn[2]]] : [H_GENDER[pgn[0]], NUMBER[pgn[1]]];
    return `${head}, ${words.join (" ")}`;
  }
  const [tvm, rest] = parts;
  const head = `${G_TENSE[tvm[0]] ?? tvm[0]} ${G_VOICE[tvm[1]] ?? tvm[1]} ${G_MOOD[tvm[2]] ?? tvm[2]}`;
  if (! rest) return head;
  return `${head}, ${rest.length === 2 ? `${PERSON[rest[0]]} person ${NUMBER[rest[1]]}` : `${G_CASE[rest[0]]} ${NUMBER[rest[1]]} ${G_GENDER[rest[2]]}`}`;
}
