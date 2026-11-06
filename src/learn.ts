// ☰ Learn: a grammar's lessons as short quizzes, one after another, a lesson opening only once the one before is passed
// (a simplified Duolingo). COURSE picks the grammar followed - Hebrew (Gesenius) or Greek (Machen); at first the
// language of the testament read, then the reader's own pick. The questions are learncourses.ts' (generated from the
// grammars' text and, for Machen, his vocabularies and exercises).
// - THE PATH: the course's lessons in the grammar's order, a row each - its number and title, under it how it stands:
//   PASSED (and the best score), the best score so far and what passing takes, START, or LOCKED (greyed, not opening)
//   until the lesson before is passed.
// - A LESSON: ALL LESSONS (back to the path) and READ THE GRAMMAR (the lesson's sections, the grammar's own text - as the
//   word panel's GRAMMAR shows them: grammar.ts' readSections - shown or hidden above the quiz); its title and the
//   grammar's §§ under it; then its questions one at a time, in a new order each time: the question on a card
//   (flashcards' look: cards.ts' - a short Hebrew or Greek word large, as a card's front, anything longer at the text's size, as its back: in a box of its own, one line of text in the back's grid), "3 of 12"
//   under it, the choices (in a new order) as a list under that. A choice tapped is answered at once: the right answer
//   in the accent, a wrong pick in --wrong and struck through, a line saying so (and why, where the question says), and
//   NEXT. At the end the score: PASSED at PASS (80%) or more - the next lesson opens - else NOT YET; NEXT LESSON
//   (once passed) and TRY AGAIN (ALL LESSONS above, as throughout).
// Kept on the device ("cotext.learn"): the course picked and each lesson's best score - a lesson passed stays passed.
// Hebrew and Greek in a question or choice are set in their own fonts (marked).

import { onScreen, currentTestament } from "./study";
import { readSections, sectionCaption, grammarCredit } from "./grammar";
import { shuffle } from "./cards";
import { COURSES, type Course, type Lesson, type Question } from "./learncourses";

/** The share of a lesson's questions answered right that passes it (and opens the next). */
const PASS = 0.8;
const KEY = "cotext.learn";
/** What's kept: the course picked (its id; none yet: the testament's language) and each lesson's best score (0-1, by
 *  lesson id). */
interface Kept { course?: string; best: Record<string, number>; }
let kept: Kept = { best: {} };
try { kept = { ...kept, ...JSON.parse (localStorage.getItem (KEY) ?? "{}") }; kept.best ??= {}; } catch { /* none kept, or private mode */ }
const save = () => { try { localStorage.setItem (KEY, JSON.stringify (kept)); } catch { /* private mode: not kept */ } };

const passed = (l: Lesson) => (kept.best[l.id] ?? 0) >= PASS;
const open = (c: Course, i: number) => i === 0 || passed (c.lessons[i - 1]);
const pct = (x: number) => `${Math.round (x * 100)}%`;
const course = () => COURSES.find ((c) => c.id === kept.course) ?? COURSES.find ((c) => c.lang === (currentTestament () === "OT" ? "H" : "G"))!;

const esc = (s: string) => s.replace (/[&<>"]/g, (c) => `&#${c.charCodeAt (0)};`);
// Hebrew and Greek runs (words, and the spaces, maqqephs and commas between them) set in their own fonts - .heWord,
// .grWord, the flashcards' - the Hebrew isolated right to left within its English line.
const HE = /[֑-״יִ-ﭏ]+(?:[ ,־]+[֑-״יִ-ﭏ]+)*/g;
const GR = /[Ͱ-Ͽἀ-῿]+(?:[ ,]+[Ͱ-Ͽἀ-῿]+)*/g;
const marked = (s: string) => esc (s).replace (HE, (m) => `<span class="heWord" dir="rtl">${m}</span>`).replace (GR, (m) => `<span class="grWord">${m}</span>`);
/** A prompt that's a short word in Hebrew or Greek alone (no English): shown large, as a flashcard's front. */
const wordOnly = (s: string) => s.length <= 14 && ! /[A-Za-z?]/.test (s);

async function draw (body: HTMLElement) {
  /** The path: COURSE, then the course's lessons. */
  const path = () => {
    const c = course ();
    body.innerHTML = `<div class="fieldRow"><label class="field">Course<select class="choose">${COURSES.map ((x) => `<option value="${x.id}">${esc (x.name)}</option>`).join ("")}</select></label></div>
      <div class="learnPath"></div><p class="credit"></p>`;
    const pick = body.querySelector<HTMLSelectElement> ("select")!;
    pick.value = c.id;
    pick.addEventListener ("change", () => { kept.course = pick.value; save (); path (); });
    const list = body.querySelector<HTMLElement> (".learnPath")!;
    c.lessons.forEach ((l, i) => {
      const best = kept.best[l.id], ok = open (c, i);
      const b = document.createElement ("button");
      b.className = "hit";
      b.disabled = ! ok;
      const status = ! ok ? `Locked - pass lesson ${i} first` : passed (l) ? `Passed - best ${pct (best)}` : best !== undefined ? `Best ${pct (best)} - ${pct (PASS)} to pass` : "Start";
      b.innerHTML = `<b>${i + 1}. ${esc (l.title)}</b><span class="learnStatus">${status}</span>`;
      b.addEventListener ("click", () => lesson (c, i));
      list.append (b);
    });
    body.querySelector (".credit")!.textContent = `Quizzes generated from ${grammarCredit (c.id)}.`;
  };

  /** Lesson i of course c: its grammar (hidden at first) and its quiz. */
  const lesson = (c: Course, i: number) => {
    const l = c.lessons[i];
    body.innerHTML = `<div class="bar"><button class="pill" data-k="path">All lessons</button><button class="pill" data-k="read" aria-pressed="false">Read the grammar</button></div>
      <div><h2 class="title">${i + 1}. ${esc (l.title)}</h2><div class="src"></div></div>
      <div class="gBody" hidden></div><div class="learnQuiz"></div><p class="credit"></p>`;
    const gram = body.querySelector<HTMLElement> (".gBody")!, read = body.querySelector<HTMLElement> ("[data-k=read]")!;
    body.querySelector ("[data-k=path]")!.addEventListener ("click", () => { path (); scrollUp (); });
    body.querySelector (".credit")!.textContent = `Quiz generated from ${grammarCredit (c.id)}.`;
    // (The sections read once, as the lesson opens: their § in the caption at once, their text shown when asked)
    void readSections (c.id, l.sections).then ((s) => {
      if (! gram.isConnected) return;     // (Another lesson or the path drawn meanwhile)
      body.querySelector (".src")!.textContent = sectionCaption (c.id, s.labels, s.count);
      gram.innerHTML = s.html;
      gram.classList.toggle ("one", s.count === 1);
    });
    read.addEventListener ("click", () => { gram.hidden = ! gram.hidden; read.setAttribute ("aria-pressed", String (! gram.hidden)); });
    quiz (c, i, body.querySelector<HTMLElement> (".learnQuiz")!);
  };

  /** The quiz itself, into el: every question, in a new order, then the score. */
  const quiz = (c: Course, i: number, el: HTMLElement) => {
    const l = c.lessons[i], qs = shuffle ([...l.questions]);
    let at = 0, right = 0;
    const ask = (q: Question) => {
      const big = wordOnly (q.q);
      el.innerHTML = `<div class="card learnCard"><div class="${big ? "cardFront" : "cardBack"}"><div>${marked (q.q)}</div></div></div>
        <div class="src cardCount">${at + 1} of ${qs.length}</div>
        <div class="chooseList inline learnChoices"></div><p class="learnNote" hidden></p>
        <button class="pill action" hidden>${at + 1 < qs.length ? "Next" : "See the score"}</button>`;
      const choices = el.querySelector<HTMLElement> (".learnChoices")!, note = el.querySelector<HTMLElement> (".learnNote")!;
      const next = el.querySelector<HTMLButtonElement> (".pill.action")!;
      let answered = false, rightBtn: HTMLElement;
      for (const text of shuffle ([q.a, ...q.x])) {
        const b = document.createElement ("button");
        b.type = "button"; b.className = "chooseItem"; b.innerHTML = marked (text);
        if (text === q.a) rightBtn = b;
        b.addEventListener ("click", () => {
          if (answered) return;
          answered = true;
          const ok = text === q.a;
          if (ok) right++;
          rightBtn.setAttribute ("aria-pressed", "true");     // (The right answer in the accent: a picker's choice's look)
          if (! ok) b.classList.add ("wrong");
          note.innerHTML = (ok ? "Right." : `Not quite: ${marked (q.a)}.`) + (q.why ? ` ${marked (q.why)}` : "");
          note.hidden = next.hidden = false;
          next.scrollIntoView ({ block: "nearest" });
        });
        choices.append (b);
      }
      next.addEventListener ("click", () => { at++; if (at < qs.length) ask (qs[at]); else score (); scrollUp (); });
    };
    const score = () => {
      const s = right / qs.length, ok = s >= PASS, more = i + 1 < c.lessons.length;
      kept.best[l.id] = Math.max (kept.best[l.id] ?? 0, s);
      save ();
      el.innerHTML = `<div class="card learnCard"><div class="cardFront">${pct (s)}</div>
        <div class="cardBack">${right} of ${qs.length} right. ${ok ? (more ? `Passed: lesson ${i + 2} is open.` : "Passed: the course's last lesson.") : `Not yet: ${pct (PASS)} passes. Read the grammar and try again.`}</div></div>
        <div class="bar">${ok && more ? `<button class="pill action" data-k="next">Next lesson</button>` : ""}<button class="pill action" data-k="again">Try again</button></div>`;
      el.querySelector ("[data-k=next]")?.addEventListener ("click", () => { lesson (c, i + 1); scrollUp (); });
      el.querySelector ("[data-k=again]")!.addEventListener ("click", () => { quiz (c, i, el); });
    };
    ask (qs[0]);
  };

  path ();
}

/** Back to the screen's top (a new view drawn). */
const scrollUp = () => { document.getElementById ("screen")!.scrollTop = 0; };

onScreen ("Learn", draw);
