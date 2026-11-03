// The Parsing guide (☰ > Parsing guide; design/mock-hebrew.html): every abbreviation the reader's codes use, grouped
// (how a code reads, parts of speech, stems, forms, person / gender / number, prefixes...; Greek tense, voice, mood,
// case...), each with its meaning - the database's guide table, made from the same tables as the codes themselves
// (pipeline/morph.py's guide()), so it can't drift from them. Only the language of the text shown (Hebrew and Aramaic for the OT, Greek for the NT).

import type { Db } from "./db";
import { onScreen, currentTestament } from "./study";

let db: Db;
export function initGuide (theDb: Db) { db = theDb; }

const esc = (s: string) => s.replace (/[&<>"]/g, (c) => `&#${c.charCodeAt (0)};`);

function draw (body: HTMLElement) {
  const hebrew = currentTestament () === "OT";
  const rows = db.all ("SELECT grp, code, meaning FROM guide WHERE lang = ? ORDER BY ord", [hebrew ? "H" : "G"]);
  let html = "", grp = "";
  for (const r of rows) {
    if (r.grp !== grp) { grp = String (r.grp); html += `<div class="ref">${esc (grp)}</div>`; }
    html += `<div class="guideRow"><b class="parse">${esc (String (r.code))}</b><span>${esc (String (r.meaning))}</span></div>`;
  }
  body.innerHTML = `<p>${hebrew ? "Hebrew and Aramaic: a verb reads <b>STEM-FORM-PERSON</b>" : "Greek: a verb reads <b>TENSE VOICE MOOD-PERSON</b>"}, anything else <b>PART-GENDER NUMBER</b>, each part split by a hyphen; a prefix or suffix joins its word with <b>+</b>.</p>${html}`;
}

onScreen ("Parsing guide", draw);
