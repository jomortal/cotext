// The icons: every icon button's (.pill.icon - ✕, +, ☰, ⋯, ▶ and ■, ‹ and ›, the bars', the panes', the speakers') one
// way - a drawing on a 24-unit square in the text's color, never a text glyph (+ ✕ ☰ ⋯ ‹ › are drawn at different sizes
// by each font and platform; a drawing is the same everywhere). Sized by style.css' icon rule (.pill .ico: --icon-box,
// from --fs-icon; ‹ and › from --fs-arrow), every line the same weight whatever the icon's size (--icon-stroke). A
// button's words are its aria-label, for a screen reader.

/** An icon's drawing: inner, its paths (stroked; a filled shape says fill="currentColor" itself). */
const svg = (inner: string) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
const path = (d: string) => `<path d="${d}"/>`;

export const ICONS = {
  x: svg (path ("M6.5 6.5l11 11M17.5 6.5l-11 11")),     // (Close)
  plus: svg (path ("M12 5.5v13M5.5 12h13")),     // (Add)
  menu: svg (path ("M4.5 7h15M4.5 12h15M4.5 17h15")),     // (☰: the study drawer)
  more: svg (`<circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none"/>`),     // (⋯: the helps' menu)
  play: svg (`<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>`),     // (▶: read aloud)
  stop: svg (`<rect x="6.5" y="6.5" width="11" height="11" rx="1" fill="currentColor"/>`),     // (■: stop reading)
  back: svg (path ("M14.5 6l-6 6 6 6")),     // (‹: the previous chapter or card)
  next: svg (path ("M9.5 6l6 6-6 6")),     // (›: the next)
  search: svg (`<circle cx="10.5" cy="10.5" r="6"/>${path ("M15 15l5.5 5.5")}`),     // (A magnifying glass)
  notes: svg (path ("M6 3h9l4 4v14H6z") + path ("M15 3v4h4M9 11h7M9 14.5h7M9 18h4")),     // (A page with a folded corner: the resources)
  speak: svg (`<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/>${path ("M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11")}`),     // (A speaker: the word said)
  shuffle: svg (path ("M3 7h3c4 0 6 10 10 10h5M3 17h3c1.6 0 2.8-1.6 3.9-3.6M13.1 9.6C14.2 8 15.4 7 17 7h4M18 4l3 3-3 3M18 14l3 3-3 3")),     // (Two paths crossing)
  over: svg (path ("M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5")),     // (Back to the start: an arrow round to its beginning)
  list: svg (path ("M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01")),     // (Lines: a list - the decks' Verse list and Word list)
  pencil: svg (path ("M4 20h4L19 9l-4-4L4 16z") + path ("M13 7l4 4")),     // (Editing: the printout's editor)
  printer: svg (path ("M7 8V3h10v5M7 17H4v-7h16v7h-3M7 14h10v7H7z")),     // (Print)
  download: svg (path ("M12 4v11M7 10l5 5 5-5M5 20h14")),     // (An arrow down to a line)
};
export type IconName = keyof typeof ICONS;

/** Draws icon name on button b (in place of whatever it showed: a toggled icon - ⋯ and ✕, ▶ and ■ - redrawn by this too). */
export function setIcon (b: Element, name: IconName) { (b as HTMLElement).dataset.icon = name; b.innerHTML = ICONS[name]; }

// The page's own icon buttons (index.html: data-icon="name"), drawn as this module loads - main.ts imports it first, so
// they're drawn before any other module reads or copies them (panel.ts' copies of the word's panel).
for (const b of document.querySelectorAll<HTMLElement> ("[data-icon]")) setIcon (b, b.dataset.icon as IconName);
