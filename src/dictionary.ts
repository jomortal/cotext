// The word's panel's "Dictionary" (panel.ts): the Tyndale Open Bible Dictionary's articles on the tapped word's root -
// a person, a place, a thing or a theological term - opened over the word's info as the Verb chart is (grammar.ts'
// showOther: titled, its ✕ back to the word). The articles and which roots each is about are their own file,
// data/notes/tobd.db (pipeline/tyndale_dict.py: its matching rules), listed in the main database's note_sources
// (kind 'dictionary'); it's downloaded the first time a word is tapped (to know whether that word has an article) and
// kept (db.ts' openNotesDb). One article: shown at once; several (Abel the person and the place, God's articles): a
// choice of their titles first. A cross-reference in an article (an underlined title) opens that article in its place.

import { openNotesDb, type Db } from "./db";

const NAME = "Tyndale Open Bible Dictionary";
let file: Promise<Db | null> | null = null;     // (The dictionary's file, once opened; null: none in this database)
let credit = "";

/** The dictionary's file - opened (downloaded the first time) on the first call; null when the database lists none. A
 *  failed download is tried again on the next call. */
function dictionary (main: Db): Promise<Db | null> {
  file ??= main.all ("SELECT file, version, credit FROM note_sources WHERE id = 'tobd'").then (([r]) => {
    if (! r) return null;
    credit = String (r.credit);
    return openNotesDb ("tobd", String (r.file), String (r.version), () => {});
  });
  file.catch (() => { file = null; });
  return file;
}

/** The articles on a root (its Strong's key): their ids, in the dictionary's order - none when it has none. */
export async function articlesFor (main: Db, strong: string): Promise<string[]> {
  try {
    const db = await dictionary (main);
    const [r] = db ? await db.all ("SELECT ids FROM lemmas WHERE strong = ?", [strong]) : [];
    return r ? String (r.ids).split (" ") : [];
  } catch {
    return [];     // (Not loaded - offline the first time: no Dictionary for now)
  }
}

type ShowOther = (title: string, fill: (body: HTMLElement) => void, sub?: string) => void;
/** A title as the panel shows it: the source's * (a word not in the NLT) dropped. */
const plain = (title: string) => title.replace (/\*/g, "");

/** The articles (ids from articlesFor) opened in the panel by its showOther: the one, or the choice of them. */
export async function openArticles (main: Db, ids: string[], show: ShowOther) {
  const db = await dictionary (main);
  if (! db) return;
  if (ids.length === 1) { openArticle (main, ids[0], show); return; }
  const rows = await db.all (`SELECT id, title FROM articles WHERE id IN (${ids.map (() => "?").join (",")})`, ids);
  const title = new Map (rows.map ((r) => [String (r.id), plain (String (r.title))]));
  show ("Dictionary", (body) => {
    const list = document.createElement ("div");
    list.className = "choices";     // (The articles' titles as buttons, one a line: style.css' .giOther > .choices)
    for (const id of ids) {
      if (! title.has (id)) continue;
      const b = document.createElement ("button");
      b.className = "pill";
      b.textContent = title.get (id)!;
      b.addEventListener ("click", () => openArticle (main, id, show));
      list.append (b);
    }
    body.append (list);
  }, NAME);
}

/** One article over the word's info: its title, the dictionary's name under it, its text (the pipeline's light HTML,
 *  styled as a grammar section: .gBody), its credit; each cross-reference opening its article. */
async function openArticle (main: Db, id: string, show: ShowOther) {
  const db = await dictionary (main);
  const [r] = db ? await db.all ("SELECT title, html FROM articles WHERE id = ?", [id]) : [];
  if (! r) return;
  show (plain (String (r.title)), (body) => {
    const text = document.createElement ("div");
    text.className = "gBody";
    text.innerHTML = String (r.html);     // (The pipeline's own HTML: <p>, <b>, <i>, <sup>, tables, script spans, <a data-art>; text escaped)
    for (const a of text.querySelectorAll<HTMLElement> ("a[data-art]")) {
      a.className = "term";     // (Tappable, as a parsing's terms are)
      a.addEventListener ("click", () => openArticle (main, a.dataset.art!, show));
    }
    const note = document.createElement ("p");
    note.className = "credit lexCredit";
    note.textContent = credit;
    body.append (text, note);
  }, NAME);
}
