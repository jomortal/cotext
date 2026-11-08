// Flashcards: one card at a time, centered in the screen's room (fitDeck) - its front, tapped to turn it over (its back
// shown under it, or alone: backOnly), tapped again to turn it back (no Flip button). Its buttons in one bar at the
// screen's foot - the Bible view's play bar's kind (.bottomBar; down the right side sideways: bars.ts' SIDE_BAR) -: BACK and
// NEXT as ‹ and › at its ends (wrapping round; a swipe across the screen - the card or beside it - does the same: bars.ts' onSwipe), SHUFFLE
// (mixes it) and START OVER (back in its first order at the first card) as icons between them, and in its middle the
// screen's own button: the Verse cards' + (NEW VERSE), or Flashcards' card action (REMOVE FROM LIST or + KNOWN WORDS:
// takes the card out and tells the deck's owner - vocab.ts takes the word off that list). A speaker on a card says its
// word. "3 of 20" under the card. Used by Flashcards (vocab.ts: the word lists, the first things to learn, the verb
// paradigms) and the Verse cards (versecards.ts).

import { sayText } from "./audio";
import { onSwipe, marginArrows } from "./bars";
import { ICONS } from "./icons";
import { box } from "./zoom";

export interface Card { front: string; back: string; /* HTML */ }


/** How a deck is shown. remove: a button under the card taking the card shown out (its words - + KNOWN WORDS, REMOVE
 *  FROM LIST - and done, told each card taken out); middle: the screen's own button for the bar's middle (the Verse
 *  cards' +, Flashcards' list icon); none, the middle empty. backOnly: turned over, the back alone shows, the front hidden (Flashcards' words: only
 *  the English; a verse card: the verse with its reference); otherwise under it. noTurn: a selector - a tap on what it
 *  matches doesn't turn the card (the Verse cards' words, tapped for their panel). */
export interface DeckOptions<C> { remove?: { label: string; done: (c: C) => void }; middle?: HTMLElement; backOnly?: boolean; noTurn?: string; }

/** A swipe anywhere on a deck's screen - the card or beside it - steps the deck shown (the last showDeck's), not one begun
 *  on its top bar, bottom bar, a panel or an open list, or while no deck's card shows (another screen, no cards). */
let swiped: (by: 1 | -1) => void = () => {}, swipeOn = false, shownCard: HTMLElement | null = null;
const deckSwipe = (t: Element) => !! shownCard?.offsetParent && ! t.closest (".topBar, .bottomBar, .deckPane, .deckSplit, .chooseList, .csMenu, input, textarea, select");

/** Shows a deck in el: the card, its count and the bar (above). */
export function showDeck<C extends Card> (el: HTMLElement, cards: C[], o: DeckOptions<C> = {}): DeckShown<C> {
  const first = [...cards];
  let deck = [...cards], at = 0;
  const btn = (k: string, label: string, inner: string, cls = "pill icon") => `<button class="${cls}" data-k="${k}" aria-label="${label}">${inner}</button>`;
  el.innerHTML = `<div class="card${o.backOnly ? " single" : ""}" role="button" tabindex="0"><div class="cardFront"></div><div class="cardBack" hidden></div></div>
    <div class="src cardCount"></div>${o.remove ? btn ("remove", o.remove.label, o.remove.label, "pill action cardAction") : ""}
    <div class="bottomBar">${btn ("back", "Back", ICONS.back, "pill icon arrow")}${btn ("shuffle", "Shuffle", ICONS.shuffle)}${btn ("over", "Start over", ICONS.over)}${btn ("next", "Next", ICONS.next, "pill icon arrow")}</div>`;
  const card = el.querySelector<HTMLElement> (".card")!, front = el.querySelector<HTMLElement> (".cardFront")!;
  const back = el.querySelector<HTMLElement> (".cardBack")!, count = el.querySelector<HTMLElement> (".cardCount")!;
  const bar = el.querySelector<HTMLElement> ("#screen .bottomBar")!;
  shownCard = card;
  if (o.middle) { o.middle.classList.add ("barMid"); bar.querySelector ("[data-k=over]")!.before (o.middle); }
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
  swiped = (by) => bar.querySelector<HTMLElement> (by > 0 ? "[data-k=next]" : "[data-k=back]")!.click ();     // (A swipe across the screen steps as ‹ and ›: below)
  if (! swipeOn) { swipeOn = true; onSwipe (document.getElementById ("screen")!, (by) => swiped (by), deckSwipe); }
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
    const c = under?.textContent ? box (under).bottom - box (deckEl).bottom : 0, cs = getComputedStyle (screenEl);     // (CSS px, as clientHeight: zoom.ts)
    deckEl.style.setProperty ("--vcCreditsH", c + "px");
    const room = screenEl.clientHeight - parseFloat (cs.paddingTop) - parseFloat (cs.paddingBottom) - c;
    deckEl.style.setProperty ("--vcRoom", room + "px");
    const kids = [...deckEl.children].filter ((x) => ! x.classList.contains ("bottomBar")) as HTMLElement[];
    const content = kids.length ? box (kids[kids.length - 1]).bottom - box (kids[0]).top : 0;
    deckEl.classList.toggle ("vcTall", content > room - c);
  };
  const watch = new ResizeObserver (fit);
  if (under) watch.observe (under);
  watch.observe (screenEl); watch.observe (deckEl);
}

/** A fresh order (SHUFFLE; the verb paradigms' each time they open). */
export const shuffle = <T,> (a: T[]) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor (Math.random () * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
