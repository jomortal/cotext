// Flashcards: one card at a time - its front, tapped to turn it over (its back shown under it, or alone: My vocab's), tapped again to turn it
// back. BACK and NEXT step through the deck (SHOW between them turns the card over, as a tap on it does) (wrapping round), SHUFFLE mixes it, START OVER puts it back in its first
// order at the first card, REMOVE FROM LIST (or the name its owner gives it; My vocab's decks only) takes the card out (and tells the deck's owner: vocab.ts takes the word off
// that list). A speaker on a card says its word. "3 of 20". Used by the Verb paradigms screen (below), My vocab (vocab.ts) and the Verse cards (versecards.ts).
//
// Verb paradigms (☰ > Verb paradigms): a deck per stem (Hebrew) or tense and voice (Greek) - every form the Verb
// chart shows for it, from the same templates (paradigm.ts), shuffled. FILL IN picks the cards' verb: PATTERN - the front
// the form's pattern, the back its parsing spelled out ("Qal perfect, 3rd masculine singular"), its meaning on "do" and the form on the first model root (קָטַל, λύω) - or a
// model verb - the front the form on that verb, the back its parsing spelled out and its meaning on that verb.

import { onScreen, currentTestament } from "./study";
import { sayText } from "./audio";
import { HEBREW_STEMS, GREEK_TENSES, HEBREW_MODELS, GREEK_MODELS, hebrewCells, hebrewForm, greekCells, greekForm, spellCode, type Form } from "./paradigm";

export interface Card { front: string; back: string; /* HTML */ }

/** Shows a deck in el; onRemove gets each card taken out with REMOVE FROM LIST (or removeLabel, the button's own name) -
 *  without it the deck has no such button. tapTurns false: a tap turns the card over but not back (HIDE does).
 *  backOnly: turned over, the back alone shows, the front hidden (My vocab: only the English; a verse card: the verse with its reference); otherwise under it. */
export function showDeck<C extends Card> (el: HTMLElement, cards: C[], onRemove?: (c: C) => void, removeLabel = "Remove from list", backOnly = false,
                                          tapTurns = true): DeckShown<C> {
  const first = [...cards];
  let deck = [...cards], at = 0;
  el.innerHTML = `<div class="card${backOnly ? " single" : ""}" role="button" tabindex="0"><div class="cardFront"></div><div class="cardBack" hidden></div></div>
    <div class="src cardCount"></div>
    <div class="bar cardBar"><button class="pill" data-k="back">Back</button><button class="pill" data-k="flip">Show</button><button class="pill" data-k="next">Next</button></div>
    <div class="bar cardBar"><button class="pill" data-k="shuffle">Shuffle</button><button class="pill" data-k="over">Start over</button>${onRemove ? `<button class="pill" data-k="remove">${removeLabel}</button>` : ""}</div>`;
  const card = el.querySelector<HTMLElement> (".card")!, front = el.querySelector<HTMLElement> (".cardFront")!;
  const back = el.querySelector<HTMLElement> (".cardBack")!;
  const count = el.querySelector<HTMLElement> (".cardCount")!, flip = el.querySelector<HTMLElement> ("[data-k=flip]")!;
  const show = () => {
    if (! deck.length) { front.textContent = "✓"; front.hidden = false; back.hidden = false; back.textContent = "No cards left"; count.textContent = ""; return; }
    at = (at + deck.length) % deck.length;
    front.innerHTML = deck[at].front; back.innerHTML = deck[at].back; back.hidden = true; front.hidden = false; flip.textContent = "Show";
    count.textContent = `${(at + 1).toLocaleString ()} of ${deck.length.toLocaleString ()}`;
  };
  // Turned over (a tap on the card, or SHOW - HIDE while turned - between BACK and NEXT); again, turned back.
  const turn = () => { if (deck.length) { back.hidden = ! back.hidden; front.hidden = backOnly && ! back.hidden; flip.textContent = back.hidden ? "Show" : "Hide"; } };     // (Tapped again: turned back)
  // A speaker on a card (an element with data-say: My vocab's word) says that text, leaving the card as it is.
  // (tapTurns false: a tap turns it over, not back - the Verse cards, whose back's words are tapped for their panel;
  // HIDE turns it back)
  const tapped = () => { if (tapTurns || back.hidden) turn (); };
  card.addEventListener ("click", (e) => {
    const say = (e.target as HTMLElement).closest<HTMLElement> ("[data-say]");
    if (say) sayText (say.dataset.say!); else tapped ();
  });
  card.addEventListener ("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault (); tapped (); } });
  const on = (k: string, f: () => void) => el.querySelector (`[data-k=${k}]`)!.addEventListener ("click", () => { f (); show (); });
  flip.addEventListener ("click", turn);
  on ("back", () => { at--; });
  on ("next", () => { at++; });
  on ("shuffle", () => { deck = shuffle (deck); at = 0; });
  on ("over", () => { deck = first.filter ((c) => deck.includes (c)); at = 0; });
  if (onRemove) on ("remove", () => { const [c] = deck.splice (at, 1); if (c) onRemove (c); });     // (No onRemove: no REMOVE FROM LIST - the Verb paradigms)
  show ();
  return {
    update (next, same) {
      const swap = (c: C) => next.find ((x) => same (x, c)) ?? c;
      deck = deck.map (swap); first.splice (0, first.length, ...first.map (swap));
      if (deck.length) { front.innerHTML = deck[at].front; back.innerHTML = deck[at].back; }
    },
  };
}

/** A deck shown. update: the cards' contents changed (a setting - the Verse cards' translation or lines) - each card swapped
 *  for its new version (matched by same), the order, the card shown and whether it's turned over kept. */
export interface DeckShown<C extends Card> { update (next: C[], same: (a: C, b: C) => boolean): void; }

/** A fresh order each time a deck opens. */
const shuffle = <T,> (a: T[]) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor (Math.random () * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/** A form's card; filled: on a model verb (its front that verb's form, so the back needs no form of its own). */
const paradigmCard = (f: Form & { text: string }, hebrew: boolean, filled: boolean): Card => ({
  front: f.pattern,
  back: `<div class="paradigm">${spellCode (f.code, hebrew)}</div><div>${f.meaning}</div>${filled ? "" : `<div class="${hebrew ? "heWord" : "grWord"}">${f.text}</div>`}`,
});

const picked = { OT: 0, NT: 0, LXX: 0 };
const fillIn = { OT: -1, NT: -1, LXX: -1 };     // (FILL IN, by testament: -1 the pattern, else a model verb's index)

function paradigms (body: HTMLElement) {
  const t = currentTestament (), hebrew = t === "OT";
  const names = hebrew ? HEBREW_STEMS.map ((s) => s.name) : GREEK_TENSES.map ((x) => x.name);
  body.innerHTML = `<div class="chartPick"><label>${hebrew ? "Stem" : "Tense and voice"}<select class="choose" id="deckPick">${names.map ((n, i) => `<option value="${i}">${n}</option>`).join ("")}</select></label>
    <label>Fill in<select class="choose" id="fillPick"><option value="-1">Pattern</option>${(hebrew ? HEBREW_MODELS.map ((m) => `${m.root} - ${m.english[0]}`)
      : GREEK_MODELS.map ((m) => `${m.lemma} - ${m.english[0]}`)).map ((m, i) => `<option value="${i}">${m}</option>`).join ("")}</select></label></div>
    <p>Each card a form - its pattern, or on the verb picked in Fill in; turned over, its parsing and meaning (on a pattern, also the form on ${hebrew ? "קָטַל" : "λύω"}).</p><div class="deck"></div>`;
  const pick = body.querySelector<HTMLSelectElement> ("#deckPick")!, fill_ = body.querySelector<HTMLSelectElement> ("#fillPick")!;
  const deckEl = body.querySelector<HTMLElement> (".deck")!;
  const fill = () => {
    let cards: Card[];
    if (hebrew) {
      const stem = HEBREW_STEMS[picked.OT], c = hebrewCells (stem);
      const cells = [...Object.values (c.grid).flatMap ((g) => Object.values (g)), ...c.ptc, ...(c.ptp ?? []), c.inc, c.ina];
      const m = HEBREW_MODELS[fillIn.OT] ?? null;
      cards = cells.map ((x) => paradigmCard (hebrewForm (stem, x, m), true, !! m));
    } else {
      const tv = GREEK_TENSES[picked.NT], c = greekCells (tv);
      const cells = [...Object.values (c.grid).flatMap ((g) => Object.values (g)), ...(c.inf ? [c.inf] : []), ...c.ptc];
      const m = GREEK_MODELS[fillIn.NT] ?? null;
      cards = cells.map ((x) => paradigmCard (greekForm (tv, x, m), false, !! m));
    }
    showDeck (deckEl, shuffle (cards));
  };
  pick.value = String (picked[t]);
  pick.addEventListener ("change", () => { picked[t] = Number (pick.value); fill (); });
  fill_.value = String (fillIn[t]);
  fill_.addEventListener ("change", () => { fillIn[t] = Number (fill_.value); fill (); });
  fill ();
}

onScreen ("Verb paradigms", paradigms);
