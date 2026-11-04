"""The Tyndale Open Bible Dictionary: a topical Bible dictionary (about 6,000 articles, alphabetical - people, places,
things and theological terms), offered in a word's panel as "Dictionary" (src/panel.ts) when the word's root has an
article.

Source: Tyndale House Publishers' TyndaleOpenBibleDictionary.zip (release 1.6, 2023) from tyndaleopenresources.com,
pinned by its SHA-256 (the URL isn't versioned), fetched once into pipeline/downloads/notes/tobd/. Licence: CC BY-SA
4.0 (its _README.txt and the site); an adaptation is credited "Adapted from Tyndale Open Bible Dictionary. The
original work by Tyndale House Publishers is available for free at http://www.tyndaleopenresources.com." and says
what was changed (NOTICE).
  Articles/A.xml ... XY.xml - <item typename="Article" name="CainPerson"><title>Cain (Person)</title><body> of <p
  class=...> paragraphs (classes in its _classes.txt), <span class=...> styles, <a href="?bref=Gen.4.1"> scripture
  references and <a href="?item=KainPlace_Article_..."> cross-references; <include_items> pulls in a text box
  (Textboxes/), a chart (Charts/), a map or a picture.

Proper names go through STEPBible's TIPNR (Translators Individualised Proper Names with all References; CC BY 4.0),
at fetch.py's pinned commit: each person, place or other name (a month, a deity) with the disambiguated Strong's
keys it's written with - the main database's own keys (Cain H7014B, the place Kain H7014A) - and its names in the
ESV, KJV and NIV.

Matching a lemma (the main database's lexicon, every key a word of the text has) to articles - exact, case ignored,
a headword's * (not in the NLT) dropped:
  - A headword's keys (headword_keys): "Cain (Person)" -> cain, qualified Person; "Call, Calling" and "Canaan,
    Canaanite" -> each part (parts sharing their first three letters are variants); otherwise its first part and the
    inverted name read straight ("Calf, Golden" -> calf, golden calf; "God, Names of" -> god, names of god;
    "Captivity, the" -> captivity); "Offerings and Sacrifices" -> itself and each side (offerings, sacrifices).
  - A name in TIPNR: its names (the record's, the forms it lists, and the ESV / KJV / NIV variants that are names) and
    the lexicon's gloss, to the headwords that are those names - a person's not to "(Place)" articles and a place's
    not to "(Person)" ones.
  - Any other word: its gloss (a sub-meaning after ":" dropped, a verb's "to " too, brackets' words kept: "Sheep
    (Gate)" -> sheep gate), else each meaning of its concise gloss (build_db's concise: "flock, small cattle, sheep"),
    to a headword equal to it or to its plural (+s, +es) - never to a "(Person)" or "(Place)" article.
  Several articles: all kept, the panel shows the choice.

An article as light HTML (the notes' kind, styled as a grammar section, .gBody): <p>, <b>, <i>, <sup>, <div
class=gHead> (its subheadings), <table>/<tr>/<td> (its charts), <span class=he|grc> round Hebrew / Greek; scripture
references as their text; a cross-reference to another article <a data-art="<id>"> (the panel opens it); small
capitals as capitals (KJV, LORD); its text boxes and charts at the place they're included, each headed by its title;
maps and pictures left out. Its title (shown as the panel's heading) not repeated in the body.

Output: public/data/notes/tobd.db -
  articles  id (the source's name: CainPerson), title (as printed, the * kept: "Cain* (Place)"), html
  lemmas    strong (the main database's key) -> ids (the matching articles' ids, space-separated, in title order)
and its row in the main database's note_sources (kind 'dictionary', testaments '' - never in the notes' pickers:
src/notes.ts reads only the other kinds). notes.py keeps the row on a notes-only rebuild (rows it didn't make).

Run on its own: python3 pipeline/tyndale_dict.py (the main database already built: its lexicon is read and its
note_sources row written); build_db.py runs build() after the notes.
"""
import hashlib
import html
import pathlib
import re
import sqlite3
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import zipfile

HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE))
import fetch  # noqa: E402

DL = HERE / "downloads" / "notes" / "tobd"
OUT = HERE.parent / "public" / "data" / "notes" / "tobd.db"
ZIP = ("TyndaleOpenBibleDictionary.zip",
       "https://tyndaleopenresources.com/wp-content/themes/tyndale-openresources/files/TyndaleOpenBibleDictionary.zip",
       "10758ea00dbea7540f9337e43e59c8e4000295c1261e3426bab6f31c31dcff5b")
TIPNR = ("TIPNR.txt",
         fetch.BASE + urllib.parse.quote("Proper Nouns/TIPNR - Translators Individualised Proper Names with all "
                                         "References - STEPBible.org CC BY.txt"),
         "d595b9163d32a400bb0ef96b27a6de58335a63da840b82531fe9f5e1d16a318c")
SOURCE = ("tobd", "dictionary", "Tyndale Open Bible Dictionary", "",
          "Adapted from Tyndale Open Bible Dictionary, (c) 2023 Tyndale House Publishers, CC BY-SA 4.0. The original "
          "work is available for free at tyndaleopenresources.com. Names matched through STEPBible's TIPNR (CC BY 4.0).")


def download():
    """The two files, once, each checked against its pinned SHA-256 (a changed file stops the build: checked by hand
    before its hash is changed here)."""
    DL.mkdir(parents=True, exist_ok=True)
    for name, url, sha in (ZIP, TIPNR):
        path = DL / name
        if not path.exists():
            print("downloading", name)
            with urllib.request.urlopen(url) as r:
                path.write_bytes(r.read())
        if hashlib.sha256(path.read_bytes()).hexdigest() != sha:
            raise SystemExit(f"{path}: not the pinned file (SHA-256 differs)")


# ---- The articles as light HTML ----

# Paragraph classes (the source's _classes.txt): subheadings become a grammar section's heading (.gHead) or bold;
# the title (h1) and a picture's own paragraphs are left out; every other class is a plain paragraph.
HEADS = {"h2", "h2-preview", "h2-list", "box-h2", "box-h2-poetic", "caption-head"}
SUBHEADS = {"h3", "h4", "h5"}
DROP = {"h1", "artfile", "caption-text"}


def inline(el, ids):
    """An element's contents (its text, spans and links) as HTML: the styles the panel shows kept (<i>, <b>, <sup>,
    Hebrew and Greek), small capitals written as capitals, scripture references as their text, a cross-reference to
    an article that's here a link the panel opens (data-art)."""
    out = [html.escape(el.text or "", quote=False)]
    for c in el:
        inner = inline(c, ids)
        cls = c.get("class", "")
        if c.tag == "span":
            if cls in ("ital", "ital-super"):
                inner = f"<i>{inner}</i>"
            elif cls == "bold":
                inner = f"<b>{inner}</b>"
            elif cls.startswith("ital-bold"):
                inner = f"<b><i>{inner}</i></b>"
            elif cls in ("sc", "sc-ital", "divine-name"):
                inner = inner.upper()     # (kjv -> KJV, Lord -> LORD: small capitals as the print sets them)
            elif cls in ("sup", "vn"):
                inner = f"<sup>{inner}</sup>"
            elif cls == "hebrew":
                inner = f'<span class="he">{inner}</span>'
            elif cls == "greek":
                inner = f'<span class="grc">{inner}</span>'
            # (era, lc, sub, overbar: their text as it is)
        elif c.tag == "a":
            m = re.match(r"\?item=(.+?)_Article_", c.get("href", ""))
            if m and m.group(1) in ids:
                inner = f'<a data-art="{m.group(1)}">{inner}</a>'
        out.append(inner)
        out.append(html.escape(c.tail or "", quote=False))
    return "".join(out)


def body_html(body, ids, extras):
    """An article's (or a text box's, a chart's) body as the panel's HTML. extras: the text boxes and charts by
    (folder, name) -> (title, body element), put in where they're included, under their title."""
    out = []
    for el in body:
        if el.tag == "p":
            cls = el.get("class", "")
            if cls in DROP:
                continue
            text = inline(el, ids).strip()
            if not text:
                continue
            if cls in HEADS:
                out.append(f'<div class="gHead">{text}</div>')
            elif cls in SUBHEADS:
                out.append(f"<p><b>{text}</b></p>")
            else:
                out.append(f"<p>{text}</p>")
        elif el.tag == "table":
            rows = []
            for tr in el.iter("tr"):
                cells = ["<td>" + "<br>".join(inline(p, ids).strip() for p in td.iter("p")) + "</td>" for td in tr.iter("td")]
                rows.append("<tr>" + "".join(cells) + "</tr>")
            out.append("<table>" + "".join(rows) + "</table>")
        elif el.tag == "include_items":
            key = (el.get("src", "").split("/")[1], el.get("name"))
            if key in extras:     # (Maps and Pictures aren't: images, left out)
                title, inc = extras[key]
                out.append(f'<div class="gHead">{html.escape(title, quote=False)}</div>' + body_html(inc, ids, extras))
    return "".join(out)


def articles():
    """Every article: [(id, title, html)], in the source's (alphabetical) order."""
    items, extras = [], {}
    with zipfile.ZipFile(DL / ZIP[0]) as z:
        for name in sorted(z.namelist()):
            folder = name.split("/")[0]
            if not name.endswith(".xml") or folder not in ("Articles", "Textboxes", "Charts"):
                continue
            for item in ET.fromstring(z.read(name)).iter("item"):
                kind, body = item.get("typename"), item.find("body")
                if kind == "Article":
                    items.append((item.get("name"), item.findtext("title").strip(), body))
                elif kind in ("Textbox", "Chart"):
                    extras[(folder + ".xml", item.get("name"))] = (item.findtext("title").strip(), body)
    ids = {i for i, _, _ in items}
    return [(i, t, body_html(b, ids, extras)) for i, t, b in items]


# ---- Matching words to articles ----

def headword_keys(title):
    """An article's title as the keys a word matches (lowercase) and its qualifier ('person', 'place', another, or
    ''): the module's docstring gives the rules."""
    t = title.replace("*", "").strip()
    m = re.match(r"(.*?)\s*\(([^)]*)\)$", t)
    qual = ""
    if m:
        t, qual = m.group(1), m.group(2).lower().rstrip("s")     # (Persons -> person)
    parts = [p.strip() for p in t.split(",") if p.strip()]
    if len(parts) > 1 and all(p[:3].lower() == parts[0][:3].lower() for p in parts[1:]):
        keys = parts                                    # (Variants: Call, Calling)
    elif len(parts) > 1:
        rest = " ".join(parts[1:])     # (Calf, Golden: calf and golden calf; Captivity, the: captivity)
        keys = [parts[0]] + ([] if rest.lower() in ("the", "a", "an") else [rest + " " + parts[0]])
    else:
        keys = parts + (t.split(" and ") if t.count(" and ") == 1 else [])     # (Offerings and Sacrifices: each too)
    return [k.lower() for k in keys], qual


def tipnr():
    """TIPNR's names: strong -> (kind 'person' / 'place' / 'other', its names). Each record starts at a "$==========
    PERSON(s)", "PLACE" or "OTHER" line; its "– Named", "– Greek" and variant lines give a key (the field before «)
    and the names (the record's, before @; their "=ESV,KJV" variants - a name only when it starts with a capital)."""
    names, kind = {}, None
    for line in (DL / TIPNR[0]).read_text(encoding="utf-8").splitlines():
        if line.startswith("$=========="):
            word = line[11:].split("\t")[0].strip()     # (Some lines have no space after the =s; PLACE+PERSON a place
            kind = "person" if word.startswith("PERSON") else "place" if word.startswith("PLACE") else \
                "other" if word == "OTHER" else None      # named for a person; EXCLUDED OTHER skipped)
            continue
        if not kind or not line.startswith("– "):
            continue
        f = line.split("\t")
        if len(f) < 4 or "«" not in f[2]:
            continue
        strong = f[2].split("«")[0].strip()
        found = {n for n in f[1].split("@")[0].split("|") if n}
        for v in f[3].split(";"):
            v = v.split("=")[0].strip()
            if v[:1].isupper() and len(v.split()) <= 2:
                found.add(v)
        k, n = names.setdefault(strong, (kind, set()))
        n.update(found)
    return names


def gloss_keys(gloss):
    """A gloss as the key it matches: "offering: gift" -> offering, "to say" -> say, "Sheep (Gate)" -> sheep gate."""
    g = gloss.split(":")[0].replace("(", "").replace(")", "")
    g = re.sub(r"^to ", "", g.strip().lower())
    return re.sub(r"\s+", " ", g).strip()


def match(lexicon, arts):
    """strong -> [article id], for every lemma with at least one (the module's docstring gives the rules)."""
    index = {}     # key -> [(id, qualifier)]
    for i, title, _ in arts:
        keys, qual = headword_keys(title)
        for k in keys:
            index.setdefault(k, []).append((i, qual))
    names = tipnr()
    out = {}
    for strong, gloss, concise in lexicon:
        found = []
        if strong in names:
            kind, ns = names[strong]
            for n in sorted(ns | {gloss_keys(gloss or "")}):
                found += [i for i, q in index.get(n.lower(), []) if q not in ("person", "place") or q == kind]
        else:
            common = lambda k: [i for key in (k, k + "s", k + "es") for i, q in index.get(key, []) if q not in ("person", "place")]
            found = common(gloss_keys(gloss or ""))
            if not found:
                for k in (concise or "").split(","):
                    found += common(gloss_keys(k))
        found = list(dict.fromkeys(i for i in found if i))     # (Each once, in the order found)
        if found:
            out[strong] = found
    return out


def build(main_db):
    """Builds tobd.db from the downloads (fetched if missing) and the main database's lexicon, and lists it in
    note_sources (its row replaced). Returns (articles, lemmas matched, bytes)."""
    download()
    arts = articles()
    order = {i: n for n, (i, _, _) in enumerate(arts)}
    lex = main_db.execute("SELECT strong, gloss, concise FROM lexicon").fetchall()
    lemmas = match(lex, arts)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    tmp = OUT.with_suffix(".tmp")
    tmp.unlink(missing_ok=True)
    db = sqlite3.connect(tmp)
    db.executescript("""
        PRAGMA page_size = 4096;
        CREATE TABLE articles (id TEXT PRIMARY KEY, title TEXT, html TEXT) WITHOUT ROWID;
        CREATE TABLE lemmas (strong TEXT PRIMARY KEY, ids TEXT) WITHOUT ROWID;
    """)
    db.executemany("INSERT INTO articles VALUES (?,?,?)", arts)
    db.executemany("INSERT INTO lemmas VALUES (?,?)",
                   [(s, " ".join(sorted(ids, key=order.get))) for s, ids in lemmas.items()])
    db.commit()
    db.execute("VACUUM")
    db.close()
    tmp.replace(OUT)
    data = OUT.read_bytes()
    main_db.execute("CREATE TABLE IF NOT EXISTS note_sources (id TEXT PRIMARY KEY, kind TEXT, name TEXT, testaments TEXT,"
                    " credit TEXT, file TEXT, version TEXT, bytes INTEGER)")
    main_db.execute("INSERT OR REPLACE INTO note_sources VALUES (?,?,?,?,?,?,?,?)",
                    (*SOURCE, "data/notes/tobd.db", hashlib.sha256(data).hexdigest()[:12], len(data)))
    return len(arts), len(lemmas), len(data)


if __name__ == "__main__":
    con = sqlite3.connect(HERE.parent / "public" / "data" / "cotext.db")
    with con:
        n, m, size = build(con)
    con.close()
    print(f"tobd: {n} articles, {m} lemmas matched, {size / 1e6:.1f} MB")
