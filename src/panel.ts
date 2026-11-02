// The word's panel: a sheet from the bottom when a word is tapped - its dictionary form, its parsing spelled out
// ("Qal perfect, 3rd masculine singular") and its entry in the brief lexicon (TBESH for Hebrew, TBESG for Greek -
// STEPBible's, keyed by the same extended Strong's as the text). "I know this word" / "Show helps" flips the word's
// helps (helps.ts: every form of it, everywhere); 🔊 says the word (audio.ts). Close (or tapping the word again) hides it.

import type { Db } from "./db";
import type { Word } from "./reader";
import { isHidden, flip, onHelpsChange } from "./helps";
import { sayWord } from "./audio";

const sheet = document.getElementById ("sheet")!;
const lemmaEl = document.getElementById ("lemma")!;
const fullEl = document.getElementById ("full")!;
const srcEl = document.getElementById ("src")!;
const defEl = document.getElementById ("def")!;
const knowIt = document.getElementById ("knowIt")!;
let picked: HTMLElement | null = null;
let pickedStrong = "";

document.getElementById ("close")!.addEventListener ("click", hidePanel);
knowIt.addEventListener ("click", () => flip (pickedStrong));
document.getElementById ("speakBtn")!.addEventListener ("click", () => { if (picked) sayWord (picked); });
const label = () => { knowIt.textContent = isHidden (pickedStrong) ? "Show helps" : "I know this word"; };
onHelpsChange (() => { if (picked) label (); });

export function showPanel (db: Db, w: Word, wordEl: HTMLElement) {
  if (picked === wordEl && ! sheet.hidden) { hidePanel (); return; }
  picked?.classList.remove ("on");
  picked = wordEl;
  wordEl.classList.add ("on");
  pickedStrong = w.strong;
  label ();
  const hebrew = w.strong.startsWith ("H");
  const [lex] = db.all ("SELECT lemma, gloss, entry FROM lexicon WHERE strong = ?", [w.strong]);
  const [parsing] = db.all ("SELECT spelled FROM parsings WHERE morph = ?", [w.morph]);
  lemmaEl.textContent = String (lex?.lemma ?? w.text);
  lemmaEl.dir = hebrew ? "rtl" : "ltr";
  fullEl.textContent = String (parsing?.spelled ?? "");
  srcEl.textContent = hebrew ? "STEPBible brief lexicon (abridged BDB)" : "STEPBible brief lexicon (Abbott-Smith)";
  // The entry holds only <b>, <i> and <br> (pipeline/build_db.py's entry_html escapes everything else).
  defEl.innerHTML = String (lex?.entry || lex?.gloss || "");
  sheet.hidden = false;
  sheet.scrollTop = 0;
  // Keep the word in view above the sheet.
  requestAnimationFrame (() => {
    const over = wordEl.getBoundingClientRect ().bottom - (window.innerHeight - sheet.offsetHeight) + 12;
    if (over > 0) document.querySelector ("main")!.scrollBy ({ top: over, behavior: "smooth" });     // (main scrolls: style.css)
  });
}

export function hidePanel () {
  sheet.hidden = true;
  picked?.classList.remove ("on");
  picked = null;
}
