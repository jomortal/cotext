// The Atlas (pipeline/atlas.py: its sources, matching and files): the Bible's places on a map, drawn here on a canvas
// from the shipped files - no tiles, no map library, offline once downloaded.
// - BY WORD: a word naming a place shows "Map" in its panel (panel.ts) - the map over the word's info as the Verb chart
//   is (grammar.ts' showOther), the place marked and named, the other sites proposed for it as hollow points, how sure
//   the identification is (OpenBible's score: the share of current scholarship behind the site) and the others with
//   theirs (wordMap).
// - BY PASSAGE: "Atlas" in the notes' picker (notes.ts, its own MAPS group): every place the book names, small and
//   faint, and over them the places the chapter names (on every screen), each a
//   full point with its name, the map fitted to them; those listed under the map with the verses naming them - a place
//   tapped (on the map or in the list) picked out on both, a verse tapped going there (passageMap).
// - BASE MAPS: Natural Earth, Ancient World (AWMC) and Roman Empire (DARE), picked under the map (BASE MAP, kept on
//   the device; every map shown follows it), each its own file downloaded the first time it's shown and kept (db.ts'
//   openNotesDb), its credit under the map. Each is offered only in the eras it fits (atlas.db's maps.eras): Natural
//   Earth and AWMC everywhere - AWMC's roads only those the Barrington Atlas dates to the era of the chapter (none
//   before 750 BC), its 200 CE borders only in the Roman eras - and DARE only in the Roman eras (the New Testament,
//   the Psalms of Solomon). Where the base map picked isn't offered, the first offered shows meanwhile; the pick comes
//   back in the next book that offers it.
// - ERAS (POLITICAL BOUNDARIES, under BASE MAP; kept on the device, every map following it): Off, or the era of the
//   book and chapter the map is for (atlas.db's era_books - Genesis 1-11 none, the row hidden) - its states and
//   provinces shaded on the land, each a hue of the verb colors (one polity's provinces sharing one), outlined and
//   named; drawn over the base map's own provinces, which hide meanwhile (pipeline/atlas_eras.py: generated,
//   approximate - its credit added under the map while it's on).
// - ROUTES (ROUTE, under it; hidden in a book with none): None, or one of the book's own journeys (atlas.db's routes,
//   pipeline/atlas_routes.py), kept per book while the app runs - drawn as a line through its stops in order, an
//   arrow halfway along each leg, each stop numbered (a place met again its later numbers beside its name); a stop
//   whose site is uncertain (confidence under 70%: UNSURE) hollow, the legs to and from it dashed. The map is fitted
//   to the route when it's picked and stays there as the verses change; its stops listed under the picker, each its
//   number and place (tapped picking it out) over how sure its site is and the verse naming it (tapped going there). The places' file, data/notes/atlas.db, is the main database's note_sources
//   row 'atlas' (kind 'atlas'); it's read the first time a word is tapped (to know whether it names a place).
// - THE MAP: an equirectangular projection (a degree of longitude cos 33° of a degree of latitude: true to shape across
//   the Levant), fitted to the points shown with a margin, at least SPAN degrees tall (a lone town shows its region);
//   dragged to pan, pinched or wheeled to zoom, kept within the files' box. Each base map's shapes come at four levels of
//   detail (atlas.py's LEVELS): the coarsest finer than a screen pixel is drawn, never more points than the screen shows;
//   each level's paths built once (Path2D) and redrawn under a transform as it moves. Names are drawn where they fit, the
//   picked place's first, the regions' after them, the book's faint places' last. Colors from style.css' tokens
//   (--map-*, the accent; the provinces and regions in the verb colors).

import { creditText } from "./credit";
import { openNotesDb, type Db, type Row } from "./db";
import { box, px } from "./zoom";

const K = Math.cos (33 * Math.PI / 180);     // (A degree of longitude, in degrees of latitude)
const BOX = [-12, 4, 64, 50];                 // (The base maps' box, west south east north: atlas.py's BOX)
const LEVELS = [0.05, 0.015, 0.004, 0.001];   // (atlas.py's: each level's tolerance, in degrees)
const SPAN = 1.6;                             // (A fitted map at least this many degrees tall)
const MAX_SCALE = 1500;                       // (The closest zoom: screen pixels a degree)
const MAP_KEY = "cotext.atlas.map";
const BORDERS_KEY = "cotext.atlas.borders";     // ("0": POLITICAL BOUNDARIES off; on until turned off)
const UNSURE = 700;                           // (A route's stop whose site's score is under this drawn as uncertain)
/** The regions' (and DARE's provinces') hues: the verb colors (style.css), indexed by a region's color. */
const HUES = ["--qal", "--piel", "--pual", "--hiphil", "--niphal", "--hithpael", "--other"];

let file: Promise<Db | null> | null = null;
let credit = "";
let maps: { id: string; name: string; credit: string; file: string; version: string; eras: string }[] = [];
let mapId = "ne", bordersOn = true;
try { mapId = localStorage.getItem (MAP_KEY) ?? "ne"; bordersOn = localStorage.getItem (BORDERS_KEY) !== "0"; } catch { /* private mode */ }
/** An era (atlas.db's eras): its name, the AWMC road periods drawn in it (letters; "" none), whether it's Roman. */
interface Era { id: string; name: string; roads: string; roman: boolean; credit: string; }
let eras = new Map<string, Era> ();
let eraBooks: { book: number; first: number; last: number; era: string }[] = [];
let routes: { id: string; books: number[]; name: string }[] = [];
const routePicked = new Map<number, string> ();     // (Each book's route picked, while the app runs: "" none; unpicked, its first)
let placesDb: Db | null = null;
let goVerse: (book: number, chapter: number, verse: number) => void = () => {};

/** main.ts: how a verse listed under the map goes to the text (book: the database's id). */
export function initAtlas (go: (book: number, chapter: number, verse: number) => void) { goVerse = go; }

/** The places' file - opened (downloaded the first time) on the first call, its base maps read; null when the
 *  database lists none. A failed download is tried again on the next call. */
function atlas (main: Db): Promise<Db | null> {
  file ??= main.all ("SELECT file, version, credit FROM note_sources WHERE id = 'atlas'").then (async ([r]) => {
    if (! r) return null;
    credit = String (r.credit);
    const db = await openNotesDb ("atlas", String (r.file), String (r.version), () => {});
    const [m, e, eb, rt] = await Promise.all ([db.all ("SELECT id, name, credit, file, version, eras FROM maps ORDER BY rowid"),
      db.all ("SELECT id, name, roads, roman, credit FROM eras"), db.all ("SELECT book, first, last, era FROM era_books"),
      db.all ("SELECT id, books, name FROM routes ORDER BY rowid")]);
    maps = m.map ((x) => ({ id: String (x.id), name: String (x.name), credit: String (x.credit), file: String (x.file), version: String (x.version), eras: String (x.eras ?? "") }));
    if (! maps.some ((x) => x.id === mapId)) mapId = maps[0]?.id ?? "";
    eras = new Map (e.map ((x) => [String (x.id), { id: String (x.id), name: String (x.name), roads: String (x.roads), roman: !! x.roman, credit: String (x.credit) }]));
    eraBooks = eb.map ((x) => ({ book: Number (x.book), first: Number (x.first), last: Number (x.last), era: String (x.era) }));
    routes = rt.map ((x) => ({ id: String (x.id), books: String (x.books).split (" ").map (Number), name: String (x.name) }));
    placesDb = db;
    return db;
  });
  file.catch (() => { file = null; });
  return file;
}

/** A place as the map shows it: its point (null: not located), how sure (0-1000), the other sites proposed; at, the
 *  book and chapter of the word naming it (placeOf's: the era and routes its map shows). */
export interface Place { id: string; name: string; sub: string; type: string; lon: number | null; lat: number | null;
                         score: number; alts: [string, number, number, number][]; note: string; at?: [number, number]; }
const asPlace = (r: Row): Place => ({ id: String (r.id), name: String (r.name), sub: String (r.sub ?? ""), type: String (r.type ?? ""),
  lon: r.lon === null ? null : Number (r.lon), lat: r.lat === null ? null : Number (r.lat), score: Number (r.score),
  alts: r.alts ? JSON.parse (String (r.alts)) : [], note: String (r.note ?? "") });

/** The place a word of the text names (its book, chapter, verse and number in the verse), or null. */
export async function placeOf (main: Db, where: number[]): Promise<Place | null> {
  try {
    const db = await atlas (main);
    const [r] = db ? await db.all (`SELECT p.* FROM words w JOIN places p ON p.id = w.place
                                    WHERE w.book = ? AND w.chapter = ? AND w.verse = ? AND w.word = ?`, where) : [];
    return r ? { ...asPlace (r), at: [where[0], where[1]] } : null;
  } catch {
    return null;     // (Not loaded - offline the first time: no Map for now)
  }
}

/** A share of scholarship as the map says it: "confidence 72%". */
const sure = (score: number) => `confidence ${Math.round (score / 10)}%`;
const el = <K extends keyof HTMLElementTagNameMap> (tag: K, cls = "", text = "") => {
  const e = document.createElement (tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

//==== BY WORD ====
/** A place's map, for the word's panel (showOther's body): the map (the place and its other proposed sites), what's
 *  known of where it was, the base map's picker and the credits. */
export async function wordMap (main: Db, body: HTMLElement, place: Place) {
  await atlas (main);
  const view = makeMap ();
  const pins: Pin[] = place.lon === null ? [] : [{ id: place.id, name: place.name, lon: place.lon, lat: place.lat!, main: true }];
  place.alts.forEach (([name, lon, lat], i) => pins.push ({ id: `${place.id}.${i}`, name, lon, lat, main: false }));
  const info = el ("div", "atlasInfo");
  if (place.lon === null) info.append (el ("p", "", `${place.note || "Location unknown"}: not on the map.`));
  else info.append (el ("p", "", place.alts.length ? `Most likely site (${sure (place.score)}).` : place.score >= 1000 ? "Its site isn't disputed." : `Site: ${sure (place.score)}.`));
  if (place.alts.length) info.append (el ("p", "", "Other sites proposed: " + place.alts.map (([n, , , s]) => `${n} (${Math.round (s / 10)}%)`).join (", ") + "."));
  body.append (view.el, info, ...view.foot, el ("p", "credit atlasCredit", credit));
  if (place.at) view.context (place.at[0], place.at[1]);
  view.set (pins, place.id);
}

//==== BY PASSAGE ====
/** A place of the passage: its verses (the text's verse numbers) naming it. */
interface Named { place: Place; verses: number[]; }

/** The notes panel's Atlas (notes.ts): one map kept while the panel shows the atlas, its places set as the verses
 *  change - each verse's places read for its places in the text (`where`: [book, chapter, verse] - beside the
 *  Septuagint, the Hebrew verses it translates), labeled by the verse shown (v). Returns the map's box (map, list,
 *  picker, credits) and its update, which resolves once drawn, false when there were no places (none: what the list
 *  says then). */
export function passageMap (main: Db) {
  const box = el ("div", "atlasBox");
  const view = makeMap ();
  const list = el ("div", "atlasList");
  box.append (view.el, list, ...view.foot);
  let book = 0, chapter = 0;
  const books = new Map<number, Promise<Place[]>> ();     // (Each book's places, read once: the faint points)
  const ofBook = (db: Db, b: number) => {
    if (! books.has (b)) books.set (b, db.all (`SELECT DISTINCT p.* FROM words w JOIN places p ON p.id = w.place
                                                 WHERE w.book = ? AND p.lon IS NOT NULL`, [b]).then ((r) => r.map (asPlace)));
    return books.get (b)!;
  };
  const rows = new Map<string, HTMLElement> ();
  view.onPick ((id) => { for (const [k, r] of rows) r.classList.toggle ("on", k === id); rows.get (id)?.scrollIntoView ({ block: "nearest" }); });
  async function update (b: number, c: number, per: { v: number; where: number[][] }[], none: string): Promise<boolean> {
    book = b; chapter = c;
    const db = await atlas (main);
    if (! db) return false;
    view.context (b, c);
    const found = new Map<string, Named> ();     // (In the order named: verse by verse, word by word)
    const read = await Promise.all (per.map (({ where }) => Promise.all (where.map ((p) => db.all (
      `SELECT p.* FROM words w JOIN places p ON p.id = w.place WHERE w.book = ? AND w.chapter = ? AND w.verse = ? ORDER BY w.word`, p)))));
    per.forEach (({ v }, i) => {
      for (const r of read[i].flat ()) {
        const n = found.get (String (r.id)) ?? { place: asPlace (r), verses: [] };
        if (! n.verses.includes (v)) n.verses.push (v);
        found.set (n.place.id, n);
      }
    });
    const named = [...found.values ()];
    // (The books the verses are read in - beside the Septuagint, the Hebrew's - each one's places)
    const inBook = (await Promise.all ([...new Set (per.flatMap (({ where }) => where.map ((p) => p[0])))].map ((x) => ofBook (db, x)))).flat ();
    rows.clear ();
    list.replaceChildren (...named.map (({ place, verses }) => {
      const row = el ("div", "hit atlasRow");
      const head = el ("button", "src atlasName", place.name);
      head.addEventListener ("click", () => view.select (place.id));
      const line = el ("span", "atlasVerses");
      if (place.sub || place.lon === null) line.append (place.lon === null ? `${place.note || "Location unknown"} · ` : `${place.sub} · `);
      verses.forEach ((v, i) => {
        const a = el ("a", "term", `${chapter}:${v}`);
        a.addEventListener ("click", () => goVerse (book, chapter, v));
        line.append (...(i ? [", "] : []), a);
      });
      row.append (head, line);
      rows.set (place.id, row);
      return row;
    }));
    if (! named.length) list.append (el ("p", "", none));
    const pins: Pin[] = named.filter ((n) => n.place.lon !== null).map (({ place }) => ({ id: place.id, name: place.name, lon: place.lon!, lat: place.lat!, main: true }));
    for (const p of inBook) if (! found.has (p.id) && ! pins.some ((x) => x.id === p.id))
      pins.push ({ id: p.id, name: p.name, lon: p.lon!, lat: p.lat!, main: true, faint: true });
    view.set (pins);
    return named.length > 0;
  }
  return { el: box, update };
}

//==== THE MAP ====
/** A point on the map: main a place (filled), else another site proposed for it (hollow); faint, a place of the book
 *  not named in the verses shown (small, muted, named last). */
interface Pin { id: string; name: string; lon: number; lat: number; main: boolean; faint?: boolean; }
interface Base { shapes: Row[]; labels: Row[]; relief: { level: number; w: number; s: number; e: number; n: number; img: HTMLImageElement }[];
                 paths: Map<string, Path2D | null>; }
const bases = new Map<string, Promise<Base>> ();     // (Each base map, once read: shared by every map shown)
const shown = new Set<{ redraw: () => void }> ();     // (Every map on screen: BASE MAP and POLITICAL BOUNDARIES change them all)

/** A base map's file read whole (downloaded the first time): its shapes, labels and relief images. */
function base (id: string, onProgress: (f: number) => void): Promise<Base> {
  let b = bases.get (id);
  if (! b) {
    const m = maps.find ((x) => x.id === id)!;
    b = openNotesDb (`atlas_${id}`, m.file, m.version, onProgress).then (async (db) => {
      const [shapes, labels, relief] = await Promise.all ([db.all ("SELECT layer, level, name, data FROM shapes"),
        db.all ("SELECT layer, name, lon, lat FROM labels"), db.all ("SELECT level, west, south, east, north, png FROM relief ORDER BY level")]);
      db.close ();
      const imgs = await Promise.all (relief.map (async (r) => {
        const img = new Image ();
        img.src = URL.createObjectURL (new Blob ([r.png as unknown as Uint8Array], { type: "image/png" }));
        await img.decode ();
        return { level: Number (r.level), w: Number (r.west), s: Number (r.south), e: Number (r.east), n: Number (r.north), img };
      }));
      return { shapes, labels, relief: imgs, paths: new Map () };
    });
    b.catch (() => bases.delete (id));
    bases.set (id, b);
  }
  return b;
}

/** Encoded paths added to a Path2D in the map's units (x = longitude * K, y = - latitude): atlas.py's encode read
 *  back - each path its point count, then each point's change from the last, at 1/1000 degree, as zigzag varints. */
function addPaths (p: Path2D, d: Uint8Array) {
  let i = 0;
  const next = () => {
    let v = 0, shift = 0, byte;
    do { byte = d[i++]; v += (byte & 0x7f) * 2 ** shift; shift += 7; } while (byte & 0x80);
    return v % 2 ? -(v + 1) / 2 : v / 2;
  };
  while (i < d.length) {
    const n = next ();
    let x = 0, y = 0;
    for (let j = 0; j < n; j++) {
      x += next (); y += next ();
      if (j) p.lineTo (x / 1000 * K, -y / 1000); else p.moveTo (x / 1000 * K, -y / 1000);
    }
  }
}

/** A layer's paths at a level (a province's, an AWMC road period's: by its name) as one Path2D, built the first time
 *  it's drawn. null: the layer has nothing at that level. */
function pathOf (b: Base, layer: string, level: number, name = ""): Path2D | null {
  const key = `${layer}|${level}|${name}`;
  if (b.paths.has (key)) return b.paths.get (key)!;
  let p: Path2D | null = null;
  for (const r of b.shapes) {
    if (r.layer !== layer || Number (r.level) !== level || (name && r.name !== name)) continue;
    p ??= new Path2D ();
    addPaths (p, r.data as unknown as Uint8Array);
  }
  b.paths.set (key, p);
  return p;
}

/** The names a base map's layer has at any level (its provinces; its roads' periods). */
const namesOf = (b: Base, layer: string) => [...new Set (b.shapes.filter ((r) => r.layer === layer).map ((r) => String (r.name)))];

//==== ERAS ====
/** A region of an era: its name, hue (HUES' index), where its name is written, its rings (null: a name alone). */
interface Region { name: string; color: number; lon: number; lat: number; path: Path2D | null; }
const regionsRead = new Map<string, Promise<Region[]>> ();
/** The era of a book's chapter (atlas.db's era_books), "" none. */
const eraOf = (book: number, chapter: number) => eraBooks.find ((r) => r.book === book && chapter >= r.first && chapter <= r.last)?.era ?? "";
/** An era's regions in drawing order, read once. */
function regionsOf (era: string): Promise<Region[]> {
  if (! regionsRead.has (era)) regionsRead.set (era, placesDb!.all ("SELECT name, color, lon, lat, data FROM era_regions WHERE era = ? ORDER BY rowid", [era])
    .then ((rows) => rows.map ((r) => {
      const d = r.data as unknown as Uint8Array;
      let path: Path2D | null = null;
      if (d && d.length) { path = new Path2D (); addPaths (path, d); }
      return { name: String (r.name), color: Number (r.color), lon: Number (r.lon), lat: Number (r.lat), path };
    })));
  return regionsRead.get (era)!;
}

//==== ROUTES ====
/** A route's stop: its number (from 1), place, and the verse naming it. */
interface Stop { n: number; place: Place; book: number; chapter: number; verse: number; }
const stopsRead = new Map<string, Promise<Stop[]>> ();
/** A route's stops in order, read once. */
function stopsOf (route: string): Promise<Stop[]> {
  if (! stopsRead.has (route)) stopsRead.set (route, placesDb!.all (`SELECT s.n, s.book, s.chapter, s.verse, p.* FROM route_stops s
      JOIN places p ON p.id = s.place WHERE s.route = ? ORDER BY s.n`, [route])
    .then ((rows) => rows.map ((r) => ({ n: Number (r.n), place: asPlace (r), book: Number (r.book), chapter: Number (r.chapter), verse: Number (r.verse) }))));
  return stopsRead.get (route)!;
}
const unsure = (p: Place) => p.score < UNSURE;

/** A map: its canvas (.atlasMap), and under it (foot) BASE MAP's, POLITICAL BOUNDARIES' and ROUTE's pickers, the
 *  route's stops and the credits. context: the book and chapter it's for (the era, the base maps offered, the
 *  routes); set: its points, fitted (picked: the one marked; not refitted while a route shows); select: one picked
 *  (centered if out of view); onPick: a point tapped. */
function makeMap () {
  const wrap = el ("div", "atlasMap");
  const canvas = el ("canvas");
  const status = el ("p", "atlasStatus");
  wrap.append (canvas, status);
  const pickRow = el ("label", "field", "Base map");
  const picker = el ("select", "choose");
  pickRow.append (picker);
  const eraRow = el ("label", "field", "Political boundaries");
  const eraPick = el ("select", "choose");
  eraRow.append (eraPick);
  eraRow.hidden = true;
  const routeRow = el ("label", "field", "Route");
  const routePick = el ("select", "choose");
  routeRow.append (routePick);
  routeRow.hidden = true;
  const stopList = el ("div", "atlasList atlasStops");
  const credits = el ("p", "credit atlasCredit");     // (The base map's credit; the places' is the caller's)
  const eraCredit = el ("p", "credit atlasCredit");
  let pins: Pin[] = [], picked = "", cb: (id: string) => void = () => {};
  let cx = 35 * K, cy = -32, scale = 20;     // (The view: its center in the map's units, screen pixels a unit)
  let b: Base | null = null, loadingId = "", cur = "";     // (cur: the base map shown - mapId, or the first offered)
  let book = 0, era = "", regions: Region[] | null = null, route = "", stops: Stop[] | null = null;
  const me = { redraw: () => load () };
  const stopRows = new Map<string, HTMLElement[]> ();     // (A route's place -> its stops' rows)

  picker.addEventListener ("change", () => {
    mapId = picker.value;
    try { localStorage.setItem (MAP_KEY, mapId); } catch { /* private mode */ }
    for (const m of shown) m.redraw ();
  });
  eraPick.addEventListener ("change", () => {
    bordersOn = eraPick.value === "on";
    try { localStorage.setItem (BORDERS_KEY, bordersOn ? "1" : "0"); } catch { /* private mode */ }
    for (const m of shown) m.redraw ();
  });
  routePick.addEventListener ("change", () => {
    routePicked.set (book, routePick.value);
    load ();
  });

  /** The book and chapter shown: the era's regions read (for the switch), the book's routes offered. */
  function context (bk: number, chapter: number) {
    const e = eraOf (bk, chapter);
    if (e !== era) { era = e; regions = null; if (e) regionsOf (e).then ((r) => { if (era === e) { regions = r; draw (); } }); }
    if (bk !== book) {
      book = bk;
      const mine = routes.filter ((r) => r.books.includes (bk));
      routePick.replaceChildren (new Option ("None", ""), ...mine.map ((r) => new Option (r.name, r.id)));
      routeRow.hidden = ! mine.length;
    }
    load ();
  }

  /** The pickers set from the device's choices and the context, the route read, the base map read (its loading said
   *  over the map), then drawn. */
  function load () {
    if (! wrap.isConnected && b) { shown.delete (me); return; }     // (A map no longer shown: let go)
    // BASE MAP: the maps offered in the era; the one picked, else the first offered
    const offered = maps.filter ((m) => ! m.eras || (era && m.eras.split (" ").includes (era)));
    const id = offered.some ((m) => m.id === mapId) ? mapId : offered[0]?.id ?? "";
    if (picker.options.length !== offered.length || [...picker.options].some ((o, i) => o.value !== offered[i].id))
      picker.replaceChildren (...offered.map ((m) => new Option (m.name, m.id)));
    picker.value = id; cur = id;
    creditText (credits, maps.find ((m) => m.id === id)?.credit ?? "");
    // POLITICAL BOUNDARIES: Off or the era's
    const e = eras.get (era);
    eraRow.hidden = ! e;
    if (e) { eraPick.replaceChildren (new Option ("Off", "off"), new Option (e.name, "on")); eraPick.value = bordersOn ? "on" : "off"; }
    creditText (eraCredit, e && bordersOn ? e.credit : "");
    eraCredit.hidden = ! eraCredit.textContent;
    // ROUTE: the book's pick, else its first route (options[0] is None)
    const r = routeRow.hidden ? "" : routePicked.get (book) ?? routePick.options[1].value;
    routePick.value = r;
    if (r !== route) {
      route = r; stops = null; stopList.replaceChildren (); stopRows.clear ();
      if (r) stopsOf (r).then ((got) => { if (route === r) { stops = got; listStops (); fitStops (); draw (); } });
      else fit ();
    }
    if (b && loadingId === id) { draw (); return; }
    loadingId = id; b = null;
    status.textContent = "Loading map…";
    base (id, (f) => { if (loadingId === id) status.textContent = `Loading map… ${Math.round (f * 100)}%`; }).then ((got) => {
      if (loadingId !== id) return;
      b = got; status.textContent = "";
      draw ();
    }, () => { if (loadingId === id) status.textContent = "The map couldn't be loaded."; });
  }

  /** The route's stops listed: each its number and place over how sure its site is and the verse naming it. */
  function listStops () {
    stopRows.clear ();
    stopList.replaceChildren (...stops!.map ((s) => {
      const row = el ("div", "hit atlasRow");
      const head = el ("button", "src atlasName", `${s.n}. ${s.place.name}`);
      head.addEventListener ("click", () => select ("stop:" + s.place.id));
      const line = el ("span", "atlasVerses");
      if (s.place.lon === null) line.append (`${s.place.note || "Location unknown"} · `);
      else if (s.place.sub || unsure (s.place))
        line.append ([s.place.sub, unsure (s.place) ? `site uncertain (${sure (s.place.score)})` : ""].filter (Boolean).join (", ") + " · ");
      const a = el ("a", "term", `${s.chapter}:${s.verse}`);
      a.addEventListener ("click", () => goVerse (s.book, s.chapter, s.verse));
      line.append (a);
      row.append (head, line);
      stopRows.set (s.place.id, [...(stopRows.get (s.place.id) ?? []), row]);
      return row;
    }));
  }

  // ---- The view ----
  const size = () => ({ w: canvas.clientWidth, h: canvas.clientHeight });
  const minScale = () => { const { w, h } = size (); return Math.min (w / ((BOX[2] - BOX[0]) * K), h / (BOX[3] - BOX[1])); };
  /** The view kept on the map: zoomed out at most to the whole box, in at most to MAX_SCALE; centered within the box. */
  function clamp () {
    scale = Math.max (minScale (), Math.min (MAX_SCALE, scale));
    cx = Math.max (BOX[0] * K, Math.min (BOX[2] * K, cx));
    cy = Math.max (-BOX[3], Math.min (-BOX[1], cy));
  }
  /** The view fitted to points (lon, lat), a fifth of the size again round them, at least SPAN degrees tall. */
  function fitTo (pts: [number, number][]) {
    const { w, h } = size ();
    if (! w || ! h) return false;
    if (! pts.length) { cx = 35 * K; cy = -32; scale = 0; clamp (); return true; }
    const xs = pts.map ((p) => p[0] * K), ys = pts.map ((p) => -p[1]);
    const [x0, x1, y0, y1] = [Math.min (...xs), Math.max (...xs), Math.min (...ys), Math.max (...ys)];
    cx = (x0 + x1) / 2; cy = (y0 + y1) / 2;
    scale = Math.min (w / Math.max ((x1 - x0) * 1.4, SPAN * K * w / h), h / Math.max ((y1 - y0) * 1.4, SPAN));
    clamp ();
    return true;
  }
  /** Fitted to the points (not the faint ones, unless there are only those). */
  const fit = () => { const strong = pins.filter ((p) => ! p.faint); return fitTo ((strong.length ? strong : pins).map ((p) => [p.lon, p.lat])); };
  /** Fitted to the route's located stops. */
  const fitStops = () => fitTo (stops!.filter ((s) => s.place.lon !== null).map ((s) => [s.place.lon!, s.place.lat!]));
  const toScreen = (lon: number, lat: number) => { const { w, h } = size (); return [(lon * K - cx) * scale + w / 2, (-lat - cy) * scale + h / 2]; };

  // ---- Drawing ----
  let frame = 0;
  const draw = () => { if (! frame) frame = requestAnimationFrame (() => { frame = 0; paint (); }); };
  const css = getComputedStyle (wrap);     // (The map's own tokens: light in either mode - style.css' .atlasMap)
  const token = (name: string) => css.getPropertyValue (name).trim ();
  function paint () {
    const dpr = devicePixelRatio || 1, { w, h } = size ();
    if (! w || ! h) return;
    if (canvas.width !== Math.round (w * dpr) || canvas.height !== Math.round (h * dpr)) { canvas.width = Math.round (w * dpr); canvas.height = Math.round (h * dpr); }
    const ctx = canvas.getContext ("2d")!;
    ctx.setTransform (1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    const water = token ("--map-water"), land = token ("--map-land");
    ctx.fillStyle = cur === "awmc" ? land : water;
    ctx.fillRect (0, 0, canvas.width, canvas.height);
    const e = eras.get (era), showEra = bordersOn && !! e && !! regions;
    if (b) {
      // The coarsest level finer than a device pixel (the finest when closer still)
      const px = 1 / (scale * dpr);
      let level = LEVELS.findIndex ((t) => t <= px);
      if (level < 0) level = LEVELS.length - 1;
      const k = scale * dpr;
      ctx.setTransform (k, 0, 0, k, (w / 2 - cx * scale) * dpr, (h / 2 - cy * scale) * dpr);
      const fill = (layer: string, color: string, name = "") => { const p = pathOf (b!, layer, level, name); if (p) { ctx.fillStyle = color; ctx.fill (p, "evenodd"); } };
      const stroke = (layer: string, color: string, width: number, dash: number[] = [], name = "") => {
        const p = pathOf (b!, layer, level, name);
        if (! p) return;
        ctx.strokeStyle = color; ctx.lineWidth = width / scale; ctx.setLineDash (dash.map ((d) => d / scale));
        ctx.lineJoin = "round"; ctx.stroke (p);
        ctx.setLineDash ([]);
      };
      // The era's regions: each laid on the land's color first, so one drawn over another hides it (a kingdom inside
      // an empire), then its hue and outline - on the land alone (clipped to it, or under AWMC's water)
      const regionsDrawn = () => {
        const hues = HUES.map (token), border = token ("--map-border");
        for (const r of regions!) {
          if (! r.path) continue;
          ctx.globalAlpha = 1; ctx.fillStyle = land; ctx.fill (r.path);
          ctx.globalAlpha = .26; ctx.fillStyle = hues[r.color % hues.length]; ctx.fill (r.path);
          ctx.globalAlpha = .55; ctx.strokeStyle = border; ctx.lineWidth = .8 / scale; ctx.lineJoin = "round"; ctx.stroke (r.path);
        }
        ctx.globalAlpha = 1;
      };
      // (AWMC's roads: those the Barrington Atlas dates to the era's periods - the undated with the Roman; none
      // without an era. The other maps' roads are all drawn: DARE's shows only in Roman eras.)
      const roads = (color: string) => {
        for (const n of namesOf (b!, "road")) {
          if (cur === "awmc" && ! (e && ([...e.roads].some ((l) => n.includes (l)) || (n === "" && e.roads.includes ("R"))))) continue;
          stroke ("road", color, 1, [], n);
        }
      };
      if (cur === "awmc") {
        if (showEra) regionsDrawn ();
        fill ("water", water); fill ("lake", water);
        if (e?.roman && ! showEra) stroke ("border", token ("--map-border"), 1, [4, 3]);
        roads (token ("--map-road"));
      } else {
        fill ("land", land);
        const landPath = pathOf (b, "land", level);
        if (showEra && landPath) { ctx.save (); ctx.clip (landPath, "evenodd"); regionsDrawn (); ctx.restore (); }
        if (cur === "ne") {
          // (The relief over everything in soft-light: its flat ground is 128, which changes nothing)
          const r = b.relief.find ((x) => x.level === (k > 15 ? 1 : 0)) ?? b.relief[0];
          if (r) {
            ctx.globalCompositeOperation = "soft-light";
            ctx.drawImage (r.img, r.w * K, -r.n, (r.e - r.w) * K, r.n - r.s);
            ctx.globalCompositeOperation = "source-over";
          }
        }
        if (cur === "dare" && ! showEra) {
          const hues = HUES.map (token);
          ctx.globalAlpha = .22;
          namesOf (b, "province").forEach ((n, i) => fill ("province", hues[i % hues.length], n));
          ctx.globalAlpha = .5;
          for (const n of namesOf (b, "province")) {
            const p = pathOf (b, "province", level, n);
            if (p) { ctx.strokeStyle = token ("--map-border"); ctx.lineWidth = .8 / scale; ctx.stroke (p); }
          }
          ctx.globalAlpha = 1;
        }
        fill ("lake", water);
        stroke ("river", water, 1);
        roads (token ("--map-road"));
      }
    }
    // The route, the labels and points, in screen pixels
    ctx.setTransform (dpr, 0, 0, dpr, 0, 0);
    const taken: number[][] = [];
    const free = (r: number[]) => ! taken.some ((t) => r[0] < t[2] && r[2] > t[0] && r[1] < t[3] && r[3] > t[1]);
    const label = (text: string, x: number, y: number, color: string, font: string, center = false) => {
      ctx.font = font;
      const tw = ctx.measureText (text).width;
      const left = center ? x - tw / 2 : x;
      const r = [left - 2, y - 8, left + tw + 2, y + 8];
      if (r[0] < 0 || r[2] > w || r[1] < 0 || r[3] > h || ! free (r)) return false;
      taken.push (r);
      ctx.lineWidth = 3; ctx.strokeStyle = token ("--bg"); ctx.lineJoin = "round";
      ctx.textBaseline = "middle"; ctx.strokeText (text, left, y);
      ctx.fillStyle = color; ctx.fillText (text, left, y);
      return true;
    };
    const ui = token ("--ui"), accent = token ("--accent"), bg = token ("--bg");
    const at = pins.map ((p) => ({ p, xy: toScreen (p.lon, p.lat) }));
    const rank = (p: Pin) => (p.id === picked ? 3 : 0) + (p.faint ? 0 : p.main ? 2 : 1);
    const order = [...at].sort ((a, c) => rank (c.p) - rank (a.p));
    // The route: its legs (dashed to and from an uncertain site), an arrow halfway along each, its stops numbered
    const legs = (stops ?? []).filter ((s) => s.place.lon !== null).map ((s) => ({ s, xy: toScreen (s.place.lon!, s.place.lat!) }));
    const marks = new Map<string, { s: Stop; xy: number[]; more: number[] }> ();     // (Each place once: its first stop, then its later numbers)
    for (const l of legs) { const m = marks.get (l.s.place.id); if (m) m.more.push (l.s.n); else marks.set (l.s.place.id, { ...l, more: [] }); }
    for (const m of marks.values ()) taken.push ([m.xy[0] - 8, m.xy[1] - 8, m.xy[0] + 8, m.xy[1] + 8]);
    for (const { p, xy } of order) if (! p.faint) taken.push ([xy[0] - 5, xy[1] - 5, xy[0] + 5, xy[1] + 5]);
    if (legs.length) {
      ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2; ctx.lineJoin = "round";
      for (let i = 1; i < legs.length; i++) {
        const [a, c] = [legs[i - 1], legs[i]], dx = c.xy[0] - a.xy[0], dy = c.xy[1] - a.xy[1], len = Math.hypot (dx, dy);
        if (len < 1) continue;
        ctx.setLineDash (unsure (a.s.place) || unsure (c.s.place) ? [5, 4] : []);
        ctx.beginPath (); ctx.moveTo (a.xy[0], a.xy[1]); ctx.lineTo (c.xy[0], c.xy[1]); ctx.stroke ();
        ctx.setLineDash ([]);
        if (len > 30) {     // (An arrow where the leg is long enough to show one clear of its stops)
          const ux = dx / len, uy = dy / len, mx = (a.xy[0] + c.xy[0]) / 2 + ux * 4, my = (a.xy[1] + c.xy[1]) / 2 + uy * 4;
          ctx.beginPath (); ctx.moveTo (mx, my); ctx.lineTo (mx - ux * 9 - uy * 5, my - uy * 9 + ux * 5);
          ctx.lineTo (mx - ux * 9 + uy * 5, my - uy * 9 - ux * 5); ctx.closePath (); ctx.fill ();
        }
      }
    }
    for (const { p, xy } of [...order].reverse ()) {     // (The faint first, so the verses' points sit over them)
      ctx.beginPath ();
      ctx.arc (xy[0], xy[1], p.id === picked ? 6 : p.faint ? 3 : p.main ? 4.5 : 4, 0, 2 * Math.PI);
      ctx.lineWidth = p.faint ? 1 : 2;
      if (p.faint && p.id !== picked) { ctx.fillStyle = token ("--soft"); ctx.strokeStyle = bg; ctx.fill (); ctx.stroke (); }
      else if (p.main) { ctx.fillStyle = accent; ctx.strokeStyle = bg; ctx.fill (); ctx.stroke (); }
      else { ctx.strokeStyle = accent; ctx.stroke (); }
    }
    for (const { s, xy } of marks.values ()) {     // (A stop: its number in a disc - hollow where the site's uncertain)
      const on = picked === "stop:" + s.place.id, hollow = unsure (s.place);
      ctx.beginPath (); ctx.arc (xy[0], xy[1], on ? 9 : 8, 0, 2 * Math.PI);
      ctx.lineWidth = 2; ctx.fillStyle = hollow ? bg : accent; ctx.strokeStyle = hollow ? accent : bg;
      ctx.fill (); ctx.stroke ();
      ctx.font = `600 10px ${ui}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = hollow ? accent : bg; ctx.fillText (String (s.n), xy[0], xy[1] + .5);
      ctx.textAlign = "start";
    }
    for (const { s, xy, more } of marks.values ()) {     // (Its name, right of it else left, its later numbers beside)
      const text = s.place.name + (more.length ? ` · ${more.join (", ")}` : "");
      const font = `${picked === "stop:" + s.place.id ? 600 : 500} 12px ${ui}`;
      ctx.font = font;
      label (text, xy[0] + 12, xy[1], token ("--fg"), font) || label (text, xy[0] - 12 - ctx.measureText (text).width, xy[1], token ("--fg"), font);
    }
    // The places' names, right of each point else left of it - the book's faint places' after the regions' names
    const named = ({ p, xy }: { p: Pin; xy: number[] }) => {
      const font = `${p.id === picked ? 600 : 400} ${p.faint && p.id !== picked ? 11 : 12}px ${ui}`;
      const color = p.main && ! (p.faint && p.id !== picked) ? token ("--fg") : token ("--soft");
      ctx.font = font;
      label (p.name, xy[0] + 8, xy[1], color, font) || label (p.name, xy[0] - 8 - ctx.measureText (p.name).width, xy[1], color, font);
    };
    order.filter (({ p }) => ! p.faint || p.id === picked).forEach (named);
    if (showEra)     // (The era's regions' names, where they fit after the places')
      for (const r of regions!) {
        const [x, y] = toScreen (r.lon, r.lat);
        label (r.name.toUpperCase (), x, y, token ("--soft"), `600 10px ${ui}`, true);
      }
    order.filter (({ p }) => p.faint && p.id !== picked).forEach (named);
    if (! showEra && b && cur === "dare")     // (The provinces' names, where they fit after the places')
      for (const r of b.labels) {
        const [x, y] = toScreen (Number (r.lon), Number (r.lat));
        label (String (r.name).toUpperCase (), x, y, token ("--soft"), `10px ${ui}`, true);
      }
  }

  // ---- Moving it: drag to pan, pinch or wheel to zoom, tap a point (or a route's stop) to pick it ----
  const down = new Map<number, [number, number]> ();
  let moved = 0;
  const local = (e: PointerEvent | WheelEvent): [number, number] => { const r = box (canvas); return [px (e.clientX) - r.left, px (e.clientY) - r.top]; };     // (CSS px, as its clientWidth: zoom.ts)
  /** Zoomed by f about a screen point, so what's under it stays. */
  const zoomAt = (x: number, y: number, f: number) => {
    const { w, h } = size ();
    const ux = cx + (x - w / 2) / scale, uy = cy + (y - h / 2) / scale;
    scale *= f; clamp ();
    cx = ux - (x - w / 2) / scale; cy = uy - (y - h / 2) / scale; clamp ();
  };
  canvas.addEventListener ("pointerdown", (e) => { canvas.setPointerCapture (e.pointerId); down.set (e.pointerId, local (e)); if (down.size === 1) moved = 0; });
  canvas.addEventListener ("pointermove", (e) => {
    const was = down.get (e.pointerId);
    if (! was) return;
    const now = local (e);
    if (down.size === 1) {
      cx -= (now[0] - was[0]) / scale; cy -= (now[1] - was[1]) / scale; clamp ();
    } else {
      const other = [...down.entries ()].find (([id]) => id !== e.pointerId)![1];
      const d0 = Math.hypot (was[0] - other[0], was[1] - other[1]), d1 = Math.hypot (now[0] - other[0], now[1] - other[1]);
      if (d0 > 0) zoomAt ((now[0] + other[0]) / 2, (now[1] + other[1]) / 2, d1 / d0);
    }
    moved += Math.hypot (now[0] - was[0], now[1] - was[1]);
    down.set (e.pointerId, now);
    draw ();
  });
  const up = (e: PointerEvent) => {
    if (! down.delete (e.pointerId) || down.size || moved > 6 || e.type !== "pointerup") return;
    const [x, y] = local (e);
    let best = "", dist = 20;
    const near = (id: string, lon: number, lat: number) => { const [px, py] = toScreen (lon, lat); const d = Math.hypot (px - x, py - y); if (d < dist) { dist = d; best = id; } };
    for (const s of stops ?? []) if (s.place.lon !== null) near ("stop:" + s.place.id, s.place.lon, s.place.lat!);
    for (const p of pins) near (p.id, p.lon, p.lat);
    if (best) pick (best);
  };
  /** A point or stop picked: marked, and its row (the caller's, or the route's stops') picked out. */
  function pick (id: string) {
    picked = id; draw ();
    for (const [k, rows] of stopRows) for (const r of rows) r.classList.toggle ("on", "stop:" + k === id);
    if (id.startsWith ("stop:")) stopRows.get (id.slice (5))?.[0]?.scrollIntoView ({ block: "nearest" });
    else cb (id);
  }
  /** One picked from a list: centered if out of view. */
  function select (id: string) {
    const s = id.startsWith ("stop:") ? stops?.find ((x) => "stop:" + x.place.id === id)?.place : null;
    const p = s && s.lon !== null ? { lon: s.lon, lat: s.lat! } : pins.find ((x) => x.id === id);
    if (p) { const [x, y] = toScreen (p.lon, p.lat), { w, h } = size (); if (x < 0 || y < 0 || x > w || y > h) { cx = p.lon * K; cy = -p.lat; clamp (); } }
    pick (id);
  }
  canvas.addEventListener ("pointerup", up);
  canvas.addEventListener ("pointercancel", up);
  canvas.addEventListener ("wheel", (e) => { e.preventDefault (); const [x, y] = local (e); zoomAt (x, y, Math.exp (-e.deltaY * .002)); draw (); }, { passive: false });
  let fitted = false;
  const refit = () => (stops ? fitStops () : fit ());
  new ResizeObserver (() => { if (! fitted) fitted = refit (); else clamp (); draw (); }).observe (wrap);

  shown.add (me);
  return {
    el: wrap,
    foot: [pickRow, eraRow, routeRow, stopList, credits, eraCredit],
    context,
    set (p: Pin[], pickId = "") { pins = p; picked = pickId; if (! stops) fitted = fit (); load (); },
    select,
    onPick (f: (id: string) => void) { cb = f; },
  };
}
