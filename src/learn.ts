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
//   in the accent, a wrong pick in --wrong and struck through, a line saying so (and why, where the question says) with
//   SHOW IN THE GRAMMAR where the question says where it's taught (its s and find: learncourses.ts) - the grammar shown,
//   that section opened and scrolled to, the passage marked in the tapped word's tint (style.css' .gSec mark), kept
//   marked until another link is followed - and NEXT. At the end the score: PASSED at PASS (80%) or more - the next lesson opens - else NOT YET; NEXT LESSON
//   (once passed) and TRY AGAIN (ALL LESSONS above, as throughout).
// Kept on the device ("cotext.learn"): the course picked and each lesson's best score - a lesson passed stays passed.
// Hebrew and Greek in a question or choice are set in their own fonts (marked).

import { onScreen, currentTestament } from "./study";
import { readSections, sectionCaption, grammarCredit, folding, setFold } from "./grammar";
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
    const ready = readSections (c.id, l.sections).then ((s) => {
      if (! gram.isConnected) return;     // (Another lesson or the path drawn meanwhile)
      body.querySelector (".src")!.textContent = sectionCaption (c.id, s.labels, s.count);
      gram.innerHTML = s.html;
    });
    folding (gram);
    const showGram = (on: boolean) => { gram.hidden = ! on; read.setAttribute ("aria-pressed", String (on)); };
    read.addEventListener ("click", () => showGram (gram.hidden));
    /** SHOW IN THE GRAMMAR: the grammar shown, the question's section (q.s) opened and scrolled to, its passage
     *  (q.find, else the whole section) marked - kept marked until another question's link (or the lesson left). */
    const showIn = async (q: Question) => {
      await ready;
      const sec = gram.querySelector<HTMLElement> (`.gSec[data-seq="${q.s}"]`);
      if (! sec) return;
      showGram (true);
      setFold (sec.closest (".fold")!, true);
      for (const m of gram.querySelectorAll ("mark")) m.replaceWith (...m.childNodes);     // (An earlier mark gone)
      gram.querySelector (".gSec.found")?.classList.remove ("found");
      const marks = q.find ? markText (sec, q.find) : [];
      const shown = marks.length ? marks : [sec];
      if (! marks.length) sec.classList.add ("found");
      shown[0].scrollIntoView ({ block: "center" });
    };
    quiz (c, i, body.querySelector<HTMLElement> (".learnQuiz")!, showIn);
  };

  /** The quiz itself, into el: every question, in a new order, then the score. */
  const quiz = (c: Course, i: number, el: HTMLElement, showIn: (q: Question) => void) => {
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
          note.innerHTML = (ok ? "Right." : `Not quite: ${marked (q.a)}.`) + (q.why ? ` ${marked (q.why)}` : "")
            + (q.s ? ` <span class="term" role="link" tabindex="0">Show in the grammar</span>` : "");
          note.querySelector (".term")?.addEventListener ("click", () => showIn (q));
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
      el.querySelector ("[data-k=again]")!.addEventListener ("click", () => { quiz (c, i, el, showIn); });
    };
    ask (qs[0]);
  };

  path ();
}

/** Marks a phrase in el's text with <mark>s - one per text node it spans (Greek and Hebrew sit in spans of their own) -
 *  matched ignoring spaces and joiners (the text's spacing round its spans varies), the first match only. Returns the
 *  marks; none where the phrase isn't found. */
function markText (el: HTMLElement, phrase: string): HTMLElement[] {
  const skip = /[\s\u200c\u200d]/, want = [...phrase.normalize ("NFC")].filter ((ch) => ! skip.test (ch)).join ("");
  const at: [Text, number][] = [];     // (Each character kept: its text node and offset)
  let text = "";
  const walk = document.createTreeWalker (el, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode () as Text | null; n; n = walk.nextNode () as Text | null) {
    const s = n.data;
    for (let k = 0; k < s.length; k++) if (! skip.test (s[k])) { at.push ([n, k]); text += s[k]; }
  }
  const from = text.indexOf (want);
  if (from < 0 || ! want) return [];
  const runs = new Map<Text, [number, number]> ();     // (Per text node: the part of it marked)
  for (let k = from; k < from + want.length; k++) {
    const [n, o] = at[k], r = runs.get (n);
    runs.set (n, r ? [r[0], o + 1] : [o, o + 1]);
  }
  return [...runs].map (([n, [a, b]]) => {
    const range = document.createRange (), m = document.createElement ("mark");
    range.setStart (n, a); range.setEnd (n, b); range.surroundContents (m);
    return m;
  });
}

/** Back to the screen's top (a new view drawn). */
const scrollUp = () => { document.getElementById ("screen")!.scrollTop = 0; };

onScreen ("Learn", draw);
