// The Timeline (☰ > Timeline; pipeline/timeline.py: its source, lanes and matching): the Bible's people and events on
// one time line, drawn on a canvas from the shipped file (data/notes/timeline.db, downloaded the first time).
// - LANES, side by side: patriarchs and judges, the kings of Israel, the kings of Judah, the prophets, the empires (the
//   Atlas' eras), Jesus and the apostles - each item a bar from its start to its end (a dot for a day), named beside
//   it; where names would overlap an item moves to the lane's next row, and one with no room left shows as a short
//   tick at the lane's edge until zoomed in. Lane hues are the verb colors; the accent is kept for "you are here".
// - TIME runs top to bottom on a narrow screen (under 600 px wide: the lanes columns, the years down the left), left to
//   right on a wide one (the lanes rows, the years along the top). Dragged to move along it, pinched or wheeled to zoom
//   - from the whole Bible (creation to Revelation) down to a couple of years across; a sideways wheel or trackpad moves.
// - YOU ARE HERE: the chapter being read (here: its year, after Theographic's verse years, on the item with most of its
//   verses) marked by a line across the lanes, the items with a verse in it in the accent; opening the timeline
//   starts there (about 120 years across), else on the whole Bible. Opened from a word's panel (showTimelineAt), it
//   starts on that person's item instead, the item picked out.
// - An item tapped goes to its first verse in the text (the screen closes); an empire to its first chapter.
// - Dates follow Theographic (Floyd Nolen Jones's chronology, after Ussher), said in one line over the timeline: before
//   the kings approximate and disputed. Every date is shown "c." (span: the word panel's line, written by the pipeline).
// - BY WORD (panel.ts): personOf gives a word's person line ("Hezekiah: king of Judah, c. 726-697 BC") and item.

import { openNotesDb, type Db } from "./db";
import { onScreen, openScreen, closeScreen } from "./study";

interface Item { id: number; lane: number; label: string; title: string; start: number; end: number;
                 book: number; chapter: number; verse: number; }
interface Data { db: Db; lanes: string[]; items: Item[]; credit: string; }

const NARROW = 600;           // (Under this canvas width: time top to bottom)
const FIRST = -4100, LAST = 150;     // (The years the view is kept within, ISO astronomical: -4003 is 4004 BC)
const MIN_SPAN = 2;           // (The closest zoom: years across)
const HERE_SPAN = 120;        // (Opened on the chapter read: years across)
/** Each lane's hue (style.css' verb colors): the accent is "you are here"'s alone. */
const HUES = ["--qal", "--piel", "--pual", "--niphal", "--other", "--hiphil"];
const BANDS = 4;              // (The empires' lane: one after another, each named within its own span)

let main: Db | null = null;
let file: Promise<Data | null> | null = null;
let placeNow: () => [number, number] = () => [0, 0];
let goVerse: (book: number, chapter: number, verse: number) => void = () => {};
let focus = -1;               // (An item to open on - a word panel's person; -1 the chapter read)

/** main.ts: the database, where the reader is (book id, chapter) and how a tapped item goes to its verse. */
export function initTimeline (db: Db, where: () => [number, number], go: (book: number, chapter: number, verse: number) => void) {
  main = db; placeNow = where; goVerse = go;
}

/** The timeline's file, opened (downloaded the first time) on the first call; null when the database lists none. A
 *  failed download is tried again on the next call. */
function data (): Promise<Data | null> {
  if (! main) return Promise.resolve (null);
  const m = main;
  file ??= m.all ("SELECT file, version, credit FROM note_sources WHERE id = 'timeline'").then (async ([r]) => {
    if (! r) return null;
    const db = await openNotesDb ("timeline", String (r.file), String (r.version), () => {});
    const [l, it] = await Promise.all ([db.all ("SELECT name FROM lanes ORDER BY id"),
      db.all ("SELECT id, lane, label, title, start, \"end\", book, chapter, verse FROM items ORDER BY id")]);
    return { db, lanes: l.map ((x) => String (x.name)), credit: String (r.credit),
             items: it.map ((x) => ({ id: Number (x.id), lane: Number (x.lane), label: String (x.label), title: String (x.title),
               start: Number (x.start), end: Number (x.end), book: Number (x.book), chapter: Number (x.chapter), verse: Number (x.verse) })) };
  });
  file.catch (() => { file = null; });
  return file;
}

/** The person a word names (its book, chapter, verse and number in the verse), as the word panel shows it: the line
 *  ("Hezekiah: king of Judah, c. 726-697 BC") and the item the Timeline button opens on; null for none (or offline the
 *  first time). */
export async function personOf (where: number[]): Promise<{ item: number; line: string } | null> {
  try {
    const d = await data ();
    const [r] = d ? await d.db.all (`SELECT i.id, i.person FROM words w JOIN items i ON i.id = w.item
                                     WHERE w.book = ? AND w.chapter = ? AND w.verse = ? AND w.word = ?`, where) : [];
    return r && r.person ? { item: Number (r.id), line: String (r.person) } : null;
  } catch {
    return null;
  }
}

/** The timeline opened on an item (a word panel's Timeline). */
export function showTimelineAt (item: number) {
  focus = item;
  openScreen ("Timeline");
}

const el = <K extends keyof HTMLElementTagNameMap> (tag: K, cls = "", text = "") => {
  const e = document.createElement (tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** A year as the axis says it: 1000 BC, AD 30 (y: the historical year, negative BC, no year 0). */
const yearText = (y: number) => (y < 0 ? `${-y} BC` : `AD ${y}`);

//==== THE SCREEN ====
onScreen ("Timeline", async (body) => {
  const opened = focus;
  focus = -1;
  body.append (el ("p", "timelineNote", "Dates follow Floyd Nolen Jones's chronology (after Ussher); before the kings they are approximate and disputed."));
  const wrap = el ("div", "timeline");
  const canvas = el ("canvas");
  const status = el ("p", "timelineStatus", "Loading the timeline…");
  wrap.append (canvas, status);
  const credit = el ("p", "credit");
  body.append (wrap, credit);
  let d: Data | null = null;
  try { d = await data (); } catch { /* offline the first time */ }
  if (! d) { status.textContent = "The timeline isn't available offline until it's been opened once online."; return; }
  status.textContent = "";
  credit.textContent = d.credit;
  const D = d;

  // Where the reader is: its year and items
  const [book, chapter] = placeNow ();
  const [h] = await D.db.all ("SELECT year, items FROM here WHERE book = ? AND chapter = ?", [book, chapter]);
  const hereYear = h && h.year !== null ? Number (h.year) : null;
  const hereItems = new Set (h ? String (h.items).split (" ").filter (Boolean).map (Number) : []);
  const picked = D.items.find ((i) => i.id === opened) ?? null;

  // The view: its middle year and how many years it spans across the time axis
  let mid = (FIRST + LAST) / 2, span = LAST - FIRST;
  if (picked) { span = Math.max (40, (picked.end - picked.start) * 2.2); mid = (picked.start + picked.end) / 2; }
  else if (hereYear !== null) { span = HERE_SPAN; mid = hereYear; }

  const ctx = canvas.getContext ("2d")!;
  let hits: { x: number; y: number; w: number; h: number; item: Item }[] = [];
  /** The canvas' size and layout: vertical (time down), the time axis' start (off) and length (len), the lanes'. */
  function geometry () {
    const w = wrap.clientWidth, hh = wrap.clientHeight;
    const vertical = w < NARROW;
    const gutter = vertical ? 42 : 22;     // (The years' labels: a column at the left, or a row along the top)
    const head = vertical ? 36 : 0;        // (Narrow: the lanes' names in a row over the columns)
    const off = vertical ? head : 0, len = vertical ? hh - head : w;
    const cross0 = gutter, crossLen = (vertical ? w : hh) - gutter;
    return { w, h: hh, vertical, gutter, head, off, len, cross0, lane: crossLen / D.lanes.length };
  }
  function clamp () {
    span = Math.min (Math.max (span, MIN_SPAN), LAST - FIRST);
    mid = Math.min (Math.max (mid, FIRST + span / 2), LAST - span / 2);
  }

  function draw () {
    const g = geometry ();
    if (! g.w || ! g.h) return;
    clamp ();
    const dpr = devicePixelRatio || 1;
    canvas.width = Math.round (g.w * dpr); canvas.height = Math.round (g.h * dpr);
    ctx.setTransform (dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle (document.documentElement);
    const token = (n: string) => css.getPropertyValue (n).trim ();
    const fg = token ("--fg"), soft = token ("--soft"), edge = token ("--edge"), accent = token ("--accent"), ui = token ("--ui");
    const hues = HUES.map (token);
    ctx.clearRect (0, 0, g.w, g.h);
    const k = g.len / span, t0 = mid - span / 2;
    const at = (t: number) => g.off + (t - t0) * k;     // (A year's place along the time axis)
    /** A rectangle given along (time) and across, as the canvas has it. */
    const rect = (a: number, alen: number, c: number, clen: number) =>
      g.vertical ? { x: c, y: a, w: clen, h: alen } : { x: a, y: c, w: alen, h: clen };

    // ---- The years: a tick every round step, at least 64 px apart (44 down a narrow screen) ----
    const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
    const step = steps.find ((s) => s * k >= (g.vertical ? 44 : 64)) ?? 1000;
    ctx.font = `${g.vertical ? 10 : 11}px ${ui}`;
    ctx.lineWidth = 1;
    for (let y = Math.floor ((t0 - 1) / step) * step; y <= t0 + span + step; y += step) {
      if (y === 0) continue;
      const p = at (y < 0 ? y + 1 : y);     // (Historical year to ISO: 1 BC is 0)
      if (p < g.off || p > g.off + g.len) continue;
      ctx.strokeStyle = edge; ctx.beginPath ();
      if (g.vertical) { ctx.moveTo (g.gutter, p); ctx.lineTo (g.w, p); } else { ctx.moveTo (p, g.gutter); ctx.lineTo (p, g.h); }
      ctx.stroke ();
      ctx.fillStyle = soft;
      if (g.vertical) { ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.fillText (yearText (y), g.gutter - 4, p); }
      else { ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText (yearText (y), p + 3, g.gutter / 2); }
    }

    // ---- The lanes' names (narrow: each in its column, as big as fits - 10 to 8 px - on up to three lines) ----
    ctx.fillStyle = soft; ctx.textBaseline = "top"; ctx.textAlign = "left";
    D.lanes.forEach ((name, n) => {
      const c = g.cross0 + n * g.lane;
      if (! g.vertical) { ctx.font = `600 10px ${ui}`; ctx.fillText (name.toUpperCase (), 4, c + 4); return; }
      const lines = fitText (name, g.lane - 4, `600 {}px ${ui}`, 10, 8);
      lines.slice (0, 3).forEach ((t, i) => ctx.fillText (t, c + 2, 2 + i * 11));
    });

    // ---- The items: packed into each lane's rows - most telling first (the picked one, the chapter's, the longest) ----
    const rowSize = g.vertical ? Math.max (g.lane, 1) : 30;
    const top = g.vertical ? 0 : 18;     // (Wide: the lane's name over its rows)
    const rows = Math.max (1, Math.floor ((g.lane - top) / rowSize));
    const used: [number, number][][][] = D.lanes.map (() => Array.from ({ length: rows }, () => []));
    const order = [...D.items].sort ((a, b) => rankOf (b) - rankOf (a) || a.start - b.start);
    function rankOf (i: Item) { return (i.id === picked?.id ? 1e6 : 0) + (hereItems.has (i.id) ? 1e5 : 0) + (i.end - i.start); }
    hits = [];
    ctx.save ();     // (Drawn within the time axis' own part: not over the lanes' names or the years)
    { const r = rect (g.off, g.len, g.cross0, g.lane * D.lanes.length); ctx.beginPath (); ctx.rect (r.x, r.y, r.w, r.h); ctx.clip (); }
    for (const it of order) {
      const lit = it.id === picked?.id || hereItems.has (it.id);
      const font = `${lit ? "600 " : ""}{}px ${ui}`;
      // (Narrow: the name wrapped beside its bar, 11 px or down to 9 to fit the column; wide: on one line under it)
      const lines = g.vertical ? fitText (it.label, rowSize - 10, font, 11, 9) : [it.label];
      if (! g.vertical) ctx.font = font.replace ("{}", "12");
      const lineH = parseFloat (ctx.font.match (/(\d+)px/)![1]) + 2;
      const labelLen = g.vertical ? lines.length * lineH + 4 : ctx.measureText (it.label).width + 8;
      const a = it.start * k, len = Math.max ((it.end - it.start) * k, 0);
      const extent = it.lane === BANDS ? len : Math.max (len, labelLen) + 4;     // (An empire's name kept within its span)
      const free = used[it.lane].findIndex ((r) => r.every (([x, y]) => a + extent <= x || a >= y));
      const s = at (it.start), e = Math.max (at (it.end), s + 0.5);
      if (e < g.off - 400 || s > g.off + g.len + 400) { if (free >= 0) used[it.lane][free].push ([a, a + extent]); continue; }
      const color = lit ? accent : hues[it.lane % hues.length];
      const laneC = g.cross0 + it.lane * g.lane;
      if (free < 0) {     // (No room: a short tick at the lane's far edge)
        const r = rect (s, Math.max (e - s, 2), laneC + g.lane - 4, 2);
        ctx.fillStyle = color; ctx.globalAlpha = .35; ctx.fillRect (r.x, r.y, r.w, r.h); ctx.globalAlpha = 1;
        hits.push ({ ...r, item: it });
        continue;
      }
      used[it.lane][free].push ([a, a + extent]);
      const c = laneC + top + free * rowSize + (g.vertical ? 2 : 4);
      ctx.fillStyle = color;
      if (e - s < 6) { const r = rect (s - 3, 6, c, 6); ctx.beginPath (); ctx.arc (r.x + 3, r.y + 3, 3.5, 0, 2 * Math.PI); ctx.fill (); }
      else { const r = rect (s, e - s, c, 6); roundRect (r.x, r.y, r.w, r.h, 3); ctx.fill (); }
      // The name: at the bar's start - or, the start scrolled out of view, at the edge while the bar still has room for it
      ctx.fillStyle = lit ? accent : fg;
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      const edgeAt = g.off + (g.vertical ? 2 : 0);
      const p = s < edgeAt ? Math.max (s, Math.min (edgeAt, e - labelLen)) : s;
      ctx.save ();
      const clip = it.lane === BANDS ? rect (s, e - s, laneC, g.lane) : rect (-1e4, 2e4, laneC, g.lane);     // (Within its lane - an empire within its span too)
      ctx.beginPath (); ctx.rect (clip.x, clip.y, clip.w, clip.h); ctx.clip ();
      if (g.vertical) lines.forEach ((t, i) => ctx.fillText (t, c + 8, p + i * lineH));
      else ctx.fillText (it.label, p, c + 9);
      ctx.restore ();
      hits.push ({ ...rect (s - 4, extent, c - 4, g.vertical ? rowSize - 2 : rowSize - 4), item: it });
    }
    ctx.restore ();

    // ---- You are here ----
    if (hereYear !== null) {
      const p = at (hereYear);
      if (p >= g.off && p <= g.off + g.len) {
        ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ctx.setLineDash ([5, 4]);
        ctx.beginPath ();
        if (g.vertical) { ctx.moveTo (g.gutter, p); ctx.lineTo (g.w, p); } else { ctx.moveTo (p, g.gutter); ctx.lineTo (p, g.h); }
        ctx.stroke (); ctx.setLineDash ([]);
        ctx.font = `600 ${g.vertical ? 10 : 11}px ${ui}`; ctx.fillStyle = accent;
        if (g.vertical) {
          ctx.clearRect (0, p - 14, g.gutter - 2, 28);
          ctx.textAlign = "right"; ctx.textBaseline = "middle";
          ctx.fillText ("You are", g.gutter - 4, p - 6); ctx.fillText ("here", g.gutter - 4, p + 6);
        } else {
          const t = "You are here", tw = ctx.measureText (t).width;
          ctx.clearRect (p - tw / 2 - 6, 0, tw + 12, g.gutter);
          ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText (t, p, g.gutter / 2);
        }
      }
    }
  }
  /** Text's lines within a width, at the largest size from big down to small (px) whose every word fits - the font set
   *  to it (font: "{}" where the size goes); at the smallest, a word still too long stands alone (clipped by the caller). */
  function fitText (text: string, width: number, font: string, big: number, small: number): string[] {
    let size = big;
    for (; size > small; size--) {
      ctx.font = font.replace ("{}", String (size));
      if (text.split (" ").every ((w) => ctx.measureText (w).width <= width)) break;
    }
    ctx.font = font.replace ("{}", String (size));
    return wrapText (text, width);
  }
  /** A label's lines within a width, in the font set (by words; a word too long for it stands alone). */
  function wrapText (text: string, width: number): string[] {
    const out: string[] = [];
    for (const word of text.split (" ")) {
      const last = out[out.length - 1];
      if (last !== undefined && ctx.measureText (last + " " + word).width <= width) out[out.length - 1] = last + " " + word;
      else out.push (word);
    }
    return out;
  }
  function roundRect (x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath ();
    ctx.roundRect ? ctx.roundRect (x, y, w, h, r) : ctx.rect (x, y, w, h);
  }

  // ---- Moving it: drag along time, pinch or wheel to zoom, tap an item to go to its verses ----
  const down = new Map<number, [number, number]> ();
  let moved = 0;
  const local = (e: PointerEvent | WheelEvent): [number, number] => { const r = canvas.getBoundingClientRect (); return [e.clientX - r.left, e.clientY - r.top]; };
  const along = (p: [number, number]) => (geometry ().vertical ? p[1] : p[0]);
  /** Zoomed by f about a point along the time axis, so the year under it stays. */
  function zoomAt (p: number, f: number) {
    const g = geometry ();
    const year = mid + (p - g.off - g.len / 2) * span / g.len;
    span /= f; clamp ();
    mid = year - (p - g.off - g.len / 2) * span / g.len; clamp ();
  }
  canvas.addEventListener ("pointerdown", (e) => { canvas.setPointerCapture (e.pointerId); down.set (e.pointerId, local (e)); if (down.size === 1) moved = 0; });
  canvas.addEventListener ("pointermove", (e) => {
    const was = down.get (e.pointerId);
    if (! was) return;
    const now = local (e), g = geometry ();
    if (down.size === 1) mid -= (along (now) - along (was)) * span / g.len;
    else {
      const other = [...down.entries ()].find (([id]) => id !== e.pointerId)![1];
      const d0 = Math.abs (along (was) - along (other)), d1 = Math.abs (along (now) - along (other));
      if (d0 > 8 && d1 > 8) zoomAt ((along (now) + along (other)) / 2, d1 / d0);
    }
    moved += Math.hypot (now[0] - was[0], now[1] - was[1]);
    down.set (e.pointerId, now);
    draw ();
  });
  const up = (e: PointerEvent) => {
    if (! down.delete (e.pointerId) || down.size || moved > 6 || e.type !== "pointerup") return;
    const [x, y] = local (e);
    const hit = hits.filter ((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h).sort ((a, b) => a.w * a.h - b.w * b.h)[0];
    if (hit) { closeScreen (); goVerse (hit.item.book, hit.item.chapter, hit.item.verse); }
  };
  canvas.addEventListener ("pointerup", up);
  canvas.addEventListener ("pointercancel", up);
  canvas.addEventListener ("wheel", (e) => {
    e.preventDefault ();
    const g = geometry ();
    const sideways = Math.abs (e.deltaX) > Math.abs (e.deltaY);
    if (sideways || e.shiftKey) mid += (sideways ? e.deltaX : e.deltaY) * span / g.len;     // (A trackpad's sideways swipe: moves)
    else zoomAt (along (local (e)), Math.exp (-e.deltaY * .002));
    draw ();
  }, { passive: false });
  new ResizeObserver (draw).observe (wrap);
});
