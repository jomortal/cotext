"""ISBE (archaeology, sites and inscriptions): the International Standard Bible Encyclopedia's (1915, James Orr, general
editor; public domain) articles on archaeology, on the Bible's places and on inscriptions, linked to the text both ways
as the Tyndale dictionary is (src/dictionary.ts reads its file as a dictionary): by passage, "ISBE (archaeology and
sites)" in the notes' picker (its DICTIONARY group) - the articles citing the verses shown, then those the verses'
words lead to; by word, "ISBE" in a word's panel when the word names an article's place or person; and searchable.

Source: CrossWire's SWORD module ISBE (version 2.2, 2009; DistributionLicense=Public Domain; its text typed, not raw
OCR, marked up as TEI), www.crosswire.org/ftpmirror/pub/sword/packages/rawzip/ISBE.zip, pinned by its SHA-256, fetched
once into pipeline/downloads/notes/isbe/. A zLD module (read): .idx (offset, size into .dat, 4 bytes each), .dat (the
key, a newline, then the block and entry numbers into .zdx), .zdx (each block's offset and size in .zdt), .zdt (zlib
blocks: a count, (offset, size) per entry, then the entries). An entry: <entryFree n="LACHISH"> of <p> paragraphs,
<hi rend="bold|italic|underline">, <ref osisRef="Bible:2Kgs.3.4"> scripture references (a range
"Bible:Exod.6.16-Exod.6.20") and <ref target="ISBE:ALTAR"> cross-references.

Kept (of its 9,380 articles):
  - Sites: a headword (each name of "SILOAM; SILOAH; SHELAH; SHILOAH", a "(1)" dropped) that is a place in STEPBible's
    TIPNR (the main database's places: its capitalized names), the article's opening (600 characters) speaking of a
    place (PLACE: town, city, mountain, river, ruins... - not ADAM the man for Adam the town).
  - Archaeology and inscriptions: a headword naming one (TOPIC: ARCHAEOLOGY, INSCRIPTION, MOABITE STONE, TELL
    EL-AMARNA, CYLINDER, OBELISK, PAPYRI, OSTRACA, STELE, EXCAVATION - not a plain STONE, SEAL or TABLET: Corner-stone,
    Millstone) or an article whose text speaks of excavations or inscriptions (excavat-, inscription, inscribed) at
    least THRESHOLD times.
Each as light HTML (the dictionary's): <p>, <b>, <i> (italic and underline), a scripture reference <a
  data-ref="book.chapter.verse"> (its first verse), a cross-reference to another kept article <a data-art="<id>"> (one
  not kept: its text). Its title: the headword in title case ("Moabite Stone").
Words (by word): each headword name looked up in TIPNR (finds.py's namer: a site's places only; any other article's
  persons and places) - the keys with a word in the verses the article cites, else the commonest.
Verses (by passage): its scripture references as verse spans (tyndale_dict.verse_spans).

Output: public/data/notes/isbe.db - tyndale_dict's tables (articles, lemmas, refs; id the headword with "_" for spaces)
and its note_sources row (id 'isbe', kind 'dictionary', testaments 'OT NT').

Run on its own: python3 pipeline/isbe.py (the main database already built; then source_books.py and split_db.py);
build_db.py runs build() after finds.
"""
import hashlib
import html
import pathlib
import re
import sqlite3
import struct
import sys
import urllib.request
import zipfile
import zlib

HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE))
import finds  # noqa: E402
import tyndale_dict  # noqa: E402

DL = HERE / "downloads" / "notes" / "isbe"
OUT = HERE.parent / "public" / "data" / "notes" / "isbe.db"
ZIP = ("ISBE.zip", "https://www.crosswire.org/ftpmirror/pub/sword/packages/rawzip/ISBE.zip",
       "4de747545d9c349ab724bc1708b01df5481e3b93e5e51077f859dd8a32023a32")
MODULE = "modules/lexdict/zld/isbe/isbe"
SOURCE = ("isbe", "dictionary", "ISBE (archaeology and sites)", "OT NT",
          "International Standard Bible Encyclopedia (1915), James Orr, general editor - public domain; text from "
          "CrossWire's SWORD module ISBE 2.2. Its articles on archaeology, places and inscriptions. Names matched "
          "through STEPBible's TIPNR (CC BY 4.0).")
PLACE = re.compile(r"\b(town|city|cities|village|place|mountain|mount|hill|river|brook|valley|plain|region|district|"
                   r"site|ruins?|land|country|wilderness|desert|island|sea|lake|pool|spring|well)\b", re.I)
THRESHOLD = 3     # Mentions of excavations or inscriptions that make an article about archaeology
TOPIC = re.compile(r"ARCHAEOLOG|INSCRIPTION|MOABITE STONE|AMARNA|CYLINDER|OBELISK|PAPYRI|OSTRACA|STELE|EXCAVATION")
OSIS = ("Gen Exod Lev Num Deut Josh Judg Ruth 1Sam 2Sam 1Kgs 2Kgs 1Chr 2Chr Ezra Neh Esth Job Ps Prov Eccl Song Isa Jer "
        "Lam Ezek Dan Hos Joel Amos Obad Jonah Mic Nah Hab Zeph Hag Zech Mal Matt Mark Luke John Acts Rom 1Cor 2Cor Gal "
        "Eph Phil Col 1Thess 2Thess 1Tim 2Tim Titus Phlm Heb Jas 1Pet 2Pet 1John 2John 3John Jude Rev").split()
BOOK = {c: i + 1 for i, c in enumerate(OSIS)}


def download():
    """The module's zip, once, checked against its pinned SHA-256."""
    DL.mkdir(parents=True, exist_ok=True)
    path = DL / ZIP[0]
    if not path.exists():
        print("downloading", ZIP[0])
        req = urllib.request.Request(ZIP[1], headers={"User-Agent": "COTEXT-pipeline/0.1 (Bible study app build)"})
        with urllib.request.urlopen(req, timeout=600) as r:
            path.write_bytes(r.read())
    if hashlib.sha256(path.read_bytes()).hexdigest() != ZIP[2]:
        raise SystemExit(f"{path}: not the pinned file (SHA-256 differs)")
    return path


def entries():
    """The module's entries: [(key, TEI text)] in its (alphabetical) order."""
    z = zipfile.ZipFile(download())
    idx, dat, zdx, zdt = (z.read(f"{MODULE}.{ext}") for ext in ("idx", "dat", "zdx", "zdt"))
    blocks = {}

    def block(i):
        if i not in blocks:
            off, size = struct.unpack_from("<II", zdx, i * 8)
            raw = zlib.decompress(zdt[off:off + size])
            n = struct.unpack_from("<I", raw, 0)[0]
            blocks[i] = [raw[o:o + s] for o, s in (struct.unpack_from("<II", raw, 4 + 8 * k) for k in range(n))]
        return blocks[i]
    out = []
    for k in range(len(idx) // 8):
        off, size = struct.unpack_from("<II", idx, k * 8)
        key, _, rest = dat[off:off + size].partition(b"\n")
        if len(rest) < 8:
            continue
        b, e = struct.unpack_from("<II", rest, 0)
        out.append((key.rstrip(b"\r").decode("utf-8"), block(b)[e].rstrip(b"\0").decode("utf-8")))
    return out


def names_of(key):
    """A headword's names: "SILOAM; SILOAH; SHELAH" -> each; "DAN (1)", "BETHEL, 2" -> DAN, BETHEL."""
    return [n for n in (re.sub(r"\s*(\(\d+\)|,\s*\d+)$", "", p).strip() for p in key.split(";")) if n]


def title_case(key):
    """LACHISH -> Lachish, MOABITE STONE -> Moabite Stone, AARON'S ROD -> Aaron's Rod (minor words lower)."""
    small = {"of", "and", "the", "in", "to", "a", "an", "on", "for", "or"}
    words = key.lower().split(" ")
    return " ".join(w if (i and w in small) else w[:1].upper() + w[1:] for i, w in enumerate(words))


def osis_spans(ref):
    """"Bible:2Kgs.3.4" or "Bible:Exod.6.16-Exod.6.20" as verse spans [(book, start, end)] (tyndale_dict's form)."""
    m = re.match(r"Bible:([1-3]?[A-Za-z]+)\.(\d+)(?:\.(\d+))?(?:-(?:([1-3]?[A-Za-z]+)\.)?(\d+)(?:\.(\d+))?)?$", ref)
    if not m or m.group(1) not in BOOK:
        return []
    book, ch, v = BOOK[m.group(1)], int(m.group(2)), m.group(3)
    if m.group(4) and m.group(4) != m.group(1):
        return [(book, ch * 1000 + int(v or 1), ch * 1000 + int(v or 1))]     # (Into another book: its first verse)
    if v is None:
        return [(book, ch * 1000 + 1, ch * 1000 + tyndale_dict.LAST.get((book, ch), 1))]
    start = ch * 1000 + int(v)
    if not m.group(5):
        return [(book, start, start)]
    end = int(m.group(5)) * 1000 + int(m.group(6)) if m.group(6) else ch * 1000 + int(m.group(5))
    return [(book, start, max(start, end))]


def to_html(tei, ids):
    """An entry's TEI as the dictionary's light HTML (the module's docstring); its spans returned with it."""
    spans = []

    def ref(m):
        attr, val, text = m.group(1), m.group(2), m.group(3)
        if attr == "osisRef":
            sp = osis_spans(val)
            spans.extend(sp)
            if sp:
                b, s, _ = sp[0]
                return f'<a data-ref="{b}.{s // 1000}.{s % 1000}">{text}</a>'
            return text
        art = val.split(":", 1)[-1].replace(" ", "_")
        return f'<a data-art="{html.escape(art)}">{text}</a>' if art in ids else text
    t = re.sub(r"</?entryFree[^>]*>", "", tei)
    t = re.sub(r'<ref (osisRef|target)="([^"]*)">(.*?)</ref>', ref, t, flags=re.S)
    t = re.sub(r'<hi rend="bold">(.*?)</hi>', r"<b>\1</b>", t, flags=re.S)
    t = re.sub(r'<hi rend="(?:italic|underline)">(.*?)</hi>', r"<i>\1</i>", t, flags=re.S)
    t = re.sub(r"<lb\s*/>", "<br>", t)
    t = re.sub(r"<(?!/?(?:p|b|i|br|a)\b)[^>]+>", "", t)     # (Anything else: its tags dropped)
    return t.strip(), spans


def build(main_db):
    """Builds isbe.db and its note_sources row (replaced). Returns (articles, verses linked, lemmas)."""
    finds.last_verses(main_db)
    places = finds.namer(main_db, kinds=("place",))
    people = finds.namer(main_db)
    raw = entries()
    keep = {}
    for key, tei in raw:
        text = re.sub(r"<[^>]+>", "", tei)
        site = any(places(n, set()) for n in names_of(key)) and PLACE.search(text[:600])
        topic = TOPIC.search(key) or len(re.findall(r"excavat|inscription|inscribed", text, re.I)) >= THRESHOLD
        if site or topic:
            keep[key.replace(" ", "_")] = (key, tei, site)
    rows, lemmas = [], {}
    for aid, (key, tei, site) in keep.items():
        body, spans = to_html(tei, keep)
        verses = tyndale_dict.verses_in(spans)
        for n in names_of(key):
            for k in (places if site else people)(n, verses):
                lemmas.setdefault(k, []).append(aid)
        line = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", body))).strip()[:200]
        rows.append((aid, title_case(key), body, line, len(verses), spans))
    data = finds.write(OUT, rows, lemmas, SOURCE)
    finds.register(main_db, SOURCE, "data/notes/isbe.db", data)
    linked = len(tyndale_dict.verses_in([sp for r in rows for sp in r[5]]))
    sites = sum(1 for *_, s in keep.values() if s)
    print(f"isbe: {len(rows)} articles of {len(raw)} ({sites} sites, {len(rows) - sites} on archaeology and inscriptions), "
          f"{linked} verses linked, {len(lemmas)} lemmas, {len(data) / 1e6:.1f} MB")
    return len(rows), linked, len(lemmas)


if __name__ == "__main__":
    con = sqlite3.connect(HERE.parent / "public" / "data" / "cotext.db")
    with con:
        build(con)
    con.close()
