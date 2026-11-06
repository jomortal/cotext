// Grammar from the word's panel (design/mock-hebrew.html): each term of the spelled-out parsing that a section explains
// (Qal, perfect, 3rd masculine singular...) is tappable; tapped, that section takes the word's panel over (the word's
// info hidden) - its heading, the grammar and §, its text (a term taught in several sections: each folded, sectionHtml); its ✕ closes it, the word's info back. The terms and their sections come
// from the database (pipeline/grammar.py: parsings.terms, grammar_terms, grammar_sections); which grammar is read is
// GRAMMAR in the grammar section's box (shown once a term is tapped), the choices per language (Hebrew: Gesenius, unfoldingWord; Greek: Machen, Smyth,
// unfoldingWord - the list is the grammars table's, in its order, the first the default, so another grammar there is simply
// another choice), kept on the device. A grammar without section numbers (unfoldingWord's: a page per topic) shows no §.
// Each word's panel has its own (panel.ts makes two: grammarIn, on the panel's root), each with its own GRAMMAR, the
// choice shared.

import type { Testament } from "./study";
import type { Db, Row } from "./db";

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
  folding (bodyEl);
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

/** A grammar section as every screen shows it (the word panel's GRAMMAR, the Resource reader's grammars, ☰ Learn's READ
 *  THE GRAMMAR), condensed - folded as the church fathers' notes are (notes.ts' foldedNote: the same row, .hit): a row
 *  of its § (and its heading, where named: one no other section beside it shares) over a line of its text, cut short;
 *  tapped, its text opens under the row (the line hidden), tapped again it folds (folding). open: shown open at first
 *  (a section shown alone). The text in a .gSec of its own (a resource's reading text, .readText: the serif, larger -
 *  style.css; data-seq its grammar_sections seq, where the row has it - Learn's SHOW IN THE GRAMMAR finds it by that):
 *  the pipeline's own light HTML (<p>, <b>, <i>, tables and script spans, text escaped). */
export function sectionHtml (r: Row, open: boolean, named: boolean): string {
  const body = String (r.body), seq = r.seq != null ? ` data-seq="${Number (r.seq)}"` : "";
  const name = r.label ? `§${esc (String (r.label))}` + (named ? ` · ${esc (String (r.heading))}` : "") : esc (String (r.heading));
  // (The line: the text's first words, its tags taken off - its entities kept, a cut one dropped; style.css cuts it to a line)
  const line = body.replace (/<[^>]+>/g, " ").replace (/\s+/g, " ").trim ().slice (0, 200).replace (/&[^;\s]*$/, "");
  return `<div class="fold"><button type="button" class="hit" aria-expanded="${open}"><span class="src">${name}</span>`
       + `<span class="hitText dictLine"${open ? " hidden" : ""}>${line}</span></button>`
       + `<div class="gSec readText dictBody"${seq}${open ? "" : " hidden"}>${body}</div></div>`;
}

/** A unit folded to a row as sectionHtml's (the Resource reader's verses and articles: resreader.ts) - built as
 *  elements, its body keeping its own listeners: head the row's caption (a verse's reference, an article's title),
 *  line its text's first words (cut to a line by style.css), body what opens under the row. open: shown open. */
export function foldEl (head: string, line: string, body: HTMLElement, open = false): HTMLElement {
  const el = document.createElement ("div");
  el.className = "fold";
  el.innerHTML = `<button type="button" class="hit"><span class="src"></span><span class="hitText dictLine"></span></button>`;
  el.querySelector (".src")!.textContent = head;
  el.querySelector (".dictLine")!.textContent = line.replace (/\s+/g, " ").trim ().slice (0, 200);
  body.classList.add ("dictBody");
  el.append (body);
  setFold (el, open);
  return el;
}

/** A fold (sectionHtml's or foldEl's .fold) opened or folded. */
export function setFold (fold: Element, open: boolean) {
  fold.querySelector (":scope > .dictBody")!.toggleAttribute ("hidden", ! open);
  fold.querySelector (":scope > .hit > .dictLine")!.toggleAttribute ("hidden", open);
  fold.querySelector (":scope > .hit")!.setAttribute ("aria-expanded", String (open));
}

/** The folds' rows in el made to open and fold when tapped (once per container: one listener for every row). */
export function folding (el: HTMLElement) {
  el.addEventListener ("click", (e) => {
    const row = (e.target as Element).closest (".fold > .hit");
    if (row && el.contains (row)) setFold (row.parentElement!, row.getAttribute ("aria-expanded") !== "true");
  });
}

/** A grammar's sections read in order - ranges of seqs, [first, last] each (grammar_sections) - as the word's panel and
 *  ☰ Learn (learn.ts) show them: the first section's heading as the title, each range's § numbers ("43–44"), how many
 *  sections, and their HTML - each section folded (sectionHtml; one alone, open), its heading named in its row where
 *  no section beside it shares it, else (several under one heading) the heading over them where it changes. */
export async function readSections (grammar: string, ranges: [number, number][]) {
  const sections = await Promise.all (ranges.map (([first, last]) => db.all ("SELECT seq, label, heading, body FROM grammar_sections WHERE grammar = ? AND seq BETWEEN ? AND ? ORDER BY seq",
                                                                             [grammar, first, last])));
  const labels: string[] = [];
  for (const rows of sections) if (rows.length && rows[0].label) labels.push (rows.length > 1 ? `${rows[0].label}–${rows[rows.length - 1].label}` : String (rows[0].label));
  const all = sections.flat (), count = all.length, title = all.length ? String (all[0].heading) : "";
  const blocks = all.map ((r, k) => {
    const h = r.heading, shared = all[k - 1]?.heading === h || all[k + 1]?.heading === h;
    const head = shared && k > 0 && all[k - 1].heading !== h ? `<div class="gHead">${esc (String (h))}</div>` : "";
    return head + sectionHtml (r, count === 1, ! shared && count > 1);
  });
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
