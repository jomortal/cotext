"""The Septuagint (LXX): Swete's Greek Old Testament, word by word, tagged as the Greek NT is - each word its lemma
(an extended Strong's key where the Greek lexicon has the word), a Robinson code (as TAGNT's: morph.py turns it into
COTEXT's code and spelled-out parsing), an English gloss and its counts.

Sources (pinned: each by its commit in the URL and its SHA-256 in lxx_pins.json):
  Text - Swete, The Old Testament in Greek according to the Septuagint (1909-1930; public domain), as Eliran Wong's
    LXX-Swete-1930 gives it (github.com/eliranwong/LXX-Swete-1930, commit 1d3efc3, 2017; the database GPL-3.0; the
    text from Pasquale Amicarelli's BibleWorks module): a word per line, its verse by where the verse starts (its
    SBL transliterations not taken: the reader spells Greek as modern Greek says it). Its book order, names (English) and verse numbers are kept as Swete has them. The repo
    carries no morphology (its README plans Tauber's, never added).
  Morphology - Seth Kushniryk's lxx-morph (github.com/OpenScriptorium/lxx-morph, commit c91f6b1, 2026-08; data CC BY
    4.0): Rahlfs' text (1935) tagged word by word - lemma (LSJ headwords; λέγω for εἶπεν, γινώσκω), part of speech
    and parsing ("aor ind act 3rd sg"), Perseus' Morpheus disambiguated in context and reviewed.

Swete's and Rahlfs' texts are nearly the same (both chiefly Codex Vaticanus), so each of Swete's chapters is lined up
with Rahlfs' word by word (difflib, on the words' letters without accents or case): a word matching one of Rahlfs'
takes its tags; one where the two differ takes the commonest analysis of the same form anywhere in Rahlfs (by its
accented, then unaccented letters); a form Rahlfs never has is left untagged (its lemma the word itself). Enoch,
which Rahlfs lacks, is tagged by form alone.

Lemmas -> keys: the Greek brief lexicon's (TBESG: extended Strong's, which covers much of the LXX's vocabulary) by
its headword - accented, then unaccented -, the NT's commonest key where several share it; a lemma TBESG lacks gets
a key of its own, GL00001 on (in the order first met), its lexicon entry the headword and part of speech.
The code: Robinson's, built from the parsing and the lemma's use in the NT (TAGNT) - its part of speech's letter
(personal, relative, demonstrative pronoun...), its person (ἐγώ P-1), a second aorist's 2, a deponent's voice (D, O,
N where the NT has the verb so in that tense) and an indeclinable's whole code (PRT-N, COND). Where the parsing
leaves a case open (a neuter's nominative or accusative) the word before decides it if it agrees (the article),
else an accusative preposition before it, else the first named; a gender left open the same way, else the NT's.
The gloss: the NT's commonest for that key and code, else for the key; blank for a word the NT lacks.

Books are build_db's ids 67 on, in Swete's order, testament 'LXX'. The main database's books table gets two more
columns for them: heb - the Hebrew Bible's book it corresponds to (0 for the books the Hebrew Bible lacks; the
picker heads those apart) - and notes - the book whose notes the panel shows: the Hebrew book's where the two
number their chapters and verses alike (each chapter's last verse the same in at least 90% of chapters), else
its own (then only Brenton's Septuagint in its own numbering: brenton_rows).
"""
import collections
import difflib
import hashlib
import json
import pathlib
import re
import unicodedata
import urllib.request

HERE = pathlib.Path(__file__).parent
DL = HERE / "downloads" / "lxx"
PINS = HERE / "lxx_pins.json"
SWETE = "https://raw.githubusercontent.com/eliranwong/LXX-Swete-1930/1d3efc3c63bd384a4f3f07ed37eef54b0d45ac33/"
MORPH = ("https://raw.githubusercontent.com/OpenScriptorium/lxx-morph/c91f6b1e8fb3ba37df701e6ae31f675ace71a2b2/"
         "db/seeds/lxx_morph/")
FIRST_ID = 67

# (Swete's code, its name as the picker shows it, lxx-morph's file (None: Rahlfs lacks it), the Hebrew Bible's book
# - build_db's code - or None). Swete's order. Nehemiah is 2 Esdras 11-23 in Rahlfs (and Swete), its own book here.
BOOKS = [
    ("Gen", "Genesis", "genesis", "Gen"), ("Exo", "Exodus", "exodus", "Exo"), ("Lev", "Leviticus", "leviticus", "Lev"),
    ("Num", "Numbers", "numbers", "Num"), ("Deu", "Deuteronomy", "deuteronomy", "Deu"),
    ("Jos", "Joshua", "joshua-vaticanus-b", "Jos"), ("Jdg", "Judges", "judges-vaticanus-b", "Jdg"),
    ("Rut", "Ruth", "ruth", "Rut"), ("1Sa", "1 Kingdoms", "1-samuel", "1Sa"), ("2Sa", "2 Kingdoms", "2-samuel", "2Sa"),
    ("1Ki", "3 Kingdoms", "1-kings", "1Ki"), ("2Ki", "4 Kingdoms", "2-kings", "2Ki"),
    ("1Ch", "1 Chronicles", "1-chronicles", "1Ch"), ("2Ch", "2 Chronicles", "2-chronicles", "2Ch"),
    ("1Es", "1 Esdras", "1-esdras", None), ("Ezr", "2 Esdras (Ezra)", "2-esdras", "Ezr"),
    ("Neh", "2 Esdras (Nehemiah)", "2-esdras", "Neh"), ("Psa", "Psalms", "psalms-lxx", "Psa"),
    ("Pro", "Proverbs", "proverbs", "Pro"), ("Ecc", "Ecclesiastes", "ecclesiastes", "Ecc"),
    ("Sol", "Song of Songs", "song-of-solomon", "Sng"), ("Job", "Job", "job-lxx", "Job"),
    ("Wis", "Wisdom of Solomon", "wisdom", None), ("Sip", "Sirach (Prologue)", "sirach", None),
    ("Sir", "Sirach", "sirach", None), ("Est", "Esther", "esther-greek", "Est"), ("Jdt", "Judith", "judith", None),
    ("Tob", "Tobit", "tobit", None), ("Tbs", "Tobit (Sinaiticus)", "tobit-sinaiticus", None),
    ("Hos", "Hosea", "hosea", "Hos"), ("Amo", "Amos", "amos", "Amo"), ("Mic", "Micah", "micah", "Mic"),
    ("Joe", "Joel", "joel", "Jol"), ("Oba", "Obadiah", "obadiah", "Oba"), ("Jon", "Jonah", "jonah", "Jon"),
    ("Nah", "Nahum", "nahum", "Nam"), ("Hab", "Habakkuk", "habakkuk", "Hab"), ("Zep", "Zephaniah", "zephaniah", "Zep"),
    ("Hag", "Haggai", "haggai", "Hag"), ("Zec", "Zechariah", "zechariah", "Zec"), ("Mal", "Malachi", "malachi", "Mal"),
    ("Isa", "Isaiah", "isaiah", "Isa"), ("Jer", "Jeremiah", "jeremiah-lxx", "Jer"), ("Bar", "Baruch", "baruch", None),
    ("Lam", "Lamentations", "lamentations", "Lam"), ("Epj", "Letter of Jeremiah", "letter-of-jeremiah", None),
    ("Eze", "Ezekiel", "ezekiel", "Ezk"), ("Dan", "Daniel (Old Greek)", "daniel", "Dan"),
    ("Dat", "Daniel (Theodotion)", "daniel-theodotion", "Dan"), ("Sus", "Susanna (Old Greek)", "susanna", None),
    ("Sut", "Susanna (Theodotion)", "susanna-theodotion", None),
    ("Bel", "Bel and the Dragon (Old Greek)", "bel-and-the-dragon", None),
    ("Bet", "Bel and the Dragon (Theodotion)", "bel-and-the-dragon-theodotion", None),
    ("1Ma", "1 Maccabees", "1-maccabees", None), ("2Ma", "2 Maccabees", "2-maccabees", None),
    ("3Ma", "3 Maccabees", "3-maccabees", None), ("4Ma", "4 Maccabees", "4-maccabees", None),
    ("Pss", "Psalms of Solomon", "psalms-of-solomon", None), ("1En", "Enoch", None, None), ("Ode", "Odes", "odes", None),
]
# Swete's chapter -> Rahlfs' where they differ: Nehemiah is 2 Esdras 11-23; Sirach's prologue Rahlfs' chapter 0.
CHAPTER_SHIFT = {"Neh": 10, "Sip": -1}


# ---- Fetching ----

def fetch():
    """Every file, once, into downloads/lxx/ (swete/, morph/): each checked against its SHA-256 in lxx_pins.json."""
    pins = json.loads(PINS.read_text())
    for key, sha in pins.items():
        out = DL / key
        if out.exists():
            continue
        folder, name = key.split("/")
        url = (SWETE if folder == "swete" else MORPH) + name
        print("downloading", key)
        with urllib.request.urlopen(url, timeout=600) as r:
            data = r.read()
        if hashlib.sha256(data).hexdigest() != sha:
            raise SystemExit(f"{key}: not the pinned file (SHA-256 differs) - check the source, then lxx_pins.json")
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(data)


# ---- Letters ----

GREEK = re.compile(r"[Ͱ-Ͽἀ-῿]")


def plain(s):
    """A word's letters for matching: lower case, no accents, breathings or punctuation, final sigma as σ."""
    s = unicodedata.normalize("NFD", s.lower())
    return "".join(ch for ch in s if "α" <= ch <= "ω" or ch == "ς").replace("ς", "σ")


def accented(s):
    """A word as written, for matching forms: NFC, lower case, a grave accent as acute, punctuation dropped."""
    s = unicodedata.normalize("NFC", s.lower().replace("\u1fbd", "'").replace("’", "'"))
    s = unicodedata.normalize("NFC", unicodedata.normalize("NFD", s).replace("\u0300", "\u0301"))
    return re.sub(r"[^Ͱ-Ͽἀ-῿']", "", s)


# ---- Swete's text ----

def swete():
    """{code: [(chapter, verse, word as printed)]}, in order: Swete's markers (⸂ ⸃ ⸆, [1]) dropped."""
    starts = {}
    for line in open(DL / "swete" / "00-Swete_versification.csv", encoding="utf-8"):
        i, ref = line.rstrip("\n").split("\t")
        b, c, v = re.match(r"(\w+)\.(\d+):(\d+)", ref).groups()
        starts[int(i)] = (b, int(c), int(v))
    out = collections.defaultdict(list)
    at = None
    for line in open(DL / "swete" / "01-Swete_word_with_punctuations.csv", encoding="utf-8"):
        i, _, w = line.rstrip("\n").partition("\t")
        at = starts.get(int(i), at)
        w = re.sub(r"[⸂⸃⸆]|\[\d+\]", "", w).strip()
        if at and GREEK.search(w):
            out[at[0]].append((at[1], at[2], w))
    return out


# ---- Rahlfs' tags ----

def morph_chapters(name):
    """lxx-morph's book: {chapter: [word dict...]} in order (its verse letters - 28a - kept in their place)."""
    out = collections.defaultdict(list)
    for v in json.loads((DL / "morph" / f"{name}.json").read_text()):
        m = re.search(r"(\d+):(\d+)\w*$", v["ref"])
        for w in v["words"]:
            if w.get("surface"):
                out[int(m.group(1))].append(w)
    return out


# ---- Robinson's codes ----

TENSES = {"pres": "P", "imperf": "I", "fut": "F", "aor": "A", "perf": "R", "plup": "L", "futperf": "F",
          "aor/imperf": "A"}
VOICES = {"act": "A", "mid": "M", "pass": "P", "mid/pass": "E", "act/pass": "A"}
MOODS = {"ind": "I", "subj": "S", "opt": "O", "imperat": "M", "inf": "N", "ptc": "P"}
PERSONS = {"1st": "1", "2nd": "2", "3rd": "3"}
NUMBERS = {"sg": "S", "pl": "P", "dual": "P"}     # (Robinson's codes have no dual: the NT has none)
CASES = {"nom": "N", "gen": "G", "dat": "D", "acc": "A", "voc": "V"}
GENDERS = {"masc": "M", "fem": "F", "neut": "N"}
# Parts of speech with no parsing -> Robinson's word (when the NT doesn't have the lemma to say better)
POS = {"conjunction": "CONJ", "preposition": "PREP", "adverb": "ADV", "particle": "PRT", "interjection": "INJ",
       "noun": "N", "proper noun": "N", "article": "T", "adjective": "A", "numeral": "A", "pronoun": "P",
       "verb": "V", "participle": "V"}
INDECLINABLE = {"CONJ", "PREP", "ADV", "PRT", "INJ", "COND"}
DECLINED = set("NATPRCDKIXQFS")
ACC_PREPS = {"εἰς", "ἀνά", "πρός", "διά", "κατά", "μετά", "ὑπέρ", "περί", "ἐπί", "παρά", "ὑπό"}     # (Prepositions taking the accusative - some others too)
FIRST, SECOND = {"ἐγώ", "ἡμεῖς"}, {"σύ", "ὑμεῖς"}


def choices(token, table):
    """'nom/voc/acc' -> ['N', 'V', 'A']: each letter one reading of an open parsing."""
    return [table[t] for t in token.split("/") if t in table]


class NT:
    """What the NT (TAGNT) says of each key, for the codes and glosses: its words' (strong, Robinson code, gloss,
    word as written); lex: the brief lexicons (their gloss the last resort)."""
    def __init__(self, rows, lex):
        self.lex = lex
        self.codes = collections.defaultdict(collections.Counter)
        self.gloss = collections.defaultdict(collections.Counter)
        for strong, code, gloss, text in rows:
            self.codes[strong][code] += 1
            gloss = re.sub(r"[\s,;.:!?·]+$", "", gloss)
            if gloss:
                for k in ((strong, accented(text)), accented(text), (strong, code), strong):
                    self.gloss[k][gloss] += 1

    def common(self, strong):
        c = self.codes.get(strong)
        return c.most_common(1)[0][0] if c else ""

    def head(self, strong):
        """The lemma's part of speech in the NT, with a pronoun's person: 'P-1', 'F-3', 'S-1S', 'D', 'N', ''."""
        c = self.common(strong)
        parts = c.split("-")
        if parts[0] in ("P", "F") and len(parts) > 1 and parts[1][:1] in "123":
            return parts[0] + "-" + parts[1][0]
        if parts[0] == "S" and len(parts) > 1:
            return "S-" + parts[1][:2]
        return parts[0]

    def verb(self, strong, tense, voice):
        """(second, voice) for a form of the verb in that tense and voice (A, M, P, E): the 2 of a second aorist
        (future, perfect) where most of the NT's forms of it in that tense - active and middle, or passive, as this
        one - have it; the voice a deponent's (D middle, O passive, N either) where the NT has the verb so in that
        tense, else as given."""
        passive = voice == "P"
        second, deps = 0, collections.Counter()
        for code, n in self.codes.get(strong, {}).items():
            m = re.match(r"V-(2?)([PIFARL])([AMPEDON])", code)
            if m and m.group(2) == tense:
                if (m.group(3) in "PO") == passive:
                    second += n if m.group(1) else -n
                if m.group(3) in "DON":
                    deps[m.group(3)] += n
        if voice in "MPE" and deps:
            want = {"M": "D", "P": "O", "E": "N"}[voice]
            voice = want if want in deps else voice if voice != "E" else deps.most_common(1)[0][0]
        return ("2" if second > 0 else ""), voice

    def gender(self, strong):
        g = collections.Counter()
        for code, n in self.codes.get(strong, {}).items():
            m = re.match(r"[NA]-[NGDAV][SP]([MFN])", code)
            if m:
                g[m.group(1)] += n
        return g.most_common(1)[0][0] if g else ""

    def gloss_for(self, strong, code, text):
        """The NT's commonest gloss for this key and form as written, else the form (any key), else this key and
        code, else the key; else the brief lexicon's gloss for it (before any ':' - "to see: see"); '' if none."""
        for k in ((strong, accented(text)), accented(text), (strong, code), strong):
            if self.gloss.get(k):
                return self.gloss[k].most_common(1)[0][0]
        return re.split(r"[:;]", (self.lex.get(strong) or ("", "", ""))[2])[0].strip()


def robinson(w, strong, nt, before, text):
    """One lxx-morph word -> a Robinson code. before: the codes of the verse's words before it, for an open case or
    gender (see the module's docstring); text: the word as written (an aorist or future "middle or passive" with
    θη / θε / θω in it is passive: γενηθήτω)."""
    pos = w.get("pos") or ""
    tokens = (w.get("parsing") or "").split()
    got = {}
    for t in tokens:
        for name, table in (("tense", TENSES), ("voice", VOICES), ("mood", MOODS), ("person", PERSONS),
                            ("number", NUMBERS)):
            if t in table:
                got[name] = table[t]
        if choices(t, CASES):
            got["case"] = choices(t, CASES)
        if choices(t, GENDERS):
            got["gender"] = choices(t, GENDERS)
        if t in ("comp", "superl"):
            got["degree"] = "C" if t == "comp" else "S"
    prev = before[-1] if before else ""
    prev_cng = re.match(r"[NATPRCDKIXQFS]-(?:[123])?([NGDAV])([SP])([MFN])?", prev)

    def case():
        c = got.get("case", [])
        if len(c) <= 1:
            return c[0] if c else ""
        if prev_cng and prev_cng.group(1) in c:
            return prev_cng.group(1)
        if "A" in c and any(b in ACC_PREPS for b in before[-3:]):
            return "A"
        return c[0]

    def gender():
        g = got.get("gender", [])
        if len(g) <= 1:
            return g[0] if g else ""
        if prev_cng and prev_cng.group(3) in g:
            return prev_cng.group(3)
        mine = nt.gender(strong)
        return mine if mine in g else g[0]

    if "mood" in got:
        t, v, m = got.get("tense", "P"), got.get("voice", "A"), got["mood"]
        if v == "E" and t in "AF":
            v = "P" if re.search("θ[ηεω]", plain(text)) else "M"
        second, v = nt.verb(strong, t, v)
        code = f"V-{second}{t}{v}{m}"
        if m == "P":
            return code + f"-{case()}{got.get('number', 'S')}{gender()}"
        if m == "N":
            return code
        return code + f"-{got.get('person', '3')}{got.get('number', 'S')}"
    head = nt.head(strong)
    if not got.get("case"):     # (Undeclined: the NT's own code for the word, else its part of speech's)
        common = nt.common(strong)
        if common.split("-")[0] in INDECLINABLE:
            return common
        if pos == "proper noun" or (pos == "noun" and not tokens):
            return "N-PRI"
        if pos == "numeral":
            return "A-NUI"
        if common and "-" not in common:
            return common
        p = POS.get(pos, "PRT")
        if p in INDECLINABLE:
            return p
        return "A-NUI" if pos == "adjective" else "" if p == "V" else p     # (A verb without its mood: untagged)
    letter = head.split("-")[0] if head[:1] in DECLINED and head.split("-")[0] in DECLINED else POS.get(pos, "N")
    if letter not in DECLINED:
        letter = "N"
    if pos == "article":
        letter = "T"
    person = head.split("-")[1] if "-" in head else ""
    if letter in ("P", "F") and not person and w.get("lemma") in FIRST | SECOND:
        person = "1" if w["lemma"] in FIRST else "2"
    g = "" if letter in ("P", "F") and person in ("1", "2") else gender()
    code = f"{letter}-{person}{case()}{got.get('number', 'S')}{g}"
    return code + (f"-{got['degree']}" if "degree" in got else "")


# ---- Lemmas -> keys ----

def lemma_key(s):
    return unicodedata.normalize("NFC", re.sub(r"[\d\s.,;:()·]+", "", s or "")).lower()


class Keys:
    """Lemma -> key: TBESG's by headword (the NT's commonest where several share it), else a new GL key."""
    def __init__(self, lex, nt):
        uses = collections.Counter({k: sum(c.values()) for k, c in nt.codes.items()})
        by, by_plain = {}, {}
        for k, (lemma, *_rest) in lex.items():
            if not k.startswith("G"):
                continue
            for table, key in ((by, lemma_key(lemma)), (by_plain, plain(lemma))):
                if key and (key not in table or uses[k] > uses[table[key]]):
                    table[key] = k
        self.by, self.by_plain, self.new, self.pos = by, by_plain, {}, {}

    def __call__(self, lemma, pos):
        k = self.by.get(lemma_key(lemma)) or self.by_plain.get(plain(lemma))
        if k:
            return k
        key = lemma_key(lemma) or "?"
        if key not in self.new:
            self.new[key] = f"GL{len(self.new) + 1:05d}"
            self.pos[self.new[key]] = (lemma, pos)
        return self.new[key]


# ---- The words ----

def words(nt_rows, lex):
    """The LXX's words and what build_db adds for them. nt_rows: TAGNT's (strong, Robinson code, gloss, word as
    written) per word;
    lex: the brief lexicons' {key: (lemma, translit, gloss, entry, concise)}.
    Returns (books [(code, name, heb code or None, chapters)], rows [(book id, ch, v, n, text, translit, gloss,
    strong, morph)], new lexicon rows {key: (lemma, translit, gloss, entry, concise)}, stats)."""
    fetch()
    nt = NT(nt_rows, lex)
    keys = Keys(lex, nt)
    text = swete()
    tagged = {}
    # Every form's commonest analysis in Rahlfs (by its accented letters, then its plain ones): the fallback
    forms, plain_forms = collections.defaultdict(collections.Counter), collections.defaultdict(collections.Counter)
    morph = {}
    for name in sorted({b[2] for b in BOOKS if b[2]}):
        morph[name] = morph_chapters(name)
        for ws in morph[name].values():
            for w in ws:
                a = (w.get("lemma") or "", w.get("parsing") or "", w.get("pos") or "")
                forms[accented(w["surface"])][a] += 1
                plain_forms[plain(w["surface"])][a] += 1
    stats = collections.Counter()
    books, rows = [], []
    for i, (code, name, mname, heb) in enumerate(BOOKS):
        bid = FIRST_ID + i
        ws = text[code]
        books.append((code, name, heb, max(c for c, *_ in ws)))
        by_ch = collections.defaultdict(list)
        for j, (c, v, w) in enumerate(ws):
            by_ch[c].append(j)
        match = {}     # (index in ws) -> lxx-morph word
        for c, idx in by_ch.items():
            theirs = morph[mname].get(c + CHAPTER_SHIFT.get(code, 0), []) if mname else []
            a = [plain(ws[j][2]) for j in idx]
            b = [plain(w["surface"]) for w in theirs]
            for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
                if op == "equal" or (op == "replace" and i2 - i1 == j2 - j1):
                    for k in range(i2 - i1):
                        if op == "equal" or difflib.SequenceMatcher(None, a[i1 + k], b[j1 + k]).ratio() >= 0.75:
                            match[idx[i1 + k]] = theirs[j1 + k]
        place = collections.Counter()
        before, verse = [], None
        for j, (c, v, w) in enumerate(ws):
            if (c, v) != verse:
                verse, before = (c, v), []
            place[(c, v)] += 1
            m = match.get(j)
            if m:
                stats["aligned"] += 1
            else:
                cand = forms.get(accented(w)) or plain_forms.get(plain(w))
                if cand:
                    lemma, parsing, pos = cand.most_common(1)[0][0]
                    m = {"lemma": lemma, "parsing": parsing, "pos": pos}
                    stats["by form"] += 1
                else:
                    stats["untagged"] += 1
            if m:
                strong = keys(m.get("lemma") or w, m.get("pos") or "")
                rcode = robinson(m, strong, nt, before, w)
                # (What the next word may agree with: a declined word's code, else - a preposition's - its lemma)
                before.append(rcode if re.match(r"[NATPRCDKIXQFS]-", rcode) else m.get("lemma") or "")
                gloss = nt.gloss_for(strong, rcode, w)
            else:
                strong, rcode, gloss = keys(accented(w).strip("'") or w, ""), "", ""
                before.append("")
            rows.append((bid, c, v, place[(c, v)], w, "", gloss, strong, rcode))
        tagged[code] = len(ws)
    names = {"noun": "noun", "proper noun": "proper name", "adjective": "adjective", "verb": "verb",
             "participle": "verb", "adverb": "adverb", "pronoun": "pronoun", "numeral": "number"}
    new_lex = {}
    for k, (lemma, pos) in keys.pos.items():
        part = names.get(pos, pos)
        new_lex[k] = (lemma, "", "", f"<b>{lemma}</b>" + (f" - {part}" if part else "") +
                      ". A word of the Septuagint the brief lexicon lacks.", "")
    stats["new keys"] = len(new_lex)
    return books, rows, new_lex, stats


# ---- Brenton's Septuagint in its own numbering ----

# Brenton's USFM books -> Swete's (several where Swete prints two Greek texts of one book: each gets Brenton's).
BRENTON = {"GEN": ["Gen"], "EXO": ["Exo"], "LEV": ["Lev"], "NUM": ["Num"], "DEU": ["Deu"], "JOS": ["Jos"],
           "JDG": ["Jdg"], "RUT": ["Rut"], "1SA": ["1Sa"], "2SA": ["2Sa"], "1KI": ["1Ki"], "2KI": ["2Ki"],
           "1CH": ["1Ch"], "2CH": ["2Ch"], "1ES": ["1Es"], "EZR": ["Ezr"], "PSA": ["Psa"], "PRO": ["Pro"],
           "ECC": ["Ecc"], "SNG": ["Sol"], "JOB": ["Job"], "WIS": ["Wis"], "SIR": ["Sir"], "ESG": ["Est"],
           "JDT": ["Jdt"], "TOB": ["Tob", "Tbs"], "HOS": ["Hos"], "AMO": ["Amo"], "MIC": ["Mic"], "JOL": ["Joe"],
           "OBA": ["Oba"], "JON": ["Jon"], "NAM": ["Nah"], "HAB": ["Hab"], "ZEP": ["Zep"], "HAG": ["Hag"],
           "ZEC": ["Zec"], "MAL": ["Mal"], "ISA": ["Isa"], "JER": ["Jer"], "BAR": ["Bar"], "LAM": ["Lam"],
           "LJE": ["Epj"], "EZK": ["Eze"], "DAG": ["Dan", "Dat"], "SUS": ["Sus", "Sut"], "BEL": ["Bel", "Bet"],
           "1MA": ["1Ma"], "2MA": ["2Ma"], "3MA": ["3Ma"], "4MA": ["4Ma"]}


def brenton_rows(notes):
    """Brenton's English Septuagint (eBible.org's USFM, notes.py's pinned download) on the LXX books as it numbers
    them: a notes row per verse (book id, start, end, 0, '', body), in notes.py's form - its text as notes.usfm_text
    makes it, a poetry line or paragraph a <br>. Its Ezra runs on into Nehemiah (2 Esdras): chapters 11-23 go to
    Nehemiah 1-13 (and its separate Nehemiah, the same text again, is left out)."""
    import zipfile
    ids = {code: FIRST_ID + i for i, (code, *_r) in enumerate(BOOKS)}
    out = collections.defaultdict(list)
    with zipfile.ZipFile(notes.DL / "brenton" / (notes.TRANSLATIONS["brenton"] + "_usfm.zip")) as z:
        for name in z.namelist():
            if not name.endswith(".usfm"):
                continue
            s = z.read(name).decode("utf-8-sig")
            m = re.match(r"\\id (\w+)", s)
            if not m or m.group(1) not in BRENTON:
                continue
            usfm = m.group(1)
            s = re.sub(r"\\(f|fe|x)\s.*?\\\1\*", "", s, flags=re.S)
            s = re.sub(r"\\\+?w\s+([^|\\]*?)(?:\|[^\\]*)?\\\+?w\*", r"\1", s)
            c, cur, brk = 0, None, False
            for line in s.split("\n"):
                line = line.strip()
                if not line or notes.USFM_SKIP.match(line) or line.startswith("\\d"):
                    continue
                if (cm := re.match(r"^\\c\s+(\d+)", line)):
                    c, cur = int(cm.group(1)), None
                    continue
                brk = brk or bool(notes.LINE.match(line))
                line = notes.LINE.sub("", line)
                for part in re.split(r"(\\v\s+\d+(?:-\d+)?\s*)", line):
                    if (vm := re.match(r"\\v\s+(\d+)(?:-(\d+))?", part)):
                        books = BRENTON[usfm]
                        cc = c
                        if usfm == "EZR" and c > 10:
                            books, cc = ["Neh"], c - 10
                        key = (tuple(books), cc, int(vm.group(1)), int(vm.group(2) or vm.group(1)))
                        cur, brk = out[key], False
                    elif cur is not None and part.strip():
                        if brk and cur:
                            cur.append("<br>")
                        brk = False
                        cur.append(notes.usfm_text(part))
    rows = []
    for (books, c, v1, v2), parts in out.items():
        body = re.sub(r"\s+", " ", " ".join(parts)).replace(" <br> ", "<br>").strip()
        body = re.sub(r"^(<br>)+|(<br>)+$", "", body)
        if body:
            for b in books:
                rows.append((ids[b], notes.ref(c, v1), notes.ref(c, v2), 0, "", f"<p>{body}</p>"))
    return rows


BRENTON_SOURCE = ("brenton_lxx", "translation", "Brenton's Septuagint (1851)", "LXX",
                  "Sir Lancelot C. L. Brenton, The Septuagint Version of the Old Testament in English, with the "
                  "Apocrypha: public domain (eBible.org). In its own verse numbers, which are mostly Swete's.")


def notes_books(db, books):
    """{LXX book id: the book id whose notes the panel shows} - the Hebrew book's where both number alike (the
    module's docstring), else its own."""
    out = {}
    last = collections.defaultdict(dict)
    for b, c, v in db.execute("SELECT book, chapter, MAX(verse) FROM words GROUP BY book, chapter"):
        last[b][c] = v
    code_id = {c: i for i, c in db.execute("SELECT id, code FROM books")}
    for i, (code, _name, heb, _chapters) in enumerate(books):
        bid = FIRST_ID + i
        out[bid] = bid
        if heb:
            h, mine = last[code_id[heb]], last[bid]
            same = sum(1 for c in mine if h.get(c) == mine[c])
            if len(h) == len(mine) and same >= 0.9 * len(mine):
                out[bid] = code_id[heb]
    return out
