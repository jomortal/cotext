// Reading aloud, in modern pronunciation (modern Israeli Hebrew, modern Greek), by the device's own voices
// (speechSynthesis): he-IL for the OT, el-GR for the NT.
// - ▶ at the bottom of the screen reads the chapter, from the verse at the top of the view (or the start) to the end;
//   a verse's number in the margin reads that verse. Each word lights (.reading) as it's spoken; the same control
//   tapped again stops. While the word's panel is open, ▶ sits just above it.
// - The word's panel's speaker says that word (sayWord).
// - Each verse is spoken as one utterance, its words lit by the voice's word-boundary events. A voice that gives none
//   (no boundary within a second of starting) is remembered, and its verses are spoken a word at a time instead - the
//   verse it was found on restarted that way.
// - Hebrew: the accents (cantillation U+0591-05AF), meteg, paseq, sof pasuq and the other marks stripped, the vowels
//   kept, maqaf a space, a closing paragraph mark (פ / ס) dropped. Greek: made monotonic (monotonic below), and a
//   one-letter word (ὁ) spoken with the next - alone, voices spell the letter out ("omicron") - the two lit together.
// - VOICE and READING SPEED (0.3x - 1.2x) in the ⋯ menu, kept on the device: a voice per testament, the device's
//   voices for that testament's language first, starred.

const KEY = "cotext.audio";
const synth: SpeechSynthesis | undefined = "speechSynthesis" in window ? window.speechSynthesis : undefined;

interface Settings {
  rate: number;                                  // 0.3 - 1.2
  voice: { OT?: string; NT?: string };           // voiceURI chosen per testament (none: the first of its language)
  noBoundary: string[];                          // voiceURIs found to give no word-boundary events
}
const s: Settings = { rate: 0.8, voice: {}, noBoundary: [] };
try { Object.assign (s, JSON.parse (localStorage.getItem (KEY) ?? "{}")); } catch { /* none kept, or private mode */ }
const save = () => { try { localStorage.setItem (KEY, JSON.stringify (s)); } catch { /* private mode: not kept */ } };

let testament: "OT" | "NT" = "OT";
const lang = () => (testament === "OT" ? "he" : "el");

/** The Hebrew a modern voice reads: accents and marks stripped, vowels kept, maqaf a space. */
function hebrewSpoken (word: string): string {
  return word.replace (/[֑-ֽ֯׀׃-׆]/g, "").replace (/־/g, " ")
             .replace (/\s+[פס]$/, "").trim ();
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
  return all.find ((v) => v.voiceURI === s.voice[testament]) ?? all.find ((v) => v.lang.startsWith (lang ()));
}

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
const keep: SpeechSynthesisUtterance[] = [];       // (Held, so a browser can't drop an utterance's events mid-way)
const playBtn = document.getElementById ("playBtn")!;

function light (words: HTMLElement[]) {
  for (const el of document.querySelectorAll<HTMLElement> ("#chapter .w.reading")) el.classList.remove ("reading");
  for (const w of words) w.classList.add ("reading");
  // Keep the word being read in view (main scrolls: style.css).
  const main = document.querySelector ("main")!, r = words[0]?.getBoundingClientRect (), m = main.getBoundingClientRect ();
  if (r && (r.top < m.top || r.bottom > m.bottom - 80)) words[0].scrollIntoView ({ block: "center", behavior: "smooth" });
}

export function stopReading () {
  session++;
  queue = [];
  keep.length = 0;
  synth?.cancel ();
  light ([]);
  control?.classList.remove ("playing");
  control = null;
  playBtn.textContent = "▶";
  playBtn.setAttribute ("aria-label", "Read the chapter aloud");
}

function start (from: HTMLElement, rows: HTMLElement[]) {
  const was = control;
  stopReading ();
  if (was === from || ! synth || ! rows.length) return;
  control = from;
  from.classList.add ("playing");
  if (from === playBtn) { playBtn.textContent = "■"; playBtn.setAttribute ("aria-label", "Stop reading"); }
  queue = rows;
  synth.resume ();     // (iOS: a paused queue stays silent)
  next (session);
}

/** Reads the next verse in the queue, or ends the session. */
function next (id: number) {
  if (id !== session) return;
  const row = queue.shift ();
  if (! row) { stopReading (); return; }
  const gs = groups ([...row.querySelectorAll<HTMLElement> (".w")]);
  if (! gs.length) { next (id); return; }
  const v = voice ();
  if (v && s.noBoundary.includes (v.voiceURI)) wordByWord (id, gs);
  else wholeVerse (id, gs, v);
}

function wholeVerse (id: number, gs: { words: HTMLElement[]; text: string }[], v: SpeechSynthesisVoice | undefined) {
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
  u.onstart = () => {
    if (id !== session) return;
    lit = 0; light (gs[0].words);
    setTimeout (() => {
      if (id !== session || sawBoundary || ! v) return;
      // No word timing from this voice: remembered, and this verse (unless already over) restarted a word at a time.
      if (! s.noBoundary.includes (v.voiceURI)) { s.noBoundary.push (v.voiceURI); save (); }
      if (ended) return;
      const restart = ++session;
      synth!.cancel ();
      wordByWord (restart, gs);
    }, 1000);
  };
  u.onend = () => { ended = true; next (id); };
  u.onerror = (e) => { if (id === session && e.error !== "interrupted" && e.error !== "canceled") stopReading (); };
  keep.push (u);
  synth!.speak (u);
}

function wordByWord (id: number, gs: { words: HTMLElement[]; text: string }[]) {
  gs.forEach ((g, k) => {
    const u = utterance (g.text);
    u.onstart = () => { if (id === session) light (g.words); };
    u.onerror = (e) => { if (id === session && e.error !== "interrupted" && e.error !== "canceled") stopReading (); };
    if (k === gs.length - 1) u.onend = () => next (id);
    keep.push (u);
    synth!.speak (u);
  });
}

/** The panel's speaker: says the word (a Greek one-letter word with the next, as when reading). */
export function sayWord (wordEl: HTMLElement) {
  if (! synth) return;
  stopReading ();
  const verse = [...wordEl.parentElement!.querySelectorAll<HTMLElement> (".w")];
  const g = groups (verse.slice (verse.indexOf (wordEl)))[0];
  if (! g) return;
  synth.resume ();
  const u = utterance (g.text);
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

// While the word's panel (#sheet) is open, ▶ sits just above it.
const sheet = document.getElementById ("sheet")!;
const place = () => { playBtn.style.setProperty ("--above", sheet.hidden ? "0px" : sheet.offsetHeight + "px"); };
new ResizeObserver (place).observe (sheet);
new MutationObserver (place).observe (sheet, { attributes: true, attributeFilter: ["hidden"] });

// The ⋯ menu's VOICE and READING SPEED.
const voicePick = document.getElementById ("voicePick") as HTMLSelectElement;
const rate = document.getElementById ("rate") as HTMLInputElement;
const rateOut = document.getElementById ("rateOut")!;

function fillVoices () {
  const l = lang ();
  const all = (synth?.getVoices () ?? []).slice ().sort ((a, b) =>
    Number (b.lang.startsWith (l)) - Number (a.lang.startsWith (l)) || a.lang.localeCompare (b.lang) || a.name.localeCompare (b.name));
  voicePick.textContent = "";
  for (const v of all) voicePick.append (new Option (`${v.lang.startsWith (l) ? "★ " : ""}${v.name} (${v.lang})`, v.voiceURI));
  if (! all.length) voicePick.append (new Option ("No voices found", ""));
  const v = voice ();
  if (v) voicePick.value = v.voiceURI;
}
voicePick.addEventListener ("change", () => { s.voice[testament] = voicePick.value; save (); stopReading (); });
const showRate = () => { rate.value = String (Math.round (s.rate * 100)); rateOut.textContent = s.rate.toFixed (1) + "x"; };
rate.addEventListener ("input", () => { s.rate = Number (rate.value) / 100; save (); showRate (); });
showRate ();

if (synth) { fillVoices (); synth.addEventListener ("voiceschanged", fillVoices); }
else for (const el of [playBtn, document.getElementById ("speakBtn")!, document.getElementById ("audioSettings")!]) el.hidden = true;
