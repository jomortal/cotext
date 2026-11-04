"""The notes panel's sources from Sefaria (notes.py builds them; its docstring lists every source): Jewish
translations, commentaries, Masoretic apparatus and the Targums, all Hebrew-numbered - mapped to the text's verses
(notes.hebrew_rows).

Fetched from Sefaria's public API (v3 texts: a whole book per request) into pipeline/downloads/notes/<id>/ - each
book's list of versions (<title>.versions.json: to pick the version and check its licence) and the version's text
(<title>.<lang>-<a hash of its name>.json) - pinned by hash in notes_pins.json (the API isn't versioned: a file is fetched once; a new copy
whose bytes differ stops the build until it's checked and its pin changed).

Each source: per book, Sefaria's title for it and the versions to use, in order of preference, with the licences
allowed (a book whose version isn't there, or is under another licence, is left out - the build says which):
  njps      Tanakh: The Holy Scriptures (NJPS, JPS 1985; CC-BY-NC): the whole Tanakh, its footnotes kept.
  ct        The Contemporary Torah (JPS 2006; CC-BY-NC): the Torah.
  koren     The Koren Jerusalem Bible (CC-BY-NC): the whole Tanakh.
  ibnezra   Ibn Ezra on the Torah, tr. Strickman and Silver (Menorah, 1988-2004; CC-BY-NC).
  rashi     Rashi in English: the Torah in Rosenbaum and Silbermann's (1929-34; public domain), the rest in the
            Judaica Press Complete Tanach's (tr. A. J. Rosenberg; CC-BY), or Metsudah's (CC-BY) where it has no book.
  ramban    Ramban on the Torah, tr. Charles B. Chavel (Shilo, 1971-76; CC-BY).
  mam       Miqra according to the Masorah (CC-BY-SA): the verse as it reads there, its words that differ from the
            text's (letters and vowels; accents, meteg and the divine name's holam aside) in bold.
  minchatshai  Minchat Shai (Norzi, 1742; public domain): its Masoretic notes, in Hebrew.
  onkelos   Targum Onkelos (public domain), Aramaic, with Etheridge's English (1862; public domain) under it where
            Sefaria has it (part of Genesis).
  tpj       Targum Pseudo-Jonathan on the Torah (Sefaria's "Targum Jonathan on Genesis"...; public domain), with
            Etheridge's English (1862; public domain).
  tj        Targum Jonathan on the Prophets (Mikraot Gedolot; public domain), with the London "Chaldee Paraphrase"
            (Pauli, 1871; public domain) under it in Isaiah.
A commentary's comments on a verse are each a note; a text's verse is one note (an Aramaic one with its English
under it). Sefaria's markup is reduced to notes.py's tags: footnotes small, in brackets; Hebrew / Aramaic
paragraphs right to left (<p dir="rtl">).
"""
import difflib
import hashlib
import json
import re
import unicodedata
import urllib.parse

import notes

API = "https://www.sefaria.org/api/"
TANAKH = ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "I Samuel",
          "II Samuel", "I Kings", "II Kings", "I Chronicles", "II Chronicles", "Ezra", "Nehemiah", "Esther", "Job",
          "Psalms", "Proverbs", "Ecclesiastes", "Song of Songs", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel",
          "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai",
          "Zechariah", "Malachi"]     # (Sefaria's names, in the text's book order: ids 1-39)
TORAH = range(1, 6)
PROPHETS_TJ = [6, 7, 9, 10, 11, 12, 23, 24, 26, *range(28, 40)]     # (Targum Jonathan's books: the Former and Latter Prophets)

ETHERIDGE_O = ("J.W. Etheridge. The Targums of Onkelos and Jonathan Ben Uzziel on the Pentateuch. London: Longmans, "
               "Green, 1862")
ETHERIDGE_J = "The Targum of Jonathan ben Uzziel, trans. J. W. Etheridge, London, 1862"
JUDAICA = "The Judaica Press complete Tanach with Rashi, translated by A. J. Rosenberg"

# id -> (books, the title for a book, kind, [(language, [versions, preferred first], licences allowed)]): a text's
# second entry is its English under the first (the Targums).
SOURCES = {
    "njps": (range(1, 40), lambda t: t, "text",
             [("en", ["Tanakh: The Holy Scriptures, published by JPS"], {"CC-BY-NC"})]),
    "ct": (TORAH, lambda t: t, "text", [("en", ["The Contemporary Torah, Jewish Publication Society, 2006"], {"CC-BY-NC"})]),
    "koren": (range(1, 40), lambda t: t, "text", [("en", ["The Koren Jerusalem Bible"], {"CC-BY-NC"})]),
    "ibnezra": (TORAH, lambda t: "Ibn Ezra on " + t, "commentary",
                [("en", ["Ibn Ezra's commentary on the Pentateuch, tran. and annot. by H. Norman Strickman and Arthur "
                         "M. Silver. Menorah Pub., 1988-2004"], {"CC-BY-NC"})]),
    "rashi": (range(1, 40), lambda t: "Rashi on " + t, "commentary",
              [("en", ["Pentateuch with Rashi's commentary by M. Rosenbaum and A.M. Silbermann, 1929-1934", JUDAICA,
                       "The Book of Joshua, Metsudah Publications, 1997", "The Metsudah Tanach series, Lakewood, N.J",
                       "The Metsudah Five Megillot, Lakewood, N.J., 2001"], {"Public Domain", "CC-BY"})]),
    "ramban": (TORAH, lambda t: "Ramban on " + t, "commentary",
               [("en", ["Commentary on the Torah by Ramban (Nachmanides). Translated and annotated by Charles B. Chavel."
                        " New York, Shilo Pub. House, 1971-1976"], {"CC-BY"})]),
    "mam": (range(1, 40), lambda t: t, "mam", [("he", ["Miqra according to the Masorah"], {"CC-BY-SA"})]),
    "minchatshai": (range(1, 40), lambda t: ("Minchat Shai on Torah, " if t in TANAKH[:5] else "Minchat Shai on ") + t,
                    "commentary", [("he", ["Minchat Shai on Torah", "Minchat Shai"], {"Public Domain"})]),
    "onkelos": (TORAH, lambda t: "Onkelos " + t, "text",
                [("he", [None], {"Public Domain"}), ("en", [ETHERIDGE_O], {"Public Domain"})]),
    "tpj": (TORAH, lambda t: "Targum Jonathan on " + t, "text",
            [("he", [None], {"Public Domain"}), ("en", [ETHERIDGE_J], {"Public Domain"})]),
    "tj": (PROPHETS_TJ, lambda t: "Targum Jonathan on " + t, "text",
           [("he", ["Mikraot Gedolot"], {"Public Domain"}), ("en", ['London "Chaldee Paraphrase," 1871'], {"Public Domain"})]),
}


def versions(src, title):
    """Sefaria's versions of a book (cached, pinned)."""
    return json.loads(notes.download(src, f"{title}.versions.json",
                                     API + "texts/versions/" + urllib.parse.quote(title), "pin"))


def text(src, title, lang, prefer, licences):
    """The book's text in the first version preferred (None in prefer: the version named as the book, Sefaria's
    main one) that Sefaria has under an allowed licence: (nested lists - chapter, verse[, comment] - of HTML
    strings, the version's title), or (None, why) if there's none."""
    have = {v["versionTitle"]: v for v in versions(src, title)
            if isinstance(v, dict) and v.get("language") == lang and v.get("actualLanguage", lang) == lang}
    why = "not on Sefaria"
    for want in prefer:
        v = have.get(want or title)
        if not v:
            continue
        if v.get("license") not in licences:
            why = f"{v['versionTitle']}: licence {v.get('license')}"
            continue
        full = "english" if lang == "en" else "hebrew"
        url = (API + "v3/texts/" + urllib.parse.quote(title) + "?version="
               + urllib.parse.quote(f"{full}|{v['versionTitle']}"))
        name = f"{title}.{lang}-{hashlib.sha1(v['versionTitle'].encode()).hexdigest()[:6]}.json"
        got = json.loads(notes.download(src, name, url, "pin"))["versions"]
        if got and got[0].get("license") in licences:
            return got[0]["text"], v["versionTitle"]
    return None, why


def rule(tag, a):
    """Sefaria's markup -> notes.py's tags (Clean): a footnote (<i class=footnote>) small, its marker dropped."""
    cls = a.get("class", "")
    if tag == "sup" and "footnote-marker" in cls:
        return "drop"
    if tag == "i" and "footnote" in cls:
        return "small"
    if tag == "sup":
        return "drop" if "endFootnote" in cls else None
    return {"b": "b", "i": "i", "em": "i", "br": "br", "p": "p", "small": None}.get(tag)


def html(s, rtl=False):
    """One string of Sefaria's -> the panel's HTML: footnotes in brackets; a Hebrew / Aramaic one right to left,
    each paragraph one run in the Hebrew font (not a run per word between its punctuation)."""
    body = notes.clean(s.replace("&thinsp;", " "), rule)
    body = body.replace("<small>", " <small>(").replace("</small>", ")</small>")
    body = re.sub(r"(<br>\s*)+</p>", "</p>", re.sub(r"<p>(\s*<br>)+", "<p>", body))
    if rtl:
        body = re.sub(r"</?span[^>]*>", "", body)
        body = re.sub(r"<p>(.*?)</p>", r'<p dir="rtl"><span class="he">\1</span></p>', body)
    return body


def flat(t):
    """A text's nested lists -> (chapter, verse, [strings]) per verse with something in it (1-based)."""
    for c, ch in enumerate(t or [], 1):
        for v, vs in enumerate(ch if isinstance(ch, list) else [], 1):
            items = [x for x in (vs if isinstance(vs, list) else [vs]) if isinstance(x, str) and x.strip()]
            if items:
                yield c, v, items


# ---- MAM against the text: the words that differ ----

STRIP = re.compile("[֑-ֽ֯׀׃ׅׄ־‍‌ ׆]")     # (Accents, meteg, paseq, sof pasuq, dots, maqaf)


def bare(word):
    """A word for comparing: letters and vowels only (NFD order), qamats qatan as qamats, the divine name's holam
    (MAM's יְהֹוָה) dropped."""
    w = STRIP.sub("", unicodedata.normalize("NFD", word)).replace("ׇ", "ָ")
    if re.sub("[^א-ת]", "", w) == "יהוה":
        w = w.replace("ֹ", "")
    return unicodedata.normalize("NFD", w)


def mam_body(s, mine):
    """A MAM verse marked against the text's words (mine: the verse's words): MAM's words not in the text at that
    place bold. Its markers ({פ} / {ס}, the ketiv's brackets) kept as MAM prints them; its own markup dropped."""
    plain = notes.html.unescape(re.sub(r"<[^>]*>", "", s.replace("&thinsp;", " ").replace("<br>", " ")))
    mark = lambda x: re.fullmatch(r"\{?[פס]\}?", x)     # (A paragraph mark, MAM's {פ} or the text's פ: not compared)
    theirs = [(w, [] if mark(w) else [bare(x) for x in w.split("־") if bare(x)]) for w in plain.split()]
    a = [p for _, ps in theirs for p in ps]
    b = [bare(x) for w in mine if not mark(w) for x in w.split("־") if bare(x)]
    same = set()
    for blk in difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks():
        same.update(range(blk.a, blk.a + blk.size))
    out, k = [], 0
    for w, ps in theirs:
        differs = any(k + i not in same for i in range(len(ps)))
        k += len(ps)
        w = notes.html.escape(w, quote=False)
        out.append(f"<b>{w}</b>" if differs else w)
    return f'<p dir="rtl"><span class="he">{" ".join(out)}</span></p>'


# ---- Building ----

def rows(src, main_db):
    """One Sefaria source's rows for notes.write: each verse (or comment) mapped to the text's verses."""
    books, title_of, kind, langs = SOURCES[src]
    out, missing = [], []
    for b in books:
        title = title_of(TANAKH[b - 1])
        lang, prefer, licences = langs[0]
        t, why = text(src, title, lang, prefer, licences)
        if t is None:
            missing.append(f"{TANAKH[b - 1]} ({why})")
            continue
        english = {}
        if len(langs) > 1:
            et, _ = text(src, title, *langs[1])
            english = {(c, v): items for c, v, items in flat(et)}
        mine = {}
        if kind == "mam":
            for c, v, w in main_db.execute("SELECT chapter, verse, text FROM words WHERE book = ? ORDER BY chapter,"
                                           " verse, word", (b,)):
                mine.setdefault((c, v), []).append(w)
        for c, v, items in flat(t):
            if kind == "commentary":
                bodies = [html(x, rtl=lang == "he") for x in items]
            elif kind == "mam":
                targets = notes.hebrew_target(b, c, v)
                bodies = [mam_body(" ".join(items), [w for tc, tv in targets for w in mine.get((tc, tv), [])])]
            else:
                body = "".join(html(x, rtl=lang == "he") for x in items)
                if (c, v) in english:
                    body += "".join(html(x) for x in english[(c, v)])
                bodies = [body]
            for k, body in enumerate(bodies):
                if re.sub(r"<[^>]*>", "", body).strip():
                    out += notes.hebrew_rows(b, c, v, k, body)
    if missing:
        print(f"  {src}: left out " + ", ".join(missing))
    return out
