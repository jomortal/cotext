// ☰ Learn: a grammar's lessons as short quizzes, one after another, a lesson opening only once the one before is passed
// (a simplified Duolingo). COURSE picks the grammar followed - Hebrew (Gesenius), Greek (Machen), Greek (Smyth) or
// Greek (unfoldingWord); at first the language of the testament read, then the reader's own pick. The questions are
// learncourses.ts' (generated from the grammars' text and, for Machen, his exercises), and the lesson's vocabulary
// (vocabQuestions: Machen's lesson's own words; the other courses' the testament's next 10 most frequent).
// - THE PATH: the course's lessons in the grammar's order, a row each - its number and title, under it how it stands:
//   PASSED (and the best score), the best score so far and what passing takes, START, or LOCKED (greyed, not opening)
//   until the lesson before is passed.
// - A LESSON: ALL LESSONS (back to the path) and READ THE GRAMMAR (the lesson's sections, the grammar's own text - as the
//   word panel's GRAMMAR shows them: grammar.ts' readSections - shown or hidden above the quiz); its title and the
//   grammar's §§ under it (unfoldingWord, without §§: its name alone); then its questions and its words one at a time, in a new order each time: the question on a card
//   (flashcards' look: cards.ts' - a short Hebrew or Greek word large, as a card's front, anything longer at the text's size, as its back: in a box of its own, one line of text in the back's grid), "3 of 12"
//   under it, the choices (in a new order) as a list under that. A choice tapped is answered at once: the right answer
//   in the accent, a wrong pick in --wrong and struck through, a line saying so (and why, where the question says) with
//   SHOW IN THE GRAMMAR where the question says where it's taught (its s and find: learncourses.ts) - the grammar shown,
//   that section opened and scrolled to, the passage marked in the tapped word's tint (style.css' .gSec mark), kept
//   marked until another link is followed - and NEXT. At the end the score: PASSED at PASS (80%) or more - the next lesson opens - else NOT YET; NEXT LESSON
//   (once passed) and TRY AGAIN (ALL LESSONS above, as throughout).
// - A GUIDE LESSON (learncourses.ts' guide and letters - unfoldingWord's two letters lessons): PRONUNCIATION (Greek -
//   Modern, Greek - Erasmian: Learn's own setting, modern at first, not ☰ Pronunciation's pick) beside READ THE GUIDE,
//   which shows ☰ Pronunciation's tables for it in the grammar's place; its questions made from them (letterQuestions) -
//   each of its letters (or, LETTERS TOGETHER, its letter pairs), then a few words to read (wordQuestions) -, SHOW IN THE GUIDE marking a letter's row; no
//   vocabulary. Changing PRONUNCIATION restarts the lesson in it.
// - ALL QUESTIONS: the bottom bar's list icon (as Flashcards' WORD LIST) opens a screen's panel listing the course's
//   lessons, each its questions numbered with their right answers (allQuestions) - to look over without taking them.
// Kept on the device ("cotext.learn"): the course picked, the letters' pronunciation and each lesson's best score - a
// lesson passed stays passed.
// Hebrew and Greek in a question or choice are set in their own fonts (marked).

import { onScreen, currentTestament } from "./study";
import { readSections, sectionCaption, grammarCredit, folding, setFold } from "./grammar";
import { drawGuide, greekLetters, greekPairs } from "./pronounce";
import { modernGreek, erasmianGreek } from "./translit";
import { shuffle } from "./cards";
import { frequentWords, greekCounts } from "./vocab";
import { ICONS } from "./icons";
import { deckPaneSplit } from "./layout";
import { COURSES, VOCAB_PER_LESSON, type Course, type Lesson, type Question } from "./learncourses";

/** The share of a lesson's questions answered right that passes it (and opens the next). */
const PASS = 0.8;
const KEY = "cotext.learn";
/** What's kept: the course picked (its id; none yet: the testament's language), the letters lesson's pronunciation
 *  (PRONUNCIATION; none yet: modern) and each lesson's best score (0-1, by lesson id). */
interface Kept { course?: string; greek?: Greek; best: Record<string, number>; }
/** A guide lesson's Greek: as modern Greek says it, or as Erasmian Greek (pronounce.ts' guides). */
type Greek = "modern" | "erasmian";
const greek = (): Greek => kept.greek === "erasmian" ? "erasmian" : "modern";
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

async function draw (screenBody: HTMLElement) {
  // The screen: the path or a lesson (body), the bottom bar - its list icon in the middle (as Flashcards' WORD LIST) -
  // and ALL QUESTIONS, a screen's panel (.deckPane: at the foot upright, at the right sideways), shown or hidden by the
  // icon and closed by its ✕
  screenBody.innerHTML = `<div class="learnMain"></div><div class="bottomBar"></div>
    <div class="deckPane" hidden><div class="top paneHead"><h2 class="title">All questions</h2><button class="pill icon" aria-label="Close">${ICONS.x}</button></div></div>`;
  const body = screenBody.querySelector<HTMLElement> (".learnMain")!, pane = screenBody.querySelector<HTMLElement> (".deckPane")!;
  const listBtn = document.createElement ("button");
  Object.assign (listBtn, { type: "button", className: "pill icon barMid", innerHTML: ICONS.list }); listBtn.setAttribute ("aria-label", "All questions");
  screenBody.querySelector (".bottomBar")!.append (listBtn);
  const listEl = deckPaneSplit (pane);     // (Its title over its scroller, its divider, its size: layout.ts)
  const showList = (on: boolean) => { pane.hidden = ! on; listBtn.setAttribute ("aria-pressed", String (on)); if (on) allQuestions (course (), listEl); };
  listBtn.addEventListener ("click", () => showList (pane.hidden));
  pane.querySelector (".paneHead .pill")!.addEventListener ("click", () => showList (false));
  showList (false);
  /** Drawn again for what changed: the course picked, the letters' pronunciation. */
  const relist = () => { if (! pane.hidden) allQuestions (course (), listEl); };

  /** The path: COURSE, then the course's lessons. */
  const path = () => {
    const c = course ();
    body.innerHTML = `<div class="fieldRow"><label class="field">Course<select class="choose">${COURSES.map ((x) => `<option value="${x.id}">${esc (x.name)}</option>`).join ("")}</select></label></div>
      <div class="learnPath"></div><p class="credit"></p>`;
    const pick = body.querySelector<HTMLSelectElement> ("select")!;
    pick.value = c.id;
    pick.addEventListener ("change", () => { kept.course = pick.value; save (); path (); relist (); });
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
      ${l.guide ? `<div class="fieldRow"><label class="field">Pronunciation<select class="choose"><option value="modern">Greek - Modern</option><option value="erasmian">Greek - Erasmian</option></select></label></div>` : ""}
      <div><h2 class="title">${i + 1}. ${esc (l.title)}</h2><div class="src"></div></div>
      <div class="gBody" hidden></div><div class="learnQuiz"></div><p class="credit"></p>`;
    const gram = body.querySelector<HTMLElement> (".gBody")!, read = body.querySelector<HTMLElement> ("[data-k=read]")!;
    body.querySelector ("[data-k=path]")!.addEventListener ("click", () => { path (); scrollUp (); });
    body.querySelector (".credit")!.textContent = `Quiz generated from ${grammarCredit (c.id)}.`;
    // (The sections read once, as the lesson opens: their § in the caption at once, their text shown when asked - a
    // guide lesson's, the Pronunciation guide's Greek in their place: READ THE GUIDE)
    if (l.guide) {
      read.textContent = "Read the guide"; body.querySelector (".src")!.textContent = "Pronunciation guide"; drawGuide (gram, greek ());
      const pick = body.querySelector<HTMLSelectElement> ("select")!;
      pick.value = greek ();
      pick.addEventListener ("change", () => { kept.greek = pick.value as Greek; save (); lesson (c, i); relist (); });     // (The lesson restarted in it)
    }
    const ready = l.guide ? Promise.resolve () : readSections (c.id, l.sections).then ((s) => {
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
      const sec = l.guide ? gram : gram.querySelector<HTMLElement> (`.gSec[data-seq="${q.s}"]`);
      if (! sec) return;
      showGram (true);
      if (! l.guide) setFold (sec.closest (".fold")!, true);
      for (const m of gram.querySelectorAll ("mark")) m.replaceWith (...m.childNodes);     // (An earlier mark gone)
      gram.querySelector (".gSec.found")?.classList.remove ("found");
      const marks = q.find ? markText (sec, q.find) : [];
      const shown = marks.length ? marks : [sec];
      if (! marks.length && ! l.guide) sec.classList.add ("found");
      shown[0].scrollIntoView ({ block: "center" });
    };
    quiz (c, i, body.querySelector<HTMLElement> (".learnQuiz")!, showIn);
  };

  /** The quiz itself, into el: every question and the lesson's words (vocabQuestions), in a new order - a guide
   *  lesson's letters and words (letterQuestions) instead -, then the score. */
  const quiz = async (c: Course, i: number, el: HTMLElement, showIn: (q: Question) => void) => {
    const l = c.lessons[i];
    const qs = l.guide ? letterQuestions (c, i, greek ())     // (A guide lesson: its letters, then its words, each part in a new order)
      : shuffle ([...l.questions, ...await vocabQuestions (c, i).catch (() => [] as Question[])]);     // (No database: the grammar's questions alone)
    if (! el.isConnected) return;     // (Another view drawn meanwhile)
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
            + (q.s !== undefined ? ` <span class="term" role="link" tabindex="0">Show in the grammar</span>`
               : c.lessons[i].guide && q.find ? ` <span class="term" role="link" tabindex="0">Show in the guide</span>` : "");
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
        <div class="cardBack">${right} of ${qs.length} right. ${ok ? (more ? `Passed: lesson ${i + 2} is open.` : "Passed: the course's last lesson.") : `Not yet: ${pct (PASS)} passes. Read the ${c.lessons[i].guide ? "guide" : "grammar"} and try again.`}</div></div>
        <div class="bar">${ok && more ? `<button class="pill action" data-k="next">Next lesson</button>` : ""}<button class="pill action" data-k="again">Try again</button></div>`;
      el.querySelector ("[data-k=next]")?.addEventListener ("click", () => { lesson (c, i + 1); scrollUp (); });
      el.querySelector ("[data-k=again]")!.addEventListener ("click", () => { quiz (c, i, el, showIn); });
    };
    ask (qs[0]);
  };

  path ();
}

/** ALL QUESTIONS (the panel): course c's lessons in order, each its number and title over its questions numbered, each
 *  question with its right answer under it (in the accent, as when answered) - the lesson's questions as the quiz asks
 *  them: the grammar's in learncourses.ts' order, then its words (vocabQuestions; each asked one way at random, so a
 *  word's way here may differ from the quiz's); a guide lesson's letters and words (letterQuestions) in Learn's
 *  PRONUNCIATION. Without the database, the grammar's questions alone. A later call wins over one still arriving. */
let listing = 0;
async function allQuestions (c: Course, el: HTMLElement) {
  const n = ++listing;
  const lessons = await Promise.all (c.lessons.map (async (l, i) => l.guide ? letterQuestions (c, i, greek ())
    : [...l.questions, ...await vocabQuestions (c, i).catch (() => [] as Question[])]));
  if (n !== listing) return;
  el.innerHTML = lessons.map ((qs, i) => `<div class="learnList"><h3 class="title">${i + 1}. ${esc (c.lessons[i].title)}</h3><ol>${qs.map ((q) =>
    `<li><div>${marked (q.q)}</div><div class="learnAnswer">${marked (q.a)}</div></li>`).join ("")}</ol></div>`).join ("");
}

/** A course's words as learn.ts quizzes them: word (as shown), meaning, count (in the OT or NT; none: not found). */
interface Word { word: string; meaning: string; count?: number; }
/** The frequency courses' words, by language (the first lessons' and the choices' pool), fetched once. */
const frequent = new Map<string, Promise<Word[]>> ();
/** Machen's words' NT counts, fetched once. */
let machenCounts: Promise<Map<string, number>> | undefined;
/** A word's dictionary form, from the form a vocabulary lists ("ἀγαθός, ή, όν", "λόγος, ὁ"): its first word. */
const head = (w: string) => w.split (",")[0].trim ();
/** A verb's meaning ("to say", Machen's "I loose"), so wrong choices are of its kind. */
const verbal = (m: string) => /^(to|I) /.test (m);

/** Lesson i's vocabulary questions: its words - Machen's lesson's own vocabulary (Lesson.words, however many), the other
 *  courses' VOCAB_PER_LESSON of the testament's most frequent (lesson 1 the first 10, lesson 2 the next... - vocab.ts'
 *  frequentWords, so the path climbs the frequency list) -, each asked one way at random: the word shown and its meaning
 *  picked, or the meaning shown and the word picked; the three wrong choices other words of the course's (verbs' for a
 *  verb, others' for the rest, where there are enough), never one meaning the same. No grammar link; after answering,
 *  the word, its meaning and how often it occurs. */
/** Words read in the letters lessons, [word, meaning]: common NT words, enough of them spelled with the first lesson's
 *  letters alone (Α-Μ) - each lesson takes those spelled with the letters taught so far - and enough with letters said
 *  together (LETTERS TOGETHER takes those). */
const READ_WORDS: [string, string][] = [
  ["καί", "and"], ["ἀλλά", "but"], ["γῆ", "earth"], ["αἷμα", "blood"], ["θέλημα", "will"], ["δέκα", "ten"], ["ἡλικία", "age"],
  ["Γαλιλαία", "Galilee"], ["ἰδέ", "look!"], ["μή", "not"], ["δίκαια", "just things"], ["μέλι", "honey"],
  ["λόγος", "word"], ["θεός", "God"], ["κύριος", "lord"], ["ἄνθρωπος", "man"], ["Χριστός", "Christ"], ["πνεῦμα", "spirit"],
  ["ἀγάπη", "love"], ["οὐρανός", "heaven"], ["ἡμέρα", "day"], ["πατήρ", "father"], ["υἱός", "son"], ["ζωή", "life"],
  ["δόξα", "glory"], ["ἀλήθεια", "truth"], ["βασιλεία", "kingdom"], ["ἔργον", "work"], ["ψυχή", "soul"], ["χάρις", "grace"],
  ["πίστις", "faith"], ["φῶς", "light"], ["ἐκκλησία", "church"], ["εὐαγγέλιον", "gospel"], ["καρδία", "heart"], ["εἰρήνη", "peace"],
  ["αὐτός", "he"], ["ἄγγελος", "angel"], ["οἶκος", "house"], ["πάντα", "all things"], ["οὐ", "not"], ["ἐγκαίνια", "dedication"],
];
/** Words read a letters lesson, each way (Greek shown, its Latin letters picked; and the other way). */
const READ_EACH = 3;
/** A word's letters, its marks gone (lower case, ς as σ). */
const bare = (w: string) => w.normalize ("NFD").replace (/\p{M}/gu, "").toLowerCase ().replace (/ς/g, "σ");
/** Each lower-case letter's near misses: letters it's misread as (ρ as p, ν as v, η as n, χ as x...) or near in sound. */
const CONFUSE: Record<string, string> = { ρ: "π", π: "ρ", ν: "βυ", η: "νει", χ: "ξκ", γ: "κ", δ: "τθ", θ: "τδ", φ: "π", ψ: "σ",
  ξ: "χ", ε: "ηα", ι: "η", ο: "ω", ω: "ο", κ: "χγ", τ: "θ", α: "ε", σ: "ζ", ζ: "σδ", μ: "ν", β: "μ", υ: "ν", λ: "δ" };
/** A word's near misses: the word with one letter swapped for one of its CONFUSE within the letters taught (marks
 *  kept), each spelled differently from it in Latin letters (spell) - so a wrong choice is never also right -, shuffled. */
function nearMisses (word: string, spell: (w: string) => string, taught: string): string[] {
  const d = [...word.normalize ("NFD")], seen = new Set ([spell (word)]), out: string[] = [];
  d.forEach ((ch, k) => {
    for (const to of CONFUSE[ch] ?? "") {
      if (! taught.includes (to)) continue;
      const w = [...d.slice (0, k), to, ...d.slice (k + 1)].join ("").normalize ("NFC"), t = spell (w);
      if (! seen.has (t)) { seen.add (t); out.push (w); }
    }
  });
  return shuffle (out);
}

/** A guide lesson's questions, in Learn's PRONUNCIATION (kind: pronounce.ts' greekLetters, greekPairs): first each of
 *  its letters (Lesson.letters; LETTERS TOGETHER, Lesson.pairs: every pair) once, in a new order, asked one of two ways
 *  at random - the letter shown ("Ψ ψ") and its name and sound picked ("psi - [ps] as in lips"; a pair, its sound
 *  alone: "[u] oo as in food"), or those shown and the letter picked -, the wrong choices others (the lesson's own
 *  first), never one said the same (modern η, ι, υ; ει, οι, υι), SHOW IN THE GUIDE marking its row; then READ_EACH words
 *  each way (wordQuestions): spelled with the letters taught so far, or for the pairs, each with one of them. */
function letterQuestions (c: Course, i: number, kind: Greek): Question[] {
  const l = c.lessons[i], letters = greekLetters (kind), [from, to] = l.letters ?? [0, letters.length];
  const all: { cell: string; name?: string; ipa: string; how: string }[] = l.pairs ? greekPairs (kind) : letters;
  const mine = l.pairs ? all : all.slice (from, to);
  const say = (x: typeof all[number]) => `${x.name ? `${x.name} - ` : ""}[${x.ipa}] ${x.how}`;
  const asked = shuffle (mine.map ((x): Question => {
    const others = all.filter ((o) => o.how !== x.how && o.ipa !== x.ipa);
    const wrong = [...shuffle (others.filter ((o) => mine.includes (o))), ...shuffle (others.filter ((o) => ! mine.includes (o)))].slice (0, 3);
    return Math.random () < 0.5 ? { q: x.cell, a: say (x), x: wrong.map (say), find: x.cell }
                                : { q: say (x), a: x.cell, x: wrong.map ((o) => o.cell), find: x.cell };
  }));
  const taught = letters.slice (0, l.pairs ? letters.length : to).map ((x) => bare (x.cell)).join ("");
  const pairs = l.pairs ? mine.flatMap ((x) => x.cell.split (", ").map (bare)) : undefined;
  return [...asked, ...wordQuestions (kind, taught, pairs)];
}

/** The words read in a letters lesson: READ_EACH of READ_WORDS spelled only with the letters taught (marks ignored) - and
 *  where pairs are given (LETTERS TOGETHER), with one of them in it - one
 *  way - the Greek shown, its Latin letters picked (translit.ts, the kind's: modern as the reader shows it, or
 *  Erasmian's) - and READ_EACH the other way. The three wrong choices: another such word as long as it (in Latin letters
 *  or Greek, as the choices are; the nearest length where none is), then near misses of the word itself (one letter
 *  misread: nearMisses), then other words to make three. */
function wordQuestions (kind: Greek, taught: string, pairs?: string[]): Question[] {
  const spell = kind === "erasmian" ? erasmianGreek : modernGreek;
  const can = READ_WORDS.filter (([w]) => [...bare (w)].every ((ch) => taught.includes (ch)) && (! pairs || pairs.some ((p) => bare (w).includes (p))));
  return shuffle ([...can]).slice (0, 2 * READ_EACH).map (([w, mean], k) => {
    const latin = k < READ_EACH, show = (x: string) => latin ? spell (x) : x, len = (x: string) => latin ? spell (x).length : bare (x).length;
    const others = shuffle (can.map (([o]) => o).filter ((o) => show (o) !== show (w))).sort ((a, b) => Math.abs (len (a) - len (w)) - Math.abs (len (b) - len (w)));
    const near = nearMisses (w, spell, taught);
    const wrong = [...new Set ([...others.slice (0, 1), ...near.slice (0, 2), ...near.slice (2), ...others.slice (1)].map (show))].slice (0, 3);
    const why = `${w} (${mean}) is ${spell (w)}.`;
    return latin ? { q: `Which spells ${w} in English letters?`, a: spell (w), x: wrong, why }
                 : { q: `Which is ${spell (w)} in Greek letters?`, a: w, x: wrong, why };
  });
}

async function vocabQuestions (c: Course, i: number): Promise<Question[]> {
  let mine: Word[], pool: Word[];
  if (c.vocab === "freq") {
    const n = c.lessons.length * VOCAB_PER_LESSON + 30;     // (Every lesson's words, and some beyond as wrong choices)
    if (! frequent.has (c.lang)) frequent.set (c.lang, frequentWords (c.lang, n).then ((ws) => ws.map ((w) => ({ word: w.lemma, meaning: w.meaning, count: w.count }))));
    pool = await frequent.get (c.lang)!;
    const k = c.lessons.slice (0, i).filter ((l) => ! l.guide).length;     // (The lessons with words before this one: a guide lesson has none)
    mine = pool.slice (k * VOCAB_PER_LESSON, (k + 1) * VOCAB_PER_LESSON);
  } else {
    const all = c.lessons.flatMap ((l) => l.words ?? []);
    machenCounts ??= greekCounts (all.map (([w]) => head (w)));
    const counts = await machenCounts, word = ([w, m]: [string, string]): Word => ({ word: w, meaning: m, count: counts.get (head (w)) });
    pool = all.map (word);
    mine = (c.lessons[i].words ?? []).map (word);
  }
  const where = c.lang === "H" ? "OT" : "NT";
  return mine.map ((w) => {
    const others = shuffle (pool.filter ((o) => o.meaning !== w.meaning && o.word !== w.word));
    const like = others.filter ((o) => verbal (o.meaning) === verbal (w.meaning)), rest = others.filter ((o) => ! like.includes (o));
    const wrong = [...like, ...rest].slice (0, 3);
    const why = `${w.word}: ${w.meaning}${w.count ? ` - ${w.count.toLocaleString ("en-US")} times in the ${where}.` : "."}`;
    return Math.random () < 0.5 ? { q: w.word, a: w.meaning, x: wrong.map ((o) => o.meaning), why }
                                : { q: w.meaning, a: w.word, x: wrong.map ((o) => o.word), why };
  });
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
