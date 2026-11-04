"""Turns the source's morphology codes into COTEXT's own codes and their parsing spelled out.

Hebrew / Aramaic (TAHOT): OpenScriptures' scheme with STEPBible's adaptations - a language letter (H Hebrew, A Aramaic),
then segments split by "/": prefixes, the word itself, suffixes. E.g. HR/Ncfsa (preposition + common noun, feminine
singular absolute), Hc/Vqw3ms (waw + Qal wayyiqtol 3ms).
COTEXT's code: all caps, no spaces; a verb STEM-FORM-PGN (Q-P-3MS), anything else PART-GNS (N-MP); a prefix joined
with + before it (ART+N-MP, CONJ+OBJ), a suffix after it (N-MS+3MS). A construct noun adds C after its number (N-MSC),
an Aramaic determined one D (N-MSD). The waw consecutive is part of its form (W, WP), so it isn't written as CONJ.

Greek (TAGNT; the LXX's made alike by lxx.py): Robinson's codes (V-IAI-3S, N-DSF, T-NSM; N-PRI an indeclinable name). COTEXT drops the verb's V- (IAI-3S) and a noun's name tags
(-P person, -L location, -T title, -G gentilic...): N-ASM-T reads N-ASM.
"""

# ---- Hebrew ----

PERSON = {"1": "1st", "2": "2nd", "3": "3rd"}
GENDER = {"m": "masculine", "f": "feminine", "c": "common", "b": "masculine or feminine"}
NUMBER = {"s": "singular", "p": "plural", "d": "dual"}
STATE = {"a": "", "c": "construct", "d": "determined"}

# Stem letter -> (COTEXT code, name). The code's color group is the first entry of STEM_GROUP that matches.
HEBREW_STEMS = {
    "q": ("Q", "Qal"), "N": ("N", "Niphal"), "p": ("P", "Piel"), "P": ("PU", "Pual"), "h": ("HI", "Hiphil"),
    "H": ("HO", "Hophal"), "t": ("HT", "Hithpael"), "o": ("PO", "Polel"), "O": ("POL", "Polal"),
    "r": ("HTPO", "Hithpolel"), "m": ("POE", "Poel"), "M": ("POA", "Poal"), "k": ("PAL", "Palel"),
    "K": ("PUL", "Pulal"), "Q": ("QP", "Qal passive"), "l": ("PIL", "Pilpel"), "L": ("POLP", "Polpal"),
    "f": ("HTPP", "Hithpalpel"), "D": ("NT", "Nithpael"), "j": ("PEA", "Pealal"), "i": ("PILE", "Pilel"),
    "u": ("HOT", "Hothpaal"), "c": ("TI", "Tiphil"), "v": ("HSH", "Hishtaphel"), "w": ("NTPL", "Nithpalel"),
    "y": ("NTPO", "Nithpoel"), "z": ("HTPOE", "Hithpoel"),
}
ARAMAIC_STEMS = {
    "q": ("PE", "Peal"), "Q": ("PEI", "Peil"), "u": ("HTPE", "Hithpeel"), "p": ("PA", "Pael"),
    "P": ("ITPA", "Ithpaal"), "M": ("HTPA", "Hithpaal"), "a": ("AP", "Aphel"), "h": ("HA", "Haphel"),
    "s": ("SA", "Saphel"), "e": ("SH", "Shaphel"), "H": ("HO", "Hophal"), "i": ("ITPE", "Ithpeel"),
    "t": ("HSH", "Hishtaphel"), "v": ("ISH", "Ishtaphel"), "w": ("HTAP", "Hithaphel"), "o": ("PO", "Polel"),
    "z": ("ITPO", "Ithpoel"), "r": ("HTPO", "Hithpolel"), "f": ("HTPP", "Hithpalpel"), "b": ("HEP", "Hephal"),
    "c": ("TIP", "Tiphel"), "m": ("POE", "Poel"), "l": ("PALP", "Palpel"), "L": ("ITPP", "Ithpalpel"),
    "O": ("ITPOL", "Ithpolel"), "G": ("ITTA", "Ittaphal"),
}
# The stem's color in the reader (a CSS class): the simple stem, its passive, the intensive, its passive, the
# reflexive, the causative, its passive; any other stem "other".
STEM_GROUP = {
    "Q": "qal", "PE": "qal", "QP": "qal-pass", "PEI": "qal-pass", "N": "niphal", "HTPE": "niphal", "ITPE": "niphal",
    "P": "piel", "PA": "piel", "PO": "piel", "PIL": "piel", "PU": "pual", "POL": "pual", "HT": "hithpael",
    "HTPA": "hithpael", "ITPA": "hithpael", "HTPO": "hithpael", "HI": "hiphil", "AP": "hiphil", "HA": "hiphil",
    "SH": "hiphil", "SA": "hiphil", "HO": "hophal",
}

# Form letter -> (COTEXT code, name). u is STEPBible's conjunctive imperfect (weyiqtol: waw + imperfect, not sequential).
FORMS = {
    "p": ("P", "perfect"), "q": ("WP", "weqatal (sequential perfect)"), "i": ("I", "imperfect"),
    "w": ("W", "wayyiqtol (sequential imperfect)"), "u": ("WI", "weyiqtol (conjunctive imperfect)"),
    "h": ("COH", "cohortative"), "j": ("J", "jussive"), "v": ("IMP", "imperative"),
    "r": ("PTC", "participle"), "s": ("PTP", "passive participle"), "a": ("INA", "infinitive absolute"),
    "c": ("INC", "infinitive construct"),
}

# Prefix segment -> (code, name). The waw consecutive (c) has no code: its form (W, WP) says it.
PREFIXES = {"C": ("CONJ", "conjunction"), "c": ("", ""), "R": ("PREP", "preposition"),
            "Rd": ("PREP+ART", "preposition with the article"), "Td": ("ART", "article"),
            "Ti": ("INTG", "interrogative")}

PARTICLES = {"a": ("PART", "particle of affirmation"), "c": ("CONJ", "conjunctive particle"),
             "d": ("ART", "article"), "e": ("EXH", "particle of exhortation"), "i": ("INTG", "interrogative particle"),
             "j": ("INTJ", "interjection"), "m": ("DEM", "demonstrative particle"), "n": ("NEG", "negative particle"),
             "o": ("OBJ", "sign of the definite direct object"), "r": ("REL", "relative particle")}
NOUNS = {"c": ("N", "noun"), "g": ("GN", "gentilic noun"), "t": ("N", "noun (title)")}
NAMES = {"m": ("PN-M", "proper name, masculine"), "f": ("PN-F", "proper name, feminine"),
         "l": ("PN-L", "proper name, place"), "t": ("PN-T", "proper name, title")}
ADJECTIVES = {"a": ("ADJ", "adjective"), "c": ("NUM", "cardinal number"), "o": ("ORD", "ordinal number"),
              "g": ("GN", "gentilic adjective")}
PRONOUNS = {"p": ("PRON", "personal pronoun"), "d": ("DEM", "demonstrative pronoun"),
            "f": ("INDF", "indefinite pronoun"), "i": ("INTG", "interrogative pronoun"),
            "r": ("REL", "relative pronoun")}
OTHERS = {"R": ("PREP", "preposition"), "Rd": ("PREP+ART", "preposition with the article"),
          "C": ("CONJ", "conjunction"), "D": ("ADV", "adverb")}
# For the Parsing guide only (guide()): what the main stems and forms mean, on "do".
STEM_SENSE = {"Q": "simple active - he did", "QP": "simple passive - he was done", "N": "simple passive or reflexive - he was done",
              "P": "intensive active - he did (intensively)", "PU": "intensive passive - he was done (intensively)",
              "HI": "causative active - he caused to do", "HO": "causative passive - he was caused to do",
              "HT": "reflexive - he did himself"}
FORM_SENSE = {"P": "he did", "WP": "and he will do", "I": "he will do", "W": "and he did", "WI": "and he will do",
              "COH": "let me / us do", "J": "let him do", "IMP": "do!", "PTC": "doing", "PTP": "done", "INA": "surely do",
              "INC": "to do"}


def _pgn(s):
    """'3ms' -> ('3MS', '3rd masculine singular'); unknown letters are skipped."""
    code, words = "", []
    for ch, table in zip(s, (PERSON, GENDER, NUMBER)):
        if ch in table:
            code += ch.upper()
            words.append(table[ch])
    return code, " ".join(words)


def _gns(s):
    """'msc' -> ('MSC', 'masculine singular construct'): gender, number, then the state unless absolute."""
    code, words = "", []
    for ch, table in zip(s, (GENDER, NUMBER, STATE)):
        if ch in table:
            if table is STATE and ch == "a":
                continue
            code += ch.upper()
            words.append(table[ch])
    return code, " ".join(words)


def _join(head, tail):
    return f"{head}-{tail}" if tail else head


def _main(seg, aramaic):
    """One main segment (the word itself) -> (code, spelled out, stem group or "")."""
    kind, rest = seg[:1], seg[1:]
    if not seg:
        return "?", "unparsed", ""
    if kind == "V":
        stems = ARAMAIC_STEMS if aramaic else HEBREW_STEMS
        stem, name = stems.get(rest[:1], ("?", "unknown stem"))
        form, fname = FORMS.get(rest[1:2], ("?", "unknown form"))
        tail = rest[2:]
        if form in ("PTC", "PTP"):
            c, w = _gns(tail)
        elif form in ("INA", "INC"):
            c, w = "", ""
        else:
            c, w = _pgn(tail)
        return _join(f"{stem}-{form}", c), f"{name} {fname}" + (f", {w}" if w else ""), STEM_GROUP.get(stem, "other")
    if kind == "N":
        if rest[:1] == "p":
            code, name = NAMES.get(rest[1:2], ("PN", "proper name"))
            return code, name.capitalize(), ""
        code, name = NOUNS.get(rest[:1], ("N", "noun"))
        c, w = _gns(rest[1:])
        return _join(code, c), name.capitalize() + (f", {w}" if w else ""), ""
    if kind == "A":
        code, name = ADJECTIVES.get(rest[:1], ("ADJ", "adjective"))
        c, w = _gns(rest[1:])
        return _join(code, c), name.capitalize() + (f", {w}" if w else ""), ""
    if kind == "P":
        code, name = PRONOUNS.get(rest[:1], ("PRON", "pronoun"))
        c, w = _pgn(rest[1:]) if rest[:1] == "p" else _gns(rest[1:])
        return _join(code, c), name.capitalize() + (f", {w}" if w else ""), ""
    if kind == "T":
        code, name = PARTICLES.get(rest[:1], ("PART", "particle"))
        return code, name.capitalize(), ""
    if kind == "R":
        code, name = OTHERS["Rd" if rest == "d" else "R"]
        return code, name.capitalize(), ""
    if kind in OTHERS:
        code, name = OTHERS[kind]
        return code, name.capitalize(), ""
    return seg.upper(), seg, ""


SUFFIXES = {"Sd": ("DIR", "with directional he"), "Sh": ("PAR", "with paragogic he"),
            "Sn": ("PAR", "with paragogic nun"), "Ta": ("ART", "with the article (emphatic)")}


def _suffix(seg):
    """A suffix segment -> (code, words)."""
    if seg.startswith("Sp"):
        c, w = _pgn(seg[2:])
        return c, f"with {w} suffix"
    return SUFFIXES.get(seg, (seg.upper(), seg))


def _is_suffix(seg):
    return seg[:1] == "S" or seg == "Ta"


def hebrew(morph):
    """'HR/Ncfsa' -> ('PREP+N-FS', 'Preposition + noun, feminine singular', stem group).

    Segments before the first that isn't a prefix are prefixes; the first that isn't is the word; the rest are
    suffixes. A prefix followed only by suffixes (a preposition with a pronoun, lo 'to him') is the word itself.
    """
    if not morph:
        return "", "", ""
    aramaic = morph[0] == "A"
    segs = morph[1:].split("/")
    i = 0
    while i < len(segs) - 1 and segs[i] in PREFIXES and not _is_suffix(segs[i + 1]):
        i += 1
    pre, main, post = segs[:i], segs[i], segs[i + 1:]
    code, spelled, group = _main(main, aramaic)
    pre_codes = [PREFIXES[s][0] for s in pre if PREFIXES[s][0]]
    pre_names = [PREFIXES[s][1] for s in pre if PREFIXES[s][1]]
    if pre_names:
        spelled = " + ".join([pre_names[0].capitalize()] + pre_names[1:] + [spelled[0].lower() + spelled[1:]])
    for s in post:
        c, w = _suffix(s)
        code += "+" + c
        spelled += ", " + w
    return "+".join(pre_codes + [code]), spelled, group


# ---- Greek ----

CASE = {"N": "nominative", "G": "genitive", "D": "dative", "A": "accusative", "V": "vocative"}
GNUM = {"S": "singular", "P": "plural"}
GGEN = {"M": "masculine", "F": "feminine", "N": "neuter"}
GPERSON = {"1": "1st person", "2": "2nd person", "3": "3rd person"}
TENSE = {"P": "present", "I": "imperfect", "F": "future", "A": "aorist", "R": "perfect", "L": "pluperfect"}
VOICE = {"A": "active", "M": "middle", "P": "passive", "D": "middle deponent", "O": "passive deponent",
         "N": "middle or passive deponent", "E": "middle or passive"}
MOOD = {"I": "indicative", "S": "subjunctive", "O": "optative", "M": "imperative", "N": "infinitive",
        "P": "participle"}
GREEK_PARTS = {"N": "noun", "A": "adjective", "T": "article", "P": "personal pronoun", "R": "relative pronoun",
               "C": "reciprocal pronoun", "D": "demonstrative pronoun", "K": "correlative pronoun",
               "I": "interrogative pronoun", "X": "indefinite pronoun", "Q": "correlative or interrogative pronoun",
               "F": "reflexive pronoun", "S": "possessive pronoun"}
WORDS = {"CONJ": "conjunction", "PREP": "preposition", "ADV": "adverb", "PRT": "particle", "INJ": "interjection",
         "COND": "conditional", "ARAM": "Aramaic", "HEB": "Hebrew"}
# Endings kept in COTEXT's code (they change the meaning); the name tags (-P, -L, -T, -PG, -LG, -LI) are dropped.
KEPT = {"C": "comparative", "S": "superlative", "N": "negative", "I": "interrogative", "ARAM": "Aramaic",
        "HEB": "Hebrew"}


def _cng(s):
    """'NSM' -> 'nominative singular masculine' (case, number, gender; any may be missing)."""
    words = [t[c] for c, t in zip(s, (CASE, GNUM, GGEN)) if c in t]
    return " ".join(words)


def greek(morph):
    """'V-IAI-3S' -> ('IAI-3S', 'Imperfect active indicative, 3rd person singular', 'verb'); others' group ''."""
    morph = morph.strip()
    parts = morph.split("-")
    head = parts[0]
    if head == "V":
        tvm = parts[1]
        second = tvm.startswith("2")
        t = tvm[1:] if second else tvm
        name = ("second " if second else "") + " ".join(
            [TENSE.get(t[:1], "?"), VOICE.get(t[1:2], "?"), MOOD.get(t[2:3], "?")])
        rest = parts[2:]
        detail = ""
        if rest:
            r = rest[0]
            if r[:1] in GPERSON:      # 3S: person, number
                detail = f"{GPERSON[r[0]]} {GNUM.get(r[1:2], '')}".strip()
            else:                     # participle: case, number, gender
                detail = _cng(r)
        code = "-".join(parts[1:])
        return code, (name + (f", {detail}" if detail else "")).capitalize(), "verb"
    if head in WORDS:
        extra = [KEPT[p] for p in parts[1:] if p in KEPT]
        code = "-".join([head] + [p for p in parts[1:] if p in KEPT])
        return code, " ".join(extra + [WORDS[head]]).capitalize(), ""
    if head in GREEK_PARTS:
        name = GREEK_PARTS[head]
        rest = parts[1:]
        kept = [p for p in rest[1:] if p in KEPT]
        detail = ""
        if rest:
            r = rest[0]
            if head == "S" and len(r) >= 5:          # possessive: person, possessor's number, then case-number-gender
                detail = f"{GPERSON.get(r[0], '')} {GNUM.get(r[1], '')} possessor, {_cng(r[2:])}"
            elif r[:1] in GPERSON:                   # personal / reflexive: person, then case-number(-gender)
                detail = f"{GPERSON[r[0]]} {_cng(r[1:])}".strip()
            elif r == "NUI":
                detail = "indeclinable number"
            elif r == "PRI":                         # (Robinson's indeclinable proper noun: the LXX's Hebrew names)
                detail = "indeclinable proper name"
            elif r == "LI":
                detail = "indeclinable letter"
            else:
                detail = _cng(r)
        code = "-".join([head] + rest[:1] + kept)
        words = " ".join([KEPT[k] for k in kept] + [name])
        return code, (words + (f", {detail}" if detail else "")).capitalize(), ""
    return morph, morph, ""


def guide():
    """The Parsing guide: every part of the codes above, for the app's screen (build_db.py's guide table) - made from
    the same tables the codes are, so it can't drift from them. Yields (lang 'H' / 'G', group, code, meaning) in the
    screen's order; a code used for several things (DEM: pronoun or particle) once, its meanings joined."""
    def merged(lang, group, pairs):
        out = {}
        for code, meaning in pairs:
            if code and meaning not in out.setdefault(code, []):
                out[code].append(meaning)
        for code, meanings in out.items():
            yield lang, group, code, " / ".join(meanings)

    yield "H", "How a code reads", "Q-P-3MS", "a verb: stem - form - person, gender, number (Qal perfect, 3rd masculine singular: he did)"
    yield "H", "How a code reads", "N-MP", "anything else: part of speech - gender, number (noun, masculine plural)"
    yield "H", "How a code reads", "+", "joins a prefix or suffix to its word: ART+N-MP (the + noun), N-MS+3MS (noun with his)"
    yield from merged("H", "Parts of speech", [("STEM-FORM-PGN", "verb (as above)")] + [
        (c, n) for t in (NOUNS, NAMES, ADJECTIVES, PRONOUNS, PARTICLES) for c, n in t.values()]
        + [OTHERS[k] for k in ("R", "C", "D")])
    yield from merged("H", "Stems", [(c, n + (f" - {STEM_SENSE[c]}" if c in STEM_SENSE else "")) for c, n in HEBREW_STEMS.values()])
    yield from merged("H", "Stems (Aramaic)", ARAMAIC_STEMS.values())
    yield from merged("H", "Forms", [(c, n + (f" - {FORM_SENSE[c]}" if c in FORM_SENSE else "")) for c, n in FORMS.values()])
    yield from merged("H", "Person, gender, number", [(k.upper(), v) for t in (PERSON, GENDER, NUMBER) for k, v in t.items()])
    yield from merged("H", "Nouns' state", [(k.upper(), v) for k, v in STATE.items() if v])
    yield from merged("H", "Prefixes", [v for v in PREFIXES.values() if v[0]])
    yield from merged("H", "Suffixes", [("+3MS", "a pronoun suffix, by person, gender, number (his)")] + list(SUFFIXES.values()))

    yield "G", "How a code reads", "PAI-3S", "a verb: tense, voice, mood - person, number (present active indicative, 3rd singular)"
    yield "G", "How a code reads", "PAP-NSM", "a participle: tense, voice, mood - case, number, gender"
    yield "G", "How a code reads", "N-DSF", "anything else: part of speech - case, number, gender (noun, dative singular feminine)"
    yield from merged("G", "Parts of speech", [("TVM-PN", "verb (as above)")] + list(GREEK_PARTS.items()) + list(WORDS.items()))
    yield from merged("G", "Tense", list(TENSE.items()) + [("2", "second (aorist, future, perfect): before the tense - 2AAI")])
    yield from merged("G", "Voice", VOICE.items())
    yield from merged("G", "Mood", MOOD.items())
    yield from merged("G", "Person, number", list(GPERSON.items()) + list(GNUM.items()))
    yield from merged("G", "Case", CASE.items())
    yield from merged("G", "Gender", GGEN.items())
    yield from merged("G", "Endings kept", KEPT.items())


if __name__ == "__main__":
    for m in ["HR/Ncfsa", "HVqp3ms", "HNcmpa", "HTo", "HTd/Ncmpa", "HC/To", "HTd/Ncfsa", "Hc/Vqw3ms", "HVqj3ms",
              "HNcmsc/Sp3ms", "AVqp3ms", "HVhrmsa", "HR/Sp3ms", "HNpm", "HVqcc"]:
        print(m, hebrew(m))
    for m in ["V-IAI-3S", "N-DSF", "T-NSM", "N-ASM-T", "PREP", "CONJ", "V-PAP-NSM", "V-2AAI-3S", "P-1GS",
              "S-1SGSN", "A-NSM-C", "PRT-N", "V-AAN", "A-NUI"]:
        print(m, greek(m))
