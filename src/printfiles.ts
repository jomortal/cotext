// The Study printout's downloads (chapterstudy.ts' Download picker): the printout made into a file on the device - Word
// (.docx, .doc), OpenDocument (.odt), Rich Text (.rtf), plain text (.txt) or a web page (.html, .htm); the PDF is
// chapterstudy.ts' own (makePdf). Loaded only when a download is picked (its own file, with fflate for the zips: not in
// the app's first load).
// - FROM THE PREVIEW: each file is made from the printout as it prints - the preview laid out at the page's width in
//   the print rules (chapterstudy.ts' withPrintCopy: the light colors, the maps as pictures) - read element by element
//   with its look as drawn (getComputedStyle): what's hidden left out, headings as headings, bold, italics, sizes and
//   colors kept, Hebrew right to left. Hebrew and Greek are real text, their fonts named (Ezra SIL, Gentium, as the
//   page's): a reader without them sees another font, never pictures of letters.
// - THE TEXT'S VERSES: each verse a row of words, each word its lines (the word, transliteration, gloss, parsing - those
//   the item shows), the verse's number first; a verse that wraps on the page wraps where it does there (its words
//   grouped by the line they're on). In Word (.docx, .doc), OpenDocument and Rich Text each line of words is a table
//   row without borders (right to left for Hebrew), each word a cell its width on the page, its lines centered as on
//   the page, a later line kept clear of the number's margin; in plain text the verse's words on one line, each word's
//   helps in brackets after it.
// - PICTURES (the maps, an article's photo): Word, OpenDocument and Rich Text embed them (PNG or JPEG) at their size on
//   the page; the .doc a web archive (MHTML: the page and its pictures in one file, as Word saves "Single File Web
//   Page"), so Word shows its pictures; the web page has them as data: URLs; plain text says [Map].
// - The web page (.html, .htm - the same file) is the printout itself: every element with its look written into its
//   own style attribute (only what differs from what it inherits or a property's usual value), so it opens anywhere
//   as it looked, needing no other file.

import { zipSync, strToU8 } from "fflate";

import { MIME } from "./chapterstudy";     // (Each kind's media type: kept with the formats' list, which the save dialog needs before this loads)

export type FileKind = "docx" | "doc" | "odt" | "rtf" | "txt" | "html" | "htm";
export { MIME };
/** The page: its size and margins in points (chapterstudy.ts' paper). */
export type Page = { w: number; h: number; side: number; top: number };

//==== READING THE PRINTOUT ====
/** A run of text and its look: size in points, font named where it's the Hebrew's or Greek's (else the document's
 *  own), color as RRGGBB where it isn't the text's own; rtl: Hebrew letters. "\n" alone: a line break. */
type Run = { text: string; b?: boolean; i?: boolean; u?: boolean; size: number; font?: string; color?: string; sup?: boolean; rtl?: boolean };
/** A paragraph: its runs; level 1-3 a heading; in points, indent where its first line starts (from the text's left),
 *  hang how much further in its other lines start (a hanging indent), before the space above it. */
type Para = { k: "p"; runs: Run[]; level?: number; align?: "center" | "right"; rtl?: boolean; indent: number; hang: number; before: number };
/** A verse of the text: rows of cells (the number, then each word - a later row's first cell an empty one, the
 *  number's width: the words kept clear of the margin), each cell its lines and its width in points. */
type Words = { k: "words"; rtl: boolean; indent: number; rows: { lines: Run[][]; w: number }[][] };
/** A picture: its bytes, PNG or JPEG, its pixels and its size on the page in points. */
type Pic = { k: "pic"; bytes: Uint8Array; type: "png" | "jpeg"; pw: number; ph: number; w: number; h: number; alt: string; url: string };
type Block = Para | Words | Pic;

const PT = 0.75;     // (Points a CSS px)
const HEBREW = /[\u0590-\u05FF\uFB1D-\uFB4F]/;
const ink = document.createElement ("canvas").getContext ("2d", { willReadFrequently: true })!;
const hexes = new Map<string, string> ();
/** A CSS color as RRGGBB (any form the browser gives: rgb(), oklch()... - drawn and read back). */
function hex (c: string): string {
  let h = hexes.get (c);
  if (h === undefined) {
    ink.clearRect (0, 0, 1, 1); ink.fillStyle = "#000"; ink.fillStyle = c; ink.fillRect (0, 0, 1, 1);
    const [r, g, b] = ink.getImageData (0, 0, 1, 1).data;
    h = [r, g, b].map ((x) => x.toString (16).padStart (2, "0")).join ("").toUpperCase ();
    hexes.set (c, h);
  }
  return h;
}
/** The font a run is set in, where it's one of the page's own (the Hebrew's, the Greek's): its name, else none. */
const fontOf = (family: string) => /Ezra SIL/.test (family) ? "Ezra SIL" : /Gentium/.test (family) ? "Gentium" : undefined;

/** The pictures in the printout (each <img> shown), read as bytes: a data: URL decoded, another fetched (given 15 s);
 *  a type other than PNG or JPEG drawn into a PNG. Read from the bytes, not the element (the copy's pictures may never
 *  load: lazy, off screen). One that can't be read is left out. */
async function pictures (doc: HTMLElement): Promise<Map<Element, Omit<Pic, "k" | "alt">>> {
  const out = new Map<Element, Omit<Pic, "k" | "alt">> ();
  for (const img of doc.querySelectorAll ("img")) {
    if (getComputedStyle (img).display === "none" || ! img.src) continue;
    try {
      const stop = new AbortController (), timer = setTimeout (() => stop.abort (), 15_000);
      const blob = await (await fetch (img.src, { signal: stop.signal })).blob ();
      clearTimeout (timer);
      let bytes = new Uint8Array (await blob.arrayBuffer ());
      let type: "png" | "jpeg" | "" = bytes[0] === 0x89 && bytes[1] === 0x50 ? "png" : bytes[0] === 0xFF && bytes[1] === 0xD8 ? "jpeg" : "";
      const bmp = await createImageBitmap (blob);
      const pw = bmp.width, ph = bmp.height;
      if (! type) {     // (Another kind - WebP, SVG: drawn into a PNG)
        const c = document.createElement ("canvas");
        c.width = pw; c.height = ph;
        c.getContext ("2d")!.drawImage (bmp, 0, 0);
        const png = await new Promise<Blob | null> ((done) => c.toBlob (done, "image/png"));
        if (! png) continue;
        bytes = new Uint8Array (await png.arrayBuffer ()); type = "png";
      }
      bmp.close ();
      if (! pw || ! ph) continue;
      const r = img.getBoundingClientRect ();
      const w = r.width || pw, h = r.height || (w * ph) / pw;     // (Not laid out yet - a picture still loading: its own shape at its width)
      out.set (img, { bytes, type, pw, ph, w: w * PT, h: h * PT, url: `data:image/${type};base64,${b64 (bytes)}` });
    } catch { /* (A picture that can't be read: left out) */ }
  }
  return out;
}

/** The printout as blocks, in order: paragraphs, verses of the text, pictures (doc: laid out in the print rules). */
function blocks (doc: HTMLElement, pics: Map<Element, Omit<Pic, "k" | "alt">>): Block[] {
  const out: Block[] = [];
  const left = doc.getBoundingClientRect ().left;
  const base = hex (getComputedStyle (doc).color);
  type Ctx = { level?: number; align?: "center" | "right"; rtl: boolean; indent: number; hang: number; before: number };
  const stack: Ctx[] = [{ rtl: false, indent: 0, hang: 0, before: 0 }];
  let para: Para | null = null;
  const flush = () => {
    if (para) {
      const rs = para.runs;
      while (rs.length && ! rs[0].text.trim () && rs[0].text !== "\n") rs.shift ();
      while (rs.length && ! rs[rs.length - 1].text.trim ()) rs.pop ();
      if (rs.length) { rs[0].text = rs[0].text.replace (/^\s+/, ""); rs[rs.length - 1].text = rs[rs.length - 1].text.replace (/\s+$/, ""); out.push (para); }
    }
    para = null;
  };
  const run = (text: string, cs: CSSStyleDeclaration, at?: Element | null): Run => {
    const c = hex (cs.color);
    // (Underlined: an underline isn't inherited as a style - looked for on the element and those it's inside, to its block)
    let u = false;
    for (let x = at; x && ! u; x = x.parentElement) { const s = getComputedStyle (x); u = s.textDecorationLine.includes ("underline"); if (! s.display.startsWith ("inline")) break; }
    if (cs.textTransform === "uppercase") text = text.toUpperCase ();
    return { text, size: Math.round (parseFloat (cs.fontSize) * PT * 2) / 2, b: Number (cs.fontWeight) >= 600 || undefined, i: cs.fontStyle === "italic" || undefined, u: u || undefined,
             font: fontOf (cs.fontFamily), color: c !== base ? c : undefined, sup: cs.verticalAlign === "super" || undefined, rtl: HEBREW.test (text) || undefined };
  };
  const add = (r: Run) => {
    if (! para) { const c = stack[stack.length - 1]; para = { k: "p", runs: [], level: c.level, align: c.align, rtl: c.rtl, indent: c.indent, hang: c.hang, before: c.before }; c.before = 0; }
    const last = para.runs[para.runs.length - 1];
    if (last && last.text !== "\n" && r.text !== "\n" && JSON.stringify ({ ...last, text: "" }) === JSON.stringify ({ ...r, text: "" })) last.text += r.text;
    else para.runs.push (r);
  };
  /** An element's text as runs (inline: a word's line, a cell). */
  const inline = (e: Element, into: Run[]) => {
    for (const n of e.childNodes) {
      if (n instanceof Element) { if (getComputedStyle (n).display !== "none") inline (n, into); }
      else if (n.nodeType === Node.TEXT_NODE && n.textContent) {
        const t = n.textContent.replace (/\s+/g, " ");
        if (t.trim ()) into.push (run (t, getComputedStyle (n.parentElement!), n.parentElement));
      }
    }
    return into;
  };
  /** A verse row (.vrow): its number and words, grouped into the lines they're on. */
  const verse = (row: HTMLElement) => {
    const cells = [row.querySelector (":scope > .vnum"), ...row.querySelectorAll (":scope > .verse > .w")].filter ((x): x is Element => !! x && getComputedStyle (x).display !== "none");
    const rows: Words["rows"] = [[]];
    let top = NaN, margin = 0;
    for (const c of cells) {
      const r = c.getBoundingClientRect ();
      const lines = [...c.children].filter ((x) => getComputedStyle (x).display !== "none").map ((x) => inline (x, [])).filter ((l) => l.length);
      if (! c.classList.contains ("w")) { margin = r.width * PT + 8; rows[0].push ({ lines, w: margin }); continue; }     // (The number)
      if (! lines.length) continue;
      if (Math.abs (r.top - top) > 4 && ! Number.isNaN (top)) rows.push (margin ? [{ lines: [], w: margin }] : []);     // (The words' next line on the page)
      top = r.top;
      rows[rows.length - 1].push ({ lines, w: r.width * PT + 8 });
    }
    if (rows[0].length) out.push ({ k: "words", rtl: row.classList.contains ("he"), indent: Math.max (0, (row.getBoundingClientRect ().left - left) * PT), rows });
  };
  const walk = (e: Element) => {
    const cs = getComputedStyle (e);
    if (cs.display === "none" || cs.visibility === "hidden") return;
    if (e.classList.contains ("vrow")) { flush (); verse (e as HTMLElement); return; }
    if (e.tagName === "IMG") {
      const p = pics.get (e);
      if (p) { flush (); out.push ({ k: "pic", alt: (e as HTMLImageElement).alt || "Picture", ...p }); }
      return;
    }
    if (e.tagName === "BR") { add ({ text: "\n", size: 0 }); return; }
    if (/^(CANVAS|SVG|BUTTON|INPUT|SELECT|SCRIPT|STYLE)$/i.test (e.tagName)) return;
    const block = ! cs.display.startsWith ("inline") && cs.display !== "contents" && cs.display !== "table-cell";
    if (cs.display === "table-cell" && e.previousElementSibling) add ({ ...run (" ", cs), text: "\t" });
    if (block) {
      flush ();
      const r = e.getBoundingClientRect ();
      const h = /^H([1-3])$/.exec (e.tagName);
      const ti = parseFloat (cs.textIndent) || 0;
      const up = stack[stack.length - 1];
      stack.push ({ level: h ? Number (h[1]) : undefined, align: cs.textAlign === "center" ? "center" : cs.textAlign === "right" || cs.textAlign === "end" && cs.direction === "ltr" ? "right" : undefined,
                    rtl: cs.direction === "rtl", indent: Math.max (0, (r.left - left + parseFloat (cs.paddingLeft) + Math.min (ti, 0)) * PT), hang: ti < 0 ? -ti * PT : 0,
                    before: Math.max (up.before, (parseFloat (cs.marginTop) || 0) * PT) });
      if (cs.display === "list-item") add (run ("• ", cs));
      for (const n of e.childNodes) {
        if (n instanceof Element) walk (n);
        else if (n.nodeType === Node.TEXT_NODE && n.textContent && (n.textContent.trim () || para)) add (run (n.textContent.replace (/\s+/g, " "), cs, e));
      }
      flush ();
      stack.pop ();
      return;
    }
    for (const n of e.childNodes) {
      if (n instanceof Element) walk (n);
      else if (n.nodeType === Node.TEXT_NODE && n.textContent && (n.textContent.trim () || para)) add (run (n.textContent.replace (/\s+/g, " "), cs, e));
    }
  };
  walk (doc);
  flush ();
  return out;
}

//==== HELPERS ====
const xml = (s: string) => s.replace (/&/g, "&amp;").replace (/</g, "&lt;").replace (/>/g, "&gt;").replace (/"/g, "&quot;").replace (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
function b64 (bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode (...bytes.subarray (i, i + 0x8000));
  return btoa (s);
}
const plainOf = (runs: Run[]) => runs.map ((r) => r.text).join ("");
/** A picture's size on the page: as printed, no wider than the text (width: points). */
const fit = (p: Pic, width: number) => { const k = Math.min (1, width / p.w); return { w: p.w * k, h: p.h * k }; };

//==== PLAIN TEXT ====
// Headings underlined (= the printout's title, - a section's), a blank line before each; a verse its number and words
// on one line, a word's helps (transliteration, gloss, parsing - those shown) in brackets after it; a picture [Map].
function txt (bs: Block[]): string {
  const lines: string[] = [];
  for (const b of bs) {
    if (b.k === "p") {
      const t = plainOf (b.runs);
      if (b.level) { lines.push ("", t, (b.level === 1 ? "=" : b.level === 2 ? "-" : "").repeat (t.length)); }
      else lines.push (t);
    } else if (b.k === "words") {
      const cells = b.rows.flat ().filter ((c) => c.lines.length);
      const word = (c: { lines: Run[][] }) => { const [w, ...rest] = c.lines.map (plainOf); return rest.length ? `${w} [${rest.join (", ")}]` : w; };
      const [num, ...ws] = cells;
      lines.push ([num ? plainOf (num.lines[num.lines.length - 1]) : "", ...ws.map (word)].join (" ").trim ());
    } else lines.push (`[${b.alt}]`);
  }
  return "\ufeff" + lines.join ("\r\n").replace (/^(\r\n)+/, "") + "\r\n";
}

//==== WORD (.docx) ====
// Office Open XML, zipped: the document (paragraphs, a verse's lines of words as borderless tables - right to left
// for Hebrew -, pictures inline), its styles (Normal and Heading 1-3, so Word's navigation lists the headings), the
// pictures in word/media. The page the printout's (A4 or Letter, @page's margins).
const TW = 20;     // (Twips a point)
const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
  + 'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
  + 'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
function docx (bs: Block[], title: string, page: Page): Uint8Array {
  const media: Record<string, Uint8Array> = {};
  const rels: string[] = [];
  const width = page.w - 2 * page.side;
  const rPr = (r: Run) => {
    const f = r.font ? `<w:rFonts w:ascii="${r.font}" w:hAnsi="${r.font}" w:cs="${r.font}"/>` : "";
    const sz = Math.round (r.size * 2);
    return `<w:rPr>${f}${r.b ? "<w:b/><w:bCs/>" : ""}${r.i ? "<w:i/><w:iCs/>" : ""}${r.color ? `<w:color w:val="${r.color}"/>` : ""}`
         + `${sz ? `<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>` : ""}${r.u ? '<w:u w:val="single"/>' : ""}${r.sup ? '<w:vertAlign w:val="superscript"/>' : ""}${r.rtl ? "<w:rtl/>" : ""}</w:rPr>`;
  };
  const runs = (rs: Run[]) => rs.map ((r) => r.text === "\n" ? "<w:r><w:br/></w:r>"
    : r.text.split ("\t").map ((t, i) => `<w:r>${rPr (r)}${i ? "<w:tab/>" : ""}<w:t xml:space="preserve">${xml (t)}</w:t></w:r>`).join ("")).join ("");
  const pPr = (o: { level?: number; align?: string; rtl?: boolean; indent?: number; hang?: number; before?: number; after?: number }) =>
    `<w:pPr>${o.level ? `<w:pStyle w:val="Heading${o.level}"/>` : ""}${o.rtl ? "<w:bidi/>" : ""}<w:spacing w:before="${Math.round ((o.before ?? 0) * TW)}" w:after="${Math.round ((o.after ?? 4) * TW)}"/>`
    + `${o.indent || o.hang ? `<w:ind w:${o.rtl ? "right" : "left"}="${Math.round (((o.indent ?? 0) + (o.hang ?? 0)) * TW)}"${o.hang ? ` w:hanging="${Math.round (o.hang * TW)}"` : ""}/>` : ""}`
    + `${o.align === "center" ? '<w:jc w:val="center"/>' : o.align === "right" && ! o.rtl ? '<w:jc w:val="right"/>' : ""}</w:pPr>`;
  let pics = 0;
  const body = bs.map ((b) => {
    if (b.k === "p") return `<w:p>${pPr (b)}${runs (b.runs)}</w:p>`;
    if (b.k === "words") {
      return b.rows.map ((row) => {
        const ws = row.map ((c) => Math.round (c.w * TW));
        return `<w:tbl><w:tblPr>${b.rtl ? "<w:bidiVisual/>" : ""}<w:tblW w:w="0" w:type="auto"/><w:tblInd w:w="${Math.round (b.indent * TW)}" w:type="dxa"/>`     // (tblPr's children in the schema's order)
          + '<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>'
          + '<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr>'
          + `<w:tblGrid>${ws.map ((w) => `<w:gridCol w:w="${w}"/>`).join ("")}</w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr>`
          + row.map ((c, i) => `<w:tc><w:tcPr><w:tcW w:w="${ws[i]}" w:type="dxa"/></w:tcPr>${c.lines.map ((l) => `<w:p>${pPr ({ rtl: b.rtl, after: 0, align: "center" })}${runs (l)}</w:p>`).join ("") || "<w:p/>"}</w:tc>`).join ("")
          + "</w:tr></w:tbl>";
      }).join ("") + `<w:p>${pPr ({ after: 0 })}</w:p>`;
    }
    const n = ++pics, name = `image${n}.${b.type === "png" ? "png" : "jpeg"}`;
    media[`word/media/${name}`] = b.bytes;
    rels.push (`<Relationship Id="rIdImg${n}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${name}"/>`);
    const { w, h } = fit (b, width), cx = Math.round (w * 12700), cy = Math.round (h * 12700);
    return `<w:p>${pPr ({ after: 6 })}<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${n}" name="Picture ${n}" descr="${xml (b.alt)}"/>`
      + '<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
      + `<pic:pic><pic:nvPicPr><pic:cNvPr id="${n}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg${n}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>`
      + `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
  }).join ("");
  const tw = (x: number) => Math.round (x * TW);
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W_NS}><w:body>${body}`
    + `<w:sectPr><w:pgSz w:w="${tw (page.w)}" w:h="${tw (page.h)}"/><w:pgMar w:top="${tw (page.top)}" w:right="${tw (page.side)}" w:bottom="${tw (page.top)}" w:left="${tw (page.side)}" w:header="0" w:footer="${tw (page.top / 2)}" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const heading = (n: number, pt: number) => `<w:style w:type="paragraph" w:styleId="Heading${n}"><w:name w:val="heading ${n}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>`
    + `<w:pPr><w:keepNext/><w:outlineLvl w:val="${n - 1}"/></w:pPr><w:rPr><w:b/><w:bCs/><w:sz w:val="${pt * 2}"/><w:szCs w:val="${pt * 2}"/></w:rPr></w:style>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${W_NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Ezra SIL"/>`
    + '<w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="en-US" w:bidi="he-IL"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'
    + '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'
    + heading (1, 18) + heading (2, 13) + heading (3, 12) + "</w:styles>";
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8 ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
      + '<Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/>'
      + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
      + '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
      + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>'),
    "_rels/.rels": strToU8 ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
      + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>'),
    "docProps/core.xml": strToU8 ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
      + `xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xml (title)}</dc:title><dc:creator>COTEXT</dc:creator></cp:coreProperties>`),
    "word/_rels/document.xml.rels": strToU8 ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' + rels.join ("") + "</Relationships>"),
    "word/document.xml": strToU8 (doc),
    "word/styles.xml": strToU8 (styles),
    ...media,
  };
  return zipSync (files, { level: 6 });
}

//==== OPENDOCUMENT (.odt) ====
// The OpenDocument text package: mimetype first and stored (as the format asks), the manifest, the styles (the page,
// the default font) and the content - each distinct look an automatic style (P1... paragraphs, T1... text, a table's
// columns), headings as text:h with their outline level, a verse's lines of words as borderless tables (right to left
// for Hebrew), pictures in Pictures/.
function odt (bs: Block[], title: string, page: Page): Uint8Array {
  const pics: Record<string, Uint8Array> = {};
  const auto: string[] = [];
  const named = new Map<string, string> ();
  const style = (family: string, prefix: string, props: string) => {
    const key = family + props;
    let n = named.get (key);
    if (! n) { n = `${prefix}${named.size + 1}`; named.set (key, n); auto.push (`<style:style style:name="${n}" style:family="${family}">${props}</style:style>`); }
    return n;
  };
  const tProps = (r: Run) => {
    const a = [`fo:font-size="${r.size}pt"`, `style:font-size-complex="${r.size}pt"`];
    if (r.b) a.push ('fo:font-weight="bold"', 'style:font-weight-complex="bold"');
    if (r.i) a.push ('fo:font-style="italic"', 'style:font-style-complex="italic"');
    if (r.u) a.push ('style:text-underline-style="solid"', 'style:text-underline-width="auto"', 'style:text-underline-color="font-color"');
    if (r.color) a.push (`fo:color="#${r.color}"`);
    if (r.font) a.push (`style:font-name="${r.font}"`, `style:font-name-complex="${r.font}"`);
    if (r.sup) a.push ('style:text-position="super 58%"');
    return `<style:text-properties ${a.join (" ")}/>`;
  };
  const spans = (rs: Run[]) => rs.map ((r) => r.text === "\n" ? "<text:line-break/>"
    : `<text:span text:style-name="${style ("text", "T", tProps (r))}">${r.text.split ("\t").map ((t) => xml (t).replace (/ {2,}/g, (m) => ` <text:s text:c="${m.length - 1}"/>`)).join ("<text:tab/>")}</text:span>`).join ("");
  const pStyle = (o: { align?: string; rtl?: boolean; indent?: number; hang?: number; before?: number; after?: number; level?: number }) => style ("paragraph", "P",
    `<style:paragraph-properties fo:margin-top="${(o.before ?? 0).toFixed (1)}pt" fo:margin-bottom="${(o.after ?? 4).toFixed (1)}pt" fo:margin-${o.rtl ? "right" : "left"}="${((o.indent ?? 0) + (o.hang ?? 0)).toFixed (1)}pt"`
    + ` fo:text-indent="${(-(o.hang ?? 0)).toFixed (1)}pt" fo:text-align="${o.align === "center" ? "center" : o.align === "right" ? "end" : "start"}" style:writing-mode="${o.rtl ? "rl-tb" : "lr-tb"}"${o.level ? ' fo:keep-with-next="always"' : ""}/>`);
  let n = 0;
  const width = page.w - 2 * page.side;
  const body = bs.map ((b) => {
    if (b.k === "p") {
      const p = pStyle (b);
      return b.level ? `<text:h text:style-name="${p}" text:outline-level="${b.level}">${spans (b.runs)}</text:h>` : `<text:p text:style-name="${p}">${spans (b.runs)}</text:p>`;
    }
    if (b.k === "words") {
      return b.rows.map ((row) => {
        const t = ++n, total = row.reduce ((s, c) => s + c.w, 0);
        const ts = style ("table", "Tb", `<style:table-properties style:width="${total.toFixed (1)}pt" table:align="${b.rtl ? "right" : "left"}" fo:margin-${b.rtl ? "right" : "left"}="${b.indent.toFixed (1)}pt" style:writing-mode="${b.rtl ? "rl-tb" : "lr-tb"}" style:may-break-between-rows="false"/>`);
        const cell = style ("table-cell", "Cl", '<style:table-cell-properties fo:padding="0pt" fo:border="none"/>');
        const lineP = pStyle ({ rtl: b.rtl, after: 0, align: "center" });
        return `<table:table table:name="Verse${t}" table:style-name="${ts}">`
          + row.map ((c) => `<table:table-column table:style-name="${style ("table-column", "Co", `<style:table-column-properties style:column-width="${c.w.toFixed (1)}pt"/>`)}"/>`).join ("")
          + `<table:table-row>${row.map ((c) => `<table:table-cell table:style-name="${cell}" office:value-type="string">${c.lines.map ((l) => `<text:p text:style-name="${lineP}">${spans (l)}</text:p>`).join ("") || "<text:p/>"}</table:table-cell>`).join ("")}</table:table-row></table:table>`;
      }).join ("");
    }
    const k = ++n, name = `Pictures/image${k}.${b.type === "png" ? "png" : "jpg"}`;
    pics[name] = b.bytes;
    const { w, h } = fit (b, width);
    return `<text:p text:style-name="${pStyle ({ after: 6 })}"><draw:frame draw:name="Picture${k}" text:anchor-type="as-char" svg:width="${w.toFixed (1)}pt" svg:height="${h.toFixed (1)}pt">`
      + `<draw:image xlink:href="${name}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/><svg:desc>${xml (b.alt)}</svg:desc></draw:frame></text:p>`;
  }).join ("");
  const NS = 'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" '
    + 'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" '
    + 'xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" '
    + 'xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" '
    + 'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" office:version="1.3"';
  const fonts = '<office:font-face-decls><style:font-face style:name="Calibri" svg:font-family="Calibri"/><style:font-face style:name="Gentium" svg:font-family="Gentium"/>'
    + '<style:font-face style:name="Ezra SIL" svg:font-family="&apos;Ezra SIL&apos;"/></office:font-face-decls>';
  const content = `<?xml version="1.0" encoding="UTF-8"?><office:document-content ${NS}>${fonts}<office:automatic-styles>${auto.join ("")}</office:automatic-styles>`
    + `<office:body><office:text>${body}</office:text></office:body></office:document-content>`;
  const pt = (x: number) => `${x.toFixed (1)}pt`;
  const styles = `<?xml version="1.0" encoding="UTF-8"?><office:document-styles ${NS}>${fonts}<office:styles><style:default-style style:family="paragraph">`
    + '<style:text-properties style:font-name="Calibri" fo:font-size="10.5pt" style:font-name-complex="Ezra SIL" fo:language="en" fo:country="US"/></style:default-style></office:styles>'
    + `<office:automatic-styles><style:page-layout style:name="PL"><style:page-layout-properties fo:page-width="${pt (page.w)}" fo:page-height="${pt (page.h)}" `
    + `fo:margin-top="${pt (page.top)}" fo:margin-bottom="${pt (page.top)}" fo:margin-left="${pt (page.side)}" fo:margin-right="${pt (page.side)}"/></style:page-layout></office:automatic-styles>`
    + '<office:master-styles><style:master-page style:name="Standard" style:page-layout-name="PL"/></office:master-styles></office:document-styles>';
  const meta = `<?xml version="1.0" encoding="UTF-8"?><office:document-meta ${NS}><office:meta><dc:title>${xml (title)}</dc:title><meta:generator>COTEXT</meta:generator></office:meta></office:document-meta>`;
  const manifest = '<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3">'
    + '<manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/>'
    + '<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>'
    + '<manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>'
    + Object.keys (pics).map ((p) => `<manifest:file-entry manifest:full-path="${p}" manifest:media-type="image/${p.endsWith ("png") ? "png" : "jpeg"}"/>`).join ("") + "</manifest:manifest>";
  return zipSync ({
    mimetype: [strToU8 ("application/vnd.oasis.opendocument.text"), { level: 0 }],
    "META-INF/manifest.xml": strToU8 (manifest), "content.xml": strToU8 (content), "styles.xml": strToU8 (styles), "meta.xml": strToU8 (meta), ...pics,
  }, { level: 6 });
}

//==== RICH TEXT (.rtf) ====
// RTF 1.9: the fonts named in its table (Calibri, Ezra SIL - Hebrew, right to left -, Gentium), the colors in its
// table, every letter past ASCII as \uN? (UTF-16, so a letter past U+FFFF as its two halves), a verse's lines of words
// as table rows without borders (\taprtl: right to left for Hebrew), pictures as \pngblip / \jpegblip in hex.
function rtf (bs: Block[], page: Page): string {
  const colors: string[] = [];
  const color = (h: string) => { let i = colors.indexOf (h); if (i < 0) { colors.push (h); i = colors.length - 1; } return i + 1; };
  const esc = (s: string) => {
    let o = "";
    for (const ch of s) {
      const c = ch.codePointAt (0)!;
      if (ch === "\\" || ch === "{" || ch === "}") o += "\\" + ch;
      else if (ch === "\t") o += "\\tab ";
      else if (c < 128) o += ch;
      else for (const u of String.fromCodePoint (c).split ("")) { const x = u.charCodeAt (0); o += `\\u${x > 32767 ? x - 65536 : x}?`; }
    }
    return o;
  };
  const F = { "Ezra SIL": 1, Gentium: 2 } as Record<string, number>;
  const run = (r: Run) => {
    if (r.text === "\n") return "\\line ";
    const f = r.font ? F[r.font] ?? 0 : r.rtl ? 1 : 0, fs = Math.round (r.size * 2);
    return `{${r.rtl ? "\\rtlch" : "\\ltrch"}\\f${f}\\af${f}${fs ? `\\fs${fs}\\afs${fs}` : ""}${r.b ? "\\b\\ab" : ""}${r.i ? "\\i\\ai" : ""}${r.u ? "\\ul" : ""}${r.color ? `\\cf${color (r.color)}` : ""}${r.sup ? "\\super" : ""} ${esc (r.text)}}`;
  };
  const tw = (x: number) => Math.round (x * TW);
  const par = (o: { level?: number; align?: string; rtl?: boolean; indent?: number; hang?: number; before?: number; after?: number }, inTable = false) =>
    `\\pard\\plain${inTable ? "\\intbl" : ""}${o.rtl ? "\\rtlpar" : "\\ltrpar"}${o.level ? `\\outlinelevel${o.level - 1}\\keepn` : ""}${o.align === "center" ? "\\qc" : o.align === "right" || o.rtl ? "\\qr" : "\\ql"}`
    + `\\li${tw ((o.indent ?? 0) + (o.hang ?? 0))}\\fi${-tw (o.hang ?? 0)}\\sb${tw (o.before ?? 0)}\\sa${tw (o.after ?? 4)} `;
  const width = page.w - 2 * page.side;
  const body = bs.map ((b) => {
    if (b.k === "p") return `${par (b)}${b.runs.map (run).join ("")}\\par\n`;
    if (b.k === "words") {
      return b.rows.map ((row) => {
        let x = tw (b.indent);
        return `\\trowd\\trgaph0\\trleft${tw (b.indent)}\\trkeep${b.rtl ? "\\taprtl" : ""}` + row.map ((c) => `\\cellx${x += tw (c.w)}`).join ("") + "\n"
          + row.map ((c) => (c.lines.map ((l, i) => `${par ({ rtl: b.rtl, after: 0, align: "center" }, true)}${l.map (run).join ("")}${i < c.lines.length - 1 ? "\\par" : ""}`).join ("") || par ({ after: 0 }, true)) + "\\cell\n").join ("")
          + "\\row\n";
      }).join ("") + "\\pard\\plain\\sa0\\par\n";
    }
    const { w, h } = fit (b, width);
    let hexs = "";
    for (let i = 0; i < b.bytes.length; i++) { hexs += b.bytes[i].toString (16).padStart (2, "0"); if (i % 64 === 63) hexs += "\n"; }
    return `${par ({ after: 6 })}{\\pict\\${b.type === "png" ? "pngblip" : "jpegblip"}\\picw${b.pw}\\pich${b.ph}\\picwgoal${tw (w)}\\pichgoal${tw (h)}\n${hexs}}\\par\n`;
  }).join ("");
  const ct = colors.map ((h) => `\\red${parseInt (h.slice (0, 2), 16)}\\green${parseInt (h.slice (2, 4), 16)}\\blue${parseInt (h.slice (4, 6), 16)};`).join ("");
  return `{\\rtf1\\ansi\\ansicpg1252\\uc1\\deff0\\deflang1033{\\fonttbl{\\f0\\fswiss Calibri;}{\\f1\\fbidi\\froman\\fcharset177 Ezra SIL;}{\\f2\\froman Gentium;}}`
    + `{\\colortbl;${ct}}\\paperw${tw (page.w)}\\paperh${tw (page.h)}\\margl${tw (page.side)}\\margr${tw (page.side)}\\margt${tw (page.top)}\\margb${tw (page.top)}\n${body}}`;
}

//==== WORD 97-2003 (.doc) ====
// Word reads a web page saved with the .doc type. A web archive (MHTML, as Word's own "Single File Web Page") so the
// pictures travel inside it: the page (Word's namespaces, the print layout) and each picture a part found by its
// address. Its body plain HTML Word lays out: paragraphs and headings with their look, a verse's lines of words as
// borderless tables (dir="rtl" for Hebrew), the fonts named.
function wordHtml (bs: Block[], title: string, page: Page): string {
  const parts: { loc: string; type: string; data: Uint8Array }[] = [];
  const css = (r: Run) => [`font-size:${r.size}pt`, r.font ? `font-family:'${r.font}'` : "", r.b ? "font-weight:bold" : "", r.i ? "font-style:italic" : "", r.u ? "text-decoration:underline" : "", r.color ? `color:#${r.color}` : "",
                           r.sup ? "vertical-align:super" : ""].filter (Boolean).join (";");
  const html = (rs: Run[]) => rs.map ((r) => r.text === "\n" ? "<br>" : `<span style="${css (r)}"${r.rtl ? ' dir="rtl"' : ""}>${xml (r.text)}</span>`).join ("");
  const pcss = (o: Para | { rtl?: boolean; indent?: number; hang?: number; before?: number; align?: string }) =>
    `margin:${(o.before ?? 0).toFixed (1)}pt 0 4pt ${((o.indent ?? 0) + (o.hang ?? 0)).toFixed (1)}pt;text-indent:${(-(o.hang ?? 0)).toFixed (1)}pt${o.align ? `;text-align:${o.align}` : ""}`;
  const width = page.w - 2 * page.side;
  let n = 0;
  const body = bs.map ((b) => {
    if (b.k === "p") { const t = b.level ? `h${b.level}` : "p"; return `<${t} style="${pcss (b)}"${b.rtl ? ' dir="rtl"' : ""}>${html (b.runs)}</${t}>`; }
    if (b.k === "words") return b.rows.map ((row) => `<table${b.rtl ? ' dir="rtl"' : ""} cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-${b.rtl ? "right" : "left"}:${b.indent.toFixed (1)}pt"><tr>`
      + row.map ((c) => `<td valign="top" style="width:${c.w.toFixed (1)}pt;padding:0">${c.lines.map ((l) => `<p style="margin:0;text-align:center"${b.rtl ? ' dir="rtl"' : ""}>${html (l)}</p>`).join ("")}</td>`).join ("") + "</tr></table>").join ("");
    const loc = `image${++n}.${b.type === "png" ? "png" : "jpg"}`;
    parts.push ({ loc, type: `image/${b.type}`, data: b.bytes });
    const { w, h } = fit (b, width);
    return `<p><img src="${loc}" width="${Math.round (w / PT)}" height="${Math.round (h / PT)}" alt="${xml (b.alt)}"></p>`;
  }).join ("\n");
  const page1 = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">`
    + `<head><meta charset="utf-8"><title>${xml (title)}</title><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->`
    + `<style>@page { size: ${page.w}pt ${page.h}pt; margin: ${page.top.toFixed (1)}pt ${page.side.toFixed (1)}pt; } body { font-family: Calibri, sans-serif; font-size: 10.5pt; } `
    + "h1, h2, h3 { margin-bottom: 4pt; } td { vertical-align: top; }</style></head>"
    + `<body>${body}</body></html>`;
  const boundary = `----=_COTEXT_${Date.now ().toString (36)}`;
  const wrap = (s: string) => s.replace (/.{1,76}/g, "$&\r\n");
  return ["MIME-Version: 1.0", `Content-Type: multipart/related; boundary="${boundary}"; type="text/html"`, "", `--${boundary}`,
          "Content-Type: text/html; charset=utf-8", "Content-Transfer-Encoding: base64", "Content-Location: file:///C:/printout.htm", "",
          wrap (b64 (new TextEncoder ().encode (page1))),
          ...parts.flatMap ((p) => [`--${boundary}`, `Content-Type: ${p.type}`, "Content-Transfer-Encoding: base64", `Content-Location: file:///C:/${p.loc}`, "", wrap (b64 (p.data))]),
          `--${boundary}--`, ""].join ("\r\n");
}

//==== WEB PAGE (.html, .htm) ====
// The printout as it printed, each element's look written into its style attribute: the inherited properties where
// they differ from the parent's, the others where they aren't the property's usual value; hidden elements left out,
// pictures as data: URLs, buttons as plain text. One page, the paper's width, centered.
const INHERITED = ["color", "font-family", "font-size", "font-weight", "font-style", "line-height", "text-align", "direction", "letter-spacing", "text-transform",
                   "white-space", "font-variant-numeric", "unicode-bidi"];
const OWN = ["display", "position", "top", "left", "flex-direction", "flex-wrap", "justify-content", "align-items", "align-self", "row-gap", "column-gap", "flex-grow", "flex-shrink",
             "grid-template-columns", "grid-column-start", "grid-column-end", "grid-row-start", "grid-row-end", "justify-items", "justify-self", "align-content",
             "min-width", "max-width", "margin-top", "margin-right", "margin-bottom", "margin-left", "padding-top", "padding-right", "padding-bottom", "padding-left",
             "border-top", "border-right", "border-bottom", "border-left", "border-radius", "background-color", "vertical-align", "text-indent", "break-inside", "break-after", "opacity"];
const USUAL = new Set (["0px", "none", "normal", "auto", "static", "rgba(0, 0, 0, 0)", "visible", "baseline", "stretch", "row", "nowrap", "flex-start", "auto auto"]);
const USUAL_OF: Record<string, string> = { "flex-grow": "0", "flex-shrink": "1", opacity: "1" };     // (A number's usual value: its own property's)
function web (doc: HTMLElement, title: string, page: Page, pics: Map<Element, Omit<Pic, "k" | "alt">>): string {
  const copy = doc.cloneNode (true) as HTMLElement;
  const visit = (a: Element, b: Element, parent: CSSStyleDeclaration | null) => {
    const cs = getComputedStyle (a);
    const css: string[] = [];
    for (const p of INHERITED) { const v = cs.getPropertyValue (p); if (! parent || parent.getPropertyValue (p) !== v) css.push (`${p}:${v}`); }
    for (const p of OWN) { const v = cs.getPropertyValue (p); if (! USUAL.has (v) && USUAL_OF[p] !== v && ! /^0px (none|solid) /.test (v)) css.push (`${p}:${v}`); }
    if (cs.position === "absolute" || /^(IMG|CANVAS)$/.test (a.tagName) || a.classList.contains ("csBar")) css.push (`width:${cs.width}`, `height:${cs.height}`);
    if (a.tagName === "IMG") css.push ("max-width:100%", "height:auto");
    b.setAttribute ("style", css.join (";"));
    for (const x of [...b.attributes]) if (/^(class|id|data-|aria-|role|tabindex|srcset)/.test (x.name)) b.removeAttribute (x.name);
    if (a.tagName === "IMG") { const p = pics.get (a); b.removeAttribute ("loading"); if (p) (b as HTMLImageElement).src = p.url; else b.remove (); }     // (Loaded at once: printed or read offline whole)
    const ka = [...a.children], kb = [...b.children];
    ka.forEach ((x, i) => {
      if (getComputedStyle (x).display === "none" || /^(CANVAS|SCRIPT|STYLE|INPUT|SELECT)$/.test (x.tagName)) { kb[i].remove (); return; }
      visit (x, kb[i], cs);
    });
    if (a.tagName === "BUTTON") { const s = document.createElement ("span"); s.setAttribute ("style", b.getAttribute ("style") ?? ""); s.append (...b.childNodes); b.replaceWith (s); }
  };
  visit (doc, copy, null);
  const w = page.w - 2 * page.side;
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${xml (title)}</title>`
    + `<style>body { margin: 0; background: #fff; } main { max-width: ${w}pt; margin: 0 auto; padding: 16mm 14mm; box-sizing: content-box; } `
    + "@media (max-width: 600px) { main { padding: 16px; } } @media print { main { padding: 0; } }</style></head>\n"
    + `<body><main>${copy.outerHTML}</main></body></html>\n`;
}

/** The printout (doc: the preview's copy laid out in the print rules, at the page's width) made into a file of a kind. */
export async function printFile (kind: FileKind, doc: HTMLElement, title: string, page: Page): Promise<Blob> {
  const pics = await pictures (doc);
  if (kind === "html" || kind === "htm") return new Blob ([web (doc, title, page, pics)], { type: MIME[kind] });
  const bs = blocks (doc, pics);
  const data = kind === "docx" ? docx (bs, title, page) : kind === "odt" ? odt (bs, title, page) : kind === "rtf" ? rtf (bs, page) : kind === "doc" ? wordHtml (bs, title, page) : txt (bs);
  return new Blob ([data], { type: MIME[kind] });
}
