// The word's panel: a sheet from the bottom when a word is tapped - its dictionary form, its parsing spelled out
// ("Qal perfect, 3rd masculine singular" - each term a grammar explains tappable, its section opening below: grammar.ts)
// and its entry in the brief lexicon (TBESH for Hebrew, TBESG for Greek -
// STEPBible's, keyed by the same extended Strong's as the text). "+ My vocab" adds it to the words being learned (vocab.ts); "+ Known words" marks the word known
// (helps.ts: its gloss hidden, every form of it, everywhere; ✓ In known words, tapped again, takes it off); the meaning to learn (the vocab gloss: a line under the dictionary form, over + My vocab, always shown); the entry as LEXICON picks it - the brief lexicon (at first) or a fuller lexicon's (Hebrew: Brown-Driver-Briggs, the UBS Dictionary of Biblical Hebrew, Jastrow, Klein; Greek: Abbott-Smith, Thayer, the Middle Liddell, Liddell-Scott-Jones, Dodson, the UBS Dictionary of the Greek New Testament - the UBS ones marking the sense used here); the word as written (shown even when it's the dictionary form itself; ✕ frozen at the panel's upper right while the rest scrolls), then its dictionary form (with + Known words), each with a speaker that says it (audio.ts) - a verb's with "Verb chart" beside it, opening the chart on that verb at its stem (chart.ts). ✕ (or tapping the word again) hides it.
// Two of them, each its own: #sheet for a word of the text read, above the notes panel, and a second (cloned from
// #sheet's markup, under the notes, just above the play bar) for a word of the notes' Hebrew OT beside the Septuagint
// (interlinear.ts) - so a Greek word and the Hebrew it translates can be open at once. makePanel builds one on its
// root, its elements found by class within it; the lexicons' choice, files and the main database are shared.

import { openNotesDb, type Db } from "./db";
import type { Word } from "./reader";
import { onHelpsChange, knownWords, setKnown, unsetKnown } from "./helps";
import { sayText, sayWord } from "./audio";
import { grammarIn } from "./grammar";
import { vocabButton } from "./vocab";
import { chartStemOf, openChartFor } from "./chart";

// The entry, as LEXICON picks it (a picker as GRAMMAR's, over the entry): the STEPBible brief lexicon, or a fuller
// lexicon that has the word - (Hebrew)
// Brown-Driver-Briggs, the UBS Dictionary of Biblical Hebrew, Jastrow, Klein; (Greek) Abbott-Smith, Thayer, the Middle
// Liddell, Liddell-Scott-Jones, Dodson, the UBS Dictionary of the Greek New Testament - each fuller one's entry (or entries, where it splits
// the Strong's number or has homographs) with its credit under it. The choice is kept on the device per language (the
// brief one at first; "concise", the vocab gloss once picked here, now the brief one too); a word the lexicon picked
// lacks opens the brief one. Each fuller lexicon's entries are their
// own file (data/notes/<id>.db: pipeline/bdb.py, greek_lex.py, lsj.py, ubs_lex.py, sefaria_lex.py), downloaded the first time
// it's shown and kept (db.ts: openNotesDb); its file and version in the main database's table named here (table).
/** The fuller lexicons, in the picker's order: their names (and the short one their loading says), credits, and the
 *  main database's table holding their file (each also has its words' entries: bdb, greek_lex, ubs_lex, sefaria_lex). */
const LEXICONS: Record<string, { name: string; short: string; credit: string; table: string }> = {
  bdb: { name: "Brown-Driver-Briggs", short: "BDB", table: "bdb_file",
         credit: "Brown-Driver-Briggs (1906), public domain; text from Open Scriptures' HebrewLexicon (CC BY 4.0), still being transcribed." },
  ubs_he: { name: "UBS Dictionary of Biblical Hebrew", short: "UBS", table: "ubs_lex_file",
            credit: "UBS Dictionary of Biblical Hebrew © United Bible Societies, 2026. Adapted from Semantic Dictionary of Biblical Hebrew © 2000-2026 United Bible Societies. CC BY-SA 4.0." },
  jastrow: { name: "Jastrow", short: "Jastrow", table: "sefaria_lex_file",
             credit: "Jastrow, A Dictionary of the Targumim, the Talmud Babli and Yerushalmi, and the Midrashic Literature (1903), public domain; text from Sefaria." },
  klein: { name: "Klein (etymology)", short: "Klein", table: "sefaria_lex_file",
           credit: "Klein, A Comprehensive Etymological Dictionary of the Hebrew Language for Readers of English (Carta Jerusalem, 1987); text from Sefaria, CC BY-NC - for non-commercial use only." },
  abbott: { name: "Abbott-Smith", short: "Abbott-Smith", table: "greek_lex_file",
            credit: "Abbott-Smith, A Manual Greek Lexicon of the New Testament (1922), public domain; text from the Abbott-Smith TEI project (translatable-exegetical-tools)." },
  thayer: { name: "Thayer", short: "Thayer", table: "greek_lex_file",
            credit: "Thayer, A Greek-English Lexicon of the New Testament (1889), public domain; text from Every Promise's edition (CC0)." },
  ml: { name: "Liddell & Scott (Intermediate)", short: "Liddell & Scott", table: "greek_lex_file",
        credit: "Liddell and Scott, An Intermediate Greek-English Lexicon (1889). Text provided by Perseus Digital Library, with funding from The Annenberg CPB/Project (CC BY-SA 3.0 US)." },
  lsj: { name: "Liddell-Scott-Jones (LSJ)", short: "LSJ", table: "greek_lex_file",
         credit: "Liddell, Scott, Jones and McKenzie, A Greek-English Lexicon (9th ed., 1940). Text provided by the Perseus Digital Library (perseus.tufts.edu; github.com/PerseusDL/lexica), CC BY-SA 4.0." },
  dodson: { name: "Dodson", short: "Dodson", table: "greek_lex_file",
            credit: "Dodson, A Greek-English Lexicon of the New Testament (2010), public domain; text from Biblical Humanities (CC0)." },
  ubs_gr: { name: "UBS Dictionary of the Greek NT (Louw-Nida)", short: "UBS", table: "ubs_lex_file",
            credit: "UBS Dictionary of New Testament Greek, © United Bible Societies, 2023. Adapted from Semantic Dictionary of Biblical Greek: © United Bible Societies 2018-2023, which is adapted from Greek-English Lexicon of the New Testament: Based on Semantic Domains, Eds. J P Louw, Eugene Albert Nida © United Bible Societies 1988, 1989. CC BY-SA 4.0." },
};
const LEX_KEY = { H: "cotext.lexicon", G: "cotext.lexicon.greek" };     // (Hebrew's key as it always was)
const lexChoice = { H: "full", G: "full" };     // (Picked per language: full - the brief lexicon - or an id above)
for (const l of ["H", "G"] as const) try { lexChoice[l] = localStorage.getItem (LEX_KEY[l]) ?? "full"; } catch { /* private mode */ }
let mainDb: Db | null = null;
const lexDbs: Record<string, Promise<Db>> = {};     // (Each lexicon's file, once opened)

// The second panel: #sheet's markup as the page has it (before makePanel below changes it), under the notes panel.
const textSheet = document.getElementById ("sheet")!;
const besideSheet = textSheet.cloneNode (true) as HTMLElement;
besideSheet.id = "besideSheet";
document.getElementById ("notesCol")!.append (besideSheet);     // (Under the notes: in their column when wide, layout.ts)

/** A word's panel on its root element (#sheet or its clone): show (a word tapped; the same word again hides it) and hide. */
function makePanel (sheet: HTMLElement) {
  const q = <T extends HTMLElement = HTMLElement> (c: string) => sheet.querySelector<T> ("." + c)!;
  const grammar = grammarIn (sheet);
  const setVocabWord = vocabButton (q ("addVocab"));     // (+ My vocab: vocab.ts)

  // A verb's "Verb chart", right of its dictionary form's speaker: the chart opened on this verb at its stem.
  const chartBtn = document.createElement ("button");
  chartBtn.className = "pill"; chartBtn.textContent = "Verb chart"; chartBtn.hidden = true;
  q ("speakRoot").after (chartBtn);
  let chartFor: [string, string] | null = null;
  chartBtn.addEventListener ("click", () => { if (chartFor) openChartFor (...chartFor); });     // (The panel stays open under the chart: its ✕ back to the word)

  const lemmaEl = q ("lemmaEl");
  const formEl = q ("form");
  const fullEl = q ("full");
  // The head, top to bottom: the word as written, its English as the interlinear gives it here, its parsing spelled out,
  // then its dictionary form (the root word) with its buttons - the word repeated when it's the dictionary form itself.
  const formGloss = document.createElement ("span");
  formGloss.className = "formGloss";
  formEl.parentElement!.after (formGloss, fullEl);     // (The word as it stands in the text, before its dictionary form)
  const defEl = q ("def");
  const knowIt = q ("knowIt");
  let picked: HTMLElement | null = null;
  let pickedStrong = "";

  q ("close").addEventListener ("click", hide);
  // The panel's contents scroll inside it (.panelScroll), its ✕ row left outside, fixed in the corner (style.css).
  const sheetScroll = document.createElement ("div");
  sheetScroll.className = "panelScroll";
  { const x = sheet.querySelector (":scope > .xRow")!; sheetScroll.append (...[...sheet.children].filter ((c) => c !== x)); sheet.append (sheetScroll); }
  // Two columns where there's room: once the panel is at least twice as wide as the word's info (everything but the
  // lexicon) needs, the lexicon - its picker, entry and credit - moves to a second column beside it (.twoCol:
  // style.css). Measured at the info's natural width whenever the panel resizes or shows another word.
  const heads = q ("heads");
  { const info = document.createElement ("div");     // (The word's info in one box, the lexicon's parts in another: the two columns)
    info.className = "infoBox";
    heads.before (info);
    info.append (heads);
    const box = document.createElement ("div");
    box.className = "lexBox";
    info.after (box);
    box.append (q ("lexRow"), defEl, q ("lexCredit")); }
  const columns = () => {
    if (sheet.hidden) return;
    sheet.classList.remove ("twoCol");
    heads.style.width = "max-content";
    fullEl.style.width = "min-content";     // (The parsing may wrap at its commas: its widest part counts, not its whole line)
    const need = heads.getBoundingClientRect ().width;
    heads.style.width = ""; fullEl.style.width = "";
    sheet.classList.toggle ("twoCol", sheetScroll.clientWidth >= 2 * need);
  };
  new ResizeObserver (columns).observe (sheet);
  knowIt.addEventListener ("click", () => (knownWords ().includes (pickedStrong) ? unsetKnown : setKnown) (pickedStrong));
  q ("speakBtn").addEventListener ("click", () => { if (picked) sayWord (picked); });
  q ("speakRoot").addEventListener ("click", () => sayText (lemmaEl.textContent ?? ""));     // (The dictionary form)
  // + KNOWN WORDS: the word known by hand (its gloss hidden everywhere) - then ✓ IN KNOWN WORDS, tapped again taken off.
  const label = () => { knowIt.textContent = knownWords ().includes (pickedStrong) ? "✓ In known words" : "+ Known words"; };
  onHelpsChange (() => { if (picked) label (); });

  // The vocab gloss - the meaning to learn, a few words (build_db.py's concise()) - always shown, on its own line under the
  // dictionary form, above + My vocab and + Known words.
  const vocabGloss = document.createElement ("div");
  vocabGloss.className = "vocabGloss";
  sheet.querySelector (".heads > .btns")!.before (vocabGloss);

  // LEXICON (the comment over LEXICONS): this panel's picker and the entry it shows.
  const lexCredit = q ("lexCredit");
  const lexPick = q<HTMLSelectElement> ("lexPick");
  const lang = () => entry.hebrew ? "H" : "G";
  lexPick.addEventListener ("change", () => {
    lexChoice[lang ()] = lexPick.value;
    try { localStorage.setItem (LEX_KEY[lang ()], lexPick.value); } catch { /* private mode: not kept */ }
    showEntry (lexPick.value);
  });
  type Shown = "full" | string;     // (string: a fuller lexicon's id)
  // (extra: each fuller lexicon with an entry for the word -> its entry ids, space-separated, in LEXICONS' order; place:
  // the word's book, chapter, verse and place among the verse's words shown, from 1 - the UBS dictionaries' "here")
  let entry = { full: "", extra: {} as Record<string, string>, hebrew: true, place: [0, 0, 0, 0] };
  let shown: Shown = "full";
  /** The entry LEXICON picks - the brief lexicon's or a fuller one's - its picker listing those the word
   *  has. */
  function showEntry (to: Shown) {
    shown = to;
    const extras = Object.keys (entry.extra);
    lexPick.innerHTML = `<option value="full">STEPBible (abridged ${entry.hebrew ? "BDB" : "Abbott-Smith"})</option>`
      + extras.map ((id) => `<option value="${id}">${LEXICONS[id].name}</option>`).join ("");
    lexPick.value = to;
    // The brief lexicon's entry holds only <b>, <i> and <br> (pipeline/build_db.py's entry_html escapes everything
    // else); a fuller lexicon's the few tags its pipeline writes, its Hebrew and Greek styled as a grammar's (.gBody).
    const fuller = to !== "full";
    defEl.classList.toggle ("gBody", fuller);
    if (to === "full") defEl.innerHTML = entry.full;
    else showLexicon (to);
    lexCredit.hidden = ! fuller;
    if (fuller) lexCredit.textContent = LEXICONS[to].credit;
  }

  /** The word's entries in a fuller lexicon into the panel - its file loaded first if it isn't yet (its progress shown).
   *  A UBS dictionary's file also lists the senses each word uses (its "here" table: pipeline/ubs_lex.py): those of this
   *  word are moved to the top of their entry (its entry first), "Used here" before each. */
  async function showLexicon (id: string) {
    const ids = entry.extra[id].split (" "), word = picked, name = LEXICONS[id].short;
    const still = () => shown === id && picked === word;     // (Another word, another lexicon, or Less, while it loaded: left alone)
    try {
      if (! lexDbs[id]) {
        const table = LEXICONS[id].table;
        const [f] = table === "bdb_file" ? mainDb!.all ("SELECT file, version FROM bdb_file")
                                         : mainDb!.all (`SELECT file, version FROM ${table} WHERE lexicon = ?`, [id]);
        lexDbs[id] = openNotesDb (id, String (f.file), String (f.version), (p) => {
          for (const set of progress) set (id, p);
        });
        lexDbs[id].catch (() => { delete lexDbs[id]; });     // (Tried again on the next tap)
      }
      defEl.textContent = `Loading ${name}…`;
      const db = await lexDbs[id];
      if (! still ()) return;
      const byId = new Map (db.all (`SELECT id, html FROM entries WHERE id IN (${ids.map (() => "?").join (",")})`, ids)
        .map ((r) => [String (r.id), String (r.html)]));
      defEl.innerHTML = ids.map ((i) => byId.get (i) ?? "").join ("");
      if (LEXICONS[id].table === "ubs_lex_file") markUsedHere (db, ids);
    } catch {
      if (still ()) defEl.textContent = `${name} couldn't be loaded.`;
    }
  }
  // (A file's loading progress, shown in whichever panel waits for it)
  progress.push ((id, p) => { if (shown === id && picked) defEl.textContent = `Loading ${LEXICONS[id].short}… ${Math.round (p * 100)}%`; });

  /** The UBS entry's senses this word uses, moved first and labeled "Used here" (pipeline/ubs_lex.py matches each of
   *  the dictionary's references to the word in its verse it's about). */
  function markUsedHere (db: Db, ids: string[]) {
    const rows = db.all (`SELECT entry, sense FROM here WHERE book = ? AND chapter = ? AND verse = ? AND word = ?
                          AND entry IN (${ids.map (() => "?").join (",")}) ORDER BY entry, sense DESC`, [...entry.place, ...ids]);
    for (const r of rows) {
      const box = defEl.querySelector<HTMLElement> (`.lexEntry[data-entry="${r.entry}"]`);
      const sense = box?.querySelector<HTMLElement> (`.sense[data-sense="${r.sense}"]`);
      if (! box || ! sense) continue;
      const label = document.createElement ("b");
      label.textContent = "Used here: ";
      sense.prepend (label);
      box.querySelector (".sense")!.before (sense);     // (Senses in reverse, so the first used ends first)
      defEl.prepend (box);     // (Its entry first, where the word has several)
    }
  }

  function show (db: Db, w: Word, wordEl: HTMLElement) {
    if (picked === wordEl && ! sheet.hidden) { hide (); return; }
    picked?.classList.remove ("on");
    picked = wordEl;
    wordEl.classList.add ("on");
    pickedStrong = w.strong;
    label ();
    setVocabWord (w.strong);
    chartFor = w.stem && chartStemOf (w.strong, w.code) >= 0 ? [w.strong, w.code] : null;
    chartBtn.hidden = ! chartFor;
    const hebrew = w.strong.startsWith ("H");
    const [lex] = db.all ("SELECT lemma, gloss, entry, concise FROM lexicon WHERE strong = ?", [w.strong]);
    const [parsing] = db.all ("SELECT spelled, terms FROM parsings WHERE morph = ?", [w.morph]);
    // (The fuller lexicons with an entry for the word, in LEXICONS' order)
    const tables = hebrew ? ["SELECT 'bdb' AS lexicon, entries FROM bdb WHERE strong = ?", "SELECT lexicon, entries FROM ubs_lex WHERE strong = ?",
                              "SELECT lexicon, entries FROM sefaria_lex WHERE strong = ?"]
                           : ["SELECT lexicon, entries FROM greek_lex WHERE strong = ?", "SELECT lexicon, entries FROM ubs_lex WHERE strong = ?"];
    const extraRows = tables.flatMap ((q) => { try { return db.all (q, [w.strong]); } catch { return []; } });     // (A database built without a lexicon's tables: that lexicon not offered)
    const extra: Record<string, string> = {};
    for (const id of Object.keys (LEXICONS)) {
      const r = extraRows.find ((r) => r.lexicon === id);
      if (r) extra[id] = String (r.entries);
    }
    mainDb = db;
    lemmaEl.textContent = String (lex?.lemma ?? w.text);
    lemmaEl.dir = hebrew ? "rtl" : "ltr";
    formEl.textContent = w.text;
    formEl.dir = lemmaEl.dir;
    formGloss.textContent = w.gloss ?? "";
    grammar.showParsing (fullEl, String (parsing?.spelled ?? ""), parsing?.terms as string | null, hebrew);     // (Its terms tappable: grammar.ts)
    vocabGloss.textContent = String (lex?.concise || lex?.gloss || "");
    entry = { full: String (lex?.entry || lex?.gloss || ""),
              extra, hebrew, place: [w.book, w.chapter, w.verse, w.word] };     // (Where the word stands: the reader's text, or one beside it in the notes)
    const pick = lexChoice[hebrew ? "H" : "G"];
    showEntry (extra[pick] ? pick : "full");     // (The lexicon picked; one lacking the word - or "concise", from before: the brief one)
    sheet.hidden = false;
    sheetScroll.scrollTop = 0;
    columns ();
    // Keep the word in view above the panels - a word of the text read only (one in the notes panel stays where it is).
    const main = wordEl.closest ("main");
    if (main) requestAnimationFrame (() => {
      const over = wordEl.getBoundingClientRect ().bottom - main.getBoundingClientRect ().bottom + 12;
      if (over > 0) main.scrollBy ({ top: over, behavior: "smooth" });     // (main scrolls: style.css)
    });
  }

  function hide () {
    sheet.hidden = true;
    grammar.hideGrammar ();
    picked?.classList.remove ("on");
    picked = null;
  }

  return { show, hide };
}
const progress: ((id: string, p: number) => void)[] = [];     // (Every panel's: a lexicon file's loading progress)

const textPanel = makePanel (textSheet), besidePanel = makePanel (besideSheet);
/** A word of the text read tapped (main.ts): the first panel, above the notes. */
export const showPanel = textPanel.show, hidePanel = textPanel.hide;
/** A word of the notes panel's Hebrew OT tapped (interlinear.ts): the second panel, under the notes. */
export const showBesidePanel = besidePanel.show, hideBesidePanel = besidePanel.hide;
