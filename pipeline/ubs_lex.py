"""The UBS dictionaries: a Hebrew and a Greek lexicon a word's panel offers beside the others (src/panel.ts' LEXICON
picker), each sense that covers the word tapped marked "Used here".

Source: United Bible Societies' open-license resources (github.com/ubsicap/ubs-open-license, commit a15a96c,
2026; CC BY-SA 4.0, its LICENSE.md and README), pinned by URL and SHA-256 and fetched once into
pipeline/downloads/ubs/:
  ubs_he  UBS Dictionary of Biblical Hebrew (UBSHebrewDic-v0.9.4-en.JSON; adapted from the Semantic Dictionary of
          Biblical Hebrew, about 90% of the Old Testament's words so far). An entry per lemma, its Strong's numbers
          (H0001, A0002 - Aramaic -, some split H0032a / H0032b), base forms (part of speech) and their meanings
          (LEXMeanings): each a semantic domain, glosses, a definition, comments and every reference to it.
  ubs_gr  UBS Dictionary of the Greek New Testament (UBSGreekNTDic-v1.1-en.JSON; Louw and Nida's Greek-English
          Lexicon of the New Testament Based on Semantic Domains, revised): the same shape, each meaning its Louw-Nida
          number (33.98), domain and subdomain; about 110 entries have no Strong's number.
A reference is BBBCCCVVVPPPPP: book (the Protestant order, as COTEXT's), chapter, verse - the Hebrew's own numbering in
the Old Testament - and the word's place in the verse, counted in twos (the Hebrew by its parts: a prefix, the word -
its suffix not counted -; the Greek by words).

Mapping, a COTEXT key to entries (as bdb.py and greek_lex.py): those with its Strong's number; several, those whose
lemma matches the key's dictionary form (Hebrew: accents ignored, else consonants alone; Greek: as greek_lex.pick,
which also finds an entry with no number by its lemma, accents normalized); none matching, all of them.

"Used here", word by word: each reference goes to one of the COTEXT words in its verse whose key maps to its entry - the
one whose place, counted the same way, is nearest (the Hebrew's parts counted from TAHOT's morphology: every part but
a suffix (S...) and the Aramaic emphatic (Ta); the Greek's from the word's number). Matching by entry first makes it
reliable even where the counts drift (a hidden article, an edition's extra word): only a verse using the same word
twice in different senses relies on the place. TAHOT's verses carry their Hebrew numbering, so the Old Testament's
references follow it to the English verse COTEXT shows.

Output: public/data/notes/<lexicon>.db (downloaded the first time it's shown and kept: src/db.ts' openNotesDb):
  entries  id (the entry's number), html: <div class=lexEntry data-entry=id>: its headword <b><span class=he|grc>, each base form's
           part of speech <i>, each meaning a <div class=sense data-sense=N> (N its number in the entry, from 0): <b>1.</b>
           (Greek <b>a.</b>, Louw and Nida's letters), its domains <i>Domain › Subdomain</i> (and Louw-Nida number), the
           glosses <b>, the definition and comments; references written out (Jhn 21:24), cross references their text.
  here     book, chapter, verse (COTEXT's: English numbering), word (the word's place among the verse's words as shown,
           from 1), entry, sense: the meanings used by each word.
In the main database (cotext.db):
  ubs_lex       strong, lexicon (ubs_he, ubs_gr) -> entries (ids, space-separated)
  ubs_lex_file  lexicon -> file (data/notes/<lexicon>.db), version (the file's hash), bytes
Run alone (python3 pipeline/ubs_lex.py) it adds both to the existing public/data/cotext.db.
"""
import hashlib
import html
import json
import pathlib
import re
import sqlite3
import sys
import unicodedata
import urllib.request

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import bdb  # noqa: E402
import greek_lex  # noqa: E402

HERE = pathlib.Path(__file__).parent
DL = HERE / "downloads" / "ubs"
NOTES = HERE.parent / "public" / "data" / "notes"
BASE = "https://raw.githubusercontent.com/ubsicap/ubs-open-license/a15a96cfaa4ca18a6c0339016645ba1e534db3c8/dictionaries"
SOURCES = {     # lexicon -> (URL at its pinned commit, SHA-256)
    "ubs_he": (f"{BASE}/hebrew/JSON/UBSHebrewDic-v0.9.4-en.JSON",
               "28d0b53a17240b6225201c4cadcb82718c2761efab309d045018f764cf618217"),
    "ubs_gr": (f"{BASE}/greek/JSON/UBSGreekNTDic-v1.1-en.JSON",
               "d84bb9077a43fa4a4f7e571fe2ffa460fa655d7b78439b366281ce527fd56893"),
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
            raise SystemExit(f"{out.name}: not the pinned file (SHA-256 differs) - check the source, then update ubs_lex.py")
        out.write_bytes(data)
    return json.loads(out.read_text(encoding="utf-8-sig"))


# ---- Text ----

def place(ref):
    """A reference's (book, chapter, verse, place): 04300100100010 -> (43, 1, 1, 10); {N:..} notes dropped."""
    return int(ref[:3]), int(ref[3:6]), int(ref[6:9]), int(ref[9:14])


def text(t, books):
    """A definition's or comment's markup as HTML (greek_lex.scripts: escaped, Hebrew and Greek spans): {S:ref} the
    reference written out, {L:word<id>} its word, {D:33.50} its number, {A:RSV} its abbreviation, {N:..} dropped;
    Hebrew |i..|i italics; the Greek's lone | a line break."""
    def ref(m):
        b, c, v, _ = place(m.group(1))
        return f"{books.get(b, b)} {c}:{v}"
    t = re.sub(r"\{S:(\d{14})\}", ref, t or "")
    t = re.sub(r"\{L:([^<}]*)(?:<[^>]*>)?\}", r"\1", t)
    t = re.sub(r"\{[DA]:([^}]*)\}", r"\1", t)
    t = re.sub(r"\{N:[^}]*\}", "", t)
    parts = re.split(r"\|i(.*?)\|i", t)     # (Odd parts italic)
    out = "".join(f"<i>{greek_lex.scripts(p)}</i>" if i % 2 else greek_lex.scripts(p) for i, p in enumerate(parts))
    return out.replace("|", "<br>")


def entry_html(i, e, greek, books):
    """An entry as the panel shows it (see the docstring)."""
    cls = "grc" if greek else "he"
    out = [f'<b><span class="{cls}">{html.escape(unicodedata.normalize("NFC", e["Lemma"]))}</span></b>']
    n = 0
    for bf in e.get("BaseForms") or []:
        pos = ", ".join(bf.get("PartsOfSpeech") or [])
        if pos:
            out.append(f" <i>{html.escape(pos)}</i>")
        for m in bf.get("LEXMeanings") or []:
            label = "abcdefghijklmnopqrstuvwxyz"[n % 26] + "." if greek else f"{n + 1}."
            doms = [d["Domain"] for d in (m.get("LEXDomains") or []) + (m.get("LEXSubDomains") or []) if d.get("Domain")]
            dom = " › ".join(dict.fromkeys(doms))
            if greek and m.get("LEXEntryCode"):
                dom += f" ({m['LEXEntryCode']})"
            body = [f'<div class="sense" data-sense="{n}"><b>{label}</b> ']
            if dom:
                body.append(f"<i>{html.escape(dom)}</i>: ")
            if not greek and m.get("LEXForms"):     # (The verb's stems: qal, nif...)
                body.append(f"[{html.escape(', '.join(m['LEXForms']))}] ")
            for s in m.get("LEXSenses") or []:
                if s.get("Glosses"):
                    body.append("<b>" + greek_lex.scripts("; ".join(s["Glosses"])) + "</b>")
                d = s.get("DefinitionLong") or s.get("DefinitionShort")
                if d:
                    body.append(" - " + text(d, books))
                if s.get("Comments"):
                    body.append("<br><small>" + text(s["Comments"], books) + "</small>")
            body.append("</div>")
            out.append("".join(body))
            n += 1
    return f'<div class="lexEntry" data-entry="{i}">{greek_lex.tidy("".join(out))}</div>'


def nums(e):
    """An entry's Strong's numbers: [int]."""
    return [int(m.group(1)) for c in e.get("StrongCodes") or [] for m in [re.match(r"[HAG](\d+)", c or "")] if m]


# ---- Each COTEXT key's entries ----

def hebrew_map(entries, keys):
    """{strong: [entry index]} (see the docstring)."""
    by = {}
    for i, e in enumerate(entries):
        for n in nums(e):
            by.setdefault(n, []).append(i)
    out = {}
    for strong, lemma in keys:
        m = re.match(r"H(\d+)", strong)
        cands = list(dict.fromkeys(by.get(int(m.group(1)), []))) if m else []
        if len(cands) > 1:
            for cons in (False, True):
                same = [i for i in cands if bdb.bare(entries[i]["Lemma"], cons) == bdb.bare(lemma or "", cons)]
                if same:
                    cands = same
                    break
        if cands:
            out[strong] = cands
    return out


def greek_map(entries, keys):
    by_num = {}
    by_form = {a: {"index": {}} for a in (True, False)}
    for i, e in enumerate(entries):
        for n in nums(e):
            by_num.setdefault(n, []).append(i)
        for a in (True, False):
            by_form[a][i] = greek_lex.headword(unicodedata.normalize("NFC", e["Lemma"]), a)
            by_form[a]["index"].setdefault(by_form[a][i], []).append(i)
    out = {}
    for strong, lemma in keys:
        m = re.match(r"G(\d+)", strong)
        ids = greek_lex.pick(int(m.group(1)), lemma or "", by_num, by_form) if m else []
        if ids:
            out[strong] = list(dict.fromkeys(ids))
    return out


# ---- "Used here" ----

REF = re.compile(r"^(\w+)\.(\d+)\.(\d+)(?:\((\d+)\.(\d+)\))?[^#]*#(\d+)=(\S+)")


def hebrew_verses(main_db):
    """The Old Testament by the Hebrew's numbering: {(book, ch, v): [(COTEXT (book, ch, v), place shown, key, first
    part, last part)]}, each word's parts counted as the dictionary counts them (twos: see the docstring)."""
    hv = {}     # (COTEXT's (book, ch, v, n) -> the Hebrew's (ch, v), from TAHOT's references)
    code = {c: i for i, c in main_db.execute("SELECT id, code FROM books")}
    for i in range(1, 5):
        with open(HERE / "downloads" / f"TAHOT{i}.txt", encoding="utf-8-sig") as f:
            for line in f:
                m = REF.match(line)
                if m and m.group(4):
                    b, ch, v, hch, hvv, n, _ = m.groups()
                    hv[(code[b], int(ch), int(v), int(n))] = (int(hch), int(hvv))
    out, shown, last = {}, 0, None
    rows = main_db.execute("SELECT w.book, w.chapter, w.verse, w.word, w.strong, w.morph FROM words w "
                           "JOIN books b ON b.id = w.book WHERE b.testament = 'OT' ORDER BY w.book, w.chapter, w.verse, w.word")
    at = {}
    for b, ch, v, n, strong, morph in rows:
        shown = shown + 1 if last == (b, ch, v) else 1
        last = (b, ch, v)
        hch, hvv = hv.get((b, ch, v, n), (ch, v))
        k = (b, hch, hvv)
        parts = sum(1 for p in (morph or "")[1:].split("/") if p and not p.startswith("S") and p != "Ta") or 1
        start = at.get(k, 0)
        out.setdefault(k, []).append(((b, ch, v), shown, strong, 2 * start + 2, 2 * (start + parts)))
        at[k] = start + parts
    return out


def greek_verses(main_db):
    out, shown, last = {}, 0, None
    for b, ch, v, n, strong in main_db.execute(
            "SELECT w.book, w.chapter, w.verse, w.word, w.strong FROM words w JOIN books b ON b.id = w.book "
            "WHERE b.testament = 'NT' ORDER BY w.book, w.chapter, w.verse, w.word"):
        shown = shown + 1 if last == (b, ch, v) else 1
        last = (b, ch, v)
        out.setdefault((b, ch, v), []).append(((b, ch, v), shown, strong, 2 * n, 2 * n))
    return out


def used_here(entries, key_map, verses):
    """[(book, ch, v, word shown, entry, sense)]: each reference on the word it's about (see the docstring)."""
    to_keys = {}
    for k, ids in key_map.items():
        for i in ids:
            to_keys.setdefault(i, set()).add(k)
    rows = set()
    for i, e in enumerate(entries):
        keys = to_keys.get(i)
        if not keys:
            continue
        n = 0
        for bf in e.get("BaseForms") or []:
            for m in bf.get("LEXMeanings") or []:
                for r in m.get("LEXReferences") or []:
                    b, ch, v, p = place(r)
                    cands = [w for w in verses.get((b, ch, v), []) if w[2] in keys]
                    if cands:
                        w = min(cands, key=lambda w: 0 if w[3] <= p <= w[4] else min(abs(p - w[3]), abs(p - w[4])))
                        rows.add((*w[0], w[1], i, n))
                n += 1
    return sorted(rows)


# ---- Build ----

def build(main_db):
    """Builds each dictionary's file and the main database's ubs_lex and ubs_lex_file tables. Returns {lexicon:
    (keys with an entry, entries, words marked, bytes)}."""
    books = {i: c for i, c in main_db.execute("SELECT id, code FROM books")}
    main_db.executescript("""
        DROP TABLE IF EXISTS ubs_lex; DROP TABLE IF EXISTS ubs_lex_file;
        CREATE TABLE ubs_lex (strong TEXT, lexicon TEXT, entries TEXT, PRIMARY KEY (strong, lexicon)) WITHOUT ROWID;
        CREATE TABLE ubs_lex_file (lexicon TEXT PRIMARY KEY, file TEXT, version TEXT, bytes INTEGER);
    """)
    counts = {}
    for lex, greek in (("ubs_he", False), ("ubs_gr", True)):
        entries = fetch(lex)
        keys = list(main_db.execute("SELECT strong, lemma FROM lexicon WHERE strong LIKE ?", ["G%" if greek else "H%"]))
        key_map = (greek_map if greek else hebrew_map)(entries, keys)
        here = used_here(entries, key_map, (greek_verses if greek else hebrew_verses)(main_db))
        used = sorted({i for ids in key_map.values() for i in ids})
        out = NOTES / f"{lex}.db"
        out.parent.mkdir(parents=True, exist_ok=True)
        tmp = out.with_suffix(".tmp")
        tmp.unlink(missing_ok=True)
        db = sqlite3.connect(tmp)
        db.executescript("""PRAGMA page_size = 4096;
            CREATE TABLE entries (id INTEGER PRIMARY KEY, html TEXT);
            CREATE TABLE here (book INTEGER, chapter INTEGER, verse INTEGER, word INTEGER, entry INTEGER, sense INTEGER,
                               PRIMARY KEY (book, chapter, verse, word, entry, sense)) WITHOUT ROWID;""")
        db.executemany("INSERT INTO entries VALUES (?,?)", [(i, entry_html(i, entries[i], greek, books)) for i in used])
        db.executemany("INSERT INTO here VALUES (?,?,?,?,?,?)", here)
        db.commit()
        db.execute("VACUUM")
        db.close()
        tmp.replace(out)
        data = out.read_bytes()
        main_db.executemany("INSERT INTO ubs_lex VALUES (?,?,?)",
                            [(k, lex, " ".join(map(str, v))) for k, v in key_map.items()])
        main_db.execute("INSERT INTO ubs_lex_file VALUES (?,?,?,?)",
                        (lex, f"data/notes/{lex}.db", hashlib.sha256(data).hexdigest()[:12], len(data)))
        counts[lex] = (len(key_map), len(used), len({r[:4] for r in here}), len(data))
    return counts


if __name__ == "__main__":
    con = sqlite3.connect(HERE.parent / "public" / "data" / "cotext.db")
    print(build(con))
    con.commit()
