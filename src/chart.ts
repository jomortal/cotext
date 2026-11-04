// The Verb chart (☰ > Verb chart): one stem's forms (Hebrew) or one tense and voice's (Greek) in one column down the
// page, a heading for each group and a row per form - Hebrew: perfect, imperfect, wayyiqtol and imperative (the 2nd
// person's; none for the Pual and Hophal), each a row per person / gender / number, then the participles (and the
// Qal's passive one) and the infinitives (picked by a row each for stem type, voice and form - one form, or all); Greek (picked by a row each for tense, voice and mood - one mood, or all):
// indicative, subjunctive and imperative where the tense has them, a row per person and number, then the participle's nominative singulars and masculine genitive and the infinitive. Each cell its form, COTEXT's code and its meaning on "do" - a verb of the text's on its own English (paradigm.ts' englishOf).
//
// The verb picker fills it: "Pattern" (dotted squares), a model verb (the templates filled: paradigm.ts), the verbs of
// the chapter shown, or the word's own (its panel's Verb chart). A verb
// from the text shows its actual forms as the text has them: per cell the commonest spelling of that lemma (every
// sense of its Strong's number) with exactly that code (no prefix or suffix), accents and punctuation stripped, and
// how often that code occurs; where it never does, the form filled in from the verb's root by the regular pattern
// (faded, "not in the text": rootModel in paradigm.ts), or "–" for a verb that has none. The stem picker then counts its forms in each stem. A verb's
// panel (panel.ts) opens the chart on that verb, at its own stem (openChartFor).

import type { Db } from "./db";
import type { Word } from "./reader";
import { onScreen, currentTestament, openScreen } from "./study";
import { HEBREW_STEMS, HEBREW_MODELS, HEBREW_PGN, HEBREW_GN, GREEK_TENSES, GREEK_MODELS, GREEK_PN, GREEK_PTC,
         hebrewCells, hebrewForm, greekCells, greekForm, rootModel, type Form, type HebrewModel, type GreekModel, englishOf } from "./paradigm";

let db: Db;
let chapterWords: Word[] = [];
/** The verb chosen: the pattern, a model (its index), or a verb of the text (its Strong's number without the sense letter). */
type Verb = { kind: "pattern" } | { kind: "model"; i: number } | { kind: "text"; base: string; lemma: string; gloss: string };
const state = { OT: { stem: 0, verb: { kind: "pattern" } as Verb, mood: "" }, NT: { stem: 0, verb: { kind: "pattern" } as Verb, mood: "" } };
// (mood: the part shown, "" all - Greek's mood: I S M N P, indicative, subjunctive, imperative, infinitive, participle;
// Hebrew's form: P I W IMP PTC INF, perfect, imperfect, wayyiqtol, imperative, participle, infinitive)

export function initChart (theDb: Db) { db = theDb; }
/** The chapter shown: its verbs are offered in the verb picker. */
export function setChartPassage (words: Word[]) { chapterWords = words; }

const baseOf = (strong: string) => strong.match (/^[HG]\d+/)?.[0] ?? strong;
const esc = (s: string) => s.replace (/[&<>"]/g, (c) => `&#${c.charCodeAt (0)};`);

// ---- The text's forms ----

interface Seen { count: number; spellings: Map<string, number>; }
const attestedCache = new Map<string, Map<string, Seen>> ();

/** Hebrew as the chart shows it: points kept, accents, meteg, maqqef and punctuation dropped, and a paragraph mark
 *  after the word (" ס", " פ"). Greek: lower case,
 *  punctuation dropped (a grave accent kept, as written). */
const cleanHebrew = (t: string) => t.split (" ")[0].normalize ("NFD").replace (/[^ְ-ׇּׁׂא-ת]/g, "").normalize ("NFC");
const cleanGreek = (t: string) => t.normalize ("NFC").toLowerCase ().replace (/[^Ͱ-Ͽἀ-῿]/g, "");

/** A Greek source code -> the chart's codes it fills: the second aorist's 2 dropped; a deponent's voice to its form's
 *  (D middle, O passive), "middle or passive" (E, N) to both. */
function greekKeys (code: string): string[] {
  const m = code.match (/^2?([PIFARL])([AMPEDON])([ISOMNP])(.*)$/);
  if (! m) return [];
  const voices = { A: ["A"], M: ["M"], D: ["M"], P: ["P"], O: ["P"], E: ["M", "P"], N: ["M", "P"] }[m[2]]!;
  return voices.map ((v) => m[1] + v + m[3] + m[4]);
}

/** Every form of a verb in the text, by the chart's code. (One pass over the words: the words table isn't indexed by
 *  Strong's number; kept per verb.) */
function attested (base: string): Map<string, Seen> {
  let m = attestedCache.get (base);
  if (m) return m;
  m = new Map ();
  const greek = base.startsWith ("G");
  const rows = db.all (`SELECT w.text, p.code FROM words w JOIN parsings p ON p.morph = w.morph
                        WHERE w.strong = ? OR w.strong GLOB ?`, [base, base + "[A-Z]"]);
  for (const r of rows) {
    const text = greek ? cleanGreek (String (r.text)) : cleanHebrew (String (r.text));
    for (const key of greek ? greekKeys (String (r.code)) : [String (r.code)]) {
      const s = m.get (key) ?? { count: 0, spellings: new Map () };
      s.count++;
      s.spellings.set (text, (s.spellings.get (text) ?? 0) + 1);
      m.set (key, s);
    }
  }
  attestedCache.set (base, m);
  return m;
}

/** How many of a verb's forms each stem (or tense / voice) has: the stem picker's counts. */
function stemCounts (base: string): number[] {
  const seen = attested (base);
  const total = (prefix: string) => [...seen].reduce ((n, [k, s]) => n + (k.startsWith (prefix) ? s.count : 0), 0);
  return base.startsWith ("H") ? HEBREW_STEMS.map ((s) => total (s.code + "-")) : GREEK_TENSES.map ((t) => total (t.tense + t.voice));
}

// ---- Finding verbs ----


function textVerb (base: string): Verb {
  const [lex] = db.all ("SELECT lemma, concise, gloss FROM lexicon WHERE strong = ? OR strong GLOB ? ORDER BY strong LIMIT 1", [base, base + "[A-Z]"]);
  return { kind: "text", base, lemma: String (lex?.lemma ?? base), gloss: String (lex?.concise || lex?.gloss || "") };
}

/** A verb's stem or tense and voice in the chart (its index), from its COTEXT code ("CONJ+Q-W-3MS" -> Qal, "AAI-3S"
 *  -> Aorist active); -1 if the chart has none (an Aramaic stem, a form it doesn't set out). */
export function chartStemOf (strong: string, code: string): number {
  if (strong.startsWith ("H")) {
    for (const part of code.split ("+")) { const i = HEBREW_STEMS.findIndex ((s) => s.code === part.split ("-")[0]); if (i >= 0) return i; }
    return -1;
  }
  const [k] = greekKeys (code);
  return k ? GREEK_TENSES.findIndex ((t) => t.code === k.slice (0, 2)) : -1;
}

/** The word panel's "Verb chart": the chart opened on that verb, its stem (or tense and voice) picked. */
export function openChartFor (strong: string, code: string) {
  const st = state[strong.startsWith ("H") ? "OT" : "NT"];
  st.stem = Math.max (0, chartStemOf (strong, code));
  st.verb = textVerb (baseOf (strong));
  st.mood = "";     // (Every form shown: the word's own among them)
  openScreen ("Verb chart");
}

/** The chapter's verbs, each once (by Strong's number), in order. */
function chapterVerbs (): string[] {
  const out: string[] = [];
  for (const w of chapterWords) if (w.stem && ! out.includes (baseOf (w.strong))) out.push (baseOf (w.strong));
  return out;
}

// ---- Drawing ----

/** One cell: its form (the pattern, a model's form, or the text's spelling with its count), code and meaning. */
function cellHtml (f: Form, verb: Verb, hebrew: boolean): string {
  let shown = f.pattern;
  if (verb.kind === "text") {
    const s = attested (verb.base).get (f.code);
    const best = s && [...s.spellings].sort ((a, b) => b[1] - a[1])[0][0];
    // (Not in the text: filled in from the verb's root by the regular pattern, faded, if it has one - rootModel)
    shown = s ? `<span class="pattern ${hebrew ? "he" : "gr"} filled"><span class="rootL">${esc (best!)}</span></span><span class="count">×${s.count.toLocaleString ()}</span>`
              : f.pattern.includes ("filled") ? `<span class="guess">${f.pattern}</span><span class="count">not in the text</span>` : `<span class="none">–</span>`;
  }
  return `<td><div class="cForm">${shown}</div><div class="parse">${f.code}</div><div class="mean">${esc (f.meaning)}</div></td>`;
}

/** The chart: one column, each group (PERFECT, IMPERFECT... PARTICIPLE) a heading and its forms down the page, each
 *  row its label (3MS, NOM. M.) and its cell. */
type Group = [string, [string, string][]];
const column = (groups: Group[]) => `<div class="chartScroll"><table class="chart">${groups.filter ((g) => g[1].length).map (([name, rows]) =>
  `<tr><th class="group" colspan="2">${name}</th></tr>${rows.map (([l, cell]) => `<tr><th class="parse">${l}</th>${cell}</tr>`).join ("")}`).join ("")}</table></div>`;

function hebrewTables (verb: Verb, stemIdx: number, mood = ""): string {
  const stem = HEBREW_STEMS[stemIdx];
  const model = verb.kind === "model" ? HEBREW_MODELS[verb.i] : verb.kind === "text" ? rootModel (verb.lemma, true) as HebrewModel | null : null;
  const c = hebrewCells (stem);
  const english = verb.kind === "text" ? englishOf (verb.gloss) ?? undefined : undefined;     // (A verb of the text: its meanings in its own English)
  const form = (cell: Parameters<typeof hebrewForm>[1]) => cellHtml (hebrewForm (stem, cell, model, english), verb, true);
  const cols: [string, string][] = [["P", "PERFECT"], ["I", "IMPERFECT"], ["W", "WAYYIQTOL"]];
  if (stem.IMP) cols.push (["IMP", "IMPERATIVE"]);
  const groups: Group[] = cols.map (([k, name]) => [name, HEBREW_PGN.flatMap ((pgn): [string, string][] => {
    const cell = c.grid[k][pgn];
    if (cell) return [[pgn, form (cell)]];
    return k === "P" && pgn === "3FP" ? [[pgn, `<td class="same">= 3CP above</td>`]] : [];
  })]);
  groups.push (["PARTICIPLE", c.ptc.map ((x, i) => [HEBREW_GN[i], form (x)])]);
  if (c.ptp) groups.push (["PASSIVE PARTICIPLE", c.ptp.map ((x, i) => [HEBREW_GN[i], form (x)])]);
  groups.push (["INFINITIVE", [["CONSTRUCT", form (c.inc)], ["ABSOLUTE", form (c.ina)]]]);
  const formName: Record<string, string[]> = { P: ["PERFECT"], I: ["IMPERFECT"], W: ["WAYYIQTOL"], IMP: ["IMPERATIVE"],
    PTC: ["PARTICIPLE", "PASSIVE PARTICIPLE"], INF: ["INFINITIVE"] };
  return column (mood ? groups.filter ((g) => formName[mood].includes (g[0])) : groups);
}

function greekTables (verb: Verb, tvIdx: number, mood = ""): string {
  const tv = GREEK_TENSES[tvIdx];
  const model = verb.kind === "model" ? GREEK_MODELS[verb.i] : verb.kind === "text" ? rootModel (verb.lemma, false) as GreekModel | null : null;
  const c = greekCells (tv);
  const english = verb.kind === "text" ? englishOf (verb.gloss) ?? undefined : undefined;
  const form = (cell: Parameters<typeof greekForm>[1]) => cellHtml (greekForm (tv, cell, model, english), verb, false);
  const names = { I: "INDICATIVE", S: "SUBJUNCTIVE", M: "IMPERATIVE" };
  const groups: Group[] = (["I", "S", "M"] as const).filter ((m) => c.grid[m]).map ((m) =>
    [names[m], GREEK_PN.filter ((pn) => c.grid[m][pn]).map ((pn): [string, string] => [pn, form (c.grid[m][pn])])]);
  const ptcHeads = ["NOM. M.", "NOM. F.", "NOM. N.", "GEN. M."];
  groups.push (["PARTICIPLE", c.ptc.map ((x, i) => [ptcHeads[i], form (x)])]);
  if (c.inf) groups.push (["INFINITIVE", [["", form (c.inf)]]]);
  const moodName: Record<string, string> = { I: "INDICATIVE", S: "SUBJUNCTIVE", M: "IMPERATIVE", N: "INFINITIVE", P: "PARTICIPLE" };
  return column (mood ? groups.filter ((g) => g[0] === moodName[mood]) : groups);
}

/** Greek's pickers: a row for tense, one for voice, one for mood (All or one), the ones shown lit. With a verb of the
 *  text, each tense and voice its count of forms (a tense's for all its voices; a voice's in the tense shown). */
const G_TENSE_NAMES: [string, string][] = [["P", "Present"], ["I", "Imperfect"], ["F", "Future"], ["A", "Aorist"], ["R", "Perfect"]];
const G_VOICE_NAMES: [string, string][] = [["A", "Active"], ["M", "Middle"], ["P", "Passive"]];
const G_MOOD_NAMES: [string, string][] = [["", "All"], ["I", "Indicative"], ["S", "Subjunctive"], ["M", "Imperative"], ["N", "Infinitive"], ["P", "Participle"]];
/** Hebrew's pickers: a row for the stem's type (simple, intensive, causative), one for its voice (active, passive,
 *  reflexive) - the two naming one stem, each voice button with the stem it gives (Active - Qal) - and one for the form
 *  (All, or one). With a verb of the text, each its count of forms (a type's for all its stems). */
const H_GRID: [string, string, (string | null)[]][] = [     // [type, its name, its stems' codes by voice: active, passive, reflexive]
  ["S", "Simple", ["Q", "N", null]], ["I", "Intensive", ["P", "PU", "HT"]], ["C", "Causative", ["HI", "HO", null]]];
const H_VOICES = ["Active", "Passive", "Reflexive"];
const H_FORMS: [string, string][] = [["", "All"], ["P", "Perfect"], ["I", "Imperfect"], ["W", "Wayyiqtol"], ["IMP", "Imperative"], ["PTC", "Participle"], ["INF", "Infinitive"]];
const stemAt = (code: string | null) => code ? HEBREW_STEMS.findIndex ((x) => x.code === code) : -1;
/** The forms a stem has (its index): "" (all) always; the imperative not in the Pual and Hophal. */
function formsOf (stemIdx: number): Record<string, boolean> {
  return { "": true, P: true, I: true, W: true, IMP: !! HEBREW_STEMS[stemIdx].IMP, PTC: true, INF: true };
}
function hebrewRows (st: { stem: number; mood: string }, counts: number[] | null): string {
  const code = HEBREW_STEMS[st.stem].code;
  const row = H_GRID.find ((r) => r[2].includes (code))!, voice = row[2].indexOf (code);
  const n = (k: number) => counts ? ` (${k.toLocaleString ()})` : "";
  const btn = (attr: string, v: string, label: string, on: boolean, off = false) =>
    `<button class="pill" data-${attr}="${v}" aria-pressed="${on}"${off ? " disabled" : ""}>${label}</button>`;
  const has = formsOf (st.stem);
  return `<div class="src">Stem</div><div class="choices">${H_GRID.map (([k, name, codes]) =>
      btn ("htype", k, name + n (codes.reduce ((a, c) => a + (c ? counts?.[stemAt (c)] ?? 0 : 0), 0)), row[0] === k)).join ("")}</div>
    <div class="src">Voice</div><div class="choices">${H_VOICES.map ((name, v) => {
      const i = stemAt (row[2][v]);
      return btn ("hvoice", String (v), i >= 0 ? `${name} - ${HEBREW_STEMS[i].name}${n (counts?.[i] ?? 0)}` : name, voice === v, i < 0);
    }).join ("")}</div>
    <div class="src">Form</div><div class="choices">${H_FORMS.map (([k, name]) => btn ("mood", k, name, st.mood === k, ! has[k])).join ("")}</div>`;
}

/** The moods a tense and voice has (its index): "" (all) always. */
function moodsOf (tvIdx: number): Record<string, boolean> {
  const c = greekCells (GREEK_TENSES[tvIdx]);
  return { "": true, I: !! c.grid.I, S: !! c.grid.S, M: !! c.grid.M, N: !! c.inf, P: c.ptc.length > 0 };
}
function greekRows (st: { stem: number; mood: string }, counts: number[] | null): string {
  const tv = GREEK_TENSES[st.stem];
  const n = (k: number) => counts ? ` (${k.toLocaleString ()})` : "";
  const sum = (f: (x: typeof tv) => boolean) => GREEK_TENSES.reduce ((a, x, i) => a + (f (x) ? counts?.[i] ?? 0 : 0), 0);
  const has = moodsOf (st.stem);
  const btn = (attr: string, v: string, label: string, on: boolean, off = false) =>
    `<button class="pill" data-${attr}="${v}" aria-pressed="${on}"${off ? " disabled" : ""}>${label}</button>`;
  return `<div class="src">Tense</div><div class="choices">${G_TENSE_NAMES.map (([k, name]) => btn ("tense", k, name + n (sum ((x) => x.tense === k)), tv.tense === k)).join ("")}</div>
    <div class="src">Voice</div><div class="choices">${G_VOICE_NAMES.map (([k, name]) => {
      const i = GREEK_TENSES.findIndex ((x) => x.tense === tv.tense && x.voice === k);
      return btn ("voice", k, name + n (i >= 0 ? counts?.[i] ?? 0 : 0), tv.voice === k, i < 0);
    }).join ("")}</div>
    <div class="src">Mood</div><div class="choices">${G_MOOD_NAMES.map (([k, name]) => btn ("mood", k, name, st.mood === k, ! has[k])).join ("")}</div>`;
}

/** The screen: the pickers, what the verb is, and its tables. */
function render (body: HTMLElement) {
  const t = currentTestament ();
  const hebrew = t === "OT";
  const st = state[t];
  const verb = st.verb;
  const counts = verb.kind === "text" ? stemCounts (verb.base) : null;
  const models = hebrew ? HEBREW_MODELS.map ((m) => `${m.root} - ${m.english[0]}`) : GREEK_MODELS.map ((m) => `${m.lemma} - ${m.english[0]}`);
  const inText = chapterVerbs ();
  const label = (base: string) => { const v = textVerb (base) as Extract<Verb, { kind: "text" }>; return `${v.lemma} - ${v.gloss}`; };
  const value = verb.kind === "pattern" ? "p" : verb.kind === "model" ? `m${verb.i}` : `t${verb.base}`;
  const options = [`<option value="p">Pattern (${hebrew ? "⬚⬚⬚" : "⬚"})</option>`,
    `<optgroup label="Model verbs">${models.map ((m, i) => `<option value="m${i}">${esc (m)}</option>`).join ("")}</optgroup>`,
    inText.length ? `<optgroup label="In this chapter">${inText.map ((b) => `<option value="t${b}">${esc (label (b))}</option>`).join ("")}</optgroup>` : "",
    verb.kind === "text" && ! inText.includes (verb.base) ? `<option value="t${verb.base}">${esc (verb.lemma)} - ${esc (verb.gloss)}</option>` : ""];
  if (! (hebrew ? formsOf (st.stem) : moodsOf (st.stem))[st.mood]) st.mood = "";     // (A mood or form the one shown hasn't: all)
  body.innerHTML = `
    ${hebrew ? hebrewRows (st, counts) : greekRows (st, counts)}
    <div class="chartPick">
      <label>Verb<select class="choose" id="chartVerb">${options.join ("")}</select></label>
    </div>
    <p>${verb.kind === "text"
      ? `<b class="${hebrew ? "he" : "gr"}Word">${esc (verb.lemma)}</b> ${esc (verb.gloss)} - its forms as the ${hebrew ? "Hebrew Bible" : "New Testament"} has them: the commonest spelling of each, and how often it occurs; the rest, faded, filled in by the regular pattern where the verb allows it. Under each: its parsing and its meaning on "${esc ((englishOf (verb.gloss) ?? ["do"])[0])}".`
      : hebrew ? "The root's letters as dotted squares, the form's own letters written. Under each: its parsing and its meaning on \"do\"."
               : "The stem as a dotted square, the augment and endings written. Under each: its parsing and its meaning on \"do\"."}</p>
    ${hebrew ? hebrewTables (verb, st.stem, st.mood) : greekTables (verb, st.stem, st.mood)}`;
  const verbPick = body.querySelector<HTMLSelectElement> ("#chartVerb")!;
  verbPick.value = value;
  // Greek: a tense or voice tapped keeps the other (or takes the tense's first voice the chart has); a mood shows only that part.
  const pickTV = (tense: string, voice: string) => {
    const i = GREEK_TENSES.findIndex ((x) => x.tense === tense && x.voice === voice);
    st.stem = i >= 0 ? i : GREEK_TENSES.findIndex ((x) => x.tense === tense);
    render (body);
  };
  for (const b of body.querySelectorAll<HTMLElement> ("[data-tense]")) b.addEventListener ("click", () => pickTV (b.dataset.tense!, GREEK_TENSES[st.stem].voice));
  for (const b of body.querySelectorAll<HTMLElement> ("[data-voice]")) b.addEventListener ("click", () => pickTV (GREEK_TENSES[st.stem].tense, b.dataset.voice!));
  // Hebrew: a type tapped keeps the voice where it can (else its active), a voice picks that stem of the type.
  const hRow = () => H_GRID.find ((r) => r[2].includes (HEBREW_STEMS[st.stem].code))!;
  for (const b of body.querySelectorAll<HTMLElement> ("[data-htype]")) b.addEventListener ("click", () => {
    const row = H_GRID.find ((r) => r[0] === b.dataset.htype)!, v = hRow ()[2].indexOf (HEBREW_STEMS[st.stem].code);
    st.stem = stemAt (row[2][v] ?? row[2][0]); render (body);
  });
  for (const b of body.querySelectorAll<HTMLElement> ("[data-hvoice]")) b.addEventListener ("click", () => { st.stem = stemAt (hRow ()[2][Number (b.dataset.hvoice)]); render (body); });
  for (const b of body.querySelectorAll<HTMLElement> ("[data-mood]")) b.addEventListener ("click", () => { st.mood = b.dataset.mood!; render (body); });
  verbPick.addEventListener ("change", () => {
    const v = verbPick.value;
    st.verb = v === "p" ? { kind: "pattern" } : v[0] === "m" ? { kind: "model", i: Number (v.slice (1)) } : textVerb (v.slice (1));
    render (body);
  });
}

onScreen ("Verb chart", render);
