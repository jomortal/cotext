"""Ancient Historians: what ancient historians - Jewish, Roman, Greek and Christian - wrote about the events and people
the Bible tells of, each passage shown in a public-domain translation beside the verses it parallels. Read by
src/dictionary.ts as the Archaeology finds are (the same file layout, kind 'dictionary'): by passage, "Ancient
Historians" in the notes' picker (BIBLE BACKGROUND) - the whole book's entries at once, each with its verses (notes.ts'
BY_BOOK); searchable; and by word: an entry naming a person or group (Pilate, the Pharisees, Herod Antipas) is listed
under that word's Strong's keys (the lemmas table: names and groups only, never common words), so it comes up in the
by-book list wherever such a word occurs, and in the word panel's "Historians".

The works and their translations, all public domain, each pinned in historians_pins.json (written on the first run,
kept after; delete an entry to fetch it anew), fetched by ane.py's wikisource() and gutenberg() into
downloads/notes/historians/:
  - Josephus, Jewish Antiquities and Jewish War - William Whiston (1737), Project Gutenberg 2848 and 2850 (SHA-256).
    Antiquities 1-11 retell the Old Testament: an entry per chapter (Whiston's books and chapters), the chapter's text,
    linked to the passages it retells (ANT, below: chosen (generated) from the chapters' contents). Antiquities 12-20 and
    the War: the passages on the people and events of the Maccabean revolt and the New Testament (HISTORY).
  - 1 and 2 Maccabees - Brenton's English Septuagint (1851; eBible.org's USFM, notes.py's pinned download, its SHA-256
    checked here too): the Maccabean history Daniel foretells and the New Testament recalls.
  - Philo - C. D. Yonge (1854-55), Wikisource (revision and SHA-256): On the Embassy to Gaius (Yonge's "On the Virtues
    and Office of Ambassadors"), Against Flaccus, On the Cherubim.
  - Eusebius, Church History - A. C. McGiffert, Nicene and Post-Nicene Fathers, Series II, vol. 1 (1890), Wikisource.
  - Tacitus, Annals - A. J. Church and W. J. Brodribb (1876), Wikisource; Suetonius, The Twelve Caesars - A. Thomson,
    rev. T. Forester, Project Gutenberg 6400; Pliny the Younger, Letters - W. Melmoth, rev. F. C. T. Bosanquet, PG
    2811; Lucian, The Death of Peregrine - H. W. and F. G. Fowler (1905), PG 47242.
  - Herodotus - G. C. Macaulay (1890), PG 2707 and 2456; Xenophon, Cyropaedia - H. G. Dakyns, PG 2085; Polybius - E. S.
    Shuckburgh (1889), PG 44126.
  Skipped (no clean public-domain text): Philo's Life of Moses, On the Contemplative Life (the Therapeutae: Eusebius'
  account of them is given instead) and On the Confusion of Tongues - Yonge's volumes 2-4 are scans only on Wikisource
  but for Flaccus and the Embassy; Rawlinson's Herodotus (Gutenberg has Macaulay's, used instead).

Each entry: its kind (Jewish, Roman, Greek, Christian), shown first in its line and text; its parallels, each its
passages (every passage on the same event, in both Testaments: the census under Quirinius links Luke 2:1-5 and Acts
5:37), what the parallel is, and the passage itself under its reference (Antiquities 18.5.2), the translator's
footnote marks left out.

Output: public/data/notes/historians.db - finds.write()'s tables (articles, lemmas, refs; no photos) - and its row in
the main database's note_sources (id 'historians', kind 'dictionary', testaments 'OT NT').

Run on its own: python3 pipeline/historians.py (the main database already built; then source_books.py and
split_db.py); build_db.py runs build() after ane.
"""
import hashlib
import html
import json
import pathlib
import re
import sqlite3
import sys
import zipfile

HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE))
import ane  # noqa: E402
import finds  # noqa: E402
import tyndale_dict  # noqa: E402

DL = HERE / "downloads" / "notes" / "historians"
PINS = HERE / "historians_pins.json"
OUT = HERE.parent / "public" / "data" / "notes" / "historians.db"
SOURCE = ("historians", "dictionary", "Ancient Historians", "OT NT",
          "Ancient historians paired with the passages they bear on, generated for COTEXT. Translations public domain: "
          "Josephus tr. William Whiston (1737); 1-2 Maccabees from Brenton's Septuagint (1851); Philo tr. C. D. Yonge; "
          "Eusebius tr. A. C. McGiffert (1890); Tacitus tr. Church and Brodribb; Suetonius tr. Thomson and Forester; "
          "Pliny tr. Melmoth and Bosanquet; Lucian tr. H. W. and F. G. Fowler; Herodotus tr. G. C. Macaulay; Xenophon "
          "tr. H. G. Dakyns; Polybius tr. E. S. Shuckburgh - from Project Gutenberg, Wikisource and eBible.org.")
BRENTON = HERE / "downloads" / "notes" / "brenton" / "eng-Brenton_usfm.zip"
BRENTON_SHA = "9b1a4e09381885c658c1cc70ea56a64c125c85d8697a4f03cb6ad66a1bcd985c"     # (notes.py's pin of the same file)
EUSEBIUS = "Nicene and Post-Nicene Fathers: Series II/Volume I/Church History of Eusebius"

# ---- The works ----
# key -> (kind "pg" a Project Gutenberg number / "ws" a Wikisource page, where, the credit under its passages)
WORKS = {
    "ant": ("pg", 2848, "Josephus, Jewish Antiquities, tr. William Whiston (1737; public domain; Project Gutenberg)"),
    "war": ("pg", 2850, "Josephus, The Jewish War, tr. William Whiston (1737; public domain; Project Gutenberg)"),
    "suet": ("pg", 6400, "Suetonius, The Lives of the Twelve Caesars, tr. Alexander Thomson, rev. T. Forester (public domain; Project Gutenberg)"),
    "pliny": ("pg", 2811, "Pliny the Younger, Letters, tr. William Melmoth, rev. F. C. T. Bosanquet (public domain; Project Gutenberg)"),
    "lucian": ("pg", 47242, "Lucian, The Death of Peregrine, tr. H. W. and F. G. Fowler (1905; public domain; Project Gutenberg)"),
    "hdt1": ("pg", 2707, "Herodotus, The Histories, tr. G. C. Macaulay (1890; public domain; Project Gutenberg)"),
    "hdt2": ("pg", 2456, "Herodotus, The Histories, tr. G. C. Macaulay (1890; public domain; Project Gutenberg)"),
    "cyro": ("pg", 2085, "Xenophon, Cyropaedia, tr. H. G. Dakyns (public domain; Project Gutenberg)"),
    "poly": ("pg", 44126, "Polybius, The Histories, tr. E. S. Shuckburgh (1889; public domain; Project Gutenberg)"),
    "ann15": ("ws", "The Annals (Tacitus)/Book 15", "Tacitus, Annals, tr. A. J. Church and W. J. Brodribb (1876; public domain; Wikisource)"),
    "ann12": ("ws", "The Annals (Tacitus)/Book 12", "Tacitus, Annals, tr. A. J. Church and W. J. Brodribb (1876; public domain; Wikisource)"),
    "flaccus": ("ws", "The Works of Philo Judaeus/Volume 4/Against Flaccus", "Philo, Against Flaccus, tr. C. D. Yonge (1855; public domain; Wikisource)"),
    "embassy": ("ws", "The Works of Philo Judaeus/Volume 4/On the Virtues and Office of Ambassadors", "Philo, On the Embassy to Gaius, tr. C. D. Yonge (1855; public domain; Wikisource)"),
    "cherubim": ("ws", "The Works of Philo Judaeus/Volume 1/On the Cherubim, etc.", "Philo, On the Cherubim, tr. C. D. Yonge (1854; public domain; Wikisource)"),
}
EUS_CREDIT = "Eusebius, Church History, tr. A. C. McGiffert (Nicene and Post-Nicene Fathers, 1890; public domain; Wikisource)"
MACC_CREDIT = "Brenton's English Septuagint (1851; public domain; eBible.org)"


# ---- Reading the texts ----

def paragraphs(text):
    """A text's paragraphs (blank-line separated), each on one line."""
    return [p for p in (" ".join(q.split()) for q in re.split(r"\n\s*\n", text.replace("\r\n", "\n"))) if p]


def josephus(text):
    """Whiston's Antiquities or War as {(book, chapter): (title, {section: text})}: each book's body chapters (its table
    of contents' chapter lines, followed by no text, left out), a chapter without numbered sections all section 1; his
    footnotes (each book's, after it) left out, and their marks in the text - bare numbers, counted from 1 in each book:
    a number is taken for a mark only when it is the book's next one (or one of the three after: a mark the text
    lost)."""
    book, out, cur, notes = 0, {}, None, False
    order = []     # (book, chapter, title, [paragraphs]) as met
    paras = paragraphs(text.split("*** END OF")[0])
    i = 0
    while i < len(paras):
        p = paras[i]
        m = re.match(r"BOOK ([IVXL]+)\.", p)
        if m:
            book, cur, notes = roman(m.group(1)), None, False
        elif re.match(r"FOOTNOTES|\d+ \(return\) \[", p):
            notes, cur = True, None
        elif (m := re.match(r"CHAPTER (\d+)\.\s*(.*)$", p)) and not notes:
            title = m.group(2)
            if not title and i + 1 < len(paras) and not re.match(r"(CHAPTER|BOOK|\d+\. )", paras[i + 1]):
                i += 1
                title = paras[i]
            cur = [book, int(m.group(1)), title, []]
            order.append(cur)
        elif cur is not None and not notes:
            cur[3].append(p)
        i += 1
    expected, last = 1, 0
    for b, ch, title, ps in order:
        if not ps:
            continue
        if b != last:
            expected, last = 1, b

        def unmark(s):
            nonlocal expected
            def one(m):
                nonlocal expected
                n = int(m.group(1))
                if expected <= n <= expected + 3:     # (A mark or two the text lost: the count goes on from this one)
                    expected = n + 1
                    return ""
                return m.group(0)
            return re.sub(r"(?:(?<=[\s.,;:!?'\"\])])|^)(\d{1,3})(?=[\s,.;:]|$)", one, s).replace("  ", " ").strip()
        title = unmark(title)
        secs, n = {}, 1
        for p in ps:
            m = re.match(r"(\d+)\.\s+(.*)$", p)
            if m:
                n, p = int(m.group(1)), m.group(2)
            secs[n] = (secs[n] + " " if n in secs else "") + unmark(p)
        out[(b, ch)] = (title, secs)
    return out


def roman(s):
    v = {"I": 1, "V": 5, "X": 10, "L": 50}
    return sum(-v[c] if i + 1 < len(s) and v[s[i + 1]] > v[c] else v[c] for i, c in enumerate(s))


def numbered(text, heading=r"BOOK ([IVXL]+)\."):
    """A text of books (heading) of numbered paragraphs ("141. After him...") as {(book, number): text}; a paragraph
    without a number joins the one before. Herodotus."""
    out, book, n = {}, 0, None
    for p in paragraphs(text.split("*** END OF")[0]):
        m = re.match(heading, p)
        if m:
            book, n = roman(m.group(1)), None
            continue
        m = re.match(r"(\d+)\.\s+(.*)$", p)
        if m:
            n = int(m.group(1))
            out[(book, n)] = m.group(2)
        elif n is not None and (book, n) in out:
            out[(book, n)] += "\n" + p
    return out


def sections(text):
    """A Wikisource chapter of Eusebius as {section: text} (its paragraphs "1. But after Paul..."; the rest before them -
    the page's header and the chapter's title - and the notes after them left out; a paragraph without a number joins
    the one before)."""
    out, n = {}, None
    for p in paragraphs(text):
        if p.startswith(("↑", "Footnotes")):     # (The translator's notes, after the text)
            break
        m = re.match(r"(\d+)\.\s+(.*)$", p)
        if m and (n is None or n < int(m.group(1)) <= n + 3):     # (A number the page lost: the count goes on)
            n = int(m.group(1))
            out[n] = m.group(2)
        elif n is not None:
            out[n] += "\n" + p
    return out


def maccabees():
    """Brenton's 1 and 2 Maccabees as {("1ma" / "2ma", chapter, verse): text}, its footnotes and markup left out."""
    data = BRENTON.read_bytes()
    if hashlib.sha256(data).hexdigest() != BRENTON_SHA:
        raise SystemExit(f"{BRENTON}: not the pinned file (SHA-256 differs; notes.py fetches it)")
    out = {}
    with zipfile.ZipFile(BRENTON) as z:
        for code, name in (("1ma", "52-1MAeng-Brenton.usfm"), ("2ma", "53-2MAeng-Brenton.usfm")):
            s = z.read(name).decode("utf-8-sig")
            s = re.sub(r"\\(f|fe|x)\s.*?\\\1\*", "", s, flags=re.S)
            s = re.sub(r"\\\+?w\s+([^|\\]*?)(?:\|[^\\]*)?\\\+?w\*", r"\1", s)
            s = re.sub(r"\\(add|sc|nd|it|bd|em|qt)\*?\s?", "", s)
            c = 0
            for m in re.finditer(r"\\c\s+(\d+)|\\v\s+(\d+)\s+([^\\]*(?:\\(?!v\s|c\s)[^\\]*)*)", s):
                if m.group(1):
                    c = int(m.group(1))
                else:
                    t = re.sub(r"\\\S+\s?", "", m.group(3))
                    out[(code, c, int(m.group(2)))] = " ".join(t.split())
    return out


def between(text, first, last):
    """The stretch of a text from first to last (both kept), whitespace made single: [paragraphs]. Its bracketed
    marks - [528], (318), [15], [Sidenote: ...] - left out."""
    flat = "\n\n".join(paragraphs(text))
    i = flat.find(first)
    j = flat.find(last, i)
    if i < 0 or j < 0:
        raise SystemExit(f"Passage not found: {first!r} ... {last!r}")
    out = []
    for p in flat[i:j + len(last)].split("\n\n"):
        p = re.sub(r"\s*(?:\[Sidenote:[^\]]*\]|\[\d+\]|\(\d+\)|\[C\.\d+\])|\+\d+\.\+|_", "", p.replace("\u200b", ""))
        p = " ".join(p.split())
        if p:
            out.append(p)
    return out


# ---- What's quoted ----
# A quote: a work's key and where. "ant 18.5.1-2" / "war 5.5.1-8": book.chapter.sections (or a whole chapter, "ant
# 1.13"); "hdt 2.141" / "hdt 9.108-111": book.chapters (Herodotus' two volumes as one); "eus 2.23.1-18": Eusebius'
# book.chapter.sections; "1ma 1:10-64" / "2ma 6:18-7:42": Maccabees' verses; "m:<key>": a stretch of a work between
# two marker strings (MARKS: work, first, last, the reference shown).
MARKS = {
    "ann15.44": ("ann15", "Consequently, to get rid of the report, Nero fastened the guilt", "that they were being destroyed.", "Annals 15.44"),
    "ann12.43": ("ann12", "Scanty crops too, and consequent famine", "the mildness of the winter that its desperate plight was relieved.", "Annals 12.43"),
    "ann12.54": ("ann12", "Not equally moderate was his brother, surnamed Felix", "and tranquillity was restored to the province.", "Annals 12.54"),
    "claud18": ("suet", "During a scarcity of provisions, occasioned by bad crops", "by a back door.", "Life of Claudius 18"),
    "claud25": ("suet", "He banished from Rome all the Jews, who were continually making", "at the instigation of one Chrestus [528].", "Life of Claudius 25"),
    "nero16": ("suet", "He likewise inflicted punishments on the", "superstition.", "Life of Nero 16"),
    "pliny96": ("pliny", "IT is my invariable rule, Sir, to refer to you", "those who shall repent of their error.", "Letters 10.96 (Melmoth's 97), Pliny to Trajan"),
    "pliny97": ("pliny", "You have adopted the right course, my dearest", "quite foreign to the spirit of our age.", "Letters 10.97 (Melmoth's 98), Trajan to Pliny"),
    "peregrine": ("lucian", "It was now that he came across the priests and scribes of the", "his fortune is pretty soon made; he plays with them.", "The Death of Peregrine 11-13"),
    "cyro": ("cyro", "However by this time the trenches were dug.", "they were persuaded to surrender the citadel themselves.", "Cyropaedia 7.5.15-33"),
    "poly26": ("poly", "Antiochus Epiphanes, nicknamed from his actions Epimanes", "others as a madman.", "Histories 26.1"),
    "poly29": ("poly", "When Antiochus had advanced to attack Ptolemy in order to possess", "yielding to the necessities of the time.", "Histories 29.27"),
    "poly31": ("poly", "In Syria king Antiochus, wishing to enrich himself", "in the course of his wicked attempt upon this temple....", "Histories 31.9 (Shuckburgh's 31.11)"),
    "carabbas": ("flaccus", "There was a certain madman named Carabbas", "about the affairs of the state.", "Against Flaccus 36-39"),
    "carabbas2": ("flaccus", "Then from the multitude of those who were standing around there arose a wonderful shout", "they call the kings among the Syrians;", "Against Flaccus 39"),
    "shields": ("embassy", "Pilate was one of the emperor's lieutenants", "for the preservation of the ancient customs of the city.", "On the Embassy to Gaius 299-305"),
    "logos": ("cherubim", "I have also, on one occasion, heard a more ingenious train of reasoning", "God was both a ruler and good.", "On the Cherubim 27"),
    "logos2": ("cherubim", "For reason is a thing capable of rapid motion", "and appears in everything.", "On the Cherubim 28"),
}

# ---- Antiquities 1-11: the Old Testament retold ----
# "book.chapter": (COTEXT's short title, the passages it retells - every passage on the same events, the New
# Testament's too where it tells them again). Chosen from each chapter's contents (Whiston's heading and text).
ANT = {
    "1.1": ("Creation and the fall", "Genesis 1:1-3:24"),
    "1.2": ("Cain and Abel, and the generations to the Flood", "Genesis 4:1-5:32; Hebrews 11:4; Jude 1:14"),
    "1.3": ("The Flood", "Genesis 6:1-9:17; Matthew 24:37-39; 1 Peter 3:20; 2 Peter 2:5; Hebrews 11:7"),
    "1.4": ("The tower of Babel", "Genesis 11:1-9"),
    "1.5": ("The nations spread over the earth", "Genesis 10:1-32"),
    "1.6": ("The nations named; Noah's curse; Shem's line to Abram", "Genesis 9:18-29; 10:1-32; 11:10-32"),
    "1.7": ("Abram leaves Chaldea", "Genesis 11:27-12:9; Acts 7:2-4; Hebrews 11:8"),
    "1.8": ("Abram in Egypt", "Genesis 12:10-13:18"),
    "1.9": ("The kings' war on Sodom", "Genesis 14:1-12"),
    "1.10": ("Abram rescues Lot; Melchizedek; Hagar", "Genesis 14:13-17:27; Hebrews 7:1-10"),
    "1.11": ("Sodom overthrown", "Genesis 18:1-19:38; Luke 17:28-32; 2 Peter 2:6-8; Jude 1:7"),
    "1.12": ("Abimelech; Ishmael sent away", "Genesis 20:1-21:34; Galatians 4:22-31"),
    "1.13": ("Isaac offered", "Genesis 22:1-19; Hebrews 11:17-19; James 2:21"),
    "1.14": ("Sarah's death", "Genesis 23:1-20"),
    "1.15": ("Keturah's sons", "Genesis 25:1-6"),
    "1.16": ("Isaac marries Rebekah", "Genesis 24:1-67"),
    "1.17": ("Abraham's death", "Genesis 25:7-11"),
    "1.18": ("Esau and Jacob: the birthright and the blessing", "Genesis 25:19-28:9; Hebrews 12:16-17; Romans 9:10-13"),
    "1.19": ("Jacob's flight to Laban", "Genesis 28:10-31:55; John 1:51"),
    "1.20": ("Jacob meets Esau; the wrestling", "Genesis 32:1-33:17; Hosea 12:3-4"),
    "1.21": ("Dinah and Shechem", "Genesis 33:18-34:31"),
    "1.22": ("Isaac's death", "Genesis 35:1-29"),
    "2.1": ("Esau in Edom", "Genesis 36:1-43"),
    "2.2": ("Joseph's dreams", "Genesis 37:1-11"),
    "2.3": ("Joseph sold into Egypt", "Genesis 37:12-36; Acts 7:9"),
    "2.4": ("Joseph and Potiphar's wife", "Genesis 39:1-23"),
    "2.5": ("Joseph in prison; Pharaoh's dreams", "Genesis 40:1-41:57; Acts 7:10"),
    "2.6": ("Joseph's brothers in Egypt", "Genesis 42:1-45:28; Acts 7:11-13"),
    "2.7": ("Jacob's family goes down to Egypt", "Genesis 46:1-47:31; Acts 7:14-15"),
    "2.8": ("The deaths of Jacob and Joseph", "Genesis 48:1-50:26; Hebrews 11:21-22"),
    "2.9": ("Israel oppressed; Moses born", "Exodus 1:1-2:10; Acts 7:17-22; Hebrews 11:23"),
    "2.10": ("Moses' war with the Ethiopians", "Numbers 12:1; Acts 7:22"),
    "2.11": ("Moses flees to Midian", "Exodus 2:11-22; Acts 7:23-29; Hebrews 11:24-27"),
    "2.12": ("The burning bush", "Exodus 3:1-4:17; Acts 7:30-35"),
    "2.13": ("Moses and Aaron before Pharaoh", "Exodus 4:18-7:13; 2 Timothy 3:8"),
    "2.14": ("The ten plagues", "Exodus 7:14-11:10"),
    "2.15": ("The Exodus", "Exodus 12:1-13:22; Hebrews 11:28"),
    "2.16": ("The sea divided", "Exodus 14:1-15:21; 1 Corinthians 10:1-2; Hebrews 11:29"),
    "3.1": ("To Sinai: Marah, the quails, the manna, the rock", "Exodus 15:22-17:7; John 6:31-32; 1 Corinthians 10:3-4"),
    "3.2": ("The Amalekites beaten", "Exodus 17:8-16"),
    "3.3": ("Jethro's visit", "Exodus 18:1-12"),
    "3.4": ("Rulers of thousands and of hundreds", "Exodus 18:13-27; Deuteronomy 1:9-18"),
    "3.5": ("Sinai and the Ten Commandments", "Exodus 19:1-20:26; 24:1-18; 31:18; Deuteronomy 5:1-33; Hebrews 12:18-21"),
    "3.6": ("The tabernacle", "Exodus 25:1-27:21; 35:4-38:31; Hebrews 9:1-5"),
    "3.7": ("The priests' and high priest's garments", "Exodus 28:1-43; 39:1-31"),
    "3.8": ("Aaron's priesthood", "Exodus 29:1-46; 40:1-38; Leviticus 8:1-10:7; Numbers 7:1-89"),
    "3.9": ("The sacrifices", "Leviticus 1:1-7:38"),
    "3.10": ("The festivals", "Leviticus 23:1-44; Numbers 28:1-29:40"),
    "3.11": ("The purifications", "Leviticus 11:1-15:33; 21:1-22:33"),
    "3.12": ("Laws; the census and the camp", "Leviticus 18:1-20:27; 25:1-55; Numbers 1:1-2:34; 10:1-10"),
    "3.13": ("From Sinai to Canaan's borders", "Numbers 10:11-11:35"),
    "3.14": ("The spies", "Numbers 13:1-14:10; Deuteronomy 1:19-33"),
    "3.15": ("Forty years in the wilderness", "Numbers 14:11-38; Hebrews 3:16-19"),
    "4.1": ("The defeat at Hormah", "Numbers 14:39-45; Deuteronomy 1:41-46"),
    "4.2": ("Korah's rebellion", "Numbers 16:1-35; Jude 1:11"),
    "4.3": ("The rebels destroyed; Aaron's rod", "Numbers 16:36-17:13; Hebrews 9:4"),
    "4.4": ("Thirty-eight years: the red heifer, Miriam, the rock, Aaron's death", "Numbers 18:1-21:3; Hebrews 9:13"),
    "4.5": ("Sihon and Og", "Numbers 21:21-35; 32:1-42; Deuteronomy 2:24-3:17"),
    "4.6": ("Balaam; Baal-peor", "Numbers 22:1-25:18; 2 Peter 2:15-16; Jude 1:11; Revelation 2:14; 1 Corinthians 10:8"),
    "4.7": ("The Midianites beaten", "Numbers 31:1-54; 35:1-34"),
    "4.8": ("Moses' laws and his end", "Deuteronomy 4:41-34:12; Jude 1:9"),
    "5.1": ("Joshua's conquest", "Joshua 1:1-24:33; Hebrews 11:30-31; James 2:25"),
    "5.2": ("After Joshua; the Levite's concubine", "Judges 1:1-2:23; 19:1-21:25"),
    "5.3": ("Dan's migration; Othniel", "Judges 3:1-11; 17:1-18:31"),
    "5.4": ("Ehud", "Judges 3:12-31"),
    "5.5": ("Deborah and Barak", "Judges 4:1-5:31"),
    "5.6": ("Gideon", "Judges 6:1-8:35; Hebrews 11:32"),
    "5.7": ("Abimelech, Jephthah and the judges after Gideon", "Judges 9:1-12:15"),
    "5.8": ("Samson", "Judges 13:1-16:31"),
    "5.9": ("Ruth", "Ruth 1:1-4:22; Matthew 1:5"),
    "5.10": ("Samuel's birth; Eli's sons", "1 Samuel 1:1-3:21; Luke 1:46-55"),
    "5.11": ("The ark taken; Eli's death", "1 Samuel 4:1-22"),
    "6.1": ("The ark among the Philistines", "1 Samuel 5:1-7:2"),
    "6.2": ("Samuel's victory at Mizpah", "1 Samuel 7:3-17"),
    "6.3": ("Israel asks for a king", "1 Samuel 8:1-22"),
    "6.4": ("Saul made king", "1 Samuel 9:1-10:27; Acts 13:21"),
    "6.5": ("Saul beats the Ammonites", "1 Samuel 11:1-12:25"),
    "6.6": ("Jonathan and the Philistines", "1 Samuel 13:1-14:52"),
    "6.7": ("Saul and the Amalekites", "1 Samuel 15:1-35"),
    "6.8": ("David anointed", "1 Samuel 16:1-23; Acts 13:22"),
    "6.9": ("David and Goliath", "1 Samuel 17:1-58"),
    "6.10": ("Saul's envy", "1 Samuel 18:1-30"),
    "6.11": ("David escapes Saul", "1 Samuel 19:1-20:42"),
    "6.12": ("David at Nob; the priests slain", "1 Samuel 21:1-22:23; Mark 2:25-26; Matthew 12:3-4; Luke 6:3-4"),
    "6.13": ("David spares Saul; Samuel's death; Nabal", "1 Samuel 23:1-26:25"),
    "6.14": ("The witch of Endor; Saul's death", "1 Samuel 27:1-31:13; 1 Chronicles 10:1-14"),
    "7.1": ("David at Hebron; Abner", "2 Samuel 1:1-3:39"),
    "7.2": ("Ishbosheth slain; David king of all Israel", "2 Samuel 4:1-5:5; 1 Chronicles 11:1-3"),
    "7.3": ("David takes Jerusalem", "2 Samuel 5:6-16; 1 Chronicles 11:4-9; 14:1-7"),
    "7.4": ("The ark brought to Jerusalem; the promise to David", "2 Samuel 5:17-7:29; 1 Chronicles 13:1-17:27; Acts 2:30"),
    "7.5": ("David's conquests", "2 Samuel 8:1-9:13; 1 Chronicles 18:1-17"),
    "7.6": ("The Ammonite war", "2 Samuel 10:1-19; 1 Chronicles 19:1-19"),
    "7.7": ("David and Bathsheba; Nathan", "2 Samuel 11:1-12:31; 1 Chronicles 20:1-3"),
    "7.8": ("Amnon and Absalom", "2 Samuel 13:1-14:33"),
    "7.9": ("Absalom's revolt", "2 Samuel 15:1-17:29"),
    "7.10": ("Absalom's death", "2 Samuel 18:1-19:8"),
    "7.11": ("David's return; Sheba's revolt", "2 Samuel 19:9-20:26"),
    "7.12": ("The Gibeonites; the Philistine giants; David's mighty men", "2 Samuel 21:1-23:39; 1 Chronicles 11:10-47; 20:4-8"),
    "7.13": ("David's census and the plague", "2 Samuel 24:1-25; 1 Chronicles 21:1-30"),
    "7.14": ("David prepares for the temple; Adonijah; Solomon made king", "1 Chronicles 22:1-23:32; 1 Kings 1:1-53"),
    "7.15": ("David's charge to Solomon and his death", "1 Kings 2:1-12; 1 Chronicles 28:1-29:30; Acts 2:29"),
    "8.1": ("Solomon secures the kingdom", "1 Kings 2:13-46"),
    "8.2": ("Solomon's wisdom; Hiram", "1 Kings 3:1-5:18; 2 Chronicles 1:1-2:18"),
    "8.3": ("The temple built", "1 Kings 6:1-7:51; 2 Chronicles 3:1-5:1; Acts 7:47"),
    "8.4": ("The ark in the temple; Solomon's prayer", "1 Kings 8:1-9:9; 2 Chronicles 5:2-7:22"),
    "8.5": ("Solomon's palace; Hiram's riddles", "1 Kings 7:1-12; 9:10-14"),
    "8.6": ("Solomon's cities; the queen of Sheba", "1 Kings 9:15-10:29; 2 Chronicles 8:1-9:28; Matthew 12:42; Luke 11:31"),
    "8.7": ("Solomon's wives, his adversaries and his death", "1 Kings 11:1-43; 2 Chronicles 9:29-31"),
    "8.8": ("The kingdom divided", "1 Kings 12:1-33; 2 Chronicles 10:1-11:4"),
    "8.9": ("The man of God from Judah", "1 Kings 13:1-34"),
    "8.10": ("Rehoboam and Shishak", "1 Kings 14:21-31; 2 Chronicles 11:5-12:16"),
    "8.11": ("Jeroboam's son; Abijah", "1 Kings 14:1-20; 15:1-8; 2 Chronicles 13:1-22"),
    "8.12": ("Asa; Zerah; Baasha and the kings of Israel", "1 Kings 15:9-16:28; 2 Chronicles 14:1-16:14"),
    "8.13": ("Ahab, Jezebel and Elijah", "1 Kings 16:29-19:21; 21:1-29; Luke 4:25-26; James 5:17-18; Romans 11:2-4"),
    "8.14": ("Ben-hadad's wars with Ahab", "1 Kings 20:1-43"),
    "8.15": ("Jehoshaphat; Ahab's death", "1 Kings 22:1-40; 2 Chronicles 17:1-18:34"),
    "9.1": ("Jehoshaphat's judges and victory", "1 Kings 22:41-50; 2 Chronicles 19:1-20:37"),
    "9.2": ("Ahaziah; Elijah taken up", "1 Kings 22:51-53; 2 Kings 1:1-2:18; Luke 9:54"),
    "9.3": ("The war on Moab; Elisha", "2 Kings 3:1-27"),
    "9.4": ("Elisha's wonders; the siege of Samaria; Hazael", "2 Kings 4:1-7; 6:8-8:15"),
    "9.5": ("Jehoram of Judah", "2 Kings 8:16-29; 2 Chronicles 21:1-20"),
    "9.6": ("Jehu", "2 Kings 9:1-10:36; 2 Chronicles 22:1-9"),
    "9.7": ("Athaliah and Joash", "2 Kings 11:1-21; 2 Chronicles 22:10-23:21"),
    "9.8": ("Hazael; Joash; Zechariah stoned; Elisha's death", "2 Kings 12:1-13:25; 2 Chronicles 24:1-27; Matthew 23:35; Luke 11:51"),
    "9.9": ("Amaziah", "2 Kings 14:1-22; 2 Chronicles 25:1-28"),
    "9.10": ("Jeroboam II; Jonah; Uzziah", "2 Kings 14:23-15:7; 2 Chronicles 26:1-23; Jonah 1:1-4:11; Amos 1:1; Zechariah 14:5; Matthew 12:39-41"),
    "9.11": ("The last kings of Israel; Nahum on Nineveh", "2 Kings 15:8-38; 2 Chronicles 27:1-9; Nahum 1:1-3:19"),
    "9.12": ("Ahaz", "2 Kings 16:1-20; 2 Chronicles 28:1-27; Isaiah 7:1-9"),
    "9.13": ("Hoshea; Hezekiah's reform and Passover", "2 Kings 17:1-6; 18:1-8; 2 Chronicles 29:1-31:21"),
    "9.14": ("Samaria taken; the Cutheans", "2 Kings 17:1-41; 18:9-12"),
    "10.1": ("Sennacherib's siege of Jerusalem", "2 Kings 18:13-19:37; 2 Chronicles 32:1-23; Isaiah 36:1-37:38"),
    "10.2": ("Hezekiah's illness; the envoys of Babylon", "2 Kings 20:1-21; 2 Chronicles 32:24-33; Isaiah 38:1-39:8"),
    "10.3": ("Manasseh", "2 Kings 21:1-18; 2 Chronicles 33:1-20"),
    "10.4": ("Amon; Josiah and the book of the law", "2 Kings 21:19-23:28; 2 Chronicles 33:21-35:19"),
    "10.5": ("Josiah's death; Jehoahaz and Jehoiakim", "2 Kings 23:29-37; 2 Chronicles 35:20-36:5"),
    "10.6": ("Nebuchadnezzar and Jehoiakim; Jeremiah's scroll", "2 Kings 24:1-7; 2 Chronicles 36:5-8; Jeremiah 26:1-24; 36:1-32"),
    "10.7": ("Jehoiachin taken; Zedekiah; Jeremiah imprisoned", "2 Kings 24:8-20; 2 Chronicles 36:9-13; Jeremiah 37:1-38:28; Ezekiel 12:13"),
    "10.8": ("Jerusalem taken and the temple burned", "2 Kings 25:1-21; 2 Chronicles 36:14-21; Jeremiah 39:1-10; 52:1-30"),
    "10.9": ("Gedaliah; the flight to Egypt", "2 Kings 25:22-26; Jeremiah 39:11-44:30"),
    "10.10": ("Daniel in Babylon", "Daniel 1:1-4:37"),
    "10.11": ("Belshazzar; Daniel among the lions; the ram and the goat", "2 Kings 25:27-30; Jeremiah 52:31-34; Daniel 5:1-8:27"),
    "11.1": ("Cyrus lets the Jews return", "Ezra 1:1-3:13; 2 Chronicles 36:22-23; Isaiah 44:28-45:4"),
    "11.2": ("The building hindered", "Ezra 4:1-24"),
    "11.3": ("Zerubbabel before Darius; the returning exiles", "Ezra 2:1-70; Nehemiah 7:6-73"),
    "11.4": ("The temple finished", "Ezra 5:1-6:22; Haggai 1:1-2:23; Zechariah 4:1-14"),
    "11.5": ("Ezra and Nehemiah", "Ezra 7:1-10:44; Nehemiah 1:1-13:31"),
    "11.6": ("Esther, Mordecai and Haman", "Esther 1:1-10:3"),
    "11.7": ("The high priests after Eliashib; Manasseh and Sanballat", "Nehemiah 12:10-11, 22; 13:28"),
    "11.8": ("The temple on Gerizim; Alexander at Jerusalem", "Nehemiah 13:28; Daniel 8:5-8, 21-22; 11:3-4; John 4:20"),
}
# (Antiquities 1-11's chapters linked by word too: Ezra-Nehemiah's Sanballat, Esther's Ahasuerus, the Cutheans' Samaritans...)
ANT_WORDS = {"11.6": ["H0325"], "11.7": ["H5571"], "11.8": ["H5571", "G4541"], "9.14": ["H8118", "G4541"],
             "10.1": ["H5576"], "10.5": ["H5224G"], "10.11": ["H1112", "H1113"], "11.1": ["H3566", "H3567"]}

# ---- The histories ----
# (id, kind, author, title, the line's summary, [(passages, what the parallel is, [quotes])], [Strong's keys]).
JEWISH, ROMAN, GREEK, CHRISTIAN = "Jewish", "Roman", "Greek", "Christian"
ANTIOCHUS = "Daniel 7:25; 8:9-14, 23-25; 9:27; 11:21-45; 12:11"
DESOLATION = "Matthew 24:15; Mark 13:14"
SECTS = "Matthew 3:7; 16:1-12; 22:23-34; Mark 12:18-27; Luke 20:27-40; Acts 4:1-2; 5:17; 23:6-10; Philippians 3:5"
PILATE_TRIAL = "Matthew 27:1-26; Mark 15:1-15; Luke 23:1-25; John 18:28-19:16"
JOHN_BAPTIST = "Matthew 3:1-17; 11:2-19; 14:1-12; Mark 1:2-11; 6:14-29; Luke 3:1-22; 7:18-35; 9:7-9; John 1:6-8, 19-36; 3:23-30"
ANTIPAS = "Luke 3:19-20; 8:3; 9:7-9; 13:31-32; 23:6-12; Mark 6:14-29; 8:15; Matthew 14:1-12; Acts 4:27; 13:1"
FALL = "Matthew 23:37-24:28; Mark 13:1-23; Luke 13:34-35; 19:41-44; 21:5-24; 23:27-31; Daniel 9:26-27"
JAMES = "Matthew 13:55; Mark 6:3; Acts 12:17; 15:13-21; 21:18; 1 Corinthians 15:7; Galatians 1:19; 2:9, 12; James 1:1; Jude 1:1"
TEMPLE = "Matthew 4:5; 21:12-17; 24:1-2; Mark 11:15-17; 13:1-2; Luke 21:5-6; John 2:13-21; 10:22-23; Acts 3:1-11; 5:12; 21:26-40; Ephesians 2:14"
HISTORY = [
    # -- The Maccabees (Brenton) --
    ("Maccabees_Alexander", JEWISH, "1 Maccabees", "Alexander the Great and his successors",
     "Alexander's conquests and his kingdom parted among his servants - Daniel's goat with the great horn, broken into four.",
     [("Daniel 7:6; 8:5-8, 21-22; 11:3-4", "The mighty king of Greece whose kingdom is broken and divided when he is gone.", ["1ma 1:1-9"])], []),
    ("Maccabees_Hellenizers", JEWISH, "2 Maccabees", "Heliodorus, Jason, and Onias murdered",
     "Seleucus' tax-raiser Heliodorus sent to rob the temple; Jason buys the high priesthood and builds a gymnasium; Onias murdered.",
     [("Daniel 11:20", "One who sends a raiser of taxes through the glory of the kingdom: Seleucus IV's minister Heliodorus.", ["2ma 3:7-40"]),
      ("Daniel 9:26; 11:22", "An anointed one cut off, and the prince of the covenant broken: read of the high priest Onias III.", ["2ma 4:30-38"]),
      ("Daniel 11:30-32", "Those who forsake the holy covenant and do wickedly against it, won over by flatteries.", ["2ma 4:7-17"])], []),
    ("Maccabees_Persecution", JEWISH, "1 and 2 Maccabees", "Antiochus IV's persecution: the abomination of desolation",
     "Antiochus Epiphanes plunders the temple, forbids the law and sets up \"the abomination of desolation\" on the altar (167 BC).",
     [(ANTIOCHUS, "The king who speaks against the Most High, wears out the saints, changes times and law, takes away the daily sacrifice and sets up the abomination that makes desolate.", ["1ma 1:10-64", "2ma 6:1-11"]),
      (DESOLATION, "Jesus' \"abomination of desolation, spoken of by Daniel\" - its first fulfillment, as Jews read it, in Antiochus' altar.", [])], []),
    ("Maccabees_Revolt", JEWISH, "1 Maccabees", "Mattathias and the revolt",
     "Mattathias kills the apostate at the altar, zealous as Phinehas, and flees to the hills; the revolt begins.",
     [("Daniel 11:32-35", "\"The people that do know their God shall be strong\" - helped with \"a little help\", some falling.", ["1ma 2:1-48"]),
      ("Numbers 25:6-13", "Phinehas' zeal, which Mattathias is said to match.", []),
      ("Hebrews 11:33-34", "Those who through faith \"waxed valiant in fight, turned to flight the armies of the aliens\".", [])], []),
    ("Maccabees_Rededication", JEWISH, "1 and 2 Maccabees", "The temple cleansed and rededicated (Hanukkah)",
     "Judas cleanses the temple and rededicates the altar on 25 Kislev, 164 BC: eight days, kept every year - the Feast of Dedication.",
     [("John 10:22-23", "\"It was at Jerusalem the feast of the dedication, and it was winter\": Jesus in Solomon's porch.", ["1ma 4:36-59", "2ma 10:1-8"]),
      ("Daniel 8:14", "\"Unto two thousand and three hundred days; then shall the sanctuary be cleansed.\"", [])], []),
    ("Maccabees_Martyrs", JEWISH, "2 Maccabees", "Eleazar and the seven brothers",
     "The old scribe Eleazar and a mother with seven sons die rather than eat swine's flesh, trusting in the resurrection.",
     [("Hebrews 11:35-38", "\"Others were tortured, not accepting deliverance; that they might obtain a better resurrection.\"", ["2ma 6:18-7:42"]),
      ("Daniel 12:2-3", "Those who sleep in the dust awaking to everlasting life.", []),
      ("Daniel 1:8; 11:33-35", "Refusing the king's food; the wise who fall by the sword and by flame.", [])], []),
    ("Maccabees_Antiochus_death", JEWISH, "1 and 2 Maccabees", "Antiochus IV's death",
     "Antiochus, failing to rob a temple in Persia, hears of Judas' victories and dies in anguish - in 2 Maccabees eaten by worms.",
     [("Daniel 11:44-45", "\"He shall come to his end, and none shall help him.\"", ["1ma 6:1-16", "2ma 9:1-29"]),
      ("Acts 12:23", "Herod Agrippa \"eaten of worms\" - the same end for a king who exalted himself.", [])], []),
    ("Maccabees_Dead", JEWISH, "2 Maccabees", "Judas' offering for the dead",
     "Judas sends a sin offering to Jerusalem for soldiers fallen with idols' tokens on them, mindful of the resurrection.",
     [("1 Corinthians 15:29", "Something done for the dead because the dead will rise - Paul's \"baptized for the dead\", often compared.", ["2ma 12:38-45"]),
      ("Daniel 12:2", "The resurrection the act assumes.", [])], []),
    ("Maccabees_Prophet", JEWISH, "1 Maccabees", "Until a faithful prophet should arise",
     "The defiled altar's stones laid aside, and Simon made high priest, \"until there should come a faithful prophet\".",
     [("Deuteronomy 18:15-18; John 1:21, 25; 6:14; 7:40; Acts 3:22-23", "The prophet like Moses awaited: \"Art thou that prophet?\"", ["1ma 4:44-46", "1ma 9:27", "1ma 14:41"])], []),
    # -- Josephus: from the Maccabees to the Romans --
    ("Josephus_Ant_12.3", JEWISH, "Josephus", "Antiochus III takes Judea",
     "Antiochus the Great wins Coele-Syria from Ptolemy and is welcomed at Jerusalem.",
     [("Daniel 11:13-16", "The king of the north who takes the well-fenced cities and stands in the glorious land.", ["ant 12.3.3"])], []),
    ("Josephus_Ant_12.5", JEWISH, "Josephus", "Antiochus Epiphanes profanes the temple",
     "Antiochus takes Jerusalem, plunders the temple, builds an idol altar on God's and forbids the law (Antiquities 12.5.1-5).",
     [(ANTIOCHUS, "The temple plundered, the daily sacrifice stopped, an idol altar on God's altar, the law forbidden.", ["ant 12.5.1-5"]),
      (DESOLATION, "The abomination of desolation Jesus speaks of, \"spoken of by Daniel\".", [])], []),
    ("Josephus_Ant_12.6", JEWISH, "Josephus", "Mattathias' revolt",
     "Mattathias of Modin kills the apostate at the altar and goes up to the mountains with his sons.",
     [("Daniel 11:32-35", "The people who know their God, standing firm.", ["ant 12.6.1-4"])], []),
    ("Josephus_Ant_12.7", JEWISH, "Josephus", "The temple rededicated: the Festival of Lights",
     "Judas purifies the temple; the festival of eight days, \"called Lights\", kept ever since (Antiquities 12.7.6-7).",
     [("John 10:22-23", "The Feast of Dedication, in winter, Jesus walking in Solomon's porch.", ["ant 12.7.6-7"]),
      ("Daniel 8:14", "The sanctuary cleansed.", [])], []),
    ("Josephus_Ant_12.9", JEWISH, "Josephus", "Antiochus Epiphanes' death",
     "Antiochus dies of a lingering disease after failing at Elymais - Josephus thinks rather for robbing Jerusalem's temple.",
     [("Daniel 11:44-45", "The king who comes to his end with none to help him.", ["ant 12.9.1"])], []),
    ("Josephus_Ant_13.3", JEWISH, "Josephus", "Onias' temple in Egypt and Isaiah's altar",
     "Onias IV builds a temple at Leontopolis in Egypt, citing Isaiah's altar to the LORD in the midst of Egypt.",
     [("Isaiah 19:18-19", "\"In that day shall there be an altar to the LORD in the midst of the land of Egypt.\"", ["ant 13.3.1-3"])], []),
    ("Josephus_Sects", JEWISH, "Josephus", "The Pharisees, the Sadducees and the Essenes",
     "Josephus on the three sects: fate and free will, the soul and the resurrection, the Pharisees' traditions, the Essenes' life.",
     [(SECTS, "The Pharisees, who hold the soul immortal and the dead raised, and the Sadducees, who say there is no resurrection, neither angel nor spirit.", ["ant 13.5.9", "ant 18.1.2-5", "war 2.8.14"]),
      ("Mark 7:1-13; Matthew 15:1-9; Galatians 1:14", "The Pharisees' traditions of the fathers, not written in the law of Moses - which the Sadducees reject.", ["ant 13.10.5-6"]),
      ("Matthew 5:33-37; James 5:12; Acts 2:44-45; 4:32-35; Matthew 10:9-11", "The Essenes: no oaths (\"swearing is worse than perjury\"), goods held in common, travelers taking nothing with them.", ["war 2.8.2-13"])],
     ["G5330", "G4523"]),
    ("Josephus_Sanhedrin", JEWISH, "Josephus", "Herod before the Sanhedrin",
     "The young Herod tried before the Sanhedrin for killing without trial; Sameas warns them he will one day punish them all.",
     [("Matthew 26:57-68; Mark 14:53-65; Acts 4:5-21; 5:21-41; 6:12-15; 22:30-23:10", "The council as the Gospels and Acts show it: the high priest presiding, the accused standing before it.", ["ant 14.9.3-5"])],
     ["G4892"]),
    ("Josephus_Ant_15.11", JEWISH, "Josephus", "Herod rebuilds the temple",
     "Herod begins rebuilding the temple in his 18th year (20-19 BC): its courts, cloisters, the warning to Gentiles and the Antonia.",
     [("John 2:20", "\"Forty and six years was this temple in building\" - counted from Herod's start.", ["ant 15.11.1-7"]),
      (TEMPLE, "The temple of the Gospels and Acts: its stones, porches, courts and the barrier Gentiles might not pass.", [])],
     ["G2411"]),
    ("Josephus_War_5.5", JEWISH, "Josephus", "A description of the temple",
     "The temple as Josephus knew it before its fall: the courts, the warning pillars, the gates, the veil, the holy of holies, the Antonia.",
     [(TEMPLE, "The temple's courts, porches and gates; the barrier no Gentile might pass on pain of death.", ["war 5.5.1-8"]),
      ("Matthew 27:51; Mark 15:38; Luke 23:45; Hebrews 9:1-8; 10:19-20", "The veil before the holy of holies, embroidered with the heavens.", [])],
     ["G2411"]),
    ("Josephus_Herod_death", JEWISH, "Josephus", "Herod the Great's last days and death",
     "Herod's cruelty to the last - the eagle cut down, the notables shut up to be killed at his death - his illness, death and burial (4 BC).",
     [("Matthew 2:1-22; Luke 1:5", "Herod the king, troubled at news of a rival king, killing all the boys of Bethlehem; his death, and Archelaus reigning in his place.", ["ant 17.6.1-5", "ant 17.8.1-3"]),
      ("Acts 12:21-23", "A Herod's dreadful death, his grandson Agrippa's like it.", [])],
     ["G2264G"]),
    ("Josephus_Archelaus", JEWISH, "Josephus", "Archelaus: the kingdom sought at Rome",
     "Archelaus kills 3,000 at the Passover, sails to Rome for his kingdom, is opposed by an embassy of Jews, rules as ethnarch and is banished.",
     [("Matthew 2:22", "Joseph afraid to go to Judea, \"for Archelaus did reign in Judaea in the room of his father Herod\".", ["ant 17.9.3", "ant 17.13.2"]),
      ("Luke 19:12-15, 27", "A nobleman goes to a far country to receive a kingdom; his citizens send an embassy after him: \"We will not have this man to reign over us.\"", ["ant 17.11.1-2"])],
     ["G0745"]),
    ("Josephus_Census", JEWISH, "Josephus", "The census under Quirinius and Judas the Galilean",
     "Quirinius taxes Judea (AD 6); Judas the Galilean rises against it and founds a \"fourth philosophy\" that will own no master but God.",
     [("Luke 2:1-5", "\"This taxing was first made when Cyrenius was governor of Syria.\"", ["ant 18.1.1"]),
      ("Acts 5:37", "\"Judas of Galilee in the days of the taxing\" - Gamaliel's example.", ["ant 18.1.6"]),
      ("Luke 6:15; Acts 1:13; Matthew 22:15-22; Mark 12:13-17; Luke 20:20-26", "Simon the Zealot; the question of tribute to Caesar, the census' own question.", [])],
     ["G2958", "G2455K", "G2208", "G2581"]),
    ("Josephus_Tetrarchs", JEWISH, "Josephus", "The tetrarchs' cities and the high priests from Annas to Caiaphas",
     "Philip builds Caesarea Philippi and Julias (Bethsaida), Herod Antipas builds Tiberias; the high priesthood passes from Annas to Caiaphas.",
     [("Luke 3:1-2; John 18:13, 24; Acts 4:6", "\"Annas and Caiaphas being the high priests\" - Annas, Caiaphas' father-in-law.", ["ant 18.2.1-2", "ant 18.4.3"]),
      ("Matthew 16:13; Mark 8:22, 27; John 6:1, 23; 21:1", "Caesarea Philippi, Bethsaida and the sea of Tiberias.", ["ant 18.2.3"]),
      ("John 11:47-53; 18:14, 28; Matthew 26:3, 57", "Caiaphas, \"high priest that same year\".", [])],
     ["G0452", "G2533G", "G5376I", "G2542G"]),
    ("Josephus_Pilate", JEWISH, "Josephus", "Pontius Pilate: the standards, the aqueduct, the Samaritans",
     "Pilate brings Caesar's images into Jerusalem, takes temple money for an aqueduct and clubs the protesters, kills Samaritans and is sent to Rome (AD 36).",
     [("Luke 13:1", "\"The Galileans, whose blood Pilate had mingled with their sacrifices\" - a deed like those Josephus tells.", ["ant 18.3.1-2", "war 2.9.2-4"]),
      (PILATE_TRIAL + "; Luke 3:1; Acts 3:13; 4:27; 13:28; 1 Timothy 6:13", "The governor who tried Jesus.", ["ant 18.4.1-2"])],
     ["G4091"]),
    ("Josephus_Testimonium", JEWISH, "Josephus", "Jesus (the Testimonium Flavianum)",
     "Josephus' paragraph on Jesus, condemned by Pilate - its present wording likely touched by Christian copyists, its core widely held to be his.",
     [(PILATE_TRIAL + "; Mark 15:16-47; Luke 23:26-56; Luke 24:1-12; Acts 2:22-24; 1 Corinthians 15:3-8", "Jesus, a doer of wonderful works, condemned to the cross by Pilate at the accusation of the leading men; his followers saying he appeared alive on the third day.", ["ant 18.3.3"])],
     []),
    ("Josephus_Antipas", JEWISH, "Josephus", "Herod Antipas, Herodias and John the Baptist",
     "Antipas leaves Aretas' daughter for Herodias, loses a war to Aretas - which the Jews thought God's punishment for his killing John the Baptist - and is banished with her.",
     [(JOHN_BAPTIST, "John, \"a good man\" who bade the Jews be baptized with righteousness, put to death at Machaerus by Herod for fear of his influence.", ["ant 18.5.2"]),
      (ANTIPAS, "Herod the tetrarch and Herodias, his brother Philip's wife; his war with Aretas; their exile.", ["ant 18.5.1", "ant 18.5.4", "ant 18.7.1-2"]),
      ("2 Corinthians 11:32", "Aretas the king, whose governor in Damascus watched for Paul.", [])],
     ["G2264H", "G2266G", "G2265", "G0702"]),
    ("Josephus_Gaius", JEWISH, "Josephus", "Gaius' statue for the temple",
     "Caligula orders his statue set up in the temple (AD 40); the Jews offer their lives sooner; Petronius delays and Gaius dies.",
     [(DESOLATION + "; 2 Thessalonians 2:3-4", "An idol in the holy place, and one who sits in God's temple showing himself to be God - Gaius' order is the nearest event to the words.", ["ant 18.8.2-3", "ant 18.8.8-9"])], []),
    ("Josephus_Agrippa", JEWISH, "Josephus", "Herod Agrippa I: his reign and his death",
     "Agrippa, king of all Judea, keeps the law to please the Jews; at Caesarea, hailed as a god in a robe of silver, he is struck and dies in five days (AD 44).",
     [("Acts 12:1-4", "Herod the king who killed James to please the Jews.", ["ant 19.7.3"]),
      ("Acts 12:19-23", "At Caesarea, in royal apparel, hailed \"the voice of a god, and not of a man\", smitten by the angel of the Lord.", ["ant 19.8.2"])],
     ["G2264I"]),
    ("Josephus_Famine", JEWISH, "Josephus", "The famine under Claudius",
     "Queen Helena of Adiabene buys grain in Egypt and figs in Cyprus for Jerusalem in a great famine (about AD 46-48).",
     [("Acts 11:27-30", "Agabus foretells a great dearth, \"which came to pass in the days of Claudius Caesar\"; relief sent to Judea.", ["ant 20.2.5", "ant 20.5.2"])],
     ["G2804G"]),
    ("Josephus_Theudas", JEWISH, "Josephus", "Theudas, and the sons of Judas the Galilean",
     "Theudas the false prophet leads a crowd to the Jordan and is beheaded under Fadus; under Tiberius Alexander, Judas the Galilean's sons are crucified.",
     [("Acts 5:36-37", "Gamaliel: \"before these days rose up Theudas... After this man rose up Judas of Galilee.\" (Josephus' Theudas comes some years after Gamaliel's speech.)", ["ant 20.5.1-2"])],
     ["G2333"]),
    ("Josephus_Samaritans", JEWISH, "Josephus", "Galileans and Samaritans on the road to the feasts",
     "Samaritans kill a Galilean going up to a festival through Samaria; feuds and reprisals follow.",
     [("Luke 9:51-56; John 4:9", "A Samaritan village refuses Jesus because he is going to Jerusalem; \"the Jews have no dealings with the Samaritans\".", ["ant 20.6.1"])],
     ["G4541"]),
    ("Josephus_Ananias", JEWISH, "Josephus", "Ananias son of Nebedeus, high priest",
     "Ananias, high priest from about AD 47, sent to Rome in chains, later rich and violent, killed by the rebels in AD 66.",
     [("Acts 23:1-5; 24:1", "\"The high priest Ananias commanded them that stood by him to smite him on the mouth.\"", ["ant 20.5.2", "ant 20.6.2", "ant 20.9.2", "war 2.17.9"])],
     ["G0367I"]),
    ("Josephus_Felix", JEWISH, "Josephus", "Felix, Drusilla, Agrippa II and Bernice",
     "Felix governs Judea (AD 52-60), marries Drusilla, Agrippa II's sister, away from her husband; Bernice lives with her brother Agrippa.",
     [("Acts 23:23-24:27", "Felix the governor and \"his wife Drusilla, which was a Jewess\", hearing Paul of righteousness, temperance and judgment to come.", ["ant 20.7.1-2", "ant 20.8.5"]),
      ("Acts 25:13-26:32", "King Agrippa and Bernice at Caesarea, hearing Paul.", ["ant 20.7.3"])],
     ["G5344", "G1409", "G0067", "G0959"]),
    ("Josephus_Egyptian", JEWISH, "Josephus", "The sicarii and the Egyptian prophet",
     "Daggermen kill in the crowds at the feasts; an Egyptian prophet leads thousands to the Mount of Olives to see the walls fall, and Felix scatters them.",
     [("Acts 21:37-38", "\"Art not thou that Egyptian, which before these days madest an uproar, and leddest out into the wilderness four thousand men that were murderers?\" (sicarii)", ["ant 20.8.6", "war 2.13.3-5"]),
      ("Matthew 24:23-26; Mark 13:21-22", "\"Behold, he is in the desert; go not forth.\"", [])], []),
    ("Josephus_Festus", JEWISH, "Josephus", "Festus succeeds Felix",
     "Felix accused at Rome; Porcius Festus governs, fights the sicarii; Agrippa's dining room overlooks the temple.",
     [("Acts 24:27-25:12", "\"Porcius Festus came into Felix' room\"; Paul appeals to Caesar.", ["ant 20.8.9-11"])],
     ["G5347"]),
    ("Josephus_James", JEWISH, "Josephus", "The death of James, the brother of Jesus",
     "With Festus dead and Albinus on the way (AD 62), the high priest Ananus has \"the brother of Jesus, who was called Christ, whose name was James\" stoned.",
     [(JAMES, "James, the brother of the Lord, leader of the church at Jerusalem.", ["ant 20.9.1"])],
     ["G2385I"]),
    ("Josephus_Porch", JEWISH, "Josephus", "Solomon's porch",
     "The eastern cloister, believed Solomon's work: the people ask Agrippa II to rebuild it when the temple is finished (AD 64).",
     [("John 10:23; Acts 3:11; 5:12", "Jesus and the apostles in Solomon's porch.", ["ant 20.9.7"])], []),
    ("Josephus_Siege", JEWISH, "Josephus", "The siege: a wall around Jerusalem",
     "Titus rings the city with a wall in three days; the famine in the city.",
     [("Luke 19:41-44", "\"Thine enemies shall cast a trench about thee, and compass thee round, and keep thee in on every side.\"", ["war 5.12.1-3"]),
      (FALL, "The city besieged and its desolation, as Jesus foretold it.", [])], []),
    ("Josephus_Mary", JEWISH, "Josephus", "The famine: Mary who ate her son",
     "In the famine a woman of rank, Mary daughter of Eleazar, kills and eats her infant son.",
     [("Luke 21:23; 23:28-29; Deuteronomy 28:53-57; Lamentations 4:10", "\"Woe unto them that are with child, and to them that give suck, in those days!\"", ["war 6.3.4"])], []),
    ("Josephus_Temple_burned", JEWISH, "Josephus", "The temple burned (AD 70)",
     "A soldier throws a brand into the temple against Titus' wish; it burns on the very day the first temple burned.",
     [("Matthew 24:1-2; Mark 13:1-2; Luke 19:44; 21:5-6", "\"There shall not be left here one stone upon another.\"", ["war 6.4.5-7"]),
      (FALL, "Jerusalem's fall as Jesus foretold it.", [])], []),
    ("Josephus_Portents", JEWISH, "Josephus", "Signs before the fall: false prophets and Jesus son of Ananus",
     "A false prophet leads the people to the temple to await deliverance; a star like a sword, the temple gate opening of itself, armies in the clouds, \"Let us remove hence\"; Jesus son of Ananus' woes on Jerusalem.",
     [("Luke 21:8-11, 25-26; Matthew 24:4-5, 11, 23-26; Mark 13:21-22", "False prophets, \"fearful sights and great signs from heaven\".", ["war 6.5.2-4"]),
      ("Luke 19:41-44; 23:28-31; Matthew 23:37-38; Jeremiah 7:34", "A voice against Jerusalem and the temple, against bridegrooms and brides.", [])], []),
    ("Josephus_Captives", JEWISH, "Josephus", "The slain and the captives; the city razed",
     "1,100,000 dead, 97,000 captives sold or sent to the mines and arenas; the city leveled but for three towers and a wall.",
     [("Luke 21:24", "\"They shall fall by the edge of the sword, and shall be led away captive into all nations: and Jerusalem shall be trodden down of the Gentiles.\"", ["war 6.9.2-4", "war 7.1.1"]),
      ("Luke 19:44; Matthew 24:2", "\"They shall lay thee even with the ground.\"", [])], []),
    # -- Philo (Yonge) --
    ("Philo_Pilate", JEWISH, "Philo", "Pilate and the gilded shields",
     "Agrippa I's letter to Gaius, in Philo: Pilate's shields in Herod's palace, his fear of the Jews' embassy to Tiberius, and his character.",
     [(PILATE_TRIAL + "; Luke 13:1", "The governor Philo calls inflexible, stubborn and cruel, who feared being reported to Caesar.", ["m:shields"]),
      ("John 19:12-16", "\"If thou let this man go, thou art not Caesar's friend\" - the same fear of being reported.", [])],
     ["G4091"]),
    ("Philo_Carabbas", JEWISH, "Philo", "Carabbas: a mock king in Alexandria",
     "To mock King Agrippa I (AD 38), Alexandrians dress a madman as a king - papyrus crown, mat for a robe, reed sceptre - and hail him \"Maris\", lord.",
     [("Matthew 27:27-31; Mark 15:16-20; John 19:1-5; Luke 23:11", "The soldiers' mock king: the crown, the robe, the reed in the hand, the salutes - Hail, King of the Jews!", ["m:carabbas", "m:carabbas2"])], []),
    ("Philo_Logos", JEWISH, "Philo", "The Word between God's powers",
     "Philo's Logos (here \"reason\", as Yonge renders logos): before all things, through which God both creates and rules.",
     [("John 1:1-3; Colossians 1:15-17; Hebrews 1:2-3", "\"In the beginning was the Word\" - the Logos, before all things and in all things, through whom the world was made.", ["m:logos", "m:logos2"])], []),
    # -- Eusebius (Christian) --
    ("Eusebius_Genealogies", CHRISTIAN, "Eusebius", "Africanus on the two genealogies of Christ",
     "Julius Africanus' letter, in Eusebius: Matthew's and Luke's genealogies reconciled through a levirate marriage.",
     [("Matthew 1:1-17; Luke 3:23-38", "The two genealogies of Jesus, through Solomon and through Nathan.", ["eus 1.7.1-17"])], []),
    ("Eusebius_James_Zebedee", CHRISTIAN, "Eusebius", "James son of Zebedee beheaded",
     "Clement's story, in Eusebius: James' accuser, moved by his witness, confesses Christ and is beheaded with him.",
     [("Acts 12:1-2", "\"He killed James the brother of John with the sword.\"", ["eus 2.9.1-4"])], ["G2385G"]),
    ("Eusebius_Mark", CHRISTIAN, "Eusebius", "Mark's Gospel and Peter",
     "Peter's hearers in Rome ask Mark to write down his preaching; Peter's first epistle written from \"Babylon\", Rome; Papias' report on Mark and Matthew.",
     [("1 Peter 5:13; Acts 12:12, 25; 15:37-39; Colossians 4:10; 2 Timothy 4:11; Philemon 1:24", "Mark, Peter's \"son\", and the companions he worked with.", ["eus 2.15.1-2", "eus 3.39.14-16"])], []),
    ("Eusebius_Therapeutae", CHRISTIAN, "Eusebius", "Philo's Therapeutae, read as the first Christians",
     "Eusebius retells Philo's On the Contemplative Life - ascetics near Alexandria who gave away their goods - and takes them for Mark's converts.",
     [("Acts 2:42-47; 4:32-35", "The believers who sold their possessions and had all things common.", ["eus 2.17.1-24"])], []),
    ("Eusebius_Paul", CHRISTIAN, "Eusebius", "Paul's release, second imprisonment and death",
     "Paul, freed after two years in Rome, preaches again and is beheaded under Nero; Peter crucified there the same time.",
     [("Acts 28:30-31; 2 Timothy 4:6-8, 16-17", "Two whole years in his own hired house; \"I am now ready to be offered\".", ["eus 2.22.1-8"]),
      ("John 21:18-19; 2 Peter 1:14", "Peter's death foretold.", ["eus 2.25.5-8"])], []),
    ("Eusebius_James", CHRISTIAN, "Eusebius", "The martyrdom of James the Just",
     "Hegesippus' account, in Eusebius: James, set on the temple's pinnacle to turn the people from Jesus, confesses him, is thrown down, stoned and clubbed.",
     [(JAMES, "James, the brother of the Lord.", ["eus 2.23.1-18"]),
      ("Luke 23:34; Acts 7:60", "\"Forgive them, for they know not what they do\" - James' prayer as he is stoned.", [])],
     ["G2385I"]),
    ("Eusebius_Apostles", CHRISTIAN, "Eusebius", "Where the apostles preached",
     "Thomas to Parthia, Andrew to Scythia, John to Asia, Peter to the Jews of the dispersion and at last to Rome, crucified head downward.",
     [("1 Peter 1:1; John 21:18-19; Matthew 28:19-20", "Peter's letter to the dispersion in Pontus, Galatia, Cappadocia, Asia and Bithynia; his death.", ["eus 3.1.1-3"])], []),
    ("Eusebius_Pella", CHRISTIAN, "Eusebius", "The flight to Pella",
     "Warned by an oracle, the Jerusalem church leaves the city for Pella before the war; the city's desolation.",
     [("Luke 21:20-24; Matthew 24:15-22; Mark 13:14-20", "\"When ye shall see Jerusalem compassed with armies... then let them which are in Judaea flee to the mountains.\"", ["eus 3.5.2-7"])], []),
    ("Eusebius_Symeon", CHRISTIAN, "Eusebius", "Symeon son of Clopas",
     "After James' death, Symeon son of Clopas, a cousin of the Lord, chosen to lead the church at Jerusalem.",
     [("John 19:25; Luke 24:18", "Mary the wife of Clopas; Cleopas on the road to Emmaus.", ["eus 3.11.1-2"])], []),
    ("Eusebius_Patmos", CHRISTIAN, "Eusebius", "John banished to Patmos",
     "Under Domitian (about AD 95) the apostle John is banished to Patmos, where the Revelation was seen, Irenaeus says.",
     [("Revelation 1:9", "\"I John... was in the isle that is called Patmos, for the word of God.\"", ["eus 3.18.1-4"])], []),
    ("Eusebius_Jude", CHRISTIAN, "Eusebius", "The grandsons of Jude before Domitian",
     "Domitian questions the grandsons of Jude, the Lord's brother - farmers with calloused hands - and lets them go.",
     [("Jude 1:1; Matthew 13:55; Mark 6:3", "Jude, \"the brother of James\", of the Lord's family.", ["eus 3.20.1-7"])], []),
    ("Eusebius_Philip", CHRISTIAN, "Eusebius", "Philip's daughters and John at Ephesus",
     "Polycrates of Ephesus: John who leaned on the Lord's breast buried at Ephesus; Philip and his prophesying daughters at Hierapolis.",
     [("Acts 21:8-9", "\"Philip the evangelist... had four daughters, virgins, which did prophesy.\"", ["eus 3.31.2-5"]),
      ("John 13:23-25; 21:20-24", "The disciple who leaned on Jesus' breast at supper.", [])], []),
    # -- The Romans --
    ("Tacitus_Annals_15.44", ROMAN, "Tacitus", "Nero blames the Christians for the fire of Rome",
     "Tacitus (about AD 116): \"Christus... suffered the extreme penalty during the reign of Tiberius at the hands of... Pontius Pilatus\"; Nero's tortures of the Christians (AD 64).",
     [(PILATE_TRIAL, "Christ put to death under Tiberius by Pontius Pilate.", ["m:ann15.44"]),
      ("1 Peter 4:12-16; Romans 1:7-8; Revelation 17:6; 2 Timothy 4:6", "Christians in Rome suffering as Christians - the persecution Peter's and Paul's deaths are dated to.", [])],
     ["G5546"]),
    ("Tacitus_Annals_12", ROMAN, "Tacitus", "Claudius' famine and Felix's rule",
     "Tacitus on the famine under Claudius (AD 51) and on Felix, Pallas' brother, governing Judea as if he might do any evil act with impunity.",
     [("Acts 11:28", "\"A great dearth throughout all the world: which came to pass in the days of Claudius Caesar.\"", ["m:ann12.43"]),
      ("Acts 23:23-24:27", "Felix the governor, who hoped Paul would bribe him.", ["m:ann12.54"])],
     ["G5344"]),
    ("Suetonius_Claudius", ROMAN, "Suetonius", "Claudius expels the Jews from Rome",
     "Suetonius (about AD 121): Claudius \"banished from Rome all the Jews, who were continually making disturbances at the instigation of one Chrestus\" (about AD 49); the famines.",
     [("Acts 18:2", "Aquila and Priscilla, \"lately come from Italy... because that Claudius had commanded all Jews to depart from Rome\".", ["m:claud25"]),
      ("Acts 11:28", "The dearth in the days of Claudius.", ["m:claud18"])],
     ["G2804G"]),
    ("Suetonius_Nero", ROMAN, "Suetonius", "Nero punishes the Christians",
     "Among Nero's measures: \"He likewise inflicted punishments on the Christians, a sort of people who held a new and impious superstition.\"",
     [("1 Peter 4:14-16; Acts 26:28", "Suffering \"as a Christian\".", ["m:nero16"])],
     ["G5546"]),
    ("Pliny_Trajan", ROMAN, "Pliny the Younger", "Pliny and Trajan on the Christians",
     "Pliny, governing Bithynia (about AD 112), asks Trajan how to try Christians - who meet on a fixed day before light, sing a hymn to Christ as to a god and bind themselves by oath to no crime; Trajan's reply.",
     [("1 Peter 1:1; 4:14-16; Acts 11:26; 26:28", "Christians in Bithynia, punished for the name alone.", ["m:pliny96", "m:pliny97"]),
      ("Acts 20:7; 1 Corinthians 11:20-26; Ephesians 5:19; Colossians 3:16", "A fixed day's meeting, hymns to Christ, a shared ordinary meal.", [])],
     ["G5546"]),
    ("Lucian_Peregrinus", ROMAN, "Lucian", "Peregrinus among the Christians",
     "Lucian's satire (about AD 165): the Christians, who worship \"the crucified sage\", care for their imprisoned and hold their goods in common - easy prey for a charlatan.",
     [("Hebrews 13:3; Matthew 25:36; Acts 2:44-45; 4:32", "Visiting the prisoner, sharing all things.", ["m:peregrine"]),
      ("1 Corinthians 1:23; 2:2", "Christ crucified - to the Greeks foolishness.", [])],
     ["G5546"]),
    # -- The Greeks --
    ("Herodotus_Sennacherib", GREEK, "Herodotus", "Sennacherib's army destroyed",
     "Herodotus' Egyptian story (about 430 BC): Sanacharib's army at Pelusium undone in a night by field mice gnawing their bows.",
     [("2 Kings 19:35-36; Isaiah 37:36-37; 2 Chronicles 32:21", "The angel of the LORD smites the Assyrian camp in the night; Sennacherib goes home.", ["hdt 2.141"])],
     ["H5576"]),
    ("Herodotus_Necho", GREEK, "Herodotus", "Necho's victory at Magdolos",
     "Necho fights the Syrians at Magdolos (Megiddo) and takes Cadytis (Gaza or Kadesh).",
     [("2 Kings 23:29-30; 2 Chronicles 35:20-24", "Pharaoh Necho at Megiddo, where Josiah is killed.", ["hdt 2.159"])],
     ["H5224G"]),
    ("Herodotus_Babylon", GREEK, "Herodotus", "Cyrus takes Babylon",
     "Cyrus drains the Euphrates and his men walk in along the riverbed while Babylon feasts, unaware.",
     [("Daniel 5:1-4, 30-31", "Belshazzar's feast; \"in that night was Belshazzar... slain\".", ["hdt 1.191"]),
      ("Isaiah 44:27-45:2; Jeremiah 50:38; 51:30-32, 36, 39, 57", "\"That saith to the deep, Be dry\"; the gates opened before Cyrus; Babylon's drunken feast.", [])],
     ["H3566", "H3567", "H1112", "H1113"]),
    ("Herodotus_Persians", GREEK, "Herodotus", "The Persian court: the seven, entering unbidden",
     "The six who with Darius overthrew the Magus may enter the king unannounced, unless he is with a woman; Intaphrenes put to death for forcing his way in.",
     [("Esther 1:14; 4:11; 5:1-2", "The seven princes who saw the king's face; death for any who came in unbidden.", ["hdt 3.84", "hdt 3.118-119"])],
     ["H0325"]),
    ("Herodotus_Couriers", GREEK, "Herodotus", "The Persian couriers",
     "Nothing mortal is swifter than the Persian couriers, horse and rider posted a day's journey apart.",
     [("Esther 3:13-15; 8:10, 14", "Letters sent by posts on horseback, riding on swift steeds throughout the provinces.", ["hdt 8.98"])],
     ["H0325"]),
    ("Herodotus_Xerxes", GREEK, "Herodotus", "Xerxes' promise and Amestris' revenge",
     "Xerxes promises his mistress Artaynte anything she asks; at the king's birthday feast Queen Amestris takes her terrible revenge.",
     [("Esther 1:1-12; 2:16-18; 5:3, 6; 7:2", "Xerxes (Ahasuerus) as Esther shows him: lavish feasts, rash promises - \"even to the half of the kingdom\".", ["hdt 9.108-111"])],
     ["H0325"]),
    ("Xenophon_Babylon", GREEK, "Xenophon", "Cyrus takes Babylon by the riverbed",
     "Xenophon's telling: on a festival night the river turned, the city entered, the drunken guards killed and the king slain.",
     [("Daniel 5:1-4, 30-31", "Belshazzar's feast and his death \"in that night\".", ["m:cyro"]),
      ("Isaiah 21:5; 44:27-45:2; Jeremiah 51:39, 57", "The feast and the watchmen; the deep dried, the gates opened before Cyrus.", [])],
     ["H3566", "H3567", "H1112", "H1113"]),
    ("Polybius_Antiochus", GREEK, "Polybius", "Antiochus Epiphanes: the madman, the circle in the sand, his end",
     "Polybius (about 150 BC): Antiochus' antics - \"Epimanes\", the madman -, the Roman envoy Popilius' circle round him at Alexandria (168 BC), his death after robbing a temple.",
     [("Daniel 11:21-24, 36-39", "\"A vile person... he shall scatter among them the prey, and spoil, and riches.\"", ["m:poly26"]),
      ("Daniel 11:29-30", "\"The ships of Chittim shall come against him: therefore he shall be grieved, and return\" - Rome's envoys.", ["m:poly29"]),
      ("Daniel 11:44-45", "His end, with none to help him.", ["m:poly31"])], []),
]


# ---- The entries ----

def load(pins):
    """Every work's text, parsed: {key: parsed}."""
    t = {}
    for k, (kind, where, _) in WORKS.items():
        t[k] = ane.wikisource(where, pins, DL) if kind == "ws" else ane.gutenberg(where, pins, DL)
    t["ant"], t["war"] = josephus(t["ant"]), josephus(t["war"])
    t["hdt"] = numbered(t.pop("hdt1")) | numbered(t.pop("hdt2"))
    t["macc"] = maccabees()
    return t


def span(spec):
    """"1.2-4" -> (1, [2, 3, 4]); "1.2" -> (1, [2])."""
    head, _, last = spec.rpartition(".")
    a, _, b = last.partition("-")
    return head, list(range(int(a), int(b or a) + 1))


def quote(q, texts, pins):
    """A quote (see MARKS) as (the reference shown, credit, [paragraphs]); a paragraph may start with its section
    number in brackets."""
    if q.startswith("m:"):
        work, first, last, shown = MARKS[q[2:]]
        return shown, WORKS[work][2], between(texts[work], first, last)
    kind, where = q.split(" ", 1)
    if kind in ("ant", "war"):
        name = {"ant": "Antiquities", "war": "War"}[kind]
        parts = [int(x) for x in where.split("-")[0].split(".")]
        if len(parts) == 2:     # (A whole chapter)
            title, secs = texts[kind][tuple(parts)]
            return f"{name} {where}", WORKS[kind][2], [f"[{where}.{s}] {t}" for s, t in sorted(secs.items())]
        head, secs = span(where)
        b, ch = (int(x) for x in head.split("."))
        have = texts[kind][(b, ch)][1]
        missing = [s for s in secs if s not in have]
        if missing:
            raise SystemExit(f"{name} {where}: no section {missing}")
        return f"{name} {where}", WORKS[kind][2], [f"[{head}.{s}] {have[s]}" for s in secs]
    if kind == "hdt":
        b, rest = where.split(".")
        a, _, z = rest.partition("-")
        out = []
        for n in range(int(a), int(z or a) + 1):
            out += [(f"[{b}.{n}] " if i == 0 else "") + re.sub(r"(?<=[a-z,;:.!?\"'”’])\s\d{1,3}(?=[\s,.;:]|$)", "", p)
                    for i, p in enumerate(texts["hdt"][(int(b), n)].split("\n"))]
        return f"Histories {where}", WORKS["hdt1"][2], out
    if kind == "eus":
        head, secs = span(where)
        b, ch = head.split(".")
        title = f"{EUSEBIUS}/Book {'I' * int(b) if int(b) < 4 else 'IV'}/Chapter {ch}"
        have = sections(ane.wikisource(title, pins, DL))
        out = []
        for s in secs:     # (A section whose number the page lost is in the one before)
            out += [(f"[{head}.{s}] " if i == 0 else "") + p for i, p in enumerate(have.get(s, "").split("\n")) if p]
        if not out:
            raise SystemExit(f"Eusebius {where}: no sections")
        return f"Church History {where}", EUS_CREDIT, out
    if kind in ("1ma", "2ma"):
        m = re.match(r"(\d+):(\d+)-(?:(\d+):)?(\d+)$", where) or re.match(r"(\d+):(\d+)()()$", where)
        c1, v1 = int(m.group(1)), int(m.group(2))
        c2, v2 = int(m.group(3) or c1), int(m.group(4) or v1)
        verses = [(c, v, t) for (k, c, v), t in sorted(texts["macc"].items()) if k == kind and (c1, v1) <= (c, v) <= (c2, v2)]
        if not verses:
            raise SystemExit(f"{kind} {where}: no verses")
        book = {"1ma": "1 Maccabees", "2ma": "2 Maccabees"}[kind]
        paras = {}     # (A paragraph a chapter: its first verse's chapter:verse in brackets, the others' numbers inline)
        for c, v, t in verses:
            paras[c] = f"{paras[c]} {v} {t}" if c in paras else f"[{c}:{v}] {t}"
        return f"{book} {where}", MACC_CREDIT, list(paras.values())
    raise SystemExit(f"Unknown quote: {q}")


def blockquote(shown, credit, paras):
    """A quote as HTML: its paragraphs (a leading [1.13.2] bold), the reference and credit under them."""
    e = html.escape
    out = []
    for p in paras:
        m = re.match(r"\[([\d.:]+)\]\s*(.*)$", p, re.S)
        out.append(f"<p><b>{e(m.group(1))}</b> {e(m.group(2))}</p>" if m else f"<p>{e(p)}</p>")
    return f"<blockquote>{''.join(out)}<p><small>{e(shown)} - {e(credit)}</small></p></blockquote>"


def entries(pins):
    """The entries, as finds.write() takes them: ([(id, title, html, line, verses, spans)], {strong: [ids]})."""
    texts = load(pins)
    e = html.escape
    out, lemmas = [], {}

    def add(eid, kind, author, title, what, line, parallels, words):
        body, spans = [f"<p><b>{e(kind)}</b> · {e(what)}</p>"], []
        for passages, why, quotes in parallels:
            h, sp = ane.parallel(title, passages)
            spans += sp
            body += [h, f"<p>{e(why)}</p>"]
            body += [blockquote(*quote(q, texts, pins)) for q in quotes]
        verses = len(tyndale_dict.verses_in(spans))
        out.append((eid, f"{author}: {title}", "".join(body), f"{kind} · {line}"[:200], verses, spans))
        for s in words:
            lemmas.setdefault(s, []).append(eid)

    for key, (title, passages) in ANT.items():
        b, ch = (int(x) for x in key.split("."))
        heading = texts["ant"][(b, ch)][0]
        add(f"Josephus_Ant_{key}", JEWISH, "Josephus", title,
            f"Josephus' Jewish Antiquities (AD 93-94), book {b}, chapter {ch}: his retelling of the Bible's history, with what he adds to it.",
            f"Antiquities {key} · {heading}", [(passages, f"Whiston's heading: {heading}", [f"ant {key}"])], ANT_WORDS.get(key, []))
    for eid, kind, author, title, line, parallels, words in HISTORY:
        add(eid, kind, author, title, line, line, parallels, words)
    out.sort(key=lambda a: a[1].lower())
    return out, lemmas


def build(main_db):
    """Builds historians.db and its note_sources row (replaced). Returns (entries, verses linked, Strong's keys)."""
    DL.mkdir(parents=True, exist_ok=True)
    finds.last_verses(main_db)
    pins = json.loads(PINS.read_text()) if PINS.exists() else {}
    out, lemmas = entries(pins)
    PINS.write_text(json.dumps(pins, indent=1, ensure_ascii=False) + "\n")
    data = finds.write(OUT, out, lemmas, SOURCE)
    finds.register(main_db, SOURCE, "data/notes/historians.db", data)
    linked = len(tyndale_dict.verses_in([sp for a in out for sp in a[5]]))
    print(f"historians: {len(out)} entries, {linked} verses linked, {len(lemmas)} Strong's keys, {len(data) / 1e6:.2f} MB")
    return len(out), linked, len(lemmas)


if __name__ == "__main__":
    con = sqlite3.connect(HERE.parent / "public" / "data" / "cotext.db")
    with con:
        build(con)
    con.close()
