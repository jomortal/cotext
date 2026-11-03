// Reading aloud, in modern pronunciation (modern Israeli Hebrew, modern Greek), by the device's own voices
// (speechSynthesis): he-IL for the OT, el-GR for the NT.
// - ▶ at the bottom of the screen reads the chapter, from the verse at the top of the view (or the start) to the end;
//   a verse's number in the margin reads that verse. Each word lights (.reading) as it's spoken; the same control
//   tapped again stops. While the word's panel is open, ▶ sits just above it.
// - The word's panel's speaker says that word (sayWord).
// - Each verse is spoken as one utterance, its words lit by the voice's word-boundary events. A voice that gives none
//   (no boundary within a second of starting) is remembered, and its words are lit on a clock instead (each word's share
//   of the time by its length, at the reading speed) - the verse still one utterance, read smoothly.
// - Hebrew: the accents (cantillation U+0591-05AF), meteg, paseq, sof pasuq and the other marks stripped, the vowels
//   kept (but for a word starting with alef and an "e" vowel: hebrewSpoken), the divine name said Adonai (sayName), maqaf a space, a closing paragraph mark (פ / ס) dropped. Greek: made monotonic (monotonic below), and a
//   one-letter word (ὁ) spoken with the next - alone, voices spell the letter out ("omicron") - the two lit together.
// - The device's voice for the language (Hebrew he, Greek el), or the one picked in ⋯ (VOICE, below). READING SPEED (0.1x - 1x) and SPACE BETWEEN
//   WORDS (0 - 1 s; 0 reads normally, a verse at a time - any space reads a word at a time with that pause) in the ⋯
//   menu, kept on the device.

import { onScreen, openScreen } from "./study";

const KEY = "cotext.audio";
const synth: SpeechSynthesis | undefined = "speechSynthesis" in window ? window.speechSynthesis : undefined;

interface Settings {
  rate: number;                                  // 0.1 - 1
  gap?: number;                                  // seconds between words (0: none; then read a word at a time)
  noBoundary: string[];                          // voiceURIs found to give no word-boundary events
  voices?: Record<string, string>;               // VOICE (the ⋯ menu): the voice picked, by language (he, el) - its voiceURI
}
const s: Settings = { rate: 0.8, noBoundary: [] };
try { Object.assign (s, JSON.parse (localStorage.getItem (KEY) ?? "{}")); } catch { /* none kept, or private mode */ }
const save = () => { try { localStorage.setItem (KEY, JSON.stringify (s)); } catch { /* private mode: not kept */ } };

let testament: "OT" | "NT" = "OT";
const lang = () => (testament === "OT" ? "he" : "el");

/** The divine name read as a Jewish reader says it: יהוה (with any prefix: לַיהוָה) as אֲדֹנָי, Adonai - or, pointed
 *  with Elohim's hiriq (יֱהוִה, where Adonai stands beside it), as אֱלֹהִים - or as DIVINE NAME picks (below). As written
 *  the voice said "Yehovah". */
const NAME = /\u05d9[\u0591-\u05c7]*\u05d4[\u0591-\u05c7]*\u05d5[\u0591-\u05c7]*\u05d4[\u0591-\u05c7]*/g;
const sayName = (word: string) => word.replace (NAME, (m) => m.includes ("\u05b4") ? "\u05d0\u05b1\u05dc\u05b9\u05d4\u05b4\u05d9\u05dd" : nameSaid ());

// DIVINE NAME (☰ settings): how the name is read aloud - Adonai (the default, as Jewish readers say it), or Yahweh
// in one of three spellings, to hear which the device's voice says well. Kept on the device.
const NAME_KEY = "cotext.divineName";
const NAME_CHOICES: [string, string, string][] = [     // [key, label, what's spoken]
  ["adonai", "Adonai (אֲדֹנָי)", "\u05d0\u05b2\u05d3\u05b9\u05e0\u05b8\u05d9"],
  ["yahweh", "Yahweh (יַהְוֶה)", "\u05d9\u05b7\u05d4\u05b0\u05d5\u05b6\u05d4"],
  ["yahweh2", "Yahweh (יַהוֶה)", "\u05d9\u05b7\u05d4\u05d5\u05b6\u05d4"],
  ["latin", "Yahweh (in Latin letters)", "Yahweh"]];
let nameKey = "adonai";
try { nameKey = localStorage.getItem (NAME_KEY) ?? "adonai"; } catch { /* private mode */ }
const nameSaid = () => (NAME_CHOICES.find ((c) => c[0] === nameKey) ?? NAME_CHOICES[0])[2];
const namePick = document.getElementById ("namePick") as HTMLSelectElement;
for (const [k, l] of NAME_CHOICES) namePick.append (new Option (l, k));
namePick.value = nameKey;
namePick.addEventListener ("change", () => { nameKey = namePick.value; try { localStorage.setItem (NAME_KEY, nameKey); } catch { /* private mode */ } });

/** The Hebrew a modern voice reads: accents and marks stripped, vowels kept, maqaf a space - except a word starting
 *  with alef and an "e" vowel (segol, tsere, hataf segol: אֶל, אֶת, אֵין), spoken without its vowels: pointed, the
 *  he-IL voice says it "eh-el", an extra glottal syllable in front; unpointed, "el" (heard on the user's device,
 *  2026-11-02). אֱלֹהִים is said right either way and kept; a word with any other first vowel is kept pointed
 *  (אֲשֶׁר unpointed is misread). */
function hebrewSpoken (word: string): string {
  return sayName (word).replace (/[\u0591-\u05af\u05bd\u05c0\u05c3-\u05c6]/g, "").replace (/\u05be/g, " ").replace (/\s+[\u05e4\u05e1]$/, "").trim ()
             .split (/\s+/).map ((w) => /^\u05d0[\u05b1\u05b5\u05b6]/.test (w) && ! /^\u05d0\u05b1\u05dc\u05b9\u05d4/.test (w)
               ? w.replace (/[\u05b0-\u05bc\u05c1\u05c2\u05c7]/g, "") : w).join (" ");
}

/** The Greek a modern voice reads well: monotonic - breathings and the iota subscript dropped, circumflex and grave
 *  turned acute, a one-syllable word (diphthongs one syllable) unaccented, punctuation, brackets and the elision mark
 *  removed (polytonic marks made some voices read words oddly). ἦν -> ην, θεὸς -> θεός, αὐτοῦ -> αυτού. */
export function monotonic (word: string): string {
  let t = word.normalize ("NFD").replace (/[̓̔̓ͅ]/g, "").replace (/[͂̀]/g, "́")
              .replace (/[^\p{L}\p{M}]/gu, "");
  const syllables = (t.replace (/\p{M}/gu, "").toLowerCase ().match (/αι|ει|οι|υι|αυ|ευ|ηυ|ου|[αεηιουω]/g) ?? []).length;
  if (syllables <= 1) t = t.replace (/́/g, "");
  return t.normalize ("NFC");
}

const spoken = (el: HTMLElement) => {
  const text = el.querySelector (".orig")!.textContent ?? "";
  return testament === "OT" ? hebrewSpoken (text) : monotonic (text);
};
const letters = (t: string) => t.normalize ("NFD").replace (/\p{M}/gu, "").length;

/** A verse's words as spoken groups: each word alone, except a Greek one-letter word, joined to the next. */
function groups (words: HTMLElement[]): { words: HTMLElement[]; text: string }[] {
  const out: { words: HTMLElement[]; text: string }[] = [];
  let pending = false;
  for (const w of words) {
    const t = spoken (w);
    if (! t) continue;
    const last = out[out.length - 1];
    if (pending && last) { last.words.push (w); last.text += " " + t; pending = false; }
    else { out.push ({ words: [w], text: t }); pending = testament === "NT" && letters (t) === 1; }
  }
  return out;
}

function voice (): SpeechSynthesisVoice | undefined {
  const all = synth?.getVoices () ?? [];
  // VOICE's pick; else none set - the utterance's language alone, so the device uses the voice chosen for it in its
  // own settings (a downloaded Enhanced or male voice the browser doesn't list still speaks).
  return all.find ((v) => v.voiceURI === s.voices?.[lang ()]);
}

// VOICE (the ⋯ menu, with READING SPEED): the device's voices for the text shown's language (Hebrew or Greek), the first "The device's" -
// its default; filled when the voices load (they arrive late on some browsers) and when the testament changes. "Getting
// other voices" opens the steps for downloading the device's own other voices.
const voicePick = document.getElementById ("voicePick") as HTMLSelectElement;
function fillVoices () {
  const mine = (synth?.getVoices () ?? []).filter ((v) => v.lang.startsWith (lang ()));
  voicePick.replaceChildren (new Option ("The device's (as set in its Settings)", ""), ...mine.map ((v) => new Option (v.name, v.voiceURI)));
  voicePick.value = mine.some ((v) => v.voiceURI === s.voices?.[lang ()]) ? s.voices![lang ()] : "";
  voicePick.closest ("label")!.firstChild!.textContent = testament === "OT" ? "Hebrew voice" : "Greek voice";
}
voicePick.addEventListener ("change", () => {
  s.voices = { ...s.voices, [lang ()]: voicePick.value };
  if (! voicePick.value) delete s.voices[lang ()];
  save ();
});
synth?.addEventListener?.("voiceschanged", fillVoices);
fillVoices ();
// LOOK FOR VOICES AGAIN: the device asked again (a voice downloaded meanwhile); GETTING OTHER VOICES: the steps (⋯ closes).
document.getElementById ("voiceAgain")!.addEventListener ("click", () => {
  synth?.cancel ();
  fillVoices ();
  setTimeout (fillVoices, 500);     // (Some browsers fill the list a moment after it's asked for)
});
document.getElementById ("voiceHelp")!.addEventListener ("click", () => {
  document.getElementById ("optionsBtn")!.click ();
  openScreen ("Getting other voices");
});

onScreen ("Getting other voices", (body) => {
  body.innerHTML = `<p>COTEXT reads aloud with the device's own voices. Others - more voices, and Enhanced or Premium ones - are free from Apple:</p>
    <ol class="steps">
      <li>Open <b>Settings</b>, then <b>Accessibility</b>, then <b>Spoken Content</b> (on iOS 26 it may be <b>Read &amp; Speak</b>), then <b>Voices</b>.</li>
      <li>Tap <b>Greek</b> (and then <b>Hebrew</b>).</li>
      <li>Tap a voice marked <b>Enhanced</b> or <b>Premium</b> to download it - Melina for Greek, Carmit for Hebrew. They're about 100-400 MB: use Wi-Fi.</li>
      <li>Select it there (it gets the tick), so it's the language's voice.</li>
      <li>In COTEXT, leave ⋯ > ${testament === "OT" ? "Hebrew" : "Greek"} voice on <b>The device's</b>: the voice you selected is the one that reads. (Safari doesn't list every downloaded voice to web pages, so it may not appear by name - it still speaks.) If it doesn't, close the app (or Safari) completely and open it again.</li>
    </ol>
    <p>Each device keeps its own voices: do the same on the iPad. On a Mac: System Settings > Accessibility > Spoken Content > System voice > Manage Voices.</p>`;
});

function utterance (text: string): SpeechSynthesisUtterance {
  const u = new SpeechSynthesisUtterance (text);
  const v = voice ();
  u.lang = v?.lang ?? (testament === "OT" ? "he-IL" : "el-GR");
  if (v) u.voice = v;
  u.rate = s.rate;
  return u;
}

// Reading: a session (its number, so a cancelled session's late events are ignored), the verses still to read and
// what started it (the ▶ button, or a verse number) - tapping that again stops.
let session = 0;
let control: HTMLElement | null = null;
let queue: HTMLElement[] = [];                     // .vrow elements still to read
let fromWord: HTMLElement | null = null;           // Reading restarted mid-verse (a speed change): its verse read from it, not its start
const keep: SpeechSynthesisUtterance[] = [];       // (Held, so a browser can't drop an utterance's events mid-way)
const playBtn = document.getElementById ("playBtn")!;

let litWord: HTMLElement | null = null;            // The word being read now (a speed change restarts from it)

function light (words: HTMLElement[]) {
  litWord = words[0] ?? null;
  for (const el of document.querySelectorAll<HTMLElement> ("#chapter .w.reading")) el.classList.remove ("reading");
  for (const w of words) w.classList.add ("reading");
  document.dispatchEvent (new Event ("cotext:reading"));     // (The notes panel follows the verse being read: notes.ts)
  // Keep the word being read in view (main scrolls: style.css).
  const main = document.querySelector ("main")!, r = words[0]?.getBoundingClientRect (), m = main.getBoundingClientRect ();
  if (r && (r.top < m.top || r.bottom > m.bottom - 80)) words[0].scrollIntoView ({ block: "center", behavior: "smooth" });
}

export function stopReading () {
  session++;
  queue = [];
  fromWord = null;
  keep.length = 0;
  synth?.cancel ();
  light ([]);
  control?.classList.remove ("playing");
  control = null;
  playBtn.textContent = "▶";
  playBtn.setAttribute ("aria-label", "Read the chapter aloud");
}

function start (from: HTMLElement, rows: HTMLElement[], word: HTMLElement | null = null, restart = false) {
  const was = control;
  stopReading ();
  if ((was === from && ! restart) || ! synth || ! rows.length) return;
  fromWord = word;
  control = from;
  from.classList.add ("playing");
  if (from === playBtn) { playBtn.textContent = "■"; playBtn.setAttribute ("aria-label", "Stop reading"); }
  queue = rows;
  synth.resume ();     // (iOS: a paused queue stays silent)
  // (A breath after cancel before speaking again: iOS can drop, or hold back, an utterance spoken straight after one.)
  const id = session;
  setTimeout (() => next (id), 60);
}

/** Reads the next verse in the queue, or ends the session. */
function next (id: number) {
  if (id !== session) return;
  const row = queue.shift ();
  if (! row) { stopReading (); return; }
  let ws = [...row.querySelectorAll<HTMLElement> (".w")];
  if (fromWord && ws.includes (fromWord)) ws = ws.slice (ws.indexOf (fromWord));
  fromWord = null;
  const gs = groups (ws);
  if (! gs.length) { next (id); return; }
  // A space between words: a word at a time with that pause. None: the verse as one utterance - never word by word,
  // which pauses between words of its own.
  if ((s.gap ?? 0) > 0) wordByWord (id, gs);
  else wholeVerse (id, gs, voice ());
}

function wholeVerse (id: number, gs: { words: HTMLElement[]; text: string }[], v: SpeechSynthesisVoice | undefined) {
  const vk = v?.voiceURI ?? "device:" + lang ();     // (The voice as remembered for its word timing: the device's own by language)
  const starts: number[] = [];
  let text = "";
  for (const g of gs) { if (text) text += " "; starts.push (text.length); text += g.text; }     // (Each group's first character)
  const u = utterance (text);
  let lit = -1, sawBoundary = false, ended = false;
  u.onboundary = (e) => {
    if (id !== session) return;
    sawBoundary = true;
    let k = 0;
    while (k + 1 < starts.length && starts[k + 1] <= e.charIndex) k++;
    if (k !== lit) { lit = k; light (gs[k].words); }
  };
  // A voice without word timing (no boundary events - remembered): the words lit on a clock instead, each group's
  // share of the time by its length, at the reading speed - close enough to follow, the verse still read smoothly.
  const clock = () => {
    if (! s.noBoundary.includes (vk)) return;
    const msPerChar = 75 / s.rate;
    let at = 0;
    gs.forEach ((g, k) => {
      setTimeout (() => { if (id === session && ! ended && k > lit) { lit = k; light (g.words); } }, at);
      at += (g.text.length + 1) * msPerChar;
    });
  };
  u.onstart = () => {
    if (id !== session) return;
    lit = 0; light (gs[0].words);
    clock ();
    setTimeout (() => {
      if (id !== session || sawBoundary || s.noBoundary.includes (vk)) return;
      s.noBoundary.push (vk); save ();     // (No word timing after a second: from now on, the clock)
      clock ();
    }, 1000);
  };
  u.onend = () => { ended = true; next (id); };
  u.onerror = (e) => { if (id === session && e.error !== "interrupted" && e.error !== "canceled") stopReading (); };
  keep.push (u);
  synth!.speak (u);
}

function wordByWord (id: number, gs: { words: HTMLElement[]; text: string }[]) {
  const gap = (s.gap ?? 0) * 1000;
  const say = (k: number) => {
    if (id !== session) return;
    if (k >= gs.length) { next (id); return; }
    const u = utterance (gs[k].text);
    u.onstart = () => { if (id === session) light (gs[k].words); };
    u.onerror = (e) => { if (id === session && e.error !== "interrupted" && e.error !== "canceled") stopReading (); };
    u.onend = () => { if (gap) setTimeout (() => say (k + 1), gap); else say (k + 1); };     // (The pause between words, if any)
    keep.push (u);
    synth!.speak (u);
  };
  say (0);
}

/** The panel's 🔊: says just the word (a Greek one-letter word with the next, as when reading). */
/** A Greek one-letter word said alone (the panel's speakers, a vocab card): the voice spells ο out - "omicron" - so
 *  it's given in Latin letters, "oh". */
const ALONE: Record<string, string> = { "ο": "oh" };

export function sayWord (wordEl: HTMLElement) {
  if (! synth) return;
  stopReading ();
  const verse = [...wordEl.parentElement!.querySelectorAll<HTMLElement> (".w")];
  const g = groups (verse.slice (verse.indexOf (wordEl)))[0];
  if (! g) return;
  synth.resume ();
  // (The word alone: ὁ said "oh" - ALONE - rather than with the next word, as reading groups it.)
  const u = utterance (testament === "NT" && monotonic (wordEl.querySelector (".orig")?.textContent ?? "") in ALONE
    ? ALONE[monotonic (wordEl.querySelector (".orig")!.textContent!)] : g.text);
  keep.push (u);
  synth.speak (u);
}

/** The panel's speaker beside the dictionary form, and a vocab card's: says that form (the root), as reading would. */
export function sayText (text: string) {
  if (! synth || ! text) return;
  stopReading ();
  synth.resume ();
  const greek = monotonic (text);
  const u = utterance (testament === "OT" ? hebrewSpoken (text) : ALONE[greek] ?? greek);
  keep.push (u);
  synth.speak (u);
}

/** The testament shown: voices and their language follow it. Called on each chapter shown (reading stops). */
export function setAudioTestament (t: "OT" | "NT") {
  stopReading ();
  if (t !== testament) { testament = t; fillVoices (); }
}

// ▶: the chapter from the first verse whose line shows at the top of the view; a verse number: that verse.
playBtn.addEventListener ("click", () => {
  const rows = [...document.querySelectorAll<HTMLElement> ("#chapter .vrow")];
  const top = document.querySelector ("main")!.getBoundingClientRect ().top;
  const first = Math.max (0, rows.findIndex ((r) => r.getBoundingClientRect ().bottom > top + 8));
  start (playBtn, rows.slice (first));
});
document.getElementById ("chapter")!.addEventListener ("click", (e) => {
  const num = (e.target as HTMLElement).closest<HTMLElement> (".vnum");
  if (num) start (num, [num.parentElement!]);
});

// The play bar sits above the word's panel in the page's column (style.css); with the panel open it leaves the home
// indicator's room to it.
const sheet = document.getElementById ("sheet")!;
const playBar = document.getElementById ("playBar")!;
const place = () => { playBar.classList.toggle ("above", ! sheet.hidden); };     // (The panel under it: no home-indicator room)
new ResizeObserver (place).observe (sheet);
new MutationObserver (place).observe (sheet, { attributes: true, attributeFilter: ["hidden"] });

// The ⋯ menu's READING SPEED and SPACE BETWEEN WORDS.
const rate = document.getElementById ("rate") as HTMLInputElement;
const rateOut = document.getElementById ("rateOut")!;

// READING SPEED: 10 - 100 is 0.1x - 1x. SPACE BETWEEN WORDS: 0 - 10 is 0 - 1 s (0: none, read normally).
const gapIn = document.getElementById ("gap") as HTMLInputElement, gapOut = document.getElementById ("gapOut")!;
const showRate = () => {
  s.rate = Math.min (1, Math.max (0.1, s.rate));
  rate.value = String (Math.round (s.rate * 100));
  rateOut.textContent = s.rate.toFixed (1) + "x";
  s.gap = Math.min (1, s.gap ?? 0);
  gapIn.value = String (Math.round (s.gap * 10));
  gapOut.textContent = (s.gap ?? 0) > 0 ? (s.gap ?? 0).toFixed (1) + " s" : "none";
};
// A change while reading takes effect at once: reading restarts from the word being read (a moment after the slider
// stops moving), rather than at the next verse - an utterance keeps the speed it began with.
let retime = 0;
function respeak () {
  clearTimeout (retime);
  retime = window.setTimeout (() => {
    if (! control || ! litWord) return;
    const rows = [...document.querySelectorAll<HTMLElement> ("#chapter .vrow")], row = litWord.closest<HTMLElement> (".vrow");
    if (row) start (control, rows.slice (rows.indexOf (row)), litWord, true);
  }, 120);
}
rate.addEventListener ("input", () => { s.rate = Number (rate.value) / 100; save (); showRate (); respeak (); });
gapIn.addEventListener ("input", () => { s.gap = Number (gapIn.value) / 10; save (); showRate (); respeak (); });
showRate ();

// (No voices: ▶ hidden, the play bar kept for the notes' icon beside it.)
if (! synth) for (const el of [playBtn, document.getElementById ("speakBtn")!, document.getElementById ("audioSettings")!]) el.hidden = true;
