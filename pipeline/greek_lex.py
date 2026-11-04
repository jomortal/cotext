"""The full Greek lexicons a Greek word's panel offers beside the brief one (src/panel.ts' LEXICON picker), as
bdb.py does BDB for Hebrew.

Sources, each pinned by URL and SHA-256 and fetched once into pipeline/downloads/greek_lex/:
  abbott  G. Abbott-Smith, A Manual Greek Lexicon of the New Testament (1922): the open TEI edition
          (github.com/translatable-exegetical-tools/Abbott-Smith, abbott-smith.tei.xml; the lexicon and its markup
          public domain, as its README says). Entries keyed n="lemma|G3056" (several numbers: lemma|G1|G2; about 450
          with no number: matched by lemma); <superEntry> groups a few.
  thayer  J. H. Thayer, A Greek-English Lexicon of the New Testament (corrected edition, 1889): Every Promise's
          edition (github.com/imbennyhim/Every-Promise-Thayers, thayers.html; public domain, its edition CC0).
          One <article> per Strong's number, the text plain paragraphs.
  ml      Liddell and Scott, An Intermediate Greek-English Lexicon (the "Middle Liddell", Oxford 1889): the Perseus
          Digital Library's TEI (Perseus:text:1999.04.0058; github.com/blinskey/middle-liddell's copy with typo
          fixes), CC BY-SA 3.0 US. Its Greek is in Beta Code (converted here); entries keyed by lemma only
          (key="lo/gos", a homograph's number after it).
  dodson  John Jeffrey Dodson, A Greek-English Lexicon of the New Testament (2010, public domain): the
          Biblical Humanities edition (github.com/biblicalhumanities/Dodson-Greek-Lexicon, dodson.xml, CC0). One
          line per Strong's number (n="λόγος | 3056"): headword and a short definition.
Not found clean and openly licensed: Moulton & Milligan's Vocabulary of the Greek Testament (scans; the one
digitization, github.com/curran-gehring/moulton-milligan, has no licence).

Mapping, per lexicon: a COTEXT key (the lexicon's extended Strong's, G3056, G0032G) goes to the source's entries with
the same number. One: it. Several: those whose headword matches the key's dictionary form (as written, grave as
acute; else accents ignored), none matching, all of them. No entry with the number (STEPBible's added G6000s, a
number the source lacks, or a source keyed by lemma only): the entries whose headword matches, the same two ways -
all of them (homographs: all shown). None: that lexicon isn't offered for the word.

Output: public/data/notes/<lexicon>.db, beside the notes panel's files - each downloaded the first time it's shown and
kept (src/db.ts' openNotesDb):
  entries  id (the entry's number in its source), html: the entry as readable HTML - <div class=lexEntry> holding it,
           its headword <b>; <span class=grc> round Greek, <span class=he> round Hebrew, <b> meanings (as the source
           marks them: Abbott-Smith's glosses, Middle Liddell's translations), <i> parts of speech, Latin and
           emphasis, <div class=sense> each numbered sense (<b>1.</b> its number), nested as in the source, <p> a
           paragraph (Thayer), <table> Abbott-Smith's few tables. References kept as their text. Nothing else.
In the main database (cotext.db):
  greek_lex       strong, lexicon (abbott, thayer, ml, dodson) -> entries (ids, space-separated, in the order shown)
  greek_lex_file  lexicon -> file (data/notes/<lexicon>.db), version (the file's hash: its URL and cache change with
                  it), bytes
"""
import hashlib
import html
import pathlib
import re
import sqlite3
import unicodedata
import urllib.request
import xml.etree.ElementTree as ET

HERE = pathlib.Path(__file__).parent
DL = HERE / "downloads" / "greek_lex"
NOTES = HERE.parent / "public" / "data" / "notes"
RAW = "https://raw.githubusercontent.com"
SOURCES = {     # lexicon -> (URL at its pinned commit, SHA-256)
    "abbott": (f"{RAW}/translatable-exegetical-tools/Abbott-Smith/8c00cb244761aa23659421a8cbbbf7a3b27b7d59/abbott-smith.tei.xml",
               "99821bee411626b4aa3e674040297b54b267eff86cb4f9b7ef69a8bdb18b6f90"),
    "thayer": (f"{RAW}/imbennyhim/Every-Promise-Thayers/a31ff38c40a681ef1029dcc51eb7e7ee3f2ea409/thayers.html",
               "51c1893cd0f2e900614ca2ad81bd884a9b06afd9b299e1550c38232fb843b974"),
    "ml": (f"{RAW}/blinskey/middle-liddell/5db8d88a20066e182ca3fc6ee758c9f61ac60603/Perseus_text_1999.04.0058.xml",
           "1b0e2ed672ac23399fbdb031b06119e7736ccefc78c229f6c9302b7c6348c811"),
    "dodson": (f"{RAW}/biblicalhumanities/Dodson-Greek-Lexicon/74f70358d4acfaf2f980bf2feb58ab7115cbbcbc/dodson.xml",
               "39c6cb8053ef0adeffac7bbec1d1bc4f96c69424f8e6668f19b4244d3f234639"),
}


def fetch(lex):
    url, sha = SOURCES[lex]
    out = DL / url.rsplit("/", 1)[1]
    if not out.exists():
        out.parent.mkdir(parents=True, exist_ok=True)
        print("downloading", out.name)
        req = urllib.request.Request(url, headers={"User-Agent": "COTEXT-pipeline/0.1 (Bible study app build)"})
        with urllib.request.urlopen(req, timeout=600) as r:
            data = r.read()
        if hashlib.sha256(data).hexdigest() != sha:
            raise SystemExit(f"{out.name}: not the pinned file (SHA-256 differs) - check the source, then update greek_lex.py")
        out.write_bytes(data)
    return out


# ---- Text ----

GRK = "[Ͱ-Ͽἀ-῿]"
RUN_GRK = re.compile(f"{GRK}[̀-ͯ]*(?:[\\s'’]*{GRK}[̀-ͯ]*)*")
RUN_HEB = re.compile("[֐-׿יִ-ﭏ]+(?:\\s+[֐-׿יִ-ﭏ]+)*")


def scripts(text):
    """Plain text as HTML: escaped, each run of Greek in <span class=grc>, of Hebrew in <span class=he>."""
    out, at = [], 0
    for m in sorted([*RUN_GRK.finditer(text), *RUN_HEB.finditer(text)], key=lambda m: m.start()):
        out.append(html.escape(text[at:m.start()], quote=False))
        cls = "he" if RUN_HEB.fullmatch(m.group()) else "grc"
        out.append(f'<span class="{cls}">{html.escape(m.group(), quote=False)}</span>')
        at = m.end()
    out.append(html.escape(text[at:], quote=False))
    return "".join(out)


def tidy(h):
    """Runs of white space as one space; none round a block's edges."""
    h = re.sub(r"\s+", " ", h).strip()
    return re.sub(r"\s*(<(?:div|/div|p|/p|table|/table|tr|/tr|td|/td)\b[^>]*>)\s*", r"\1", h)


BETA = dict(zip("abgdezhqiklmncoprstufxyw", "αβγδεζηθικλμνξοπρστυφχψω"), v="ϝ")
MARKS = {")": "̓", "(": "̔", "/": "́", "\\": "̀", "=": "͂", "+": "̈", "|": "ͅ",
         "_": "̄", "^": "̆"}
ORDER = "_^)(+/\\=|"     # (Combining order that composes: length, breathing, diaeresis, accent, iota subscript)
PUNCT = {":": "·", "'": "’", "#": "ʹ"}


def beta(s):
    """Perseus Beta Code as Unicode Greek: a-w letters, * a capital (its marks before the letter), ) ( breathings,
    / \\ = accents, + diaeresis, | iota subscript, s a final sigma at a word's end (s1 / s2 / s3 forced)."""
    out, i, n = [], 0, len(s)
    while i < n:
        c = s[i]
        cap = c == "*"
        if cap:
            i += 1
        marks = ""
        while cap and i < n and s[i] in MARKS:
            marks += s[i]; i += 1
        if i < n and s[i].lower() in BETA:
            c = s[i].lower(); i += 1
            while i < n and s[i] in MARKS:
                marks += s[i]; i += 1
            letter = BETA[c]
            if c == "s":
                if i < n and s[i] in "123":
                    letter = "σςϲ"["123".index(s[i])]; i += 1
                elif not (i < n and (s[i].lower() in BETA or s[i] == "*")):
                    letter = "ς"
            if cap:
                letter = letter.upper()
            out.append(unicodedata.normalize("NFC", letter + "".join(MARKS[m] for m in sorted(marks, key=ORDER.index))))
        elif cap:
            continue
        else:
            out.append(PUNCT.get(c, c)); i += 1
    return "".join(out)


def headword(t, accents=True):
    """A dictionary form as compared: its first word, NFC, grave as acute (and, with accents=False, no acute, grave
    or circumflex - breathings, diaeresis and iota subscript kept), lower case."""
    t = (re.split(r"[\s,.;·]+", t.strip()) or [""])[0]
    t = unicodedata.normalize("NFD", t).replace("̀", "́")
    if not accents:
        t = re.sub("[́͂]", "", t)
    t = re.sub(r"[^\ẁ-ͯ]|\d|_", "", t)
    return unicodedata.normalize("NFC", t).lower()


# ---- Each source's entries: [(Strong's numbers, headword, html)] ----

def tei(el, ns, rule):
    """A TEI element's content as HTML: rule(tag, el, body) wraps each child's (None: dropped); text runs through
    scripts() except inside a Greek or Hebrew span."""
    def walk(e, plain):
        out = [scripts(e.text or "") if plain else html.escape(e.text or "")]
        for c in e:
            if not isinstance(c.tag, str):     # (A comment)
                out.append(scripts(c.tail or "") if plain else html.escape(c.tail or ""))
                continue
            tag = c.tag.replace(ns, "")
            wrap = rule(tag, c)
            if wrap is not None:
                a, b = wrap
                out.append(a + walk(c, plain and "class=\"grc\"" not in a and "class=\"he\"" not in a) + b)
            out.append(scripts(c.tail or "") if plain else html.escape(c.tail or ""))
        return "".join(out)
    return walk(el, True)


def abbott():
    ns = "{http://www.crosswire.org/2013/TEIOSIS/namespace}"
    LANG = "{http://www.w3.org/XML/1998/namespace}lang"

    def rule(tag, c):
        if tag in ("note", "pb"):
            return None     # (NT occurrences, page breaks: not shown)
        if tag == "lb":
            return ("<br>", "")
        if tag == "orth":
            return ('<b><span class="grc">', "</span></b>")
        if tag == "foreign":
            lang = c.get(LANG)
            return (('<span class="grc">', "</span>") if lang == "grc" else
                    ('<span class="he">', "</span>") if lang in ("heb", "he", "arc") else ("<i>", "</i>"))
        if tag == "gloss":
            return ("<b>", "</b>")
        if tag in ("emph", "pos", "tns", "mood", "gram", "usg"):
            return ("<i>", "</i>")
        if tag == "sense":
            n = c.get("n")
            return (f'<div class="sense"><b>{html.escape(n)}</b> ', "</div>") if n else ("<div>", "</div>")
        if tag == "hi" and c.get("rend") == "superscript":
            return ("<sup>", "</sup>")
        if tag in ("re", "p"):
            return ("<div>", "</div>")
        if tag in ("table", "row", "cell"):
            t = {"table": "table", "row": "tr", "cell": "td"}[tag]
            return (f"<{t}>", f"</{t}>")
        return ("", "")     # (form, etym, seg, ref, gramGrp and the rest: their content)

    out = []
    for e in ET.parse(fetch("abbott")).getroot().iter(ns + "entry"):
        n = (e.get("n") or "").split("|")
        nums = [int(x[1:]) for x in n[1:] if re.fullmatch(r"G\d+", x)]
        out.append((nums, n[0], f'<div class="lexEntry">{tidy(tei(e, ns, rule))}</div>'))
    return out


def thayer():
    text = fetch("thayer").read_text(encoding="utf-8")
    out = []
    for m in re.finditer(r'<article class="e"[^>]*><div class="gk">(.*?)<span class="tr">.*?<span class="sn">G(\d+)</span></div>(.*?)</article>', text, re.S):
        head = html.unescape(m.group(1)).strip()
        paras = [html.unescape(p) for p in re.findall(r"<p>(.*?)</p>", m.group(3), re.S)]
        body = "".join(f"<p>{scripts(p.strip())}</p>" for p in paras)
        body = re.sub(r'^<p>(<span class="grc">[^<]*</span>)', r"<p><b>\1</b>", body)     # (The headword, first, bold)
        out.append(([int(m.group(2))], head, f'<div class="lexEntry">{tidy(body)}</div>'))
    return out


def ml():
    def text_of(e, greek):
        """An element's text and children as HTML; lang=greek (on it or above) its Beta Code converted."""
        greek = greek or e.get("lang") == "greek"
        conv = (lambda t: html.escape(beta(t))) if greek else scripts
        out = [conv(e.text or "")]
        for c in e:
            body = text_of(c, greek)
            if c.tag == "ref":
                body = re.sub(r"\d+", "", body)     # (A homograph's number: λέγω3 to the λέγω meant)
            g = c.get("lang") == "greek" and not greek
            if g:
                body = f'<span class="grc">{body}</span>'
            elif c.tag == "tr":
                body = f"<b>{body}</b>"
            elif c.tag in ("pos",) or (c.tag == "foreign" and c.get("lang") == "la"):
                body = f"<i>{body}</i>"
            elif c.tag == "usg":
                body = re.sub(r"^id=.*", "id.", body)     # (Perseus' "id=Il.": printed id.)
            out.append(body)
            out.append(conv(c.tail or ""))
        return "".join(out)

    out = []
    for e in ET.parse(fetch("ml")).getroot().iter("entry"):
        head = e.find("note[@type='alt']")
        orth = e.find("form/orth")
        word = beta(re.sub(r"\d+$", "", e.get("key") or ""))
        shown = re.sub(r"\d+", "", beta((head if head is not None else orth).text or word)).strip()     # (No homograph number)
        parts = [f'<b><span class="grc">{html.escape(shown)}</span></b> ']
        depth = []     # (The open senses' levels, outermost first)
        for c in e:
            if c.tag == "sense":
                level = int(c.get("level") or 0)
                while depth and depth[-1] >= level:
                    parts.append("</div>"); depth.pop()
                n = c.get("n") or "0"
                parts.append(f'<div class="sense"><b>{html.escape(n)}.</b> ' if n != "0" else "<div>")
                depth.append(level)
                parts.append(text_of(c, False))
            elif c.tag in ("form",) or c is head:
                continue
            elif c.tag == "etym":     # (The word it comes from, in brackets as Liddell and Scott print it)
                parts.append(f"[{text_of(c, False).strip()}] ")
            else:     # (A note - inflections, a usage: inline, before the senses)
                parts.append(text_of(c, False) + " ")
        parts += ["</div>"] * len(depth)
        out.append(([], word, f'<div class="lexEntry">{tidy("".join(parts))}</div>'))
    return out


def dodson():
    ns = "{http://www.crosswire.org/2008/TEIOSIS/namespace}"
    out = []
    for e in ET.parse(fetch("dodson")).getroot().iter(ns + "entry"):
        word, _, num = (e.get("n") or "").partition("|")
        orth = e.find(ns + "orth").text or ""
        full = e.find(ns + "def[@role='full']")
        body = f'<b><span class="grc">{html.escape(orth.strip())}</span></b>: {scripts((full.text or "") if full is not None else "")}'
        out.append(([int(num)] if num.strip().isdigit() else [], word.strip(), f'<div class="lexEntry">{tidy(body)}</div>'))
    return out


READERS = {"abbott": abbott, "thayer": thayer, "ml": ml, "dodson": dodson}


# ---- Strong's to entries ----

def pick(num, lemma, by_num, by_form):
    """The entries for a key (see the module's docstring): [entry index]."""
    cands = by_num.get(num, [])
    if len(cands) == 1:
        return cands
    for accents in (True, False):
        k = headword(lemma, accents)
        if cands:
            same = [i for i in cands if by_form[accents][i] == k]
            if same:
                return same
        elif k in by_form[accents]["index"]:
            return by_form[accents]["index"][k]
    return cands


def build(main_db):
    """Builds each lexicon's file and the main database's greek_lex and greek_lex_file tables from its lexicon's
    Greek keys. Returns {lexicon: (keys with an entry, entries, bytes)}."""
    keys = list(main_db.execute("SELECT strong, lemma FROM lexicon WHERE strong LIKE 'G%'"))
    main_db.executescript("""
        CREATE TABLE greek_lex (strong TEXT, lexicon TEXT, entries TEXT, PRIMARY KEY (strong, lexicon)) WITHOUT ROWID;
        CREATE TABLE greek_lex_file (lexicon TEXT PRIMARY KEY, file TEXT, version TEXT, bytes INTEGER);
    """)
    counts = {}
    for lex, read in READERS.items():
        entries = read()
        by_num = {}
        by_form = {a: {"index": {}} for a in (True, False)}
        for i, (nums, word, _) in enumerate(entries):
            for n in nums:
                by_num.setdefault(n, []).append(i)
            for a in (True, False):
                by_form[a][i] = headword(word, a)
                by_form[a]["index"].setdefault(by_form[a][i], []).append(i)
        rows = []
        for strong, lemma in keys:
            m = re.match(r"G(\d+)", strong)
            ids = pick(int(m.group(1)), lemma or "", by_num, by_form) if m else []
            if ids:
                rows.append((strong, lex, " ".join(str(i) for i in dict.fromkeys(ids))))
        used = sorted({int(i) for r in rows for i in r[2].split()})
        out = NOTES / f"{lex}.db"
        out.parent.mkdir(parents=True, exist_ok=True)
        tmp = out.with_suffix(".tmp")
        tmp.unlink(missing_ok=True)
        db = sqlite3.connect(tmp)
        db.executescript("PRAGMA page_size = 4096; CREATE TABLE entries (id INTEGER PRIMARY KEY, html TEXT);")     # (Rowid: rows this long sit badly in a WITHOUT ROWID table)
        db.executemany("INSERT INTO entries VALUES (?,?)", [(i, entries[i][2]) for i in used])
        db.commit()
        db.execute("VACUUM")
        db.close()
        tmp.replace(out)
        data = out.read_bytes()
        main_db.executemany("INSERT INTO greek_lex VALUES (?,?,?)", rows)
        main_db.execute("INSERT INTO greek_lex_file VALUES (?,?,?,?)",
                        (lex, f"data/notes/{lex}.db", hashlib.sha256(data).hexdigest()[:12], len(data)))
        counts[lex] = (len(rows), len(used), len(data))
    return counts
