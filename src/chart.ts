// The Verb chart (☰ > Verb chart; design/mock-hebrew.html, mock-greek.html): one stem's forms (Hebrew) or one tense and
// voice's (Greek) as a grid - Hebrew: a row per person / gender / number, columns perfect, imperfect, wayyiqtol and
// imperative (the imperative in the 2nd person's rows; none for the Pual and Hophal), then a small table of the
// participles (and the Qal's passive one) and the infinitives; Greek: a row per person and number, columns
// indicative, subjunctive and imperative where the tense has them, then the infinitive and the participle's nominative
// singulars and masculine genitive. Each cell its form, COTEXT's code and its meaning on "do" (paradigm.ts).
//
// The verb picker fills it: "Pattern" (dotted squares), a model verb (the templates filled: paradigm.ts), the verbs of
// the chapter shown, or any verb typed (its consonants or letters, matched to the lexicon's dictionary forms). A verb
// from the text shows its actual forms as the text has them: per cell the commonest spelling of that lemma (every
// sense of its Strong's number) with exactly that code (no prefix or suffix), accents and punctuation stripped, and
// how often that code occurs; "–" where it never does. The stem picker then counts its forms in each stem.

import type { Db } from "./db";
import type { Word } from "./reader";
import { onScreen, currentTestament } from "./study";
import { HEBREW_STEMS, HEBREW_MODELS, HEBREW_PGN, HEBREW_GN, GREEK_TENSES, GREEK_MODELS, GREEK_PN, GREEK_PTC,
         hebrewCells, hebrewForm, greekCells, greekForm, type Form } from "./paradigm";

let db: Db;
let chapterWords: Word[] = [];
/** The verb chosen: the pattern, a model (its index), or a verb of the text (its Strong's number without the sense letter). */
type Verb = { kind: "pattern" } | { kind: "model"; i: number } | { kind: "text"; base: string; lemma: string; gloss: string };
const state = { OT: { stem: 0, verb: { kind: "pattern" } as Verb }, NT: { stem: 0, verb: { kind: "pattern" } as Verb } };

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

let lexCache: { OT: [string, string, string][]; NT: [string, string, string][] } | null = null;     // [base, lemma, its letters]
let verbBases: Set<string> | null = null;

/** A dictionary form reduced to its letters, for matching what's typed: Hebrew without points (final letters as the
 *  others), Greek without accents or breathings, lower case, σ for ς. */
const letters = (s: string) => s.normalize ("NFD").replace (/[֑-ׇ\p{M}]/gu, "").toLowerCase ()
  .replace (/[ךםןףץς]/g, (c) => ({ ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ", ς: "σ" } as Record<string, string>)[c]).replace (/\s/g, "");

function verbsMatching (typed: string, t: "OT" | "NT"): [string, string, string][] {
  if (! verbBases) {
    verbBases = new Set (db.all (`SELECT DISTINCT f.strong FROM form_freq f JOIN parsings p ON p.code = f.code
                                  WHERE f.book = 0 AND p.stem != ''`).map ((r) => baseOf (String (r.strong))));
  }
  if (! lexCache) {
    lexCache = { OT: [], NT: [] };
    const seen = new Set<string> ();
    for (const r of db.all ("SELECT strong, lemma FROM lexicon ORDER BY strong")) {
      const base = baseOf (String (r.strong));
      if (seen.has (base) || ! verbBases.has (base)) continue;
      seen.add (base);
      lexCache[base.startsWith ("H") ? "OT" : "NT"].push ([base, String (r.lemma), letters (String (r.lemma))]);
    }
  }
  const want = letters (typed);
  if (! want) return [];
  const list = lexCache[t];
  return [...list.filter ((v) => v[2] === want), ...list.filter ((v) => v[2] !== want && v[2].startsWith (want))].slice (0, 8);
}

function textVerb (base: string): Verb {
  const [lex] = db.all ("SELECT lemma, concise, gloss FROM lexicon WHERE strong = ? OR strong GLOB ? ORDER BY strong LIMIT 1", [base, base + "[A-Z]"]);
  return { kind: "text", base, lemma: String (lex?.lemma ?? base), gloss: String (lex?.concise || lex?.gloss || "") };
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
    shown = s ? `<span class="pattern ${hebrew ? "he" : "gr"} filled"><span class="rootL">${esc (best!)}</span></span><span class="count">×${s.count.toLocaleString ()}</span>`
              : `<span class="none">–</span>`;
  }
  return `<td><div class="cForm">${shown}</div><div class="parse">${f.code}</div><div class="mean">${esc (f.meaning)}</div></td>`;
}

const head = (cols: string[]) => `<tr><th></th>${cols.map ((c) => `<th>${c}</th>`).join ("")}</tr>`;

function hebrewTables (verb: Verb, stemIdx: number): string {
  const stem = HEBREW_STEMS[stemIdx];
  const model = verb.kind === "model" ? HEBREW_MODELS[verb.i] : null;
  const c = hebrewCells (stem);
  const form = (cell: Parameters<typeof hebrewForm>[1]) => cellHtml (hebrewForm (stem, cell, model), verb, true);
  const cols: [string, string][] = [["P", "PERFECT"], ["I", "IMPERFECT"], ["W", "WAYYIQTOL"]];
  if (stem.IMP) cols.push (["IMP", "IMPERATIVE"]);
  const rows = HEBREW_PGN.map ((pgn) => `<tr><th class="parse">${pgn}</th>${cols.map (([k]) => {
    const cell = c.grid[k][pgn];
    if (cell) return form (cell);
    return k === "P" && pgn === "3FP" ? `<td class="same">= 3CP above</td>` : `<td></td>`;
  }).join ("")}</tr>`).join ("");
  const small = [`<tr><th>PARTICIPLE</th>${c.ptc.map (form).join ("")}</tr>`];
  if (c.ptp) small.push (`<tr><th>PASSIVE PARTICIPLE</th>${c.ptp.map (form).join ("")}</tr>`);
  small.push (`<tr><th>INFINITIVE CONSTRUCT</th>${form (c.inc)}<td colspan="3"></td></tr>`,
              `<tr><th>INFINITIVE ABSOLUTE</th>${form (c.ina)}<td colspan="3"></td></tr>`);
  return `<div class="chartScroll"><table class="chart">${head (cols.map ((x) => x[1]))}${rows}</table></div>
          <div class="chartScroll"><table class="chart small">${head (HEBREW_GN)}${small.join ("")}</table></div>`;
}

function greekTables (verb: Verb, tvIdx: number): string {
  const tv = GREEK_TENSES[tvIdx];
  const model = verb.kind === "model" ? GREEK_MODELS[verb.i] : null;
  const c = greekCells (tv);
  const form = (cell: Parameters<typeof greekForm>[1]) => cellHtml (greekForm (tv, cell, model), verb, false);
  const cols = (["I", "S", "M"] as const).filter ((m) => c.grid[m]);
  const names = { I: "INDICATIVE", S: "SUBJUNCTIVE", M: "IMPERATIVE" };
  const rows = GREEK_PN.map ((pn) => `<tr><th class="parse">${pn}</th>${cols.map ((m) => c.grid[m][pn] ? form (c.grid[m][pn]) : "<td></td>").join ("")}</tr>`).join ("");
  let small = "";
  if (c.ptc.length || c.inf) {
    small = `<div class="chartScroll"><table class="chart small">${head (["NOM. M.", "NOM. F.", "NOM. N.", "GEN. M."])}
      ${c.ptc.length ? `<tr><th>PARTICIPLE</th>${c.ptc.map (form).join ("")}</tr>` : ""}
      ${c.inf ? `<tr><th>INFINITIVE</th>${form (c.inf)}<td colspan="3"></td></tr>` : ""}</table></div>`;
  }
  return `<div class="chartScroll"><table class="chart">${head (cols.map ((m) => names[m]))}${rows}</table></div>${small}`;
}

/** The screen: the pickers, what the verb is, and its tables. */
function render (body: HTMLElement) {
  const t = currentTestament ();
  const hebrew = t === "OT";
  const st = state[t];
  const verb = st.verb;
  const stems = hebrew ? HEBREW_STEMS.map ((s) => s.name) : GREEK_TENSES.map ((x) => x.name);
  const counts = verb.kind === "text" ? stemCounts (verb.base) : null;
  const models = hebrew ? HEBREW_MODELS.map ((m) => `${m.root} - ${m.english[0]}`) : GREEK_MODELS.map ((m) => `${m.lemma} - ${m.english[0]}`);
  const inText = chapterVerbs ();
  const label = (base: string) => { const v = textVerb (base) as Extract<Verb, { kind: "text" }>; return `${v.lemma} - ${v.gloss}`; };
  const value = verb.kind === "pattern" ? "p" : verb.kind === "model" ? `m${verb.i}` : `t${verb.base}`;
  const options = [`<option value="p">Pattern (${hebrew ? "⬚⬚⬚" : "⬚"})</option>`,
    `<optgroup label="Model verbs">${models.map ((m, i) => `<option value="m${i}">${esc (m)}</option>`).join ("")}</optgroup>`,
    inText.length ? `<optgroup label="In this chapter">${inText.map ((b) => `<option value="t${b}">${esc (label (b))}</option>`).join ("")}</optgroup>` : "",
    verb.kind === "text" && ! inText.includes (verb.base) ? `<option value="t${verb.base}">${esc (verb.lemma)} - ${esc (verb.gloss)}</option>` : ""];
  body.innerHTML = `
    <div class="chartPick">
      <label>${hebrew ? "Stem" : "Tense and voice"}<select class="choose" id="chartStem">${stems.map ((s, i) =>
        `<option value="${i}">${s}${counts ? ` (${counts[i].toLocaleString ()})` : ""}</option>`).join ("")}</select></label>
      <label>Verb<select class="choose" id="chartVerb">${options.join ("")}</select></label>
      <label>Type a verb<input class="choose" id="chartType" type="text" lang="${hebrew ? "he" : "el"}" dir="${hebrew ? "rtl" : "ltr"}"
        autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${hebrew ? "הלך" : "λέγω"}"></label>
    </div>
    <div class="choices" id="chartFound"></div>
    <p>${verb.kind === "text"
      ? `<b class="${hebrew ? "he" : "gr"}Word">${esc (verb.lemma)}</b> ${esc (verb.gloss)} - its forms as the ${hebrew ? "Hebrew Bible" : "New Testament"} has them: the commonest spelling of each, and how often it occurs.`
      : hebrew ? "The root's letters as dotted squares, the form's own letters written. Under each: its parsing and its meaning on \"do\"."
               : "The stem as a dotted square, the augment and endings written. Under each: its parsing and its meaning on \"do\"."}</p>
    ${hebrew ? hebrewTables (verb, st.stem) : greekTables (verb, st.stem)}`;
  const stemPick = body.querySelector<HTMLSelectElement> ("#chartStem")!;
  const verbPick = body.querySelector<HTMLSelectElement> ("#chartVerb")!;
  const typed = body.querySelector<HTMLInputElement> ("#chartType")!;
  const found = body.querySelector<HTMLElement> ("#chartFound")!;
  stemPick.value = String (st.stem);
  verbPick.value = value;
  stemPick.addEventListener ("change", () => { st.stem = Number (stemPick.value); render (body); });
  verbPick.addEventListener ("change", () => {
    const v = verbPick.value;
    st.verb = v === "p" ? { kind: "pattern" } : v[0] === "m" ? { kind: "model", i: Number (v.slice (1)) } : textVerb (v.slice (1));
    render (body);
  });
  const pick = (base: string) => { st.verb = textVerb (base); render (body); };
  typed.addEventListener ("input", () => {
    const hits = verbsMatching (typed.value, t);
    found.innerHTML = hits.map (([b, lemma]) => `<button class="pill" data-base="${b}"><span class="${hebrew ? "he" : "gr"}Word">${esc (lemma)}</span></button>`).join ("")
      || (typed.value.trim () ? `<p>No verb found.</p>` : "");
    for (const btn of found.querySelectorAll<HTMLElement> ("[data-base]")) btn.addEventListener ("click", () => pick (btn.dataset.base!));
  });
  typed.addEventListener ("keydown", (e) => {
    if (e.key !== "Enter") return;
    const [hit] = verbsMatching (typed.value, t);
    if (hit) pick (hit[0]);
  });
}

onScreen ("Verb chart", render);
