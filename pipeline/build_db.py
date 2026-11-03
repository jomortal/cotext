"""Builds COTEXT's database, public/data/cotext.db, from the STEPBible-Data files and the grammars (fetched first if
missing).

Run: python3 pipeline/build_db.py   (Python's standard library only; about a minute; the grammars' first download
a few minutes more - grammar.py)

Tables:
  books     id (1-39 OT, 40-66 NT), code (Gen, Jhn - the source's), name, testament ('OT' / 'NT'), chapters
  words     one row per word of the reading text, kept in order by its key (book, chapter, verse, word): book, chapter, verse, word (its number in the verse),
            text (pointed Hebrew / accented Greek, with its punctuation), translit, gloss (English), strong (the
            extended Strong's of the word's root - the lexicon's key), morph (the source's code)
  parsings  per source code: code (COTEXT's: Q-P-3MS, ART+N-MP, IAI-3S, N-DSF), spelled ("Qal perfect, 3rd masculine
            singular"), stem (the verb's color group in the reader: qal, piel, hiphil... ; Greek verbs 'verb'; else '')
  lexicon   strong -> lemma (dictionary form), translit, gloss, entry (the brief lexicon's text: plain, with <b>, <i>
            and <br> only), concise (the meaning to memorise, a few words: concise())
  freq      strong, book (0: the whole OT or NT), count - how often each lemma occurs
  guide     lang ('H' / 'G'), grp, ord, code, meaning - the Parsing guide: every part of the codes, from morph.py's
            tables (morph.guide)
  form_freq strong, code (COTEXT's parsing code), book (0: the whole OT or NT), count - how often each lemma occurs
            in that exact form (the helps' slider hides a word's parsing by it: src/helps.ts)
  grammars, grammar_sections, grammar_terms, and parsings.terms - the grammars a parsing's terms link to
            (Gesenius, Smyth, Machen): made by grammar.py, whose docstring describes them
  note_sources  the notes panel's commentaries and apparatuses (src/notes.ts), each its own file in public/data/notes/:
            made by notes.py, whose docstring describes them and their table
  bdb, bdb_file  the Hebrew words' full Brown-Driver-Briggs entries (src/panel.ts' BDB), their own file
            public/data/notes/bdb.db: made by bdb.py, whose docstring describes them
  words_full  a view: each word with its parsing and lemma.

Versification is the English Bibles' (NRSV), as the source gives it first; the Hebrew's own verse numbers differ in
places (most Psalm titles are verse 0 here). A word's number is its place in that verse, counted here (1, 2, 3...):
the source numbers words by the Hebrew verse, which restarts inside an English one where the two divide differently
(Num 26:1 starts at Hebrew 25:19).

The reading text: Hebrew - the Leningrad codex as translators read it (Qere over Ketiv; the source's L, Q, R and X
rows); Greek - the Nestle-Aland text (rows whose type has N), leaving out words only in the KJV's text or others.
"""
import collections
import html
import pathlib
import re
import sqlite3
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import bdb  # noqa: E402
import fetch  # noqa: E402
import grammar  # noqa: E402
import morph  # noqa: E402
import notes  # noqa: E402

ROOT = pathlib.Path(__file__).parent.parent
OUT = ROOT / "public" / "data" / "cotext.db"
DL = fetch.DOWNLOADS

BOOKS = [
    ("Gen", "Genesis"), ("Exo", "Exodus"), ("Lev", "Leviticus"), ("Num", "Numbers"), ("Deu", "Deuteronomy"),
    ("Jos", "Joshua"), ("Jdg", "Judges"), ("Rut", "Ruth"), ("1Sa", "1 Samuel"), ("2Sa", "2 Samuel"),
    ("1Ki", "1 Kings"), ("2Ki", "2 Kings"), ("1Ch", "1 Chronicles"), ("2Ch", "2 Chronicles"), ("Ezr", "Ezra"),
    ("Neh", "Nehemiah"), ("Est", "Esther"), ("Job", "Job"), ("Psa", "Psalms"), ("Pro", "Proverbs"),
    ("Ecc", "Ecclesiastes"), ("Sng", "Song of Songs"), ("Isa", "Isaiah"), ("Jer", "Jeremiah"),
    ("Lam", "Lamentations"), ("Ezk", "Ezekiel"), ("Dan", "Daniel"), ("Hos", "Hosea"), ("Jol", "Joel"),
    ("Amo", "Amos"), ("Oba", "Obadiah"), ("Jon", "Jonah"), ("Mic", "Micah"), ("Nam", "Nahum"), ("Hab", "Habakkuk"),
    ("Zep", "Zephaniah"), ("Hag", "Haggai"), ("Zec", "Zechariah"), ("Mal", "Malachi"),
    ("Mat", "Matthew"), ("Mrk", "Mark"), ("Luk", "Luke"), ("Jhn", "John"), ("Act", "Acts"), ("Rom", "Romans"),
    ("1Co", "1 Corinthians"), ("2Co", "2 Corinthians"), ("Gal", "Galatians"), ("Eph", "Ephesians"),
    ("Php", "Philippians"), ("Col", "Colossians"), ("1Th", "1 Thessalonians"), ("2Th", "2 Thessalonians"),
    ("1Ti", "1 Timothy"), ("2Ti", "2 Timothy"), ("Tit", "Titus"), ("Phm", "Philemon"), ("Heb", "Hebrews"),
    ("Jas", "James"), ("1Pe", "1 Peter"), ("2Pe", "2 Peter"), ("1Jn", "1 John"), ("2Jn", "2 John"),
    ("3Jn", "3 John"), ("Jud", "Jude"), ("Rev", "Revelation"),
]
BOOK_ID = {code: i + 1 for i, (code, _) in enumerate(BOOKS)}

# A word row's reference: Gen.1.1#01=L, Psa.3.1(3.2)#01=L (the Hebrew's own numbering in brackets), Mat.17.15[17.14]#..
REF = re.compile(r"^(\w+)\.(\d+)\.(\d+)[^#]*#(\d+)=(\S+)")


def gloss_text(s):
    """The source's English, made readable: the "/" between parts dropped, <obj.> as (obj.), other <..> unbracketed."""
    s = s.replace("/", " ").replace("<obj.>", "(obj.)")
    s = re.sub(r"<([^>]*)>", r"\1", s)
    return re.sub(r"\s+", " ", s).strip()


def read_rows(name):
    with open(DL / name, encoding="utf-8-sig") as f:
        for line in f:
            cols = line.rstrip("\n").split("\t")
            m = REF.match(cols[0])
            if m:
                yield m, cols


def hebrew_words():
    """TAHOT: each word -> (book, ch, v, n, text, translit, gloss, strong, morph, lemma, short gloss)."""
    for i in range(1, 5):
        for m, c in read_rows(f"TAHOT{i}.txt"):
            book, ch, v, n, kind = m.groups()
            if not c[1] or kind[0] not in "LQRX":
                continue
            text = c[1].replace("/", "").replace("\\", "")
            strongs = c[4].split("\\")[0]
            root = re.search(r"\{(H\d+[A-Za-z]?)\}", strongs)
            strong = root.group(1) if root else strongs.split("/")[-1].strip("{}")
            # The expanded tags carry the root's dictionary form and gloss: {H1254A=בָּרָא=to create}
            exp = re.search(r"\{" + re.escape(strong) + r"=([^=]*)=([^}]*)\}", c[11]) if len(c) > 11 else None
            lemma, short = (exp.group(1), exp.group(2)) if exp else ("", "")
            yield (BOOK_ID[book], int(ch), int(v), int(n), text, c[2].replace("/", ""), gloss_text(c[3]), strong,
                   fix_morph(strong, c[5]), lemma, short)


# Source tags corrected, by lemma: TAHOT's morphology (from ETCBC) tags בֵּין "between" (H0996) as a cardinal number
# (Acmsc) - shown as NUM-MSC; it's a preposition, so its part is made R (PREP), any prefix kept (HC/R: CONJ+PREP).
MORPH_FIXES = {"H0996": (r"(^H|/)A[cgoa][mfcb][spd][acd]", r"\1R")}


def fix_morph(strong, mcode):
    fix = MORPH_FIXES.get(re.sub(r"[A-Z]$", "", strong))     # (By the Strong's number, its sense letter dropped: H0996G)
    return re.sub(fix[0], fix[1], mcode) if fix else mcode


def greek_words():
    """TAGNT: the Nestle-Aland text's words (type with N), same tuple as hebrew_words."""
    for i in (1, 2):
        for m, c in read_rows(f"TAGNT{i}.txt"):
            book, ch, v, n, kind = m.groups()
            if kind[0] not in "Nn":
                continue
            gm = re.match(r"^(.*?) \((.*)\)$", c[1].strip())
            text, translit = (gm.group(1), gm.group(2)) if gm else (c[1].strip(), "")
            tag, _, grammar = c[3].partition("=")
            strong = tag.split("«")[-1].split("|")[-1].strip()
            lemma, _, short = c[4].partition("=")
            yield (BOOK_ID[book], int(ch), int(v), int(n), text, translit, gloss_text(c[2]), strong, grammar.strip(),
                   lemma.strip(), short.strip())


def entry_html(s):
    """A lexicon entry reduced to text with <b>, <i> and <br> only (references kept as their text)."""
    s = re.sub(r"<br\s*/?>", "\n", s, flags=re.I)
    s = re.sub(r"<(/?)(b|i)>", "\x01\\1\\2\x02", s, flags=re.I)
    s = re.sub(r"<[^>]*>", "", s)
    s = html.escape(html.unescape(s), quote=False)
    s = s.replace("\x01", "<").replace("\x02", ">").replace("__", "")
    return "<br>".join(line.strip() for line in s.split("\n") if line.strip())


def concise(strong, gloss, entry, most=4):
    """The meaning to memorise: a few words - the brief lexicon's gloss ("land: country/planet" -> "land, country,
    planet"), then, for a Hebrew word that isn't a name, the senses of its entry's first numbered line ("1) to create,
    shape, form"), each once, notes in brackets and anything with a reference or Hebrew / Greek dropped; at most
    `most` of them. בָּרָא "to create, shape, form"; דָּבָר "word, speech, speaking, thing"; λόγος "word"."""
    items, seen = [], set()

    def add(t):
        t = re.sub(r"\([^)]*\)|\[[^]]*\]|<[^>]*>", "", t)
        t = re.sub(r"\s+", " ", t).strip(" ,;.:-")
        key = re.sub(r"^(to|a|an|the) ", "", t.lower())
        if t and len(t.split()) <= 4 and not re.search(r"[\u0590-\u05FF\u0370-\u03FF\u1F00-\u1FFF\d]", t) \
                and key not in seen:
            seen.add(key)
            items.append(t)

    # ("s/he" is "she, he", not "s" and "he": αὐτός's "it/s/he")
    for part in re.split(r"[:/]", re.sub(r"\bs/he\b", "she/he", gloss or "")):
        add(part)
    first = next((line for line in (entry or "").split("<br>") if re.match(r"\s*1\)", line)), "")
    if strong.startswith("H") and first and gloss[:1].islower():
        for part in re.split(r"[,;]", first[first.index(")") + 1:]):
            add(part)
    return ", ".join(items[:most]) or gloss


def lexicon_rows(name):
    """TBESH / TBESG: dStrong -> (lemma, translit, gloss, entry, concise)."""
    out = {}
    with open(DL / name, encoding="utf-8-sig") as f:
        for line in f:
            c = line.rstrip("\n").split("\t")
            if len(c) < 7 or not re.match(r"^[HG]\d", c[0]):
                continue
            key = c[1].split("=")[0].strip()
            if key and key not in out:
                entry = entry_html(c[7]) if len(c) > 7 else ""
                out[key] = (c[3], c[4], c[6], entry, concise(key, c[6], entry))
    return out


def build():
    fetch.fetch()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    tmp = OUT.with_suffix(".tmp")
    tmp.unlink(missing_ok=True)
    db = sqlite3.connect(tmp)
    db.executescript("""
        PRAGMA page_size = 4096;
        CREATE TABLE books (id INTEGER PRIMARY KEY, code TEXT, name TEXT, testament TEXT, chapters INTEGER);
        CREATE TABLE words (book INTEGER, chapter INTEGER, verse INTEGER, word INTEGER, text TEXT, translit TEXT,
                            gloss TEXT, strong TEXT, morph TEXT, PRIMARY KEY (book, chapter, verse, word)) WITHOUT ROWID;
        CREATE TABLE parsings (morph TEXT PRIMARY KEY, code TEXT, spelled TEXT, stem TEXT) WITHOUT ROWID;
        CREATE TABLE lexicon (strong TEXT PRIMARY KEY, lemma TEXT, translit TEXT, gloss TEXT, entry TEXT, concise TEXT)
                              WITHOUT ROWID;
        CREATE TABLE freq (strong TEXT, book INTEGER, count INTEGER, PRIMARY KEY (strong, book)) WITHOUT ROWID;
        CREATE TABLE guide (lang TEXT, grp TEXT, ord INTEGER PRIMARY KEY, code TEXT, meaning TEXT);
        CREATE TABLE form_freq (strong TEXT, code TEXT, book INTEGER, count INTEGER,
                                PRIMARY KEY (book, strong, code)) WITHOUT ROWID;
    """)
    lex = {**lexicon_rows("TBESH.txt"), **lexicon_rows("TBESG.txt")}
    counts = collections.Counter()
    form_counts = collections.Counter()     # (strong, code, book) - book 0 the whole testament
    chapters = collections.defaultdict(int)
    parsings = {}
    greek = set()     # (Which source codes are Greek: TAGNT's)
    extra_lex = {}
    for source, convert in ((hebrew_words(), morph.hebrew), (greek_words(), morph.greek)):
        rows = []
        place = collections.Counter()   # word numbers counted afresh per verse (see the module's comment)
        for (book, ch, v, _, text, translit, gloss, strong, mcode, lemma, short) in source:
            place[(book, ch, v)] += 1
            rows.append((book, ch, v, place[(book, ch, v)], text, translit, gloss, strong, mcode))
            if mcode not in parsings:
                parsings[mcode] = convert(mcode)
                if convert is morph.greek:
                    greek.add(mcode)
            counts[(strong, 0)] += 1
            counts[(strong, book)] += 1
            code = parsings[mcode][0]
            form_counts[(strong, code, 0)] += 1
            form_counts[(strong, code, book)] += 1
            chapters[book] = max(chapters[book], ch)
            if strong not in lex and strong not in extra_lex:
                extra_lex[strong] = (lemma, "", short, "", short)
        db.executemany("INSERT INTO words (book, chapter, verse, word, text, translit, gloss, strong, morph) "
                       "VALUES (?,?,?,?,?,?,?,?,?)", rows)
    db.executemany("INSERT INTO books VALUES (?,?,?,?,?)",
                   [(i + 1, code, name, "OT" if i < 39 else "NT", chapters[i + 1]) for i, (code, name) in enumerate(BOOKS)])
    db.executemany("INSERT INTO parsings VALUES (?,?,?,?)", [(k, *v) for k, v in parsings.items()])
    used = {s for (s, _) in counts}
    lex_rows = [(k, *v) for k, v in {**lex, **extra_lex}.items() if k in used]
    db.executemany("INSERT INTO lexicon VALUES (?,?,?,?,?,?)", lex_rows)
    db.executemany("INSERT INTO freq VALUES (?,?,?)", [(s, b, c) for (s, b), c in counts.items()])
    db.executemany("INSERT INTO form_freq VALUES (?,?,?,?)", [(s, k, b, c) for (s, k, b), c in form_counts.items()])
    db.executemany("INSERT INTO guide VALUES (?,?,?,?,?)", [(l, g, i, c, m) for i, (l, g, c, m) in enumerate(morph.guide())])
    grammar_counts = grammar.build(db, parsings, greek)
    note_counts = notes.build(db, [code for code, _ in BOOKS])
    bdb_keys, bdb_entries, bdb_bytes = bdb.build(db)
    db.executescript("""
        CREATE VIEW words_full AS
          SELECT w.*, p.code, p.spelled, p.stem, l.lemma, l.gloss AS lemma_gloss
          FROM words w LEFT JOIN parsings p ON p.morph = w.morph LEFT JOIN lexicon l ON l.strong = w.strong;
    """)
    db.commit()
    db.execute("VACUUM")
    db.close()
    tmp.replace(OUT)
    print(f"{OUT} - {OUT.stat().st_size / 1e6:.1f} MB; {len(lex_rows)} lexicon entries "
          f"({len(extra_lex)} from the text's own tags); {len(parsings)} parsing codes; grammar sections "
          + ", ".join(f"{g} {n}" for g, n in grammar_counts.items()) + "; notes "
          + ", ".join(f"{k} {n} ({b / 1e6:.1f} MB)" for k, (n, b) in note_counts.items())
          + f"; BDB {bdb_entries} entries for {bdb_keys} Strong's keys ({bdb_bytes / 1e6:.1f} MB)")


if __name__ == "__main__":
    build()
