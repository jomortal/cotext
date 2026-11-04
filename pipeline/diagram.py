"""Sentence diagrams (the notes panel's SYNTAX group): MACULA's syntax trees made into a compact tree per sentence,
drawn by the app (src/notes.ts) - so the drawing can be tuned without rebuilding the data.

Fetched once into pipeline/downloads/notes/macula/ (pinned: the commit in the URL, and each file's SHA-256 recorded
in macula_pins.json at the first fetch, a later fetch must match):
  Greek   Clear-Bible/macula-greek (commit 8423afe, 2026-07-07), Nestle1904/lowfat/<nn>-<book>.xml - the Nestle 1904
          text's trees, a <sentence> each (a sentence may run over several verses).
  Hebrew  Clear-Bible/macula-hebrew (commit 47db250, 2026-04-24), WLC/lowfat/<nn>-<Book>-<ccc>-lowfat.xml - the
          Westminster Leningrad Codex's trees, a file per (Hebrew-numbered) chapter, its words split into morphemes.
Both CC BY 4.0 (Biblica; the Hebrew trees from the Groves Center's Westminster Hebrew Syntax, its morphology Open
Scriptures', its glosses Cherith's - all CC BY 4.0; each repository's LICENSE.md, read 2026-11-03).

The tree kept (a note's body, JSON; a sentence once, as a range note over the verses its words are in; empty fields
left out):
  sentence  {"l": "he" | "grc", "c": [clauses]} - its clauses one after another
  clause    {"j": [words] its joining words (καί, ὅτι, וְ, כִּי, אֲשֶׁר...), "t": its kind - 'relative', 'participle',
            'infinitive' (from its verb's form, or its relative word), else none -, "p": [phrases]}
  phrase    {"r": role (s subject, v verb, vc linking verb, o object, o2 second object, io indirect object, p
            predicate / complement, adv adverbial - Hebrew's pp too -, aux particle; '' none given), "w": [items]} -
            its words, and the clauses inside it (a "that..." clause, a relative, a participle's), in order
  word      [ref, n] - the text's word (COTEXT's words table: chapter * 1000 + verse, its word number), its text and
            gloss read from there -, or [text, gloss, ref] MACULA's own. ref in the text's numbering: the app dims a
            sentence's words of other verses.
MACULA's coordinations (wrappers of clauses and the words joining them) are taken apart: each clause its own, its
joining words on it. MACULA gives roles, not adverbials' kinds (when, where...), so the role is the label.

Words: MACULA's matched to the text's (TAGNT / TAHOT) by aligning each verse's words by their letters (Hebrew: a
word's morphemes joined; Greek: Nestle 1904 against TAGNT, which differ here and there). A matched word, whole in one
phrase, is the text's (as the interlinear shows it); otherwise MACULA's own - Nestle's word where the texts differ, a
Hebrew word split between phrases (וְ a clause's joining word, the rest in a phrase) as its morphemes with MACULA's
English glosses. Verses: MACULA's Hebrew is Hebrew-numbered, mapped to the text's by TAHOT's own numbers
(notes.hebrew_target); its Greek numbered as the text.

python3 pipeline/notes.py diagram_ot diagram_nt builds them (notes.py: a file per testament).
"""
import collections
import concurrent.futures
import difflib
import hashlib
import json
import pathlib
import re
import time
import unicodedata
import urllib.request
import xml.etree.ElementTree as ET

HERE = pathlib.Path(__file__).parent
DL = HERE / "downloads" / "notes" / "macula"
PINS = HERE / "macula_pins.json"
GREEK = "https://raw.githubusercontent.com/Clear-Bible/macula-greek/8423afe47b9e8f24b7772e808af45c7159a6fe7e/Nestle1904/lowfat/"
HEBREW = "https://raw.githubusercontent.com/Clear-Bible/macula-hebrew/47db250bd55d0d8577f2a94fba114ef16c35b23c/WLC/lowfat/"
GREEK_FILES = ["matthew", "mark", "luke", "john", "acts", "romans", "1corinthians", "2corinthians", "galatians",
               "ephesians", "philippians", "colossians", "1thessalonians", "2thessalonians", "1timothy", "2timothy",
               "titus", "philemon", "hebrews", "james", "1peter", "2peter", "1john", "2john", "3john", "jude",
               "revelation"]     # (Books 40-66, in order)
HEBREW_BOOKS = [("Gen", 50), ("Exo", 40), ("Lev", 27), ("Num", 36), ("Deu", 34), ("Jos", 24), ("Jdg", 21), ("Rut", 4),
                ("1Sa", 31), ("2Sa", 24), ("1Ki", 22), ("2Ki", 25), ("1Ch", 29), ("2Ch", 36), ("Ezr", 10), ("Neh", 13),
                ("Est", 10), ("Job", 42), ("Psa", 150), ("Pro", 31), ("Ecc", 12), ("Sng", 8), ("Isa", 66), ("Jer", 52),
                ("Lam", 5), ("Ezk", 48), ("Dan", 12), ("HOS", 14), ("Jol", 4), ("Amo", 9), ("Oba", 1), ("Jon", 4),
                ("Mic", 7), ("Nam", 3), ("Hab", 3), ("Zep", 3), ("Hag", 2), ("Zec", 14), ("Mal", 3)]
# (MACULA's file names, in the Hebrew Bible's chapters - Joel 4, Malachi 3; books 1-39, in English Bibles' order)


def files():
    """Every file: (book id 1-66, local path, URL)."""
    out = [(40 + i, DL / "greek" / f"{40 + i}-{n}.xml", f"{GREEK}{i + 1:02d}-{n}.xml") for i, n in enumerate(GREEK_FILES)]
    for i, (code, chapters) in enumerate(HEBREW_BOOKS):
        for c in range(1, chapters + 1):
            name = f"{i + 1:02d}-{code}-{c:03d}-lowfat.xml"
            out.append((i + 1, DL / "hebrew" / name, HEBREW + name))
    return out


def fetch():
    """Downloads what isn't here yet (8 at a time), each checked against (or recorded in) macula_pins.json."""
    pins = json.loads(PINS.read_text()) if PINS.exists() else {}

    def one(path, url):
        for attempt in range(4):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "COTEXT-pipeline/0.1 (Bible study app build)"})
                with urllib.request.urlopen(req, timeout=600) as r:
                    data = r.read()
                break
            except OSError:
                if attempt == 3:
                    raise
                time.sleep(5 * (attempt + 1))
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(".tmp")
        tmp.write_bytes(data)
        tmp.replace(path)
        return hashlib.sha256(data).hexdigest()

    todo = [(p, u) for _, p, u in files() if not p.exists()]
    if todo:
        print(f"downloading MACULA: {len(todo)} files")
        with concurrent.futures.ThreadPoolExecutor(8) as ex:
            for (p, u), sha in zip(todo, ex.map(lambda t: one(*t), todo)):
                key = f"{p.parent.name}/{p.name}"
                if key in pins and pins[key] != sha:
                    p.unlink()
                    raise SystemExit(f"{key}: not the pinned file (SHA-256 differs) - check the source, then update macula_pins.json")
                pins[key] = sha
        PINS.write_text(json.dumps(pins, indent=0, sort_keys=True) + "\n")


# ---- The tree ----

def letters(s):
    """A word's letters only (accents, vowels, punctuation and case left out; final sigma as sigma): how words are
    compared."""
    s = unicodedata.normalize("NFD", s).lower().replace("ς", "σ")
    return "".join(c for c in s if c.isalpha())


def ref_of(w):
    """A MACULA word's (chapter, verse, word) - its ref, "JHN 1:1!3" (Hebrew: the Hebrew's numbers)."""
    m = re.match(r"\S+ (\d+):(\d+)!(\d+)", w.get("ref"))
    return int(m.group(1)), int(m.group(2)), int(m.group(3))


def clauselike(e):
    """A group holding clauses: a clause, a relative phrase (אֲשֶׁר + its clause), or a group or plain wrapper of
    them (coordinated clauses: καί / וְ between)."""
    if e.tag != "wg":
        return False
    if e.get("class") in ("cl", "relp"):
        return True
    return e.get("class") is None and any(clauselike(k) for k in e)


def wrapper(e):
    """A clause-like group that is only its clauses and the words joining them (no constituent has a role)."""
    return not any(k.get("role") for k in e) and any(clauselike(k) for k in e)


class Builder:
    """One file's sentences made into trees. words: (chapter, verse, word) -> the text's (ref, word number) for every
    MACULA word matched; parts: (chapter, verse, word) -> its morphemes in the file (Hebrew; Greek always 1);
    verse_of: MACULA (chapter, verse) -> the text's ref."""

    def __init__(self, hebrew, words, parts, verse_of):
        self.hebrew, self.words, self.parts, self.verse_of = hebrew, words, parts, verse_of

    def unit(self, toks):
        """A run of one word's morphemes in one phrase as the diagram's word: [ref, n] - the text's word, matched
        and whole -, else [text, gloss, ref], MACULA's own."""
        key = ref_of(toks[0])
        if key in self.words and len(toks) == self.parts[key]:
            return list(self.words[key])
        text = "".join(t.text or "" for t in toks)
        gloss = " ".join((t.get("english") or (t.get("gloss") or "").replace(".", " ")) if self.hebrew else
                         (t.get("gloss") or "") for t in toks).strip()
        return [text, "" if gloss == "-" else gloss, self.verse_of(key[0], key[1])]     # (A split Hebrew verse:
        # an unmatched word on its first verse)

    def items(self, e):
        """A phrase's contents: its words (one item a word, a Hebrew word's morphemes joined) and the clauses in it,
        in order."""
        out, toks = [], []

        def flush():
            if toks:
                out.append(self.unit(toks))
                toks.clear()

        def walk(x):
            if x.tag == "w":
                if toks and ref_of(toks[-1]) != ref_of(x):
                    flush()
                toks.append(x)
            elif clauselike(x):
                flush()
                out.extend(self.clauses(x))
            else:
                for k in x:
                    walk(k)
        walk(e)
        flush()
        return out

    def items_of_tokens(self, ws):
        """Words outside any phrase (joining words, loose particles) as the diagram's words."""
        out, run = [], []
        for w in ws:
            if run and ref_of(run[-1]) != ref_of(w):
                out.append(self.unit(run))
                run = []
            run.append(w)
        if run:
            out.append(self.unit(run))
        return out

    def clauses(self, e, join=()):
        """A clause-like group as its clauses: [clause...] - several where it coordinates them. join: the words
        joining it to what's before (given to its first clause)."""
        join = list(join)
        if wrapper(e):
            out = []
            for k in e:
                if k.tag == "w":
                    join.append(k)
                elif clauselike(k):
                    out.extend(self.clauses(k, join))
                    join = []
                elif k.tag == "wg":     # (A phrase on its own between clauses)
                    out.append(self.finish({"j": self.items_of_tokens(join), "p": [{"r": "", "w": self.items(k)}]}, k))
                    join = []
            if join:     # (Words after the last clause: a phrase of their own in it)
                if out:
                    out[-1]["p"].append({"r": "", "w": self.items_of_tokens(join)})
                else:
                    out.append({"p": [{"r": "", "w": self.items_of_tokens(join)}]})
            if e.get("class") == "relp":
                for c in out:
                    c["t"] = "relative"
            return out
        phrases, loose = [], []
        for k in e:
            role = k.get("role") or ""
            if k.tag == "w" and not role:
                if not phrases and not loose and k.get("class") in ("conj", "cj", "rel"):
                    join.append(k)     # (A clause's own opening conjunction: its joining word)
                else:
                    loose.append(k)
                continue
            if loose:
                phrases.append({"r": "", "w": self.items_of_tokens(loose)})
                loose = []
            phrases.append({"r": "adv" if role == "pp" else role, "w": self.items(k)})
        if loose:
            phrases.append({"r": "", "w": self.items_of_tokens(loose)})
        return [self.finish({"j": self.items_of_tokens(join), "p": phrases}, e)]

    def finish(self, c, e):
        """A clause's kind ('relative', 'participle', 'infinitive' or none) from its words, and its empty fields left
        out."""
        if not c.get("j"):
            c.pop("j", None)
        kind = ""
        own = [w for w in e.iter("w")]
        verbs = [w for w in e if w.tag == "w" and w.get("role") in ("v", "vc")]
        for w in verbs:
            m = w.get("morph") or ""
            if self.hebrew:
                kind = "participle" if m[2:3] in ("r", "s") else "infinitive" if m[2:3] in ("a", "c") else ""
            else:
                mood = m.split("-")[1][-1:] if m.count("-") else ""
                kind = "participle" if mood == "P" else "infinitive" if mood == "N" else ""
        first = own[:2]
        if any((w.get("morph") or "").startswith("R-") or w.get("morph") == "Tr" for w in first):
            kind = "relative"
        if kind:
            c["t"] = kind
        return c


def align(mine, theirs):
    """MACULA's words matched to the text's by their letters, in order: {index in mine: index in theirs}."""
    sm = difflib.SequenceMatcher(None, mine, theirs, autojunk=False)
    out = {}
    for a, b, n in sm.get_matching_blocks():
        for i in range(n):
            out[a + i] = b + i
    return out


def rows(main_db, books=None):
    """The diagram's notes: a row per sentence - (book, start, end, ord, '', its tree as JSON) - for the books given
    (ids; None: all of both testaments). Prints the words matched per testament and the weakest books."""
    import notes
    fetch()
    text = collections.defaultdict(list)     # (book, ref) -> [(word number, letters)]
    for b, c, v, n, t in main_db.execute("SELECT book, chapter, verse, word, text FROM words ORDER BY book, chapter, verse, word"):
        text[b, c * 1000 + v].append((n, letters(t)))
    out, stats = [], collections.defaultdict(lambda: [0, 0])
    by_book = collections.defaultdict(list)
    for b, path, _ in files():
        if books is None or b in books:
            by_book[b].append(path)
    for b, paths in by_book.items():
        hebrew = b < 40
        roots = [ET.parse(p).getroot() for p in paths]
        # MACULA's words per verse, in their order: (chapter, verse) -> {word: letters}
        mac = collections.defaultdict(dict)
        parts = collections.Counter()
        for root in roots:
            for w in root.iter("w"):
                c, v, n = ref_of(w)
                mac[c, v][n] = mac[c, v].get(n, "") + letters(w.text or "")
                parts[c, v, n] += 1
        verse_of = ((lambda c, v: notes.ref(*notes.hebrew_target(b, c, v)[0])) if hebrew else
                    (lambda c, v: c * 1000 + v))
        words = {}
        for (c, v), ws in mac.items():
            targets = [notes.ref(*t) for t in notes.hebrew_target(b, c, v)] if hebrew else [c * 1000 + v]
            theirs = [(r, n, l) for r in targets for n, l in text.get((b, r), [])]
            keys = sorted(ws)
            got = align([ws[k] for k in keys], [l for _, _, l in theirs])
            for i, j in got.items():
                words[c, v, keys[i]] = theirs[j][:2]
            stats[b][0] += len(got)
            stats[b][1] += len(keys)
        bld = Builder(hebrew, words, parts, verse_of)
        k = 0
        for root in roots:
            for s in root.iter("sentence"):
                tree = []
                for e in s:
                    if e.tag == "wg":
                        tree.extend(bld.clauses(e) if clauselike(e) or wrapper(e) else
                                    [{"p": [{"r": "", "w": bld.items(e)}]}])
                    elif e.tag == "w":
                        tree.append({"p": [{"r": "", "w": bld.items_of_tokens([e])}]})
                refs = [words[k][0] if k in words else verse_of(*k[:2]) for k in map(ref_of, s.iter("w"))]
                if not refs:
                    continue
                k += 1
                out.append((b, min(refs), max(refs), k, "",
                            json.dumps({"l": "he" if hebrew else "grc", "c": tree}, ensure_ascii=False, separators=(",", ":"))))
    for t, rng in (("OT", range(1, 40)), ("NT", range(40, 67))):
        got = sum(stats[b][0] for b in rng)
        of = sum(stats[b][1] for b in rng)
        if of:
            weakest = sorted((stats[b][0] / stats[b][1], b) for b in rng if stats[b][1])[:3]
            print(f"diagram {t}: {got} of {of} words matched ({100 * got / of:.2f}%); weakest: "
                  + ", ".join(f"book {b} {100 * r:.1f}%" for r, b in weakest))
    return out
