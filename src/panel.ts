// The word's panel: a sheet from the bottom when a word is tapped - its dictionary form, its parsing spelled out
// ("Qal perfect, 3rd masculine singular" - each term a grammar explains tappable, its section opening below: grammar.ts)
// and its entry in the brief lexicon (TBESH for Hebrew, TBESG for Greek -
// STEPBible's, keyed by the same extended Strong's as the text). "+ My vocab" adds it to the words being learned (vocab.ts); "I know this word" / "Show helps" flips the word's
// helps (helps.ts: every form of it, everywhere); the entry concise, More opening the full one; the word as written (with Close; left out when it's the dictionary form itself, Close then beside I know this word), then its dictionary form (with I know this word), each with a speaker that says it (audio.ts) - a verb's with "Verb chart" beside it, opening the chart on that verb at its stem (chart.ts). Close (or tapping the word again) hides it.

import type { Db } from "./db";
import type { Word } from "./reader";
import { isHidden, flip, onHelpsChange } from "./helps";
import { sayText, sayWord } from "./audio";
import { showParsing, hideGrammar } from "./grammar";
import { setVocabWord } from "./vocab";
import { chartStemOf, openChartFor } from "./chart";

// A verb's "Verb chart", right of its dictionary form's speaker: the chart opened on this verb at its stem.
const chartBtn = document.createElement ("button");
chartBtn.className = "pill"; chartBtn.textContent = "Verb chart"; chartBtn.hidden = true;
document.getElementById ("speakRoot")!.after (chartBtn);
let chartFor: [string, string] | null = null;
chartBtn.addEventListener ("click", () => { if (chartFor) { hidePanel (); openChartFor (...chartFor); } });

const sheet = document.getElementById ("sheet")!;
const lemmaEl = document.getElementById ("lemma")!;
const formEl = document.getElementById ("form")!;     // (The word as it stands in the text, before its dictionary form)
const closeBtn = document.getElementById ("close")!;
const fullEl = document.getElementById ("full")!;
const srcEl = document.getElementById ("src")!;
const defEl = document.getElementById ("def")!;
const knowIt = document.getElementById ("knowIt")!;
let picked: HTMLElement | null = null;
let pickedStrong = "";

document.getElementById ("close")!.addEventListener ("click", hidePanel);
knowIt.addEventListener ("click", () => flip (pickedStrong));
document.getElementById ("speakBtn")!.addEventListener ("click", () => { if (picked) sayWord (picked); });
document.getElementById ("speakRoot")!.addEventListener ("click", () => sayText (lemmaEl.textContent ?? ""));     // (The dictionary form)
const label = () => { knowIt.textContent = isHidden (pickedStrong) ? "Show helps" : "I know this word"; };
onHelpsChange (() => { if (picked) label (); });

// The entry: the meaning to learn (a few words: build_db.py's concise()), with More opening the brief lexicon's full
// entry for this word (Less closing it).
const moreBtn = document.getElementById ("moreDef")!;
let entry = { concise: "", full: "", hebrew: true };
moreBtn.addEventListener ("click", () => showEntry (moreBtn.textContent === "More"));

/** The entry, concise or full; under the concise one More (Less under a full one opened by it). */
function showEntry (full: boolean) {
  srcEl.textContent = ! full ? "Meaning" : entry.hebrew ? "STEPBible brief lexicon (abridged BDB)" : "STEPBible brief lexicon (Abbott-Smith)";
  // The entry holds only <b>, <i> and <br> (pipeline/build_db.py's entry_html escapes everything else).
  if (full) defEl.innerHTML = entry.full; else defEl.textContent = entry.concise;
  moreBtn.hidden = entry.full === entry.concise;
  moreBtn.textContent = full ? "Less" : "More";
}

/** A word as compared with its dictionary form: Hebrew's accents, meteg, maqaf and punctuation dropped; Greek's
 *  punctuation dropped, a grave as an acute, lower case. */
const bare = (t: string) => t.normalize ("NFD").replace (/[\u0591-\u05af\u05bd\u05be\u05c0\u05c3-\u05c6]/g, "").replace (/\u0300/g, "\u0301")
  .replace (/[^\p{L}\p{M}]/gu, "").toLowerCase ().normalize ("NFC");

// The divine name (H3068, H3069): a note on how it's said - its vowels are a reminder to read another word, so
// written out as it stands it gives the hybrid "Jehovah"; the voice says Adonai (audio.ts' sayName).
const nameNote = document.getElementById ("nameNote")!;
const NAME_NOTE: Record<string, string> = {
  H3068: "Pronunciation: יהוה (YHWH) is God's personal name. Out of reverence it isn't spoken: the text gives it the vowels of אֲדֹנָי (Adonai, \"Lord\"), a reminder to say Adonai - many say HaShem (\"the Name\"). Its own pronunciation was lost; scholars reconstruct it as Yahweh. Read with Adonai's vowels as written, it gives the hybrid \"Jehovah\". COTEXT's voice says Adonai (☰ > Settings can make it Yahweh).",
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
  lemmaEl.textContent = String (lex?.lemma ?? w.text);
  lemmaEl.dir = hebrew ? "rtl" : "ltr";
  formEl.textContent = w.text;
  formEl.dir = lemmaEl.dir;
  // The word as written left out when it's the dictionary form itself (λόγος, בֵּן): one line, Close beside I know
  // this word; otherwise Close on the word's line.
  const one = bare (w.text) === bare (lemmaEl.textContent ?? "");
  formEl.parentElement!.hidden = one;
  const note = NAME_NOTE[w.strong.match (/^H\d+/)?.[0] ?? ""];
  nameNote.textContent = note ?? "";
  nameNote.hidden = ! note;
  // (One line: the buttons Close, I know this word, + My vocab from the right - .btns.rev, so + My vocab is the one to
  // wrap onto a second line on a narrow screen, Close staying beside I know this word.)
  const btns = knowIt.parentElement!, add = document.getElementById ("addVocab")!;
  if (one) { btns.prepend (closeBtn, knowIt); btns.classList.add ("rev"); }
  else { btns.append (add, knowIt); formEl.parentElement!.after (closeBtn); btns.classList.remove ("rev"); }
  showParsing (fullEl, String (parsing?.spelled ?? ""), parsing?.terms as string | null, hebrew);     // (Its terms tappable: grammar.ts)
  entry = { concise: String (lex?.concise || lex?.gloss || ""), full: String (lex?.entry || lex?.gloss || ""), hebrew };
  showEntry (false);
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
