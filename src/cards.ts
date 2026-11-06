// Flashcards: one card at a time, centered in the screen's room (fitDeck) - its front, tapped to turn it over (its back
// shown under it, or alone: backOnly), tapped again to turn it back (no Flip button). Its buttons in one bar at the
// screen's foot - the Bible view's play bar's kind (.vcBar; down the right side sideways: bars.ts' SIDE_BAR) -: BACK and
// NEXT as ‹ and › at its ends (wrapping round; a swipe across the card does the same: bars.ts' onSwipe), SHUFFLE
// (mixes it) and START OVER (back in its first order at the first card) as icons between them, and in its middle the
// screen's own button: the Verse cards' + (NEW VERSE), or Flashcards' card action (REMOVE FROM LIST or + KNOWN WORDS:
// takes the card out and tells the deck's owner - vocab.ts takes the word off that list). A speaker on a card says its
// word. "3 of 20" under the card. Used by Flashcards (vocab.ts: the word lists, the first things to learn, the verb
// paradigms) and the Verse cards (versecards.ts).

import { sayText } from "./audio";
import { onSwipe, marginArrows } from "./bars";

export interface Card { front: string; back: string; /* HTML */ }

/** The bar's icons (shown in place of their words - each kept as its aria-label for a screen reader). */
const svg = (d: string) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
export const BAR_ICONS = {
  shuffle: svg ("M3 7h3c4 0 6 10 10 10h5M3 17h3c1.6 0 2.8-1.6 3.9-3.6M13.1 9.6C14.2 8 15.4 7 17 7h4M18 4l3 3-3 3M18 14l3 3-3 3"),     // (Two paths crossing)
  over: svg ("M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5"),     // (Back to the start: an arrow round to its beginning)
  list: svg ("M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"),     // (Lines: a list - Flashcards' word list)
};

/** How a deck is shown. remove: a button under the card taking the card shown out (its words - + KNOWN WORDS, REMOVE
 *  FROM LIST - and done, told each card taken out); middle: the screen's own button for the bar's middle (the Verse
 *  cards' +, Flashcards' list icon); none, the middle empty. backOnly: turned over, the back alone shows, the front hidden (Flashcards' words: only
 *  the English; a verse card: the verse with its reference); otherwise under it. noTurn: a selector - a tap on what it
 *  matches doesn't turn the card (the Verse cards' words, tapped for their panel). */
export interface DeckOptions<C> { remove?: { label: string; done: (c: C) => void }; middle?: HTMLElement; backOnly?: boolean; noTurn?: string; }

/** Shows a deck in el: the card, its count and the bar (above). */
export function showDeck<C extends Card> (el: HTMLElement, cards: C[], o: DeckOptions<C> = {}): DeckShown<C> {
  const first = [...cards];
  let deck = [...cards], at = 0;
  const btn = (k: string, label: string, inner: string, cls = "pill icon") => `<button class="${cls}" data-k="${k}" aria-label="${label}">${inner}</button>`;
  el.innerHTML = `<div class="card${o.backOnly ? " single" : ""}" role="button" tabindex="0"><div class="cardFront"></div><div class="cardBack" hidden></div></div>
    <div class="src cardCount"></div>${o.remove ? btn ("remove", o.remove.label, o.remove.label, "pill csAdd cardAction") : ""}
    <div class="vcBar">${btn ("back", "Back", "‹", "pill icon arrow")}${btn ("shuffle", "Shuffle", BAR_ICONS.shuffle)}${btn ("over", "Start over", BAR_ICONS.over)}${btn ("next", "Next", "›", "pill icon arrow")}</div>`;
  const card = el.querySelector<HTMLElement> (".card")!, front = el.querySelector<HTMLElement> (".cardFront")!;
  const back = el.querySelector<HTMLElement> (".cardBack")!, count = el.querySelector<HTMLElement> (".cardCount")!;
  const bar = el.querySelector<HTMLElement> (".vcBar")!;
  if (o.middle) { o.middle.classList.add ("vcMid"); bar.querySelector ("[data-k=over]")!.before (o.middle); }
  const show = () => {
    if (! deck.length) { front.textContent = "✓"; front.hidden = false; back.hidden = false; back.textContent = "No cards left"; count.textContent = ""; return; }
    at = (at + deck.length) % deck.length;
    front.innerHTML = deck[at].front; back.innerHTML = deck[at].back; back.hidden = true; front.hidden = false;
    count.textContent = `${(at + 1).toLocaleString ()} of ${deck.length.toLocaleString ()}`;
  };
  // Turned over (a tap on the card); again, turned back.
  const turn = () => { if (deck.length) { back.hidden = ! back.hidden; front.hidden = !! o.backOnly && ! back.hidden; } };
  // A speaker on a card (an element with data-say: a word's) says that text, leaving the card as it is.
  card.addEventListener ("click", (e) => {
    const t = e.target as HTMLElement, say = t.closest<HTMLElement> ("[data-say]");
    if (say) sayText (say.dataset.say!); else if (! (o.noTurn && t.closest (o.noTurn))) turn ();
  });
  card.addEventListener ("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault (); turn (); } });
  const on = (k: string, f: () => void) => bar.querySelector (`[data-k=${k}]`)?.addEventListener ("click", () => { f (); show (); });
  on ("back", () => { at--; });
  on ("next", () => { at++; });
  on ("shuffle", () => { deck = shuffle (deck); at = 0; });
  on ("over", () => { deck = first.filter ((c) => deck.includes (c)); at = 0; });
  el.querySelector ("[data-k=remove]")?.addEventListener ("click", () => { const [c] = deck.splice (at, 1); if (c) o.remove!.done (c); show (); });     // (Under the card, not in the bar)
  onSwipe (card, (by) => bar.querySelector<HTMLElement> (by > 0 ? "[data-k=next]" : "[data-k=back]")!.click ());     // (A swipe across the card steps as ‹ and ›)
  // (With a mouse, the card narrower than the screen's room: ‹ and › in its margins, at the card's middle height - bars.ts)
  marginArrows (document.getElementById ("screen")!, card, bar.querySelector<HTMLElement> ("[data-k=back]")!, bar.querySelector<HTMLElement> ("[data-k=next]")!, "column");
  show ();
  return {
    update (next, same) {
      const swap = (c: C) => next.find ((x) => same (x, c)) ?? c;
      deck = deck.map (swap); first.splice (0, first.length, ...first.map (swap));
      if (deck.length) { front.innerHTML = deck[at].front; back.innerHTML = deck[at].back; }
    },
    go (pick) { const i = deck.findIndex (pick); if (i >= 0) { at = i; show (); } },
  };
}

/** A deck shown. update: the cards' contents changed (a setting - the Verse cards' translation or lines) - each card swapped
 *  for its new version (matched by same), the order, the card shown and whether it's turned over kept. go: the first card
 *  pick matches shown, its front up (a verse card just added). */
export interface DeckShown<C extends Card> { update (next: C[], same: (a: C, b: C) => boolean): void; go (pick: (c: C) => boolean): void; }

/** The deck's room, measured: the screen's own height less its padding (the top bar's room, the bottom bar's - and the
 *  Verse cards' word panel, when open) and what's kept under the deck on the first screen (under: the Verse cards'
 *  credits, with the gap above them; none - Flashcards' list is scrolled to under it) - as much kept above the card, so
 *  it's centered on the screen, all on one screen without scrolling where it fits (style.css' .deck: --vcRoom,
 *  --vcCreditsH). A card taller than the room left when centered: no room kept above it - it starts at the top
 *  (.vcTall). Kept so as the screen, the deck or what's under it changes size. */
export function fitDeck (deckEl: HTMLElement, under?: HTMLElement) {
  const screenEl = document.getElementById ("screen")!;
  const fit = () => {
    const c = under?.textContent ? under.getBoundingClientRect ().bottom - deckEl.getBoundingClientRect ().bottom : 0, cs = getComputedStyle (screenEl);
    deckEl.style.setProperty ("--vcCreditsH", c + "px");
    const room = screenEl.clientHeight - parseFloat (cs.paddingTop) - parseFloat (cs.paddingBottom) - c;
    deckEl.style.setProperty ("--vcRoom", room + "px");
    const kids = [...deckEl.children].filter ((x) => ! x.classList.contains ("vcBar")) as HTMLElement[];
    const content = kids.length ? kids[kids.length - 1].getBoundingClientRect ().bottom - kids[0].getBoundingClientRect ().top : 0;
    deckEl.classList.toggle ("vcTall", content > room - c);
  };
  const watch = new ResizeObserver (fit);
  if (under) watch.observe (under);
  watch.observe (screenEl); watch.observe (deckEl);
}

/** A fresh order (SHUFFLE; the verb paradigms' each time they open). */
export const shuffle = <T,> (a: T[]) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor (Math.random () * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
