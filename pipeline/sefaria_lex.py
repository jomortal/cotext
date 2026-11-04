"""Jastrow and Klein: two Hebrew (and Aramaic) lexicons a Hebrew word's panel offers beside BDB (src/panel.ts' LEXICON
picker), from Sefaria, as bdb.py does BDB.

Sources, both on Sefaria (sefaria.org), read through its word API (api/words/<word>: every lexicon's entries for a word;
the lexicons themselves aren't in Sefaria's public text export, only its MongoDB dump, several GB):
  jastrow  Marcus Jastrow, A Dictionary of the Targumim, the Talmud Babli and Yerushalmi, and the Midrashic Literature
           (London, Luzac, 1903): Sefaria's digitization, its license "Public Domain" (api/texts/versions/Jastrow).
           Talmudic Hebrew and Aramaic: it has the Bible's Aramaic and many of its Hebrew words, often only a cross
           reference ("v. ...").
  klein    Ernest Klein, A Comprehensive Etymological Dictionary of the Hebrew Language for Readers of English (Carta
           Jerusalem, 1987): Sefaria's digitization, its license "CC-BY-NC" (api/texts/versions/Klein Dictionary) -
           NON-COMMERCIAL use only, attribution required. Each word's meanings and its etymology (the "notes": cognates).
Fetched once (python3 pipeline/sefaria_lex.py --fetch; about an hour) into pipeline/downloads/sefaria/, one request per
consonantal form of the text's Hebrew dictionary forms (Aramaic keys first; three at a time, each half a second
apart); the build itself reads only what's kept, never waiting on Sefaria. Each response cut to these two
lexicons' entries and kept as <form>.json. pipeline/sefaria_pins.json pins each kept file's SHA-256 (written on the first fetch; a refetch that
differs stops the build - check the source, then delete the pin).

Mapping: a COTEXT key (H1254A, lemma בָּרָא) goes to the entries, among its form's, whose headword (its homograph
number - I, ᴵᴵ - dropped) matches the dictionary form: with vowels (accents ignored: bdb.bare), else consonants alone -
then every homograph (Klein's roots, written without vowels, all match a verb so). None matching: that lexicon isn't
offered for the word. A key the brief lexicon lists as several forms (אֲנִי, אָֽנֹכִ֫י) tries each.

Output: public/data/notes/<lexicon>.db (downloaded the first time it's shown and kept: src/db.ts' openNotesDb):
  entries  id (a number), html: the entry as readable HTML - <div class=lexEntry>, its headword <b><span class=he>,
           <i> its part of speech, <div class=sense> each meaning (<b>1.</b> its number, a verb's stem in <i>), nested
           as in the source; Klein's etymology after them in brackets; Sefaria's links reduced to their text, <span
           class=he> round Hebrew; nothing else.
In the main database (cotext.db):
  sefaria_lex       strong, lexicon (jastrow, klein) -> entries (ids, space-separated, in the source's order)
  sefaria_lex_file  lexicon -> file (data/notes/<lexicon>.db), version (the file's hash), bytes
Run alone (python3 pipeline/sefaria_lex.py [--fetch]) it adds both to the existing public/data/cotext.db.
"""
import hashlib
import html
import json
import pathlib
import re
import sqlite3
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import bdb  # noqa: E402
import greek_lex  # noqa: E402

HERE = pathlib.Path(__file__).parent
DL = HERE / "downloads" / "sefaria"
PINS = HERE / "sefaria_pins.json"
NOTES = HERE.parent / "public" / "data" / "notes"
API = "https://www.sefaria.org/api/words/"
LEXICONS = {"jastrow": "Jastrow Dictionary", "klein": "Klein Dictionary"}     # (Our id -> Sefaria's parent_lexicon)


def consonants(t):
    """A Hebrew word's letters alone (no vowels, accents or marks; final forms as written)."""
    return re.sub("[^א-ת]", "", unicodedata.normalize("NFD", t))


def forms(lemma):
    """The dictionary forms a key's lemma lists (TBESH: "אֲנִי, אָֽנֹכִ֫י")."""
    return [f.strip() for f in re.split(r"[,/]", lemma or "") if consonants(f)]


def keys(main_db):
    """The text's Hebrew keys (STEPBible's prefixes and suffixes, H9000 up, left out), Aramaic first: [(strong,
    lemma, aramaic)]."""
    aram = {s for (s,) in main_db.execute("SELECT DISTINCT strong FROM words WHERE morph LIKE 'A%'")}
    out = [(s, l, s in aram) for s, l in main_db.execute(
        "SELECT strong, lemma FROM lexicon WHERE strong LIKE 'H%' AND strong IN (SELECT strong FROM words)")
        if not re.match(r"H9\d\d\d", s)]
    return sorted(out, key=lambda k: not k[2])


def get(w):
    """One form's entries from Sefaria, cut to the two lexicons' (their lexicon details dropped): the bytes kept."""
    req = urllib.request.Request(API + urllib.parse.quote(w), headers={"User-Agent": "COTEXT-pipeline/0.1 (Bible study app build)"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                got = json.loads(r.read())
            break
        except Exception as e:     # (A dropped connection or a busy server: wait, then try again)
            if attempt == 3:
                raise SystemExit(f"{w}: {e}")
            time.sleep(10 * (attempt + 1))
    kept = [e for e in got if isinstance(e, dict) and e.get("parent_lexicon") in LEXICONS.values()] if isinstance(got, list) else []
    for e in kept:
        e.pop("parent_lexicon_details", None)
    time.sleep(0.5)     # (Politely: each worker half a second between requests)
    return json.dumps(kept, ensure_ascii=False, sort_keys=True).encode()


def fetch(main_db, download):
    """Each consonantal form's entries (see the docstring): {form: [entry]}. download: the forms not yet kept fetched
    (three requests at a time - about an hour for all); otherwise only those kept are read (the build never waits on
    Sefaria: python3 pipeline/sefaria_lex.py --fetch first)."""
    pins = json.loads(PINS.read_text()) if PINS.exists() else {}
    want = list(dict.fromkeys(consonants(f) for _, l, _ in keys(main_db) for f in forms(l)))
    DL.mkdir(parents=True, exist_ok=True)
    if download:
        todo = [w for w in want if not (DL / f"{w}.json").exists()]
        with ThreadPoolExecutor(3) as pool:
            for n, (w, data) in enumerate(zip(todo, pool.map(get, todo)), 1):
                sha = hashlib.sha256(data).hexdigest()
                if w in pins and pins[w] != sha:
                    raise SystemExit(f"{w}: Sefaria's entries changed (SHA-256 differs from sefaria_pins.json) - check, then delete the pin")
                pins[w] = sha
                (DL / f"{w}.json").write_bytes(data)
                if n % 100 == 0:
                    PINS.write_text(json.dumps(pins, ensure_ascii=False, indent=0, sort_keys=True))
                    print(f"sefaria: {n} / {len(todo)}", flush=True)
        PINS.write_text(json.dumps(pins, ensure_ascii=False, indent=0, sort_keys=True))
    out = {}
    for w in want:
        path = DL / f"{w}.json"
        if not path.exists():
            continue
        data = path.read_bytes()
        sha = hashlib.sha256(data).hexdigest()
        if pins.setdefault(w, sha) != sha:     # (One kept before its pin was written: pinned now)
            raise SystemExit(f"{path.name}: not the pinned file (SHA-256 differs) - delete it to fetch it again")
        out[w] = json.loads(data)
    PINS.write_text(json.dumps(pins, ensure_ascii=False, indent=0, sort_keys=True))
    return out, len(want)


# ---- Sefaria's HTML as the panel's ----

class Clean(HTMLParser):
    """Sefaria's markup reduced to the panel's few tags: <i> / <em> as <i>, <b> / <strong> as <b>, <sup>, a <span
    dir=rtl> (or a Hebrew link) as <span class=he>; links and every other tag their text. Text outside a Hebrew span
    goes through greek_lex.scripts (its own Hebrew and Greek runs spanned)."""
    KEEP = {"i": "i", "em": "i", "b": "b", "strong": "b", "sup": "sup"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out, self.stack, self.he = [], [], 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in self.KEEP:
            self.out.append(f"<{self.KEEP[tag]}>"); self.stack.append(f"</{self.KEEP[tag]}>")
        elif tag in ("span", "a") and a.get("dir") == "rtl" and not self.he:
            self.out.append('<span class="he">'); self.stack.append("</span>"); self.he += 1
        elif tag in ("br", "img", "hr"):     # (Void: no end tag to come)
            self.out.append("<br>" if tag == "br" else "")
        else:
            self.stack.append("")

    def handle_endtag(self, tag):
        if tag in ("br", "img", "hr") or not self.stack:
            return
        end = self.stack.pop()
        if end == "</span>" and self.he:
            self.he -= 1
        self.out.append(end)

    def handle_data(self, d):
        self.out.append(html.escape(d, quote=False) if self.he else greek_lex.scripts(d))


def clean(h):
    c = Clean()
    c.feed(h or "")
    c.close()
    return "".join(c.out) + "".join(reversed(c.stack))


def senses_html(senses):
    """A sense list (nested as Sefaria gives it) as HTML: a numbered one a <div class=sense><b>1.</b>, its stem and
    form (<i>Qal</i> <span class=he>בָּרָא</span>), its period (PBH, NH: Klein's post-Biblical and modern Hebrew) in
    <i>, its meaning; an unnumbered one inline."""
    out = []
    for s in senses or []:
        g = s.get("grammar") or {}
        body = []
        if g.get("verbal_stem"):
            body.append(f"<i>{html.escape(g['verbal_stem'].lstrip('— '))}</i> ")
        if g.get("binyan_form"):
            body.append(f'<span class="he">{html.escape(", ".join(g["binyan_form"]))}</span> ')
        if s.get("language_code"):
            body.append(f"<i>{html.escape(s['language_code'])}</i> ")
        body.append(clean(s.get("definition")))
        if s.get("plural_form"):
            body.append(" " + clean(s["plural_form"] if isinstance(s["plural_form"], str) else ", ".join(s["plural_form"])))
        body.append(senses_html(s.get("senses")))
        n = str(s.get("number") or "").rstrip(".)")
        if n:
            out.append(f'<div class="sense"><b>{html.escape(n)}.</b> {"".join(body)}</div>')
        elif s.get("senses") or g:
            out.append(f'<div>{"".join(body)}</div>')
        else:
            out.append(f'{"".join(body)} ')
    return "".join(out)


def entry_html(e):
    """An entry as the panel shows it (see the docstring)."""
    word, _, num = e["headword"].partition(" ")     # (A homograph's number - I, ᴵᴵ - outside the Hebrew, read left to right)
    out = [f'<b><span class="he">{html.escape(word)}</span>{" " + html.escape(num) if num else ""}</b>']
    if e.get("alt_headwords"):
        out.append(f' (<span class="he">{html.escape(", ".join(e["alt_headwords"]))}</span>)')
    if (e.get("language_code") or "").strip():
        out.append(f" <i>{html.escape(e['language_code'].strip(' ;'))}</i>")
    if e.get("language_reference"):
        out.append(" " + clean(e["language_reference"]))
    c = e.get("content") or {}
    if c.get("morphology"):
        out.append(f" <i>{html.escape(c['morphology'])}</i>")
    out.append(" " + senses_html(c.get("senses")))
    if e.get("plural_form"):
        out.append(" " + clean(", ".join(e["plural_form"]) if isinstance(e["plural_form"], list) else e["plural_form"]))
    for k in ("notes", "derivatives"):     # (Klein: the etymology, in its own brackets; the words derived)
        if e.get(k):
            out.append(f"<div>{clean(e[k])}</div>")
    return f'<div class="lexEntry">{greek_lex.tidy("".join(out))}</div>'


# ---- Build ----

def build(main_db):
    """Builds each lexicon's file and the main database's sefaria_lex and sefaria_lex_file tables from the forms
    kept. Returns {lexicon: (keys with an entry, entries, bytes), "forms": (kept, wanted)}."""
    got, wanted = fetch(main_db, "--fetch" in sys.argv)
    main_db.executescript("""
        DROP TABLE IF EXISTS sefaria_lex; DROP TABLE IF EXISTS sefaria_lex_file;
        CREATE TABLE sefaria_lex (strong TEXT, lexicon TEXT, entries TEXT, PRIMARY KEY (strong, lexicon)) WITHOUT ROWID;
        CREATE TABLE sefaria_lex_file (lexicon TEXT PRIMARY KEY, file TEXT, version TEXT, bytes INTEGER);
    """)
    counts = {}
    for lex, name in LEXICONS.items():
        ids, html_of, rows = {}, {}, []     # (Sefaria's rid -> our id; our id -> html)
        for strong, lemma, _ in keys(main_db):
            picked = []
            for f in forms(lemma):
                cands = [e for e in got.get(consonants(f), []) if e.get("parent_lexicon") == name]
                head = lambda e, cons: bdb.bare((e.get("headword") or "").split()[0] if e.get("headword") else "", cons)
                for cons in (False, True):
                    same = [e for e in cands if head(e, cons) == bdb.bare(f, cons)]
                    if same:
                        picked += same
                        break
            for e in picked:
                if e["rid"] not in ids:
                    ids[e["rid"]] = len(ids)
                    html_of[ids[e["rid"]]] = entry_html(e)
            if picked:
                rows.append((strong, lex, " ".join(dict.fromkeys(str(ids[e["rid"]]) for e in picked))))
        out = NOTES / f"{lex}.db"
        out.parent.mkdir(parents=True, exist_ok=True)
        tmp = out.with_suffix(".tmp")
        tmp.unlink(missing_ok=True)
        db = sqlite3.connect(tmp)
        db.executescript("PRAGMA page_size = 4096; CREATE TABLE entries (id INTEGER PRIMARY KEY, html TEXT);")
        db.executemany("INSERT INTO entries VALUES (?,?)", sorted(html_of.items()))
        db.commit()
        db.execute("VACUUM")
        db.close()
        tmp.replace(out)
        data = out.read_bytes()
        main_db.executemany("INSERT INTO sefaria_lex VALUES (?,?,?)", rows)
        main_db.execute("INSERT INTO sefaria_lex_file VALUES (?,?,?,?)",
                        (lex, f"data/notes/{lex}.db", hashlib.sha256(data).hexdigest()[:12], len(data)))
        counts[lex] = (len(rows), len(html_of), len(data))
    counts["forms"] = (len(got), wanted)
    return counts


if __name__ == "__main__":
    con = sqlite3.connect(HERE.parent / "public" / "data" / "cotext.db")
    print(build(con))
    con.commit()
