"""The notes panel's manuscript sources (notes.py builds them; its docstring lists every source): the UBS's HOTTP
report, the biblical Dead Sea Scrolls, and transcriptions of New Testament manuscripts - Codex Sinaiticus, the
IGNTP's of John and Paul's letters, and Codex Bezae.

Each is fetched into pipeline/downloads/notes/<id>/ (pinned: a commit in the URL, or the file's SHA-256):
  hottp       ubsicap/ubs-open-license (commit a15a96c), HOTTP/HOTTP.XML (CC BY-SA 4.0): an entry per text-critical
              problem - the words it's about (Hebrew-numbered references), each reading (its Hebrew, its rating A-D
              for the reading preferred, the factors that explain the others, the English versions with it, a
              literal English), the committee's remark and its suggestion for translators. The English only (the
              French left out); the factors named from HOTTP-FACTORS-EN.HTML. On each verse it refers to.
  dss         ETCBC/dss (commit dd29636, tf/2.0.1: Text-Fabric features; CC BY-NC 4.0, Martin Abegg's
              transcriptions): every biblical scroll's words, by their book, chapter and verse (Hebrew-numbered;
              fragments that aren't placed in a verse left out) - per verse each scroll's text, with its brackets
              ([ ] restored, < > corrected, { } removed, ( ) alternative); the uncertainty flags (# ?) and
              morpheme breaks left out.
  sinaiticus  The Codex Sinaiticus Project's XML transcription (v1.04, 2014; CC BY-NC-SA 3.0 - its download page
              and file say so; fetched through the Internet Archive's copy, codexsinaiticus.org not answering):
              the New Testament - per verse the first hand's text, each corrector's reading after the words it
              changes (in brackets, the corrector named), [ ] supplied, nomina sacra overlined, margins left out.
  igntp       The IGNTP's TEI transcriptions (CC BY 4.0; only the files whose own licence says so - the others,
              CC BY-NC-SA, left out): John (iohannes.com: papyri and majuscules) and Galatians, Ephesians and
              Philippians (epistulae.org: every witness transcribed so far). Per verse each manuscript's text as
              Sinaiticus's (above), the manuscripts reading alike together, in Gregory-Aland order (papyri,
              majuscules, minuscules, lectionaries); ( ) an abbreviation written out.
  bezae       Codex Bezae, the Greek pages (IGNTP for Cambridge University Library, v1.03, 2016; CC BY-NC-SA 3.0 -
              its repository record and its file say so, though the IGNTP's page says CC BY): Matthew, Mark,
              Luke, John and Acts, as Sinaiticus.
"""
import html
import re
import unicodedata
import xml.etree.ElementTree as ET
import zipfile

import notes

HOTTP_COMMIT = "a15a96cfaa4ca18a6c0339016645ba1e534db3c8"   # ubsicap/ubs-open-license, 2026-11-03
DSS_COMMIT = "dd29636120a89a91bf760bf349f07ce9dc3a2998"     # ETCBC/dss, 2026-10-28
DSS_FEATURES = ["otype", "oslots", "book", "chapter", "verse", "scroll", "full", "after"]
FILES = [
    ("hottp", "HOTTP.XML", f"https://raw.githubusercontent.com/ubsicap/ubs-open-license/{HOTTP_COMMIT}/HOTTP/HOTTP.XML", None),
    ("hottp", "HOTTP-FACTORS-EN.HTML",
     f"https://raw.githubusercontent.com/ubsicap/ubs-open-license/{HOTTP_COMMIT}/HOTTP/HOTTP-FACTORS-EN.HTML", None),
    ("sinaiticus", "FINAL_TRANSCRIPTION_version104.xml.zip",
     "https://web.archive.org/web/20240726215901id_/https://codexsinaiticus.org/download/FINAL_TRANSCRIPTION_version104.xml.zip",
     "0c956b4dbf5dca53342f4862f9917850fd33151ffe05fee3b97e3fd9d36ec828"),
    ("igntp", "IGNTP_greek_john_transcriptions.zip",
     "https://itseeweb.cal.bham.ac.uk/iohannes/downloads/IGNTP_greek_john_transcriptions.zip",
     "203580a25f3f4afb1676712a7744a781c609c71967a1b208c9be56e81c1c7449"),
    ("igntp", "Galatians_Greek_Transcriptions.zip", "https://www.epistulae.org/downloads/Galatians_Greek_Transcriptions.zip",
     "50011888a3b24cec36bca3cef350a60dc21bbd8b725b385b12deed306d6f80ed"),
    ("igntp", "Ephesians_Greek_transcriptions.zip", "https://www.epistulae.org/downloads/Ephesians_Greek_transcriptions.zip",
     "72b758f995b558edb72dda956c36e68fd69d28c46c0c6e7c42b986d88c3719db"),
    ("igntp", "Philippians_Greek_transcriptions.zip",
     "https://www.epistulae.org/downloads/Philippians_Greek_transcriptions.zip",
     "16261040f42a3c0c143c75454dcbaf023b6d90afc9b5f0b73326df370cdd43f5"),
    ("bezae", "Bezae-Greek.xml", "https://epapers.bham.ac.uk/id/eprint/2167/1/Bezae-Greek.xml",
     "766ff8ed797df55615a1277febed304e22138f7e7a8d2c24c7bcf6d0315859b0"),
] + [("dss", f + ".tf", f"https://raw.githubusercontent.com/ETCBC/dss/{DSS_COMMIT}/tf/2.0.1/{f}.tf", None)
     for f in DSS_FEATURES]


def fetch():
    for src, name, url, sha in FILES:
        notes.download(src, name, url, sha)


# ---- HOTTP ----

def hottp_rows():
    """Each HOTTP entry as a note on each verse it refers to (its references: book, chapter, verse and word,
    Hebrew-numbered): a paragraph per reading - its Hebrew bold, its rating, the factors, a literal English and
    the versions with it - then the remark and the suggestion."""
    d = notes.DL / "hottp"
    factors = {}
    t = html.unescape(re.sub(r"<[^>]*>", " ", (d / "HOTTP-FACTORS-EN.HTML").read_text(encoding="utf-8", errors="replace")))
    for m in re.finditer(r"(\d+)\. ([^=]{3,120}?) = Factor (\d+)", re.sub(r"\s+", " ", t)):
        factors[m.group(3)] = m.group(2)[0].lower() + m.group(2)[1:]
    root = ET.parse(d / "HOTTP.XML").getroot()
    esc = lambda s: notes.script((s or "").strip())
    rows = []
    for k, e in enumerate(root.iter("HOTTP_Entry")):
        refs = [r.text for r in e.iter("Reference") if r.text and len(r.text) >= 9]
        parts = []
        for alt in e.iter("Alternative"):
            src = (alt.findtext("Source") or "").strip()
            rating = (alt.findtext("Rating") or "").strip()
            fs = [f.text.strip() for f in alt.iter("Factor") if f.text]
            lit = (alt.findtext("Literal") or "").strip()
            vers = [f"{html.escape(v.findtext('Text') or '')}: “{esc(v.findtext('Content'))}”" for v in alt.iter("Version")]
            p = f"<b>{esc(src)}</b>"
            if rating:
                p += f" rating <b>{html.escape(rating)}</b>"
            if lit:
                p += f" “{esc(lit)}”"
            if fs:
                p += " <small>(factors: " + "; ".join(f"{f} {html.escape(factors.get(f, ''))}".strip() for f in fs) + ")</small>"
            if vers:
                p += "<br>" + "; ".join(vers)
            parts.append(f"<p>{p}</p>")
        remark = (e.findtext("Remark") or "").strip()
        if remark:
            parts.append(f"<p>{esc(remark)}</p>")
        sug = (e.findtext("Suggestion") or "").strip()
        if sug and sug != "See Remark":
            parts.append(f"<p><i>For translators:</i> {esc(sug)}</p>")
        body = "".join(parts)
        seen = []
        for r in refs:
            b, c, v = int(r[:3]), int(r[3:6]), int(r[6:9])
            if 1 <= b <= 39 and (b, c, v) not in seen:
                seen.append((b, c, v))
        for b, c, v in seen:
            rows += notes.hebrew_rows(b, c, v, k, body)
    return rows


# ---- Dead Sea Scrolls (Text-Fabric) ----

def tf(name):
    """One Text-Fabric feature file: {node: value}. (A line 'n<TAB>value' sets node n - or 'a-b', or a list -; a
    line with only a value is the node after the last one.)"""
    vals, n, data = {}, 0, False
    with open(notes.DL / "dss" / (name + ".tf"), encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            if not data:
                data = line == ""     # (The metadata ends at the first empty line)
                continue
            if "\t" in line:
                k, v = line.split("\t", 1)
                nodes = []
                for part in k.split(","):
                    a, _, b = part.partition("-")
                    nodes += range(int(a), int(b or a) + 1)
            else:
                nodes, v = [n + 1], line
            for x in nodes:
                vals[x] = v
            n = nodes[-1]
    return vals


DSS_BOOKS = ["Gen", "Ex", "Lev", "Num", "Deut", "Josh", "Judg", "Ruth", "1Sam", "2Sam", "1Kgs", "2Kgs", "1Chr",
             "2Chr", "Ezra", "Neh", "Esth", "Job", "Ps", "Prov", "Eccl", "Song", "Is", "Jer", "Lam", "Ezek", "Dan",
             "Hos", "Joel", "Amos", "Obad", "Jonah", "Mic", "Nah", "Hab", "Zeph", "Hag", "Zech", "Mal"]   # (Ids 1-39)


def dss_rows():
    """Per verse, each scroll's words of it (in its order, spaced as transcribed), the scroll named."""
    import bisect
    otype = tf("otype")
    ranges = {}
    for n, t in otype.items():
        lo, hi = ranges.get(t, (n, n))
        ranges[t] = (min(lo, n), max(hi, n))
    w0, w1 = ranges["word"]
    s0, s1 = ranges["scroll"]
    oslots, scroll = tf("oslots"), tf("scroll")
    first = lambda n: int(re.match(r"\d+", oslots[n]).group(0))
    starts = sorted((first(s), scroll.get(s, "?")) for s in range(s0, s1 + 1) if s in oslots)
    keys = [a for a, _ in starts]
    book, chapter, verse, full, after = tf("book"), tf("chapter"), tf("verse"), tf("full"), tf("after")
    verses = {}
    for w in range(w0, w1 + 1):
        bk = book.get(w)
        if bk not in DSS_BOOKS or not chapter.get(w, "").isdigit() or not verse.get(w, "").isdigit() or w not in full:
            continue
        sc = starts[bisect.bisect_right(keys, first(w)) - 1][1]
        key = (DSS_BOOKS.index(bk) + 1, int(chapter[w]), int(verse[w]))
        verses.setdefault(key, {}).setdefault(sc, []).append(re.sub("[׳#?]", "", full[w]) + after.get(w, ""))
    rows = []
    for (b, c, v), scrolls in verses.items():
        tidy = lambda t: re.sub(r"([\[<{≤(]) ", r"\1", re.sub(r"\s+", " ", t)).strip()     # ("[ ית": "[ית")
        parts = [f'<p><b>{html.escape(sc)}</b> <span class="he">{html.escape(tidy("".join(ws)))}</span></p>'
                 for sc, ws in scrolls.items() if tidy("".join(ws))]
        if parts:
            rows += notes.hebrew_rows(b, c, v, 0, "".join(parts))
    return rows


# ---- Manuscript transcriptions (TEI) ----

OVER = "̅"     # (A combining overline: nomina sacra, numerals)


def local(tag):
    return tag.rsplit("}", 1)[-1] if isinstance(tag, str) else ""


def tei_text(el, first="orig"):
    """A TEI element's text as the panel's HTML: words (<w>) spaced, a correction's readings after the first
    hand's (first: the type of the first hand's <rdg> - 'orig', Sinaiticus's 'main-corr'), [ ] supplied, […] a gap,
    ( ) an abbreviation written out, overlines kept; margins, notes, running titles and numbers left out."""
    out = []

    def walk(e, over=False, word=False):
        name = local(e.tag)
        if name in ("note", "fw", "num", "margin", "pb", "cb", "milestone", "lb") or \
                (name == "seg" and e.get("type") == "margin"):
            pass
        elif name == "app":
            rdgs = [r for r in e if local(r.tag) == "rdg"]
            base = next((r for r in rdgs if r.get("type") == first), rdgs[0] if rdgs else None)
            if base is not None:
                walk_children(base, over, word)
            for r in rdgs:
                if r is base or r.get("type") == "alt":
                    continue
                inner = tei_text(r, first)
                hand = r.get("hand") or r.get("n") or "corrector"
                out.append(f" <small>({html.escape(hand)}: {inner or 'omits'})</small> ")
        elif name == "w":
            out.append(" ")
            walk_children(e, over, True)
            out.append(" ")
        elif name == "supplied":
            out.append("[")
            walk_children(e, over, word)
            out.append("]")
        elif name == "gap":
            out.append("[…]")
        elif name == "ex":
            out.append("(")
            walk_children(e, over, word)
            out.append(")")
        elif name in ("hi", "abbr") and (e.get("rend") in ("ol", "ol2", "overline") or e.get("type") == "nomSac"):
            walk_children(e, True, word)
        else:
            walk_children(e, over, word)
        if e.tail:
            text(e.tail, over, word)     # (The text after it: its parent's)

    def text(s, over, word=False):
        s = html.escape(re.sub(r"\s+", "", s) if word else s)     # (A word broken over lines: one word)
        out.append("".join(ch + OVER if over and not ch.isspace() else ch for ch in s))

    def walk_children(e, over, word=False):
        if e.text:
            text(e.text, over, word)
        for c in e:
            walk(c, over, word)

    walk_children(el, False)
    return re.sub(r"\s+", " ", "".join(out)).strip()


NT = {"MATT": 40, "MARK": 41, "LUKE": 42, "JOHN": 43, "ACTS": 44, "ROM": 45, "1COR": 46, "2COR": 47, "GAL": 48,
      "EPH": 49, "PHIL": 50, "COL": 51, "1THESS": 52, "2THESS": 53, "1TIM": 54, "2TIM": 55, "TITUS": 56, "PHLM": 57,
      "HEB": 58, "JAS": 59, "1PET": 60, "2PET": 61, "1JOHN": 62, "2JOHN": 63, "3JOHN": 64, "JUDE": 65, "REV": 66}
IGNTP_BOOKS = {1: 40, 2: 41, 3: 42, 4: 43, 5: 44, 9: 48, 10: 49, 11: 50}    # (The IGNTP's B01... numbers -> ids)
PAUL = {"Gal": 48, "Eph": 49, "Phil": 50}


def verse_key(ab):
    """An <ab>'s verse: (book id, chapter, verse) - Sinaiticus's id V-B36K1V5-36-JOHN, the IGNTP's n B04K1V5 or
    Gal.1.5 - or None (an inscriptio, a subscriptio, an Old Testament book)."""
    if (m := re.match(r"V-B\d+K(\d+)V(\d+)-\d+-(\w+)$", ab.get("id") or "")) and m.group(3) in NT:
        return NT[m.group(3)], int(m.group(1)), int(m.group(2))
    n = ab.get("n") or ""
    if (m := re.match(r"B(\d+)K(\d+)V(\d+)$", n)) and int(m.group(1)) in IGNTP_BOOKS:
        return IGNTP_BOOKS[int(m.group(1))], int(m.group(2)), int(m.group(3))
    if (m := re.match(r"(\w+)\.(\d+)\.(\d+)$", n)) and m.group(1) in PAUL:
        return PAUL[m.group(1)], int(m.group(2)), int(m.group(3))
    return None


def manuscript(root, first="orig"):
    """A transcription's verses: {(book, chapter, verse): HTML} (a verse split over pages joined)."""
    out = {}
    for ab in root.iter():
        if local(ab.tag) == "ab" and (key := verse_key(ab)):
            t = tei_text(ab, first)
            if t:
                out[key] = (out[key] + " " + t) if key in out else t
    return out


def one_ms_rows(verses):
    return [(b, notes.ref(c, v), notes.ref(c, v), 0, "", f"<p><span class=\"grc\">{t}</span></p>")
            for (b, c, v), t in verses.items()]


def sinaiticus_rows():
    with zipfile.ZipFile(notes.DL / "sinaiticus" / "FINAL_TRANSCRIPTION_version104.xml.zip") as z:
        data = z.read("FINAL_TRANSCRIPTION_version104.xml")
    return one_ms_rows(manuscript(ET.fromstring(data), "main-corr"))


def bezae_rows():
    return one_ms_rows(manuscript(ET.fromstring((notes.DL / "bezae" / "Bezae-Greek.xml").read_bytes())))


def ga_order(ms):
    """A manuscript's place in Gregory-Aland order: papyri, majuscules (0...), minuscules, lectionaries."""
    m = re.match(r"(P|L)?(0)?(\d+)(.*)", ms)
    if not m:
        return (9, 0, ms)
    kind = {"P": 0, "L": 3}.get(m.group(1), 1 if m.group(2) else 2)
    return (kind, int(m.group(3)), m.group(4))


def alike(t):
    """A reading as compared for grouping: letters only - case, accents, punctuation and overlines aside."""
    t = unicodedata.normalize("NFD", re.sub(r"<[^>]*>", " ", html.unescape(t)).lower().replace("ϲ", "σ").replace("ς", "σ"))
    return " ".join(re.sub(r"[^\w\s()\[\]…:]", "", t).split())


def igntp_rows():
    """Per verse each IGNTP manuscript's text, those reading alike (the same letters, words and corrections - case,
    punctuation and overlines aside: alike) in one paragraph, their names first, the group's commonest form shown."""
    readings = {}     # (book, chapter, verse) -> {text: [manuscripts]}
    skipped = 0
    for name in ["IGNTP_greek_john_transcriptions.zip", "Galatians_Greek_Transcriptions.zip",
                 "Ephesians_Greek_transcriptions.zip", "Philippians_Greek_transcriptions.zip"]:
        with zipfile.ZipFile(notes.DL / "igntp" / name) as z:
            for f in z.namelist():
                if not f.endswith(".xml") or "__MACOSX" in f:
                    continue
                data = z.read(f)
                root = ET.fromstring(data)     # (Their entities - &om; - declared in their own DOCTYPE)
                avail = " ".join("".join(e.itertext()) for e in root.iter() if local(e.tag) == "availability")
                if not re.search(r"Attribution 4\.0", avail) or re.search(r"noncommercial|non-commercial|NonCommercial", avail):
                    skipped += 1
                    continue
                title = next((e for e in root.iter() if local(e.tag) == "title" and e.get("type") == "document"), None)
                ms = (title.get("n") if title is not None else None) or f.rsplit("_", 1)[-1][:-4]
                for key, t in manuscript(root).items():
                    readings.setdefault(key, {}).setdefault(alike(t), []).append((ms, t))
    print(f"  igntp: {skipped} transcriptions left out (not CC BY)")
    rows = []
    for (b, c, v), texts in readings.items():
        groups = []
        for got in texts.values():
            mss = sorted((ms for ms, _ in got), key=ga_order)
            forms = [t for _, t in got]
            groups.append((mss, max(set(forms), key=forms.count)))     # (The group's commonest form shown)
        groups.sort(key=lambda g: ga_order(g[0][0]))
        body = "".join(f'<p><b>{html.escape(", ".join(mss))}</b> <span class="grc">{t}</span></p>' for mss, t in groups)
        rows.append((b, notes.ref(c, v), notes.ref(c, v), 0, "", body))
    return rows
