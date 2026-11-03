"""Brown-Driver-Briggs: the full BDB entry a Hebrew word's panel opens (src/panel.ts' BDB button).

Source: the Open Scriptures Hebrew Bible project's HebrewLexicon (github.com/openscriptures/HebrewLexicon, commit
21c9add, 2019-09-02; the files CC BY 4.0, BDB's own text public domain), pinned by URL and SHA-256 and fetched once
into pipeline/downloads/bdb/:
  BrownDriverBriggs.xml  the lexicon's entries (Hebrew, then Biblical Aramaic), marked up: <w> a Hebrew word, <def>
                         a meaning, <pos> part of speech, <stem> a verb's stem, <sense n=...> a numbered sense
                         (nested), <ref> a Bible reference, <foreign> another language's word, <status> the
                         transcription's progress. It's a work in progress: about half the entries ("base") are their
                         outline only - headword, stems, senses and meanings, without BDB's citations and discussion.
  LexicalIndex.xml       the hub: each word with its Strong's number (+ a letter where BDB splits it: aug) and its BDB
                         entry's id.

Mapping: a COTEXT key (the lexicon's extended Strong's, H1254A) goes to the index's words with the same number. One
word: its entry. Several: those whose dictionary form matches the key's (accents ignored; else consonants alone),
narrowed by the key's letter where it agrees with the index's (H1254A to 1254a); none matching, all of them, in order.
A key with no number in the index (STEPBible's prefixes and names, H9001...) has no BDB entry: the button is hidden.

Output: public/data/notes/bdb.db, beside the notes panel's files - downloaded the first time a BDB is opened and kept
(src/db.ts' openNotesDb), so the main database stays small:
  entries  id (BDB's, a.ab.ab), html: the entry as readable HTML - <div class=bdbEntry> holding its text, <span
           class=he> round Hebrew, <span class=grc> round Greek, <b> meanings and stems (as BDB prints them), <i> parts
           of speech and other languages' words, <div class=sense> each sense (<b>1.</b> its number), nested as in BDB;
           a homograph's number (I., II.) before its headword. Nothing else.
In the main database (cotext.db):
  bdb      strong -> entries (BDB ids, space-separated, in the order shown), the keys that have one
  bdb_file file (data/notes/bdb.db), version (the file's hash: its URL and cache change with it), bytes
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
DL = HERE / "downloads" / "bdb"
OUT = HERE.parent / "public" / "data" / "notes" / "bdb.db"
COMMIT = "21c9add13bc727d3a951361778e97e3ff7afd1ce"
FILES = [("BrownDriverBriggs.xml", "2b52658a4323d91674cda4090ab8b3ebddfff640f4f18143c28300e80b2c38f8"),
         ("LexicalIndex.xml", "8f7a605c58899d2f44430149c143c00903976e1e91232476677972a69e5bc85f")]
NS = "{http://openscriptures.github.com/morphhb/namespace}"


def fetch():
    for name, sha in FILES:
        out = DL / name
        if out.exists():
            continue
        out.parent.mkdir(parents=True, exist_ok=True)
        print("downloading", name)
        url = f"https://raw.githubusercontent.com/openscriptures/HebrewLexicon/{COMMIT}/{name}"
        req = urllib.request.Request(url, headers={"User-Agent": "COTEXT-pipeline/0.1 (Bible study app build)"})
        with urllib.request.urlopen(req, timeout=600) as r:
            data = r.read()
        if sha and hashlib.sha256(data).hexdigest() != sha:
            raise SystemExit(f"{name}: not the pinned file (SHA-256 differs) - check the source, then update bdb.py")
        out.write_bytes(data)


# ---- An entry as HTML ----

def inline(el):
    """An element's content as HTML: its text, its children (by tag, as the module's docstring says), their tails."""
    out = [html.escape(el.text or "")]
    for c in el:
        tag = c.tag.replace(NS, "")
        body = inline(c)
        if tag == "w":
            out.append(f'<span class="he">{body}</span>')
        elif tag in ("def", "stem"):
            out.append(f"<b>{body}</b>")
        elif tag in ("pos", "asp", "em"):
            out.append(f"<i>{body}</i>")
        elif tag == "foreign":
            lang = c.get("{http://www.w3.org/XML/1998/namespace}lang")
            out.append(f'<span class="grc">{body}</span>' if lang == "grc" else
                       f'<span class="he">{body}</span>' if lang in ("arc", "he") else f"<i>{body}</i>")
        elif tag == "sense":
            n = c.get("n")
            out.append(f'<div class="sense">{f"<b>{html.escape(n)}.</b> " if n else ""}{body}</div>')
        elif tag in ("status", "page"):
            pass     # (The transcription's progress, a page break: not shown)
        else:
            out.append(body)     # (ref and anything else: its text)
        out.append(html.escape(c.tail or ""))
    return "".join(out)


def entry_html(el):
    body = re.sub(r"\s+", " ", inline(el)).strip()
    body = re.sub(r"\s*(<div[^>]*>|</div>)\s*", r"\1", body)     # (No stray spaces round a sense's block)
    mod = el.get("mod")
    return f'<div class="bdbEntry">{f"<b>{html.escape(mod)}.</b> " if mod else ""}{body}</div>'


# ---- Strong's to BDB ----

def bare(t, consonants=False):
    """A dictionary form as compared: accents, meteg and maqaf dropped (and, for consonants, the vowels too)."""
    t = unicodedata.normalize("NFD", t)
    t = re.sub("[֑-ֽ֯־׀׃-׆\\s\\[\\]]", "", t)
    if consonants:
        t = re.sub("[ְ-ׇ]", "", t)
    return unicodedata.normalize("NFC", t)


def index():
    """Strong's number -> [(aug letter, dictionary form, BDB id)], in the index's order."""
    by = {}
    for e in ET.parse(DL / "LexicalIndex.xml").getroot().iter(NS + "entry"):
        x, w = e.find(NS + "xref"), e.find(NS + "w")
        if x is None or not (x.get("strong") or "").isdigit() or not x.get("bdb"):
            continue     # (No number, or a prefix's letter - b, k, l...: not a COTEXT key)
        form = (w.text or "") if w is not None else ""
        by.setdefault(int(x.get("strong")), []).append((x.get("aug") or "", form, x.get("bdb")))
    return by


def pick(key, lemma, cands):
    if len(cands) == 1:
        return [cands[0][2]]
    letter = key[5:].lower()
    for cons in (False, True):
        same = [c for c in cands if bare(c[1], cons) == bare(lemma, cons)]
        if same:
            narrowed = [c for c in same if c[0] == letter]
            return [c[2] for c in (narrowed or same)]
    return [c[2] for c in cands]


def build(main_db):
    """Builds bdb.db and the main database's bdb and bdb_file tables from its lexicon's Hebrew keys. Returns
    (keys with an entry, entries, bytes)."""
    fetch()
    entries = {e.get("id"): e for e in ET.parse(DL / "BrownDriverBriggs.xml").getroot().iter(NS + "entry")}
    by = index()
    keys = {}
    for strong, lemma in main_db.execute("SELECT strong, lemma FROM lexicon WHERE strong LIKE 'H%'"):
        m = re.match(r"H(\d+)", strong)
        ids = [i for i in pick(strong, lemma or "", by.get(int(m.group(1)), [])) if i in entries] if m else []
        if ids:
            keys[strong] = list(dict.fromkeys(ids))
    used = {i for ids in keys.values() for i in ids}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    tmp = OUT.with_suffix(".tmp")
    tmp.unlink(missing_ok=True)
    db = sqlite3.connect(tmp)
    db.executescript("PRAGMA page_size = 4096; CREATE TABLE entries (id TEXT PRIMARY KEY, html TEXT) WITHOUT ROWID;")
    db.executemany("INSERT INTO entries VALUES (?,?)", [(i, entry_html(entries[i])) for i in sorted(used)])
    db.commit()
    db.execute("VACUUM")
    db.close()
    tmp.replace(OUT)
    data = OUT.read_bytes()
    main_db.executescript("""
        CREATE TABLE bdb (strong TEXT PRIMARY KEY, entries TEXT) WITHOUT ROWID;
        CREATE TABLE bdb_file (file TEXT, version TEXT, bytes INTEGER);
    """)
    main_db.executemany("INSERT INTO bdb VALUES (?,?)", [(k, " ".join(v)) for k, v in keys.items()])
    main_db.execute("INSERT INTO bdb_file VALUES (?,?,?)",
                    ("data/notes/bdb.db", hashlib.sha256(data).hexdigest()[:12], len(data)))
    return len(keys), len(used), len(data)
