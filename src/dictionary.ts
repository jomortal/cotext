// The Tyndale Open Bible Dictionary (pipeline/tyndale_dict.py: its matching rules and its file), linked to the text
// both ways and searchable:
// - BY WORD: the word's panel's "Dictionary" (panel.ts) - the articles on the tapped word's root, opened over the
//   word's info as the Verb chart is (grammar.ts' showOther: titled, its ✕ back to the word). The articles matching
//   the word itself first (a person, a place, a thing or a term: its gloss or name), then those of its subject (the
//   UBS dictionaries' semantic domains: ἀρνίον "lamb" -> Ram, Sheep). One article: shown at once; several: a choice
//   of their titles first, the subject's under BY SUBJECT.
// - BY PASSAGE: "Tyndale Bible Dictionary" in the notes' picker (notes.ts, its own DICTIONARY group): for each verse
//   the notes show, the articles citing it (its verse index: every scripture reference of every article), most
//   relevant first, then those its words lead to (BY WORD, above) - each its title over a line of its text (entry).
// - SEARCHABLE: the dictionary in the search pane's picker (search.ts): the articles whose title or text has the
//   typed text, each its title over the stretch that matched (entry).
// An entry tapped opens its article under it, in place - the notes' and the search's alike; tapped again, it closes.
// Wherever an article shows (the word's panel too), its scripture references (underlined) go to the verse in the text
// and a cross-reference opens the article it names - in the word's panel in its place, in a list's entry in that
// entry's place. The file, data/notes/tobd.db, is listed in the main database's note_sources (kind 'dictionary');
// it's downloaded the first time it's needed (a word tapped, to know whether it has an article) and kept (db.ts'
// openNotesDb).

import { openNotesDb, type Db, type Row } from "./db";

const NAME = "Tyndale Open Bible Dictionary";
let file: Promise<Db | null> | null = null;     // (The dictionary's file, once opened; null: none in this database)
let credit = "";
let goVerse: (book: number, chapter: number, verse: number) => void = () => {};

/** main.ts: how a scripture reference in an article goes to its verse (book: the database's id). */
export function initDictionary (go: (book: number, chapter: number, verse: number) => void) { goVerse = go; }

/** The dictionary's file - opened (downloaded the first time) on the first call; null when the database lists none. A
 *  failed download is tried again on the next call. onProgress: the download's fraction (the search's "Loading…"). */
export function dictionary (main: Db, onProgress: (fraction: number) => void = () => {}): Promise<Db | null> {
  file ??= main.all ("SELECT file, version, credit FROM note_sources WHERE id = 'tobd'").then (([r]) => {
    if (! r) return null;
    credit = String (r.credit);
    return openNotesDb ("tobd", String (r.file), String (r.version), onProgress);
  });
  file.catch (() => { file = null; });
  return file;
}

/** A root's articles: those matching it exactly and those of its subject (ids, each list in the dictionary's order of
 *  relevance) - both empty when it has none. */
export interface Found { exact: string[]; subject: string[]; }
const idList = (s: unknown) => String (s ?? "").split (" ").filter (Boolean);

/** The articles on a root (its Strong's key). */
export async function articlesFor (main: Db, strong: string): Promise<Found> {
  try {
    const db = await dictionary (main);
    const [r] = db ? await db.all ("SELECT ids, subject FROM lemmas WHERE strong = ?", [strong]) : [];
    return { exact: idList (r?.ids), subject: idList (r?.subject) };
  } catch {
    return { exact: [], subject: [] };     // (Not loaded - offline the first time: no Dictionary for now)
  }
}

type ShowOther = (title: string, fill: (body: HTMLElement) => void, sub?: string) => void;
/** A title as the dictionary shows it: the source's * (a word not in the NLT) dropped. */
const plain = (title: string) => title.replace (/\*/g, "");

/** A root's articles opened in the word's panel by its showOther: the one, or the choice of them - the exact ones,
 *  then BY SUBJECT's. */
export async function openArticles (main: Db, found: Found, show: ShowOther) {
  const db = await dictionary (main);
  const all = [...found.exact, ...found.subject];
  if (! db || ! all.length) return;
  if (all.length === 1) { openArticle (main, all[0], show); return; }
  const rows = await db.all (`SELECT id, title FROM articles WHERE id IN (${all.map (() => "?").join (",")})`, all);
  const title = new Map (rows.map ((r) => [String (r.id), plain (String (r.title))]));
  show ("Dictionary", (body) => {
    for (const [list, head] of [[found.exact, ""], [found.subject, "By subject"]] as const) {
      if (! list.length) continue;
      if (head) {
        const h = document.createElement ("div");
        h.className = "src";
        h.textContent = head;
        body.append (h);
      }
      const choices = document.createElement ("div");
      choices.className = "choices";     // (The articles' titles as buttons, one a line: style.css' .giOther > .choices)
      for (const id of list) {
        if (! title.has (id)) continue;
        const b = document.createElement ("button");
        b.className = "pill";
        b.textContent = title.get (id)!;
        b.addEventListener ("click", () => openArticle (main, id, show));
        choices.append (b);
      }
      body.append (choices);
    }
  }, NAME);
}

/** One article over the word's info: its title, the dictionary's name under it, its text, its credit. */
async function openArticle (main: Db, id: string, show: ShowOther) {
  const db = await dictionary (main);
  const [r] = db ? await db.all ("SELECT title, html FROM articles WHERE id = ?", [id]) : [];
  if (! r) return;
  show (plain (String (r.title)), (body) => body.append (...articleBody (r, (other) => openArticle (main, other, show))), NAME);
}

/** An article's text (the pipeline's light HTML, styled as a grammar section: .gBody) and its credit: each scripture
 *  reference going to its verse, each cross-reference opening its article (open). */
function articleBody (r: Row, open: (id: string) => void): HTMLElement[] {
  const text = document.createElement ("div");
  text.className = "gBody";
  text.innerHTML = String (r.html);     // (The pipeline's own HTML: <p>, <b>, <i>, <sup>, tables, script spans, <a data-art> / <a data-ref>; text escaped)
  for (const a of text.querySelectorAll<HTMLElement> ("a[data-art], a[data-ref]")) {
    a.className = "term";     // (Tappable, as a parsing's terms are)
    const art = a.dataset.art, ref = a.dataset.ref?.split (".").map (Number);
    a.addEventListener ("click", () => { if (art) open (art); else if (ref) goVerse (ref[0], ref[1], ref[2]); });
  }
  const note = document.createElement ("p");
  note.className = "credit lexCredit";
  note.textContent = credit;
  return [text, note];
}

//==== ENTRIES ====
/** An article as a list's entry (the notes', the search's): a row as a search result is (.hit) - its title where a
 *  result's reference is (.src; why: what led to it, after the title) over its text (a line of the article, or what a
 *  search matched) - which, tapped, opens the article under it (and closes it again); a cross-reference in it opening
 *  that article in its place, its title over it. */
export function entry (main: Db, id: string, title: string, text: HTMLElement | string, why = ""): HTMLElement {
  const el = document.createElement ("div");
  const row = document.createElement ("button");
  row.className = "hit";
  row.setAttribute ("aria-expanded", "false");
  const head = document.createElement ("span");
  head.className = "src";
  head.textContent = plain (title);
  if (why) {
    const w = document.createElement ("span");
    w.className = "dictWhy";     // (The word as written, not in the heading's capitals)
    w.textContent = ` · ${why}`;
    head.append (w);
  }
  let line = text as HTMLElement;
  if (typeof text === "string") {
    line = document.createElement ("span");
    line.className = "hitText dictLine";     // (One line, cut: style.css)
    line.textContent = text;
  }
  row.append (head, line);
  const body = document.createElement ("div");
  body.className = "dictBody";
  body.hidden = true;
  let shown = "";
  const show = (open: boolean) => { body.hidden = ! open; row.setAttribute ("aria-expanded", String (open)); };
  const open = async (art: string) => {
    const db = await dictionary (main);
    const [r] = db ? await db.all ("SELECT title, html FROM articles WHERE id = ?", [art]) : [];
    if (! r) return;
    shown = art;
    const h = document.createElement ("div");
    h.className = "gHead";
    h.textContent = plain (String (r.title));
    body.replaceChildren (...(art !== id ? [h] : []), ...articleBody (r, open));     // (Another article, reached by a cross-reference: its title over it)
    show (true);
    if (art !== id) row.scrollIntoView ({ block: "nearest" });
  };
  row.addEventListener ("click", () => { if (! body.hidden && shown === id) show (false); else open (id); });
  el.append (row, body);
  return el;
}

//==== BY PASSAGE ====
// For a verse: the articles citing it - one citing the verse itself (alone) before one citing only a span around it,
// then the narrower first (by how many verses of the Bible the article cites); an article citing more than BROAD
// verses (David, Jesus Christ, a book's overview) after all the others that cite the verse - then the articles its
// words lead to: each word's exact ones in the verse's order, then their subjects'. An article already listed for an
// earlier verse shown isn't listed again (as a note on a range: notes.ts).
const BROAD = 1000;
export interface PassageArticle { id: string; title: string; line: string; why: string; }

/** The articles for each verse shown: places[i] the verse's places in the text ([book, chapter, verse] - beside the
 *  Septuagint, the Hebrew verses it translates); its words read from the main database. */
export async function passageArticles (main: Db, places: number[][][]): Promise<PassageArticle[][]> {
  const db = await dictionary (main);
  if (! db) return places.map (() => []);
  const [cites, words] = await Promise.all ([
    Promise.all (places.map ((where) => Promise.all (where.map (([b, c, v]) => db.all (
      `SELECT r.id, MIN (r."end" - r.start) AS span, a.title, a.line, a.verses FROM refs r JOIN articles a ON a.id = r.id
       WHERE r.book = ?1 AND r.start <= ?2 AND r."end" >= ?2 GROUP BY r.id`, [b, c * 1000 + v]))))),
    Promise.all (places.map ((where) => Promise.all (where.map ((p) => main.all (
      `SELECT w.strong, l.lemma FROM words w LEFT JOIN lexicon l ON l.strong = w.strong
       WHERE w.book = ? AND w.chapter = ? AND w.verse = ? ORDER BY w.word`, p))))),
  ]);
  // Every word's articles, then their titles and lines, read at once (500 values a query: SQLite's limit)
  const inParts = async (all: string[], read: (part: string[]) => Promise<void>) => {
    for (let i = 0; i < all.length; i += 500) await read (all.slice (i, i + 500));
  };
  const marks = (n: number) => Array (n).fill ("?").join (",");
  const byStrong = new Map<string, Found> ();
  await inParts ([...new Set (words.flat (2).map ((w) => String (w.strong)))], async (part) => {
    for (const r of await db.all (`SELECT strong, ids, subject FROM lemmas WHERE strong IN (${marks (part.length)})`, part))
      byStrong.set (String (r.strong), { exact: idList (r.ids), subject: idList (r.subject) });
  });
  const info = new Map<string, Row> ();
  await inParts ([...new Set ([...byStrong.values ()].flatMap ((f) => [...f.exact, ...f.subject]))], async (part) => {
    for (const r of await db.all (`SELECT id, title, line FROM articles WHERE id IN (${marks (part.length)})`, part)) info.set (String (r.id), r);
  });
  const seen = new Set<string> ();
  const broad = (r: Row) => Number (r.verses) > BROAD ? 1 : 0;
  return places.map ((_, i) => {
    const out: PassageArticle[] = [];
    const add = (id: string, title: unknown, line: unknown, why: string) => {
      if (seen.has (id)) return;
      seen.add (id);
      out.push ({ id, title: String (title), line: String (line ?? ""), why });
    };
    const cited = cites[i].flat ().sort ((a, b) => broad (a) - broad (b)
      || (Number (a.span) > 0 ? 1 : 0) - (Number (b.span) > 0 ? 1 : 0) || Number (a.verses) - Number (b.verses));
    for (const r of cited) add (String (r.id), r.title, r.line, "");
    const ws = words[i].flat ();
    for (const kind of ["exact", "subject"] as const)
      for (const w of ws) for (const id of byStrong.get (String (w.strong))?.[kind] ?? []) {
        const r = info.get (id);
        if (r) add (id, r.title, r.line, String (w.lemma ?? "") + (kind === "subject" ? ", by subject" : ""));
      }
    return out;
  });
}

//==== SEARCH ====
/** The articles whose title or text (tags off) has the typed text, any case: those whose title has it first, each
 *  group in the dictionary's (alphabetical) order - each with its text as plain text (the search's snippet). */
export async function searchArticles (main: Db, typed: string, onProgress: (fraction: number) => void): Promise<{ id: string; title: string; text: string }[]> {
  const db = await dictionary (main, onProgress);
  if (! db) return [];
  const like = `%${typed.replace (/[\\%_]/g, (c) => "\\" + c)}%`;
  const rows = await db.all (`SELECT id, title, html FROM articles WHERE title LIKE ?1 ESCAPE '\\' OR html LIKE ?1 ESCAPE '\\' ORDER BY title COLLATE NOCASE`, [like]);
  const low = typed.toLowerCase ();
  const parser = new DOMParser ();
  const hits = rows.map ((r) => ({ id: String (r.id), title: plain (String (r.title)),
                                   text: (parser.parseFromString (String (r.html), "text/html").body.textContent ?? "").replace (/\s+/g, " ").trim () }))
    .filter ((h) => h.title.toLowerCase ().includes (low) || h.text.toLowerCase ().includes (low));     // (Not matched only inside a tag)
  const inTitle = (h: { title: string }) => h.title.toLowerCase ().includes (low) ? 0 : 1;
  return hits.map ((h, i) => ({ h, i })).sort ((a, b) => inTitle (a.h) - inTitle (b.h) || a.i - b.i).map ((x) => x.h);
}
