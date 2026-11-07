"""M'Cheyne's Bible reading calendar: the Reading plan's factory plan (src/readingplan.ts), written as src/mcheyne.ts.

Source: Robert Murray M'Cheyne's Bible Reading Calendar (1842; public domain) as CrossWire's SWORD module "MCheyne"
(version 1.4, David Haslam's source, mcheyne.imp.txt - pinned by commit and SHA-256 below). Each day (Jan 1 - Dec 31;
Feb 29 has none: M'Cheyne gave no readings for it) has four lines - two "Family Reading", two "Secret Reading" - each a
book and its chapters as published: "Genesis 1", "Psalms 52, 53, 54", "Isaiah 9:7-21, 10:1-4", "Deuteronomy 27,
28:1-19", "Jude". The lines' shown text is read, not their osisRef attributes (nine of those are mistyped: Ps.2 for
Psalms 52, Jer.0 for Jeremiah 50...).

Each line becomes one reading of whole chapters (COTEXT's plans read by chapters alone): its parts joined into one span,
then each chapter given to the reading where it starts - the one with its verse 1 -, so a chapter the calendar splits
over days is read whole on its first day and the days after keep its slot, empty (the others never shifted): "Luke
1:1-38" -> "Luk 1", "Luke 1:39-80" -> empty; "Isaiah 8, 9:1-7" -> "Isa 8-9", "Isaiah 9:7-21, 10:1-4" -> "Isa 10",
"Isaiah 10:5-34" -> empty;
Psalm 119, split over seven days, read whole on the first.
  "Gen 1"  chapter 1;  "Psa 52-54"  chapters 52 to 54  (COTEXT's book codes - the main database's books.code).
Checked: 365 days of four lines (and four slots); every book one of the 66, every chapter within it, every part following on from the
one before; and, as chapters, the whole OT read once, the NT and the Psalms twice.

Output: src/mcheyne.ts - MCHEYNE, 365 strings: the plan's Day 1 to Day 365 in the calendar's order (Jan 1 first; the
Reading plan numbers its days, placing them on dates only from a start the user picks); a day's four slots joined by
";", always four, each in its line's place - Family 1, Family 2, Secret 1, Secret 2 -, empty where a split chapter's
later part was dropped: the plan's four columns, each read down the days (readingplan.ts).
Run on its own: python3 pipeline/mcheyne.py (the download kept in pipeline/downloads/).
"""
import collections
import hashlib
import pathlib
import re
import urllib.request

ROOT = pathlib.Path (__file__).resolve ().parent.parent
COMMIT = "54093387eec6834141ca6663126beb3f6d7ab57e"
URL = f"https://raw.githubusercontent.com/DavidHaslam/MCheyne-Daily-Bread-SWORD/{COMMIT}/mcheyne.imp.txt"
SHA256 = "12cdf9dc6586e9e0803293eb0f3f74bb876e9610a65cccb28458c373f8043a38"
OUT = ROOT / "src" / "mcheyne.ts"

# The calendar's book names -> COTEXT's codes (book ids 1-66 in this order)
BOOKS = [("Genesis", "Gen"), ("Exodus", "Exo"), ("Leviticus", "Lev"), ("Numbers", "Num"), ("Deuteronomy", "Deu"),
  ("Joshua", "Jos"), ("Judges", "Jdg"), ("Ruth", "Rut"), ("1 Samuel", "1Sa"), ("2 Samuel", "2Sa"), ("1 Kings", "1Ki"),
  ("2 Kings", "2Ki"), ("1 Chronicles", "1Ch"), ("2 Chronicles", "2Ch"), ("Ezra", "Ezr"), ("Nehemiah", "Neh"),
  ("Esther", "Est"), ("Job", "Job"), ("Psalms", "Psa"), ("Proverbs", "Pro"), ("Ecclesiastes", "Ecc"),
  ("Song of Solomon", "Sng"), ("Isaiah", "Isa"), ("Jeremiah", "Jer"), ("Lamentations", "Lam"), ("Ezekiel", "Ezk"),
  ("Daniel", "Dan"), ("Hosea", "Hos"), ("Joel", "Jol"), ("Amos", "Amo"), ("Obadiah", "Oba"), ("Jonah", "Jon"),
  ("Micah", "Mic"), ("Nahum", "Nam"), ("Habakkuk", "Hab"), ("Zephaniah", "Zep"), ("Haggai", "Hag"),
  ("Zechariah", "Zec"), ("Malachi", "Mal"), ("Matthew", "Mat"), ("Mark", "Mrk"), ("Luke", "Luk"), ("John", "Jhn"),
  ("Acts", "Act"), ("Romans", "Rom"), ("1 Corinthians", "1Co"), ("2 Corinthians", "2Co"), ("Galatians", "Gal"),
  ("Ephesians", "Eph"), ("Philippians", "Php"), ("Colossians", "Col"), ("1 Thessalonians", "1Th"),
  ("2 Thessalonians", "2Th"), ("1 Timothy", "1Ti"), ("2 Timothy", "2Ti"), ("Titus", "Tit"), ("Philemon", "Phm"),
  ("Hebrews", "Heb"), ("James", "Jas"), ("1 Peter", "1Pe"), ("2 Peter", "2Pe"), ("1 John", "1Jn"), ("2 John", "2Jn"),
  ("3 John", "3Jn"), ("Jude", "Jud"), ("Revelation", "Rev")]
CODE = dict (BOOKS)
CHAPTERS = [50, 40, 27, 36, 34, 24, 21, 4, 31, 24, 22, 25, 29, 36, 10, 13, 10, 42, 150, 31, 12, 8, 66, 52, 5, 48, 12,
            14, 3, 9, 1, 4, 7, 3, 3, 3, 2, 14, 4, 28, 16, 24, 21, 28, 16, 16, 13, 6, 6, 4, 4, 5, 3, 6, 4, 3, 1, 13, 5,
            5, 3, 5, 1, 1, 1, 22]


def source () -> str:
    path = ROOT / "pipeline" / "downloads" / "mcheyne.imp.txt"
    if not path.exists ():
        path.parent.mkdir (parents = True, exist_ok = True)
        path.write_bytes (urllib.request.urlopen (URL).read ())
    data = path.read_bytes ()
    if hashlib.sha256 (data).hexdigest () != SHA256: raise SystemExit (f"{path}: not the pinned file")
    return data.decode ("utf-8").replace ("\r\n", "\n")     # (CRLF in the file)


def reading (line: str) -> tuple:
    """A line's text -> (book index, c1, v1, c2, v2): v1 0 for whole chapters c1 to c2."""
    m = re.fullmatch (r"\s*([1-3]? ?[A-Za-z ]+?)(?: (\d.*))?", line)
    name, rest = m[1].strip (), m[2] or "1"
    b = [n for n, _ in BOOKS].index (name)
    parts = []     # (c, v1, v2): v1 0 the whole chapter
    for p in rest.split (","):
        p = p.strip ().removeprefix (name + " ")     # (A part naming its book again: "Psalms 52, 53, Psalms 54")
        if q := re.fullmatch (r"(\d+):(\d+)-(\d+)", p): parts.append ((int (q[1]), int (q[2]), int (q[3])))
        elif q := re.fullmatch (r"(\d+):(\d+)", p): parts.append ((int (q[1]), int (q[2]), int (q[2])))     # (One verse: "Zechariah 12, 13:1")
        elif q := re.fullmatch (r"(\d+)", p): parts.append ((int (q[1]), 0, 0))
        else: raise SystemExit (f"Unread: {line}")
    for (c, _, v2), (c2, w1, _) in zip (parts, parts[1:]):     # (Each part following on from the one before)
        if not (c2 == c + 1 and (w1 in (0, 1)) or (c2 == c and w1 == v2 + 1)): raise SystemExit (f"Not continuous: {line}")
    (c1, v1, _), (c2, w1, v2) = parts[0], parts[-1]
    for c, _, _ in parts:
        if not 1 <= c <= CHAPTERS[b]: raise SystemExit (f"No such chapter: {line}")
    if v1 == 0 and w1 == 0: return (b, c1, 0, c2, 0)
    return (b, c1, v1 or 1, c2, v2 or -1)     # (-1: to the chapter's end, filled in below)


def main ():
    text = source ()
    days = []
    for m in re.finditer (r"\$\$\$(\d\d)\.(\d\d)\n(.*?)(?=\n\$\$\$|\Z)", text, re.S):
        if m[1] == "00" or m[2] == "00" or (m[1], m[2]) == ("02", "29"): continue
        lines = [re.sub (r"<[^>]+>", "", l) for l in re.findall (r"<lb/>(?:Family|Secret) Reading: (.*)", m[3])]
        if len (lines) != 4: raise SystemExit (f"{m[1]}.{m[2]}: {len (lines)} readings")
        days.append ([reading (l) for l in lines])
    if len (days) != 365: raise SystemExit (f"{len (days)} days")
    # Whole chapters: each chapter of a reading whose verse 1 it reads (a later chapter, or its first from the start)
    out, read = [], collections.Counter ()
    for day in days:
        row = []
        for b, c1, v1, c2, v2 in day:
            cs = [c for c in range (c1, c2 + 1) if c > c1 or v1 in (0, 1)]
            if not cs: row.append (""); continue     # (Only a split chapter's later part: read whole on its first day, its slot kept, empty)
            for c in cs: read[(b, c)] += 1
            row.append (f"{BOOKS[b][1]} {cs[0]}" + (f"-{cs[-1]}" if cs[-1] != cs[0] else ""))
        if len (row) != 4: raise SystemExit (f"Day {len (out) + 1}: {len (row)} slots")
        out.append (";".join (row))
    # Coverage: every chapter read - the OT once, the NT and the Psalms twice
    for b in range (66):
        want = 2 if b >= 39 or b == 18 else 1
        for c in range (1, CHAPTERS[b] + 1):
            if read[(b, c)] != want: raise SystemExit (f"{BOOKS[b][0]} {c} read {read[(b, c)]} times")
    OUT.write_text ("// M'Cheyne's Bible reading calendar (1842; public domain), from CrossWire's SWORD module MCheyne 1.4 -\n"
                    "// GENERATED by pipeline/mcheyne.py: edit that, not this. A day a string, Day 1 first (365, the calendar's order): its four\n"
                    "// slots joined by \";\" - always four, in the source's order (Family 1, Family 2, Secret 1, Secret 2: the plan's four\n"
                    "// columns) -, each \"<book code> <chapter>[-<chapter>]\" (readingplan.ts' parse), or empty where a chapter split\n"
                    "// over days was read whole the day before.\n"
                    "export const MCHEYNE = [\n" + "".join (f'  "{d}",\n' for d in out) + "];\n", encoding = "utf-8")
    print (f"{OUT}: {len (out)} days, {sum (len (d) for d in days)} readings")


if __name__ == "__main__":
    main ()
