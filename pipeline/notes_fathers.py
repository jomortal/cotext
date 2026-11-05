"""The notes panel's church fathers (notes.py builds them; its docstring lists every source): two commentaries, each
quote led by its father and, where the source names it, the work it's from - <b>Chrysostom</b> <small>(Hom. xxi. 1)</small>.

  catena   Thomas Aquinas, Catena Aurea on the four Gospels, the Oxford translation (J. H. Parker, 1841-45, ed. J. H.
           Newman; public domain): the fathers' comments verse by verse, as Aquinas chained them. Text from the
           Historical Christian Faith Writings-Database (github.com/HistoricalChristianFaith/Writings-Database,
           public-domain dedication; a file per chapter, pinned by WRITINGS_COMMIT). It lacks Matthew 15, taken from
           CCEL's ThML of the same translation (catena1.xml, pinned by hash; CCEL allows non-profit use).
  fathers  The Historical Christian Faith Commentaries Database (github.com/HistoricalChristianFaith/Commentaries-
           Database, pinned by COMMENTARIES_COMMIT): the fathers' comments filed by verse across the Bible, each with
           its father and source work. Its LICENSE dedicates to the public domain the excerpts from public-domain
           sources and keeps others as fair-use excerpts of works still in copyright - which it doesn't mark - so
           only a quote whose source is known to be a public-domain translation is kept (keep()):
             - fathers and medieval writers only (its metadata's year up to 1500 - the Reformers and moderns out);
             - its source a Writings-Database file whose work is listed in fathers_works.json: "pd" - the Ante-Nicene
               and Nicene and Post-Nicene Fathers (1867-1900), other translations before 1929 (Oxford's Library of
               the Fathers, Pusey's Cyril, Ferrar's Eusebius...), or new translations their files release into the
               public domain; "machine" - its files say translated from Migne by ChatGPT (README: the database's
               Migne translations are), marked so after the work. The list was decided once (2026-11-04) from each
               work's own opening lines: works of unknown or copyrighted translation left out - Theophylact
               (Chrysostom Press), Aquinas' commentaries and Bonaventure (modern translations), Oecumenius,
               Bernard's sermons, Augustine's Sermons, Gregory's Gospel and Ezekiel homilies and more;
             - or New Advent's Fathers (newadvent.org/fathers: the same ANF / NPNF) or Roger Pearse's tertullian.org
               (public domain);
             - and not the Catena Aurea's quotes (catena has them all, with Aquinas' order).
           A quote with no source, or any other, is left out.
Versification: both follow the KJV's (the text's nearly everywhere in the Gospels and epistles).
"""
import html
import json
import re
import urllib.parse
import zipfile

import notes

WRITINGS_COMMIT = "938841f39b3ee211119ca5d107e978f73fc28a6c"     # HistoricalChristianFaith/Writings-Database, 2026-11-04
COMMENTARIES_COMMIT = "9da765b0bf53852e1dfacfee2ccc87d5681a89db"     # HistoricalChristianFaith/Commentaries-Database, 2026-11-04
COMMENTARIES_SHA = "c63381e05aa265e87a8db3852f25acacfde76b6ab2f8fe380841e6fdfbfc0bc0"
CCEL_MATTHEW = ("https://www.ccel.org/ccel/a/aquinas/catena1.xml",
                "943a6b5fd668ef021877e99f210d96b84abbbe81212fe5627c6bb206f9ce1618")
WORKS = notes.HERE / "fathers_works.json"     # Writings-Database work -> "pd" / "machine" (keep())

GOSPELS = [("Matthew", 40, 28), ("Mark", 41, 16), ("Luke", 42, 24), ("John", 43, 21)]     # (name, book id, chapters)
# The Commentaries Database's book names (its book_names.json), the 66 books in the text's order (ids 1-66).
BOOKS = ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
         "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
         "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel",
         "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
         "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
         "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus",
         "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"]
BOOK_ID = {b: i + 1 for i, b in enumerate(BOOKS)}

SMALL_WORDS = {"of", "the", "and", "on", "in", "de", "a"}


def name_case(s):
    """A father's name as printed in capitals (PSEUDO-CHRYSOSTOM, GREEK EXPOSITOR) -> Pseudo-Chrysostom, Greek Expositor."""
    words = re.split(r"(\s+|-)", s.strip().lower())
    out = []
    for i, w in enumerate(words):
        out.append(w if (w in SMALL_WORDS and i) else w[:1].upper() + w[1:])
    return "".join(out)


def lead(father, work, machine=False):
    """A quote's lead: its father bold, its work (as the source cites it) small, in brackets."""
    s = f"<b>{html.escape(father, quote=False)}</b>"
    if work:
        s += f" <small>({notes.script(work)}{'; machine translation' if machine else ''})</small>"
    elif machine:
        s += " <small>(machine translation)</small>"
    return s + " "


def body(lead_html, paras):
    """A quote's body: its paragraphs (escaped HTML each, Greek / Hebrew marked), the lead before the first."""
    paras = [p for p in paras if p.strip()]
    if not paras:
        return ""
    return "".join(f"<p>{lead_html if i == 0 else ''}{p}</p>" for i, p in enumerate(paras))


# ---- Verses within a section: each quote put on the verse it's about ----

def shingles(text, n=4):
    w = re.findall(r"[a-z]+", text.lower())
    return {" ".join(w[i:i + n]) for i in range(len(w) - n + 1)}


def place(verses, quotes):
    """A Catena section's verses [(chapter, verse, text)...] and its quotes in order [body...] -> rows' (start, end)
    each. Aquinas follows the verses in order and a comment usually quotes the words it's about: a quote goes on the
    verse whose words (four in a row) it quotes first, from the verse reached so far onwards; a quote before any
    match covers the whole section (a range note), one after it stays on the verse reached."""
    sh = [shingles(t) for _, _, t in verses]
    first = notes.ref(*verses[0][:2])
    last = notes.ref(*verses[-1][:2])
    cur, out = None, []
    for q in quotes:
        words = re.findall(r"[a-z]+", re.sub(r"<[^>]*>", " ", q).lower())
        grams = [" ".join(words[i:i + 4]) for i in range(len(words) - 3)]
        best = None
        for k in range(cur or 0, len(verses)):
            pos = next((i for i, g in enumerate(grams) if g in sh[k]), None)
            if pos is not None and (best is None or pos < best[0]):
                best = (pos, k)
        if best:
            cur = best[1]
        if cur is None:
            out.append((first, last))
        else:
            r = notes.ref(*verses[cur][:2])
            out.append((r, r))
    return out


def section_rows(b, verses, quotes, ord_start=0):
    """A section's notes: (book, start, end, ord, '', body) each, ord counting on in Aquinas' order."""
    rows = []
    for k, ((s, e), q) in enumerate(zip(place(verses, quotes), quotes)):
        rows.append((b, s, e, ord_start + k, "", q))
    return rows


# ---- catena: the Writings-Database's chapters ----

def catena_chapter(b, data):
    """One chapter's file: <h3>c:v–v</h3> a section, its verses ("1. ...<br><br>"), then its quotes - each
    "<strong>FATHER</strong> . (work) text", a paragraph without a father the one before's continued."""
    text = data.decode("utf-8")
    rows = []
    for sec in re.split(r"<h3>", text)[1:]:
        head, _, rest = sec.partition("</h3>")
        m = re.match(r"\s*(\d+):(\d+)", head)
        if not m:
            continue
        c0 = int(m.group(1))
        verses, quotes, ch = [], [], c0
        for p in re.split(r"<br>\s*<br>", rest):
            p = p.strip()
            if not p or p.startswith("</article"):
                continue
            vm = re.match(r"(\d+)\.\s+(.*)", p, re.S)
            if not quotes and vm and "<strong>" not in p:
                v = int(vm.group(1))
                if verses and v < verses[-1][1]:
                    ch += 1     # (A section across two chapters: 15:39–16:4)
                verses.append((ch, v, notes.clean(vm.group(2), lambda t, a: None)))
                continue
            fm = re.match(r"<strong>(.*?)</strong>\s*\.?\s*(?:\(([^()]*(?:\([^()]*\)[^()]*)*)\)\s*)?(.*)", p, re.S)
            if fm:
                father = name_case(re.sub(r"<[^>]*>", "", fm.group(1)))
                quotes.append([lead(father, (fm.group(2) or "").strip()), [inline(fm.group(3))]])
            elif quotes:
                quotes[-1][1].append(inline(p))
        if verses and quotes:
            rows += section_rows(b, verses, [body(lh, ps) for lh, ps in quotes], len(rows))
    return rows


def inline(s):
    """A paragraph's HTML -> the panel's: <i> / <em> italic, the rest's tags dropped, Greek / Hebrew marked."""
    rule = lambda t, a: {"i": "i", "em": "i", "b": "b", "strong": "b"}.get(t)
    out = notes.clean(s, rule)
    return re.sub(r"^<p>|</p>$", "", out).replace("</p><p>", " ")


# ---- catena: CCEL's Matthew 15 ----

CCEL_NAMES = {"Aug.": "Augustine", "Chrys.": "Chrysostom", "Remig.": "Remigius", "Raban.": "Rabanus", "Gloss.": "Gloss",
              "Gloss": "Gloss", "Jerome": "Jerome", "Hilary": "Hilary", "Bede": "Bede", "Pseudo-Chrys.": "Pseudo-Chrysostom",
              "Origen": "Origen", "Ambrose": "Ambrose"}


def ccel_chapter(b, c, data):
    """CCEL's ThML chapter (its div2 "Chapter c"): sections of <p class="scripture"> verses ("1. ...") then
    <p class="normal"> quotes, each "Abbrev.[, work]: text" (Chrys., Hom. li: ...), a paragraph without one the
    one before's continued."""
    t = data.decode("utf-8")
    i = t.find(f'title="Chapter {c}"')
    j = t.find("<div2", i + 10)
    ch = t[i:j if j > 0 else len(t)]
    rows, verses, quotes = [], [], []

    def flush():
        if verses and quotes:
            rows.extend(section_rows(b, verses, [body(lh, ps) for lh, ps in quotes], len(rows)))

    for m in re.finditer(r'<p class="(scripture|normal)"[^>]*>(.*?)</p>', ch, re.S):
        kind, p = m.group(1), re.sub(r"<scripRef[^>]*>(.*?)</scripRef>", r"\1", m.group(2), flags=re.S)
        p = re.sub(r"<pb[^>]*/>", "", p)
        if kind == "scripture":
            if quotes:
                flush()
                verses, quotes = [], []
            vm = re.match(r"\s*(?:Ver\.\s*)?(\d+)\.\s*(.*)", re.sub(r"<[^>]*>", "", p), re.S)
            if vm:
                verses.append((c, int(vm.group(1)), vm.group(2)))
            continue
        plain = html.unescape(re.sub(r"<[^>]*>", "", p)).strip()
        fm = re.match(r"([A-Z][A-Za-z.\- ]*?\.?)(?:,\s*([^:]{1,60}?))?\s*:\.?\s+(.*)", plain, re.S)
        name = fm and (CCEL_NAMES.get(fm.group(1).strip()) or CCEL_NAMES.get(fm.group(1).split(",")[0].strip()))
        if fm and name:
            work = (fm.group(2) or "").strip()
            if fm.group(1).strip() not in CCEL_NAMES:
                work = fm.group(1).split(" ", 1)[1].strip() if " " in fm.group(1) else work
            if fm.group(1).startswith("Gloss") and fm.group(1).strip() not in ("Gloss", "Gloss."):
                work = fm.group(1).replace("Gloss.", "").strip() + (", " + work if work else "")
            quotes.append([lead(name, work), [notes.script(re.sub(r"\s+", " ", fm.group(3)))]])
        elif quotes:
            quotes[-1][1].append(notes.script(re.sub(r"\s+", " ", plain)))
    flush()
    return rows


def catena_rows():
    rows = []
    for name, b, chapters in GOSPELS:
        for c in range(1, chapters + 1):
            if name == "Matthew" and c == 15:
                data = notes.download("catena", "catena1.xml", *CCEL_MATTHEW)
                rows += ccel_chapter(b, c, data)
                continue
            path = urllib.parse.quote(f"Thomas Aquinas/Catena Aurea/Commentary on {name}/Chapter {c}.html")
            url = f"https://raw.githubusercontent.com/HistoricalChristianFaith/Writings-Database/{WRITINGS_COMMIT}/{path}"
            rows += catena_chapter(b, notes.download("catena", f"{name} {c}.html", url))
    return rows


# ---- fathers: the Commentaries Database ----

TOML_VALUE = re.compile(r"""^([a-z_]+)\s*=\s*('''(.*?)'''|\"\"\"(.*?)\"\"\"|'([^'\n]*)'|"((?:[^"\\\n]|\\.)*)"|(-?\d+))""",
                        re.S | re.M)


def toml_blocks(text):
    """Its files' TOML (only [[commentary]] tables of strings and numbers; the year in metadata.toml) -> a dict per
    table (the file's top-level keys before any table as the first). Python 3.9's library has no TOML reader."""
    out = []
    for part in text.split("[[commentary]]"):
        kv = {}
        for m in TOML_VALUE.finditer(part):
            g = m.groups()
            val = next(x for x in g[2:] if x is not None)
            if g[5] is not None:
                val = re.sub(r"\\(.)", lambda e: {"n": "\n", "t": "\t"}.get(e.group(1), e.group(1)), val)
            kv[m.group(1)] = val
        out.append(kv)
    return out


def work_of(url):
    """A Writings-Database source URL -> its work: the file's path, or for a work in several files (a folder of
    homilies) the folder's - fathers_works.json's keys."""
    f = urllib.parse.unquote(urllib.parse.unquote(url.split("file=", 1)[-1]))
    parts = f.split("/")
    return "/".join(parts[:-1]) if len(parts) > 2 else f


def keep(c, works):
    """A comment kept (see the docstring): None if not, else "pd" / "machine"."""
    if "Aquinas" in c.get("append_to_author_name", ""):
        return None
    url = c.get("source_url", "")
    if "historicalchristian.faith" in url:
        return works.get(work_of(url))
    if re.match(r"https?://(www\.)?newadvent\.org/fathers/", url) or re.match(r"https?://(www\.)?tertullian\.org/", url):
        return "pd"
    return None


def verses_of(fname):
    """A file's name (Romans 5_1-5.toml, Matthew 23_35.toml, 1 Kings 19_10-20_3.toml) -> (book id, start, end), or
    None for a book outside the 66 (the Apocrypha)."""
    m = re.match(r"(.+?) (\d+)_(\d+)(?:-(\d+)(?:_(\d+))?)?\.toml$", fname)
    if not m or m.group(1) not in BOOK_ID:
        return None
    c, v = int(m.group(2)), int(m.group(3))
    if m.group(5):
        end = (int(m.group(4)), int(m.group(5)))
    elif m.group(4):
        end = (c, int(m.group(4)))
    else:
        end = (c, v)
    return BOOK_ID[m.group(1)], notes.ref(c, v), notes.ref(*end)


def fathers_rows():
    zpath = notes.DL / "fathers" / f"Commentaries-Database-{COMMENTARIES_COMMIT[:7]}.zip"
    notes.download("fathers", zpath.name, "https://github.com/HistoricalChristianFaith/Commentaries-Database/archive/"
                   f"{COMMENTARIES_COMMIT}.zip", COMMENTARIES_SHA)
    works = json.loads(WORKS.read_text())
    z = zipfile.ZipFile(zpath)
    files = {}
    for n in z.namelist():
        parts = n.split("/")
        if len(parts) == 3 and parts[2].endswith(".toml"):
            files.setdefault(parts[1], []).append(parts[2])
    root = z.namelist()[0].split("/")[0]
    years = {}     # (A father's year, AD: his metadata's default_year; none for the Pseudo- writers)
    for author, fs in files.items():
        if "metadata.toml" in fs:
            meta = toml_blocks(z.read(f"{root}/{author}/metadata.toml").decode("utf-8"))[0]
            years[author] = int(meta["default_year"]) if "default_year" in meta else None
    rows, kept, left = [], {}, 0
    for author in sorted(files):
        if (years.get(author) or 0) > 1500:
            continue
        for fname in sorted(files[author]):
            at = verses_of(fname)
            if not at:
                continue
            for c in toml_blocks(z.read(f"{root}/{author}/{fname}").decode("utf-8"))[1:]:
                how = keep(c, works) if "quote" in c else None
                if not how:
                    left += 1
                    continue
                father = author + c.get("append_to_author_name", "")
                paras = [notes.script(re.sub(r"\s+", " ", p).strip()) for p in re.split(r"\n\s*\n|\n", c["quote"])]
                b = body(lead(father, c.get("source_title", "").strip(), how == "machine"), paras)
                if b:
                    rows.append([*at, author, b])
                    kept[author] = kept.get(author, 0) + 1
    # ord: by the father's year, then name, within the notes starting at a verse (the earliest first).
    rows.sort(key=lambda r: (r[0], r[1], years.get(r[3]) or 0, r[3], r[2]))
    out, prev, k = [], None, 0
    for b, s, e, author, body_html in rows:
        k = k + 1 if (b, s) == prev else 0
        prev = (b, s)
        out.append((b, s, e, k, "", body_html))
    print(f"  fathers: {len(out)} kept from {len(kept)} fathers, {left} left out")
    return out
