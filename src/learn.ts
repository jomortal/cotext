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
// - A MATCHING ROUND (a Match - a general kind, any lesson's): its prompt on the card, then its pairs as two columns side
//   by side in one list, the left items in one column, the right in the other, each shuffled; one tapped is marked in
//   the tint (as a tapped word), then one tapped in the other column pairs them: a right pair turns the accent and is
//   done, a wrong one flashes --wrong (struck through, a moment) and counts as a miss. All paired: how many misses, NEXT.
//   SCORING: a lesson's score is points over the points possible - a question 1 (right or not), a round one per pair
//   less one per miss (never below 0) -, PASS of them passing.
// - A GUIDE LESSON (learncourses.ts' guide - unfoldingWord's letters): PRONUNCIATION (Greek - Modern, Greek - Erasmian:
//   Learn's own setting, modern at first, not ☰ Pronunciation's pick) beside READ THE GUIDE, which shows ☰
//   Pronunciation's tables for it in the grammar's place; its items made from them (letterItems) - matching rounds,
//   then transliteration both ways -, no words. Changing PRONUNCIATION restarts the lesson in it.
// Kept on the device ("cotext.learn"): the course picked, the letters' pronunciation and each lesson's best score - a
// lesson passed stays passed.
// Hebrew and Greek in a question or choice are set in their own fonts (marked).

import { onScreen, currentTestament } from "./study";
import { readSections, sectionCaption, grammarCredit, folding, setFold } from "./grammar";
import { drawGuide, greekLetters } from "./pronounce";
import { modernGreek, erasmianGreek } from "./translit";
import { shuffle } from "./cards";
import { frequentWords, greekCounts } from "./vocab";
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
/** A matching round: its prompt and its pairs ([left, right] - a letter and its name...); right items all different. */
interface Match { prompt: string; pairs: [string, string][]; }
/** A lesson's item: a multiple-choice question or a matching round. */
type Item = Question | Match;
const isMatch = (x: Item): x is Match => "pairs" in x;
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
      pick.addEventListener ("change", () => { kept.greek = pick.value as Greek; save (); lesson (c, i); });     // (The lesson restarted in it)
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

  /** The quiz itself, into el: every question and the lesson's words (vocabQuestions), in a new order - a guide
   *  lesson's items (letterItems) in their own order -, then the score (points: see SCORING above). */
  const quiz = async (c: Course, i: number, el: HTMLElement, showIn: (q: Question) => void) => {
    const l = c.lessons[i];
    const qs: Item[] = l.guide ? letterItems (greek ())
      : shuffle ([...l.questions, ...await vocabQuestions (c, i).catch (() => [] as Question[])]);     // (No database: the grammar's questions alone)
    if (! el.isConnected) return;     // (Another view drawn meanwhile)
    let at = 0, right = 0, total = 0;
    /** The item's frame: its card (big: a short word alone, as a card's front), "3 of 12", the place for its choices,
     *  the note and NEXT (hidden till answered); returns them. */
    const frame = (prompt: string, list: string) => {
      el.innerHTML = `<div class="card learnCard"><div class="${wordOnly (prompt) ? "cardFront" : "cardBack"}"><div>${marked (prompt)}</div></div></div>
        <div class="src cardCount">${at + 1} of ${qs.length}</div>
        <div class="${list}"></div><p class="learnNote" hidden></p>
        <button class="pill action" hidden>${at + 1 < qs.length ? "Next" : "See the score"}</button>`;
      const next = el.querySelector<HTMLButtonElement> (".pill.action")!, note = el.querySelector<HTMLElement> (".learnNote")!;
      next.addEventListener ("click", () => { at++; if (at < qs.length) ask (qs[at]); else score (); scrollUp (); });
      /** Answered: the note shown (its HTML), NEXT with it. */
      const done = (html: string) => { note.innerHTML = html; note.hidden = next.hidden = false; next.scrollIntoView ({ block: "nearest" }); };
      return { list: el.querySelector<HTMLElement> (".learnChoices")!, note, done };
    };
    const button = (text: string) => {
      const b = document.createElement ("button");
      b.type = "button"; b.className = "chooseItem"; b.innerHTML = marked (text);
      return b;
    };
    const ask = (item: Item) => isMatch (item) ? match (item) : choose (item);
    /** A multiple-choice question: one point. */
    const choose = (q: Question) => {
      const { list, note, done } = frame (q.q, "chooseList inline learnChoices");
      total++;
      let answered = false, rightBtn: HTMLElement;
      for (const text of shuffle ([q.a, ...q.x])) {
        const b = button (text);
        if (text === q.a) rightBtn = b;
        b.addEventListener ("click", () => {
          if (answered) return;
          answered = true;
          const ok = text === q.a;
          if (ok) right++;
          rightBtn.setAttribute ("aria-pressed", "true");     // (The right answer in the accent: a picker's choice's look)
          if (! ok) b.classList.add ("wrong");
          done ((ok ? "Right." : `Not quite: ${marked (q.a)}.`) + (q.why ? ` ${marked (q.why)}` : "")
            + (q.s !== undefined ? ` <span class="term" role="link" tabindex="0">Show in the grammar</span>` : ""));
          note.querySelector (".term")?.addEventListener ("click", () => showIn (q));
        });
        list.append (b);
      }
    };
    /** A matching round: one point a pair, less one a miss (never below 0). The two columns are one list, its items
     *  laid left, right, left... so a row's two are as tall as each other. */
    const match = (m: Match) => {
      const { list, done } = frame (m.prompt, "chooseList inline learnChoices learnMatch");
      total += m.pairs.length;
      const left = shuffle (m.pairs.map ((_, k) => k)), rightCol = shuffle (m.pairs.map ((_, k) => k));
      let picked: HTMLElement | undefined, misses = 0, paired = 0;
      left.forEach ((k, row) => {
        for (const [side, n] of [[0, k], [1, rightCol[row]]] as const) {
          const b = button (m.pairs[n][side]);
          b.dataset.side = String (side); b.dataset.pair = String (n);
          b.addEventListener ("click", () => {
            if (b.getAttribute ("aria-pressed") === "true") return;     // (Paired already)
            if (! picked || picked.dataset.side === b.dataset.side) {     // (The first of a pair, or another in its column)
              picked?.classList.remove ("on");
              picked = b === picked ? undefined : b;
              picked?.classList.add ("on");
              return;
            }
            const other = picked;
            picked = undefined; other.classList.remove ("on");
            if (other.dataset.pair === b.dataset.pair) {
              for (const x of [other, b]) x.setAttribute ("aria-pressed", "true");
              if (++paired < m.pairs.length) return;
              const got = Math.max (0, m.pairs.length - misses);
              right += got;
              done (misses ? `${misses} ${misses === 1 ? "miss" : "misses"}: ${got} of ${m.pairs.length}.` : "All matched.");
            } else {
              misses++;
              for (const x of [other, b]) { x.classList.add ("wrong"); setTimeout (() => x.classList.remove ("wrong"), 600); }     // (A flash: --wrong, a moment)
            }
          });
          list.append (b);
        }
      });
    };
    const score = () => {
      const s = total ? right / total : 0, ok = s >= PASS, more = i + 1 < c.lessons.length;
      kept.best[l.id] = Math.max (kept.best[l.id] ?? 0, s);
      save ();
      el.innerHTML = `<div class="card learnCard"><div class="cardFront">${pct (s)}</div>
        <div class="cardBack">${right} of ${total} right. ${ok ? (more ? `Passed: lesson ${i + 2} is open.` : "Passed: the course's last lesson.") : `Not yet: ${pct (PASS)} passes. Read the ${l.guide ? "guide" : "grammar"} and try again.`}</div></div>
        <div class="bar">${ok && more ? `<button class="pill action" data-k="next">Next lesson</button>` : ""}<button class="pill action" data-k="again">Try again</button></div>`;
      el.querySelector ("[data-k=next]")?.addEventListener ("click", () => { lesson (c, i + 1); scrollUp (); });
      el.querySelector ("[data-k=again]")!.addEventListener ("click", () => { quiz (c, i, el, showIn); });
    };
    ask (qs[0]);
  };

  path ();
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
/** A round's pairs at most (Duolingo's match: about 6). */
const ROUND = 6;
/** Common NT words for transliteration, [word, meaning]. */
const TRANSLIT_WORDS: [string, string][] = [
  ["λόγος", "word"], ["θεός", "God"], ["κύριος", "lord"], ["ἄνθρωπος", "man"], ["Χριστός", "Christ"], ["πνεῦμα", "spirit"],
  ["ἀγάπη", "love"], ["οὐρανός", "heaven"], ["ἡμέρα", "day"], ["πατήρ", "father"], ["υἱός", "son"], ["ζωή", "life"],
  ["δόξα", "glory"], ["ἀλήθεια", "truth"], ["βασιλεία", "kingdom"], ["ἔργον", "work"], ["ψυχή", "soul"], ["χάρις", "grace"],
  ["πίστις", "faith"], ["φῶς", "light"], ["ἐκκλησία", "church"], ["εὐαγγέλιον", "gospel"], ["καρδία", "heart"], ["εἰρήνη", "peace"],
];
/** Transliteration items, each way: TRANSLIT_EACH. */
const TRANSLIT_EACH = 3;
/** Each lower-case letter's near misses: letters it's misread as (ρ as p, ν as v, η as n, χ as x...) or near in sound. */
const CONFUSE: Record<string, string> = { ρ: "π", π: "ρ", ν: "βυ", η: "νε", χ: "ξκ", γ: "κ", δ: "τ", θ: "τδ", φ: "π", ψ: "σ",
  ξ: "χ", ε: "η", ι: "η", ο: "ω", ω: "ο", κ: "χ", τ: "θ", α: "ε", σ: "ζ", ζ: "σ", μ: "ν", β: "μ", υ: "ν", λ: "δ" };
/** A word's near misses: the word with one letter swapped for one of its CONFUSE (marks kept), each spelled
 *  differently from it in Latin letters (spell) - so a wrong choice is never also right -, all different, shuffled. */
function nearMisses (word: string, spell: (w: string) => string): string[] {
  const d = [...word.normalize ("NFD")], own = spell (word), seen = new Set ([own]), out: string[] = [];
  d.forEach ((ch, k) => {
    for (const to of CONFUSE[ch] ?? "") {
      const w = [...d.slice (0, k), to, ...d.slice (k + 1)].join ("").normalize ("NFC"), t = spell (w);
      if (! seen.has (t)) { seen.add (t); out.push (w); }
    }
  });
  return shuffle (out);
}

/** A guide lesson's items, in Learn's PRONUNCIATION (kind: pronounce.ts' greekLetters): matching rounds - every letter
 *  matched to its name (ROUND at a time, 4 rounds for the 24), then to its sound ("a as in father"; no two letters said
 *  the same - modern η, ι, υ - in one round) -, then transliteration (translit.ts, the kind's: modern as the reader
 *  shows, or Erasmian's), TRANSLIT_EACH each way - a common word's Greek shown and its Latin letters picked, or the
 *  other way -, the wrong choices the word with a letter misread (nearMisses). In that order, each part's own shuffled. */
function letterItems (kind: Greek): Item[] {
  const ls = greekLetters (kind), rounds = Math.ceil (ls.length / ROUND);
  const names: Match[] = [], sounds: Match[] = [];
  const named = shuffle ([...ls]);
  for (let r = 0; r < rounds; r++)
    names.push ({ prompt: "Match each letter to its name", pairs: named.slice (r * ROUND, (r + 1) * ROUND).map ((l) => [l.cell, l.name]) });
  const groups: (typeof ls)[] = Array.from ({ length: rounds }, () => []);
  for (const l of shuffle ([...ls])) (groups.find ((g) => g.length < ROUND && ! g.some ((o) => o.how === l.how)) ?? groups.find ((g) => g.length < ROUND)!).push (l);
  for (const g of groups) sounds.push ({ prompt: "Match each letter to its sound", pairs: g.map ((l) => [l.cell, l.how]) });
  const spell = kind === "erasmian" ? erasmianGreek : modernGreek;
  const words = shuffle ([...TRANSLIT_WORDS]).slice (0, 2 * TRANSLIT_EACH);
  const translit: Question[] = words.map (([w, mean], k) => {
    const miss = nearMisses (w, spell).slice (0, 3), why = `${w} (${mean}) is ${spell (w)}.`;
    return k < TRANSLIT_EACH ? { q: `Which spells ${w} in English letters?`, a: spell (w), x: miss.map (spell), why }
                             : { q: `Which is ${spell (w)} in Greek letters?`, a: w, x: miss, why };
  });
  return [...names, ...sounds, ...translit];
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
