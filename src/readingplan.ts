// Reading plans: numbered days of Bible readings - Day 1, Day 2... -, each reading a link to its passage. Two views of
// one plan (calendar, below):
// - The resource (notes.ts: "Reading plan" in the resources pane's picker, its own READING group): the open plan,
//   read-only - a PLAN picker over it while there's more than one.
// - ☰ Reading plan (the drawer's screen): the same under a top row naming the open plan (topbar.ts' nameMenu, as the
//   Verse cards' decks: SELECT PLAN, DELETE PLAN, + NEW PLAN, NAME; then the plan's own START and DAYS, below), and a
//   bottom bar with a pencil in its middle showing or hiding EDIT - a screen's panel (layout.ts' deckPaneSplit, as the
//   Study printout's editor): the picked day ("Day 12") and its readings, each its BOOK, CHAPTER, TO CHAPTER and ✕, then
//   + Add reading and + Add day (a day after the last, picked). A plan day tapped (not on a reading) is picked - its
//   tint - and EDIT opens on it.
// Each plan, kept with it: START - "Not on the calendar" (the default) or "On a date" (its MONTH, DAY and YEAR) - and
// DAYS, a checkbox a weekday (Sun-Sat, all ticked at first, one at least): the weekdays the plan is read on.
// DONE: each day's "Day N" a checkbox, ticked when done. In the resource a day ticked is no longer shown (on the
// calendar its date stays, blank; in the list its row goes); the screen shows every day, the days done ticked -
// unticked, the day shows in the resource again.
// - Not on the calendar: the days as a list, a day a row - "Day 1" at its left, its readings beside them - at any width.
// - On the calendar: the month's name between ‹ and › (the month before and after), then its days - where its box is at
//   least 560 px wide a week a row, Sunday first, each day its date over its plan day and readings; narrower, a day a
//   row, its weekday, date and plan day at its left, its readings beside them (style.css' .planCal: a container query,
//   the box's own width, never the device's). Each ticked weekday from the start date on is given the next plan day -
//   "Day N" and its readings -; a day not ticked, before the start or after the plan's last day is blank. Today's date
//   in the accent; each opening shows today's month, today scrolled into view.
// A reading tapped goes to its first chapter (main.ts' goVerse; from the screen, back to the Bible first). Plans read
// whole chapters only - a reading a book's chapter or run of chapters, never part of one (M'Cheyne's made so:
// mcheyne.py). The factory plans (FACTORY: M'Cheyne's, mcheyne.ts, and Three Readings - Psalms and the NT, Genesis-2
// Chronicles, Ezra-Malachi, a chapter or two each a day: threeplan.ts, threeplan.py - each 365 days in order) are what
// their edits are laid over: their days kept as they ship, the user's changes kept apart (days) - so a corrected factory
// plan reaches every device, edited days excepted.
// Kept on the device: localStorage cotext.readingplans = { at: the open plan's id, removed: the factory plans deleted
// here (not offered again), plans: [{ id, name, base?: "mcheyne" | "three", count: its number of days, start: "YYYY-MM-DD" ("" not on the calendar), week: the weekdays read (bits,
// Sunday 1 ... Saturday 64), days: { "<day number, 1 first>": readings }, done: the plan days marked done }] } - a day's readings joined by ";", each as
// parse reads it; a day in days overrides the base's ("" none). A plan saved another way (before days were numbered) is
// dropped. A factory plan new to the device is added to its plans; every plan deleted, the factory plans back, unedited.

import type { Book } from "./reader";
import { MCHEYNE } from "./mcheyne";
import { THREEPLAN } from "./threeplan";
import { ABBR } from "./booknames";
import { setIcon } from "./icons";
import { onScreen, closeScreen } from "./study";
import { nameMenu, dropDowns, watchTopBar, check } from "./topbar";
import { deckPaneSplit } from "./layout";

//==== PLANS ====

interface Plan { id: string; name: string; base?: Base; count: number; start: string; week: number; days: Record<string, string>; done: number[]; }
/** One reading: book (its code), whole chapters c1 to c2. */
interface Reading { code: string; c1: number; c2: number; }

const KEY = "cotext.readingplans";
/** The factory plans, by base: each its name, days (mcheyne.ts, threeplan.ts - Day 1 first) and credit. Each is offered on
 *  every device until deleted there (removed, below); all deleted, they come back. */
type Base = "mcheyne" | "three";
const FACTORY: Record<Base, { name: string; days: string[]; credit: string }> = {
  mcheyne: { name: "M'Cheyne", days: MCHEYNE, credit: "Reading plan: Robert Murray M'Cheyne's Bible Reading Calendar (1842; public domain), from CrossWire's SWORD module MCheyne 1.4." },
  three: { name: "Three Readings", days: THREEPLAN, credit: "Reading plan generated for COTEXT: Psalms and the New Testament; Genesis to 2 Chronicles; Ezra to Malachi." },
};
const BASES = Object.keys (FACTORY) as Base[];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const EVERY_DAY = 127;     // (week: every weekday ticked)

const factory = (b: Base): Plan => ({ id: b, name: FACTORY[b].name, base: b, count: FACTORY[b].days.length, start: "", week: EVERY_DAY, days: {}, done: [] });
let plans: Plan[] = [];
let removed: Base[] = [];     // (The factory plans deleted on this device: not offered again until every plan is)
let at = "";
function load () {
  plans = []; removed = [];
  try {
    const s = JSON.parse (localStorage.getItem (KEY) ?? "null");
    if (s && Array.isArray (s.plans)) {
      plans = s.plans.filter ((p: Plan) => p && typeof p.id === "string" && p.days && typeof p.days === "object" && Number.isInteger (p.count))
                     .map ((p: Plan) => ({ id: p.id, name: String (p.name ?? ""), ...(p.base && p.base in FACTORY ? { base: p.base } : {}), count: Math.max (0, p.count),
                                           start: /^\d{4}-\d\d-\d\d$/.test (p.start) ? p.start : "",
                                           week: Number.isInteger (p.week) && p.week > 0 && p.week <= EVERY_DAY ? p.week : EVERY_DAY, days: p.days,
                                           done: Array.isArray (p.done) ? p.done.filter ((n) => Number.isInteger (n)) : [] }));
      at = String (s.at ?? "");
      removed = Array.isArray (s.removed) ? s.removed.filter ((b: Base) => b in FACTORY) : [];
    }
  } catch { /* unreadable or private mode: the factory plans */ }
  for (const b of BASES) if (! plans.some ((p) => p.base === b) && ! removed.includes (b)) plans.push (factory (b));     // (A factory plan new to this device added)
  if (! plans.length) { removed = []; plans = BASES.map (factory); }
  if (! plans.some ((p) => p.id === at)) at = plans[0].id;
}
function save () {
  try { localStorage.setItem (KEY, JSON.stringify ({ at, plans, removed })); } catch { /* private mode: not kept */ }
}
load ();
const now = () => plans.find ((p) => p.id === at)!;
const shown = (p: Plan) => p.name || "Untitled";

/** Whether plan day n is marked done (the resource's DONE; the screen's checkbox), and marking it. */
const isDone = (p: Plan, n: number) => p.done.includes (n);
function setDone (p: Plan, n: number, on: boolean) {
  p.done = p.done.filter ((x) => x !== n);
  if (on) p.done.push (n);
  save ();
}
/** A plan day's readings (n: 1 first): its own edit, else its base's. */
const dayOf = (p: Plan, n: number): Reading[] =>
  (String (n) in p.days ? p.days[n] : p.base ? FACTORY[p.base].days[n - 1] ?? "" : "").split (";").map (parse).filter ((r): r is Reading => !! r);
function setDay (p: Plan, n: number, rs: Reading[]) {
  const s = rs.map (format).join (";");
  if (p.base && (FACTORY[p.base].days[n - 1] ?? "") === s) delete p.days[n]; else p.days[n] = s;     // (Back as the base has it: no edit kept)
  save ();
}

/** The start date's year, month (0 first) and day; null not on the calendar. */
function startOf (p: Plan): { y: number; m: number; d: number } | null {
  if (! p.start) return null;
  const [y, m, d] = p.start.split ("-").map (Number);
  return { y, m: m - 1, d };
}
const dateText = (y: number, m: number, d: number) => `${y}-${String (m + 1).padStart (2, "0")}-${String (d).padStart (2, "0")}`;
/** The plan day read on a date (1 first), 0 none: each ticked weekday from the start on is the next plan day - the
 *  ticked weekdays counted from the start to the date (whole weeks at once, then the rest a day at a time). */
function dayOn (p: Plan, y: number, m: number, d: number): number {
  const s = startOf (p);
  if (! s) return 0;
  const from = Date.UTC (s.y, s.m, s.d), to = Date.UTC (y, m, d);     // (UTC: whole days apart, whatever summer time does)
  if (to < from || ! (p.week & 1 << new Date (to).getUTCDay ())) return 0;
  const span = Math.round ((to - from) / 864e5) + 1, first = new Date (from).getUTCDay ();
  let perWeek = 0;
  for (let w = 0; w < 7; w++) if (p.week & 1 << w) perWeek++;
  let n = Math.floor (span / 7) * perWeek;
  for (let k = 0; k < span % 7; k++) if (p.week & 1 << (first + k) % 7) n++;
  return n <= p.count ? n : 0;
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

let books = new Map<string, Book> ();     // (The Hebrew Bible's and the NT's, by code)
let bookList: Book[] = [];
let goVerse: (b: Book, c: number, v: number) => void = () => {};
/** main.ts: the books (the Hebrew Bible's and the NT's are a plan's) and going to a verse. */
export function initReadingPlan (bs: Book[], go: (b: Book, c: number, v: number) => void) {
  goVerse = go;
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

/** The open plan as a calendar (a start date set) or a list of its days (none): el, its box; draw, drawn again (the
 *  plan or a day changed) - at month (y, m) if given, else the month shown. leaving: called before a reading's passage
 *  is gone to (the screen closed); pick: a plan day tapped (not its readings) - the screen's editor (none in the
 *  resource); picked: the plan day marked picked (0 none). Each day's "Day N" a checkbox, ticked when done; resource: the
 *  resource's - a day ticked no longer shown, the days done left out -; else the screen's, every day shown (done: told
 *  of a change). */
function calendar (o: { leaving?: () => void; pick?: (n: number) => void; picked?: () => number; resource?: boolean; done?: () => void }) {
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
  /** A day's row or cell: its date (dated: weekday and day of the month) and plan day over or beside its readings. */
  function dayCell (p: Plan, n: number, picked: number, date?: { wd: number; d: number }) {
    const cell = el ("div", "planDay");
    if (n && n === picked) cell.classList.add ("on");
    const when = el ("span", "planDate");
    if (date) when.append (el ("span", "planWd", WEEKDAYS[date.wd] + " "), String (date.d));
    if (n) {
      const c = check (isDone (p, n), (on) => { setDone (p, n, on); if (o.resource) draw (); else o.done?. (); }, `Day ${n}`);     // (The resource: a day ticked goes)
      c.classList.add ("planN");
      c.addEventListener ("click", (e) => e.stopPropagation ());     // (Ticking it never picks the day)
      when.append (c);
    }
    const list = el ("span", "planReads");
    if (n) for (const r of dayOf (p, n)) {
      const a = el ("a", "term", label (r));
      a.addEventListener ("click", (e) => { e.stopPropagation (); o.leaving?. (); goVerse (books.get (r.code)!, r.c1, 1); });
      list.append (a);
    }
    cell.append (when, list);
    if (o.pick && n) cell.addEventListener ("click", () => o.pick! (n));
    return cell;
  }
  function draw (to?: { y: number; m: number }) {
    if (to) ({ y, m } = to);
    const p = now (), dated = !! p.start, picked = o.picked?. () ?? 0;
    box.classList.toggle ("planList", ! dated);
    head.hidden = week.hidden = ! dated;
    if (! dated) {
      const ns = Array.from ({ length: p.count }, (_, i) => i + 1).filter ((n) => ! o.resource || ! isDone (p, n));     // (The resource: the days done left out)
      days.replaceChildren (...ns.map ((n) => dayCell (p, n, picked)));
      if (! ns.length) days.append (el ("p", "", p.count ? "Every day done." : "No days yet."));
    } else {
      const first = new Date (y, m, 1).getDay (), n = new Date (y, m + 1, 0).getDate ();
      title.textContent = `${MONTHS[m]} ${y}`;
      days.replaceChildren (...Array.from ({ length: n }, (_, i) => {
        const d = i + 1, on = dayOn (p, y, m, d), cell = dayCell (p, o.resource && isDone (p, on) ? 0 : on, picked, { wd: (first + i) % 7, d });     // (The resource: a day done blank)
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
let pane: { el: HTMLElement; cal: ReturnType<typeof calendar>; pick: HTMLElement } | null = null;
/** The resource's calendar, drawn for the plans as they are now (notes.ts puts it in the pane) - at today's month when
 *  fresh (just put in), else at the month it shows. */
export function planPane (fresh: boolean): HTMLElement {
  if (! pane) {
    const cal = calendar ({ resource: true }), box = el ("div", "planPane"), pick = el ("label", "field", "Plan");
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
    if (pickedIn === p.id && picked >= 1 && picked <= p.count) return;
    pickedIn = p.id;
    picked = Math.min (dayOn (p, t.y, t.m, t.d) || 1, p.count);
  };
  pickAfresh ();
  const top = el ("div", "topBar"), row = el ("div", "topRow"), menu = el ("div", "vcMenu");
  top.append (row, menu);
  const cal = calendar ({ leaving: closeScreen, picked: () => picked, pick: (n) => { picked = n; show (true); drawEditor (); cal.draw (); }, done: () => pane?.cal.draw () });
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
  const changed = () => { pickAfresh (); drawEditor (); cal.draw (); };
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
  // then START and DAYS, the open plan's
  const when = el ("div", "fieldRow"), weekdays = el ("div", "field", "Days");
  function drawTop () {
    const named = nameMenu<Plan> ({
      noun: "Plan", all: () => plans, open: now, shown, blank: "Untitled",
      select: (id) => { at = id; save (); drawTop (); changed (); },
      make: () => { const p: Plan = { id: Date.now ().toString (36), name: `Plan ${plans.length + 1}`, count: 0, start: "", week: EVERY_DAY, days: {}, done: [] }; plans.push (p); at = p.id; save (); drawTop (); changed (); },
      ask: (p) => `Delete the plan "${shown (p)}"?`,
      remove: (p) => { plans = plans.filter ((x) => x !== p); if (p.base && ! plans.some ((x) => x.base === p.base)) removed.push (p.base); if (! plans.length) { removed = []; plans = BASES.map (factory); } at = plans[0].id; save (); drawTop (); changed (); },
      renamed: () => save () });
    row.replaceChildren (named.title);
    drawWhen ();
    menu.replaceChildren (...named.rows, when, weekdays);
    dropDowns ([{ key: "more", button: named.button, menu }], "");
  }
  /** START (not on the calendar, or on a date: MONTH, DAY, YEAR - today's when first set) and DAYS (a weekday's
   *  checkbox each; the last ticked can't be unticked) - each change kept and the plan drawn again. */
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
    const boxes = el ("div", "csFathers");
    boxes.append (...WEEKDAYS.map ((w, k) => check (!! (p.week & 1 << k), (on) => {
      const week = on ? p.week | 1 << k : p.week & ~(1 << k);
      if (week) { p.week = week; save (); changed (); }
      drawWhen ();     // (The last unticked: ticked again)
    }, w)));
    weekdays.replaceChildren ("Days", boxes);
  }

  // A reading's line: BOOK, CHAPTER, TO CHAPTER and ✕ - a change kept at once
  function drawEditor () {
    const p = now (), n = picked;
    dayName.textContent = n ? `Day ${n}` : "No days yet.";
    add.hidden = ! n;
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
