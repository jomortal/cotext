// The Parsing guide (☰ > Parsing guide; design/mock-hebrew.html): every abbreviation the reader's codes use, grouped
// (how a code reads, parts of speech, stems, forms, person / gender / number, prefixes...; Greek tense, voice, mood,
// case...), each with its meaning - the database's guide table, made from the same tables as the codes themselves
// (pipeline/morph.py's guide()), so it can't drift from them. The language of the text shown first, then the other.

import type { Db } from "./db";
import { onScreen, currentTestament } from "./study";

let db: Db;
export function initGuide (theDb: Db) { db = theDb; }

const esc = (s: string) => s.replace (/[&<>"]/g, (c) => `&#${c.charCodeAt (0)};`);

function draw (body: HTMLElement) {
  const first = currentTestament () === "OT" ? "H" : "G";
  const rows = db.all ("SELECT lang, grp, code, meaning FROM guide ORDER BY lang = ? DESC, ord", [first]);
  let html = "", lang = "", grp = "";
  for (const r of rows) {
    if (r.lang !== lang) { lang = String (r.lang); grp = ""; html += `<h2 class="guideLang">${lang === "H" ? "Hebrew and Aramaic" : "Greek"}</h2>`; }
    if (r.grp !== grp) { grp = String (r.grp); html += `<div class="ref">${esc (grp)}</div>`; }
    html += `<div class="guideRow"><b class="parse">${esc (String (r.code))}</b><span>${esc (String (r.meaning))}</span></div>`;
  }
  body.innerHTML = `<p>A verb reads <b>STEM-FORM-PERSON</b> (Greek: <b>TENSE VOICE MOOD-PERSON</b>), anything else <b>PART-GENDER NUMBER</b>, each part split by a hyphen; a prefix or suffix joins its word with <b>+</b>.</p>${html}`;
}

onScreen ("Parsing guide", draw);
