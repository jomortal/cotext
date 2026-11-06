// The bottom bars (the play bar, the Verse cards' bar): at the screen's foot - or, held sideways (a phone, or a touch
// screen such as an iPad's wider than a phone's: layout.ts' one-pane mode), a vertical bar down its right side
// (style.css' SIDE BAR media query: keep the two the same), taking no room at the foot.

export const SIDE_BAR = matchMedia ("(orientation: landscape) and (max-height: 500px), (orientation: landscape) and (min-width: 600.02px) and (pointer: coarse)");

/** The room a bottom bar takes at the screen's foot: its height - none while it's down the side. */
export const barRoom = (bar: HTMLElement | null) => ! bar || SIDE_BAR.matches ? 0 : bar.offsetHeight;
