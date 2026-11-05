// The Tyndale Open Bible Dictionary (pipeline/tyndale_dict.py: its matching rules and its file), linked to the text
// both ways and searchable - and every other source of its kind ('dictionary' in note_sources), read the same way from
// a file of the same tables, each function taking the source's id (src, "tobd" by default): the Archaeology finds
// (pipeline/finds.py: Wikipedia's inscribed finds, its word panel's button "Finds"), whose file also holds a photo
// per find (photos: its thumbnail in the file, shown at an entry's right even offline; its full picture a file of its
// own on the server, data/images/<source>/<id>.jpg, online only - shown over the opened text, credited under it;
// offline, the thumbnail there and "Full picture online only"), the Tyndale dictionary itself, whose pictures
// (pipeline/tobd_pictures.py: a place's site, a plant, animal or object, a person's or event's engraving) are online
// only, the thumbnail too - data/images/tobd/<id>.t.jpg in a list (none shown when it can't load), the full picture
// in an opened article ("Picture online only" when it can't) - and whose places' articles open with the atlas' map of
// the place (its maps table: atlas.ts' wordMap, as a word's Map shows it), the ISBE's articles on
// archaeology and sites (pipeline/isbe.py: the 1915 encyclopedia, its button "ISBE"), and the Ancient Near East
// parallels (pipeline/ane.py: texts like the Code of Hammurabi or Gilgamesh paired with the passages they parallel,
// photos as the finds'; topical, so no word panel button - by passage and searchable only).
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
// entry's place. Each file (data/notes/tobd.db, finds.db) is listed in the main database's note_sources (kind
// 'dictionary'); it's downloaded the first time it's needed (a word tapped, to know whether it has an article) and kept
// (db.ts' openNotesDb).

import { openNotesDb, type Db, type Row } from "./db";
import { wordMap, type Place } from "./atlas";

// A source's name under an article's title (the note_sources name where it isn't here)
const NAMES: Record<string, string> = { tobd: "Tyndale Open Bible Dictionary", finds: "Archaeology finds · Wikipedia",
                                        isbe: "International Standard Bible Encyclopedia", ane: "Ancient Near East parallels" };
interface Opened { db: Db; name: string; credit: string; photos: boolean; maps: boolean; }     // (photos, maps: its file has that table)
const files = new Map<string, Promise<Opened | null>> ();     // (Each source's file, once opened; null: none in this database)
let goVerse: (book: number, chapter: number, verse: number) => void = () => {};

/** main.ts: how a scripture reference in an article goes to its verse (book: the database's id). */
export function initDictionary (go: (book: number, chapter: number, verse: number) => void) { goVerse = go; }

/** A dictionary source's file (src: its id) - opened (downloaded the first time) on the first call, with its name,
 *  credit and whether it has photos; null when the database lists none. A failed download is tried again on the next
 *  call. onProgress: the download's fraction (the search's "Loading…"). */
function opened (main: Db, src: string, onProgress: (fraction: number) => void = () => {}): Promise<Opened | null> {
  let file = files.get (src);
  if (! file) {
    file = main.all ("SELECT name, file, version, credit FROM note_sources WHERE id = ?", [src]).then (async ([r]) => {
      if (! r) return null;
      const db = await openNotesDb (src, String (r.file), String (r.version), onProgress);
      const tables = new Set ((await db.all ("SELECT name FROM sqlite_master WHERE type = 'table'")).map ((t) => String (t.name)));
      return { db, name: NAMES[src] ?? String (r.name), credit: String (r.credit), photos: tables.has ("photos"), maps: tables.has ("maps") };
    });
    files.set (src, file);
    file.catch (() => { files.delete (src); });
  }
  return file;
}

/** A dictionary source's file (src: its id; the Tyndale dictionary's by default) - see opened. */
export const dictionary = (main: Db, onProgress: (fraction: number) => void = () => {}, src = "tobd"): Promise<Db | null> =>
  opened (main, src, onProgress).then ((o) => o?.db ?? null);

/** A photo: its thumbnail (a data: URI, in the file - or, the Tyndale dictionary's, a URL under data/images/: online
 *  only), its credit, its full picture's URL (under data/images/: online only; '' none). */
type Photo = [thumb: string, credit: string, full: string];
/** Articles' photos (the sources with a photos table): id -> its Photo. */
async function photosOf (o: Opened | null, ids: string[]): Promise<Map<string, Photo>> {
  const out = new Map<string, Photo> ();
  if (! o?.photos) return out;
  for (let i = 0; i < ids.length; i += 500) {     // (500 values a query: SQLite's limit)
    const part = ids.slice (i, i + 500);
    for (const r of await o.db.all (`SELECT id, src, credit, full FROM photos WHERE id IN (${part.map (() => "?").join (",")})`, part))
      out.set (String (r.id), [String (r.src), String (r.credit), String (r.full ?? "")]);
  }
  return out;
}

/** An article's place (the source's maps table: atlas.db's places row as JSON - its alts a JSON string, '' none - for
 *  its map), or undefined. */
async function placeOf (o: Opened, id: string): Promise<Place | undefined> {
  if (! o.maps) return undefined;
  const [r] = await o.db.all ("SELECT place FROM maps WHERE id = ?", [id]);
  if (! r) return undefined;
  const p = JSON.parse (String (r.place));
  return { ...p, sub: p.sub ?? "", note: p.note ?? "", alts: p.alts ? JSON.parse (p.alts) : [] };
}

/** A root's articles: those matching it exactly and those of its subject (ids, each list in the dictionary's order of
 *  relevance) - both empty when it has none. */
export interface Found { exact: string[]; subject: string[]; }
const idList = (s: unknown) => String (s ?? "").split (" ").filter (Boolean);

/** The articles on a root (its Strong's key) in a source (src). */
export async function articlesFor (main: Db, strong: string, src = "tobd"): Promise<Found> {
  try {
    const db = await dictionary (main, undefined, src);
    const [r] = db ? await db.all ("SELECT ids, subject FROM lemmas WHERE strong = ?", [strong]) : [];
    return { exact: idList (r?.ids), subject: idList (r?.subject) };
  } catch {
    return { exact: [], subject: [] };     // (Not loaded - offline the first time: no Dictionary for now)
  }
}

type ShowOther = (title: string, fill: (body: HTMLElement) => void, sub?: string) => void;
/** A title as the dictionary shows it: the source's * (a word not in the NLT) dropped. */
const plain = (title: string) => title.replace (/\*/g, "");

/** A root's articles in a source (src) opened in the word's panel by its showOther: the one, or the choice of them
 *  (titled label: the panel's button) - the exact ones, then BY SUBJECT's. */
export async function openArticles (main: Db, found: Found, show: ShowOther, src = "tobd", label = "Dictionary") {
  const o = await opened (main, src);
  const db = o?.db;
  const all = [...found.exact, ...found.subject];
  if (! o || ! db || ! all.length) return;
  if (all.length === 1) { openArticle (main, all[0], show, src); return; }
  const rows = await db.all (`SELECT id, title FROM articles WHERE id IN (${all.map (() => "?").join (",")})`, all);
  const title = new Map (rows.map ((r) => [String (r.id), plain (String (r.title))]));
  show (label, (body) => {
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
        b.addEventListener ("click", () => openArticle (main, id, show, src));
        choices.append (b);
      }
      body.append (choices);
    }
  }, o.name);
}

/** One article over the word's info: its title, the source's name under it, its photo, its text, its credit. */
async function openArticle (main: Db, id: string, show: ShowOther, src = "tobd") {
  const o = await opened (main, src);
  const [r] = o ? await o.db.all ("SELECT title, html FROM articles WHERE id = ?", [id]) : [];
  if (! o || ! r) return;
  const [photo, place] = [(await photosOf (o, [id])).get (id), await placeOf (o, id)];
  show (plain (String (r.title)), (body) => body.append (...articleBody (main, r, o, (other) => openArticle (main, other, show, src), photo, place)), o.name);
}

/** An article as Chapter Study prints it (chapterstudy.ts): its title, its source's name and credit, and its body as an
 *  opened article shows it (photo, place's map, text, credit; a cross-reference not followed); null when it's gone. */
export async function articleBlock (main: Db, id: string, src = "tobd"): Promise<{ title: string; name: string; credit: string; body: HTMLElement[] } | null> {
  const o = await opened (main, src);
  const [r] = o ? await o.db.all ("SELECT title, html FROM articles WHERE id = ?", [id]) : [];
  if (! o || ! r) return null;
  const [photo, place] = [(await photosOf (o, [id])).get (id), await placeOf (o, id)];
  return { title: plain (String (r.title)), name: o.name, credit: o.credit, body: articleBody (main, r, o, () => {}, photo, place) };
}

/** An article's photo (where its source has one: a figure, its credit under it - the full picture, fetched from the
 *  server as it scrolls into view; offline or failing, its thumbnail instead with "Full picture online only" - or,
 *  where the thumbnail is online only too, "Picture online only" alone), its place's map (place: the atlas' map of it,
 *  as a word's Map shows it - left out when the atlas can't load), text (the pipeline's light HTML,
 *  styled as a grammar section: .gBody) and its source's credit: each scripture reference going to its verse, each
 *  cross-reference opening its article (open). */
function articleBody (main: Db, r: Row, o: Opened, open: (id: string) => void, photo?: Photo, place?: Place): HTMLElement[] {
  const figure: HTMLElement[] = [];
  if (photo) {
    const f = document.createElement ("figure");
    f.className = "dictPhoto";
    const img = document.createElement ("img");
    img.alt = plain (String (r.title));
    const cap = document.createElement ("figcaption");
    cap.className = "credit";
    cap.textContent = photo[1];
    const thumbOnly = () => {     // (Offline, or the full picture failed: the thumbnail, said to be one - none when it's online only too)
      img.onerror = null;
      if (! photo[0].startsWith ("data:")) { img.remove (); cap.textContent = "Picture online only."; return; }
      img.src = photo[0];
      cap.textContent = `Full picture online only. ${photo[1]}`;
    };
    if (photo[2]) { img.loading = "lazy"; img.onerror = thumbOnly; img.src = photo[2]; } else img.src = photo[0];
    f.append (img, cap);
    figure.push (f);
  }
  if (place) {
    const map = document.createElement ("div");
    map.className = "dictPhoto";     // (Spaced as a picture is)
    wordMap (main, map, place).catch (() => map.remove ());
    figure.push (map);
  }
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
  note.textContent = o.credit;
  return [...figure, text, note];
}

//==== ENTRIES ====
/** An article as a list's entry (the notes', the search's): a row as a search result is (.hit) - its title where a
 *  result's reference is (.src; why: what led to it, after the title) over its text (a line of the article, or what a
 *  search matched), its photo's thumbnail at its right where it has one (photo: a data: URI) - which, tapped, opens
 *  the article under it (and closes it again); a cross-reference in it opening that article in its place, its title
 *  over it. src: its source; photo: a data: URI, or an online-only URL (not shown when it can't load). */
export function entry (main: Db, id: string, title: string, text: HTMLElement | string, why = "", src = "tobd", photo = ""): HTMLElement {
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
  if (photo) {
    const img = document.createElement ("img");
    img.className = "dictThumb";
    img.alt = "";
    img.loading = "lazy";
    img.onerror = () => { img.remove (); row.classList.remove ("withThumb"); };     // (An online-only thumbnail offline: nothing, not a broken image)
    img.src = photo;
    row.classList.add ("withThumb");
    row.append (img);
  }
  const body = document.createElement ("div");
  body.className = "dictBody";
  body.hidden = true;
  let shown = "";
  const show = (open: boolean) => { body.hidden = ! open; row.setAttribute ("aria-expanded", String (open)); };
  const open = async (art: string) => {
    const o = await opened (main, src);
    const [r] = o ? await o.db.all ("SELECT title, html FROM articles WHERE id = ?", [art]) : [];
    if (! o || ! r) return;
    shown = art;
    const h = document.createElement ("div");
    h.className = "gHead";
    h.textContent = plain (String (r.title));
    body.replaceChildren (...(art !== id ? [h] : []), ...articleBody (main, r, o, open, (await photosOf (o, [art])).get (art), await placeOf (o, art)));     // (Another article, reached by a cross-reference: its title over it)
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
export interface PassageArticle { id: string; title: string; line: string; why: string; photo: string; }

/** The articles of a source (src) for each verse shown: places[i] the verse's places in the text ([book, chapter,
 *  verse] - beside the Septuagint, the Hebrew verses it translates); its words read from the main database. Each with
 *  its photo where its source has them ('' none). */
export async function passageArticles (main: Db, places: number[][][], src = "tobd"): Promise<PassageArticle[][]> {
  const o = await opened (main, src);
  const db = o?.db;
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
  const lists = places.map ((_, i) => {
    const out: PassageArticle[] = [];
    const add = (id: string, title: unknown, line: unknown, why: string) => {
      if (seen.has (id)) return;
      seen.add (id);
      out.push ({ id, title: String (title), line: String (line ?? ""), why, photo: "" });
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
  const photos = await photosOf (o, [...seen]);
  for (const a of lists.flat ()) a.photo = photos.get (a.id)?.[0] ?? "";
  return lists;
}

//==== BY BOOK ====
// The Archaeology finds and the Ancient Near East parallels by passage (notes.ts' drawBookFinds): every entry bearing
// on the book read, at once - those citing one of its verses (every verse of a span cited: Exodus 21:23-25 is 23, 24
// and 25) and those its words name (a person, a place) - in the order of the verse each first comes at, each with
// every verse of the book it comes at (cited or named), the list following the text one way.
export interface BookArticle { id: string; title: string; line: string; photo: string; verses: number[]; }     // (verses: chapter * 1000 + verse, rising)

/** A source's (src) articles for a book (its database id): each with its verses there, in the order of its first. */
export async function bookArticles (main: Db, book: number, src: string): Promise<BookArticle[]> {
  const o = await opened (main, src);
  if (! o) return [];
  const at = new Map<string, Set<number>> ();
  const add = (id: string, v: number) => { (at.get (id) ?? at.set (id, new Set ()).get (id)!).add (v); };
  const refs = await o.db.all (`SELECT id, start, "end" FROM refs WHERE book = ?`, [book]);
  if (refs.length) {     // (Each span's verses, as the book has them: a span into the next chapter takes the verses there)
    const all = (await main.all ("SELECT DISTINCT chapter * 1000 + verse AS at FROM words WHERE book = ? ORDER BY at", [book])).map ((r) => Number (r.at));
    for (const r of refs) for (const v of all) if (v >= Number (r.start) && v <= Number (r.end)) add (String (r.id), v);
  }
  const named = new Map<string, string[]> ((await o.db.all ("SELECT strong, ids FROM lemmas")).map ((r) => [String (r.strong), idList (r.ids)]));
  const strongs = [...named.keys ()];
  for (let i = 0; i < strongs.length; i += 500) {     // (500 values a query: SQLite's limit)
    const part = strongs.slice (i, i + 500);
    for (const w of await main.all (`SELECT DISTINCT strong, chapter * 1000 + verse AS at FROM words
                                     WHERE book = ? AND strong IN (${part.map (() => "?").join (",")})`, [book, ...part]))
      for (const id of named.get (String (w.strong)) ?? []) add (id, Number (w.at));
  }
  const ids = [...at.keys ()];
  const info = new Map<string, Row> ();
  for (let i = 0; i < ids.length; i += 500) {
    const part = ids.slice (i, i + 500);
    for (const r of await o.db.all (`SELECT id, title, line FROM articles WHERE id IN (${part.map (() => "?").join (",")})`, part)) info.set (String (r.id), r);
  }
  const photos = await photosOf (o, ids);
  return ids.filter ((id) => info.has (id)).map ((id) => ({ id, title: String (info.get (id)!.title), line: String (info.get (id)!.line ?? ""),
    photo: photos.get (id)?.[0] ?? "", verses: [...at.get (id)!].sort ((a, b) => a - b) }))
    .sort ((a, b) => a.verses[0] - b.verses[0] || a.title.localeCompare (b.title));
}

/** A book's verses (chapter * 1000 + verse) as a line of references, each going to its verse in the text: the first
 *  FEW, then "+ n more" showing the rest (a find naming Israel or Assyria comes at hundreds). Each reference carries
 *  its verse (data-at) and its place in the book's order (data-i); past the first FEW, data-more: hidden until
 *  "+ more" is tapped. The verse read is brought to the front and marked (markVerse), shown even among the hidden. */
const FEW = 12;
export function verseLinks (book: number, verses: number[]): HTMLElement {
  const line = document.createElement ("div");
  line.className = "src bookVerses";
  line.append (...verses.map ((x, i) => {
    const s = document.createElement ("span");
    s.dataset.at = String (x);
    s.dataset.i = String (i);
    if (i >= FEW) { s.dataset.more = ""; s.hidden = true; }
    const sep = document.createElement ("span");
    sep.className = "sep";
    const a = document.createElement ("a");
    a.className = "term";
    a.textContent = `${Math.floor (x / 1000)}:${x % 1000}`;
    a.addEventListener ("click", () => goVerse (book, Math.floor (x / 1000), x % 1000));
    s.append (sep, a);
    return s;
  }));
  if (verses.length > FEW) {
    const more = document.createElement ("a");
    more.className = "term bookMore";
    more.textContent = `+ ${verses.length - FEW} more`;
    more.addEventListener ("click", () => { line.dataset.open = ""; for (const s of line.querySelectorAll<HTMLElement> ("[data-more]")) s.hidden = false; more.remove (); commas (line); });
    line.append (" ", more);
  }
  commas (line);
  return line;
}

/** The commas between a line's shown references (none before the first). */
function commas (line: HTMLElement) {
  let first = true;
  for (const s of line.querySelectorAll<HTMLElement> ("span[data-at]")) {
    if (s.hidden) continue;
    s.querySelector (".sep")!.textContent = first ? "" : ", ";
    first = false;
  }
}

/** The verse read (chapter * 1000 + verse) brought to the front of every book list of verses under el (verseLinks)
 *  and marked - shown there even when it's among the hidden; the others back in the book's order. */
export function markVerse (el: HTMLElement, v: number) {
  for (const line of el.querySelectorAll<HTMLElement> (".bookVerses")) {
    const open = "open" in line.dataset;
    const spans = [...line.querySelectorAll<HTMLElement> ("span[data-at]")].sort ((a, b) => Number (a.dataset.i) - Number (b.dataset.i));
    const here = spans.find ((s) => s.dataset.at === String (v));
    for (const s of spans) {
      s.querySelector ("a")!.classList.toggle ("here", s === here);
      if (! open && "more" in s.dataset) s.hidden = s !== here;
    }
    const tail = line.querySelector (".bookMore");
    const order = here ? [here, ...spans.filter ((s) => s !== here)] : spans;
    for (const s of order) line.insertBefore (s, tail ? tail.previousSibling : null);
    commas (line);
  }
}

//==== SEARCH ====
/** A source's (src) articles whose title or text (tags off) has the typed text, any case: those whose title has it
 *  first, each group in the source's (alphabetical) order - each with its text as plain text (the search's snippet)
 *  and its photo ('' none). */
export async function searchArticles (main: Db, typed: string, onProgress: (fraction: number) => void, src = "tobd"): Promise<{ id: string; title: string; text: string; photo: string }[]> {
  const o = await opened (main, src, onProgress);
  const db = o?.db;
  if (! db) return [];
  const like = `%${typed.replace (/[\\%_]/g, (c) => "\\" + c)}%`;
  const rows = await db.all (`SELECT id, title, html FROM articles WHERE title LIKE ?1 ESCAPE '\\' OR html LIKE ?1 ESCAPE '\\' ORDER BY title COLLATE NOCASE`, [like]);
  const low = typed.toLowerCase ();
  const parser = new DOMParser ();
  const hits = rows.map ((r) => ({ id: String (r.id), title: plain (String (r.title)),
                                   text: (parser.parseFromString (String (r.html), "text/html").body.textContent ?? "").replace (/\s+/g, " ").trim () }))
    .filter ((h) => h.title.toLowerCase ().includes (low) || h.text.toLowerCase ().includes (low));     // (Not matched only inside a tag)
  const inTitle = (h: { title: string }) => h.title.toLowerCase ().includes (low) ? 0 : 1;
  const photos = await photosOf (o, hits.map ((h) => h.id));
  return hits.map ((h, i) => ({ h, i })).sort ((a, b) => inTitle (a.h) - inTitle (b.h) || a.i - b.i)
    .map ((x) => ({ ...x.h, photo: photos.get (x.h.id)?.[0] ?? "" }));
}
