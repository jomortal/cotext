// Reading plans: numbered days of Bible readings - Day 1, Day 2... -, each reading a link to its passage. A plan is
// columns of readings: each column a list, its first reading Day 1's, its second Day 2's...; Day N reads the Nth reading
// of every column (a column shorter than N, or whose Nth is None - an empty slot -, has nothing that day), the plan as
// long as its longest column. One column: a reading a day; several: several a day - a combined plan made in one plan
// (COLUMNS, below). Two views of one plan (calendar, below):
// - The resource (notes.ts: "Reading plan" in the resources pane's picker, its own READING group): the open plan,
//   read-only - a PLAN picker over it while there's more than one.
// - ☰ Reading plan (the drawer's screen): the same under a top row naming the open plan (topbar.ts' nameMenu, as the
//   Verse cards' decks: SELECT PLAN, DELETE PLAN, + NEW PLAN, NAME; then the plan's own START, REPEAT and MOVE UNREAD
//   TO NEXT DAY), and a bottom bar with a pencil in its middle showing or hiding EDIT - a screen's panel (layout.ts'
//   deckPaneSplit, as the Study printout's editor): the plan's columns (EDIT, below). A plan day tapped (not on a
//   reading) is picked - its tint - and EDIT brought to it. A column's QUICK FILL ticked, EDIT fills it from sections of
//   books and days instead of reading by reading (QUICK FILL, below).
// Each plan, kept with it: START - "Not on the calendar" (the default) or "On a date" (its MONTH, DAY and YEAR: every
// date from it on a reading day); REPEAT and MOVE UNREAD TO NEXT DAY, shown on the calendar only: REPEAT - each column
// starting over at its own end (columns of different lengths cycling against each other - a polymeter -, so the plan
// never ends; unticked, each column stops at its end) -, MOVE UNREAD (READ, below).
// READ: each column's reading on a day a checkbox - a one-column plan's on the day's label ("Day N" in the list, its
// date on the calendar), several columns' a checkbox each, before its reading -, ticked when read - in either view (the
// resource too) ticking hides nothing: the reading stays shown, its box ticked.
// - Not on the calendar: the days as a list, a day a row - "Day 1" at its left, its readings beside them - at any width.
// - On the calendar: the month's name between ‹ and › (the month before and after), then its days - where its box is at
//   least 560 px wide a week a row, Sunday first, each day its date over its readings; narrower, a day a
//   row, its weekday and date at its left, its readings beside them (style.css' .planCal: a container query,
//   the box's own width, never the device's). Each date from the start on is given the next plan day's readings (no "Day N" shown on the
//   calendar: the date is its name; MOVE UNREAD: each column's next unread); a date before the start or after the plan's last day is blank. Today's date
//   in the accent; each opening shows today's month, today scrolled into view.
// A reading tapped goes to its first chapter (main.ts' goVerse; from the screen, back to the Bible first). Plans read
// whole chapters only - a reading a book's chapter or run of chapters, never part of one (M'Cheyne's made so:
// mcheyne.py). The factory plans (FACTORY: M'Cheyne's, mcheyne.ts - four columns, his four readings a day by position,
// an empty slot where a split chapter was read whole the day before -; the New Testament (260 days), the Psalms (150)
// and the Old Testament but the Psalms (779), a chapter a day each, one column; and NT, Psalms and OT, those three as
// its three columns, REPEAT on) are what their edits are laid over: a plan's columns kept only once edited (cols),
// else its base's as they ship - so a corrected factory plan reaches every device where it isn't edited.
// Kept on the device: localStorage cotext.readingplans = { at: the open plan's id, removed: the factory plans deleted
// here (not offered again), plans: [{ id, name, base?: a FACTORY key, cols?: its columns (each its readings in order,
// Day 1 first, each as parse reads it, "" an empty slot; none: the base's), start: "YYYY-MM-DD" ("" not on the
// calendar), repeat, moveUnread, done: { column: the plan days marked read }, read: { column: the dates marked read
// (MOVE UNREAD), quick: { column: its QUICK FILL - on, days, sections } } }] } - a column by its number, 0 first. A plan whose base is no longer made is dropped; one kept
// another way (before columns) keeps its name and settings, its days lost. A factory plan new to the device is added to
// its plans; every plan deleted, the factory plans back, unedited.

import type { Book } from "./reader";
import type { Db } from "./db";
import { MCHEYNE } from "./mcheyne";
import { ABBR } from "./booknames";
import { setIcon } from "./icons";
import { onScreen, closeScreen } from "./study";
import { nameMenu, dropDowns, watchTopBar, check } from "./topbar";
import { deckPaneSplit, menuSplit } from "./layout";
import { box } from "./zoom";

//==== PLANS ====

/** A plan. cols: its columns once edited (none: its base's - colsOf); repeat: on the calendar, each column starting
 *  over at its own end (else stopping); moveUnread: MOVE UNREAD TO NEXT DAY (READ, below); done: by column ("0"
 *  first), the plan days marked read; read: by column, the dates (YYYY-MM-DD) its reading was marked read on (MOVE
 *  UNREAD). */
interface Plan { id: string; name: string; base?: Base; cols?: string[][]; start: string; repeat?: boolean;
                 moveUnread?: boolean; done: Record<string, number[]>; read: Record<string, string[]>; quick?: Record<string, Quick>; }
/** A column's QUICK FILL (QUICK FILL, below), by column ("0" first) in its plan's quick: on (ticked), days (DAYS: how
 *  many days to read them in, 1 or more) and sections (each FROM BOOK to TO BOOK, by code, in the order added). */
interface Quick { on: boolean; days: number; sections: { from: string; to: string }[]; }
/** One reading: book (its code), whole chapters c1 to c2. */
interface Reading { code: string; c1: number; c2: number; }

const KEY = "cotext.readingplans";
let books = new Map<string, Book> ();     // (The Hebrew Bible's and the NT's, by code: initReadingPlan)
let bookList: Book[] = [];
/** The factory plans, by base (each one's id): each its name, credit, repeat (REPEAT ticked as it ships) and either
 *  days (mcheyne.ts: Day 1 first, each day its slots joined by ";" - slot k column k) or runs - a column each, its
 *  books ([first, last] book codes, in the Bible's order) read a chapter a day, its days worked out from the books'
 *  chapter counts. Each is offered on every device until deleted there (removed, below); all deleted, they come back. */
type Base = "mcheyne" | "nt" | "psalms" | "ot" | "three";
const NT: [string, string][] = [["Mat", "Rev"]], PS: [string, string][] = [["Psa", "Psa"]], OT: [string, string][] = [["Gen", "Job"], ["Pro", "Mal"]];
const FACTORY: Record<Base, { name: string; credit: string; repeat?: boolean; days?: string[]; runs?: [string, string][][] }> = {
  mcheyne: { name: "M'Cheyne", days: MCHEYNE, credit: "Reading plan: Robert Murray M'Cheyne's Bible Reading Calendar (1842; public domain), from CrossWire's SWORD module MCheyne 1.4." },
  nt: { name: "New Testament", runs: [NT], credit: "Reading plan: the New Testament, a chapter a day (260 days)." },
  psalms: { name: "Psalms", runs: [PS], credit: "Reading plan: the Psalms, a psalm a day (150 days)." },
  ot: { name: "Old Testament", runs: [OT], credit: "Reading plan: the Old Testament but the Psalms, a chapter a day (779 days)." },
  three: { name: "NT, Psalms and OT", runs: [NT, PS, OT], repeat: true, credit: "Reading plan: the New Testament, the Psalms and the Old Testament but the Psalms, a chapter of each a day, each starting over at its own end." },
};
/** A factory plan's columns as it ships - worked out once (a run plan's once the books are known: initReadingPlan;
 *  none before). */
const baseColumns = new Map<Base, string[][]> ();
function baseCols (b: Base): string[][] {
  const f = FACTORY[b];
  if (f.runs && ! bookList.length) return [];
  if (! baseColumns.has (b)) {
    const at = (code: string) => bookList.findIndex ((x) => x.code === code);
    baseColumns.set (b, f.runs
      ? f.runs.map ((runs) => runs.flatMap (([a, z]) => bookList.slice (at (a), at (z) + 1).flatMap ((x) => Array.from ({ length: x.chapters }, (_, i) => `${x.code} ${i + 1}`))))
      : Array.from ({ length: Math.max (0, ...(f.days ?? []).map ((d) => d.split (";").length)) }, (_, c) => (f.days ?? []).map ((d) => d.split (";")[c] ?? "")));
  }
  return baseColumns.get (b)!;
}
/** A plan's columns: its own once edited, else its base's (read-only: own() before changing them). */
const colsOf = (p: Plan): string[][] => p.cols ?? (p.base ? baseCols (p.base) : []);
/** A plan's columns made its own to change (a copy of its base's at the first edit). */
const own = (p: Plan): string[][] => p.cols ??= colsOf (p).map ((c) => [...c]);
const repeating = (p: Plan) => !! p.start && !! p.repeat;     // (REPEAT: on the calendar only)

/** A plan's last day: its longest column's; Infinity while REPEAT has a column starting over (never ending). */
function lastDay (p: Plan): number {
  const cols = colsOf (p);
  return repeating (p) && cols.some ((c) => c.length) ? Infinity : Math.max (0, ...cols.map ((c) => c.length));
}
const BASES = Object.keys (FACTORY) as Base[];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const factory = (b: Base): Plan => ({ id: b, name: FACTORY[b].name, base: b, start: "", repeat: !! FACTORY[b].repeat, done: {}, read: {} });
let plans: Plan[] = [];
let removed: Base[] = [];     // (The factory plans deleted on this device: not offered again until every plan is)
let at = "";
/** The plans as kept. */
function load () {
  plans = []; removed = [];
  try {
    const s = JSON.parse (localStorage.getItem (KEY) ?? "null");
    if (s && Array.isArray (s.plans)) {
      const cols = (v: unknown) => Array.isArray (v) && v.every ((c) => Array.isArray (c) && c.every ((r) => typeof r === "string")) ? v as string[][] : undefined;
      plans = s.plans.filter ((p: Plan) => p && typeof p.id === "string" && (! p.base || p.base in FACTORY))     // (A factory plan no longer made: dropped)
                     .map ((p: Plan) => ({ id: p.id, name: String (p.name ?? ""), ...(p.base ? { base: p.base } : {}),
                                           ...(cols (p.cols) ? { cols: cols (p.cols) } : p.base ? {} : { cols: [[]] }),     // (A plan of the user's kept another way: one empty column)
                                           start: /^\d{4}-\d\d-\d\d$/.test (p.start) ? p.start : "",
                                           repeat: p.repeat === true, moveUnread: p.moveUnread === true,
                                           done: marks (p.done, (n) => Number.isInteger (n)),
                                           read: marks (p.read, (d) => /^\d{4}-\d\d-\d\d$/.test (d)),
                                           quick: quicks (p.quick) }));
      at = String (s.at ?? "");
      removed = Array.isArray (s.removed) ? s.removed.filter ((b: Base) => b in FACTORY) : [];
    }
  } catch { /* unreadable or private mode: the factory plans */ }
  for (const b of BASES) if (! plans.some ((p) => p.base === b) && ! removed.includes (b)) plans.push (factory (b));     // (A factory plan new to this device added)
  if (! plans.length) { removed = []; plans = BASES.map (factory); }
  if (! plans.some ((p) => p.id === at)) at = plans[0].id;
}
/** A plan's kept marks by column, each list's entries checked (anything else: none). */
function marks<T> (v: unknown, ok: (x: T) => boolean): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  if (v && typeof v === "object" && ! Array.isArray (v))
    for (const [k, xs] of Object.entries (v)) if (Array.isArray (xs)) out[k] = xs.filter (ok);
  return out;
}
/** A plan's kept QUICK FILL settings, each checked (anything else: none). */
function quicks (v: unknown): Record<string, Quick> {
  const out: Record<string, Quick> = {};
  if (v && typeof v === "object" && ! Array.isArray (v))
    for (const [k, q] of Object.entries (v as Record<string, Quick>))
      if (q && typeof q === "object") out[k] = { on: q.on === true, days: Number.isInteger (q.days) && q.days > 0 ? q.days : 30,
                                                 sections: Array.isArray (q.sections) ? q.sections.filter ((x) => x && typeof x.from === "string" && typeof x.to === "string") : [] };
  return out;
}
function save () {
  // (A factory plan's columns edited back to as it ships: not kept, so a corrected one reaches it)
  for (const p of plans) if (p.base && p.cols && JSON.stringify (p.cols) === JSON.stringify (baseCols (p.base))) delete p.cols;
  try { localStorage.setItem (KEY, JSON.stringify ({ at, plans, removed })); } catch { /* private mode: not kept */ }
}
load ();
const now = () => plans.find ((p) => p.id === at)!;
const shown = (p: Plan) => p.name || "Untitled";

//==== COLUMNS ====
// A plan's columns, read side by side: Day N the Nth reading of each (an empty slot - BOOK None - nothing that day in
// that column, its later readings keeping their days). Each column is read and marked on its own (READ); with REPEAT
// each starts over at its own end. Edited in EDIT (the screen, below): a reading set, removed (the column's later
// readings a day earlier), added at a column's end (its next day); a column added (empty) or removed.
/** A plan's parts, each read and marked on its own: a column each, by its number ("0" first). */
interface Part { key: string; col: string[]; }
const partsOf = (p: Plan): Part[] => colsOf (p).map ((col, c) => ({ key: String (c), col }));
/** A column's reading on plan day n (1 first): its Nth - or, REPEAT ticked, n counted round its own length -; none
 *  past its end or for an empty slot. */
function partDay (p: Plan, part: Part, n: number): Reading[] {
  const len = part.col.length, k = n <= len ? n : repeating (p) && len ? (n - 1) % len + 1 : 0;
  const r = k ? parse (part.col[k - 1]) : null;
  return r ? [r] : [];
}
/** Column c's reading i (0 first) set ("" an empty slot). */
function setSlot (p: Plan, c: number, i: number, s: string) { own (p)[c][i] = s; save (); }
/** Column c's reading i taken out: its later readings each a day earlier, the days marked read in it moved with them. */
function removeSlot (p: Plan, c: number, i: number) {
  own (p)[c].splice (i, 1);
  const k = String (c), n = i + 1;
  if (p.done[k]) p.done[k] = p.done[k].filter ((x) => x !== n).map ((x) => x > n ? x - 1 : x);
  save ();
}
/** A reading added at column c's end - its next day -: the chapter after its last reading (Genesis 1 in an empty
 *  column), then changed in its pickers. */
function addSlot (p: Plan, c: number) {
  const col = own (p)[c], last = [...col].reverse ().map (parse).find ((r) => r);
  const code = last?.code ?? "Gen", ch = last ? Math.min (last.c2 + 1, books.get (code)!.chapters) : 1;
  col.push (format ({ code, c1: ch, c2: ch }));
  save ();
}
/** A column added after the last, empty. */
function addCol (p: Plan) {
  const k = String (own (p).push ([]) - 1);
  delete p.done[k]; delete p.read[k]; delete p.quick?.[k];
  save ();
}
/** Column c taken out: the columns after it renumbered, their marks with them. */
function removeCol (p: Plan, c: number) {
  const n = own (p).length;
  p.cols!.splice (c, 1);
  for (const marks of [p.done, p.read, p.quick ?? {}] as Record<string, unknown>[]) {     // (QUICK FILL's settings with their column too)
    for (let k = c; k < n - 1; k++) { if (marks[k + 1]) marks[k] = marks[k + 1]; else delete marks[k]; }
    delete marks[n - 1];
  }
  save ();
}

//==== QUICK FILL ====
// A column filled from sections of books and days, not reading by reading: QUICK FILL ticked over a column in EDIT shows DAYS and
// its sections (FROM BOOK and TO BOOK each, added one at a time - a section its books from the one to the other), and every change makes the column's readings afresh - ordinary
// readings, kept in its cols as any (so the calendar, the list, READ, REPEAT and MOVE UNREAD take them as they are).
// The books' chapters in order: more chapters than days, the adjacent pair of readings in the same book (a reading is
// one book) whose words together are fewest merged, again and again, until there's a reading a day - the short
// chapters paired first, so each day's reading is as near the same length as whole chapters allow (Gen 9-10 beside
// Gen 24); fewer days than books, a reading a book (EDIT notes it needs at least that many days); more days than
// chapters, a chapter a day spread as evenly as the days allow, Day 1 the first and the last day the last, the days
// between empty slots. Unticked, the readings stay - the column's lines back, to edit one by one.
let db: Db | null = null;     // (The main database: the chapters' word counts - initReadingPlan)
const wordCounts = new Map<string, Promise<number[]>> ();     // (By book code: each chapter's words, 0 first - read once)
/** Book code's chapters' word counts (the text's words; 1 each where the database can't say). */
function chapterWords (code: string): Promise<number[]> {
  if (! wordCounts.has (code)) {
    const b = books.get (code)!, ones = Array<number> (b.chapters).fill (1);
    wordCounts.set (code, ! db ? Promise.resolve (ones) : db.all ("SELECT chapter, COUNT(*) AS n FROM words WHERE book = ? GROUP BY chapter", [b.id])
      .then ((rows) => { const n = [...ones]; for (const r of rows) if (+r.chapter >= 1 && +r.chapter <= n.length) n[+r.chapter - 1] = Math.max (1, +r.n!); return n; })
      .catch (() => ones));
  }
  return wordCounts.get (code)!;
}
/** Book code's place in the books' order. */
const bookAt = (code: string) => bookList.findIndex ((x) => x.code === code);
/** QUICK FILL's books, its sections' in order (a section FROM BOOK to TO BOOK, TO BOOK before FROM BOOK just FROM BOOK). */
const quickBooks = (q: Quick) => q.sections.flatMap ((x) => bookList.slice (bookAt (x.from), Math.max (bookAt (x.from), bookAt (x.to)) + 1).map ((b) => b.code));
/** The fewest days QUICK FILL's books can be read in: a reading a book. */
const fewestDays = (q: Quick) => quickBooks (q).length;
/** Column c's readings made afresh from its QUICK FILL (above) and kept. */
async function quickFill (p: Plan, c: number) {
  const q = p.quick?.[String (c)];
  if (! q) return;
  const bs = quickBooks (q), counts = await Promise.all (bs.map (chapterWords));
  const rs = bs.flatMap ((code, k) => counts[k].map ((n, i) => ({ code, c1: i + 1, c2: i + 1, n })));
  const days = Math.max (q.days, fewestDays (q));
  let out: string[];
  if (rs.length > days) {
    while (rs.length > days) {     // (The lightest adjacent pair in one book merged: always one while a book has two)
      let best = -1;
      for (let i = 0; i + 1 < rs.length; i++)
        if (rs[i].code === rs[i + 1].code && (best < 0 || rs[i].n + rs[i + 1].n < rs[best].n + rs[best + 1].n)) best = i;
      rs.splice (best, 2, { code: rs[best].code, c1: rs[best].c1, c2: rs[best + 1].c2, n: rs[best].n + rs[best + 1].n });
    }
    out = rs.map (format);
  } else {
    out = Array<string> (rs.length ? days : 0).fill ("");     // (Chapter k on day k(days-1)/(chapters-1), rounded: the first and last days read)
    rs.forEach ((r, k) => { out[rs.length > 1 ? Math.round (k * (days - 1) / (rs.length - 1)) : 0] = format (r); });
  }
  const col = own (p)[c];
  if (col) { col.splice (0, col.length, ...out); save (); }     // (The column still there: not removed while the counts came)
}

/** The start date's year, month (0 first) and day; null not on the calendar. */
function startOf (p: Plan): { y: number; m: number; d: number } | null {
  if (! p.start) return null;
  const [y, m, d] = p.start.split ("-").map (Number);
  return { y, m: m - 1, d };
}
const dateText = (y: number, m: number, d: number) => `${y}-${String (m + 1).padStart (2, "0")}-${String (d).padStart (2, "0")}`;
/** The plan day read on a date (1 first), 0 none - MOVE UNREAD unticked: each date from the start on is the next plan
 *  day (the start Day 1), past the last day none (REPEAT: its columns count round on their own - partDay). */
function dayOn (p: Plan, y: number, m: number, d: number): number {
  const s = startOf (p);
  if (! s) return 0;
  const from = Date.UTC (s.y, s.m, s.d), to = Date.UTC (y, m, d);     // (UTC: whole days apart, whatever summer time does)
  const n = Math.round ((to - from) / 864e5) + 1;
  return to < from || n > lastDay (p) ? 0 : n;
}

//==== READ ====
// Each column's reading on a day has a checkbox, ticked once read - in the resource as on the screen: a reading ticked
// stays shown, its box ticked (to untick there). A one-column plan's box is on the day's label.
// MOVE UNREAD unticked: Day N on its fixed date (dayOn); a reading marked read is kept by plan day (done).
// MOVE UNREAD TO NEXT DAY (on the calendar only): the plan follows what's been read, not the date. Walking the dates
// from the start, each column's next unread plan day goes on each date; a date gone by whose reading wasn't marked read
// keeps showing it - late: its reference plain text, not a link, its checkbox there to mark it read on that date (I
// read it yesterday) - and the same plan day goes on to the next date, so every missed date shows the same reading and
// today the first unread; marked read on a past date, the dates after it move on. Today and the dates to come are
// projected as if each is read on its day. Each column moves on its own (one left unread held back while the others go
// on). A reading marked read is kept by date (read): a date marked read counts its column read there, whatever plan day
// it shows. A column with nothing that day (an empty slot, past its end) takes the date without a checkbox.
/** A column on a date or plan day: its plan day n, read (marked), late (a date gone by, not read: MOVE UNREAD). */
interface Slot { part: Part; n: number; read: boolean; late: boolean; }
/** The columns with a reading on plan day n (MOVE UNREAD unticked, or not on the calendar). */
const slotsOfDay = (p: Plan, n: number): Slot[] => ! n ? [] : partsOf (p).filter ((part) => partDay (p, part, n).length)
  .map ((part) => ({ part, n, read: (p.done[part.key] ?? []).includes (n), late: false }));
const moving = (p: Plan) => !! p.start && !! p.moveUnread;
/** The columns on each date of month (y, m) by date text (none: no readings) - MOVE UNREAD's walk from the start
 *  (above), else each date's plan day's. */
function monthSlots (p: Plan, y: number, m: number): Map<string, Slot[]> {
  const out = new Map<string, Slot[]> (), n = new Date (y, m + 1, 0).getDate ();
  if (! moving (p)) {
    for (let d = 1; d <= n; d++) out.set (dateText (y, m, d), slotsOfDay (p, dayOn (p, y, m, d)));
    return out;
  }
  const s = startOf (p)!, t = today (), now = Date.UTC (t.y, t.m, t.d), first = Date.UTC (y, m, 1), end = Date.UTC (y, m, n);
  const parts = partsOf (p), next = parts.map (() => 1), last = lastDay (p);     // (Each column's next plan day)
  for (let at = Date.UTC (s.y, s.m, s.d); at <= end; at += 864e5) {
    const day = new Date (at);
    const key = dateText (day.getUTCFullYear (), day.getUTCMonth (), day.getUTCDate ()), slots: Slot[] = [];
    parts.forEach ((part, i) => {
      const k = next[i];
      if (k > last) return;     // (Past the end, not repeating: nothing more)
      if (! partDay (p, part, k).length) { next[i]++; return; }     // (Nothing to read: the date taken, no checkbox)
      const read = (p.read[part.key] ?? []).includes (key), past = at < now;
      slots.push ({ part, n: k, read, late: past && ! read });
      if (read || ! past) next[i]++;     // (A date gone by unread: the same plan day on the next date)
    });
    if (at >= first) out.set (key, slots);
  }
  return out;
}
/** A column's reading marked read or not: on its date (MOVE UNREAD: date given), else on its plan day. */
function setRead (p: Plan, s: Slot, date: string, on: boolean) {
  const [list, x] = moving (p) && date ? [p.read, date] as const : [p.done, s.n] as const;
  const xs = ((list as Record<string, (string | number)[]>)[s.part.key] ?? []).filter ((v) => v !== x);
  if (on) xs.push (x);
  (list as Record<string, (string | number)[]>)[s.part.key] = xs;
  save ();
}

/** "Gen 1", "Psa 52-54" -> a reading (a verse in it - "Luk 1:1-38", "Isa 9:7-10:4" - read as its chapters); null for
 *  anything else ("" an empty slot). */
function parse (s: string): Reading | null {
  const m = s.trim ().match (/^(\w+) (\d+)(?::(\d+))?(?:-(?:(\d+):)?(\d+|end))?$/);
  if (! m || ! books.has (m[1])) return null;
  const c1 = +m[2];
  const c2 = m[4] ? +m[4] : m[5] && m[5] !== "end" && ! m[3] ? +m[5] : c1;     // (A verse given read as its chapters)
  return { code: m[1], c1, c2: Math.max (c1, c2) };
}
function format (r: Reading): string {
  return `${r.code} ${r.c1}` + (r.c2 > r.c1 ? `-${r.c2}` : "");
}
/** A reading as the plan shows it: the book's SBL abbreviation and its span - "Ps 119", "Gen 9–10". */
function label (r: Reading): string {
  const b = books.get (r.code)!, name = ABBR[b.name] ?? b.name;
  return `${name} ${r.c1}` + (r.c2 > r.c1 ? `–${r.c2}` : "");
}

//==== THE CALENDAR ====

let goVerse: (b: Book, c: number, v: number) => void = () => {};
/** main.ts: the books (the Hebrew Bible's and the NT's are a plan's), going to a verse and the database (QUICK FILL's
 *  word counts). */
export function initReadingPlan (bs: Book[], go: (b: Book, c: number, v: number) => void, d?: Db) {
  goVerse = go; db = d ?? null;
  bookList = bs.filter ((b) => b.testament !== "LXX");
  books = new Map (bookList.map ((b) => [b.code, b]));
  load ();     // (The run plans' days, now the books are known)
}

const el = <K extends keyof HTMLElementTagNameMap> (tag: K, cls = "", text = "") => {
  const e = document.createElement (tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const today = () => { const d = new Date (); return { y: d.getFullYear (), m: d.getMonth (), d: d.getDate () }; };

/** The open plan as a calendar (a start date set) or a list of its days (none): el, its box; draw, drawn again (the
 *  plan or a day changed) - at month (y, m) if given, else the month shown. leaving: called before a reading's passage
 *  is gone to (the screen closed); pick: a plan day tapped (not its readings) - the screen's editor (none in the
 *  resource); picked: the plan day marked picked (0 none). Each day's checkboxes (READ); done: told of a tick (the
 *  screen's: the resource drawn again). */
function calendar (o: { leaving?: () => void; pick?: (n: number) => void; picked?: () => number; done?: () => void }) {
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
  /** A day's row or cell: its label - on the calendar its date (dated: weekday, day of the month, its date text), in
   *  the list "Day N" (n) - and its columns' readings (READ, above). A one-column plan's checkbox is on the label;
   *  several columns' a checkbox each, before its reading (the label's box there unseen, so every date lines up, as a
   *  day with nothing to read). A late reading is plain text, not a link. */
  function dayCell (p: Plan, n: number, slots: Slot[], picked: number, date?: { wd: number; d: number; key: string }) {
    const cell = el ("div", "planDay");
    if (n && n === picked) cell.classList.add ("on");
    const when = el ("span", "planDate"), list = el ("span", "planReads");
    const named = () => date ? [el ("span", "planWd", WEEKDAYS[date.wd] + " "), String (date.d)] : [`Day ${n}`];
    const box = (s: Slot, ...label: (HTMLElement | string)[]) => {
      // (A tick kept, the box already ticked by the tap: nothing drawn again - but with MOVE UNREAD, where the dates after
      // it change, the calendar drawn again, its scroll kept; the other view told)
      const c = check (s.read, (on) => { setRead (p, s, date?.key ?? "", on); s.read = on; if (moving (p)) draw (); o.done?. (); }, ...label);
      c.addEventListener ("click", (e) => e.stopPropagation ());     // (Ticking it never picks the day)
      return c;
    };
    const reads = (s: Slot, into: HTMLElement) => {
      for (const r of partDay (p, s.part, s.n)) {
        if (s.late) { into.append (el ("span", "planLate", label (r))); continue; }     // (Late: its reference plain, to mark read)
        const a = el ("a", "term", label (r));
        a.addEventListener ("click", (e) => { e.stopPropagation (); o.leaving?. (); goVerse (books.get (r.code)!, r.c1, 1); });
        into.append (a);
      }
    };
    const one = partsOf (p).length === 1 && slots.length === 1;
    if (one) {
      const c = box (slots[0], ...named ());
      c.classList.add ("planN");
      when.append (c);
      reads (slots[0], list);
    } else if (date || n) {     // (No checkbox on the label: its box there unseen)
      const c = check (false, () => {}, ...named ());
      c.classList.add ("planN", "planNone");
      c.querySelector ("input")!.disabled = true;
      when.append (c);
      for (const s of slots) {
        const part = el ("span", "planPart");
        part.append (box (s));
        reads (s, part);
        list.append (part);
      }
    }
    cell.append (when, list);
    if (o.pick && n) cell.addEventListener ("click", () => o.pick! (n));
    return cell;
  }
  function draw (to?: { y: number; m: number }) {
    if (to) ({ y, m } = to);
    // (The box's scroller kept where it was: replacing the days would otherwise put it back at the top)
    let scroller = box.parentElement;
    while (scroller && ! (scroller.scrollHeight > scroller.clientHeight && /auto|scroll/.test (getComputedStyle (scroller).overflowY))) scroller = scroller.parentElement;
    const top = scroller?.scrollTop ?? 0;
    try { drawDays (); } finally { if (scroller && ! to) scroller.scrollTop = top; }
  }
  function drawDays () {
    const p = now (), dated = !! p.start, picked = o.picked?. () ?? 0;
    box.classList.toggle ("planList", ! dated);
    head.hidden = week.hidden = ! dated;
    if (! dated) {
      const rows = Array.from ({ length: lastDay (p) }, (_, i) => i + 1).map ((n) => dayCell (p, n, slotsOfDay (p, n), picked));
      days.replaceChildren (...rows);
      if (! rows.length) days.append (el ("p", "", "No days yet."));
    } else {
      const first = new Date (y, m, 1).getDay (), n = new Date (y, m + 1, 0).getDate (), month = monthSlots (p, y, m);
      title.textContent = `${MONTHS[m]} ${y}`;
      let tinted = false;
      days.replaceChildren (...Array.from ({ length: n }, (_, i) => {
        const d = i + 1, key = dateText (y, m, d), ss = month.get (key) ?? [];
        const cell = dayCell (p, ss[0]?.n ?? 0, ss, tinted ? 0 : picked, { wd: (first + i) % 7, d, key });
        tinted ||= cell.classList.contains ("on");     // (MOVE UNREAD: a plan day on several dates - its first tinted)
        if (i === 0) cell.style.setProperty ("--planCol", String (first + 1));     // (The 1st under its weekday: the grid's column)
        if (y === t.y && m === t.m && d === t.d) cell.classList.add ("today");
        return cell;
      }));
    }
    box.querySelector (".credit")!.textContent = p.base ? FACTORY[p.base].credit : "";
  }
  /** Today's day scrolled into view (on the calendar, where it's this month's); else the picked day's. */
  const toToday = () => (days.querySelector (".today") ?? days.querySelector (".on"))?.scrollIntoView ({ block: "center" });
  draw ();
  return { el: box, draw, toToday };
}

//==== THE RESOURCE ====
// notes.ts' "Reading plan": one calendar kept while the page lives, shown at today's month whenever the pane draws it
// afresh; PLAN over it (more than one plan) picks the open plan - the screen's too.
let screenDraw = () => {};     // (The screen's calendar drawn again: a tick in the resource; set while the screen is made)
let screenPlan = () => {};     // (The screen drawn for the open plan again: another picked in the resource's PLAN; set while the screen is made)
let pane: { el: HTMLElement; cal: ReturnType<typeof calendar>; pick: HTMLElement; sel: HTMLSelectElement } | null = null;
/** The resource's calendar, drawn for the plans as they are now (notes.ts puts it in the pane) - at today's month when
 *  fresh (just put in), else at the month it shows. */
export function planPane (fresh: boolean): HTMLElement {
  if (! pane) {
    const cal = calendar ({ done: () => screenDraw () }), box = el ("div", "planPane"), pick = el ("label", "field", "Plan"), sel = el ("select", "choose");
    sel.addEventListener ("change", () => { at = sel.value; save (); pane!.cal.draw (); screenPlan (); });
    pick.append (sel);
    box.append (pick, cal.el);
    pane = { el: box, cal, pick, sel };
  }
  load ();     // (As kept)
  const t = today ();
  paneDraw (fresh ? { y: t.y, m: t.m } : undefined);
  return pane.el;
}
/** The resource drawn again for the plans as they are (if it's been made) - at month to, else the month it shows: each
 *  change on the screen redraws it at once. */
function paneDraw (to?: { y: number; m: number }) {
  if (! pane) return;
  // (PLAN's choices filled in again in the one picker - never a new one, which would be drawn as the browser's own a
  // moment before choose.ts' and jolt what's under it)
  pane.sel.replaceChildren (...plans.map ((p) => new Option (shown (p), p.id, false, p.id === at)));
  pane.sel.value = at;
  pane.pick.hidden = plans.length < 2;
  pane.cal.draw (to);
}
/** Today put in view, once the pane is shown. */
export const planToToday = () => pane?.cal.toToday ();

//==== THE SCREEN ====
// ☰ Reading plan: its own top bar (the plan's name, its drop-down), the plan, EDIT (a screen's panel) and the bar.
let picked = 0;     // (The plan day picked on the calendar: 1 first, 0 none - a plan with no days)
let pickedIn = "";     // (The plan it was picked in: another opened, its own picked afresh)
let editing = true;     // (EDIT shown: kept on the device)
const EDIT_KEY = "cotext.readingplans.editor";
try { editing = localStorage.getItem (EDIT_KEY) !== "0"; } catch { /* private mode */ }

onScreen ("Reading plan", (body) => {
  load ();
  /** The picked day kept where it's the open plan's; else today's plan day (on the calendar), else Day 1. */
  const pickAfresh = () => {
    const p = now (), t = today ();
    if (pickedIn === p.id && picked >= 1 && picked <= lastDay (p)) return;
    pickedIn = p.id;
    picked = Math.min (monthSlots (p, t.y, t.m).get (dateText (t.y, t.m, t.d))?.[0]?.n || 1, lastDay (p));
  };
  pickAfresh ();
  screenDraw = () => cal.draw ();
  const top = el ("div", "topBar"), row = el ("div", "topRow"), menu = el ("div", "vcMenu");
  top.append (row, menu);
  menuSplit (menu);     // (Its drop-down sized by a divider, scrolling within: layout.ts)
  const cal = calendar ({ leaving: closeScreen, picked: () => picked, pick: (n) => { picked = n; show (true); cal.draw (); toDay (n); }, done: () => paneDraw () });
  // EDIT: the plan's columns - each its readings a line a day and + Add reading -, then + Add column
  const editor = el ("div", "deckPane csEditor"), head = el ("div", "top paneHead"), close = el ("button", "pill icon");
  setIcon (close, "x"); close.setAttribute ("aria-label", "Close the editor");
  head.append (el ("h2", "title", "Edit"), close);
  const lines = el ("div", "planEdit"), tabs = el ("div", "fieldRow planTabs"), cols = el ("div", "planEditCols");
  lines.append (tabs, cols);
  const addColumn = el ("button", "pill action", "+ Add column");
  editor.append (head, lines);
  const bar = el ("div", "bottomBar"), pencil = el ("button", "pill icon barMid");
  setIcon (pencil, "pencil"); pencil.setAttribute ("aria-label", "Show or hide the editor");
  bar.append (pencil);
  body.append (top, cal.el, editor, bar);
  const edScroll = deckPaneSplit (editor);
  watchTopBar (top);
  const show = (on: boolean) => {
    editing = on; editor.hidden = ! on; pencil.setAttribute ("aria-pressed", String (on));
    try { localStorage.setItem (EDIT_KEY, on ? "1" : "0"); } catch { /* private mode */ }
  };
  pencil.addEventListener ("click", () => show (! editing));
  close.addEventListener ("click", () => show (false));
  const changed = () => { pickAfresh (); drawEditor (); cal.draw (); paneDraw (); };     // (The resource too, if made)
  /** A reading edited: EDIT already changed where it must (only what changed drawn again, the list kept where it is),
   *  the calendars drawn again. */
  const edited = () => { pickAfresh (); cal.draw (); paneDraw (); };

  // The top row: the plan's name and its drop-down (topbar.ts) - a new plan starts with one empty column, named
  // "Plan 2"...; then START, REPEAT and MOVE UNREAD, the open plan's
  const when = el ("div", "fieldRow"), options = el ("div", "field");
  let menuOpen = "";     // (The drop-down open: "more", or "" closed)
  function drawTop () {
    const named = nameMenu<Plan> ({
      noun: "Plan", all: () => plans, open: now, shown, blank: "Untitled",
      select: (id) => { at = id; save (); drawTop (); changed (); },
      make: () => { const p: Plan = { id: Date.now ().toString (36), name: `Plan ${plans.length + 1}`, cols: [[]], start: "", done: {}, read: {} }; plans.push (p); at = p.id; save (); drawTop (); changed (); },
      ask: (p) => `Delete the plan "${shown (p)}"?`,
      remove: (p) => {
        plans = plans.filter ((x) => x !== p);
        if (p.base && ! plans.some ((x) => x.base === p.base)) removed.push (p.base);
        if (! plans.length) { removed = []; plans = BASES.map (factory); }
        at = plans[0].id; save (); drawTop (); changed ();
      },
      renamed: () => { save (); paneDraw (); } });
    row.replaceChildren (named.title);
    drawWhen ();
    menu.replaceChildren (...named.rows, when, options);
    dropDowns ([{ key: "more", button: named.button, menu }], menuOpen, (k) => { menuOpen = k; });     // (Drawn again - a plan picked, made or deleted -: left open as it was)
  }
  /** START (not on the calendar, or on a date: MONTH, DAY, YEAR - today's when first set), then on the calendar REPEAT
   *  and MOVE UNREAD TO NEXT DAY - each change kept and the plan drawn again. */
  function drawWhen () {
    const p = now (), s = startOf (p), t = today ();
    const set = (y: number, m: number, d: number) => { p.start = dateText (y, m, Math.min (d, new Date (y, m + 1, 0).getDate ())); save (); drawWhen (); changed (); };
    const nums = (from: number, to: number) => Array.from ({ length: to - from + 1 }, (_, k) => [String (from + k), String (from + k)] as [string, string]);
    when.replaceChildren (pick ("Start", [["", "Not on the calendar"], ["date", "On a date"]], s ? "date" : "",
      (v) => { if (v) set (t.y, t.m, t.d); else { p.start = ""; save (); drawWhen (); changed (); } }));
    if (s) when.append (
      pick ("Month", MONTHS.map ((n, k) => [String (k), n]), String (s.m), (v) => set (s.y, +v, s.d)),
      pick ("Day", nums (1, new Date (s.y, s.m + 1, 0).getDate ()), String (s.d), (v) => set (s.y, s.m, +v)),
      pick ("Year", nums (Math.min (s.y, t.y) - 5, Math.max (s.y, t.y) + 5), String (s.y), (v) => set (+v, s.m, s.d)));
    const ticks = el ("div", "csFathers");
    if (s) ticks.append (check (!! p.repeat, (on) => { p.repeat = on; save (); changed (); }, "Repeat"),
                         check (!! p.moveUnread, (on) => { p.moveUnread = on; save (); changed (); }, "Move unread to next day"));
    options.replaceChildren (ticks);
    options.hidden = ! s;
  }

  /** EDIT, the open plan's columns: a tab each ("Column N", then + Add column) and the picked one's block under them;
   *  where EDIT has room (style.css' .planEdit) no tabs - every block side by side. Over a block, with several,
   *  "Column N" and DELETE COLUMN; its readings a line each ("Day N", then BOOK - None an empty
   *  slot -, CHAPTER, TO CHAPTER and ✕), then + Add reading. A line's pickers are made only as it nears the view (a year
   *  of them at once is too many), kept once made. Drawn afresh for another plan or setting, the list kept where it
   *  was scrolled; an edit redraws only what it changes - each line and column finding its place (data-c, data-i) when
   *  used, so a removal only renumbers those after it. */
  let edPlan = "", edCol = 0;     // (The plan EDIT shows, and its column picked by the tabs: 0 first)
  const filled = new IntersectionObserver ((es) => { for (const e of es) if (e.isIntersecting) fillLine (e.target as HTMLElement); },
                                           { root: edScroll, rootMargin: "800px 0px" });
  function drawEditor () {
    const p = now (), same = edPlan === p.id, keep = same ? edScroll.scrollTop : 0;
    edPlan = p.id;
    if (! same) edCol = 0;
    edCol = Math.min (edCol, Math.max (colsOf (p).length - 1, 0));
    filled.disconnect ();
    cols.replaceChildren (...colsOf (p).map ((_, c) => colBlock (c)));
    heads ();
    edScroll.scrollTop = keep;
  }
  /** A line's place: its column's number and its own (0 first), read when it's used. */
  const where = (line: HTMLElement) => ({ c: +line.closest<HTMLElement> (".planEditCol")!.dataset.c!, i: +line.dataset.i! });
  /** Column c's block: its head ("Column N" where the columns are side by side, QUICK FILL, and DELETE COLUMN with
   *  several), then its lines (to be filled as they near the view) and + Add reading (a reading on its next day,
   *  filled at once) - or, QUICK FILL ticked, its DAYS and sections (quickBody). */
  function colBlock (c: number): HTMLElement {
    const p = now (), block = el ("div", "planEditCol"), head = el ("div", "planEditHead"), list = el ("div", "planEditLines");
    block.dataset.c = String (c);
    const quick = () => p.quick?.[block.dataset.c!];
    const tick = check (!! quick ()?.on, (on) => {
      const k = block.dataset.c!, col = colsOf (p)[+k];
      (p.quick ??= {})[k] = { ...(quick () ?? { days: col.length || 30, sections: [] }), on };     // (First ticked: DAYS the column's length, no sections)
      save (); body ();
    }, "Quick fill");
    const del = el ("button", "pill planDelCol", "Delete column");     // (In words, as DELETE PLAN: not a reading's ✕)
    del.addEventListener ("click", () => {
      const k = +block.dataset.c!;
      removeCol (p, k);
      block.remove ();
      cols.querySelectorAll<HTMLElement> (".planEditCol").forEach ((b, j) => { b.dataset.c = String (j); });
      edCol = Math.min (k, Math.max (colsOf (p).length - 1, 0));
      heads (); edited ();
    });
    head.append (el ("div", "src"), tick, del);
    const add = el ("button", "pill action", "+ Add reading");
    add.addEventListener ("click", () => {
      const k = +block.dataset.c!;
      addSlot (p, k);
      const line = stub (colsOf (p)[k].length - 1);
      list.append (line); fillLine (line);
      line.scrollIntoView ({ block: "nearest" });
      edited ();
    });
    /** The block under its head drawn for QUICK FILL as it is: the lines afresh, or DAYS and the sections. */
    const body = () => {
      if (quick ()?.on) { block.replaceChildren (head, ...quickBody (block, quick ()!, body)); return; }
      list.replaceChildren (...colsOf (p)[+block.dataset.c!].map ((_, i) => stub (i)));
      block.replaceChildren (head, list, add);
    };
    body ();
    return block;
  }
  /** QUICK FILL's settings for a block's column: DAYS (typed, kept on a change), a line per section (FROM BOOK,
   *  TO BOOK - from FROM BOOK on -, ✕) and
   *  + Add section (from and to the book after the last section's, Genesis first) - each change making the column's readings afresh
   *  (quickFill), then this drawn again (redraw) and the calendars. */
  function quickBody (block: HTMLElement, q: Quick, redraw: () => void): HTMLElement[] {
    const p = now ();
    const changed = async () => { save (); redraw (); await quickFill (p, +block.dataset.c!); edited (); };
    const days = el ("label", "field", "Days"), input = el ("input", "choose");
    Object.assign (input, { type: "text", inputMode: "numeric", value: String (q.days), autocomplete: "off" });
    input.setAttribute ("enterkeyhint", "done");
    input.addEventListener ("change", () => {
      const n = parseInt (input.value, 10);
      if (n >= 1) q.days = Math.min (n, 99999);
      input.value = String (q.days);
      void changed ();
    });
    days.append (input);
    const row = el ("div", "fieldRow");
    row.append (days);
    const out: HTMLElement[] = [row];
    if (q.days < fewestDays (q)) out.push (el ("p", "src", `Needs at least ${fewestDays (q)} days: a reading a book.`));
    const opts = (from: number) => bookList.slice (from).map ((x): [string, string, string] => [x.code, x.name, ABBR[x.name]]);
    q.sections.forEach ((sec, k) => {
      const line = el ("div", "csLine planEditLine"), place = el ("div", "fieldRow planPlace");
      place.append (pick ("From book", opts (0), sec.from,
                          (v) => { q.sections[k] = { from: v, to: bookAt (sec.to) < bookAt (v) ? v : sec.to }; void changed (); }),
                    pick ("To book", opts (bookAt (sec.from)), sec.to, (v) => { q.sections[k] = { ...sec, to: v }; void changed (); }));
      const x = el ("button", "pill icon csRemove");
      setIcon (x, "x"); x.setAttribute ("aria-label", "Remove this section");
      x.addEventListener ("click", () => { q.sections.splice (k, 1); void changed (); });
      place.append (x);
      line.append (place);
      out.push (line);
    });
    const add = el ("button", "pill action", "+ Add section");
    add.addEventListener ("click", () => {
      const last = q.sections.length ? bookAt (q.sections[q.sections.length - 1].to) : -1;
      const code = bookList[Math.min (last + 1, bookList.length - 1)].code;     // (None yet: -1 + 1, Genesis)
      q.sections.push ({ from: code, to: code });
      void changed ();
    });
    out.push (add);
    return out;
  }
  /** The tabs - "Column N" each, the picked one pressed, then + Add column - and the columns' heads ("Column N",
   *  QUICK FILL, and DELETE COLUMN shown only with several columns); every block but the picked one's .planOff (unseen
   *  only while the tabs show). */
  function heads () {
    const bs = cols.querySelectorAll<HTMLElement> (".planEditCol");
    bs.forEach ((b, j) => {
      const h = b.querySelector<HTMLElement> (".planEditHead")!;
      h.querySelector<HTMLElement> (".planDelCol")!.hidden = bs.length < 2;
      h.querySelector (".src")!.textContent = `Column ${j + 1}`;
      b.classList.toggle ("planOff", j !== edCol);
    });
    tabs.replaceChildren (...[...bs].map ((_, j) => {
      const t = el ("button", "pill planTab", `Column ${j + 1}`);
      t.setAttribute ("aria-pressed", String (j === edCol));
      t.addEventListener ("click", () => { edCol = j; heads (); });
      return t;
    }), addColumn);
    if (! bs.length) cols.replaceChildren (el ("p", "", "No columns yet."));
  }
  /** Line i of a column, its pickers not yet made: "Day N", watched to be filled. */
  function stub (i: number): HTMLElement {
    const line = el ("div", "csLine planEditLine");
    line.dataset.i = String (i);
    line.append (el ("div", "src", `Day ${i + 1}`));
    filled.observe (line);
    return line;
  }
  /** A line's pickers: BOOK (None: an empty slot - nothing that day in this column, CHAPTER and TO CHAPTER hidden),
   *  CHAPTER, TO CHAPTER and ✕ (the reading taken out, the column's later readings a day earlier) - a change kept at
   *  once, only this line drawn again (a removal renumbers the lines after it). */
  function fillLine (line: HTMLElement) {
    filled.unobserve (line);
    const p = now (), { c, i } = where (line), r = parse (colsOf (p)[c]?.[i] ?? "");
    const place = el ("div", "fieldRow planPlace");
    const set = (x: Reading | null) => {
      if (x && x.c2 < x.c1) x.c2 = x.c1;
      const at = where (line);
      setSlot (p, at.c, at.i, x ? format (x) : "");
      fillLine (line); edited ();
    };
    const nums = (from: number, to: number) => Array.from ({ length: to - from + 1 }, (_, k) => [String (from + k), String (from + k)] as [string, string]);
    place.append (pick ("Book", [["", "None", "—"], ...bookList.map ((x): [string, string, string] => [x.code, x.name, ABBR[x.name]])], r?.code ?? "",
                        (v) => set (v ? { code: v, c1: 1, c2: 1 } : null)));
    if (r) {
      const b = books.get (r.code)!;
      place.append (pick ("Chapter", nums (1, b.chapters), String (r.c1), (v) => set ({ ...r, c1: +v, c2: Math.max (r.c2, +v) })),
                    pick ("To chapter", nums (r.c1, b.chapters), String (r.c2), (v) => set ({ ...r, c2: +v })));
    }
    const x = el ("button", "pill icon csRemove");
    setIcon (x, "x"); x.setAttribute ("aria-label", "Remove this reading");
    x.addEventListener ("click", () => {
      const at = where (line), list = line.parentElement!;
      removeSlot (p, at.c, at.i);
      line.remove ();
      list.querySelectorAll<HTMLElement> (".planEditLine").forEach ((l, j) => {     // (Those after it a day earlier)
        if (j < at.i) return;
        l.dataset.i = String (j);
        l.querySelector (".src")!.textContent = `Day ${j + 1}`;
      });
      edited ();
    });
    place.append (x);
    line.replaceChildren (el ("div", "src", `Day ${i + 1}`), place);
  }
  addColumn.addEventListener ("click", () => {
    const p = now ();
    addCol (p);
    if (! cols.querySelector (".planEditCol")) cols.replaceChildren ();     // ("No columns yet." gone)
    const block = colBlock (colsOf (p).length - 1);
    edCol = colsOf (p).length - 1;     // (Its tab picked)
    cols.append (block); heads ();
    block.scrollIntoView ({ block: "nearest" });
    edited ();
  });
  /** Plan day n's first line shown brought to the top of EDIT (a day picked on the calendar). */
  function toDay (n: number) {
    const d = [...lines.querySelectorAll<HTMLElement> (`.planEditLine[data-i="${n - 1}"]`)].find ((l) => l.offsetParent);
    if (d) edScroll.scrollTop += box (d).top - box (edScroll).top;
  }
  drawTop ();
  screenPlan = () => { if (! top.isConnected) return; drawTop (); pickAfresh (); drawEditor (); cal.draw (); };     // (The screen not shown: drawn afresh when opened)
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
