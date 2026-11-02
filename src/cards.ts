// Flashcards (design/mock-hebrew.html's cards): one card at a time - its front, tapped to turn it over (its back
// shown under it); AGAIN puts it at the back of the deck, GOT IT takes it out (and tells the deck's owner: vocab.ts
// marks the word known); "N to go", then "All done". Used by the Verb paradigms screen (below) and My vocab (vocab.ts).
//
// Verb paradigms (☰ > Verb paradigms): a deck per stem (Hebrew) or tense and voice (Greek) - every form the Verb
// chart shows for it, from the same templates (paradigm.ts): the front its pattern, the back its code, its meaning on
// "do" and the form on the model root (קָטַל, λύω), shuffled.

import { onScreen, currentTestament } from "./study";
import { HEBREW_STEMS, GREEK_TENSES, hebrewCells, hebrewForm, greekCells, greekForm, type Form } from "./paradigm";

export interface Card { front: string; back: string; /* HTML */ }

/** Shows a deck in el; onGot gets each card marked GOT IT. */
export function showDeck<C extends Card> (el: HTMLElement, cards: C[], onGot?: (c: C) => void) {
  const deck = [...cards];
  el.innerHTML = `<div class="card" role="button" tabindex="0"><div class="cardFront"></div><div class="cardBack" hidden></div>
    <div class="src cardHint">Tap to turn over</div></div>
    <div class="bar cardBar"><button class="pill" data-k="again">Again</button><button class="pill" data-k="got">Got it</button><span class="src cardCount"></span></div>`;
  const card = el.querySelector<HTMLElement> (".card")!, front = el.querySelector<HTMLElement> (".cardFront")!;
  const back = el.querySelector<HTMLElement> (".cardBack")!, hint = el.querySelector<HTMLElement> (".cardHint")!;
  const count = el.querySelector<HTMLElement> (".cardCount")!, bar = el.querySelector<HTMLElement> (".cardBar")!;
  const show = () => {
    if (! deck.length) {
      front.textContent = "✓"; back.hidden = false; back.textContent = "All done"; hint.hidden = true; bar.hidden = true;
      return;
    }
    front.innerHTML = deck[0].front; back.innerHTML = deck[0].back; back.hidden = true; hint.hidden = false;
    count.textContent = `${deck.length.toLocaleString ()} to go`;
  };
  const turn = () => { if (deck.length) { back.hidden = false; hint.hidden = true; } };
  card.addEventListener ("click", turn);
  card.addEventListener ("keydown", (e) => { if (e.key === "Enter" || e.key === " ") turn (); });
  bar.querySelector ("[data-k=again]")!.addEventListener ("click", () => { if (deck.length) deck.push (deck.shift ()!); show (); });
  bar.querySelector ("[data-k=got]")!.addEventListener ("click", () => { const c = deck.shift (); if (c) onGot?.(c); show (); });
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
