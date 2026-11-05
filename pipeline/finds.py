"""Archaeology finds: Wikipedia's list of inscribed artifacts significant to biblical archaeology ("List of
inscriptions in biblical archaeology" - once "List of artifacts in biblical archaeology"), each find with its date,
where it was found, where it is now, its writing, what it bears on, the lead of its own Wikipedia article and one free
photo - linked to the text both ways as the Tyndale dictionary is (src/dictionary.ts, the same file layout): by
passage, "Archaeology finds" in the notes' picker (its DICTIONARY group) - the finds bearing on the verses shown; by
word, "Finds" in a word's panel when the word names a find's person or place; and searchable in the search pane.

Sources (CC BY-SA 4.0, Wikipedia; fetched through its API, pinned by revision in finds_pins.json - written on the
first run, kept after: a rebuild reads the same revisions; delete an entry to fetch the article's current one):
  - The list: its four tables under "Selected artifacts significant to biblical chronology" (Egyptian; Cuneiform;
    Canaanite, Aramaic and Hebrew; Greek and Latin) - a row a find: Name, Image, Current location, Discovered (year,
    place), Date, Writing, Significance, Refs (COS / ANET numbers: left out). The sections' bullet lists ("Other
    significant ...") and the disputed ones are left out: they give none of the table's facts.
  - Each find's own article (its name's link, redirects followed; fetched 50 at a time - the API throttles single
    calls): its wikitext - its lead (before the first heading; as plain text, templates, tables and references dropped),
    its infobox (the facts a bulleted find lacks: facts_from) and its scripture references.
  - Its photo: the list's own image for the row, from Wikimedia Commons when its licence is free (CC0, public domain,
    CC BY, CC BY-SA - not NC or ND; a file only on Wikipedia itself is non-free: none), fetched as Commons' 1280 px
    thumbnail (pinned by its SHA-256) and made by macOS's sips into two JPEGs (pictures()): the full picture, 1200 px
    on its long side at quality 60 (about 100-250 kB), its own file public/data/images/finds/<id>.jpg - online only:
    served, never in the downloaded .db nor kept by the service worker (sw.js) -, and a thumbnail 160 px on its long
    side at quality 55 (about 5-10 kB) inside the .db, so the lists show it offline; credited under it with its author
    and licence. Without sips both are the thumbnail as it comes.
COTEXT's additions (NEW, MORE): finds the list lacks (the annals of Tiglath-pileser III, the Behistun inscription), as
  its bulleted rows are; and for a find attesting the Bible's events or people, every passage on them (Wikipedia seldom
  cites verses: the Mesha Stele gets 2 Kings 3, 1 Chronicles 5:8-10, Isaiah 15-16 and Jeremiah 48), and its own text in
  T. G. Pinches' translation where his book has it (the Taylor Prism, the Black Obelisk, the Kurkh Monolith, Sargon II,
  Tiglath-pileser III, the Cyrus Cylinder, Nabonidus: ane.py's EXCERPTS and pins, through ane.quoted()), under "Its
  text".
Scripture references: "2 Kings 20:20", "2 Chronicles 32:2-4", "Exodus 1:11; 12:37" (a book's full English name, I / II
  or 1 / 2 / First / Second before it, then chapter:verse, a range or a comma's verses; "ch. v" after a ";" in the
  same book; "20, 20:" before a quotation as 20:20), in the row's significance and the article's text, its
  references' too (a citation's title can quote a verse; {{Bible verse}} templates read as text first).
  A chapter alone ("Daniel 5") isn't taken: too often not a citation. Each becomes verse spans as tyndale_dict's
  (verse_spans: the same book codes and LAST), the find's verse index (refs) and links in its text (data-ref).
Words (by word): the names the find's row links or names - its name's capitalized words, the links in its name,
  discovery place and significance (their shown text and their target, a "(...)" dropped) - looked up in STEPBible's
  TIPNR (tyndale_dict.tipnr(): every person, place and other name with its Strong's keys). A name with several keys
  (Ahab the king, Ahab the prophet; Hebrew and Greek; persons and places only, not TIPNR's other names), per language: the keys the find's own verses have a word of;
  none, the one with the most words in the text. Each key's words then offer the find.

Output: public/data/notes/finds.db - tyndale_dict's tables, so dictionary.ts reads either:
  articles  id (the find's article title, as in its URL: Siloam_inscription), title (the list's name), html (the facts, what it bears
            on, the lead, its Bible references and the Wikipedia credit; light HTML as the dictionary's), line (what it
            bears on, plain, about 200 characters), verses (how many verses it cites)
  lemmas    strong -> ids (finds naming it, space-separated, in title order), subject ('': none here)
  refs      book, start, end (chapter * 1000 + verse), id
  photos    id -> src (the thumbnail: a data: URI, image/jpeg), credit (author, licence, "Wikimedia Commons"), full
            (the full picture's path under public/ - data/images/finds/<file>.jpg -, fetched only online)
and its row in the main database's note_sources (id 'finds', kind 'dictionary', testaments 'OT NT').

Run on its own: python3 pipeline/finds.py (the main database already built: its words read, its note_sources row
written; then source_books.py and split_db.py); build_db.py runs build() after tyndale_dict.
"""
import base64
import hashlib
import html
import json
import pathlib
import re
import shutil
import sqlite3
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE))
import tyndale_dict  # noqa: E402

DL = HERE / "downloads" / "notes" / "finds"
PINS = HERE / "finds_pins.json"
OUT = HERE.parent / "public" / "data" / "notes" / "finds.db"
IMAGES = HERE.parent / "public" / "data" / "images"     # (<source id>/<file>.jpg: the full pictures, online only)
LIST = "List of inscriptions in biblical archaeology"
API = "https://en.wikipedia.org/w/api.php"
COMMONS = "https://commons.wikimedia.org/w/api.php"
UA = {"User-Agent": "COTEXT-pipeline/0.1 (https://github.com/jomortal/cotext; Bible study app build, one-off fetch)"}
SOURCE = ("finds", "dictionary", "Archaeology finds", "OT NT",
          "From Wikipedia's \"List of inscriptions in biblical archaeology\" and each find's own article (CC BY-SA 4.0; "
          "the revisions pinned in the build), with finds and passages added by COTEXT. Photos from Wikimedia Commons, "
          "each credited under it. Inscriptions' texts tr. T. G. Pinches (1908; public domain; Project Gutenberg). "
          "Names matched through STEPBible's TIPNR (CC BY 4.0).")

# ---- COTEXT's additions ----
# Finds the list lacks, as its bulleted rows are (facts from their articles' infoboxes): what they bear on, its links
# (names TIPNR may know: the words that offer the find).
NEW = [{"name": "Annals of Tiglath-pileser III", "link": "Tiglath-Pileser III", "image": "", "now": "British Museum (slabs from his palace at Nimrud)", "found": "Nimrud, 1840s",
        "date": "745-727 BC (his reign)", "writing": "Akkadian cuneiform",
        "bears": "Tiglath-pileser III (Pul) of Assyria, 745-727 BC: Menahem of Samaria's tribute, Pekah overthrown and "
                 "Hoshea set on Israel's throne, Ahaz's tribute, the deportations from Galilee and Transjordan.",
        "links": [("Menahem", "Menahem"), ("Pekah", "Pekah"), ("Hoshea", "Hoshea"), ("Ahaz", "Ahaz"),
                  ("Tiglath-pileser", "Tiglath-Pileser III")]},
       {"name": "Behistun Inscription", "link": "Behistun inscription", "image": "", "now": "", "found": "", "date": "",
        "writing": "", "bears": "Darius I of Persia, 522-486 BC, tells how he won the throne and put down the revolts - "
                               "the Darius under whom the temple was rebuilt (Ezra 4-6, Haggai, Zechariah).",
        "links": [("Darius", "Darius I")]}]
# A find's passages beyond those its article cites (Wikipedia seldom gives verses) - every passage on the events or
# people it attests -, and the excerpts of its text in a public-domain translation (ane.py's EXCERPTS: Pinches, 1908).
MORE = {
    "Mesha_Stele": ("2 Kings 3:4-27; 1 Chronicles 5:8-10; Numbers 21:29; 1 Kings 11:7; Isaiah 15:1-16:14; Jeremiah 48:1-47", []),
    "Bubastite_Portal": ("1 Kings 14:25-26; 2 Chronicles 12:2-9", []),
    "Sennacherib's_Annals": ("2 Kings 18:13-19:37; Isaiah 36:1-37:38; 2 Chronicles 32:1-23", ["sennach"]),
    "Black_Obelisk_of_Shalmaneser_III": ("2 Kings 9:1-10:36", ["jehu"]),
    "Kurkh_Monoliths": ("1 Kings 16:29-30; 20:1-34; 22:1-4", ["qarqar"]),
    "Tiglath-Pileser_III": ("2 Kings 15:19-20, 29-30; 16:7-10; 1 Chronicles 5:6, 26; 2 Chronicles 28:20-21", ["tpMenahem", "tpPekah"]),
    "Nimrud_Tablet_K.3751": ("2 Kings 16:7-10; 2 Chronicles 28:16-21", []),
    "Sargon_II's_Prisms": ("2 Kings 17:3-6, 24; 18:9-11; Isaiah 20:1", ["sargon"]),
    "Nebuchadnezzar_Chronicle": ("2 Kings 24:1-17; 2 Chronicles 36:5-10; Jeremiah 24:1; 46:2", []),
    "Babylonian_Chronicles": ("2 Kings 23:29; 24:10-17; Jeremiah 46:2; Nahum 2:1-3:19; Zephaniah 2:13-15", []),     # (The fall of Nineveh, 612 BC, among them)
    "Jehoiachin's_Rations_Tablets": ("2 Kings 25:27-30; Jeremiah 52:31-34", []),
    "Lachish_letters": ("Jeremiah 34:7; 38:4", []),
    "Lachish_reliefs": ("2 Kings 18:14, 17; 19:8; 2 Chronicles 32:9; Isaiah 36:2; 37:8; Micah 1:13", []),
    "Elephantine_papyri_and_ostraca": ("Ezra 6:3-12; Nehemiah 2:10, 19; 4:1-8; 6:1-14; 12:22; 13:28", []),
    "Deir_Alla_inscription": ("Numbers 22:1-24:25; Joshua 13:22; Micah 6:5; 2 Peter 2:15-16", []),
    "Nabonidus_Chronicle": ("Daniel 5:1-31; Isaiah 45:1-2", ["nabChron"]),
    "Cylinders_of_Nabonidus": ("Daniel 5:1-31; 7:1; 8:1", ["nabPrayer"]),
    "Cyrus_Cylinder": ("Ezra 1:1-4; 6:3-5; 2 Chronicles 36:22-23; Isaiah 44:28-45:4; Daniel 5:30-31", ["cyName", "cyBattle", "cyReturn"]),
    "Merneptah_Stele": ("Joshua 10:33; 16:10; Judges 1:18-36", []),
    "Tel_Dan_stele": ("2 Kings 8:28-29; 9:14-29; 2 Chronicles 22:5-9", []),
    "Melqart_stele": ("1 Kings 15:18-20; 20:1", []),
    "Stele_of_Zakkur": ("2 Kings 13:3, 24-25", []),
    "Tell_al-Rimah_stela": ("2 Kings 13:10-13", []),
    "Behistun_inscription": ("Ezra 4:5, 24; 5:1-6:15; Haggai 1:1, 15; 2:10; Zechariah 1:1, 7; 7:1", []),
    "Victory_stele_of_Esarhaddon": ("2 Kings 19:37; Isaiah 37:38; Ezra 4:2", []),
    "Siloam_inscription": ("2 Kings 20:20; 2 Chronicles 32:2-4, 30", []),
    "Ketef_Hinnom_scrolls": ("Numbers 6:24-26", []),
    "Yavne-Yam_ostracon": ("Exodus 22:26-27; Deuteronomy 24:12-13", []),
    "Nebo-Sarsekim_Tablet": ("Jeremiah 39:3, 13", []),
    "Tell_es-Safi_inscription": ("1 Samuel 17:4", []),
    "Heliodorus_stele": ("Daniel 11:20", []),
    "Pilate_stone": ("Luke 3:1; Matthew 27:2, 11-26; Mark 15:1-15; Luke 23:1-25; John 18:28-19:16; Acts 4:27; 1 Timothy 6:13", []),
    "Delphi_Inscription": ("Acts 18:12-17", []),
    "Temple_Warning_inscription": ("Acts 21:26-30; Ephesians 2:14", []),
    "Arch_of_Titus": ("Matthew 24:1-2; Luke 19:41-44; 21:20-24", []),
    "Judaea_Capta_coinage": ("Luke 21:20-24", []),
}


def fetched(req):
    """A request's bytes - waiting and trying again (up to 6 times) when Wikimedia says too many requests (429)."""
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                data = r.read()
            time.sleep(1)     # (Politely: one at a time, a pause after each)
            return data
        except urllib.error.HTTPError as e:
            if e.code != 429 or attempt == 5:
                raise
            time.sleep(int(e.headers.get("Retry-After") or 0) or 10 * (attempt + 1))


def get(url, params):
    """A Wikimedia API call's JSON."""
    return json.loads(fetched(urllib.request.Request(
        url + "?" + urllib.parse.urlencode(params | {"format": "json", "formatversion": 2}), headers=UA)))


def cached(name, fetch):
    """A download kept in DL under name (fetch() makes it the first time)."""
    path = DL / name
    if not path.exists():
        path.write_text(json.dumps(fetch()), encoding="utf-8")
    return json.loads(path.read_text(encoding="utf-8"))


def safe(name):
    return hashlib.sha1(name.encode()).hexdigest()[:16]


# ---- Wikitext as text ----

BIBLE_TEMPLATE = re.compile(r"\{\{\s*[Bb]ible ?(?:verse|ref2?)(?:-nb)?\s*\|([^{}]*)\}\}")


def bible_template(m):
    """{{bibleverse|2 Kings|16:3|KJV}}, {{bibleverse-nb|Jeremiah|52:31–34|KJV}}, {{Bible verse|2|Kings|20:20|NIV}},
    {{bibleverse||Exodus|1:11}}, {{Bibleref2|2 Kings|20:20}} as "2 Kings 20:20"."""
    f = [p.strip() for p in m.group(1).split("|") if "=" not in p]
    if len(f) >= 3 and (f[0] == "" or f[0].isdigit()) and re.match(r"\d", f[2] or ""):
        return f"{f[0]} {f[1]} {f[2]}".strip()
    return " ".join(f[:2])


def plain(wt, links=None, refs=False):
    """Wikitext as plain text: references, comments and templates dropped ({{sort|key|shown}} -> shown, a Bible verse
    template -> its reference), [[target|text]] -> text, '' / ''' marks dropped. links: (text, target) of each link.
    refs: the references' text kept (their tags dropped, a citation as its title: a title can quote a verse)."""
    wt = re.sub(r"<!--.*?-->", "", wt, flags=re.S)
    wt = re.sub(r"<ref[^>/]*/>", "", wt)
    if refs:
        wt = re.sub(r"\{\{\s*[Cc]it(?:e|ation)[^{}]*?\|\s*title\s*=\s*([^|{}]*)[^{}]*\}\}", r" \1 ", wt)
        wt = re.sub(r"</?ref[^>]*>", " ", wt)
    else:
        wt = re.sub(r"<ref[^>]*>.*?</ref>", "", wt, flags=re.S)
    wt = BIBLE_TEMPLATE.sub(bible_template, wt)
    wt = re.sub(r"\{\{\s*sort\s*\|[^|{}]*\|([^{}]*)\}\}", r"\1", wt)
    for _ in range(4):
        wt = re.sub(r"\{\{[^{}]*\}\}", "", wt)

    def link(m):
        target, _, text = m.group(1).partition("|")
        if target.lower().startswith(("file:", "image:", "category:")):
            return ""
        text = (text or target) + (m.group(2) or "")
        if links is not None:
            links.append((text, target))
        return text
    wt = re.sub(r"\[\[([^\[\]]*)\]\](\w*)", link, wt)
    wt = re.sub(r"\[https?://\S+ ([^\]]*)\]", r"\1", wt)
    wt = re.sub(r"'{2,}", "", wt)
    wt = re.sub(r"<[^>]+>", "", wt)
    return html.unescape(re.sub(r"[ \t]+", " ", wt)).strip()


# ---- The list ----

def rows(wt):
    """The four tables' rows: [{name, link, image, now, found, date, writing, bears, links}] (links: the name's,
    discovery place's and significance's (text, target))."""
    body = re.split(r"\n==[^=]", wt.split("==Selected artifacts significant to biblical chronology==")[1])[0]
    out = []
    for table in re.findall(r"\{\|.*?\n\|\}", body, flags=re.S):
        for row in table.split("\n|-")[1:]:
            row = row.strip()
            if not row.startswith("|") or row.startswith("|}"):
                continue
            cells = [c.strip() for c in re.split(r"\n\|(?!\})", "\n" + row)[1:]]
            cells = [re.sub(r"^\|\s*", "", c) for c in cells]     # (A stray "| |" opening a cell)
            if len(cells) < 7:
                continue
            m = re.search(r"\[\[([^\[\]|]*)(?:\|[^\[\]]*)?\]\]", cells[0])
            img = re.search(r"\[\[(?:File|Image):([^|\]]*)", cells[1])
            links = []
            name = plain(cells[0], links)
            found = plain(cells[3], links)
            bears = plain(cells[6], links)
            out.append({"name": name, "link": m.group(1).strip() if m else "", "image": img.group(1).strip() if img else "",
                        "now": plain(cells[2]), "found": found, "date": plain(cells[4]), "writing": plain(cells[5]),
                        "bears": bears, "links": links})
    for line in body.splitlines():     # (The bullets: "*[[Pilate Stone]] (c. 36 AD) – carved inscription ...")
        m = re.match(r"\*+\s*\[\[([^\[\]|]*)(?:\|([^\[\]]*))?\]\](\w*)(.*)$", line)
        if not m or m.group(1).lower().startswith(("list of", "file:")) or "myth" in m.group(1).lower():
            continue
        links = [(m.group(2) or m.group(1), m.group(1))]
        rest = m.group(4)
        date = re.match(r"\s*\(([^)]*\d[^)]*)\)", plain(rest))
        bears = plain(re.sub(r"^\s*(\([^)]*\))?\s*(<ref[^>]*/>|<ref.*?</ref>)*\s*[–:-]?\s*", "", rest), links)
        out.append({"name": plain(m.group(2) or m.group(1)) + m.group(3), "link": m.group(1).strip(), "image": "",
                    "now": "", "found": "", "date": date.group(1).strip() if date else "", "writing": "",
                    "bears": bears, "links": links})
    return out


def infobox(wt):
    """The first infobox's parameters ({{Infobox artifact | image = ... | discovered = ...}}): name -> value (wikitext)."""
    i = wt.lower().find("{{infobox")
    if i < 0:
        return {}
    depth, j = 0, i
    while j < len(wt):
        if wt.startswith("{{", j) or wt.startswith("[[", j):
            depth += 1
            j += 2
        elif wt.startswith("}}", j) or wt.startswith("]]", j):
            depth -= 1
            j += 2
            if depth == 0:
                break
        else:
            j += 1
    box, parts, depth, cur = wt[i + 2:j - 2], [], 0, ""
    for k, ch in enumerate(box):
        depth += {"{": 1, "[": 1, "}": -1, "]": -1}.get(ch, 0)
        if ch == "|" and depth == 0:
            parts.append(cur)
            cur = ""
        else:
            cur += ch
    parts.append(cur)
    return {a.strip().lower(): b.strip() for a, _, b in (p.partition("=") for p in parts[1:]) if b.strip()}


def facts_from(box, f):
    """A bullet's missing facts filled from its article's infobox: image, date (created / date / period), where found
    (discovered: date and place), where now (present_location / location), writing."""
    first = lambda *ks: next((box[k] for k in ks if k in box), "")
    if not f["image"]:
        img = re.sub(r"^\[\[(?:File|Image):([^|\]]*).*$", r"\1", first("image", "image_file"), flags=re.S | re.I)
        f["image"] = re.sub(r"^(?:File|Image):", "", img, flags=re.I).strip()
    f["date"] = f["date"] or plain(first("created", "date", "period"))
    f["found"] = f["found"] or ", ".join(x for x in (plain(first("discovered", "discovered_date")),
                                                    plain(first("discovered_place", "place"))) if x)
    f["now"] = f["now"] or plain(first("present_location", "location", "museum"))
    f["writing"] = f["writing"] or plain(first("writing", "language", "script"))


def lead(wt):
    """An article's lead (the wikitext before its first heading) as paragraphs of plain text: templates (the infobox,
    hatnotes), tables, files and references dropped."""
    top = re.split(r"\n==", wt)[0]
    while True:     # (Templates nested in templates: the innermost first, until none are left)
        t = re.sub(r"\{\{(?:(?!\{\{|\}\}).)*\}\}", "", top, flags=re.S)
        if t == top:
            break
        top = t
    top = re.sub(r"\{\|.*?\|\}", "", top, flags=re.S)
    paras = (re.sub(r"\s+", " ", plain(x)).strip() for x in re.split(r"\n\s*\n", top))
    return [p for p in (re.sub(r"\s*\(\s*[,;]?\s*\)", "", re.sub(r"\(\s*[,;]\s*", "(", q)) for q in paras) if len(p) > 1]     # (Brackets a template emptied: gone)


# ---- Scripture references in English ----

NAMES = ("Genesis Exodus Leviticus Numbers Deuteronomy Joshua Judges Ruth 1_Samuel 2_Samuel 1_Kings 2_Kings 1_Chronicles "
         "2_Chronicles Ezra Nehemiah Esther Job Psalms Proverbs Ecclesiastes Song_of_Songs Isaiah Jeremiah Lamentations "
         "Ezekiel Daniel Hosea Joel Amos Obadiah Jonah Micah Nahum Habakkuk Zephaniah Haggai Zechariah Malachi Matthew "
         "Mark Luke John Acts Romans 1_Corinthians 2_Corinthians Galatians Ephesians Philippians Colossians "
         "1_Thessalonians 2_Thessalonians 1_Timothy 2_Timothy Titus Philemon Hebrews James 1_Peter 2_Peter 1_John 2_John "
         "3_John Jude Revelation").split()
BOOK_OF = {n.replace("_", " ").lower(): i + 1 for i, n in enumerate(NAMES)} | {"psalm": 19, "song of solomon": 22}
NUM = {"1": "1", "i": "1", "first": "1", "2": "2", "ii": "2", "second": "2", "3": "3", "iii": "3", "third": "3"}
ONE = "|".join(sorted({re.escape(n.split(" ", 1)[1]) for n in BOOK_OF if n[0].isdigit()}, key=len, reverse=True))
WHOLE = "|".join(sorted({re.escape(n) for n in BOOK_OF if not n[0].isdigit()}, key=len, reverse=True))
REF = re.compile(rf"\b(?:(1|2|3|I{{1,3}}|First|Second|Third)\s+({ONE})|({WHOLE}))\.?\s+(\d+)(?::|,\s*(?=\d+(?:[-–]\d+)?:))"
                 rf"(\d+[\d:,\-–\s;]*\d|\d+)", re.I)


def references(text):
    """Every reference in text as (book id, its OSIS-like form for tyndale_dict.verse_spans, as written)."""
    out = []
    for m in REF.finditer(text):
        if m.group(1):
            book = BOOK_OF.get(f"{NUM[m.group(1).lower()]} {m.group(2).lower()}")
        else:
            book = BOOK_OF.get(m.group(3).lower())
        if not book:
            continue
        code = tyndale_dict.BOOK_CODES[book - 1]
        ch, written = None, m.group(4) + ":" + m.group(5)
        for part in re.split(r"\s*;\s*", written.replace("–", "-")):
            pm = re.match(r"(?:(\d+):)?(\d+(?:-\d+(?::\d+)?)?(?:\s*,\s*\d+(?:-\d+)?)*)$", part.strip())
            if not pm or (pm.group(1) is None and ch is None):
                break
            ch = int(pm.group(1) or ch)
            vs = re.sub(r"\s", "", pm.group(2))
            r = re.match(r"(\d+)-(\d+):(\d+)(.*)$", vs)     # (Into another chapter: 25:1-26:3)
            osis = f"{code}.{ch}.{r.group(1)}-{r.group(2)}.{r.group(3)}" if r else f"{code}.{ch}.{vs}"
            shown = f"{m.group(0)[:m.start(4) - m.start(0)]}{ch}:{vs}"
            out.append((book, osis, re.sub(r"\s+", " ", shown).strip()))
            if r:
                ch = int(r.group(2))
    return out


# ---- Photos ----

FREE = re.compile(r"^(cc0|public domain|pd\b|cc[ -]by(-sa)?[ -]\d|cc[ -]by(-sa)?$|attribution)", re.I)
WIDTH = 1280     # (The Commons thumbnail fetched: a standard size, cut to FULL px by sips)
FULL, THUMB = 1200, 160     # (The full picture's and the thumbnail's long side, px)


def commons(names, dl=DL):
    """Commons' records of image files (names, without "File:"), 50 a call, each kept in dl as img-<hash>.json
    (only those not kept yet are fetched): its WIDTH px thumbnail's URL, licence and author. Also used by ane.py."""
    new = sorted({n for n in names if n and not (dl / ("img-" + safe(n) + ".json")).exists()})
    for i in range(0, len(new), 50):
        q = get(COMMONS, {"action": "query", "titles": "|".join("File:" + n for n in new[i:i + 50]),
                          "prop": "imageinfo", "iiprop": "url|extmetadata|sha1", "iiurlwidth": WIDTH})["query"]
        to = {r["from"]: r["to"] for r in q.get("normalized", [])}
        pages = {p["title"]: p for p in q["pages"]}
        for n in new[i:i + 50]:
            page = pages.get(to.get("File:" + n, "File:" + n), {"missing": True})
            (dl / ("img-" + safe(n) + ".json")).write_text(json.dumps({"query": {"pages": [page]}}))


def file_name(eid):
    """An entry's id as its picture's file name (letters, digits, _ . - kept; anything else _)."""
    return re.sub(r"[^A-Za-z0-9_.-]", "_", eid) + ".jpg"


def pictures(name, pins, src, eid, dl=DL, thumb_file=False):
    """An image file's (name, on Commons: commons() fetched its record) picture for an entry (eid) of a source (src):
    (its thumbnail as a data URI, its credit, its full picture's path under public/) - the full picture written to
    IMAGES/src/; or None (no image, not on Commons, or not freely licensed). Its download kept in dl and pinned in
    pins["images"][name] (SHA-256). thumb_file: the thumbnail written beside the full picture too (<eid>.t.jpg, online
    only) and its path given instead of a data URI. Also used by ane.py and tobd_pictures.py."""
    if not name:
        return None
    page = json.loads((dl / ("img-" + safe(name) + ".json")).read_text())["query"]["pages"][0]
    if page.get("missing") or not page.get("imageinfo"):
        return None
    ii = page["imageinfo"][0]
    meta = ii.get("extmetadata", {})
    lic = re.sub(r"<[^>]+>", "", meta.get("LicenseShortName", {}).get("value", "")).strip()
    if not FREE.match(lic) or re.search(r"\b(nc|nd)\b", lic, re.I):
        return None
    artist = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", meta.get("Artist", {}).get("value", "")))).strip()
    raw = dl / ("img-" + safe(name) + ".raw")
    if not raw.exists():
        raw.write_bytes(fetched(urllib.request.Request(ii.get("thumburl") or ii["url"], headers=UA)))
    sha = hashlib.sha256(raw.read_bytes()).hexdigest()
    if pins.setdefault("images", {}).setdefault(name, sha) != sha:
        raise SystemExit(f"{raw}: not the pinned image (SHA-256 differs)")
    full = IMAGES / src / file_name(eid)
    full.parent.mkdir(parents=True, exist_ok=True)
    thumb = dl / ("img-" + safe(name) + ".t.jpg")
    if shutil.which("sips"):
        for out, size, quality in ((full, FULL, 60), (thumb, THUMB, 55)):
            subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", str(quality), "-Z", str(size),
                            str(raw), "--out", str(out)], check=True, capture_output=True)
    else:
        shutil.copyfile(raw, full)
        shutil.copyfile(raw, thumb)
    credit = f"Photo: {artist[:120] or 'unknown'}, {lic}, Wikimedia Commons"
    if thumb_file:
        small = file_name(eid)[:-4] + ".t.jpg"
        shutil.copyfile(thumb, full.parent / small)
        return f"data/images/{src}/{small}", credit, f"data/images/{src}/{file_name(eid)}"
    return ("data:image/jpeg;base64," + base64.b64encode(thumb.read_bytes()).decode(), credit,
            f"data/images/{src}/{file_name(eid)}")


# ---- The finds ----

def fetch_all():
    """The list's rows, each with its article (lead paragraphs, wikitext, title), and the pins (kept, or added to:
    build() writes them once the pictures are pinned too); the photos' Commons records fetched (commons())."""
    DL.mkdir(parents=True, exist_ok=True)
    pins = json.loads(PINS.read_text()) if PINS.exists() else {}
    if "list" not in pins:
        pins["list"] = get(API, {"action": "query", "titles": LIST, "prop": "revisions", "rvprop": "ids"})[
            "query"]["pages"][0]["revisions"][0]["revid"]
    lst = cached(f"list-{pins['list']}.json", lambda: get(API, {"action": "parse", "oldid": pins["list"], "prop": "wikitext"}))
    finds = rows(lst["parse"]["wikitext"]) + [dict(f) for f in NEW]     # (COTEXT's additions after the list's)
    arts = pins.setdefault("articles", {})     # link -> [title, revid] (null: no article)
    new = sorted({f["link"] for f in finds if f["link"] and f["link"] not in arts})
    for i in range(0, len(new), 50):     # (Each new link's current revision, redirects followed)
        q = get(API, {"action": "query", "titles": "|".join(new[i:i + 50]), "redirects": 1, "prop": "revisions",
                      "rvprop": "ids"})["query"]
        to = {r["from"]: r["to"] for r in q.get("normalized", []) + q.get("redirects", [])}
        pages = {p["title"]: p for p in q["pages"]}
        for link in new[i:i + 50]:
            t = link
            while t in to:
                t = to[t]
            p = pages.get(t, {})
            arts[link] = [t, p["revisions"][0]["revid"]] if "revisions" in p else None
    revs = sorted({a[1] for a in arts.values() if a and not (DL / f"art-{a[1]}.json").exists()})
    for i in range(0, len(revs), 50):     # (The pinned revisions' wikitext not yet downloaded)
        q = get(API, {"action": "query", "revids": "|".join(map(str, revs[i:i + 50])), "prop": "revisions",
                      "rvprop": "ids|content", "rvslots": "main"})["query"]
        for p in q["pages"]:
            for r in p.get("revisions", []):
                (DL / f"art-{r['revid']}.json").write_text(json.dumps({"wikitext": r["slots"]["main"]["content"]}))
    for f in finds:
        f["article"] = None
        if f["link"] and arts.get(f["link"]):
            title, rev = arts[f["link"]]
            wt = json.loads((DL / f"art-{rev}.json").read_text())["wikitext"]
            f["article"] = {"title": title, "wikitext": wt, "lead": lead(wt)}
            facts_from(infobox(wt), f)
    commons(f["image"] for f in finds)
    return finds, pins


def find_html(f, refs, quotes=()):
    """A find as the dictionary's light HTML: its facts, what it bears on, its own text in a public-domain translation
    (quotes: blockquotes, under "Its text"), its article's lead, its Bible references (each a link to its first verse),
    the credit for its text."""
    e = html.escape
    facts = [("Date", f["date"]), ("Found", f["found"]), ("Now", f["now"]), ("Writing", f["writing"])]
    out = ["<p>" + "<br>".join(f"<b>{k}</b> {e(v)}" for k, v in facts if v) + "</p>"]
    if f["bears"]:
        out.append(f"<p><b>Bears on</b> {e(f['bears'])}</p>")
    if quotes:
        out.append('<div class="gHead">Its text</div>')
        out += list(quotes)
    if f["article"] and f["article"]["lead"]:
        out.append('<div class="gHead">From Wikipedia</div>')
        out += [f"<p>{e(t)}</p>" for t in f["article"]["lead"]]
    if refs:
        links = []
        for osis, shown in refs:
            b, ch, v = re.match(r"([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)", osis).groups()
            links.append(f'<a data-ref="{tyndale_dict.BOOKS[b]}.{ch}.{v}">{e(shown)}</a>')
        out.append("<p><b>In the Bible</b> " + "; ".join(links) + "</p>")
    src = f["article"]["title"] if f["article"] else LIST
    out.append(f"<p><i>Text from Wikipedia: {e(src)} (CC BY-SA 4.0).</i></p>")
    return "".join(out)


def last_verses(main_db):
    """tyndale_dict's LAST (each chapter's last verse, for verse_spans and verses_in) filled from the main database."""
    tyndale_dict.LAST.clear()
    tyndale_dict.LAST.update(((b, c), v) for b, c, v in main_db.execute(
        "SELECT book, chapter, MAX(verse) FROM words WHERE book <= 66 GROUP BY book, chapter"))


def namer(main_db, kinds=("person", "place")):
    """A function (name, verses) -> the Strong's keys TIPNR writes the name with (any case; TIPNR's capitalized names
    of the kinds given only: not its "other" names - a month, a deity, a book's "Chronicles" - nor the common words its
    records list - Abel's "stone"): per language (Hebrew, Greek), the keys with a word in the verses given ({(book,
    chapter * 1000 + verse)}); none, the one with the most words in the text. Also used by isbe.py."""
    tyndale_dict.download()     # (TIPNR)
    names = {}
    for strong, (kind, ns) in tyndale_dict.tipnr().items():
        if kind in kinds:
            for n in ns:
                if n[:1].isupper():
                    names.setdefault(n.lower(), set()).add(strong)
    count = dict(main_db.execute("SELECT strong, COUNT(*) FROM words WHERE book <= 66 GROUP BY strong"))

    def keys(name, verses):
        found = names.get(name.strip().lower(), set())
        if not found:
            return []
        here = set()
        for b, cv in sorted(verses):
            here.update(s for (s,) in main_db.execute("SELECT strong FROM words WHERE book = ? AND chapter = ? AND verse = ?",
                                                      (b, cv // 1000, cv % 1000)))
        out = []
        for lang in "HG":
            ks = [k for k in found if k.startswith(lang) and count.get(k)]
            if ks:
                out += [k for k in ks if k in here] or [max(ks, key=lambda k: count[k])]
        return out
    return keys


def write(out, entries, lemmas, source, photos=None):
    """A dictionary-kind file (tyndale_dict's tables, and photos when given) and its note_sources row (replaced). entries:
    [(id, title, html, line, verses, spans)] in title order; lemmas: strong -> [ids]; photos: id -> (thumbnail data URI, credit, full picture's path).
    Returns its bytes. Also used by isbe.py."""
    order = {a[0]: n for n, a in enumerate(entries)}
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(".tmp")
    tmp.unlink(missing_ok=True)
    db = sqlite3.connect(tmp)
    db.executescript("""
        PRAGMA page_size = 4096;
        CREATE TABLE articles (id TEXT PRIMARY KEY, title TEXT, html TEXT, line TEXT, verses INTEGER) WITHOUT ROWID;
        CREATE TABLE lemmas (strong TEXT PRIMARY KEY, ids TEXT, subject TEXT) WITHOUT ROWID;
        CREATE TABLE refs (book INTEGER, start INTEGER, "end" INTEGER, id TEXT,
                           PRIMARY KEY (book, start, "end", id)) WITHOUT ROWID;
    """)
    db.executemany("INSERT INTO articles VALUES (?,?,?,?,?)", [a[:5] for a in entries])
    db.executemany("INSERT INTO lemmas VALUES (?,?,'')",
                   [(s, " ".join(sorted(set(ids), key=order.get))) for s, ids in sorted(lemmas.items())])
    db.executemany("INSERT OR IGNORE INTO refs VALUES (?,?,?,?)", [(b, st, e, a[0]) for a in entries for b, st, e in a[5]])
    if photos is not None:
        db.execute("CREATE TABLE photos (id TEXT PRIMARY KEY, src TEXT, credit TEXT, full TEXT) WITHOUT ROWID")
        db.executemany("INSERT INTO photos VALUES (?,?,?,?)", [(i, *p) for i, p in sorted(photos.items())])
    db.commit()
    db.execute("VACUUM")
    db.close()
    tmp.replace(out)
    return out.read_bytes()


def register(main_db, source, file, data):
    """A source's note_sources row (replaced): its file's path under public/ and version (its SHA-256's start)."""
    main_db.execute("INSERT OR REPLACE INTO note_sources (id, kind, name, testaments, credit, file, version, bytes) "
                    "VALUES (?,?,?,?,?,?,?,?)", (*source, file, hashlib.sha256(data).hexdigest()[:12], len(data)))


def build(main_db):
    """Builds finds.db and its note_sources row (replaced). Returns (finds, verses linked, photos, lemmas)."""
    import ane     # (Its translations' excerpts - here, not at the top: ane.py imports this module)
    last_verses(main_db)
    finds, pins = fetch_all()
    missing = set(MORE) - {(f["article"]["title"] if f["article"] else f["name"]).replace(" ", "_") for f in finds}
    if missing:
        raise SystemExit(f"finds.MORE names finds not built: {sorted(missing)}")
    keys = namer(main_db)
    pins.pop("photos", None)     # (The 300 px photos pinned before the full pictures: replaced by "images")
    shutil.rmtree(IMAGES / "finds", ignore_errors=True)     # (Written anew: no picture of a find gone left behind)
    entries, lemmas, photos, seen = [], {}, {}, set()
    for f in finds:
        fid = (f["article"]["title"] if f["article"] else f["name"]).replace(" ", "_")     # (As in its URL: lemmas' ids are space-separated)
        if fid in seen:
            continue
        seen.add(fid)
        text = f["bears"] + "\n" + (plain(f["article"]["wikitext"], refs=True) if f["article"] else "")
        more, keys_ = MORE.get(fid, ("", []))
        more = [r for part in re.split(r";\s*(?=(?:[1-3]\s)?[A-Z])", more) for r in references(part)] if more else []     # (A book at a time, as ane.py's)
        refs = list(dict.fromkeys((osis, shown) for _, osis, shown in references(text) + more))
        spans = [sp for osis, _ in refs for sp in tyndale_dict.verse_spans(osis)]
        verses = tyndale_dict.verses_in(spans)
        cands = {w for w in re.findall(r"[A-Z][a-z]+", f["name"])}
        for text_, target in f["links"]:
            cands.update({text_, re.sub(r"\s*\(.*\)", "", target)})
        for n in cands:
            for k in keys(n, verses):
                lemmas.setdefault(k, []).append(fid)
        line = (f["bears"] or (f["article"]["lead"][0] if f["article"] and f["article"]["lead"] else ""))[:200]
        entries.append((fid, f["name"], find_html(f, refs, ane.quoted(keys_) if keys_ else ()), line, len(verses), spans))
        pic = pictures(f["image"], pins, "finds", fid)
        if pic:
            photos[fid] = pic
    entries.sort(key=lambda a: a[1].lower())
    PINS.write_text(json.dumps(pins, indent=1, ensure_ascii=False) + "\n")
    data = write(OUT, entries, lemmas, SOURCE, photos)
    register(main_db, SOURCE, "data/notes/finds.db", data)
    linked = len(tyndale_dict.verses_in([sp for a in entries for sp in a[5]]))
    print(f"finds: {len(entries)} finds, {linked} verses linked, {len(photos)} photos, {len(lemmas)} lemmas, "
          f"{len(data) / 1e6:.2f} MB")
    return len(entries), linked, len(photos), len(lemmas)


if __name__ == "__main__":
    con = sqlite3.connect(HERE.parent / "public" / "data" / "cotext.db")
    with con:
        build(con)
    con.close()
