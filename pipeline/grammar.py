"""The grammars a word's parsing links to: their sections, and which section explains each term of a parsing.

Sources (digital text, not scans), fetched once into pipeline/downloads/ and pinned:
  Gesenius' Hebrew Grammar, ed. Kautzsch, tr. Cowley (2nd English edition, 1910) - public domain; the English
    Wikisource transcription, one page per section (1-167, 84a and 84b). Pinned by each page's revision id in
    gesenius_revisions.json (written by the first fetch, then reused). A page's text is transcluded from its
    proofread scan pages, which the revision id doesn't pin: the sections' texts are hashed into the same file and a
    change is reported.
  Smyth's A Greek Grammar for Colleges (1920) - the Perseus Digital Library's TEI edition (text 1999.04.0007), CC BY-SA
    3.0 US (Perseus's texts' licence): credit and share-alike apply to the grammar's data in the database. Its Greek
    is Beta Code, turned into Unicode here. Pinned by the file's SHA-256.
  Machen's New Testament Greek for Beginners (1923) - public domain in the US; the transcription at machengreek.com
    (from the Internet Archive's scan, Greek in Unicode), one page per lesson (0-33: the Introduction and Lessons
    I-XXXIII; not the paradigms or vocabularies at the back). Only the book's text is taken - the site's own summary
    boxes, vocabularies, drills and answers are left out. Pinned by each lesson's text's SHA-256 in machen_pins.json
    (written by the first fetch). The transcription has OCR slips and leaves out some of the book's tables ("A table
    appears here in the book").

Not found as clean, open digital text (scans or poor OCR only): Goodwin's Greek Grammar, Nunn's Elements of New
Testament Greek, Davidson's Introductory Hebrew Grammar, Harper's Elements of Hebrew.

Tables (made by build(), in the main database):
  grammars          id ('gesenius', 'smyth', 'machen'), name (as the panel shows it), lang ('H' / 'G'), credit;
                    its rowid GRAMMARS' order, the order GRAMMAR lists them (a language's first the default)
  grammar_sections  grammar, seq (its order), label (the section's number: '43', '84a', '1889'), heading, body
                    (HTML: <p>, <b>, <i>, <table>/<tr>/<td>, <span class=he|grc> round Hebrew / Greek; nothing else)
  grammar_terms     key (a parsing term: 'heb:stem:qal', 'grc:mood:subjunctive'...), grammar, part, first, last
                    (seqs: the sections shown) - a key may have several rows, its parts (shown in order); a term
                    with no good section in a grammar has none there
  parsings.terms    (a column added to build_db's table) JSON [[start, end, key], ...]: where each term sits in the
                    spelled-out parsing, in UTF-16 offsets as the browser counts them
"""
import hashlib
import html
import html.parser
import json
import pathlib
import re
import time
import unicodedata
import urllib.parse
import urllib.error
import urllib.request

HERE = pathlib.Path(__file__).parent
DOWNLOADS = HERE / "downloads"
PIN_GESENIUS = HERE / "gesenius_revisions.json"
PIN_MACHEN = HERE / "machen_pins.json"
UA = {"User-Agent": "COTEXT-pipeline/0.1 (Bible study app build; one-off fetch)"}

# ---- Fetching ----

WIKI_API = "https://en.wikisource.org/w/api.php"
GESENIUS_PREFIX = "Gesenius' Hebrew Grammar/"

SMYTH_URL = "http://www.perseus.tufts.edu/hopper/dltext?doc=Perseus%3Atext%3A1999.04.0007"
SMYTH_SHA256 = "19ee6f953d5b69749605db48772fb5f05eab766d3f5ef59bf279a1ba04e7965f"   # fetched 2026-11-02


def _get(url, params=None, data=None, tries=6):
    """A URL's bytes; a busy server (429, 5xx) or a dropped connection is tried again, waiting longer each time."""
    if params:
        url += "?" + urllib.parse.urlencode(params)
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, data=data, headers=UA), timeout=600) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if i == tries - 1 or (e.code != 429 and e.code < 500):
                raise
            time.sleep(int(e.headers.get("Retry-After") or 0) or 15 * (i + 1))
        except OSError:
            if i == tries - 1:
                raise
            time.sleep(5 * (i + 1))


def _api(**params):
    """A Wikisource API query; a server error (they come and go) is tried again a few times."""
    for i in range(5):
        q = json.loads(_get(WIKI_API, {**params, "format": "json", "formatversion": "2"}))
        if "error" not in q or i == 4:
            return q
        time.sleep(5)


def _wiki_batch(key, values, prop="content|ids"):
    """{title: (revid, wikitext)} for titles or revids, 50 a request."""
    out = {}
    for i in range(0, len(values), 50):
        cont = {}
        while True:      # (A batch too big for one response is continued)
            q = _api(action="query", prop="revisions", rvprop=prop, rvslots="main",
                     **{key: "|".join(str(v) for v in values[i:i + 50])}, **cont)
            if "query" not in q:
                raise SystemExit(f"Wikisource: {q.get('error', q)}")
            for page in q["query"]["pages"]:
                for r in page.get("revisions", []):
                    if "content" in r["slots"]["main"]:
                        out[page["title"]] = (r["revid"], r["slots"]["main"]["content"])
            time.sleep(1)
            if "continue" not in q:
                break
            cont = q["continue"]
    return out


def _bible_ref(m):
    """{{GHGbible-ref|book=Gn|chapter=18|verse=15}} -> Gn 18<sup>15</sup>, as the printed book has it. (Wikisource's
    own template drops the verse - Module:GHG tests `if not verse` - so the reference is written out here.)"""
    a = dict(p.split("=", 1) for p in m.group(1).split("|") if "=" in p)
    a = {k.strip(): v.strip() for k, v in a.items()}
    book = {"Ps": "ψ", "PsPs": "ψψ"}.get(a.get("book", ""), a.get("book", ""))
    hide, verse, ch = a.get("hidebook"), a.get("verse"), a.get("chapter", "")
    if hide == "completely":
        ref = ""
    elif hide and hide.startswith("v"):
        ref = hide + "."
    elif hide:
        ref = ch
    else:
        ref = book + "&thinsp;" + ("" if book == "Ob" else ch)     # (Obadiah: one chapter, the verse only)
    if verse:
        ref += verse if a.get("fullsizeverse") else f"<sup>{verse}</sup>"
    return ref


def _section_wikitext(label, first, last, section, pages):
    """The section's wikitext from its scan pages: from <section begin=parN/> to <section end=parN/>, the chapter
    titles before its heading and the heading itself dropped (the panel shows the heading), references written out."""
    text = ""
    for n in range(first, last + 1):
        t = re.sub(r"<noinclude>.*?</noinclude>", "", pages[n], flags=re.S)
        if n == first:
            m = re.search(rf'<section begin="?{section}"? */>', t)
            t = t[m.end():] if m else t
        if n == last:
            m = re.search(rf'<section end="?{section}"? */>', t)
            t = t[:m.start()] if m else t
        # A page's last paragraph runs on into the next page's first: joined by a space, the pages' own edges (and
        # their section marks) trimmed first - a line starting with a space would be wikitext's preformatted block.
        text += re.sub(r"<section [^>]*/>", "", t).strip() + " "
    at = text.find("{{GHGpar-heading")
    if at >= 0:      # (Cut after the heading's template, which can hold others: its braces counted)
        depth, i = 0, at
        while i < len(text):
            if text.startswith("{{", i):
                depth, i = depth + 1, i + 2
            elif text.startswith("}}", i):
                depth, i = depth - 1, i + 2
                if depth == 0:
                    break
            else:
                i += 1
        text = text[i:]
    text = re.sub(r"\{\{GHGbible-ref\|([^{}]*)\}\}", _bible_ref, text)
    return text + "\n{{reflist}}\n"


SCAN = "Page:Gesenius' Hebrew Grammar (1910 Kautzsch-Cowley edition).djvu/"
SCAN_OFFSET = 24      # (The book's page n is the scan's page n + 24: GHGpages' from / to are book pages)


def fetch_gesenius():
    """Each section rendered into downloads/gesenius/<label>.html: the section pages' and scan pages' wikitext, at their
    pinned revisions (kept in wikitext.json), put together here and rendered by Wikisource's parser. Returns
    {label: (heading, html file)}."""
    out = DOWNLOADS / "gesenius"
    out.mkdir(parents=True, exist_ok=True)
    cache = out / "wikitext.json"
    if cache.exists():
        sections, scans = json.loads(cache.read_text(encoding="utf-8"))
        scans = {int(k): v for k, v in scans.items()}
    else:
        print("downloading Gesenius (Wikisource)")
        pins = json.loads(PIN_GESENIUS.read_text()) if PIN_GESENIUS.exists() else {}
        if pins.get("sections"):
            main = _wiki_batch("revids", list(pins["sections"].values()))
        else:      # first fetch: the section pages (titled "43. Its Form and Meaning"; bare numbers redirect)
            pages = _api(action="query", list="allpages", apprefix=GESENIUS_PREFIX, aplimit="500")["query"]["allpages"]
            titles = [p["title"] for p in pages if re.match(r"\d+[ab]?\. ", p["title"][len(GESENIUS_PREFIX):])]
            main = _wiki_batch("titles", titles)
        sections = {}
        for title, (rev, text) in main.items():
            label = re.match(r"\d+[ab]?", title[len(GESENIUS_PREFIX):]).group()
            heading = re.search(r"\|\s*section\s*=\s*([^\n|]*)", text).group(1).strip()
            g = re.search(r"\{\{GHGpages\|from=(\d+)\|to=(\d+)\|section=([^}|]+)\}\}", text)
            sections[label] = (title, rev, heading, int(g.group(1)) + SCAN_OFFSET, int(g.group(2)) + SCAN_OFFSET,
                               g.group(3))
        needed = sorted({n for (_, _, _, a, b, _) in sections.values() for n in range(a, b + 1)})
        if pins.get("scans"):
            got = _wiki_batch("revids", [pins["scans"][str(n)] for n in needed])
        else:
            got = _wiki_batch("titles", [SCAN + str(n) for n in needed])
        scans = {int(t.rsplit("/", 1)[1]): v for t, v in got.items()}
        cache.write_text(json.dumps([sections, scans], ensure_ascii=False), encoding="utf-8")
        if not pins.get("sections"):
            order = sorted(sections.values(), key=lambda s: _seq_key(s[0][len(GESENIUS_PREFIX):]))
            pins = {"sections": {t: rev for (t, rev, *_) in order}, "scans": {str(n): scans[n][0] for n in needed}}
            PIN_GESENIUS.write_text(json.dumps(pins, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    result = {}
    for label in sorted(sections, key=_seq_key):
        title, _, heading, a, b, sec = sections[label]
        f = out / f"{label}.html"
        if not f.exists():
            print("rendering Gesenius §" + label)
            wikitext = _section_wikitext(label, a, b, sec, {n: scans[n][1] for n in range(a, b + 1)})
            body = urllib.parse.urlencode({"action": "parse", "format": "json", "formatversion": "2", "prop": "text",
                                           "contentmodel": "wikitext", "title": title, "text": wikitext}).encode()
            f.write_text(json.loads(_get(WIKI_API, data=body))["parse"]["text"], encoding="utf-8")
            time.sleep(1)
        # The heading: the page's title ("86. Denominative Nouns"), or its header's fuller form when that ends with it
        # ("The Pure Stem, or Qal: Its Form and Meaning") - a header can be wrong (86's repeats 85's).
        own = title[len(GESENIUS_PREFIX):].split(". ", 1)[1]
        result[label] = (heading if heading.endswith(own) else own, f)
    return result


def fetch_smyth():
    f = DOWNLOADS / "smyth.xml"
    if not f.exists():
        print("downloading Smyth (Perseus, about 6 MB)")
        DOWNLOADS.mkdir(exist_ok=True)
        f.write_bytes(_get(SMYTH_URL))
    got = hashlib.sha256(f.read_bytes()).hexdigest()
    if got != SMYTH_SHA256:
        raise SystemExit(f"{f}: not the pinned Smyth (sha256 {got}). Delete it to fetch again, or check the new "
                         "file and pin its hash in grammar.py's SMYTH_SHA256.")
    return f


MACHEN_URL = "https://machengreek.com/lesson/{}/"
MACHEN_LESSONS = range(34)       # (0: the Introduction; 1-33: Lessons I-XXXIII)


def _machen_text(page):
    """A lesson page's book text: its prose and the notes after it (what's pinned and parsed)."""
    a = page.index('<div class="prose">')
    return page[a:page.index("</section>", a)]


def fetch_machen():
    """Each lesson's page into downloads/machen/<n>.html; its text checked against machen_pins.json (written by the
    first fetch). Returns {lesson: html}."""
    out = DOWNLOADS / "machen"
    out.mkdir(parents=True, exist_ok=True)
    pins = json.loads(PIN_MACHEN.read_text()) if PIN_MACHEN.exists() else {}
    pages = {}
    for n in MACHEN_LESSONS:
        f = out / f"{n}.html"
        if not f.exists():
            print(f"downloading Machen, lesson {n}")
            f.write_bytes(_get(MACHEN_URL.format(n)))
            time.sleep(1)
        pages[n] = f.read_text(encoding="utf-8")
    got = {str(n): hashlib.sha256(_machen_text(p).encode()).hexdigest() for n, p in pages.items()}
    if not pins:
        PIN_MACHEN.write_text(json.dumps(got, indent=1) + "\n", encoding="utf-8")
    elif got != pins:
        bad = [n for n in got if got[n] != pins.get(n)]
        raise SystemExit(f"Machen: lessons {', '.join(bad)} not as pinned (machen_pins.json). Delete their files in "
                         f"{out} to fetch again, or check the new text and its hashes into machen_pins.json.")
    return pages


def _seq_key(label):
    m = re.match(r"(\d+)([a-z]?)", label)
    return (int(m.group(1)), m.group(2))


# ---- Text clean-up shared by both ----

HEB = r"֑-״יִ-ﭏ"
GRK = r"Ͱ-Ͽἀ-῿"
# A run of Hebrew (or Greek) words: letters and marks, with the spaces and punctuation between its words.
RUNS = re.compile(rf"([{HEB}][{HEB}̀-ͯ\s\-־.,;·׃]*[{HEB}])|([{HEB}])|"
                  rf"([{GRK}][{GRK}̀-ͯ\s’'.,;·]*[{GRK}̀-ͯ])|([{GRK}])")


def mark_scripts(text_html):
    """Wraps Hebrew and Greek runs (in text, not inside tags) in <span class=he> / <span class=grc>, for their fonts."""
    def wrap(m):
        s = m.group(0)
        return f'<span class="{"he" if m.group(1) or m.group(2) else "grc"}">{s}</span>'
    parts = re.split(r"(<[^>]*>)", text_html)
    return "".join(p if p.startswith("<") else RUNS.sub(wrap, p) for p in parts)


def tidy(body):
    """Whitespace collapsed, empty paragraphs dropped."""
    body = re.sub(r"[ \t\r\n]+", " ", body)
    body = re.sub(r"\s*(</?(?:p|table|tr|td)>)\s*", r"\1", body)
    body = re.sub(r"<p>(\s|<br>)+", "<p>", body)
    body = re.sub(r"<p></p>", "", body)
    body = re.sub(r"<p>(<table>.*?</table>)</p>", r"\1", body)
    return body.strip()


# ---- Gesenius (Wikisource HTML) ----

class _GesParser(html.parser.HTMLParser):
    """A rendered section as COTEXT's light HTML. Skipped: styles, page numbers, citation brackets and back-links. Each
    margin letter (a, b, c... - what "§43c" points to) kept, bold, as its paragraph's mark; footnotes kept at the end,
    numbered as their marks in the text. (Machen's lessons go through it too: their tags are a subset.)"""

    KEEP = {"p": "p", "i": "i", "em": "i", "b": "b", "strong": "b", "table": "table", "tr": "tr", "td": "td",
            "th": "td", "br": "br", "sup": "sup", "sub": "sub"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out = []
        self.stack = []          # per open element: (tag, skipping?, emitted end tag or None)
        self.skip = 0
        self.notes = 0           # footnotes read so far (0: not in the list)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        cls = a.get("class", "") or ""
        void = tag in ("br", "link", "img", "meta", "hr", "input", "wbr")
        skip = (tag in ("style", "script") or "ws-noexport" in cls or "pagenum" in cls or "cite-bracket" in cls
                or "mw-cite-backlink" in cls or "noprint" in cls or a.get("id") == "dynamic_layout_overrider")
        if "references" in cls and tag == "ol" and not self.skip:
            self.notes = 1
            self.out.append("<p><b>Notes</b></p>")
        end = None
        if not self.skip and not skip:
            if tag in self.KEEP:
                t = self.KEEP[tag]
                self.out.append(f"<{t}>")
                end = None if t == "br" else f"</{t}>"
            elif tag == "li" and self.notes:
                self.out.append(f"<p><sup>{self.notes}</sup> ")
                self.notes += 1
                end = "</p>"
            elif "wst-sidenote" in cls and "inner" not in cls:
                self.out.append("<b>")
                end = "</b> "
        if void:
            return
        if skip:
            self.skip += 1
        self.stack.append((tag, skip, end))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if self.stack and self.stack[-1][0] == tag:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if all(t != tag for t, *_ in self.stack):
            return
        while self.stack:
            t, skip, end = self.stack.pop()
            if skip:
                self.skip -= 1
            elif end and not self.skip:
                self.out.append(end)
            if t == tag:
                break

    def handle_data(self, data):
        if self.skip:
            return
        self.out.append(html.escape(data, quote=False))


def gesenius_sections(fetched):
    """[(label, heading, body)] in the grammar's order, from fetch_gesenius()'s result."""
    rows = []
    for label, (heading, f) in fetched.items():
        p = _GesParser()
        p.feed(f.read_text(encoding="utf-8"))
        body = tidy("".join(p.out))
        # The section's own "§44. Flexion of the Perfect of Qal." line goes (the panel shows the heading); text
        # before the first paragraph gets one; a margin letter left on a line of its own joins its paragraph.
        body = re.sub(r"^§\s*" + re.escape(label) + r"\..*?(?=<p>|$)", "", body, count=1)
        body = re.sub(r"^([^<].*?)(?=<p>|$)", r"<p>\1</p>", body, count=1)
        body = re.sub(r"<p><b>([a-z]{1,2})</b></p><p>", r"<p><b>\1</b> ", body)
        rows.append((label, heading, mark_scripts(body)))
    return rows


# ---- Machen (machengreek.com's lesson pages) ----

def machen_sections(pages):
    """[(label, heading, body)] in the book's order: each <article> of a lesson's prose a § (its number its label), the
    lesson's title its heading. The site's own summary boxes (<details> with no table - lists restating the text) go;
    a box holding one of the book's tables keeps the table, its caption a line in italics before it. Each footnote
    goes to the end of its section, numbered as its mark; links to the site's paradigms go."""
    rows = []
    for n in MACHEN_LESSONS:
        page = pages[n]
        heading = html.unescape(re.sub(r"<[^>]+>", "", re.search(r"<h1>(.*?)</h1>", page, re.S).group(1))).strip()
        text = _machen_text(page)
        notes = {}
        for sec, k, note in re.findall(r'<li id="note-(\d+)-(\d+)"[^>]*>(.*?)</li>', text, re.S):
            note = re.sub(r'<a class="footnotes__back".*?</a>', "", note, flags=re.S).strip()
            notes.setdefault(sec, []).append(f"<p><sup>{k}</sup> {re.sub(r'</?p>', '', note)}</p>")
        for art in re.findall(r'<article class="prose__section">(.*?)</article>', text, re.S):
            label = re.search(r'<h3 class="prose__number">§(\d+)', art).group(1)
            art = re.sub(r"<h3 .*?</h3>", "", art, count=1, flags=re.S)
            art = re.sub(r"<details(?:(?!<table).)*?</details>", "", art, flags=re.S)
            art = re.sub(r"<summary>.*?</summary>", "", art, flags=re.S)
            art = re.sub(r"<figcaption>(.*?)</figcaption>", r"<p><i>\1</i></p>", art, flags=re.S)
            art = re.sub(r'\s*(?:—\s*)?<a [^>]*prose__omitted-link[^>]*>.*?</a>', "", art, flags=re.S)
            art = re.sub(r'<a class="notemark"[^>]*>(\d+)</a>', r"<sup>\1</sup>", art)
            p = _GesParser()
            p.feed(art + "".join(notes.get(label, [])))
            body = tidy("".join(p.out))
            body = re.sub(r"\$(?=\d)", "§", body)            # (an OCR slip: "see $51" for "see §51")
            rows.append((label, heading, mark_scripts(body)))
    return rows


# ---- Smyth (Perseus TEI, Beta Code Greek) ----

BETA = dict(zip("abgdezhqiklmncoprstufxyw", "αβγδεζηθικλμνξοπρστυφχψω"))
MARKS = {")": "̓", "(": "̔", "/": "́", "\\": "̀", "=": "͂", "+": "̈", "|": "ͅ",
         "&": "̄", "'": "’"}
ORDER = {"̓": 0, "̔": 0, "̈": 1, "́": 2, "̀": 2, "͂": 2, "̄": 2, "ͅ": 3}


def beta_to_greek(s):
    """Perseus Beta Code -> Unicode Greek: a)/nqrwpos -> ἄνθρωπος, *)/anqrwpos -> Ἄνθρωπος. Final sigma by position;
    _ and ^ (vowel length) dropped; marks put in Unicode's order and composed (NFC)."""
    out = []
    i, n = 0, len(s)
    while i < n:
        c = s[i]
        if c == "*":                               # capital: its marks come first, then the letter
            j = i + 1
            marks = ""
            while j < n and s[j] in ")(/\\=+|":
                marks += s[j]
                j += 1
            if j < n and s[j].lower() in BETA:
                out.append(BETA[s[j].lower()].upper() + "".join(sorted((MARKS[m] for m in marks), key=ORDER.get)))
                i = j + 1
                continue
            i += 1
            continue
        low = c.lower()
        if low in BETA:
            ch = BETA[low]
            j = i + 1
            if low == "s" and j < n and s[j] in "123":
                ch = {"1": "σ", "2": "ς", "3": "ϲ"}[s[j]]
                j += 1
            marks = []
            while j < n and s[j] in ")(/\\=+|_^&":
                if s[j] in MARKS:
                    marks.append(MARKS[s[j]])
                j += 1
            if ch == "σ" and not (j < n and (s[j].lower() in BETA)) and s[i + 1:j].strip("123") == s[i + 1:j]:
                ch = "ς"                           # (no letter follows: the word's end)
            out.append(ch + "".join(sorted(marks, key=ORDER.get)))
            i = j
            continue
        if c == ":":
            out.append("·")
        elif c in "_^":
            pass
        elif c == "'":
            out.append("’")
        else:
            out.append(c)
        i += 1
    return unicodedata.normalize("NFC", "".join(out))


class _SmythParser(html.parser.HTMLParser):
    """Splits the TEI into sections at each <milestone unit="smythp">: its number, the innermost heading over it, its
    text. Greek (lang="greek") is converted; a dialect note's milestone ("3 D") stays in the section before it.
    Kept: paragraphs, bold / italic, tables; glosses in italics (as the printed book sets them); references to other
    sections as § numbers; page breaks and the bibliography tags' extra attributes dropped."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.sections = []       # [label, heading, [html parts]]
        self.heads = []          # the open divs' headings (None until their <head> is read)
        self.greek = 0
        self.in_head = False
        self.head = ""
        self.in_body = False
        self.stack = []

    def _emit(self, s):
        if self.sections and not self.in_head:
            self.sections[-1][2].append(s)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "body":
            self.in_body = True
        if not self.in_body:
            return
        end = None
        if tag.startswith("div") and tag[3:].isdigit():
            self.heads.append(None)
            end = "/div"
        elif tag == "head":
            self.in_head, self.head = True, ""
        elif tag == "milestone" and a.get("unit") == "smythp":
            label = a.get("n", "")
            if re.fullmatch(r"\d+", label):
                heading = next((h for h in reversed(self.heads) if h), "")
                self.sections.append([label, heading, []])
            return
        elif tag in ("pb", "milestone"):
            return
        elif tag == "p":
            self._emit("<p>")
            end = "</p>"
        elif tag == "emph" or tag == "hi":
            t = "b" if a.get("rend") == "bold" else "i"
            self._emit(f"<{t}>")
            end = f"</{t}>"
        elif tag in ("gloss", "title"):
            self._emit("<i>")
            end = "</i>"
        elif tag == "table":
            self._emit("<table>")
            end = "</table>"
        elif tag == "row":
            self._emit("<tr>")
            end = "</tr>"
        elif tag == "cell":
            self._emit("<td>")
            end = "</td>"
        elif tag == "ref":
            self._emit("§")
        if a.get("lang") == "greek":
            self.greek += 1
            end = (end or "") + "\x00greek"
        self.stack.append((tag, end))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if self.stack and self.stack[-1][0] == tag:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if not self.in_body or all(t != tag for t, _ in self.stack):
            return
        while self.stack:
            t, end = self.stack.pop()
            if end and end.endswith("\x00greek"):
                self.greek -= 1
                end = end[:-6]
            if end == "/div":
                self.heads.pop()
            elif end:
                self._emit(end.rstrip("\x00"))
            if t == tag:
                break
        if tag == "head":
            self.in_head = False
            h = re.sub(r"\s+", " ", self.head).strip()
            if self.heads:
                self.heads[-1] = _heading_case(h)

    def handle_data(self, data):
        if not self.in_body:
            return
        text = beta_to_greek(data) if self.greek else data
        if self.in_head:
            self.head += text
        else:
            self._emit(html.escape(text, quote=False))


def _heading_case(h):
    """'TENSES OF THE INDICATIVE' -> 'Tenses of the indicative' (headings in capitals); others as they are."""
    latin = re.sub(r"[^A-Za-z]", "", h)
    return h[:1] + h[1:].lower() if latin and latin.isupper() else h


def smyth_sections(path):
    """[(label, heading, body)]: the heading each section is printed under ("Imperfect"; its own bold lead, as
    "Reflexive Pronouns.—", starts its text)."""
    p = _SmythParser()
    p.feed(path.read_text(encoding="utf-8"))
    rows = []
    for label, heading, parts in p.sections:
        body = tidy("".join(parts))
        rows.append((label, heading, mark_scripts(body)))
    return rows


# ---- The parsing's terms and their sections ----
#
# A term's key names what it is in its context: the same word can want a different section (a Hebrew verb's person,
# gender and number - its endings - are in the perfect's flexion or the imperfect's; a suffix on a verb, a noun or a
# preposition each has its own section). Each key maps, per grammar, to one or more ranges of sections, shown in
# order. Every range was checked against the fetched text: the comment is the first section's heading.

GESENIUS_MAP = {
    "heb:stem:qal": [("43", "43")],                    # The Pure Stem, or Qal: Its Form and Meaning
    "heb:stem:qal passive": [("52", "52")],            # Piʿēl and Puʿal (52e: the remains of a passive of Qal)
    "heb:stem:niphal": [("51", "51")],                 # Niphʿal
    "heb:stem:piel": [("52", "52")],                   # Piʿēl and Puʿal
    "heb:stem:pual": [("52", "52")],
    "heb:stem:hiphil": [("53", "53")],                 # Hiphʿîl and Hophʿal
    "heb:stem:hophal": [("53", "53")],
    "heb:stem:hithpael": [("54", "54")],               # Hithpaʿēl
    "heb:stem:other": [("55", "55")],                  # Less Common Conjugations (Pôʿēl, Pilpēl, Hithpôʿēl...)
    "heb:form:perfect": [("44", "44"), ("106", "106")],            # Flexion of the Perfect of Qal; Use of the Perfect
    "heb:form:imperfect": [("47", "47"), ("107", "107")],          # The Imperfect and its Inflexion; Use of the Imperfect
    "heb:form:weqatal": [("49", "49"), ("112", "112")],            # Perfect and Imperfect with Wāw Consecutive; Perfect with Wāw Consecutive
    "heb:form:wayyiqtol": [("49", "49"), ("111", "111")],          # ...; The Imperfect with Wāw Consecutive
    "heb:form:weyiqtol": [("107", "107")],                         # Use of the Imperfect
    "heb:form:cohortative": [("48", "48"), ("108", "108")],        # Shortening and Lengthening...; Use of the Cohortative
    "heb:form:jussive": [("48", "48"), ("109", "109")],            # ...; Use of the Jussive
    "heb:form:imperative": [("46", "46"), ("110", "110")],         # The Imperative (forms; use)
    "heb:form:participle": [("50", "50"), ("116", "116")],         # The Participle; The Participles
    "heb:form:infinitive absolute": [("45", "45"), ("113", "113")],   # The Infinitive; The Infinitive Absolute
    "heb:form:infinitive construct": [("45", "45"), ("114", "114")],  # The Infinitive; The Infinitive Construct
    "heb:pgn:perfect": [("44", "44")],                 # Flexion of the Perfect of Qal (its endings)
    "heb:pgn:imperfect": [("47", "47")],               # The Imperfect and its Inflexion
    "heb:pgn:imperative": [("46", "46")],              # The Imperative
    "heb:suffix:perfect": [("58", "59")],              # The Pronominal Suffixes of the Verb; The Perfect with Pronominal Suffixes
    "heb:suffix:imperfect": [("58", "58"), ("60", "60")],          # ...; Imperfect with Pronominal Suffixes
    "heb:suffix:verbal noun": [("61", "61")],          # Infinitive, Imperative and Participle with Pronominal Suffixes
    "heb:suffix:noun": [("91", "91")],                 # The Noun with Pronominal Suffixes
    "heb:suffix:particle": [("103", "103")],           # Prepositions with Pronominal Suffixes...
    "heb:paragogic he:verb": [("48", "48")],           # Shortening and Lengthening of the Imperfect and Imperative
    "heb:paragogic he:noun": [("90", "90")],           # Real and Supposed Remains of Early Case-endings
    "heb:directional he": [("90", "90")],
    "heb:paragogic nun": [("47", "47")],               # The Imperfect and its Inflexion (47m: Nûn paragogicum)
    "heb:article": [("35", "35"), ("126", "126")],     # The Article; Determination by Means of the Article
    "heb:preposition with the article": [("35", "35"), ("102", "102")],   # The Article; Prefixed Prepositions
    "heb:preposition:prefix": [("102", "102")],        # Prefixed Prepositions
    "heb:preposition": [("101", "101")],               # Prepositions
    "heb:conjunction": [("104", "104")],               # Conjunctions
    "heb:interrogative": [("100", "100"), ("150", "150")],          # Adverbs (100i-n: interrogative ה); Interrogative Sentences
    "heb:gender": [("80", "80"), ("122", "122")],      # The Indication of Gender in Nouns; Indication of the Gender of the Noun
    "heb:gender:either": [("122", "122")],
    "heb:plural": [("87", "87"), ("124", "124")],      # Of the Plural; The Various Uses of the Plural-form
    "heb:dual": [("88", "88")],                        # Of the Dual
    "heb:construct": [("89", "89"), ("128", "128")],   # The Genitive and the Construct State; ... by means of the Construct State
    "heb:noun": [("79", "79")],                        # The Noun. General View
    "heb:adjective": [("132", "132")],                 # Connexion of the Substantive with the Adjective
    "heb:cardinal": [("97", "97"), ("134", "134")],    # Numerals. (a) Cardinal Numbers; Syntax of the Numerals
    "heb:ordinal": [("98", "98")],                     # Numerals. (b) Ordinal Numbers
    "heb:gentilic": [("86", "86")],                    # Denominative Nouns (86h: gentilics)
    "heb:proper name": [("125", "125")],               # Determination of Nouns in general. Determination of Proper Names
    "heb:personal pronoun": [("32", "32"), ("135", "135")],         # The Personal Pronoun. The Separate Pronoun; The Personal Pronoun
    "heb:demonstrative": [("34", "34"), ("136", "136")],            # The Demonstrative Pronoun (forms; use)
    "heb:interrogative pronoun": [("37", "37"), ("137", "137")],    # The Interrogative and Indefinite Pronouns; The Interrogative Pronouns
    "heb:indefinite pronoun": [("37", "37")],
    "heb:relative": [("36", "36"), ("138", "138")],    # The Relative Pronoun (forms; use)
    "heb:negative": [("152", "152")],                  # Negative Sentences
    "heb:object marker": [("117", "117")],             # The Direct Subordination of the Noun to the Verb as Accusative of the Object
    "heb:interjection": [("105", "105")],              # Interjections
    "heb:adverb": [("100", "100")],                    # Adverbs
}

SMYTH_MAP = {
    "grc:tense:present:ind": [("1875", "1888")],       # Present indicative
    "grc:tense:imperfect:ind": [("1889", "1909")],     # Imperfect
    "grc:tense:future:ind": [("1910", "1922")],        # Future indicative
    "grc:tense:aorist:ind": [("1923", "1944")],        # Aorist indicative
    "grc:tense:perfect:ind": [("1945", "1951")],       # Perfect indicative
    "grc:tense:pluperfect:ind": [("1952", "1954")],    # Pluperfect
    "grc:tense:other": [("1859", "1874")],             # The tenses outside of the indicative
    "grc:second": [("554", "554")],                    # Note on the second aorist and second perfect
    "grc:voice:active": [("1703", "1712")],            # Active voice
    "grc:voice:middle": [("1713", "1734")],            # Middle voice
    "grc:voice:passive": [("1735", "1758")],           # Passive voice
    "grc:voice:middle or passive": [("356", "356")],   # Voices (356b: the passive borrows the middle's forms but two)
    "grc:voice:middle deponent": [("810", "810")],     # Middle Deponents
    "grc:voice:passive deponent": [("811", "812")],    # Passive Deponents
    "grc:voice:middle or passive deponent": [("810", "813")],
    "grc:mood:indicative": [("1770", "1794")],         # Indicative without ἄν; with ἄν
    "grc:mood:subjunctive": [("1795", "1813")],        # Subjunctive without ἄν; with ἄν
    "grc:mood:optative": [("1814", "1834")],           # Optative without ἄν; with ἄν
    "grc:mood:imperative": [("1835", "1844")],         # Imperative
    "grc:mood:infinitive": [("1966", "1971")],         # The infinitive
    "grc:mood:participle": [("2039", "2048")],         # The participle
    "grc:person": [("1016", "1017")],                  # Peculiarities in the use of person
    "grc:number": [("996", "1012")],                   # Peculiarities in the use of number
    "grc:gender": [("1013", "1015")],                  # Peculiarities in the use of gender
    "grc:case:nominative": [("938", "943")],           # Case of the subject: the nominative
    "grc:case:genitive": [("1289", "1296")],           # Genitive
    "grc:case:dative": [("1450", "1459")],             # Dative
    "grc:case:accusative": [("1551", "1562")],         # Accusative
    "grc:case:vocative": [("1283", "1288")],           # Vocative
    "grc:article": [("332", "332"), ("1118", "1121")],              # The Definite Article; ὁ, ἡ, τό as an article in Attic
    "grc:noun": [("194", "204")],                      # Declension
    "grc:adjective": [("1018", "1020")],               # Adjectives
    "grc:personal pronoun": [("325", "326"), ("1190", "1195")],     # The Personal Pronouns; The personal pronouns
    "grc:possessive pronoun": [("330", "330"), ("1196", "1203")],   # Possessive Pronouns
    "grc:reflexive pronoun": [("329", "329"), ("1218", "1232")],    # Reflexive Pronouns
    "grc:reciprocal pronoun": [("331", "331"), ("1277", "1278")],   # Reciprocal Pronoun
    "grc:demonstrative pronoun": [("333", "333"), ("1238", "1261")],  # Demonstrative Pronouns
    "grc:interrogative pronoun": [("334", "334"), ("1262", "1265")],  # Interrogative and Indefinite Pronouns
    "grc:indefinite pronoun": [("334", "334"), ("1266", "1270")],
    "grc:relative pronoun": [("338", "339")],          # Relative Pronouns
    "grc:correlative pronoun": [("340", "340")],       # Correlative Pronouns
    "grc:preposition": [("1636", "1665")],             # Prepositions
    "grc:conjunction": [("2163", "2164")],             # Syntax of the compound sentence (the coördinating conjunctions)
    "grc:particle": [("2769", "2774")],                # Particles
    "grc:adverb": [("341", "346"), ("1094", "1098")],  # Adverbs (forms; use)
    "grc:conditional": [("2280", "2288")],             # Conditional clauses
    "grc:comparative": [("313", "324"), ("1066", "1084")],          # Comparison of adjectives; Comparative
    "grc:superlative": [("313", "324"), ("1085", "1093")],          # ...; Superlative
    "grc:negative": [("2688", "2689")],                # Negative sentences
    "grc:interrogative": [("2650", "2655")],           # Questions introduced by interrogative particles
}

# Machen teaches the forms lesson by lesson, so a term often has a part for each lesson that covers it (the present's
# active, then its middle and passive). Keys with no section of their own here (particle, correlative pronoun) are
# left out, so the term isn't underlined while Machen is picked.
MACHEN_MAP = {
    "grc:tense:present:ind": [("17", "22"), ("109", "113")],         # Present Active Indicative; Present Middle and Passive
    "grc:tense:imperfect:ind": [("122", "134"), ("137", "144")],     # Imperfect Active Indicative; Imperfect Middle and Passive
    "grc:tense:future:ind": [("151", "164"), ("200", "200")],        # Future Active and Middle; the future passive
    "grc:tense:aorist:ind": [("167", "183"), ("187", "194"), ("197", "199")],   # First Aorist; Second Aorist; Aorist Passive
    "grc:tense:perfect:ind": [("426", "453")],         # The Perfect Tense
    "grc:tense:pluperfect:ind": [("450", "450")],      # (the pluperfect: too rare to learn)
    "grc:tense:other": [("233", "233"), ("254", "254"), ("283", "283"), ("299", "299"), ("420", "420")],
    #     (a tense outside the indicative: the participle's time relative to the leading verb; no time in the
    #     subjunctive, infinitive or imperative - only the kind of action)
    "grc:second": [("187", "190"), ("440", "440")],    # Second Aorist (a way of forming the aorist); the second perfect
    "grc:voice:active": [("17", "17"), ("109", "109")],              # tense, voice and mood; the three voices
    "grc:voice:middle": [("109", "111")],              # Present Middle and Passive Indicative (the middle's meaning, forms)
    "grc:voice:passive": [("109", "109"), ("112", "113")],
    "grc:voice:middle or passive": [("109", "113")],
    "grc:voice:middle deponent": [("116", "116"), ("164", "164")],   # Deponent Verbs; deponent in one tense only
    "grc:voice:passive deponent": [("116", "116"), ("207", "207")],  # ...; deponents with passive forms
    "grc:voice:middle or passive deponent": [("116", "116"), ("207", "208")],
    "grc:mood:indicative": [("17", "17")],             # tense, voice and mood
    "grc:mood:subjunctive": [("269", "290")],          # The Subjunctive Mood
    "grc:mood:optative": [("550", "550")],             # The Optative Mood
    "grc:mood:imperative": [("404", "423")],           # The Imperative Mood
    "grc:mood:infinitive": [("295", "305")],           # The Present and Aorist Infinitives; The Articular Infinitive
    "grc:mood:participle": [("226", "239")],           # Present Participles. Use of Participles
    "grc:person": [("19", "19")],                      # first, second, third person; singular and plural
    "grc:number": [("19", "19"), ("27", "27")],        # ...; the noun's gender, number and case
    "grc:gender": [("27", "28")],                      # ...; the three genders
    "grc:case:nominative": [("30", "30"), ("34", "34"), ("99", "99")],   # the five cases; subject and object; εἰμί
    "grc:case:genitive": [("35", "35"), ("82", "82")],               # possession; the case of separation
    "grc:case:dative": [("36", "36"), ("115", "115")],               # the indirect object; the dative of means
    "grc:case:accusative": [("34", "34"), ("382", "382")],           # the object; extent of space or time
    "grc:case:vocative": [("37", "37")],               # direct address
    "grc:article": [("63", "67")],                     # The Article (its declension, use)
    "grc:noun": [("25", "30")],                        # The Second Declension (declensions; gender, number, case)
    "grc:adjective": [("66", "76")],                   # Agreement; Attributive and Predicate Positions; Substantive Use
    "grc:personal pronoun": [("94", "97")],            # Personal Pronouns
    "grc:possessive pronoun": [("473", "474")],        # the possessive adjectives ἐμός, σός...
    "grc:reflexive pronoun": [("337", "342")],         # the reflexive pronouns
    "grc:reciprocal pronoun": [("343", "343")],        # ἀλλήλων
    "grc:demonstrative pronoun": [("102", "104")],     # Demonstrative Pronouns
    "grc:interrogative pronoun": [("385", "387"), ("390", "390")],   # Interrogative Pronouns
    "grc:indefinite pronoun": [("388", "390")],        # Indefinite Pronouns
    "grc:relative pronoun": [("395", "401")],          # Relative Pronouns; Conditional Relative Clauses
    "grc:preposition": [("80", "88")],                 # Prepositions
    "grc:conjunction": [("91", "91"), ("146", "148")], # postpositive δέ; Uses of καί and οὐδέ
    "grc:adverb": [("463", "466")],                    # adverbs (forms, comparison; of place with the genitive)
    "grc:conditional": [("289", "290"), ("551", "551")],             # present and future conditions; Contrary to Fact
    "grc:comparative": [("456", "462")],               # Comparison of Adjectives; Genitive of Comparison and ἤ
    "grc:superlative": [("456", "458")],
    "grc:negative": [("118", "118"), ("256", "256")],  # The Position of οὐ; The Negatives οὐ and μή
    "grc:interrogative": [("478", "479")],             # questions expecting a negative (μή) or positive (οὐ) answer
}

HEB_MAIN_STEMS = {"qal", "qal passive", "niphal", "piel", "pual", "hiphil", "hophal", "hithpael"}
PERFECTS, IMPERFECTS = {"perfect", "weqatal"}, {"imperfect", "wayyiqtol", "weyiqtol", "jussive", "cohortative"}


def _alternation(rules):
    """[(regex, key or function(match, ctx) -> key)] -> one regex (alternatives tried in the list's order)."""
    return re.compile("|".join(f"(?P<g{i}>(?<![A-Za-z])(?:{rx})(?![A-Za-z]))" for i, (rx, _) in enumerate(rules)),
                      re.I)


def _stems():
    import morph
    names = sorted({n for _, n in morph.HEBREW_STEMS.values()}, key=len, reverse=True)
    return "|".join(re.escape(n) for n in names)


def _hebrew_ctx(code):
    """What the Hebrew word is: its main part ('verb', 'noun', 'prep', 'particle'...) and, for a verb, its form."""
    import morph
    segs = code[1:].split("/")
    i = 0
    while i < len(segs) - 1 and segs[i] in morph.PREFIXES and not morph._is_suffix(segs[i + 1]):
        i += 1
    main = segs[i]
    form = morph.FORMS.get(main[2:3], ("", ""))[1].split(" (")[0] if main[:1] == "V" else ""
    return {"aramaic": code[:1] == "A", "part": main[:1], "form": form}


def _verb_kind(ctx):
    f = ctx["form"]
    return ("perfect" if f in PERFECTS else "imperfect" if f in IMPERFECTS else "imperative" if f == "imperative"
            else "verbal noun")


def _heb_suffix(m, ctx):
    if ctx["part"] == "V":
        k = _verb_kind(ctx)
        return f"heb:suffix:{'verbal noun' if k == 'imperative' else k}"
    return "heb:suffix:noun" if ctx["part"] in "NAP" else "heb:suffix:particle"


def _heb_stem(m, ctx):
    if ctx["aramaic"]:
        return None
    s = m.group(0).lower()
    return f"heb:stem:{s if s in HEB_MAIN_STEMS else 'other'}"


def _heb_pgn(m, ctx):
    return f"heb:pgn:{_verb_kind(ctx)}" if ctx["part"] == "V" and _verb_kind(ctx) != "verbal noun" else None


HEBREW_RULES = [
    (r"with (?:1st|2nd|3rd) [a-z ]*? suffix", _heb_suffix),
    (r"with directional he", "heb:directional he"),
    (r"with paragogic he", lambda m, c: "heb:paragogic he:" + ("verb" if c["part"] == "V" else "noun")),
    (r"with paragogic nun", "heb:paragogic nun"),
    (r"with the article \(emphatic\)", None),
    (r"preposition with the article", "heb:preposition with the article"),
    (r"preposition(?= \+)", "heb:preposition:prefix"),
    (r"preposition", "heb:preposition"),
    (r"(?:1st|2nd|3rd) (?:masculine or feminine|masculine|feminine|common) (?:singular|plural|dual)", _heb_pgn),
    (_stems(), _heb_stem),
    (r"weqatal \(sequential perfect\)", "heb:form:weqatal"),
    (r"wayyiqtol \(sequential imperfect\)", "heb:form:wayyiqtol"),
    (r"weyiqtol \(conjunctive imperfect\)", "heb:form:weyiqtol"),
    (r"passive participle|participle", "heb:form:participle"),
    (r"infinitive absolute|infinitive construct|perfect|imperfect|cohortative|jussive|imperative",
     lambda m, c: "heb:form:" + m.group(0).lower()),
    (r"sign of the definite direct object", "heb:object marker"),
    (r"interrogative pronoun", "heb:interrogative pronoun"),
    (r"interrogative particle|interrogative", "heb:interrogative"),
    (r"indefinite pronoun", "heb:indefinite pronoun"),
    (r"personal pronoun", "heb:personal pronoun"),
    (r"demonstrative pronoun|demonstrative particle", "heb:demonstrative"),
    (r"relative pronoun|relative particle", "heb:relative"),
    (r"negative particle", "heb:negative"),
    (r"conjunctive particle|conjunction", "heb:conjunction"),
    (r"interjection", "heb:interjection"),
    (r"adverb", "heb:adverb"),
    (r"article", "heb:article"),
    (r"cardinal number", "heb:cardinal"),
    (r"ordinal number", "heb:ordinal"),
    (r"gentilic noun|gentilic adjective", "heb:gentilic"),
    (r"proper name", "heb:proper name"),
    (r"noun", "heb:noun"),
    (r"adjective", "heb:adjective"),
    (r"masculine or feminine", "heb:gender:either"),
    (r"masculine|feminine", "heb:gender"),
    (r"plural", "heb:plural"),
    (r"dual", "heb:dual"),
    (r"construct", "heb:construct"),
]

GREEK_RULES = [
    (r"second", "grc:second"),
    (r"present|imperfect|future|aorist|pluperfect|perfect",
     lambda m, c: f"grc:tense:{m.group(0).lower()}:ind" if c["mood"] == "I" else "grc:tense:other"),
    (r"middle or passive deponent|middle deponent|passive deponent|middle or passive|active|middle|passive",
     lambda m, c: "grc:voice:" + m.group(0).lower()),
    (r"indicative|subjunctive|optative|imperative|infinitive|participle",
     lambda m, c: "grc:mood:" + m.group(0).lower()),
    (r"(?:1st|2nd|3rd) person", "grc:person"),
    (r"nominative|genitive|dative|accusative|vocative", lambda m, c: "grc:case:" + m.group(0).lower()),
    (r"singular|plural", "grc:number"),
    (r"masculine|feminine|neuter", "grc:gender"),
    (r"correlative or interrogative pronoun|correlative pronoun", "grc:correlative pronoun"),
    (r"(?:personal|possessive|reflexive|reciprocal|demonstrative|interrogative|indefinite|relative) pronoun",
     lambda m, c: "grc:" + m.group(0).lower()),
    (r"negative particle", "grc:negative"),
    (r"interrogative(?: particle)?", "grc:interrogative"),
    (r"article|noun|adjective|preposition|conjunction|particle|adverb|conditional|comparative|superlative",
     lambda m, c: "grc:" + m.group(0).lower()),
]
HEBREW_RX, GREEK_RX = _alternation(HEBREW_RULES), _alternation(GREEK_RULES)


def term_spans(code, spelled, greek):
    """The spelled-out parsing's terms: [[start, end, key], ...] (character offsets; the text is all in the BMP, so
    they're the browser's UTF-16 offsets too). A term whose key maps to nothing is left out."""
    if not greek:
        rx, rules, ctx = HEBREW_RX, HEBREW_RULES, _hebrew_ctx(code)
    else:
        parts = code.split("-")
        mood = parts[1].lstrip("2")[2:3] if parts[0] == "V" and len(parts) > 1 else ""
        rx, rules, ctx = GREEK_RX, GREEK_RULES, {"mood": mood}
    known = set(GESENIUS_MAP) | set(SMYTH_MAP) | set(MACHEN_MAP)
    out = []
    for m in rx.finditer(spelled):
        key = rules[int(m.lastgroup[1:])][1]
        key = key(m, ctx) if callable(key) else key
        if key in known:
            out.append([m.start(), m.end(), key])
    return out


GRAMMARS = [
    ("gesenius", "Gesenius", "H", "Gesenius' Hebrew Grammar, ed. E. Kautzsch, tr. A. E. Cowley (1910); public domain; "
     "text from English Wikisource"),
    ("smyth", "Smyth", "G", "H. W. Smyth, A Greek Grammar for Colleges (1920); Perseus Digital Library, Tufts "
     "University, CC BY-SA 3.0 US"),
    ("machen", "Machen", "G", "J. Gresham Machen, New Testament Greek for Beginners (1923); public domain; text from "
     "machengreek.com"),
]
MAPS = {"gesenius": GESENIUS_MAP, "smyth": SMYTH_MAP, "machen": MACHEN_MAP}


def build(db, parsings, greek):
    """The grammar tables, and parsings.terms. `parsings`: {source morph code: (code, spelled, stem)}; `greek`: the
    set of those codes that are Greek (TAGNT's)."""
    sections = {"gesenius": gesenius_sections(fetch_gesenius()), "smyth": smyth_sections(fetch_smyth()),
                "machen": machen_sections(fetch_machen())}
    db.executescript("""
        CREATE TABLE grammars (id TEXT PRIMARY KEY, name TEXT, lang TEXT, credit TEXT);   -- (rowid: GRAMMARS' order)
        CREATE TABLE grammar_sections (grammar TEXT, seq INTEGER, label TEXT, heading TEXT, body TEXT,
                                       PRIMARY KEY (grammar, seq)) WITHOUT ROWID;
        CREATE TABLE grammar_terms (key TEXT, grammar TEXT, part INTEGER, first INTEGER, last INTEGER,
                                    PRIMARY KEY (key, grammar, part)) WITHOUT ROWID;
        ALTER TABLE parsings ADD COLUMN terms TEXT;
    """)
    db.executemany("INSERT INTO grammars VALUES (?,?,?,?)", GRAMMARS)
    for g, rows in sections.items():
        db.executemany("INSERT INTO grammar_sections VALUES (?,?,?,?,?)",
                       [(g, i, label, h, body) for i, (label, h, body) in enumerate(rows)])
        seq = {label: i for i, (label, _, _) in enumerate(rows)}
        for key, ranges in MAPS[g].items():
            for part, (a, b) in enumerate(ranges):
                db.execute("INSERT INTO grammar_terms VALUES (?,?,?,?,?)", (key, g, part, seq[a], seq[b]))
    db.executemany("UPDATE parsings SET terms = ? WHERE morph = ?",
                   [(json.dumps(term_spans(m, spelled, m in greek)), m) for m, (_, spelled, _) in parsings.items()])
    return {g: len(r) for g, r in sections.items()}
