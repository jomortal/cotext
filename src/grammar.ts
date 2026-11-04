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
let grammars: { id: string; name: string; lang: string }[] = [];
const mapped = new Map<string, Set<string>> ();     // grammar -> the term keys it has a section for
const all: { setLang: (l: Lang) => void; repick: (l: Lang) => void }[] = [];     // (Every panel's: GRAMMAR follows the text, a choice every panel)

export function initGrammar (theDb: Db) {
  db = theDb;
  grammars = db.all ("SELECT id, name, lang FROM grammars ORDER BY rowid")     /* (the pipeline's order: a language's first is the default) */ as unknown as typeof grammars;
}

/** The grammar choice follows the text: Hebrew grammars for the OT, Greek for the NT and the Septuagint. */
export function setGrammarTestament (t: Testament) { for (const g of all) g.setLang (t === "OT" ? "H" : "G"); }

function current (lang: Lang): string {
  const mine = grammars.filter ((g) => g.lang === lang);
  return mine.find ((g) => g.id === picked[lang])?.id ?? mine[0]?.id ?? "";
}

function keysOf (grammar: string): Set<string> {
  let k = mapped.get (grammar);
  if (! k) {
    k = new Set (db.all ("SELECT DISTINCT key FROM grammar_terms WHERE grammar = ?", [grammar]).map ((r) => String (r.key)));
    mapped.set (grammar, k);
  }
  return k;
}

/** A word's panel's grammar (sheet: the panel's root; its elements found by class within it): showParsing writes the
 *  parsing's terms in, a term tapped opens its section over the word's info; hideGrammar closes it. */
export function grammarIn (sheet: HTMLElement) {
  const q = <T extends HTMLElement = HTMLElement> (c: string) => sheet.querySelector<T> ("." + c)!;
  const pick = q<HTMLSelectElement> ("grammarPick");
  const box = q ("gInline"), titleEl = q ("gTitle"), secEl = q ("giSec"), bodyEl = q ("giBody"), scroll = q ("giScroll");
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
    pick.closest ("label")!.hidden = pick.options.length < 2;     // (One grammar for the language: nothing to pick)
    pick.value = current (lang);
  }

  /** Writes the spelled-out parsing into `el`, each term the chosen grammar explains a tappable span. `terms`: the
   *  parsing's JSON [[start, end, key], ...]. Any section open from the word before is closed. */
  function showParsing (el: HTMLElement, spelled: string, terms: string | null, hebrew: boolean) {
    shown = [el, spelled, terms, hebrew];
    hideGrammar ();
    el.textContent = "";
    if (lang !== (hebrew ? "H" : "G")) setLang (hebrew ? "H" : "G");
    const g = current (lang);
    const keys = keysOf (g);
    let at = 0;
    for (const [a, b, key] of JSON.parse (terms || "[]") as [number, number, string][]) {
      if (! keys.has (key) || a < at) continue;
      el.append (spelled.slice (at, a));
      const s = document.createElement ("span");
      s.className = "term";
      s.dataset.key = key;
      s.textContent = spelled.slice (a, b);
      s.addEventListener ("click", () => openSection (g, key, s));
      el.append (s);
      at = b;
    }
    el.append (spelled.slice (at));
  }

  /** The key's sections in the grammar, over the word's info: the first section's heading as the title, the § numbers
   *  ("Gesenius §§44, 106"), then the text - each section's number (and its heading, where it changes) before it when
   *  there's more than one. */
  function openSection (grammar: string, key: string, term: HTMLElement) {
    const parts = db.all ("SELECT first, last FROM grammar_terms WHERE key = ? AND grammar = ? ORDER BY part", [key, grammar]);
    const blocks: string[] = [], labels: string[] = [];
    let title = "", count = 0, lastHeading = "";
    for (const p of parts) {
      const rows = db.all ("SELECT label, heading, body FROM grammar_sections WHERE grammar = ? AND seq BETWEEN ? AND ? ORDER BY seq",
                           [grammar, Number (p.first), Number (p.last)]);
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
    if (! blocks.length) return;
    openKey = key;
    const name = grammars.find ((g) => g.id === grammar)?.name ?? grammar;
    titleEl.textContent = title;
    secEl.textContent = labels.length ? `${name} ${count > 1 ? "§§" : "§"}${labels.join (", ")}` : name;
    // (The bodies are the pipeline's own light HTML: <p>, <b>, <i>, tables and script spans, text escaped.)
    bodyEl.innerHTML = blocks.join ("");
    bodyEl.classList.toggle ("one", count === 1);
    box.hidden = false;
    for (const t of sheet.querySelectorAll (".term")) t.classList.toggle ("on", t === term);
    sheet.classList.add ("grammarOpen");     // (The section takes the word's panel over - style.css - until its ✕)
    sheet.scrollTop = 0;
    scroll.scrollTop = 0;     // (The section scrolls on its own, under GRAMMAR: style.css)
  }

  function hideGrammar () {
    box.hidden = true;
    sheet.classList.remove ("grammarOpen");     // (The word's info back)
    openKey = "";
    for (const t of sheet.querySelectorAll (".term.on")) t.classList.remove ("on");
  }

  all.push ({ setLang, repick });
  return { showParsing, hideGrammar };
}

const esc = (s: string) => s.replace (/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
