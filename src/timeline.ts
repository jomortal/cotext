// The Timeline (pipeline/timeline.py: its source, lanes and matching): the Bible's people and events on one time line,
// drawn on a canvas from the shipped file (data/notes/timeline.db, downloaded the first time). One drawing
// (timelineView), shown in two places: ☰ > Timeline (THE SCREEN) and the notes panel's Timeline (THE PANE: notes.ts).
// - LANES, one over another: patriarchs and judges, the kings of Israel, the kings of Judah, the prophets, the empires
//   (the Atlas' eras), Jesus and the apostles - each item a bar from its start to its end (a dot for a day), named under
//   it; where names would overlap an item moves to the lane's next row, and one with no room left shows as a short
//   tick at the lane's edge until zoomed in. Lane hues are the verb colors; the accent is kept for "you are here".
// - TIME runs left to right on every screen (the years along the top). Dragged to move along it (let go while moving,
//   it glides on), pinched (or Ctrl / ⌘ + wheel) to zoom - from the whole Bible (creation to Revelation) down to a couple
//   of years across; a sideways swipe (or Shift + wheel) moves along time. Up and down - a finger, the wheel - scroll
//   the page as anywhere, to what's under the timeline (touch-action: pan-y).
// - YOU ARE HERE: the chapter being read (here: its year, after Theographic's verse years, on the item with most of its
//   verses) marked by a line across the lanes, the items with a verse in it in the accent; the view centered there
//   (about 120 years across), else on the whole Bible.
// - An item tapped goes to its first verse in the text (the screen closes; the pane stays and follows); an empire to
//   its first chapter.
// - Dates follow Theographic (Floyd Nolen Jones's chronology, after Ussher), said in one line over the timeline: before
//   the kings approximate and disputed. Every date is shown "c.".

import { openNotesDb, type Db } from "./db";
import { onScreen, closeScreen } from "./study";

interface Item { id: number; lane: number; label: string; title: string; start: number; end: number;
                 book: number; chapter: number; verse: number; }
interface Data { db: Db; lanes: string[]; items: Item[]; credit: string; }
/** A chapter's place in time: its year (ISO astronomical; null: not dated) and its items' ids. */
interface Here { year: number | null; items: Set<number>; }

const FIRST = -4100, LAST = 150;     // (The years the view is kept within, ISO astronomical: -4003 is 4004 BC)
const MIN_SPAN = 2;           // (The closest zoom: years across)
const HERE_SPAN = 120;        // (Centered on the chapter read: years across)
const MOVE_MS = 450;          // (The pane moving to a new chapter's year: eased over this long)
/** Each lane's hue (style.css' verb colors): the accent is "you are here"'s alone. */
const HUES = ["--qal", "--piel", "--pual", "--niphal", "--other", "--hiphil"];
const BANDS = 4;              // (The empires' lane: one after another, each named within its own span)
const NOTE = "Dates follow Floyd Nolen Jones's chronology (after Ussher); before the kings they are approximate and disputed.";

let main: Db | null = null;
let file: Promise<Data | null> | null = null;
let placeNow: () => [number, number] = () => [0, 0];
let goVerse: (book: number, chapter: number, verse: number) => void = () => {};

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

/** A chapter's year and items (the here table; a Septuagint book's are its Hebrew counterpart's, set by the pipeline). */
async function hereOf (d: Data, book: number, chapter: number): Promise<Here> {
  const [h] = await d.db.all ("SELECT year, items FROM here WHERE book = ? AND chapter = ?", [book, chapter]);
  return { year: h && h.year !== null ? Number (h.year) : null,
           items: new Set (h ? String (h.items).split (" ").filter (Boolean).map (Number) : []) };
}

/** A chapter's place in time (Study printout's timeline: chapterstudy.ts): its year (ISO astronomical; null none), its
 *  items' ids, and the timeline's lanes, items and credit; null when the timeline can't be read. */
export async function chapterTime (book: number, chapter: number) {
  const d = await data ();
  if (! d) return null;
  const h = await hereOf (d, book, chapter);
  return { year: h.year, here: h.items, lanes: d.lanes, items: d.items, credit: d.credit };
}

const el = <K extends keyof HTMLElementTagNameMap> (tag: K, cls = "", text = "") => {
  const e = document.createElement (tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** A year as the axis says it: 1000 BC, AD 30 (y: the historical year, negative BC, no year 0). */
const yearText = (y: number) => (y < 0 ? `${-y} BC` : `AD ${y}`);

//==== THE DRAWING ====
/** The timeline drawn on a canvas in its own box (el: .timeline, sized by its place's CSS), moved and zoomed by touch,
 *  mouse and wheel; onTap: an item tapped. setHere marks a chapter and centers on it (smooth: eased there over
 *  MOVE_MS - the zoom kept if it was already centered on a chapter, else HERE_SPAN); a chapter with no year shows the
 *  whole Bible. */
function timelineView (D: Data, onTap: (it: Item) => void) {
  const wrap = el ("div", "timeline");
  const canvas = el ("canvas");
  wrap.append (canvas);
  const ctx = canvas.getContext ("2d")!;
  let here: Here = { year: null, items: new Set () };
  // The view: its middle year and how many years it spans across
  let mid = (FIRST + LAST) / 2, span = LAST - FIRST;
  let hits: { x: number; y: number; w: number; h: number; item: Item }[] = [];

  /** The canvas' size and layout: the years' row along the top (gutter), each lane's height. */
  function geometry () {
    const w = wrap.clientWidth, h = wrap.clientHeight, gutter = 22;
    return { w, h, gutter, lane: (h - gutter) / D.lanes.length };
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
    const k = g.w / span, t0 = mid - span / 2;
    const at = (t: number) => (t - t0) * k;     // (A year's x)

    // ---- The years: a tick every round step, at least 64 px apart ----
    const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
    const step = steps.find ((s) => s * k >= 64) ?? 1000;
    ctx.font = `11px ${ui}`;
    ctx.lineWidth = 1;
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    for (let y = Math.floor ((t0 - 1) / step) * step; y <= t0 + span + step; y += step) {
      if (y === 0) continue;
      const p = at (y < 0 ? y + 1 : y);     // (Historical year to ISO: 1 BC is 0)
      if (p < 0 || p > g.w) continue;
      ctx.strokeStyle = edge; ctx.beginPath (); ctx.moveTo (p, g.gutter); ctx.lineTo (p, g.h); ctx.stroke ();
      ctx.fillStyle = soft; ctx.fillText (yearText (y), p + 3, g.gutter / 2);
    }

    // ---- The lanes' names, each over its rows (compact: a lane under 48 px - a phone's pane - packed tighter) ----
    const compact = g.lane < 48;
    ctx.fillStyle = soft; ctx.textBaseline = "top"; ctx.font = `600 10px ${ui}`;
    D.lanes.forEach ((name, n) => ctx.fillText (name.toUpperCase (), 4, g.gutter + n * g.lane + (compact ? 2 : 4)));

    // ---- The items: packed into each lane's rows - most telling first (the chapter's, the longest) ----
    const top = compact ? 13 : 18, rowSize = compact ? 24 : 30;     // (top: the lane's name over its rows)
    const barAt = compact ? 2 : 4, nameAt = compact ? 8 : 9;          // (A row's bar, and its name under it)
    const rows = Math.max (1, Math.floor ((g.lane - top) / rowSize));
    const used: [number, number][][][] = D.lanes.map (() => Array.from ({ length: rows }, () => []));
    const rankOf = (i: Item) => (here.items.has (i.id) ? 1e5 : 0) + (i.end - i.start);
    const order = [...D.items].sort ((a, b) => rankOf (b) - rankOf (a) || a.start - b.start);
    hits = [];
    ctx.save ();     // (Drawn under the years' row: not over the years)
    ctx.beginPath (); ctx.rect (0, g.gutter, g.w, g.h - g.gutter); ctx.clip ();
    for (const it of order) {
      const lit = here.items.has (it.id);
      ctx.font = `${lit ? "600 " : ""}12px ${ui}`;
      const labelLen = ctx.measureText (it.label).width + 8;
      const a = it.start * k, len = Math.max ((it.end - it.start) * k, 0);
      const extent = it.lane === BANDS ? len : Math.max (len, labelLen) + 4;     // (An empire's name kept within its span)
      const free = used[it.lane].findIndex ((r) => r.every (([x, y]) => a + extent <= x || a >= y));
      const s = at (it.start), e = Math.max (at (it.end), s + 0.5);
      if (e < -400 || s > g.w + 400) { if (free >= 0) used[it.lane][free].push ([a, a + extent]); continue; }
      const color = lit ? accent : hues[it.lane % hues.length];
      const laneY = g.gutter + it.lane * g.lane;
      if (free < 0) {     // (No room: a short tick at the lane's bottom edge)
        const r = { x: s, y: laneY + g.lane - 4, w: Math.max (e - s, 2), h: 2 };
        ctx.fillStyle = color; ctx.globalAlpha = .35; ctx.fillRect (r.x, r.y, r.w, r.h); ctx.globalAlpha = 1;
        hits.push ({ ...r, item: it });
        continue;
      }
      used[it.lane][free].push ([a, a + extent]);
      const c = laneY + top + free * rowSize + barAt;
      ctx.fillStyle = color;
      if (e - s < 6) { ctx.beginPath (); ctx.arc (s, c + 3, 3.5, 0, 2 * Math.PI); ctx.fill (); }
      else { ctx.beginPath (); if (ctx.roundRect) ctx.roundRect (s, c, e - s, 6, 3); else ctx.rect (s, c, e - s, 6); ctx.fill (); }
      // The name: at the bar's start - or, the start scrolled out of view, at the edge while the bar still has room for it
      ctx.fillStyle = lit ? accent : fg;
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      const p = s < 0 ? Math.max (s, Math.min (0, e - labelLen)) : s;
      ctx.save ();
      ctx.beginPath ();     // (Within its lane - an empire within its span too)
      if (it.lane === BANDS) ctx.rect (s, laneY, e - s, g.lane); else ctx.rect (-1e4, laneY, 2e4, g.lane);
      ctx.clip ();
      ctx.fillText (it.label, p, c + nameAt);
      ctx.restore ();
      hits.push ({ x: s - 4, y: c - 4, w: extent, h: rowSize - 4, item: it });
    }
    ctx.restore ();

    // ---- You are here ----
    if (here.year !== null) {
      const p = at (here.year);
      if (p >= 0 && p <= g.w) {
        ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ctx.setLineDash ([5, 4]);
        ctx.beginPath (); ctx.moveTo (p, g.gutter); ctx.lineTo (p, g.h); ctx.stroke (); ctx.setLineDash ([]);
        ctx.font = `600 11px ${ui}`; ctx.fillStyle = accent;
        const t = "You are here", tw = ctx.measureText (t).width;
        ctx.clearRect (p - tw / 2 - 6, 0, tw + 12, g.gutter);
        ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText (t, p, g.gutter / 2);
      }
    }
  }

  // ---- Moving it: drag along time, pinch or wheel to zoom, tap an item ----
  // A drag let go while moving glides on (momentum): its speed (px a ms, smoothed over the last moves) kept and eased
  // off - 0.95 of it each 16 ms frame, so a fast flick carries on about a second - until it's under 0.02 px a ms or the
  // timeline's end is reached; a touch stops it. setHere's eased move (anim) is stopped by a touch too.
  const down = new Map<number, [number, number]> ();
  let moved = 0;
  let speed = 0, lastT = 0, glide = 0, anim = 0;
  const stop = () => { if (glide) cancelAnimationFrame (glide); if (anim) cancelAnimationFrame (anim); glide = anim = 0; };
  function glideOn (t0: number) {
    let prev = t0;
    const step = (t: number) => {
      const dt = Math.min (50, t - prev); prev = t;
      const was = mid;
      mid -= speed * dt * span / geometry ().w; clamp ();
      speed *= Math.pow (.95, dt / 16);
      draw ();
      glide = Math.abs (speed) < .02 || mid === was ? 0 : requestAnimationFrame (step);
    };
    glide = requestAnimationFrame (step);
  }
  const local = (e: PointerEvent | WheelEvent): [number, number] => { const r = canvas.getBoundingClientRect (); return [e.clientX - r.left, e.clientY - r.top]; };
  /** Zoomed by f about x, so the year under it stays. */
  function zoomAt (x: number, f: number) {
    const w = geometry ().w;
    const year = mid + (x - w / 2) * span / w;
    span /= f; clamp ();
    mid = year - (x - w / 2) * span / w; clamp ();
  }
  canvas.addEventListener ("pointerdown", (e) => { stop (); canvas.setPointerCapture (e.pointerId); down.set (e.pointerId, local (e)); if (down.size === 1) { moved = 0; speed = 0; lastT = e.timeStamp; } });
  canvas.addEventListener ("pointermove", (e) => {
    const was = down.get (e.pointerId);
    if (! was) return;
    const now = local (e);
    if (down.size === 1) {
      const d = now[0] - was[0], dt = Math.max (1, e.timeStamp - lastT);
      mid -= d * span / geometry ().w;
      speed = .8 * (d / dt) + .2 * speed; lastT = e.timeStamp;
    }
    else {
      speed = 0;     // (A pinch: no glide after it)
      const other = [...down.entries ()].find (([id]) => id !== e.pointerId)![1];
      const d0 = Math.abs (was[0] - other[0]), d1 = Math.abs (now[0] - other[0]);
      if (d0 > 8 && d1 > 8) zoomAt ((now[0] + other[0]) / 2, d1 / d0);
    }
    moved += Math.hypot (now[0] - was[0], now[1] - was[1]);
    down.set (e.pointerId, now);
    draw ();
  });
  const up = (e: PointerEvent) => {
    if (! down.delete (e.pointerId) || down.size) return;
    if (moved > 6) { if (e.timeStamp - lastT < 80 && Math.abs (speed) > .05) glideOn (e.timeStamp); return; }     // (Still moving when let go: glides)
    if (e.type !== "pointerup") return;
    const [x, y] = local (e);
    const hit = hits.filter ((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h).sort ((a, b) => a.w * a.h - b.w * b.h)[0];
    if (hit) onTap (hit.item);
  };
  canvas.addEventListener ("pointerup", up);
  canvas.addEventListener ("pointercancel", up);
  canvas.addEventListener ("wheel", (e) => {
    // (A trackpad's pinch, or the wheel with Ctrl / ⌘: zooms; a sideways swipe or Shift + wheel moves along time; the
    // wheel up and down left to scroll the page, to what's under the timeline)
    const zoom = e.ctrlKey || e.metaKey, sideways = Math.abs (e.deltaX) > Math.abs (e.deltaY);
    if (! zoom && ! sideways && ! e.shiftKey) return;
    e.preventDefault ();
    stop ();
    if (zoom) zoomAt (local (e)[0], Math.exp (-e.deltaY * .01));
    else mid += (sideways ? e.deltaX : e.deltaY) * span / geometry ().w;
    draw ();
  }, { passive: false });
  new ResizeObserver (draw).observe (wrap);

  function setHere (h: Here, smooth = false) {
    const wasHere = here.year !== null;
    here = h;
    const toMid = h.year ?? (FIRST + LAST) / 2;
    const toSpan = h.year === null ? LAST - FIRST : wasHere ? span : HERE_SPAN;
    stop ();
    if (! smooth || ! geometry ().w) { mid = toMid; span = toSpan; draw (); return; }
    // Eased (in and out) from where it is: the middle year straight, the span by its log (so a zoom looks even)
    const m0 = mid, s0 = Math.log (span), s1 = Math.log (toSpan), t0 = performance.now ();
    const step = (t: number) => {
      const f = Math.min (1, Math.max (0, t - t0) / MOVE_MS), ease = f < .5 ? 2 * f * f : 1 - 2 * (1 - f) * (1 - f);
      mid = m0 + (toMid - m0) * ease; span = Math.exp (s0 + (s1 - s0) * ease);
      draw ();
      anim = f < 1 ? requestAnimationFrame (step) : 0;
    };
    anim = requestAnimationFrame (step);
  }
  return { el: wrap, setHere };
}

//==== THE SCREEN ====
onScreen ("Timeline", async (body) => {
  body.append (el ("p", "timelineNote", NOTE));
  const holder = el ("div", "timeline");
  const status = el ("p", "timelineStatus", "Loading the timeline…");
  holder.append (status);
  const credit = el ("p", "credit");
  body.append (holder, credit);
  let d: Data | null = null;
  try { d = await data (); } catch { /* offline the first time */ }
  if (! d) { status.textContent = "The timeline isn't available offline until it's been opened once online."; return; }
  credit.textContent = d.credit;
  const view = timelineView (d, (it) => { closeScreen (); goVerse (it.book, it.chapter, it.verse); });
  holder.replaceWith (view.el);
  const [book, chapter] = placeNow ();
  view.setHere (await hereOf (d, book, chapter));
});

//==== THE PANE ====
// The notes panel's Timeline (notes.ts: picked under BIBLE BACKGROUND, after the Atlas): the same drawing, its one
// view kept while the page lives, centered on the chapter read and eased to each new chapter's year as the text
// changes (the zoom kept); a chapter with no year (a genealogy, an undated book) says so in a line over it and shows
// the whole Bible. The line on its dates under it; the credit is the panel's own line. An item tapped goes to its
// verse, the pane following. Narrow, notes.ts sizes it to the panel's room (a sideways drag moves the timeline; up and down scroll the panel).
let pane: { el: HTMLElement; say: HTMLElement; view: ReturnType<typeof timelineView> } | null = null;
/** The pane set to a chapter (name: its book's, for the line), for notes.ts to show - or why it can't be read. */
export async function timelinePane (book: number, chapter: number, name: string): Promise<HTMLElement | string> {
  let d: Data | null = null;
  try { d = await data (); } catch { /* offline the first time */ }
  if (! d) return "The timeline isn't available offline until it's been opened once online.";
  if (! pane) {
    const say = el ("p", "timelineNote");
    const view = timelineView (d, (it) => goVerse (it.book, it.chapter, it.verse));
    view.el.classList.add ("timelinePane");
    const box = el ("div");
    box.append (say, view.el, el ("p", "timelineNote", NOTE));
    pane = { el: box, say, view };
  }
  const h = await hereOf (d, book, chapter);
  pane.say.textContent = h.year === null ? `${name} ${chapter} isn't dated on the timeline - the whole Bible shown.` : "";
  pane.view.setHere (h, pane.el.isConnected);     // (Eased when it's already showing; set at once when it's being put in)
  return pane.el;
}
