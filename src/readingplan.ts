// Reading plans: a calendar of the day's Bible readings, each a link to its passage. Two views of one calendar
// (calendar, below):
// - The resource (notes.ts: "Reading plan" in the resources pane's picker, its own READING group): the open plan's
//   calendar, read-only - a PLAN picker over it while there's more than one.
// - ☰ Reading plan (the drawer's screen): the same calendar under a top row naming the open plan (topbar.ts' nameMenu,
//   as the Verse cards' decks: SELECT PLAN, DELETE PLAN, + NEW PLAN, NAME), and a bottom bar with a pencil in its
//   middle showing or hiding EDIT - a screen's panel (layout.ts' deckPaneSplit, as the Study printout's editor): the
//   picked day's readings, each its BOOK, CHAPTER, FROM VERSE, TO CHAPTER, TO VERSE and ✕, then + Add reading. A day
//   tapped (not on a reading) is picked - its tint - and EDIT opens on it.
// The calendar: the month's name between ‹ and › (the month before and after), then its days - where its box is at
// least 560 px wide a week a row, Sunday first, each day its date over its readings; narrower, a day a row, its weekday
// and date at its left, its readings beside them (style.css' .planCal: a container query, the box's own width, never
// the device's). Today's date in the accent; each opening shows today's month, today scrolled into view. A reading
// tapped goes to its first chapter and verse (main.ts' goVerse; from the screen, back to the Bible first). The OT's
// readings go to the Hebrew Bible, verse numbers as the plan gives them (M'Cheyne's: the English Bible's - a few
// chapters' last verses are numbered differently in the Hebrew).
// Plans are keyed by the calendar's date (MM-DD; Feb 29 its own day, blank in M'Cheyne's), so a plan repeats yearly.
// M'Cheyne's (the factory plan, mcheyne.ts) is the plan its edits are laid over: its days kept as they ship, the
// user's changes kept apart (days) - so a corrected factory plan reaches every device, edited days excepted.
// Kept on the device: localStorage cotext.readingplans = { at: the open plan's id, plans: [{ id, name, base?:
// "mcheyne", days: { "MM-DD": readings } }] } - a day's readings joined by ";", each as parse reads it; a day in days
// overrides the base's ("" none). Every plan deleted: M'Cheyne's back, unedited.

import type { Db } from "./db";
import type { Book } from "./reader";
import { MCHEYNE } from "./mcheyne";
import { ABBR } from "./booknames";
import { setIcon } from "./icons";
import { onScreen, closeScreen } from "./study";
import { nameMenu, dropDowns, watchTopBar } from "./topbar";
import { deckPaneSplit } from "./layout";

//==== PLANS ====

interface Plan { id: string; name: string; base?: "mcheyne"; days: Record<string, string>; }
/** One reading: book (its code), from chapter c1 verse v1 to chapter c2 verse v2 - v1 0 the start of c1, v2 0 the end
 *  of c2 (both 0: whole chapters c1 to c2). */
interface Reading { code: string; c1: number; v1: number; c2: number; v2: number; }

const KEY = "cotext.readingplans";
const CREDIT = "Reading plan: Robert Murray M'Cheyne's Bible Reading Calendar (1842; public domain), from CrossWire's SWORD module MCheyne 1.4.";
const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** M'Cheyne's days by date (MM-DD): its 365, Jan 1 first, laid on a year without Feb 29. */
const FACTORY: Record<string, string> = {};
{
  let i = 0;
  DAYS_IN.forEach ((n, m) => { for (let d = 1; d <= n; d++) if (! (m === 1 && d === 29)) FACTORY[dateKey (m, d)] = MCHEYNE[i++]; });
}
function dateKey (month: number, day: number) { return `${String (month + 1).padStart (2, "0")}-${String (day).padStart (2, "0")}`; }

const factory = (): Plan => ({ id: "mcheyne", name: "M'Cheyne", base: "mcheyne", days: {} });
let plans: Plan[] = [];
let at = "";
function load () {
  try {
    const s = JSON.parse (localStorage.getItem (KEY) ?? "null");
    if (s && Array.isArray (s.plans)) {
      plans = s.plans.filter ((p: Plan) => p && typeof p.id === "string" && p.days && typeof p.days === "object")
                     .map ((p: Plan) => ({ id: p.id, name: String (p.name ?? ""), ...(p.base === "mcheyne" ? { base: p.base } : {}), days: p.days }));
      at = String (s.at ?? "");
    }
  } catch { /* unreadable or private mode: the factory plan */ }
  if (! plans.length) plans = [factory ()];
  if (! plans.some ((p) => p.id === at)) at = plans[0].id;
}
function save () {
  try { localStorage.setItem (KEY, JSON.stringify ({ at, plans })); } catch { /* private mode: not kept */ }
}
load ();
const now = () => plans.find ((p) => p.id === at)!;
const shown = (p: Plan) => p.name || "Untitled";

/** A day's readings in a plan: its own edit, else its base's. */
const dayOf = (p: Plan, key: string): Reading[] =>
  (key in p.days ? p.days[key] : p.base ? FACTORY[key] ?? "" : "").split (";").map (parse).filter ((r): r is Reading => !! r);
function setDay (p: Plan, key: string, rs: Reading[]) {
  const s = rs.map (format).join (";");
  if (p.base && (FACTORY[key] ?? "") === s) delete p.days[key]; else p.days[key] = s;     // (Back as the base has it: no edit kept)
  save ();
}

/** "Gen 1", "Psa 52-54", "Luk 1:1-38", "Isa 9:7-10:4", "Gen 1:5-end" -> a reading; null for anything else. */
function parse (s: string): Reading | null {
  const m = s.trim ().match (/^(\w+) (\d+)(?::(\d+))?(?:-(?:(\d+):)?(\d+|end))?$/);
  if (! m || ! books.has (m[1])) return null;
  const c1 = +m[2];
  if (! m[3]) return { code: m[1], c1, v1: 0, c2: m[5] && m[5] !== "end" ? +m[5] : c1, v2: 0 };     // (Whole chapters)
  return { code: m[1], c1, v1: +m[3], c2: m[4] ? +m[4] : c1, v2: m[5] && m[5] !== "end" ? +m[5] : m[5] ? 0 : +m[3] };
}
function format (r: Reading): string {
  if (! r.v1 && ! r.v2) return `${r.code} ${r.c1}` + (r.c2 > r.c1 ? `-${r.c2}` : "");
  return `${r.code} ${r.c1}:${r.v1 || 1}-` + (r.c2 !== r.c1 ? `${r.c2}:` : "") + (r.v2 || "end");
}
/** A reading as the calendar shows it: the book's SBL abbreviation and its span - "Ps 119:1–24", "Gen 9–10". */
function label (r: Reading): string {
  const b = books.get (r.code)!, name = ABBR[b.name] ?? b.name;
  if (! r.v1 && ! r.v2) return `${name} ${r.c1}` + (r.c2 > r.c1 ? `–${r.c2}` : "");
  const end = r.v2 || "end";
  return `${name} ${r.c1}:${r.v1 || 1}` + (r.c2 !== r.c1 ? `–${r.c2}:${end}` : r.v2 === r.v1 ? "" : `–${end}`);
}

//==== THE CALENDAR ====

let books = new Map<string, Book> ();     // (The Hebrew Bible's and the NT's, by code)
let bookList: Book[] = [];
let db: Db;
let goVerse: (b: Book, c: number, v: number) => void = () => {};
/** main.ts: the books (the Hebrew Bible's and the NT's are a plan's), the database (the editor's verse counts) and
 *  going to a verse. */
export function initReadingPlan (d: Db, bs: Book[], go: (b: Book, c: number, v: number) => void) {
  db = d; goVerse = go;
  bookList = bs.filter ((b) => b.testament !== "LXX");
  books = new Map (bookList.map ((b) => [b.code, b]));
}

const el = <K extends keyof HTMLElementTagNameMap> (tag: K, cls = "", text = "") => {
  const e = document.createElement (tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const today = () => { const d = new Date (); return { y: d.getFullYear (), m: d.getMonth (), d: d.getDate () }; };

/** A calendar of the open plan: el, its box; draw, drawn again (the plan or a day changed) - at month (y, m) if given,
 *  else the month shown. leaving: called before a reading's passage is gone to (the screen closed); pick: a day tapped
 *  (not its readings) - the screen's editor (none in the resource); picked: the day marked picked (its key, "" none). */
function calendar (o: { leaving?: () => void; pick?: (key: string, y: number) => void; picked?: () => string }) {
  const box = el ("div", "planCal");
  const t = today ();
  let y = t.y, m = t.m;
  const head = el ("div", "planMonth"), title = el ("h2", "title"), back = el ("button", "pill icon arrow"), next = el ("button", "pill icon arrow");
  setIcon (back, "back"); setIcon (next, "next");
  back.setAttribute ("aria-label", "The month before"); next.setAttribute ("aria-label", "The month after");
  head.append (back, title, next);
  const week = el ("div", "planWeek");
  week.append (...WEEKDAYS.map ((w) => el ("span", "src", w)));
  const days = el ("div", "planDays");
  box.append (head, week, days, el ("p", "credit"));
  const step = (dir: number) => { m += dir; if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; } draw (); };
  back.addEventListener ("click", () => step (-1));
  next.addEventListener ("click", () => step (1));
  function draw (at?: { y: number; m: number }) {
    if (at) ({ y, m } = at);
    const p = now (), first = new Date (y, m, 1).getDay (), n = new Date (y, m + 1, 0).getDate (), picked = o.picked?. () ?? "";
    title.textContent = `${MONTHS[m]} ${y}`;
    days.replaceChildren (...Array.from ({ length: n }, (_, i) => {
      const d = i + 1, key = dateKey (m, d), wd = (first + i) % 7;
      const cell = el ("div", "planDay");
      if (i === 0) cell.style.setProperty ("--planCol", String (first + 1));     // (The 1st under its weekday: the grid's column)
      if (y === t.y && m === t.m && d === t.d) cell.classList.add ("today");
      if (key === picked) cell.classList.add ("on");
      const date = el ("span", "planDate");
      date.append (el ("span", "planWd", WEEKDAYS[wd] + " "), String (d));
      const list = el ("span", "planReads");
      for (const r of dayOf (p, key)) {
        const a = el ("a", "term", label (r));
        a.addEventListener ("click", (e) => { e.stopPropagation (); o.leaving?. (); goVerse (books.get (r.code)!, r.c1, r.v1 || 1); });
        list.append (a);
      }
      cell.append (date, list);
      if (o.pick) cell.addEventListener ("click", () => o.pick! (key, y));
      return cell;
    }));
    box.querySelector (".credit")!.textContent = p.base ? CREDIT : "";
  }
  /** Today's day scrolled into view (where it's this month's). */
  const toToday = () => days.querySelector (".today")?.scrollIntoView ({ block: "center" });
  draw ();
  return { el: box, draw, toToday };
}

//==== THE RESOURCE ====
// notes.ts' "Reading plan": one calendar kept while the page lives, shown at today's month whenever the pane draws it
// afresh; PLAN over it (more than one plan) picks the open plan - the screen's too.
let pane: { el: HTMLElement; cal: ReturnType<typeof calendar>; pick: HTMLElement } | null = null;
/** The resource's calendar, drawn for the plans as they are now (notes.ts puts it in the pane) - at today's month when
 *  fresh (just put in), else at the month it shows. */
export function planPane (fresh: boolean): HTMLElement {
  if (! pane) {
    const cal = calendar ({}), box = el ("div", "planPane"), pick = el ("label", "field", "Plan");
    box.append (pick, cal.el);
    pane = { el: box, cal, pick };
  }
  load ();     // (The screen may have changed them)
  const s = el ("select", "choose");
  s.append (...plans.map ((p) => new Option (shown (p), p.id, false, p.id === at)));
  s.addEventListener ("change", () => { at = s.value; save (); pane!.cal.draw (); });
  pane.pick.replaceChildren ("Plan", s);
  pane.pick.hidden = plans.length < 2;
  const t = today ();
  pane.cal.draw (fresh ? { y: t.y, m: t.m } : undefined);
  return pane.el;
}
/** Today put in view, once the pane is shown. */
export const planToToday = () => pane?.cal.toToday ();

//==== THE SCREEN ====
// ☰ Reading plan: its own top bar (the plan's name, its drop-down), the calendar, EDIT (a screen's panel) and the bar.
let picked = "";     // (The day being edited: MM-DD)
let pickedYear = today ().y;
let editing = true;     // (EDIT shown: kept on the device)
const EDIT_KEY = "cotext.readingplans.editor";
try { editing = localStorage.getItem (EDIT_KEY) !== "0"; } catch { /* private mode */ }

onScreen ("Reading plan", (body) => {
  load ();
  const t = today ();
  if (! picked) { picked = dateKey (t.m, t.d); pickedYear = t.y; }
  const top = el ("div", "topBar"), row = el ("div", "topRow"), menu = el ("div", "vcMenu");
  top.append (row, menu);
  const cal = calendar ({ leaving: closeScreen, picked: () => picked, pick: (key, y) => { picked = key; pickedYear = y; show (true); drawEditor (); cal.draw (); } });
  // EDIT: the picked day's readings, a line each, + Add reading under them
  const editor = el ("div", "deckPane csEditor"), head = el ("div", "top paneHead"), close = el ("button", "pill icon");
  setIcon (close, "x"); close.setAttribute ("aria-label", "Close the editor");
  head.append (el ("h2", "title", "Edit"), close);
  const dayName = el ("div", "src"), lines = el ("div", "planLines"), add = el ("button", "pill action", "+ Add reading");
  editor.append (head, dayName, lines, add);
  const bar = el ("div", "bottomBar"), pencil = el ("button", "pill icon barMid");
  setIcon (pencil, "pencil"); pencil.setAttribute ("aria-label", "Show or hide the editor");
  bar.append (pencil);
  body.append (top, cal.el, editor, bar);
  deckPaneSplit (editor);
  watchTopBar (top);
  const show = (on: boolean) => {
    editing = on; editor.hidden = ! on; pencil.setAttribute ("aria-pressed", String (on));
    try { localStorage.setItem (EDIT_KEY, on ? "1" : "0"); } catch { /* private mode */ }
  };
  pencil.addEventListener ("click", () => show (! editing));
  close.addEventListener ("click", () => show (false));
  const changed = () => { drawEditor (); cal.draw (); };
  add.addEventListener ("click", () => {
    // (A new reading: the chapter after the day's last reading, else Genesis 1 - then changed in its pickers)
    const rs = dayOf (now (), picked), last = rs[rs.length - 1];
    const code = last?.code ?? "Gen", c = last ? Math.min (last.c2 + 1, books.get (code)!.chapters) : 1;
    rs.push ({ code, c1: c, v1: 0, c2: c, v2: 0 });
    setDay (now (), picked, rs); changed ();
  });

  // The top row: the plan's name and its drop-down (topbar.ts) - a new plan starts blank, named "Plan 2"...
  function drawTop () {
    const named = nameMenu<Plan> ({
      noun: "Plan", all: () => plans, open: now, shown, blank: "Untitled",
      select: (id) => { at = id; save (); drawTop (); changed (); },
      make: () => { const p: Plan = { id: Date.now ().toString (36), name: `Plan ${plans.length + 1}`, days: {} }; plans.push (p); at = p.id; save (); drawTop (); changed (); },
      ask: (p) => `Delete the plan "${shown (p)}"?`,
      remove: (p) => { plans = plans.filter ((x) => x !== p); if (! plans.length) plans = [factory ()]; at = plans[0].id; save (); drawTop (); changed (); },
      renamed: () => save () });
    row.replaceChildren (named.title);
    menu.replaceChildren (...named.rows);
    dropDowns ([{ key: "more", button: named.button, menu }], "");
  }

  // A reading's line: BOOK, CHAPTER, FROM VERSE (Start), TO CHAPTER, TO VERSE (End) and ✕ - a change kept at once
  async function drawEditor () {
    const p = now (), key = picked, [mm, dd] = key.split ("-").map (Number);
    const wd = new Date (pickedYear, mm - 1, dd).getDay ();
    dayName.textContent = `${WEEKDAYS[wd]} ${MONTHS[mm - 1]} ${dd}`;
    const rs = dayOf (p, key);
    const counts = await Promise.all (rs.map ((r) => Promise.all ([verseCount (r.code, r.c1), verseCount (r.code, r.c2)])));
    if (key !== picked || p !== now ()) return;     // (Another day or plan meanwhile: its own drawing)
    lines.replaceChildren (...rs.map ((r, i) => {
      const line = el ("div", "csLine"), place = el ("div", "fieldRow planPlace");
      const set = (f: Partial<Reading>) => {
        Object.assign (r, f);
        if (r.c2 < r.c1) r.c2 = r.c1;
        if (r.c2 === r.c1 && r.v2 && r.v2 < r.v1) r.v2 = 0;     // (An end before its start: to the chapter's end)
        setDay (p, key, rs); changed ();
      };
      const b = books.get (r.code)!, nums = (from: number, to: number) => Array.from ({ length: to - from + 1 }, (_, k) => from + k);
      place.append (
        pick ("Book", bookList.map ((x) => [x.code, x.name, ABBR[x.name]]), r.code, (v) => set ({ code: v, c1: 1, v1: 0, c2: 1, v2: 0 })),
        pick ("Chapter", nums (1, b.chapters).map ((c) => [String (c), String (c)]), String (r.c1), (v) => set ({ c1: +v, v1: 0, c2: Math.max (r.c2, +v), v2: 0 })),
        pick ("From verse", [["0", "Start"], ...nums (1, counts[i][0]).map ((v): [string, string] => [String (v), String (v)])], String (r.v1), (v) => set ({ v1: +v })),
        pick ("To chapter", nums (r.c1, b.chapters).map ((c) => [String (c), String (c)]), String (r.c2), (v) => set ({ c2: +v, v2: 0 })),
        pick ("To verse", [["0", "End"], ...nums (1, counts[i][1]).map ((v): [string, string] => [String (v), String (v)])], String (r.v2), (v) => set ({ v2: +v })));
      const x = el ("button", "pill icon csRemove");
      setIcon (x, "x"); x.setAttribute ("aria-label", "Remove this reading");
      x.addEventListener ("click", () => { rs.splice (i, 1); setDay (p, key, rs); changed (); });
      place.append (x);
      line.append (place);
      return line;
    }));
    if (! rs.length) lines.append (el ("p", "", "No readings this day."));
  }
  drawTop ();
  show (editing);
  void drawEditor ();
  requestAnimationFrame (cal.toToday);
});

/** A picker (choose.ts draws it): label over it, options [value, text, short form?], set on a change. */
function pick (label: string, options: [string, string, string?][], value: string, set: (v: string) => void) {
  const l = el ("label", "field", label), s = el ("select", "choose");
  s.append (...options.map (([v, t, short]) => { const o = new Option (t, v); if (short) o.dataset.short = short; return o; }));
  s.value = value;
  s.addEventListener ("change", () => set (s.value));
  l.append (s);
  return l;
}

/** A chapter's verses (its last verse's number), read once. */
const counted = new Map<string, Promise<number>> ();
function verseCount (code: string, c: number): Promise<number> {
  const k = `${code}.${c}`;
  if (! counted.has (k)) counted.set (k, db.all ("SELECT MAX(verse) AS n FROM words WHERE book = ? AND chapter = ?", [books.get (code)!.id, c]).then ((r) => Number (r[0]?.n ?? 0)));
  return counted.get (k)!;
}
