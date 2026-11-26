// My notes: the reader's own notes, a resource of the notes panel (notes.ts' MY_NOTES, the picker's NOTES group) offered
// in every book and not tied to any passage - the same notes, and what's typed, whatever the text shows.
// - The pane (notesPane): the note open in a text box (the printout's note box, .csMemoBox: plain text, no formatting
//   bar), under it SAVE, + NEW NOTE and DELETE (a saved note open only, asked first), then SAVED NOTES - every saved
//   note a row (.hit), its date saved over its title (its first line, cut to one line), the latest saved first; tapped,
//   it opens in the box, its row in the accent while open.
// - SAVE keeps what's typed: a new note added, the open one changed (and moved to the top); an empty box isn't saved.
//   + NEW NOTE empties the box for a new one (what wasn't saved is dropped). What's typed and not saved stays in the box
//   while the page is open (the pane is made once and kept), not across a reload.
// - Kept on the device: localStorage cotext.mynotes = { notes: [{ id, text, saved: ms since 1970 }] } - the latest saved
//   first. (Account sync is planned: TODO.md's Accounts and cloud storage.)

interface Note { id: string; text: string; saved: number; }
const KEY = "cotext.mynotes";
let notes: Note[] = [];
let openId = "";     // (The saved note open in the box; "" a new one)

function load () {
  try {
    const s = JSON.parse (localStorage.getItem (KEY) ?? "null");
    notes = Array.isArray (s?.notes) ? s.notes.filter ((n: Note) => typeof n?.id === "string" && typeof n.text === "string") : [];
  } catch { notes = []; }
}
const save = () => { try { localStorage.setItem (KEY, JSON.stringify ({ notes })); } catch { /* private mode: not kept */ } };

const el = <K extends keyof HTMLElementTagNameMap> (tag: K, cls = "", text = "") => {
  const e = document.createElement (tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
/** A note's title: its first line with words in it. */
const titleOf = (n: Note) => n.text.split ("\n").map ((l) => l.trim ()).find ((l) => l) ?? "Untitled";
const dateOf = (n: Note) => new Date (n.saved).toLocaleDateString (undefined, { day: "numeric", month: "short", year: "numeric" });

let pane: { el: HTMLElement; box: HTMLElement; del: HTMLButtonElement; list: HTMLElement; head: HTMLElement } | null = null;

/** The pane (notes.ts puts it in the notes panel's body): made once and kept, so what's typed survives another resource
 *  picked meanwhile; the saved notes read again each time it's shown. */
export function notesPane (): HTMLElement {
  if (! pane) {
    const box = el ("div", "choose csMemoBox myNoteBox");
    try { box.contentEditable = "plaintext-only"; } catch { box.contentEditable = "true"; }     // (Plain text: no pasted formatting)
    box.dataset.placeholder = "Type a note";
    box.setAttribute ("aria-label", "Note");
    const bar = el ("div", "bar myNoteBar"), keep = el ("button", "pill action", "Save"), fresh = el ("button", "pill action", "+ New note"),
          del = el ("button", "pill", "Delete");
    bar.append (keep, fresh, del);
    const head = el ("div", "src", "Saved notes"), list = el ("div", "myNoteList");
    const root = el ("div", "myNotes");
    root.append (box, bar, head, list);
    pane = { el: root, box, del, list, head };
    keep.addEventListener ("click", () => {
      const text = box.innerText.replace (/\n+$/, "");
      if (! text.trim ()) return;
      const was = notes.find ((n) => n.id === openId);
      const n: Note = { id: was?.id ?? Date.now ().toString (36), text, saved: Date.now () };
      notes = [n, ...notes.filter ((x) => x !== was)];
      openId = n.id; save (); draw ();
    });
    fresh.addEventListener ("click", () => { openId = ""; box.textContent = ""; draw (); box.focus (); });
    del.addEventListener ("click", () => {
      const n = notes.find ((x) => x.id === openId);
      if (! n || ! confirm (`Delete the note "${titleOf (n)}"?`)) return;
      notes = notes.filter ((x) => x !== n);
      openId = ""; box.textContent = ""; save (); draw ();
    });
  }
  load ();
  if (openId && ! notes.some ((n) => n.id === openId)) openId = "";     // (Deleted elsewhere - another tab: the box keeps its text as a new note)
  draw ();
  return pane.el;
}

/** The saved notes' rows and DELETE, as the notes are now. */
function draw () {
  if (! pane) return;
  const p = pane;
  p.del.hidden = ! openId;
  p.head.hidden = ! notes.length;
  p.list.replaceChildren (...notes.map ((n) => {
    const row = el ("button", "hit");
    row.type = "button";
    row.append (el ("span", "src", dateOf (n)), el ("span", "hitText dictLine", titleOf (n)));
    if (n.id === openId) row.setAttribute ("aria-pressed", "true");
    row.addEventListener ("click", () => { openId = n.id; p.box.textContent = n.text; draw (); });
    return row;
  }));
}
