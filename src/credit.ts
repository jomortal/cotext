// A credit line (a source's copyright or license, under what it shows): its text as written, each web address in it a
// link (a new tab) - a license that asks for its link (the NET Bible's http://netbible.com) gets one, wherever its
// credit is shown.

/** Sets el's content to text, its web addresses (http:// or https://, a full stop or comma after one left out) links. */
export function creditText (el: HTMLElement, text: string) {
  el.replaceChildren ();
  let at = 0;
  for (const m of text.matchAll (/https?:\/\/[^\s)]+?(?=[.,;:]?(?:\s|\)|$))/g)) {
    el.append (text.slice (at, m.index));
    const a = document.createElement ("a");
    a.href = m[0]; a.textContent = m[0]; a.target = "_blank"; a.rel = "noopener";
    el.append (a);
    at = m.index! + m[0].length;
  }
  el.append (text.slice (at));
}
