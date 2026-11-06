// Grammar from the word's panel (design/mock-hebrew.html): each term of the spelled-out parsing that a section explains
// (Qal, perfect, 3rd masculine singular...) is tappable; tapped, that section takes the word's panel over (the word's
// info hidden) - its heading, the grammar and §, its text; its ✕ closes it, the word's info back. The terms and their sections come
// from the database (pipeline/grammar.py: parsings.terms, grammar_terms, grammar_sections); which grammar is read is
// GRAMMAR in the grammar section's box (shown once a term is tapped), the choices per language (Hebrew: Gesenius, unfoldingWord; Greek: Machen, Smyth,
// unfoldingWord - the list is the grammars table's, in its order, the first the default, so another grammar there is simply
// another choice), kept on the device. A grammar without section numbers (unfoldingWord's: a page per topic) shows no §.
// Each word's panel has its own (panel.ts makes two: grammarIn, on the panel's root), each with its own GRAMMAR, the
// choice shared.

import type { Testament } from "./study";
import type { Db } from "./db";

type Lang = "H" | "G";
const KEY = "cotext.grammar";
const picked: Record<string, string> = {};
try { Object.assign (picked, JSON.parse (localStorage.getItem (KEY) ?? "{}")); } catch { /* none kept, or private mode */ }

let db: Db;
let grammars: { id: string; name: string; lang: string; credit: string }[] = [];
const mapped = new Map<string, Set<string>> ();     // grammar -> the term keys it has a section for (initGrammar)
const all: { setLang: (l: Lang) => void; repick: (l: Lang) => void }[] = [];     // (Every panel's: GRAMMAR follows the text, a choice every panel)

/** Reads the grammars and the terms each explains (once, at the start: a parsing's links are drawn at once). */
export async function initGrammar (theDb: Db) {
  db = theDb;
  const [gs, terms] = await Promise.all ([
    db.all ("SELECT id, name, lang, credit FROM grammars ORDER BY rowid"),     /* (the pipeline's order: a language's first is the default) */
    db.all ("SELECT DISTINCT grammar, key FROM grammar_terms")]);
  grammars = gs as unknown as typeof grammars;
  for (const r of terms) {
    if (! mapped.has (String (r.grammar))) mapped.set (String (r.grammar), new Set ());
    mapped.get (String (r.grammar))!.add (String (r.key));
  }
}

/** The grammar choice follows the text: Hebrew grammars for the OT, Greek for the NT and the Septuagint. */
export function setGrammarTestament (t: Testament) { for (const g of all) g.setLang (t === "OT" ? "H" : "G"); }

function current (lang: Lang): string {
  const mine = grammars.filter ((g) => g.lang === lang);
  return mine.find ((g) => g.id === picked[lang])?.id ?? mine[0]?.id ?? "";
}

const keysOf = (grammar: string): Set<string> => mapped.get (grammar) ?? new Set ();

/** A word's panel's grammar (sheet: the panel's root; its elements found by class within it): showParsing writes the
 *  parsing's terms in, a term tapped opens its section over the word's info; hideGrammar closes it. */
export function grammarIn (sheet: HTMLElement) {
  const q = <T extends HTMLElement = HTMLElement> (c: string) => sheet.querySelector<T> ("." + c)!;
  const pick = q<HTMLSelectElement> ("grammarPick");
  const box = q ("gInline"), titleEl = q ("title"), secEl = q ("giSec"), bodyEl = q ("giBody"), scroll = q ("giScroll");
  const otherEl = document.createElement ("div");     // (showOther's body: beside the section's, without its text styles - .gBody)
  otherEl.className = "giOther"; otherEl.hidden = true;
  bodyEl.after (otherEl);
  let lang: Lang = "H";
  let shown: Parameters<typeof showParsing> | null = null;     // (The parsing the panel shows: its links follow GRAMMAR)
  let openKey = "";     // (The term whose section is open: "" none)

  q ("giClose").addEventListener ("click", hideGrammar);
  pick.addEventListener ("change", () => {
    picked[lang] = pick.value;
    try { localStorage.setItem (KEY, JSON.stringify (picked)); } catch { /* private mode: not kept */ }
    for (const g of all) g.repick (lang);
  });
  /** The language's grammar picked (here or in the other panel): the word's parsing linked again to it, and the term
   *  open reopened in it (if it has it). */
  const repick = (l: Lang) => {
    if (l !== lang) return;
    pick.value = current (lang);
    const key = openKey;
    if (shown) showParsing (...shown);
    if (key) (shown?.[0].querySelector<HTMLElement> (`.term[data-key="${key}"]`))?.click ();
  };

  /** GRAMMAR's choices for a language: the text's, or a tapped word's own (a Hebrew word beside the Septuagint: the
   *  notes panel's Hebrew OT). */
  function setLang (l: Lang) {
    lang = l;
    pick.replaceChildren (...grammars.filter ((g) => g.lang === lang).map ((g) => new Option (g.name, g.id)));
    showPick ();
    pick.value = current (lang);
  }
  const showPick = () => { pick.closest ("label")!.hidden = pick.options.length < 2; };     // (One grammar for the language: nothing to pick)

  /** Writes the spelled-out parsing into `el`, each term the chosen grammar explains a tappable span. `terms`: the
   *  parsing's JSON [[start, end, key], ...]. Any section open from the word before is closed. */
  function showParsing (el: HTMLElement, spelled: string, terms: string | null, hebrew: boolean) {
    shown = [el, spelled, terms, hebrew];
    hideGrammar ();
    el.textContent = "";
    if (lang !== (hebrew ? "H" : "G")) setLang (hebrew ? "H" : "G");
    const g = current (lang);
    const keys = keysOf (g);
    // Each comma's part its own unbreakable span (.seg: style.css), so the line wraps only after a comma or before a bracket ("Qal perfect, /
    // 3rd masculine singular") - and the panel's two-column test (panel.ts) can measure the widest part.
    let seg = document.createElement ("span");
    seg.className = "seg";
    el.append (seg);
    // (After a comma or a +, or before a bracket: "Hiphil wayyiqtol / (sequential imperfect),") - inside a term too: a term
    // across a break is a span on each side, each opening its section)
    const text = (t: string, term?: (piece: string) => Node) => t.split (/(?<=,) | (?=\()|(?<= \+) /).forEach ((piece, i) => {
      if (i) { el.append (" "); seg = document.createElement ("span"); seg.className = "seg"; el.append (seg); }
      seg.append (term ? term (piece) : piece);
    });
    let at = 0;
    for (const [a, b, key] of JSON.parse (terms || "[]") as [number, number, string][]) {
      if (! keys.has (key) || a < at) continue;
      text (spelled.slice (at, a));
      text (spelled.slice (a, b), piece => {
        const s = document.createElement ("span");
        s.className = "term";
        s.dataset.key = key;
        s.textContent = piece;
        s.addEventListener ("click", () => openSection (g, key, s));
        return s; });
      at = b;
    }
    text (spelled.slice (at));
  }

  /** The key's sections in the grammar, over the word's info: the first section's heading as the title, the § numbers
   *  ("Gesenius §§44, 106"), then the text (readSections). */
  async function openSection (grammar: string, key: string, term: HTMLElement) {
    const parts = await db.all ("SELECT first, last FROM grammar_terms WHERE key = ? AND grammar = ? ORDER BY part", [key, grammar]);
    const { title, labels, count, html } = await readSections (grammar, parts.map ((p) => [Number (p.first), Number (p.last)]));
    if (! term.isConnected) return;     // (Another word shown while they were read)
    if (! count) return;
    openKey = key;
    titleEl.textContent = title;
    secEl.textContent = sectionCaption (grammar, labels, count);
    bodyEl.innerHTML = html;
    bodyEl.classList.toggle ("one", count === 1);
    showPick ();
    bodyEl.hidden = false; otherEl.hidden = true; otherEl.replaceChildren ();
    box.classList.remove ("other");
    box.hidden = false;
    for (const t of sheet.querySelectorAll<HTMLElement> (".term")) t.classList.toggle ("on", t.parentElement?.parentElement === term.parentElement?.parentElement && t.dataset.key === term.dataset.key);     // (Every piece of the tapped term)
    sheet.classList.add ("grammarOpen");     // (The section takes the word's panel over - style.css - until its ✕)
    sheet.scrollTop = 0;
    scroll.scrollTop = 0;     // (The section scrolls on its own, under GRAMMAR: style.css)
  }

  /** Something else in the same box, over the word's info as a section is (the word's Verb chart: chart.ts' chartInto;
   *  a dictionary article: dictionary.ts) - its title, `sub` under it where given (as a section's grammar and §: the
   *  dictionary's name), no GRAMMAR, `fill` writing its body (its own box, not the section's); the same ✕ back to the word. */
  function showOther (title: string, fill: (body: HTMLElement) => void, sub = "") {
    openKey = "";
    for (const t of sheet.querySelectorAll (".term.on")) t.classList.remove ("on");
    titleEl.textContent = title;
    secEl.textContent = sub;
    bodyEl.hidden = true; otherEl.hidden = false; otherEl.replaceChildren ();
    pick.closest ("label")!.hidden = true;
    fill (otherEl);
    box.classList.add ("other");     // (Its heading in GRAMMAR's row: style.css)
    box.hidden = false;
    sheet.classList.add ("grammarOpen");
    sheet.scrollTop = 0;
    scroll.scrollTop = 0;
  }

  function hideGrammar () {
    box.hidden = true;
    sheet.classList.remove ("grammarOpen");     // (The word's info back)
    openKey = "";
    for (const t of sheet.querySelectorAll (".term.on")) t.classList.remove ("on");
  }

  all.push ({ setLang, repick });
  return { showParsing, hideGrammar, showOther };
}

/** A grammar's sections read in order - ranges of seqs, [first, last] each (grammar_sections) - as the word's panel and
 *  ☰ Learn (learn.ts) show them: the first section's heading as the title, each range's § numbers ("43–44"), how many
 *  sections, and their text as HTML - each section's number (and its heading, where it changes) before it; with one
 *  section, style.css hides the number (.gBody.one: it's in the caption). The bodies are the pipeline's own light HTML
 *  (<p>, <b>, <i>, tables and script spans, text escaped). */
export async function readSections (grammar: string, ranges: [number, number][]) {
  const sections = await Promise.all (ranges.map (([first, last]) => db.all ("SELECT label, heading, body FROM grammar_sections WHERE grammar = ? AND seq BETWEEN ? AND ? ORDER BY seq",
                                                                             [grammar, first, last])));
  const blocks: string[] = [], labels: string[] = [];
  let title = "", count = 0, lastHeading = "";
  for (const rows of sections) {
    if (! rows.length) continue;
    title ||= String (rows[0].heading);
    if (rows[0].label) labels.push (rows.length > 1 ? `${rows[0].label}–${rows[rows.length - 1].label}` : String (rows[0].label));
    count += rows.length;
    for (const r of rows) {
      const head = r.heading !== lastHeading && blocks.length ? `<div class="gHead">${esc (String (r.heading))}</div>` : "";
      lastHeading = String (r.heading);
      const num = r.label ? `<b class="gNum">§${esc (String (r.label))}</b>` : "";     // (Run into its first paragraph)
      const body = String (r.body);
      blocks.push (head + (body.startsWith ("<p>") ? "<p>" + num + body.slice (3) : num + body));
    }
  }
  return { title, labels, count, html: blocks.join ("") };
}

/** The caption under a section's title: the grammar's name and its § numbers ("Gesenius §§43–44"; a book without
 *  numbers, its name alone). */
export function sectionCaption (grammar: string, labels: string[], count: number) {
  const name = grammars.find ((g) => g.id === grammar)?.name ?? grammar;
  return labels.length ? `${name} ${count > 1 ? "§§" : "§"}${labels.join (", ")}` : name;
}

/** A grammar's credit line (the grammars table's), as the screens that quote it show it. */
export const grammarCredit = (grammar: string) => grammars.find ((g) => g.id === grammar)?.credit ?? "";

const esc = (s: string) => s.replace (/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
