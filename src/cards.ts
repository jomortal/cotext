// Flashcards: one card at a time - its front, tapped to turn it over (its back shown under it), tapped again to turn it
// back. BACK and NEXT step through the deck (wrapping round), SHUFFLE mixes it, START OVER puts it back in its first
// order at the first card, REMOVE FROM LIST (or the name its owner gives it) takes the card out (and tells the deck's owner: vocab.ts takes the word off
// that list). A speaker on a card says its word. "3 of 20". Used by the Verb paradigms screen (below) and My vocab (vocab.ts).
//
// Verb paradigms (☰ > Verb paradigms): a deck per stem (Hebrew) or tense and voice (Greek) - every form the Verb
// chart shows for it, from the same templates (paradigm.ts): the front its pattern, the back its code, its meaning on
// "do" and the form on the model root (קָטַל, λύω), shuffled.

import { onScreen, currentTestament } from "./study";
import { sayText } from "./audio";
import { HEBREW_STEMS, GREEK_TENSES, hebrewCells, hebrewForm, greekCells, greekForm, type Form } from "./paradigm";

export interface Card { front: string; back: string; /* HTML */ }

/** Shows a deck in el; onRemove gets each card taken out with REMOVE FROM LIST (or removeLabel, the button's own name). */
export function showDeck<C extends Card> (el: HTMLElement, cards: C[], onRemove?: (c: C) => void, removeLabel = "Remove from list") {
  const first = [...cards];
  let deck = [...cards], at = 0;
  el.innerHTML = `<div class="card" role="button" tabindex="0"><div class="cardFront"></div><div class="cardBack" hidden></div>
    <div class="src cardHint">Tap to turn over</div></div>
    <div class="bar cardBar"><button class="pill" data-k="back">Back</button><span class="src cardCount"></span><button class="pill" data-k="next">Next</button></div>
    <div class="bar cardBar"><button class="pill" data-k="shuffle">Shuffle</button><button class="pill" data-k="over">Start over</button><button class="pill" data-k="remove">${removeLabel}</button></div>`;
  const card = el.querySelector<HTMLElement> (".card")!, front = el.querySelector<HTMLElement> (".cardFront")!;
  const back = el.querySelector<HTMLElement> (".cardBack")!, hint = el.querySelector<HTMLElement> (".cardHint")!;
  const count = el.querySelector<HTMLElement> (".cardCount")!;
  const show = () => {
    if (! deck.length) { front.textContent = "✓"; back.hidden = false; back.textContent = "No cards left"; hint.hidden = true; count.textContent = ""; return; }
    at = (at + deck.length) % deck.length;
    front.innerHTML = deck[at].front; back.innerHTML = deck[at].back; back.hidden = true; hint.hidden = false;
    count.textContent = `${(at + 1).toLocaleString ()} of ${deck.length.toLocaleString ()}`;
  };
  const turn = () => { if (deck.length) { back.hidden = ! back.hidden; hint.hidden = ! back.hidden ? true : false; } };     // (Tapped again: turned back)
  // A speaker on a card (an element with data-say: My vocab's word) says that text, leaving the card as it is.
  card.addEventListener ("click", (e) => {
    const say = (e.target as HTMLElement).closest<HTMLElement> ("[data-say]");
    if (say) sayText (say.dataset.say!); else turn ();
  });
  card.addEventListener ("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault (); turn (); } });
  const on = (k: string, f: () => void) => el.querySelector (`[data-k=${k}]`)!.addEventListener ("click", () => { f (); show (); });
  on ("back", () => { at--; });
  on ("next", () => { at++; });
  on ("shuffle", () => { deck = shuffle (deck); at = 0; });
  on ("over", () => { deck = first.filter ((c) => deck.includes (c)); at = 0; });
  on ("remove", () => { const [c] = deck.splice (at, 1); if (c) onRemove?.(c); });
  show ();
}

/** A fresh order each time a deck opens. */
const shuffle = <T,> (a: T[]) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor (Math.random () * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const paradigmCard = (f: Form & { text: string }, hebrew: boolean): Card => ({
  front: f.pattern,
  back: `<div class="paradigm">${f.code}</div><div>${f.meaning}</div><div class="${hebrew ? "heWord" : "grWord"}">${f.text}</div>`,
});

const picked = { OT: 0, NT: 0 };

function paradigms (body: HTMLElement) {
  const t = currentTestament (), hebrew = t === "OT";
  const names = hebrew ? HEBREW_STEMS.map ((s) => s.name) : GREEK_TENSES.map ((x) => x.name);
  body.innerHTML = `<div class="chartPick"><label>${hebrew ? "Stem" : "Tense and voice"}<select class="choose" id="deckPick">${names.map ((n, i) => `<option value="${i}">${n}</option>`).join ("")}</select></label></div>
    <p>Each card a form's pattern; turned over, its parsing, its meaning on "do" and the form on ${hebrew ? "קָטַל" : "λύω"}.</p><div class="deck"></div>`;
  const pick = body.querySelector<HTMLSelectElement> ("#deckPick")!;
  const deckEl = body.querySelector<HTMLElement> (".deck")!;
  const fill = () => {
    let cards: Card[];
    if (hebrew) {
      const stem = HEBREW_STEMS[picked.OT], c = hebrewCells (stem);
      const cells = [...Object.values (c.grid).flatMap ((g) => Object.values (g)), ...c.ptc, ...(c.ptp ?? []), c.inc, c.ina];
      cards = cells.map ((x) => paradigmCard (hebrewForm (stem, x, null), true));
    } else {
      const tv = GREEK_TENSES[picked.NT], c = greekCells (tv);
      const cells = [...Object.values (c.grid).flatMap ((g) => Object.values (g)), ...(c.inf ? [c.inf] : []), ...c.ptc];
      cards = cells.map ((x) => paradigmCard (greekForm (tv, x, null), false));
    }
    showDeck (deckEl, shuffle (cards));
  };
  pick.value = String (picked[t]);
  pick.addEventListener ("change", () => { picked[t] = Number (pick.value); fill (); });
  fill ();
}

onScreen ("Verb paradigms", paradigms);
