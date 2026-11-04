// The Atlas (pipeline/atlas.py: its sources, matching and files): the Bible's places on a map, drawn here on a canvas
// from the shipped files - no tiles, no map library, offline once downloaded.
// - BY WORD: a word naming a place shows "Map" in its panel (panel.ts) - the map over the word's info as the Verb chart
//   is (grammar.ts' showOther), the place marked and named, the other sites proposed for it as hollow points, how sure
//   the identification is (OpenBible's score: the share of current scholarship behind the site) and the others with
//   theirs (wordMap).
// - BY PASSAGE: "Atlas" in the notes' picker (notes.ts, its own MAPS group): the places named in the verses the notes
//   show (narrow the verse, wide the chapter), each a point with its name, listed under the map with the verses naming
//   it - a place tapped (on the map or in the list) picked out on both, a verse tapped going there (passageMap).
// - BASE MAPS: Natural Earth, Ancient World (AWMC) and Roman Empire (DARE), picked under the map (BASE MAP, kept on
//   the device; every map shown follows it), each its own file downloaded the first time it's shown and kept (db.ts'
//   openNotesDb), its credit under the map. The places' file, data/notes/atlas.db, is the main database's note_sources
//   row 'atlas' (kind 'atlas'); it's read the first time a word is tapped (to know whether it names a place).
// - THE MAP: an equirectangular projection (a degree of longitude cos 33° of a degree of latitude: true to shape across
//   the Levant), fitted to the points shown with a margin, at least SPAN degrees tall (a lone town shows its region);
//   dragged to pan, pinched or wheeled to zoom, kept within the files' box. Each base map's shapes come at four levels of
//   detail (atlas.py's LEVELS): the coarsest finer than a screen pixel is drawn, never more points than the screen shows;
//   each level's paths built once (Path2D) and redrawn under a transform as it moves. Names are drawn where they fit, the
//   picked place's first. Colors from style.css' tokens (--map-*, the accent; the provinces in the verb colors).

import { openNotesDb, type Db, type Row } from "./db";

const K = Math.cos (33 * Math.PI / 180);     // (A degree of longitude, in degrees of latitude)
const BOX = [-12, 4, 64, 50];                 // (The base maps' box, west south east north: atlas.py's BOX)
const LEVELS = [0.05, 0.015, 0.004, 0.001];   // (atlas.py's: each level's tolerance, in degrees)
const SPAN = 1.6;                             // (A fitted map at least this many degrees tall)
const MAX_SCALE = 1500;                       // (The closest zoom: screen pixels a degree)
const MAP_KEY = "cotext.atlas.map";

let file: Promise<Db | null> | null = null;
let credit = "";
let maps: { id: string; name: string; credit: string; file: string; version: string }[] = [];
let mapId = "ne";
try { mapId = localStorage.getItem (MAP_KEY) ?? "ne"; } catch { /* private mode */ }
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
    maps = (await db.all ("SELECT id, name, credit, file, version FROM maps ORDER BY rowid")) as unknown as typeof maps;
    if (! maps.some ((m) => m.id === mapId)) mapId = maps[0]?.id ?? "";
    return db;
  });
  file.catch (() => { file = null; });
  return file;
}

/** A place as the map shows it: its point (null: not located), how sure (0-1000), the other sites proposed. */
export interface Place { id: string; name: string; sub: string; type: string; lon: number | null; lat: number | null;
                         score: number; alts: [string, number, number, number][]; note: string; }
const asPlace = (r: Row): Place => ({ id: String (r.id), name: String (r.name), sub: String (r.sub ?? ""), type: String (r.type ?? ""),
  lon: r.lon === null ? null : Number (r.lon), lat: r.lat === null ? null : Number (r.lat), score: Number (r.score),
  alts: r.alts ? JSON.parse (String (r.alts)) : [], note: String (r.note ?? "") });

/** The place a word of the text names (its book, chapter, verse and number in the verse), or null. */
export async function placeOf (main: Db, where: number[]): Promise<Place | null> {
  try {
    const db = await atlas (main);
    const [r] = db ? await db.all (`SELECT p.* FROM words w JOIN places p ON p.id = w.place
                                    WHERE w.book = ? AND w.chapter = ? AND w.verse = ? AND w.word = ?`, where) : [];
    return r ? asPlace (r) : null;
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
  const rows = new Map<string, HTMLElement> ();
  view.onPick ((id) => { for (const [k, r] of rows) r.classList.toggle ("on", k === id); rows.get (id)?.scrollIntoView ({ block: "nearest" }); });
  async function update (b: number, c: number, per: { v: number; where: number[][] }[], none: string): Promise<boolean> {
    book = b; chapter = c;
    const db = await atlas (main);
    if (! db) return false;
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
    view.set (named.filter ((n) => n.place.lon !== null).map (({ place }) => ({ id: place.id, name: place.name, lon: place.lon!, lat: place.lat!, main: true })));
    return named.length > 0;
  }
  return { el: box, update };
}

//==== THE MAP ====
interface Pin { id: string; name: string; lon: number; lat: number; main: boolean; }
interface Base { shapes: Row[]; labels: Row[]; relief: { level: number; w: number; s: number; e: number; n: number; img: HTMLImageElement }[];
                 paths: Map<string, Path2D | null>; }
const bases = new Map<string, Promise<Base>> ();     // (Each base map, once read: shared by every map shown)
const shown = new Set<{ redraw: () => void; picker: HTMLSelectElement }> ();     // (Every map on screen: BASE MAP changes them all)

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

/** A layer's paths at a level (a province's: by its name) as one Path2D in the map's units (x = longitude * K, y = -
 *  latitude), built the first time it's drawn: atlas.py's encode read back - each path its point count, then each
 *  point's change from the last, at 1/1000 degree, as zigzag varints. null: the layer has nothing at that level. */
function pathOf (b: Base, layer: string, level: number, name = ""): Path2D | null {
  const key = `${layer}|${level}|${name}`;
  if (b.paths.has (key)) return b.paths.get (key)!;
  let p: Path2D | null = null;
  for (const r of b.shapes) {
    if (r.layer !== layer || Number (r.level) !== level || (name && r.name !== name)) continue;
    p ??= new Path2D ();
    const d = r.data as unknown as Uint8Array;
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
  b.paths.set (key, p);
  return p;
}

/** The names a base map's layer has at any level (its provinces). */
const namesOf = (b: Base, layer: string) => [...new Set (b.shapes.filter ((r) => r.layer === layer).map ((r) => String (r.name)))];

/** A map: its canvas (.atlasMap), and under it (foot) BASE MAP's picker and the credits. set: its points, fitted
 *  (picked: the one marked); select: one picked (centered if out of view); onPick: a point tapped. */
function makeMap () {
  const wrap = el ("div", "atlasMap");
  const canvas = el ("canvas");
  const status = el ("p", "atlasStatus");
  wrap.append (canvas, status);
  const pickRow = el ("label", "sheetPick", "Base map");
  const picker = el ("select", "choose");
  pickRow.append (picker);
  const credits = el ("p", "credit atlasCredit");     // (The base map's credit; the places' is the caller's)
  let pins: Pin[] = [], picked = "", cb: (id: string) => void = () => {};
  let cx = 35 * K, cy = -32, scale = 20;     // (The view: its center in the map's units, screen pixels a unit)
  let b: Base | null = null, loadingId = "";
  const me = { redraw: () => load (), picker };

  picker.addEventListener ("change", () => {
    mapId = picker.value;
    try { localStorage.setItem (MAP_KEY, mapId); } catch { /* private mode */ }
    for (const m of shown) { m.picker.value = mapId; m.redraw (); }
  });
  /** The base map picked, read (its loading said over the map), then drawn. */
  function load () {
    const id = mapId;
    if (! wrap.isConnected && b) { shown.delete (me); return; }     // (A map no longer shown: let go)
    if (! picker.options.length) picker.append (...maps.map ((m) => new Option (m.name, m.id)));     // (The places' file read by now: its list of base maps)
    picker.value = id;
    credits.textContent = maps.find ((m) => m.id === id)?.credit ?? "";
    if (b && loadingId === id) { draw (); return; }
    loadingId = id; b = null;
    status.textContent = "Loading map…";
    base (id, (f) => { if (loadingId === id) status.textContent = `Loading map… ${Math.round (f * 100)}%`; }).then ((got) => {
      if (loadingId !== id) return;
      b = got; status.textContent = "";
      draw ();
    }, () => { if (loadingId === id) status.textContent = "The map couldn't be loaded."; });
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
  /** The view fitted to the points, a fifth of the size again round them, at least SPAN degrees tall. */
  function fit () {
    const { w, h } = size ();
    if (! w || ! h) return;
    const xs = pins.map ((p) => p.lon * K), ys = pins.map ((p) => -p.lat);
    if (! pins.length) { cx = 35 * K; cy = -32; scale = 0; clamp (); return; }
    const [x0, x1, y0, y1] = [Math.min (...xs), Math.max (...xs), Math.min (...ys), Math.max (...ys)];
    cx = (x0 + x1) / 2; cy = (y0 + y1) / 2;
    scale = Math.min (w / Math.max ((x1 - x0) * 1.4, SPAN * K * w / h), h / Math.max ((y1 - y0) * 1.4, SPAN));
    clamp ();
  }
  const toScreen = (lon: number, lat: number) => { const { w, h } = size (); return [(lon * K - cx) * scale + w / 2, (-lat - cy) * scale + h / 2]; };

  // ---- Drawing ----
  let frame = 0;
  const draw = () => { if (! frame) frame = requestAnimationFrame (() => { frame = 0; paint (); }); };
  const css = getComputedStyle (document.documentElement);
  const token = (name: string) => css.getPropertyValue (name).trim ();
  function paint () {
    const dpr = devicePixelRatio || 1, { w, h } = size ();
    if (! w || ! h) return;
    if (canvas.width !== Math.round (w * dpr) || canvas.height !== Math.round (h * dpr)) { canvas.width = Math.round (w * dpr); canvas.height = Math.round (h * dpr); }
    const ctx = canvas.getContext ("2d")!;
    ctx.setTransform (1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    const water = token ("--map-water"), land = token ("--map-land");
    ctx.fillStyle = mapId === "awmc" ? land : water;
    ctx.fillRect (0, 0, canvas.width, canvas.height);
    if (b) {
      // The coarsest level finer than a device pixel (the finest when closer still)
      const px = 1 / (scale * dpr);
      let level = LEVELS.findIndex ((t) => t <= px);
      if (level < 0) level = LEVELS.length - 1;
      const k = scale * dpr;
      ctx.setTransform (k, 0, 0, k, (w / 2 - cx * scale) * dpr, (h / 2 - cy * scale) * dpr);
      const fill = (layer: string, color: string, name = "") => { const p = pathOf (b!, layer, level, name); if (p) { ctx.fillStyle = color; ctx.fill (p, "evenodd"); } };
      const stroke = (layer: string, color: string, width: number, dash: number[] = []) => {
        const p = pathOf (b!, layer, level);
        if (! p) return;
        ctx.strokeStyle = color; ctx.lineWidth = width / scale; ctx.setLineDash (dash.map ((d) => d / scale));
        ctx.lineJoin = "round"; ctx.stroke (p);
        ctx.setLineDash ([]);
      };
      if (mapId === "awmc") {
        fill ("water", water); fill ("lake", water);
        stroke ("border", token ("--map-border"), 1, [4, 3]);
        stroke ("road", token ("--map-road"), 1);
      } else {
        fill ("land", land);
        if (mapId === "ne") {
          // (The relief over everything in soft-light: its flat ground is 128, which changes nothing)
          const r = b.relief.find ((x) => x.level === (k > 15 ? 1 : 0)) ?? b.relief[0];
          if (r) {
            ctx.globalCompositeOperation = "soft-light";
            ctx.drawImage (r.img, r.w * K, -r.n, (r.e - r.w) * K, r.n - r.s);
            ctx.globalCompositeOperation = "source-over";
          }
        }
        if (mapId === "dare") {
          const hues = ["--qal", "--piel", "--pual", "--hiphil", "--niphal", "--hithpael", "--other"].map (token);
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
        stroke ("road", token ("--map-road"), 1);
      }
    }
    // The labels and points, in screen pixels
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
    const ui = token ("--ui");
    const at = pins.map ((p) => ({ p, xy: toScreen (p.lon, p.lat) }));
    const order = [...at].sort ((a, c) => Number (c.p.id === picked) - Number (a.p.id === picked) || Number (c.p.main) - Number (a.p.main));
    for (const { xy } of order) taken.push ([xy[0] - 5, xy[1] - 5, xy[0] + 5, xy[1] + 5]);
    for (const { p, xy } of at) {
      ctx.beginPath ();
      ctx.arc (xy[0], xy[1], p.id === picked ? 6 : p.main ? 4.5 : 4, 0, 2 * Math.PI);
      ctx.lineWidth = 2;
      if (p.main) { ctx.fillStyle = token ("--accent"); ctx.strokeStyle = token ("--bg"); ctx.fill (); ctx.stroke (); }
      else { ctx.strokeStyle = token ("--accent"); ctx.stroke (); }
    }
    for (const { p, xy } of order) {     // (Right of its point, else left of it)
      const font = `${p.id === picked ? 600 : 400} 12px ${ui}`, color = p.main ? token ("--fg") : token ("--soft");
      ctx.font = font;
      label (p.name, xy[0] + 8, xy[1], color, font) || label (p.name, xy[0] - 8 - ctx.measureText (p.name).width, xy[1], color, font);
    }
    if (b && mapId === "dare")     // (The provinces' names, where they fit after the places')
      for (const r of b.labels) {
        const [x, y] = toScreen (Number (r.lon), Number (r.lat));
        label (String (r.name).toUpperCase (), x, y, token ("--soft"), `10px ${ui}`, true);
      }
  }

  // ---- Moving it: drag to pan, pinch or wheel to zoom, tap a point to pick it ----
  const down = new Map<number, [number, number]> ();
  let moved = 0;
  const local = (e: PointerEvent | WheelEvent): [number, number] => { const r = canvas.getBoundingClientRect (); return [e.clientX - r.left, e.clientY - r.top]; };
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
    for (const p of pins) { const [px, py] = toScreen (p.lon, p.lat); const d = Math.hypot (px - x, py - y); if (d < dist) { dist = d; best = p.id; } }
    if (best) { picked = best; draw (); cb (best); }
  };
  canvas.addEventListener ("pointerup", up);
  canvas.addEventListener ("pointercancel", up);
  canvas.addEventListener ("wheel", (e) => { e.preventDefault (); const [x, y] = local (e); zoomAt (x, y, Math.exp (-e.deltaY * .002)); draw (); }, { passive: false });
  let fitted = false;
  new ResizeObserver (() => { if (! fitted) { fit (); fitted = size ().w > 0; } else clamp (); draw (); }).observe (wrap);

  shown.add (me);
  return {
    el: wrap,
    foot: [pickRow, credits],
    set (p: Pin[], pick = "") { pins = p; picked = pick; fit (); fitted = size ().w > 0; load (); },
    select (id: string) {
      picked = id;
      const p = pins.find ((x) => x.id === id);
      if (p) { const [x, y] = toScreen (p.lon, p.lat), { w, h } = size (); if (x < 0 || y < 0 || x > w || y > h) { cx = p.lon * K; cy = -p.lat; clamp (); } }
      draw (); cb (id);
    },
    onPick (f: (id: string) => void) { cb = f; },
  };
}
