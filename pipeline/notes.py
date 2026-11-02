"""The notes panel's sources: free commentaries and text-critical apparatuses, each its own database file, synced to the
verse being read (src/notes.ts).

Each source is fetched once into pipeline/downloads/notes/<id>/ (pinned: a release tag or commit in the URL, and the
file's SHA-256 checked) and built into public/data/notes/<id>.db, read by the app only once the reader picks it - so
the main database stays small and only the sources used are ever downloaded.

Commentaries:
  tn       unfoldingWord Translation Notes (en_tn at commit bf60334, 2026-11-02; CC BY-SA 4.0): TSV per book, each note keyed to a verse and the
           original-language words it's about (shown above the note). Book and chapter introductions are left out.
  tosn     Tyndale Open Study Notes (release 1.25, 2022; CC BY-SA 4.0): StudyNotes.xml, a note per verse or range.
  kd       Keil & Delitzsch, Biblical Commentary on the Old Testament (1864-; public domain): CrossWire's SWORD module
           KD 2.0 (zCom4, KJV versification; text from Wikisource). A comment on a range of verses is stored once.
  vincent  Vincent's Word Studies in the New Testament (1887-1900; public domain): the MySword module (vws, 1.2.1,
           made from theWord's), which states no licence of its own - the work itself is public domain.
Apparatus:
  stepbible  STEPBible's TAGNT and TAHOT (CC BY 4.0; already in downloads/ for the text): NT - TAGNT's variant notes,
           its words not in every edition (NA28, NA27, Tyndale House, SBL, Westcott-Hort, Tregelles, TR, Byzantine) and
           its meaning variants; OT - TAHOT's Qere / Ketiv and other readings (Aleppo, BHS, Cairensis...), its words
           restored or added from the LXX.
  sblgnt   The SBLGNT apparatus (Holmes 2010; LogosBible/SBLGNT, CC BY 4.0): each variation unit as printed, the
           SBLGNT's reading and its editions ] the other reading and its editions.

Versification: every verse is stored as its source numbers it. The text is NRSV-numbered (build_db.py); KD follows the
KJV's, the others English Bibles' (Psalm titles verse 0 where a source keeps them apart: en_tn's "front") - the same
nearly everywhere, a verse or two off in the few places English Bibles divide differently.

Tables, in each source's file:
  notes   book (1-66, build_db's ids), start, end (chapter * 1000 + verse: the first and last verse it covers - a range
          note covers several, a cross-chapter one too), ord (its order among notes starting at the same verse),
          quote (the original-language words a note is about, en_tn's; else ''), body (HTML: <p>, <b>, <i>, <br>,
          <small> (a footnote), <table>/<tr>/<td>, <span class=he|grc> round Hebrew / Greek; nothing else)
In the main database (cotext.db):
  note_sources  id, kind ('commentary' / 'apparatus'), name (as the picker shows it), testaments ('OT', 'NT' or
          'OT NT'), credit (the line under the notes), file (data/notes/<id>.db), version (the file's hash: its URL
          and cache change with it), bytes
"""
import csv
import hashlib
import html
import html.parser
import io
import pathlib
import re
import sqlite3
import struct
import urllib.request
import zipfile
import zlib

HERE = pathlib.Path(__file__).parent
DL = HERE / "downloads" / "notes"
OUT = HERE.parent / "public" / "data" / "notes"

# (source id, file name, URL, SHA-256) - each pinned: a tag or commit in the URL, and the bytes checked.
FILES = [
    # (A commit, not release v91: v91 leaves out Numbers, 1-2 Chronicles, Ecclesiastes, Isaiah, Jeremiah and Ezekiel.)
    ("tn", "en_tn-bf60334.zip",
     "https://git.door43.org/unfoldingWord/en_tn/archive/bf603342902491abadf1ab6e61a3b5777b2a3382.zip",
     "e67746ce579ce97d0a9750ba3320b52368a76ddbfe5940e1d24da7df1cf38eb1"),
    ("tosn", "tyndale_open-studynotes.zip",
     "https://tyndaleopenresources.com/wp-content/themes/tyndale-openresources/files/tyndale_open-studynotes.zip",
     "7b4d5ae088449d5a6925170c4b89b978acee2f78f73dc6b8a278fa948a7e8498"),
    ("kd", "KD.zip", "https://www.crosswire.org/ftpmirror/pub/sword/packages/rawzip/KD.zip",
     "ca3bdb6a04c0b717ee2faed71b432d58195db96f217f490ce6f7d9c36a2876f7"),
    # SWORD's own KJV versification (chapters per book, verses per chapter): where each verse sits in KD's index.
    ("kd", "canon.h", "https://www.crosswire.org/svn/sword/!svn/bc/3918/trunk/include/canon.h", None),
    ("vincent", "vws.cmt.mybible.gz", "https://mysword-bible.info/download/getfile.php?file=vws.cmt.mybible.gz",
     "e7a880d292a51baf78c671be91cab73cea423506c1a75453e301e0bab58ac4eb"),
]
SBLGNT_COMMIT = "d7f35adca9ec410e1d1499c63b4dd989d76c8d4d"   # LogosBible/SBLGNT, 2026-10-25
SBLGNT_BOOKS = ["Matt", "Mark", "Luke", "John", "Acts", "Rom", "1Cor", "2Cor", "Gal", "Eph", "Phil", "Col", "1Thess",
                "2Thess", "1Tim", "2Tim", "Titus", "Phlm", "Heb", "Jas", "1Pet", "2Pet", "1John", "2John", "3John",
                "Jude", "Rev"]
for _b in SBLGNT_BOOKS:
    FILES.append(("sblgnt", _b + ".txt",
                  f"https://raw.githubusercontent.com/LogosBible/SBLGNT/{SBLGNT_COMMIT}/data/sblgntapp/text/{_b}.txt", None))

# (id, kind, name, testaments, credit) - the picker's order.
SOURCES = [
    ("tn", "commentary", "Translation Notes (unfoldingWord)", "OT NT",
     "unfoldingWord Translation Notes, CC BY-SA 4.0 - the original work by unfoldingWord is available from "
     "unfoldingword.org/utn. Adapted: reformatted, introductions left out."),
    ("tosn", "commentary", "Tyndale Open Study Notes", "OT NT",
     "Adapted from Tyndale Open Study Notes, (c) 2022 Tyndale House Publishers, CC BY-SA 4.0. The original work is "
     "available for free at tyndaleopenresources.com."),
    ("kd", "commentary", "Keil & Delitzsch (1864)", "OT",
     "Keil & Delitzsch, Biblical Commentary on the Old Testament: public domain (CrossWire's SWORD module, from Wikisource)."),
    ("vincent", "commentary", "Vincent's Word Studies (1887)", "NT",
     "Marvin R. Vincent, Word Studies in the New Testament: public domain (the MySword module)."),
    ("stepbible", "apparatus", "Editions and variants (STEPBible)", "OT NT",
     "STEPBible Data (TAGNT, TAHOT), Tyndale House, Cambridge, CC BY 4.0."),
    ("sblgnt", "apparatus", "SBLGNT apparatus", "NT",
     "SBLGNT apparatus, Michael W. Holmes, ed. (Society of Biblical Literature and Logos Bible Software, 2010), CC BY 4.0."),
]

USFM = ["GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT", "1SA", "2SA", "1KI", "2KI", "1CH", "2CH", "EZR", "NEH",
        "EST", "JOB", "PSA", "PRO", "ECC", "SNG", "ISA", "JER", "LAM", "EZK", "DAN", "HOS", "JOL", "AMO", "OBA", "JON",
        "MIC", "NAM", "HAB", "ZEP", "HAG", "ZEC", "MAL", "MAT", "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL",
        "EPH", "PHP", "COL", "1TH", "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAS", "1PE", "2PE", "1JN", "2JN", "3JN",
        "JUD", "REV"]   # (Book ids 1-66 in order: build_db's BOOKS)
TOSN_BOOKS = ["Gen", "Exod", "Lev", "Num", "Deut", "Josh", "Judg", "Ruth", "ISam", "IISam", "IKgs", "IIKgs", "IChr",
              "IIChr", "Ezra", "Neh", "Esth", "Job", "Ps", "Pr", "Eccl", "Song", "Isa", "Jer", "Lam", "Ezek", "Dan",
              "Hos", "Joel", "Amos", "Obad", "Jon", "Mic", "Nah", "Hab", "Zeph", "Hagg", "Zech", "Mal", "Matt",
              "Mark", "Luke", "John", "Acts", "Rom", "ICor", "IICor", "Gal", "Eph", "Phil", "Col", "IThes", "IIThes",
              "ITim", "IITim", "Titus", "Phlm", "Heb", "Jas", "IPet", "IIPet", "IJn", "IIJn", "IIIJn", "Jude", "Rev"]


def ref(c, v):
    return int(c) * 1000 + int(v)


# ---- Fetching ----

def fetch():
    for src, name, url, sha in FILES:
        out = DL / src / name
        if out.exists():
            continue
        out.parent.mkdir(parents=True, exist_ok=True)
        print("downloading", src, name)
        req = urllib.request.Request(url, headers={"User-Agent": "COTEXT-pipeline/0.1 (Bible study app build)"})
        with urllib.request.urlopen(req, timeout=600) as r:
            data = r.read()
        if sha and hashlib.sha256(data).hexdigest() != sha:
            raise SystemExit(f"{name}: not the pinned file (SHA-256 differs) - check the source, then update notes.py")
        out.write_bytes(data)


# ---- HTML: every source's markup reduced to the same few tags ----

HEB = r"[֑-״יִ-ﭏ]"
GRK = r"[Ͱ-Ͽἀ-῿]"
SCRIPT = re.compile(rf"({HEB}+(?:[\s־,]+{HEB}+)*)|({GRK}[Ͱ-Ͽἀ-῿̀-ͯ]*"
                    rf"(?:[\s,.·]+{GRK}[Ͱ-Ͽἀ-῿̀-ͯ]*)*)")


def script(text):
    """Escaped text with its Hebrew and Greek runs (several words together) in <span class=he|grc>: their fonts."""
    out, at = [], 0
    for m in SCRIPT.finditer(text):
        out.append(html.escape(text[at:m.start()], quote=False))
        out.append(f'<span class="{"he" if m.group(1) else "grc"}">{html.escape(m.group(0), quote=False)}</span>')
        at = m.end()
    out.append(html.escape(text[at:], quote=False))
    return "".join(out)


class Clean(html.parser.HTMLParser):
    """Markup to COTEXT's few tags. rule(tag, attrs) says what a tag becomes: 'b', 'i', 'small', 'table', 'tr', 'td',
    'p' (a paragraph break), 'br', 'h' (a heading: its own bold paragraph), 'drop' (left out, with its text) or None
    (the tag dropped, its text kept)."""

    def __init__(self, rule):
        super().__init__(convert_charrefs=True)
        self.rule, self.out, self.stack, self.dropping = rule, [], [], 0

    def handle_starttag(self, tag, attrs):
        r = self.rule(tag, dict(attrs))
        self.stack.append((tag, r))
        if self.dropping or r == "drop":
            self.dropping += r == "drop"
        elif r in ("p", "h"):
            self.out.append("\n\n" + ("<b>" if r == "h" else ""))
        elif r == "br":
            self.out.append("<br>")
        elif r:
            self.out.append(f"<{r}>")
        if tag in ("br", "img"):     # (Void tags: nothing to close)
            self.stack.pop()

    def handle_startendtag(self, tag, attrs):
        r = self.rule(tag, dict(attrs))
        if not self.dropping and r in ("p", "br"):
            self.out.append("\n\n" if r == "p" else "<br>")

    def handle_endtag(self, tag):
        if tag not in (t for t, _ in self.stack):
            return     # (A stray end tag)
        while self.stack:
            t, r = self.stack.pop()
            if r == "drop":
                self.dropping -= 1
            elif not self.dropping:
                if r == "h":
                    self.out.append("</b>\n\n")
                elif r == "p":
                    self.out.append("\n\n")
                elif r and r != "br":
                    self.out.append(f"</{r}>")
            if t == tag:
                break

    def handle_data(self, data):
        if not self.dropping:
            self.out.append(script(data))

    def result(self):
        self.close()
        return paragraphs("".join(self.out))


def paragraphs(s):
    """Text with \\n\\n between paragraphs -> <p>...</p> each, empty ones dropped."""
    s = s.replace("\xa0", " ")
    ps = [re.sub(r"\s+", " ", p).strip() for p in s.split("\n\n")]
    return "".join(f"<p>{p}</p>" for p in ps if re.sub(r"<[^>]*>", "", p).strip())


def clean(s, rule):
    c = Clean(rule)
    c.feed(s)
    return c.result()


# ---- Commentaries ----

def markdown(s):
    """en_tn's Markdown (its \\n written out): paragraphs, # headings and * lists, **bold**, *italic*, [links] as
    their text."""
    s = s.replace("\\n", "\n")
    out = []
    for block in re.split(r"\n\s*\n", s):
        lines = []
        for line in block.split("\n"):
            line = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", line)
            head = re.match(r"^#+\s*(.*)", line)
            item = re.match(r"^\s*[*-]\s+(.*)", line)
            t = script(head.group(1) if head else item.group(1) if item else line)
            t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
            t = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<i>\1</i>", t)
            lines.append(f"<b>{t}</b>" if head else ("• " + t) if item else t)
        out.append("<br>".join(x for x in lines if x.strip()))
    return "".join(f"<p>{p}</p>" for p in out if p.strip())


def tn_rows():
    """en_tn: (book, start, end, ord, quote, body) per verse note; '1:1-4' ranges kept, Psalms' 'front' verse 0."""
    with zipfile.ZipFile(DL / "tn" / "en_tn-bf60334.zip") as z:
        for b, code in enumerate(USFM, 1):
            name = next((n for n in z.namelist() if n.endswith(f"/tn_{code}.tsv")), None)
            if not name:
                continue
            rows = csv.reader(io.StringIO(z.read(name).decode("utf-8-sig")), delimiter="\t", quoting=csv.QUOTE_NONE)
            for k, r in enumerate(rows):
                if len(r) < 7 or k == 0:
                    continue
                m = re.match(r"^(\d+):(front|\d+)(?:-(\d+))?$", r[0])
                if not m:
                    continue     # (Book and chapter introductions)
                c, v1 = int(m.group(1)), 0 if m.group(2) == "front" else int(m.group(2))
                quote = script(r[4].replace("⁠", "").replace(" & ", " … ")) if r[4] else ""
                yield b, ref(c, v1), ref(c, int(m.group(3) or v1)), k, quote, markdown(r[6])


def tosn_rows():
    """Tyndale's StudyNotes.xml: each <item> a note on <refs> (Gen.1.1, Gen.1.3-5, Gen.1.1-2.3). The verse label
    (sn-ref) is left out: the panel gives its own; quoted Bible words (sn-excerpt) bold."""
    def rule(tag, a):
        cls = a.get("class", "")
        if tag == "p":
            return "p"
        if tag == "span":
            if cls.startswith("sn-ref"):
                return "drop"
            if cls.startswith("sn-excerpt") or cls.startswith("bold"):
                return "b"
            if cls.startswith("ital") or cls in ("hebrew", "greek", "aramaic", "latin"):
                return "i"
            if cls == "sup":
                return "small"
        return None
    with zipfile.ZipFile(DL / "tosn" / "tyndale_open-studynotes.zip") as z:
        name = next(n for n in z.namelist() if n.endswith("/StudyNotes.xml"))
        xml = z.read(name).decode("utf-8")
    for k, m in enumerate(re.finditer(r'<item name="[^"]*" typename="StudyNote"[^>]*>\s*<refs>([^<]*)</refs>\s*'
                                      r'<body>(.*?)</body>', xml, re.S)):
        r = re.match(r"^(\w+)\.(\d+)\.(\d+)(?:-(?:(\d+)\.)?(\d+))?$", m.group(1).strip())
        if not r or r.group(1) not in TOSN_BOOKS:
            continue
        c, v = int(r.group(2)), int(r.group(3))
        c2, v2 = (int(r.group(4) or c), int(r.group(5))) if r.group(5) else (c, v)
        yield TOSN_BOOKS.index(r.group(1)) + 1, ref(c, v), ref(c2, v2), k, "", clean(m.group(2), rule)


def kjv_versification():
    """SWORD's KJV versification from canon.h: [(book id 1-66, [verses in chapter 1, 2...])], OT then NT."""
    src = (DL / "kd" / "canon.h").read_text(encoding="utf-8", errors="replace")
    chapters = [int(n) for n in re.findall(r'\{"[^"]*", "[^"]*", "[^"]*", (\d+)\}', src)]
    chapters = [n for n in chapters if n]     # (Each list ends with an empty entry)
    vm = [int(n) for n in re.findall(r"\d+", re.sub(r"//[^\n]*", "", re.search(r"int vm\[\] = \{(.*?)\};", src, re.S).group(1)))]
    out, at = [], 0
    for b, n in enumerate(chapters, 1):
        out.append((b, vm[at:at + n]))
        at += n
    assert len(out) == 66 and at == len(vm) == 1189, "canon.h: not the KJV versification expected"
    return out


def kd_rows():
    """KD's zCom4 module (OT only): ot.bzv indexes every verse slot - 12 bytes each, block / offset / size - in the
    KJV's order (the testament's two headings, then per book its heading, per chapter its heading and its verses);
    ot.bzs gives each zlib block's place in ot.bzz. Verses sharing one comment point at the same bytes: stored once,
    as a range. A comment's own leading reference ("Gen 1:2-5") is dropped: the panel shows the range."""
    with zipfile.ZipFile(DL / "kd" / "KD.zip") as z:
        base = "modules/comments/zcom4/kd/"
        bzs, bzv, bzz = (z.read(base + "ot." + x) for x in ("bzs", "bzv", "bzz"))
    blocks = [struct.unpack_from("<III", bzs, i) for i in range(0, len(bzs), 12)]
    cache = {}

    def text(key):
        blk, off, size = key
        if blk not in cache:
            cache.clear()
            o, cs, _ = blocks[blk]
            cache[blk] = zlib.decompress(bzz[o:o + cs])
        return cache[blk][off:off + size].decode("utf-8")

    def rule(tag, a):
        t = a.get("type", "")
        if tag == "hi":
            return "b" if t == "bold" else "i"
        if tag == "title":
            return "h"
        if tag in ("div", "l", "item", "lg") and (t == "x-p" or tag != "div"):
            return "p"
        if tag == "note":
            return "small"
        if tag in ("table", "row", "cell"):
            return {"table": "table", "row": "tr", "cell": "td"}[tag]
        if tag in ("chapter", "milestone"):
            return "drop"
        return None

    slots = []
    i = 2
    for b, verses in kjv_versification()[:39]:
        i += 1                                                    # (The book's heading)
        for c, n in enumerate(verses, 1):
            i += 1                                                # (The chapter's heading)
            for v in range(1, n + 1):
                slots.append((b, ref(c, v), struct.unpack_from("<III", bzv, i * 12)))
                i += 1
    assert i * 12 == len(bzv), "KD: its index isn't the KJV versification"
    k = 0
    while k < len(slots):
        b, start, key = slots[k]
        end = k
        while end + 1 < len(slots) and slots[end + 1][2] == key and slots[end + 1][0] == b:
            end += 1
        if key[2]:
            raw = re.sub(r"^\s*<reference[^>]*>[^<]*</reference>", "", text(key))
            body = clean(raw.replace("<note", " <note").replace("</note>", "</note> "), rule)
            body = body.replace("<small>", "<small>(").replace("</small>", ")</small>")
            if body:
                yield b, start, slots[end][1], 0, "", body
        k = end + 1


def vincent_rows():
    """Vincent's MySword module: book 40-66, chapter, fromverse - toverse, data (HTML; its Greek in spans)."""
    import gzip
    data = gzip.decompress((DL / "vincent" / "vws.cmt.mybible.gz").read_bytes())
    tmp = OUT / "vincent.src.tmp"
    tmp.write_bytes(data)
    try:
        src = sqlite3.connect(f"file:{tmp}?mode=ro", uri=True)
        rows = src.execute("SELECT id, book, chapter, fromverse, toverse, data FROM commentary ORDER BY id").fetchall()
        src.close()
    finally:
        tmp.unlink()

    def rule(tag, a):
        return {"p": "p", "b": "b", "i": "i", "br": "br"}.get(tag)
    for k, b, c, v1, v2, body in rows:
        if 40 <= b <= 66:
            yield b, ref(c, v1), ref(c, max(v1, v2 or v1)), k, "", clean(body, rule)


# ---- Apparatus ----

TAGNT_EDITIONS = ["NA28", "NA27", "Tyn", "SBL", "WH", "Treg", "TR", "Byz"]
EDITION_NAMES = {"NA28": "NA28", "NA27": "NA27", "Tyn": "Tyndale House", "SBL": "SBL", "WH": "Westcott-Hort",
                 "Treg": "Tregelles", "TR": "TR", "Byz": "Byzantine"}
HEB_SOURCES = {"L": "Leningrad", "Q": "Qere (read)", "K": "Ketiv (written)", "R": "restored", "X": "from the LXX",
               "A": "Aleppo", "B": "BHS", "C": "Cairensis", "D": "Dead Sea Scrolls", "E": "emendation",
               "F": "formatting", "H": "Ben Chaim", "P": "punctuation", "S": "scribal tradition",
               "V": "some manuscripts"}
REF = re.compile(r"^(\w+)\.(\d+)\.(\d+)[^#]*#(\d+)=(\S+)")


def editions(s):
    return ", ".join(EDITION_NAMES.get(e.strip(), e.strip()) for e in s.split("+") if e.strip())


def tagnt_rows(book_id):
    """TAGNT, per verse: its variant notes (in English), then each run of words not in every edition (with the
    editions that have them), then the meaning variants of its words - the other reading and its editions."""
    import fetch
    verses = {}
    for i in (1, 2):
        with open(fetch.DOWNLOADS / f"TAGNT{i}.txt", encoding="utf-8-sig") as f:
            for line in f:
                c = line.rstrip("\n").split("\t")
                m = REF.match(c[0])
                if m and len(c) > 5:
                    b, ch, v = book_id[m.group(1)], int(m.group(2)), int(m.group(3))
                    verses.setdefault((b, ch, v), []).append(c)
    for (b, ch, v), rows in verses.items():
        notes, runs, means = [], [], []
        for c in rows:
            greek = re.sub(r"\s*\(.*\)$", "", c[1].strip())
            gloss = c[2].strip()
            eds = c[5].strip()
            have = {e.strip() for e in eds.split("+")}
            if len(c) > 13 and c[13].strip():
                note = re.sub(r"^[v^]\s*", "", c[13].strip())
                notes.append(clean(note, lambda t, a: "i" if t == "i" else None))
            if not set(TAGNT_EDITIONS) <= have:
                if runs and runs[-1][0] == eds:
                    runs[-1][1].append((greek, gloss))
                else:
                    runs.append((eds, [(greek, gloss)]))
            if c[6].strip():
                for alt in c[6].split(";"):
                    am = re.match(r"^\s*(\S+)\s*\(([^)]*)\)\s*(.*?)\s*-\s*\S+\s+in:\s*(.*)$", alt)
                    if am:
                        means.append(f"{script(greek)} “{html.escape(gloss)}”: {script(am.group(1))} "
                                     f"“{html.escape(am.group(3))}” in {html.escape(editions(am.group(4)))}")
        parts = [f"<p>{n[3:-4] if n.startswith('<p>') else n}</p>" for n in notes]
        for eds, ws in runs:
            words = " ".join(w for w, _ in ws)
            gl = " ".join(g for _, g in ws)
            parts.append(f"<p><b>{script(words)}</b> “{html.escape(gl)}” - only in {html.escape(editions(eds))}</p>")
        parts += [f"<p>{m}</p>" for m in means]
        if parts:
            yield b, ref(ch, v), ref(ch, v), 0, "", "".join(parts)


def tahot_rows(book_id):
    """TAHOT, per verse: each word with a variant - its type's sources spelled out (Qere over Ketiv; Aleppo, BHS...),
    the other readings (its meaning and spelling variants: the Hebrew, with the English where given) - and the words
    restored (R) or added from the LXX (X)."""
    import fetch
    out = {}
    for i in range(1, 5):
        with open(fetch.DOWNLOADS / f"TAHOT{i}.txt", encoding="utf-8-sig") as f:
            for line in f:
                c = line.rstrip("\n").split("\t")
                m = REF.match(c[0])
                if not m or len(c) < 8 or not c[1]:
                    continue
                kind = m.group(5)
                if "(" not in kind and kind[0] not in "RX":
                    continue
                word = c[1].replace("/", "").replace("\\", "")
                gloss = re.sub(r"\s+", " ", c[3].replace("/", " ").replace("<", "").replace(">", "")).strip()
                lines = []
                if kind[0] in "RX":
                    lines.append("restored from a parallel passage" if kind[0] == "R" else
                                 "added from the Greek (LXX), as in the apparatus of BHS / BHK")
                if "(" in kind:
                    main, var = kind.split("(", 1)
                    var = var.rstrip(")")
                    follows = ", ".join(HEB_SOURCES.get(x, x) for x in main if x.isalpha())
                    lines.append(f"this text: {html.escape(follows)}")
                    seen = set()
                    for col, minor in ((c[6], False), (c[7], True)):
                        for alt in col.split(";"):
                            am = re.match(r"^\s*([A-Za-z]+)=\s*(.*)$", alt.replace("¦", ""))
                            if not am or not am.group(2).strip():
                                continue
                            heb = re.search(r"\(([^)]*[֐-׿][^)]*)\)", am.group(2))
                            heb = heb.group(1) if heb else am.group(2).split("(")[0]
                            heb = heb.replace("/", "").replace("\\", "").strip()
                            en = re.search(r'"([^"]*)"', am.group(2))
                            who = ", ".join(HEB_SOURCES.get(x.upper(), x) for x in am.group(1))
                            if (who, heb) in seen:
                                continue
                            seen.add((who, heb))
                            lines.append(f"{html.escape(who)}: {script(heb)}"
                                         + (f" “{html.escape(en.group(1).replace('/', ''))}”" if en else "")
                                         + (" (spelling only)" if minor and not en else ""))
                b, ch, v = book_id[m.group(1)], int(m.group(2)), int(m.group(3))
                out.setdefault((b, ch, v), []).append(f"<p><b>{script(word)}</b> “{html.escape(gloss)}” - "
                                                      + "; ".join(lines) + "</p>")
    for (b, ch, v), parts in out.items():
        yield b, ref(ch, v), ref(ch, v), 0, "", "".join(parts)


def sblgnt_rows():
    """The SBLGNT apparatus files: 'John 1:18' heads a verse, then its units - '18 μονογενὴς θεὸς WH Treg NA28 ]
    ὁ μονογενὴς υἱός RP', more after '•' - each a paragraph: the SBLGNT's reading bold, its editions, ] and the rest."""
    for b, name in enumerate(SBLGNT_BOOKS, 40):
        text = (DL / "sblgnt" / (name + ".txt")).read_text(encoding="utf-8-sig")
        for m in re.finditer(r"^\S+(?: \S+)?? (\d+):(\d+)\n(.*?)(?=\n\S+(?: \S+)?? \d+:\d+\n|\Z)", text, re.S | re.M):
            ch, v, body = int(m.group(1)), int(m.group(2)), m.group(3)
            units = [u.strip() for u in re.split(r"\n?\s*•\s*|\n", body) if u.strip()]
            parts = []
            for u in units:
                u = re.sub(r"^(\d+:)?\d+\s+", "", u)
                lemma, _, rest = u.partition("]")
                parts.append(f"<p><b>{script(lemma.strip())}</b> ] {script(rest.strip())}</p>")
            if parts:
                yield b, ref(ch, v), ref(ch, v), 0, "", "".join(parts)


# ---- Building ----

def write(src_id, rows):
    """One source's file: its notes table, ordered for the panel's lookup by book and first verse."""
    path = OUT / f"{src_id}.db"
    tmp = path.with_suffix(".tmp")
    tmp.unlink(missing_ok=True)
    db = sqlite3.connect(tmp)
    db.executescript("""
        PRAGMA page_size = 4096;
        CREATE TABLE notes (book INTEGER, start INTEGER, end INTEGER, ord INTEGER, quote TEXT, body TEXT);
    """)
    rows = sorted(rows, key=lambda r: (r[0], r[1], r[3]))
    db.executemany("INSERT INTO notes VALUES (?,?,?,?,?,?)", rows)
    db.execute("CREATE INDEX notes_at ON notes (book, start)")
    db.commit()
    db.execute("VACUUM")
    db.close()
    tmp.replace(path)
    return path, len(rows)


def build(main_db, book_codes):
    """Builds every source's file and lists them in the main database's note_sources. book_codes: the text's book
    codes in id order (Gen, Exo... - the STEPBible files' own)."""
    fetch()
    OUT.mkdir(parents=True, exist_ok=True)
    book_id = {code: i + 1 for i, code in enumerate(book_codes)}
    makers = {
        "tn": tn_rows, "tosn": tosn_rows, "kd": kd_rows, "vincent": vincent_rows,
        "stepbible": lambda: [*tagnt_rows(book_id), *tahot_rows(book_id)], "sblgnt": sblgnt_rows,
    }
    main_db.execute("CREATE TABLE note_sources (id TEXT PRIMARY KEY, kind TEXT, name TEXT, testaments TEXT, credit TEXT,"
                    " file TEXT, version TEXT, bytes INTEGER)")
    counts = {}
    for sid, kind, name, testaments, credit in SOURCES:
        path, n = write(sid, makers[sid]())
        data = path.read_bytes()
        main_db.execute("INSERT INTO note_sources VALUES (?,?,?,?,?,?,?,?)",
                        (sid, kind, name, testaments, credit, f"data/notes/{sid}.db",
                         hashlib.sha256(data).hexdigest()[:12], len(data)))
        counts[sid] = (n, len(data))
    return counts


if __name__ == "__main__":
    import sys
    sys.path.insert(0, str(HERE))
    import build_db
    db = sqlite3.connect(":memory:")
    for sid, (n, size) in build(db, [c for c, _ in build_db.BOOKS]).items():
        print(f"{sid}: {n} notes, {size / 1e6:.1f} MB")
