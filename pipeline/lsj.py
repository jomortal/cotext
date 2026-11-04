"""Liddell-Scott-Jones (LSJ): A Greek-English Lexicon, 9th edition (Liddell, Scott, Jones and McKenzie, Oxford 1940),
the fullest Greek lexicon a Greek word's panel offers (src/panel.ts' LEXICON) - for the NT's words and the
Septuagint's, its own included (the LXX's lemmas are LSJ's headwords: lxx.py) - and the source of the short gloss
the LXX-only lemmas get (glosses(): lxx.py).

Source: the Perseus Digital Library's TEI (Perseus:text:1999.04.0057), github.com/PerseusDL/lexica at commit
1c34cdf (2026-10-26), CTS_XML_TEI/perseus/pdllex/grc/lsj/grc.lsj.perseus-eng1.xml ... eng27.xml - each pinned by
its SHA-256 in lsj_pins.json, fetched once into pipeline/downloads/greek_lex/lsj/ (about 280 MB). Licence: CC BY-SA
4.0 (the repo's license.md and each file's <availability>): Perseus credited, with a link to
http://www.perseus.tufts.edu/ and the GitHub repository. Its Greek is in Beta Code (greek_lex.beta converts it);
entries (<entryFree>, about 116,000) keyed by lemma only (key="lo/gos", a homograph's number after it).

Mapping: every Greek key of the main database's lexicon (TBESG's extended Strong's and the LXX's GL keys) goes to
the entries whose headword (the key, its length marks and number dropped) matches the key's lemma - as written
(grave as acute), else accents ignored (greek_lex.headword), else a deponent's active or a plural's singular
(match's VARIANTS); homographs all shown, in LSJ's order (a capitalized lemma's capitalized ones first). None: LSJ
isn't offered for the word.

An entry as HTML (as greek_lex's lexicons: <div class=lexEntry>): its headword <b>, <span class=grc> round Greek
(length marks kept, as LSJ prints them), <b> its translations, <i> parts of speech, grammar and Latin, <div
class=sense> each sense (<b>A.</b>, <b>I.</b>, <b>1.</b>, <b>a.</b> - nested by level; a lone A unnumbered, as LSJ
prints it), references as LSJ abbreviates them (Pi.P.4.161, Il.2.3). Page breaks dropped.

Output: public/data/notes/lsj.db (entries: id - its place among LSJ's entries, html) and, in the main database,
greek_lex rows with lexicon 'lsj' and its greek_lex_file row - greek_lex.py's tables, so build() runs after
greek_lex.build().
"""
import functools
import hashlib
import html
import json
import pathlib
import re
import sqlite3
import urllib.request
import xml.etree.ElementTree as ET

import greek_lex

HERE = pathlib.Path(__file__).parent
DL = HERE / "downloads" / "greek_lex" / "lsj"
PINS = HERE / "lsj_pins.json"
URL = ("https://raw.githubusercontent.com/PerseusDL/lexica/1c34cdf756c63cf37db61bd366d733431dbd7aa0/"
       "CTS_XML_TEI/perseus/pdllex/grc/lsj/")


def fetch():
    """The 27 files, once, each checked against its SHA-256 in lsj_pins.json. Returns their paths in LSJ's order."""
    out = []
    for name, sha in json.loads(PINS.read_text()).items():
        path = DL / name
        if not path.exists():
            print("downloading", name)
            req = urllib.request.Request(URL + name, headers={"User-Agent": "COTEXT-pipeline/0.1 (Bible study app build)"})
            with urllib.request.urlopen(req, timeout=600) as r:
                data = r.read()
            if hashlib.sha256(data).hexdigest() != sha:
                raise SystemExit(f"{name}: not the pinned file (SHA-256 differs) - check the source, then lsj_pins.json")
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        out.append(path)
    return sorted(out, key=lambda p: int(re.search(r"eng(\d+)", p.name).group(1)))


# ---- An entry as HTML ----

ITALIC = {"pos", "gram", "tns", "mood", "per", "number", "gen", "itype", "lbl"}


def inline(e, greek):
    """An element's text and children as HTML; lang=greek (on it or above) its Beta Code converted."""
    conv = (lambda t: html.escape(greek_lex.beta(t), quote=False)) if greek else (lambda t: html.escape(t, quote=False))
    out = [conv(e.text or "")]
    for c in e:
        if c.tag == "pb":     # (A page break)
            out.append(conv(c.tail or ""))
            continue
        g = c.get("lang") == "greek"
        body = inline(c, greek or g)
        if c.tag == "ref":
            body = re.sub(r"\d+", "", body)     # (A homograph's number: the word meant)
        if c.tag == "bibl":     # (A reference as LSJ prints it: Pi.P.4.161, no space after a full stop)
            body = re.sub(r"\.\s+(?=[A-Z0-9])", ".", re.sub(r"\s+", " ", body).strip())
        if g and not greek:
            body = f'<span class="grc">{body}</span>'
        if c.tag == "tr":
            body = f"<b>{body}</b>"
        elif (c.tag in ITALIC and not g) or (c.tag == "foreign" and c.get("lang") == "la"):
            body = f"<i>{body}</i>"
        out.append(body)
        out.append(conv(c.tail or ""))
    return "".join(out)


def entry_html(e):
    """An <entryFree> as readable HTML (see the module's docstring)."""
    orth = e.find("orth")
    shown = greek_lex.beta(re.sub(r"\d+", "", (orth.text if orth is not None else "") or e.get("key") or "")).strip()
    parts = [f'<b><span class="grc">{html.escape(shown, quote=False)}</span></b>']
    senses = [c for c in e if c.tag == "sense"]
    lone = sum(1 for s in senses if s.get("level") == "1") <= 1
    depth = []     # (The open senses' levels, outermost first)
    for c in e:
        if c.tag == "sense":
            level = int(c.get("level") or 0)
            while depth and depth[-1] >= level:
                parts.append("</div>"); depth.pop()
            n = c.get("n") or ""
            parts.append(f'<div class="sense"><b>{html.escape(n)}.</b> ' if n and not (lone and level == 1) else "<div>")
            depth.append(level)
            parts.append(inline(c, False))
        elif c is not orth and c.tag != "pb":     # (Inflections, gender, a dialect before the senses: inline)
            body = inline(c, c.get("lang") == "greek")
            parts.append(f'<span class="grc">{body}</span>' if c.get("lang") == "greek"
                         else f"<i>{body}</i>" if c.tag in ITALIC else body)
        parts.append(html.escape(c.tail or "", quote=False))
    parts += ["</div>"] * len(depth)
    body = re.sub(r"\s+(?=[,;:)])", "", greek_lex.tidy("".join(parts)))     # (No space before punctuation)
    return f'<div class="lexEntry">{body}</div>'


def short(e, middle=False):
    """A few words of the entry's first sense, for a gloss: its translations (<tr>) in order - else the entry's first
    ones -, split at commas and semicolons, each without brackets or trailing punctuation, at most four words, none
    with a number, bracket or "=", each once; at most three, joined by ", ". middle: the first sense marked Pass. or
    Med. instead (a deponent's meaning, under its active: πορεύομαι in πορεύω's II, "to be driven, carried, go"),
    '' if none is. '' if it has none (a cross-reference only)."""
    senses = [c for c in e if c.tag == "sense"]
    if middle:     # (The first such sense with a translation, and the senses under it)
        voiced = lambda c: any(g.get("type") == "voice" and re.match(r"(Pass|Med|Dep)\.", g.text or "")
                               for gg in c.findall("gramGrp") for g in gg)
        j = next((j for j, c in enumerate(senses) if voiced(c) and c.find(".//tr") is not None), None)
        if j is None:
            return ""
        level = int(senses[j].get("level") or 0)
        under = next((k for k in range(j + 1, len(senses)) if int(senses[k].get("level") or 0) <= level), len(senses))
        senses = [senses[j]] + senses[j + 1:under]
    trs = [t for c in senses[:len(senses) if middle else 1] for t in c.iter("tr")]
    if not trs and not middle:
        trs = list(e.iter("tr"))
    items, seen = [], set()
    for s in (part for t in trs for part in re.split(r"[,;]", re.sub(r"\([^)]*\)|\[[^]]*\]", "", "".join(t.itertext())))):
        s = re.sub(r"\s+", " ", s).strip(" ,;.:-")
        key = re.sub(r"^(to|a|an|the) ", "", s.lower())
        if s and len(s.split()) <= 4 and not re.search(r"[\d=()]", s) and key not in seen:
            seen.add(key)
            items.append(s)
        if len(items) == 3:
            break
    return ", ".join(items)


def refers(e):
    """The word a cross-reference entry sends the reader to (ὀστοῦν "contr. for ὀστέον"; χράομαι "v. χράω"): its
    first <ref>, else its first Greek word outside the headword's own forms; '' if it has a translation."""
    if e.find(".//tr") is not None:
        return ""
    r = e.find(".//ref")
    if r is None:
        r = next((c for c in e.iter("foreign") if c.get("lang") == "greek"), None)
    return re.sub(r"[\d^_]", "", "".join(r.itertext())) if r is not None else ""


def head_key(e):
    """The entry's headword as matched: its key without a homograph's number or length marks, as Unicode."""
    return greek_lex.beta(re.sub(r"[\d^_]", "", e.get("key") or ""))


@functools.lru_cache(maxsize=1)
def read():
    """Every entry, in LSJ's order: [(headword, html, short gloss, its middle's (short(middle=True)), the word it
    refers to)] - parsed once per run (lxx.py's glosses and build() share it). Entries for a word's ending alone
    (key or headword "-xra/omai") left out."""
    out = []
    for path in fetch():
        for e in ET.parse(path).getroot().iter("entryFree"):
            orth = e.find("orth")
            if not (e.get("key") or "-").startswith("-") and not (orth is not None and (orth.text or "").startswith("-")):
                out.append((head_key(e), entry_html(e), short(e), short(e, True), greek_lex.beta(refers(e))))
    return out


@functools.lru_cache(maxsize=1)
def index():
    """{accents kept: {headword: [entry index]}, accents dropped: {...}} (greek_lex.headword's forms)."""
    by = {True: {}, False: {}}
    for i, (word, *_rest) in enumerate(read()):
        for a in (True, False):
            by[a].setdefault(greek_lex.headword(word, a), []).append(i)
    return by


# (A lemma LSJ heads otherwise: a deponent under its active - πορεύομαι, πορεύω -, a plural under its singular -
# ἀμφότεροι, ἀμφότερος)
VARIANTS = [(r"ομαι$", "ω"), (r"οι$", "ος")]


def match(lemma, deponent=None):
    """A lemma's entries: those whose headword matches it as written, else accents ignored, else the same for its
    VARIANTS; a capitalized lemma's capitalized entries first (Τίγρις the river before τίγρις the tiger).
    [entry index]; deponent (a list), if given, gets True when they're a deponent's active's."""
    by, entries = index(), read()
    for form in [lemma or ""] + [re.sub(p, r, lemma or "") for p, r in VARIANTS if re.search(p, lemma or "")]:
        for a in (True, False):
            k = greek_lex.headword(form, a)
            if k and k in by[a]:
                if deponent is not None:
                    deponent.append(form.endswith("ω") and not (lemma or "").endswith("ω"))
                cap = form[:1].isupper()
                return sorted(by[a][k], key=lambda i: entries[i][0][:1].isupper() != cap)
    return []


def glosses(lemmas):
    """{key: lemma} -> {key: short gloss} from the lemma's first LSJ entry with one - a deponent's from its active's
    Pass. or Med. sense, a cross-reference's from the entry it refers to (one step) - keys LSJ lacks, or whose entries give none, left out. lxx.py gives the LXX-only
    lemmas (GL keys) their gloss by it."""
    entries = read()
    out = {}
    for key, lemma in lemmas.items():
        dep = []
        ids = match(lemma, dep)
        col = 3 if dep and dep[0] else 2     # (A deponent found under its active: the active's Pass. or Med. sense)
        g = next((entries[i][col] for i in ids if entries[i][col]), "")
        if not g:
            g = next((entries[j][2] for i in ids if entries[i][4] for j in match(entries[i][4]) if entries[j][2]), "")
        if g:
            out[key] = g
    return out


def build(main_db):
    """public/data/notes/lsj.db and the main database's greek_lex / greek_lex_file rows for 'lsj' (replaced if
    there). Returns (keys with an entry, entries, bytes)."""
    keys = list(main_db.execute("SELECT strong, lemma FROM lexicon WHERE strong LIKE 'G%'"))
    rows = []
    for strong, lemma in keys:
        ids = match(lemma)
        if ids:
            rows.append((strong, "lsj", " ".join(map(str, ids))))
    entries = read()
    used = sorted({i for _s, _l, ids in rows for i in map(int, ids.split())})
    out = greek_lex.NOTES / "lsj.db"
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(".tmp")
    tmp.unlink(missing_ok=True)
    db = sqlite3.connect(tmp)
    db.executescript("PRAGMA page_size = 4096; CREATE TABLE entries (id INTEGER PRIMARY KEY, html TEXT);")
    db.executemany("INSERT INTO entries VALUES (?,?)", [(i, entries[i][1]) for i in used])
    db.commit()
    db.execute("VACUUM")
    db.close()
    tmp.replace(out)
    data = out.read_bytes()
    main_db.execute("DELETE FROM greek_lex WHERE lexicon = 'lsj'")
    main_db.execute("DELETE FROM greek_lex_file WHERE lexicon = 'lsj'")
    main_db.executemany("INSERT INTO greek_lex VALUES (?,?,?)", rows)
    main_db.execute("INSERT INTO greek_lex_file VALUES (?,?,?,?)",
                    ("lsj", "data/notes/lsj.db", hashlib.sha256(data).hexdigest()[:12], len(data)))
    return len(rows), len(used), len(data)
