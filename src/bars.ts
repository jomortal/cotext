// The bottom bars (the play bar, the Verse cards' bar): at the screen's foot - or, on a phone held sideways, a
// vertical bar down its right side (style.css' SIDE BAR media query: keep the two the same), taking no room at the foot.

export const SIDE_BAR = matchMedia ("(orientation: landscape) and (max-height: 500px)");

/** The room a bottom bar takes at the screen's foot: its height - none while it's down the side. */
export const barRoom = (bar: HTMLElement | null) => ! bar || SIDE_BAR.matches ? 0 : bar.offsetHeight;
