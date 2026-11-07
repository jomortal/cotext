// Reading plans: numbered days of Bible readings - Day 1, Day 2... -, each reading a link to its passage. Two views of
// one plan (calendar, below):
// - The resource (notes.ts: "Reading plan" in the resources pane's picker, its own READING group): the open plan,
//   read-only - a PLAN picker over it while there's more than one.
// - ☰ Reading plan (the drawer's screen): the same under a top row naming the open plan (topbar.ts' nameMenu, as the
//   Verse cards' decks: SELECT PLAN, DELETE PLAN, + NEW PLAN, NAME; then the plan's own START, REPEAT, MOVE UNREAD
//   TO NEXT DAY and COMBINED PLAN, below), and a
//   bottom bar with a pencil in its middle showing or hiding EDIT - a screen's panel (layout.ts' deckPaneSplit, as the
//   Study printout's editor): the picked day ("Day 12") and its readings, each its BOOK, CHAPTER, TO CHAPTER and ✕, then
//   + Add reading and + Add day (a day after the last, picked). A plan day tapped (not on a reading) is picked - its
//   tint - and EDIT opens on it.
// Each plan, kept with it: START - "Not on the calendar" (the default) or "On a date" (its MONTH, DAY and YEAR: every
// date from it on a reading day); REPEAT and MOVE UNREAD TO NEXT DAY, shown on the calendar only: REPEAT - after its
// last day the plan starts over at Day 1 (unticked, it stops) -, MOVE UNREAD (READ, below); COMBINED PLAN (a plan of
// plans: COMBINED PLAN, below).
// READ: each day's part a checkbox - a plan's day one, on its label ("Day N" in the list, its date on the calendar); a
// combined plan's a checkbox for each plan in it -, ticked when read - in either view (the resource too) ticking hides
// nothing: the part stays shown, its box ticked.
// - Not on the calendar: the days as a list, a day a row - "Day 1" at its left, its readings beside them - at any width.
// - On the calendar: the month's name between ‹ and › (the month before and after), then its days - where its box is at
//   least 560 px wide a week a row, Sunday first, each day its date over its readings; narrower, a day a
//   row, its weekday and date at its left, its readings beside them (style.css' .planCal: a container query,
//   the box's own width, never the device's). Each date from the start on is given the next plan day's readings (no "Day N" shown on the
//   calendar: the date is its name; MOVE UNREAD: the next unread); a date before the start or after the plan's last day is blank. Today's date
//   in the accent; each opening shows today's month, today scrolled into view.
// A reading tapped goes to its first chapter (main.ts' goVerse; from the screen, back to the Bible first). Plans read
// whole chapters only - a reading a book's chapter or run of chapters, never part of one (M'Cheyne's made so:
// mcheyne.py). The factory plans (FACTORY: M'Cheyne's, mcheyne.ts - its 365 days in order -; the New Testament (260
// days), the Psalms (150) and the Old Testament but the Psalms (779), a chapter a day each; and Combined, a combined
// plan of those three, each repeating - so it never ends: a year past the last day done listed) are what their edits are
// laid over: their days kept as they ship, the user's changes kept apart (days) - so a corrected factory plan reaches
// every device, edited days excepted.
// Kept on the device: localStorage cotext.readingplans = { at: the open plan's id, removed: the factory plans deleted
// here (not offered again), plans: [{ id, name, base?: a FACTORY key, count: its number of days, start: "YYYY-MM-DD"
// ("" not on the calendar), repeat, moveUnread, combined, members: [{ id, repeat }], days: { "<day number, 1 first>":
// readings }, done: { part: the plan days marked read }, read: { part: the dates marked read (MOVE UNREAD) } }] } - a day's readings joined
// by ";", each as parse reads it; a day in days overrides the base's ("" none). A plan saved another way (before days
// were numbered) or whose base is no longer made is dropped; marks kept another way (before parts) dropped. A factory plan new to the device is added to its plans;
// every plan deleted, the factory plans back, unedited.

import type { Book } from "./reader";
import { MCHEYNE } from "./mcheyne";
import { ABBR } from "./booknames";
import { setIcon } from "./icons";
import { onScreen, closeScreen } from "./study";
import { nameMenu, dropDowns, watchTopBar, check } from "./topbar";
import { deckPaneSplit, menuSplit } from "./layout";

//==== PLANS ====

/** A plan. repeat: on the calendar, starting over at Day 1 after its last day (else stopping); combined: a combined
 *  plan (below); members: the plans it includes (kept while it isn't combined too), each with its REPEAT there;
 *  moveUnread: MOVE UNREAD TO NEXT DAY (READ, below); done: by part ("" the plan's own, else an included plan's id),
 *  the plan days marked read; read: by part, the dates (YYYY-MM-DD) its reading was marked read on (MOVE UNREAD). */
interface Plan { id: string; name: string; base?: Base; count: number; start: string; repeat?: boolean; combined?: boolean; members?: Member[]; days: Record<string, string>;
                 moveUnread?: boolean; done: Record<string, number[]>; read: Record<string, string[]>; }
interface Member { id: string; repeat: boolean; }
/** One reading: book (its code), whole chapters c1 to c2. */
interface Reading { code: string; c1: number; c2: number; }

const KEY = "cotext.readingplans";
let books = new Map<string, Book> ();     // (The Hebrew Bible's and the NT's, by code: initReadingPlan)
let bookList: Book[] = [];
/** The factory plans, by base (each one's id): each its name, credit and either days (mcheyne.ts: Day 1 first), runs -
 *  books ([first, last] book codes, in the Bible's order) read a chapter a day, its days worked out from the books'
 *  chapter counts - or combine: a combined plan of those plans, each repeating. Each is offered on every device until
 *  deleted there (removed, below); all deleted, they come back. */
type Base = "mcheyne" | "nt" | "psalms" | "ot" | "combined";
const FACTORY: Record<Base, { name: string; credit: string; days?: string[]; runs?: [string, string][]; combine?: Base[] }> = {
  mcheyne: { name: "M'Cheyne", days: MCHEYNE, credit: "Reading plan: Robert Murray M'Cheyne's Bible Reading Calendar (1842; public domain), from CrossWire's SWORD module MCheyne 1.4." },
  nt: { name: "New Testament", runs: [["Mat", "Rev"]], credit: "Reading plan: the New Testament, a chapter a day (260 days)." },
  psalms: { name: "Psalms", runs: [["Psa", "Psa"]], credit: "Reading plan: the Psalms, a psalm a day (150 days)." },
  ot: { name: "Old Testament", runs: [["Gen", "Job"], ["Pro", "Mal"]], credit: "Reading plan: the Old Testament but the Psalms, a chapter a day (779 days)." },
  combined: { name: "Combined", combine: ["nt", "psalms", "ot"], credit: "" },
};
/** A run plan's chapters in order ("Gen 1", ...), from the books' chapter counts - worked out once the books are known
 *  (initReadingPlan; none before). */
const runChapters = new Map<Base, string[]> ();
function chaptersOf (b: Base): string[] {
  const runs = FACTORY[b].runs;
  if (! runs || ! bookList.length) return [];
  if (! runChapters.has (b)) {
    const at = (code: string) => bookList.findIndex ((x) => x.code === code);
    runChapters.set (b, runs.flatMap (([a, z]) => bookList.slice (at (a), at (z) + 1).flatMap ((x) => Array.from ({ length: x.chapters }, (_, i) => `${x.code} ${i + 1}`))));
  }
  return runChapters.get (b)!;
}
/** A factory day's readings as stored (n: 1 first; "" none), and its number of days. */
const factoryDay = (b: Base, n: number): string => (FACTORY[b].runs ? chaptersOf (b) : FACTORY[b].days ?? [])[n - 1] ?? "";
const factoryCount = (b: Base) => FACTORY[b].runs ? chaptersOf (b).length : FACTORY[b].days?.length ?? 0;

//==== COMBINED PLAN ====
// A plan of plans - a polymeter. COMBINED PLAN ticked in a plan's drop-down makes it one: its own days set aside (kept,
// back once unticked; no EDIT of its days), its drop-down lists PLANS - the plans it includes, a line each: its PLAN
// picker (to swap it for one not included), its REPEAT (the combined plan's own for that plan, apart from the plan's
// own REPEAT) and ✕ (taken out) -, then + ADD PLAN (the first plan not yet included - not combined itself - added).
// Day N of a combined plan reads Day N of every plan included, in the order included - each plan's own days, its own
// START and REPEAT ignored -; a plan with REPEAT ticked there starts over after its last day (plans of different
// lengths cycling against each other), unticked it stops (nothing of it from then). A combined plan with a plan
// repeating in it never ends - listed a year past the last day done. Its own START, REPEAT, MOVE UNREAD (on the calendar) and
// READ are its own - a checkbox for each plan in it, each marked read apart (with MOVE UNREAD each moving on its own); its readings are read-only - edited in the plans included. There may be several. The factory one,
// Combined, includes the New Testament, the Psalms and the Old Testament, each repeating: a chapter of each a day,
// never ending.
const isCombined = (p: Plan) => !! p.combined;
/** The plans in a combined plan (those still kept and not combined themselves), each with its REPEAT there. */
const membersOf = (c: Plan) => (c.members ?? []).flatMap ((m) => { const p = plans.find ((x) => x.id === m.id && ! isCombined (x)); return p ? [{ p, repeat: m.repeat }] : []; });

/** A plan's last day; Infinity for a combined plan with a plan repeating in it (never ending). */
function lastDay (p: Plan): number {
  if (! isCombined (p)) return p.count;
  const ms = membersOf (p);
  return ms.some ((m) => m.repeat && m.p.count) ? Infinity : Math.max (0, ...ms.map ((m) => m.p.count));
}
const endless = (p: Plan) => lastDay (p) === Infinity;
/** The days a plan's list shows: all of them; an endless plan's a year past the last day done. */
const listed = (p: Plan) => endless (p) ? Math.max (0, ...Object.values (p.done).flat ()) + 365 : lastDay (p);
const BASES = Object.keys (FACTORY) as Base[];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const factory = (b: Base): Plan => ({ id: b, name: FACTORY[b].name, base: b, count: factoryCount (b), start: "", days: {}, done: {}, read: {},
                                     ...(FACTORY[b].combine ? { combined: true, members: FACTORY[b].combine!.map ((id) => ({ id, repeat: true })) } : {}) });
let plans: Plan[] = [];
let removed: Base[] = [];     // (The factory plans deleted on this device: not offered again until every plan is)
let at = "";
/** The plans as kept (each load after the books are known gives a run plan its days: count at least its base's). */
function load () {
  plans = []; removed = [];
  try {
    const s = JSON.parse (localStorage.getItem (KEY) ?? "null");
    if (s && Array.isArray (s.plans)) {
      plans = s.plans.filter ((p: Plan) => p && typeof p.id === "string" && p.days && typeof p.days === "object" && Number.isInteger (p.count) && (! p.base || p.base in FACTORY))     // (A factory plan no longer made: dropped)
                     .map ((p: Plan) => ({ id: p.id, name: String (p.name ?? ""), ...(p.base && p.base in FACTORY ? { base: p.base } : {}),
                                           count: Math.max (0, p.count, p.base ? factoryCount (p.base) : 0),
                                           start: /^\d{4}-\d\d-\d\d$/.test (p.start) ? p.start : "",
                                           repeat: p.repeat === true,
                                           combined: p.combined === true, members: Array.isArray (p.members) ? p.members.filter ((m) => m && typeof m.id === "string").map ((m) => ({ id: m.id, repeat: m.repeat === true })) : [],
                                           days: p.days, moveUnread: p.moveUnread === true, done: marks (p.done, (n) => Number.isInteger (n)),
                                           read: marks (p.read, (d) => /^\d{4}-\d\d-\d\d$/.test (d)) }));
      at = String (s.at ?? "");
      removed = Array.isArray (s.removed) ? s.removed.filter ((b: Base) => b in FACTORY) : [];
    }
  } catch { /* unreadable or private mode: the factory plans */ }
  for (const b of BASES) if (! plans.some ((p) => p.base === b) && ! removed.includes (b)) plans.push (factory (b));     // (A factory plan new to this device added)
  if (! plans.length) { removed = []; plans = BASES.map (factory); }
  if (! plans.some ((p) => p.id === at)) at = plans[0].id;
}
/** A plan's kept marks by part, each list's entries checked (anything else: none). */
function marks<T> (v: unknown, ok: (x: T) => boolean): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  if (v && typeof v === "object" && ! Array.isArray (v))
    for (const [k, xs] of Object.entries (v)) if (Array.isArray (xs)) out[k] = xs.filter (ok);
  return out;
}
function save () {
  try { localStorage.setItem (KEY, JSON.stringify ({ at, plans, removed })); } catch { /* private mode: not kept */ }
}
load ();
const now = () => plans.find ((p) => p.id === at)!;
const shown = (p: Plan) => p.name || "Untitled";

/** A plan's parts, each read and marked on its own: a plan's one ("" - its days), a combined plan's a plan included
 *  each (by its id). */
const partsOf = (p: Plan) => isCombined (p) ? membersOf (p).map (({ p: m }) => m.id) : [""];
/** A plan day's readings (n: 1 first): its own edit, else its base's; a combined plan's, each plan's it includes
 *  (partDay). */
function dayOf (p: Plan, n: number): Reading[] {
  if (isCombined (p)) return partsOf (p).flatMap ((part) => partDay (p, part, n));
  return (String (n) in p.days ? p.days[n] : p.base ? factoryDay (p.base, n) : "").split (";").map (parse).filter ((r): r is Reading => !! r);
}
/** A part's readings on plan day n: a plan's own, its day n; a plan included in a combined plan, its day n - or n
 *  counted round (its REPEAT there ticked), else none past its last day. */
function partDay (p: Plan, part: string, n: number): Reading[] {
  if (! isCombined (p)) return part ? [] : dayOf (p, n);
  const x = membersOf (p).find (({ p: m }) => m.id === part);
  if (! x) return [];
  const m = x.p, k = x.repeat ? (m.count ? (n - 1) % m.count + 1 : 0) : n <= m.count ? n : 0;
  return k ? dayOf (m, k) : [];
}
function setDay (p: Plan, n: number, rs: Reading[]) {
  const s = rs.map (format).join (";");
  if (p.base && factoryDay (p.base, n) === s) delete p.days[n]; else p.days[n] = s;     // (Back as the base has it: no edit kept)
  save ();
}

/** The start date's year, month (0 first) and day; null not on the calendar. */
function startOf (p: Plan): { y: number; m: number; d: number } | null {
  if (! p.start) return null;
  const [y, m, d] = p.start.split ("-").map (Number);
  return { y, m: m - 1, d };
}
const dateText = (y: number, m: number, d: number) => `${y}-${String (m + 1).padStart (2, "0")}-${String (d).padStart (2, "0")}`;
/** The plan day read on a date (1 first), 0 none - MOVE UNREAD unticked: each date from the start on is the next plan
 *  day (the start Day 1), past the last day none, or (REPEAT) counted round from Day 1 (wrap). */
function dayOn (p: Plan, y: number, m: number, d: number): number {
  const s = startOf (p);
  if (! s) return 0;
  const from = Date.UTC (s.y, s.m, s.d), to = Date.UTC (y, m, d);     // (UTC: whole days apart, whatever summer time does)
  return to < from ? 0 : wrap (p, Math.round ((to - from) / 864e5) + 1);
}
/** Plan day n as read: itself up to the last day; past it none, or (REPEAT) counted round from Day 1. */
function wrap (p: Plan, n: number): number {
  const last = lastDay (p);
  if (n <= last) return n;
  return p.repeat && last ? (n - 1) % last + 1 : 0;     // (REPEAT: past the last day, Day 1 again)
}

//==== READ ====
// Each part of a day - a plan's day, or in a combined plan each plan's share of it (all its readings that day) - has a
// checkbox, ticked once read - in the resource as on the screen: a part ticked stays shown, its box ticked (to untick
// there).
// MOVE UNREAD unticked: Day N on its fixed date (dayOn); a part marked read is kept by plan day (done).
// MOVE UNREAD TO NEXT DAY (on the calendar only): the plan follows what's been read, not the date. Walking the dates
// from the start, each part's next unread plan day goes on each date; a date gone by whose part wasn't marked read
// keeps showing it - late: its references plain text, not links, its checkbox there to mark it read on that date (I
// read it yesterday) - and the same plan day goes on to the next date, so every missed date shows the same reading and
// today the first unread; marked read on a past date, the dates after it move on. Today and the dates to come are
// projected as if each is read on its day. In a combined plan each
// plan included moves on its own (one left unread held back while the others go on). A part marked read is kept by date
// (read): a date marked read counts its part read there, whatever plan day it shows. A part with no readings that day
// (a blank day, a plan included past its end) takes the date without a checkbox.
/** A part on a date or plan day: its plan day n (as read: wrap), read (marked), late (a date gone by, not read: MOVE
 *  UNREAD). */
interface Slot { part: string; n: number; read: boolean; late: boolean; }
/** The parts on plan day n (MOVE UNREAD unticked, or not on the calendar): a plan's one (even a blank day), a combined
 *  plan's those with readings that day. */
const slotsOfDay = (p: Plan, n: number): Slot[] => ! n ? [] : partsOf (p).filter ((part) => ! isCombined (p) || partDay (p, part, n).length)
  .map ((part) => ({ part, n, read: (p.done[part] ?? []).includes (n), late: false }));
const moving = (p: Plan) => !! p.start && !! p.moveUnread;
/** The parts on each date of month (y, m) by date text (none: no parts) - MOVE UNREAD's walk from the start (above), else
 *  each date's plan day's. */
function monthSlots (p: Plan, y: number, m: number): Map<string, Slot[]> {
  const out = new Map<string, Slot[]> (), n = new Date (y, m + 1, 0).getDate ();
  if (! moving (p)) {
    for (let d = 1; d <= n; d++) out.set (dateText (y, m, d), slotsOfDay (p, dayOn (p, y, m, d)));
    return out;
  }
  const s = startOf (p)!, t = today (), now = Date.UTC (t.y, t.m, t.d), first = Date.UTC (y, m, 1), end = Date.UTC (y, m, n);
  const parts = partsOf (p), next = parts.map (() => 1);     // (Each part's next plan day, counted on past the last: wrap)
  for (let at = Date.UTC (s.y, s.m, s.d); at <= end; at += 864e5) {
    const day = new Date (at);
    const key = dateText (day.getUTCFullYear (), day.getUTCMonth (), day.getUTCDate ()), slots: Slot[] = [];
    parts.forEach ((part, i) => {
      const k = wrap (p, next[i]);
      if (! k) return;     // (Past the end, not repeating: nothing more)
      if (! partDay (p, part, k).length) { next[i]++; return; }     // (Nothing to read: the date taken, no checkbox)
      const read = (p.read[part] ?? []).includes (key), past = at < now;
      slots.push ({ part, n: k, read, late: past && ! read });
      if (read || ! past) next[i]++;     // (A date gone by unread: the same plan day on the next date)
    });
    if (at >= first) out.set (key, slots);
  }
  return out;
}
/** A part marked read or not: on its date (MOVE UNREAD: date given), else on its plan day. */
function setRead (p: Plan, s: Slot, date: string, on: boolean) {
  const [list, x] = moving (p) && date ? [p.read, date] as const : [p.done, s.n] as const;
  const xs = ((list as Record<string, (string | number)[]>)[s.part] ?? []).filter ((v) => v !== x);
  if (on) xs.push (x);
  (list as Record<string, (string | number)[]>)[s.part] = xs;
  save ();
}

/** "Gen 1", "Psa 52-54" -> a reading (a verse in it - "Luk 1:1-38", "Isa 9:7-10:4" - read as its chapters); null for
 *  anything else. */
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
/** main.ts: the books (the Hebrew Bible's and the NT's are a plan's) and going to a verse. */
export function initReadingPlan (bs: Book[], go: (b: Book, c: number, v: number) => void) {
  goVerse = go;
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
   *  the list "Day N" (n) - and its parts' readings (READ, above). A plan's one part's checkbox is on the label; a
   *  combined plan's a checkbox each, before its plan's readings (the label's box there unseen, so every date lines up,
   *  as a date with no parts). A late part's readings are plain text, not links. */
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
        if (s.late) { into.append (el ("span", "planLate", label (r))); continue; }     // (Late: its reference plain, a part to mark read)
        const a = el ("a", "term", label (r));
        a.addEventListener ("click", (e) => { e.stopPropagation (); o.leaving?. (); goVerse (books.get (r.code)!, r.c1, 1); });
        into.append (a);
      }
    };
    const one = ! isCombined (p) && slots.length === 1;
    if (one) {
      const c = box (slots[0], ...named ());
      c.classList.add ("planN");
      when.append (c);
      reads (slots[0], list);
    } else if (date || slots.length) {     // (No checkbox on the label: its box there unseen)
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
      const rows = Array.from ({ length: listed (p) }, (_, i) => i + 1).map ((n) => dayCell (p, n, slotsOfDay (p, n), picked));
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
let pane: { el: HTMLElement; cal: ReturnType<typeof calendar>; pick: HTMLElement; sel: HTMLSelectElement } | null = null;
/** The resource's calendar, drawn for the plans as they are now (notes.ts puts it in the pane) - at today's month when
 *  fresh (just put in), else at the month it shows. */
export function planPane (fresh: boolean): HTMLElement {
  if (! pane) {
    const cal = calendar ({ done: () => screenDraw () }), box = el ("div", "planPane"), pick = el ("label", "field", "Plan"), sel = el ("select", "choose");
    sel.addEventListener ("change", () => { at = sel.value; save (); pane!.cal.draw (); });
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
let picked = 0;     // (The plan day being edited: 1 first, 0 none - a plan with no days)
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
  const cal = calendar ({ leaving: closeScreen, picked: () => picked, pick: (n) => { picked = n; show (true); drawEditor (); cal.draw (); }, done: () => paneDraw () });
  // EDIT: the picked day's readings, a line each, + Add reading and + Add day under them
  const editor = el ("div", "deckPane csEditor"), head = el ("div", "top paneHead"), close = el ("button", "pill icon");
  setIcon (close, "x"); close.setAttribute ("aria-label", "Close the editor");
  head.append (el ("h2", "title", "Edit"), close);
  const dayName = el ("div", "src"), lines = el ("div", "planLines"), adds = el ("div", "fieldRow");
  const add = el ("button", "pill action", "+ Add reading"), addDay = el ("button", "pill action", "+ Add day");
  adds.append (add, addDay);
  editor.append (head, dayName, lines, adds);
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
  const changed = () => { pickAfresh (); drawEditor (); cal.draw (); paneDraw (); };     // (The resource too, if made)
  add.addEventListener ("click", () => {
    // (A new reading: the chapter after the day's last reading, else Genesis 1 - then changed in its pickers)
    const rs = dayOf (now (), picked), last = rs[rs.length - 1];
    const code = last?.code ?? "Gen", c = last ? Math.min (last.c2 + 1, books.get (code)!.chapters) : 1;
    rs.push ({ code, c1: c, c2: c });
    setDay (now (), picked, rs); changed ();
  });
  addDay.addEventListener ("click", () => {
    // (A day after the plan's last, with no readings, picked - its own edit, so a factory day beyond M'Cheyne's 365 stays blank)
    const p = now ();
    p.count++; p.days[p.count] = ""; picked = p.count;
    save (); changed ();
    cal.el.querySelector (".planDay.on")?.scrollIntoView ({ block: "nearest" });
  });

  // The top row: the plan's name and its drop-down (topbar.ts) - a new plan starts with no days, named "Plan 2"...;
  // then START, the open plan's
  const when = el ("div", "fieldRow"), options = el ("div", "field");
  let menuOpen = "";     // (The drop-down open: "more", or "" closed)
  function drawTop () {
    const named = nameMenu<Plan> ({
      noun: "Plan", all: () => plans, open: now, shown, blank: "Untitled",
      select: (id) => { at = id; save (); drawTop (); changed (); },
      make: () => { const p: Plan = { id: Date.now ().toString (36), name: `Plan ${plans.length + 1}`, count: 0, start: "", days: {}, done: {}, read: {} }; plans.push (p); at = p.id; save (); drawTop (); changed (); },
      ask: (p) => `Delete the plan "${shown (p)}"?`,
      remove: (p) => {
        plans = plans.filter ((x) => x !== p);
        for (const c of plans) if (c.members) c.members = c.members.filter ((m) => m.id !== p.id);     // (Taken out of the combined plans)
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
  /** START (not on the calendar, or on a date: MONTH, DAY, YEAR - today's when first set) - each change kept and the
   *  plan drawn again. */
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
    // REPEAT and MOVE UNREAD TO NEXT DAY (on the calendar only) and COMBINED PLAN - ticked, its plans and + ADD PLAN
    const ticks = el ("div", "csFathers");
    if (s) ticks.append (check (!! p.repeat, (on) => { p.repeat = on; save (); changed (); }, "Repeat"),
                         check (!! p.moveUnread, (on) => { p.moveUnread = on; save (); changed (); }, "Move unread to next day"));
    ticks.append (check (isCombined (p), (on) => { p.combined = on; p.members ??= []; save (); drawWhen (); changed (); }, "Combined plan"));
    if (! isCombined (p)) { options.replaceChildren (ticks); return; }
    // (PLANS: a line a plan included, in order - its PLAN picker (it, or any plan not yet included), its REPEAT and ✕ -,
    // then + ADD PLAN: the first plan not included added, without REPEAT, picked from then in its line)
    const free = () => plans.filter ((x) => x !== p && ! isCombined (x) && ! p.members!.some ((k) => k.id === x.id));
    const rows = membersOf (p).map (({ p: x }) => {
      const m = p.members!.find ((k) => k.id === x.id)!, row = el ("div", "fieldRow planPlace planMember");
      row.append (pick ("Plan", [x, ...free ()].map ((y): [string, string] => [y.id, shown (y)]), x.id, (v) => { m.id = v; save (); drawWhen (); changed (); }),
                  check (m.repeat, (on) => { m.repeat = on; save (); changed (); }, "Repeat"));
      const out = el ("button", "pill icon csRemove");
      setIcon (out, "x"); out.setAttribute ("aria-label", `Take ${shown (x)} out of this plan`);
      out.addEventListener ("click", () => { p.members = p.members!.filter ((k) => k !== m); save (); drawWhen (); changed (); });
      row.append (out);
      return row;
    });
    const addPlan = el ("button", "pill action", "+ Add plan");
    addPlan.hidden = ! free ().length;
    addPlan.addEventListener ("click", () => { const x = free ()[0]; if (! x) return; p.members!.push ({ id: x.id, repeat: false }); save (); drawWhen (); changed (); });
    options.replaceChildren (ticks, el ("div", "field", "Plans"), ...rows, addPlan);
  }

  // A reading's line: BOOK, CHAPTER, TO CHAPTER and ✕ - a change kept at once
  function drawEditor () {
    const p = now (), n = picked;
    dayName.textContent = n ? `Day ${n}` : "No days yet.";
    add.hidden = ! n || isCombined (p); addDay.hidden = isCombined (p);
    if (isCombined (p)) {     // (Read-only: its readings are the plans' in it, edited there)
      lines.replaceChildren (el ("p", "", "A combined plan's readings are its plans' - edited in each plan."));
      return;
    }
    const rs = n ? dayOf (p, n) : [];
    lines.replaceChildren (...rs.map ((r, i) => {
      const line = el ("div", "csLine"), place = el ("div", "fieldRow planPlace");
      const set = (f: Partial<Reading>) => {
        Object.assign (r, f);
        if (r.c2 < r.c1) r.c2 = r.c1;
        setDay (p, n, rs); changed ();
      };
      const b = books.get (r.code)!, nums = (from: number, to: number) => Array.from ({ length: to - from + 1 }, (_, k) => from + k);
      place.append (
        pick ("Book", bookList.map ((x) => [x.code, x.name, ABBR[x.name]]), r.code, (v) => set ({ code: v, c1: 1, c2: 1 })),
        pick ("Chapter", nums (1, b.chapters).map ((c) => [String (c), String (c)]), String (r.c1), (v) => set ({ c1: +v, c2: Math.max (r.c2, +v) })),
        pick ("To chapter", nums (r.c1, b.chapters).map ((c) => [String (c), String (c)]), String (r.c2), (v) => set ({ c2: +v })));
      const x = el ("button", "pill icon csRemove");
      setIcon (x, "x"); x.setAttribute ("aria-label", "Remove this reading");
      x.addEventListener ("click", () => { rs.splice (i, 1); setDay (p, n, rs); changed (); });
      place.append (x);
      line.append (place);
      return line;
    }));
    if (n && ! rs.length) lines.append (el ("p", "", "No readings this day."));
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
