// The word's panel: a sheet from the bottom when a word is tapped - its dictionary form, its parsing spelled out
// ("Qal perfect, 3rd masculine singular" - each term a grammar explains tappable, its section opening below: grammar.ts)
// and its entry in the brief lexicon (TBESH for Hebrew, TBESG for Greek -
// STEPBible's, keyed by the same extended Strong's as the text). "+ My vocab" adds it to the words being learned (vocab.ts); "+ Known words" marks the word known
// (helps.ts: its gloss hidden, every form of it, everywhere; ✓ In known words, tapped again, takes it off); the entry concise, More opening the full one, BDB (Hebrew) the word's full Brown-Driver-Briggs entry; the word as written (shown even when it's the dictionary form itself; ✕ frozen at the panel's upper right while the rest scrolls), then its dictionary form (with + Known words), each with a speaker that says it (audio.ts) - a verb's with "Verb chart" beside it, opening the chart on that verb at its stem (chart.ts). ✕ (or tapping the word again) hides it.

import { openNotesDb, type Db } from "./db";
import type { Word } from "./reader";
import { onHelpsChange, knownWords, setKnown, unsetKnown } from "./helps";
import { sayText, sayWord } from "./audio";
import { showParsing, hideGrammar } from "./grammar";
import { setVocabWord } from "./vocab";
import { chartStemOf, openChartFor } from "./chart";

// A verb's "Verb chart", right of its dictionary form's speaker: the chart opened on this verb at its stem.
const chartBtn = document.createElement ("button");
chartBtn.className = "pill"; chartBtn.textContent = "Verb chart"; chartBtn.hidden = true;
document.getElementById ("speakRoot")!.after (chartBtn);
let chartFor: [string, string] | null = null;
chartBtn.addEventListener ("click", () => { if (chartFor) openChartFor (...chartFor); });     // (The panel stays open under the chart: its ✕ back to the word)

const sheet = document.getElementById ("sheet")!;
const lemmaEl = document.getElementById ("lemma")!;
const formEl = document.getElementById ("form")!;
// The head, top to bottom: the word as written, its English as the interlinear gives it here, its parsing spelled out,
// then its dictionary form (the root word) with its buttons - the word repeated when it's the dictionary form itself.
const formGloss = document.createElement ("span");
formGloss.className = "formGloss";
formEl.parentElement!.after (formGloss, document.getElementById ("full")!);     // (The word as it stands in the text, before its dictionary form)
const fullEl = document.getElementById ("full")!;
const srcEl = document.getElementById ("src")!;
const defEl = document.getElementById ("def")!;
const knowIt = document.getElementById ("knowIt")!;
let picked: HTMLElement | null = null;
let pickedStrong = "";

document.getElementById ("close")!.addEventListener ("click", hidePanel);
knowIt.addEventListener ("click", () => (knownWords ().includes (pickedStrong) ? unsetKnown : setKnown) (pickedStrong));
document.getElementById ("speakBtn")!.addEventListener ("click", () => { if (picked) sayWord (picked); });
document.getElementById ("speakRoot")!.addEventListener ("click", () => sayText (lemmaEl.textContent ?? ""));     // (The dictionary form)
// + KNOWN WORDS: the word known by hand (its gloss hidden everywhere) - then ✓ IN KNOWN WORDS, tapped again taken off.
const label = () => { knowIt.textContent = knownWords ().includes (pickedStrong) ? "✓ In known words" : "+ Known words"; };
onHelpsChange (() => { if (picked) label (); });

// The entry: the meaning to learn (a few words: build_db.py's concise()), with More opening the full entry in the
// lexicon picked - LEXICON, a picker as GRAMMAR's, over the entry, for a Hebrew word BDB has: the STEPBible brief
// lexicon, or Brown-Driver-Briggs (its entry - or entries, where BDB splits the Strong's number -, its credit under
// it); kept on the device. Greek, or a word BDB lacks: the brief lexicon, no picker. Less goes back to the meaning.
// BDB's entries are their own file (data/notes/bdb.db: pipeline/bdb.py), downloaded the first time BDB is shown and
// kept (db.ts: openNotesDb).
const moreBtn = document.getElementById ("moreDef")!;
const bdbCredit = document.getElementById ("bdbCredit")!;
const lexRow = document.getElementById ("lexRow")!, lexPick = document.getElementById ("lexPick") as HTMLSelectElement;
lexPick.innerHTML = `<option value="full">STEPBible (abridged BDB)</option><option value="bdb">Brown-Driver-Briggs</option>`;
const LEX_KEY = "cotext.lexicon";
let lexChoice = "full";     // (The Hebrew lexicon picked: full - the brief lexicon - or bdb)
try { lexChoice = localStorage.getItem (LEX_KEY) === "bdb" ? "bdb" : "full"; } catch { /* private mode */ }
lexPick.addEventListener ("change", () => {
  lexChoice = lexPick.value;
  try { localStorage.setItem (LEX_KEY, lexChoice); } catch { /* private mode: not kept */ }
  showEntry (lexChoice as Shown);
});
type Shown = "concise" | "full" | "bdb";
let entry = { concise: "", full: "", bdb: "", hebrew: true };     // (bdb: the word's BDB ids, space-separated; "" none)
let shown: Shown = "concise";
let mainDb: Db | null = null;
let bdbDb: Promise<Db> | null = null;     // (BDB's file, once opened)
moreBtn.addEventListener ("click", () => showEntry (shown !== "concise" ? "concise" : entry.bdb && lexChoice === "bdb" ? "bdb" : "full"));

/** The entry, concise, full or BDB's; under the concise one More (Less under the others); over a full one LEXICON,
 *  where BDB has the word (its name then said by the picker, not the label). */
function showEntry (to: Shown) {
  shown = to;
  lexRow.hidden = to === "concise" || ! entry.bdb;
  if (! lexRow.hidden) lexPick.value = to;
  srcEl.hidden = ! lexRow.hidden;
  srcEl.textContent = to === "concise" ? "Meaning" : entry.hebrew ? "STEPBible brief lexicon (abridged BDB)" : "STEPBible brief lexicon (Abbott-Smith)";
  // The brief lexicon's entry holds only <b>, <i> and <br> (pipeline/build_db.py's entry_html escapes everything
  // else); BDB's the few tags bdb.py writes, its Hebrew and Greek styled as a grammar's (.gBody).
  defEl.classList.toggle ("gBody", to === "bdb");
  if (to === "full") defEl.innerHTML = entry.full;
  else if (to === "concise") defEl.textContent = entry.concise;
  else showBdb ();
  bdbCredit.hidden = to !== "bdb";
  moreBtn.hidden = to === "concise" && entry.full === entry.concise && ! entry.bdb;     // (Nothing more to open)
  moreBtn.textContent = to === "concise" ? "More" : "Less";
}

/** The word's BDB entries into the panel - BDB's file loaded first if it isn't yet (its progress shown). */
async function showBdb () {
  const ids = entry.bdb.split (" "), word = picked;
  const still = () => shown === "bdb" && picked === word;     // (Another word, or Less, while it loaded: left alone)
  try {
    if (! bdbDb) {
      const [f] = mainDb!.all ("SELECT file, version FROM bdb_file");
      bdbDb = openNotesDb ("bdb", String (f.file), String (f.version), (p) => {
        if (still ()) defEl.textContent = `Loading BDB… ${Math.round (p * 100)}%`;
      });
      bdbDb.catch (() => { bdbDb = null; });     // (Tried again on the next tap)
    }
    defEl.textContent = "Loading BDB…";
    const db = await bdbDb;
    if (! still ()) return;
    const byId = new Map (db.all (`SELECT id, html FROM entries WHERE id IN (${ids.map (() => "?").join (",")})`, ids)
      .map ((r) => [String (r.id), String (r.html)]));
    defEl.innerHTML = ids.map ((i) => byId.get (i) ?? "").join ("");
  } catch {
    if (still ()) defEl.textContent = "BDB couldn't be loaded.";
  }
}

// The divine name (H3068, H3069): a note on how it's said - its vowels are a reminder to read another word, so
// written out as it stands it gives the hybrid "Jehovah"; the voice says Adonai (audio.ts' sayName).
const nameNote = document.getElementById ("nameNote")!;
const NAME_NOTE: Record<string, string> = {
  H3068: "Pronunciation: יהוה (YHWH) is God's personal name. Out of reverence it isn't spoken: the text gives it the vowels of אֲדֹנָי (Adonai, \"Lord\"), a reminder to say Adonai - many say HaShem (\"the Name\"). Its own pronunciation was lost; scholars reconstruct it as Yahweh. Read with Adonai's vowels as written, it gives the hybrid \"Jehovah\". COTEXT's voice says Adonai.",
  H3069: "Pronunciation: יהוה (YHWH), God's personal name, here with the vowels of אֱלֹהִים (Elohim, \"God\") - written so where אֲדֹנָי (Adonai, \"Lord\") stands beside it (\"Lord GOD\"), so it's said Elohim rather than Adonai twice - as COTEXT's voice says it. Its own pronunciation was lost; scholars reconstruct it as Yahweh.",
};

export function showPanel (db: Db, w: Word, wordEl: HTMLElement) {
  if (picked === wordEl && ! sheet.hidden) { hidePanel (); return; }
  picked?.classList.remove ("on");
  picked = wordEl;
  wordEl.classList.add ("on");
  pickedStrong = w.strong;
  label ();
  setVocabWord (w.strong);     // (+ My vocab: vocab.ts)
  chartFor = w.stem && chartStemOf (w.strong, w.code) >= 0 ? [w.strong, w.code] : null;
  chartBtn.hidden = ! chartFor;
  const hebrew = w.strong.startsWith ("H");
  const [lex] = db.all ("SELECT lemma, gloss, entry, concise FROM lexicon WHERE strong = ?", [w.strong]);
  const [parsing] = db.all ("SELECT spelled, terms FROM parsings WHERE morph = ?", [w.morph]);
  const [bdb] = hebrew ? db.all ("SELECT entries FROM bdb WHERE strong = ?", [w.strong]) : [];
  mainDb = db;
  lemmaEl.textContent = String (lex?.lemma ?? w.text);
  lemmaEl.dir = hebrew ? "rtl" : "ltr";
  formEl.textContent = w.text;
  formEl.dir = lemmaEl.dir;
  formGloss.textContent = w.gloss ?? "";
  const note = NAME_NOTE[w.strong.match (/^H\d+/)?.[0] ?? ""];
  nameNote.textContent = note ?? "";
  nameNote.hidden = ! note;
  showParsing (fullEl, String (parsing?.spelled ?? ""), parsing?.terms as string | null, hebrew);     // (Its terms tappable: grammar.ts)
  entry = { concise: String (lex?.concise || lex?.gloss || ""), full: String (lex?.entry || lex?.gloss || ""),
            bdb: String (bdb?.entries ?? ""), hebrew };
  showEntry ("concise");
  sheet.hidden = false;
  sheet.scrollTop = 0;
  // Keep the word in view above the sheet.
  requestAnimationFrame (() => {
    const over = wordEl.getBoundingClientRect ().bottom - (window.innerHeight - sheet.offsetHeight) + 12;
    if (over > 0) document.querySelector ("main")!.scrollBy ({ top: over, behavior: "smooth" });     // (main scrolls: style.css)
  });
}

export function hidePanel () {
  sheet.hidden = true;
  hideGrammar ();
  picked?.classList.remove ("on");
  picked = null;
}
