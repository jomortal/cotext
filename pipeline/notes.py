"""The notes panel's sources: free commentaries, text-critical apparatuses, English translations and the ancient
versions, each its own database file, synced to the verse being read (src/notes.ts).

Each source is fetched once into pipeline/downloads/notes/<id>/ (pinned: a release tag or commit in the URL, and the
file's SHA-256 checked) and built into public/data/notes/<id>.db, read by the app only once the reader picks it - so
the main database stays small and only the sources used are ever downloaded.

Commentaries:
  tn       unfoldingWord Translation Notes (en_tn at commit bf60334, 2026-11-02; CC BY-SA 4.0): TSV per book, each note keyed to a verse and the
           original-language words it's about (shown above the note). Book and chapter introductions are left out.
  tosn     Tyndale Open Study Notes (release 1.25, 2022; CC BY-SA 4.0): StudyNotes.xml, a note per verse or range.
  kd       Keil & Delitzsch, Biblical Commentary on the Old Testament (1864-; public domain): CrossWire's SWORD module
           KD 2.0 (zCom4, KJV versification; text from Wikisource). A comment on a range of verses is stored once.
  vincent  Vincent's Word Studies in the New Testament (1887-1900; public domain): the MySword module (vws, 1.2.1,
           made from theWord's), which states no licence of its own - the work itself is public domain.
  rwp      Robertson's Word Pictures in the New Testament (1930-33): CrossWire's SWORD module RWP 2.0 (zCom, OSIS;
           from www.bf.org). Volumes 1-4 public domain; 5-6 (John, Hebrews, the General Epistles, Revelation) (c)
           Broadman Press, renewed 1960, used by permission - the module's licence: "Copyrighted; Free non-commercial
           distribution".
  lightfoot  John Lightfoot, A Commentary on the New Testament from the Talmud and Hebraica (Horae Hebraicae et
           Talmudicae, 1658-74; public domain), the Gospels: CrossWire's SWORD module Lightfoot 1.0
           (zCom, ThML; from philologos.org).
  jbl_col  J. B. Lightfoot, St Paul's Epistles to the Colossians and to Philemon (1875; public domain): Project
           Gutenberg's HTML (eBook 50857, pinned in notes_pins.json) - its notes on the verses, the paraphrase too;
           the introductions and dissertations, the Greek text and its readings left out.
  rashi, ibnezra, ramban  Rashi (public domain / CC BY), Ibn Ezra (CC BY-NC) and Ramban (CC BY) in English, from
           Sefaria: notes_sefaria.py.
Apparatus:
  stepbible  STEPBible's TAGNT and TAHOT (CC BY 4.0; already in downloads/ for the text): NT - TAGNT's variant notes,
           its words not in every edition (NA28, NA27, Tyndale House, SBL, Westcott-Hort, Tregelles, TR, Byzantine) and
           its meaning variants; OT - TAHOT's Qere / Ketiv and other readings (Aleppo, BHS, Cairensis...), its words
           restored or added from the LXX.
  sblgnt   The SBLGNT apparatus (Holmes 2010; LogosBible/SBLGNT, CC BY 4.0): each variation unit as printed, the
           SBLGNT's reading and its editions ] the other reading and its editions.
  hottp, dss, sinaiticus, igntp, bezae  The UBS's HOTTP report (CC BY-SA 4.0), the biblical Dead Sea Scrolls (CC
           BY-NC 4.0), Codex Sinaiticus (CC BY-NC-SA 3.0), the IGNTP's manuscripts of John and Paul (CC BY 4.0) and
           Codex Bezae (CC BY-NC-SA 3.0): notes_mss.py.
  mam, minchatshai  Miqra according to the Masorah (CC BY-SA; its differences from the text marked) and Minchat
           Shai (public domain), from Sefaria: notes_sefaria.py.
  tcent    The Text-Critical English New Testament (Robert Adam Boyd 2022, eBible.org's USFM; CC BY 4.0): its
           footnotes, verbatim (the licence lets it keep its name only unchanged), on the verse each names.
Translations (eBible.org's USFM, pinned by hash; a "note" per verse, its text): web World English Bible, bsb Berean
  Standard Bible, kjv King James Version (1769), asv American Standard Version (1901), ylt Young's Literal
  Translation, darby Darby - all public domain -, lsv Literal Standard Version (Covenant Press, CC BY-SA 4.0), net
  NET Bible (Biblical Studies Press: quoted for non-commercial use without its notes, each verse followed by "(NET)"
  linked to netbible.org, as its terms ask), emtv English Majority Text Version (NT) and wyc Wycliffe in modern
  spelling (CC BY-NC-ND 4.0: verbatim), brenton Brenton's Septuagint (public domain; lxx_rows maps its verses).
  Footnotes, headings and Strong's tags left out (usfm_rows). From Sefaria (notes_sefaria.py): njps the NJPS Tanakh,
  ct The Contemporary Torah, koren The Koren Jerusalem Bible (CC BY-NC).
Ancient versions (kind 'version'): onkelos Targum Onkelos, tpj Targum Pseudo-Jonathan, tj Targum Jonathan on the
  Prophets - Aramaic with an English translation under it where there is one (notes_sefaria.py; public domain).

Syntax (kind 'syntax'): diagram_ot, diagram_nt Sentence diagram - MACULA Hebrew's and Greek's syntax trees (CC BY
  4.0), a note per sentence, its body the sentence's tree as JSON, drawn by the app: diagram.py (its docstring gives
  the tree). A file per testament, each named alike in the picker.

Left out: the IGNTP's transcriptions under CC BY-NC-SA (64 of John's and Paul's; only CC BY ones kept); Minchat
  Shai's Ruth, Esther, Ecclesiastes, Song of Songs and Lamentations (not on Sefaria).
Not found clean and open (2026-11-03): Alford's Greek Testament, the Expositor's Greek Testament, Meyer, Bengel's
  Gnomon, Westcott (John, Hebrews, the Epistles of John), J. B. Lightfoot's Galatians and Philippians - scans with raw
  OCR, or copies whose terms forbid republishing (CCEL's Westcott Hebrews) or give none.

Versification: every verse is stored as its source numbers it. The text is NRSV-numbered (build_db.py); KD follows the
KJV's, the others English Bibles' (Psalm titles verse 0 where a source keeps them apart: en_tn's "front") - the same
nearly everywhere, a verse or two off in the few places English Bibles divide differently. The translations are
mapped to the text's numbers where they differ (ELSEWHERE; Psalm titles in usfm_rows). The Hebrew-numbered sources
(Sefaria's, HOTTP, the Dead Sea Scrolls) are mapped by TAHOT's own Hebrew numbers (hebrew_verses), the Hebrew number
shown above a note where it differs; Brenton's Septuagint by matching its verses' words (lxx_rows).

Tables, in each source's file:
  notes   book (1-66, build_db's ids), start, end (chapter * 1000 + verse: the first and last verse it covers - a range
          note covers several, a cross-chapter one too), ord (its order among notes starting at the same verse),
          quote (the original-language words a note is about, en_tn's; else ''), body (HTML: <p> - <p dir="rtl"> for
          a Hebrew or Aramaic paragraph -, <b>, <i>, <br>, <small> (a footnote), <table>/<tr>/<td>, <span class=he|grc>
          round Hebrew / Greek, <a href> (only the NET's link); nothing else - a 'syntax' source's body is
          JSON instead: diagram.py's tree)
In the main database (cotext.db):
  note_sources  id, kind ('commentary' / 'apparatus' / 'translation' / 'version' / 'syntax'), name (as the picker shows it), testaments ('OT', 'NT' or
          'OT NT'), credit (the line under the notes), file (data/notes/<id>.db), version (the file's hash: its URL
          and cache change with it), bytes
"""
import csv
import hashlib
import html
import html.parser
import io
import json
import pathlib
import re
import sqlite3
import struct
import time
import urllib.request
import zipfile
import zlib

HERE = pathlib.Path(__file__).parent
DL = HERE / "downloads" / "notes"
OUT = HERE.parent / "public" / "data" / "notes"

# (source id, file name, URL, SHA-256) - each pinned: a tag or commit in the URL, and the bytes checked.
FILES = [
    # (A commit, not release v91: v91 leaves out Numbers, 1-2 Chronicles, Ecclesiastes, Isaiah, Jeremiah and Ezekiel.)
    ("tn", "en_tn-bf60334.zip",
     "https://git.door43.org/unfoldingWord/en_tn/archive/bf603342902491abadf1ab6e61a3b5777b2a3382.zip",
     "e67746ce579ce97d0a9750ba3320b52368a76ddbfe5940e1d24da7df1cf38eb1"),
    ("tosn", "tyndale_open-studynotes.zip",
     "https://tyndaleopenresources.com/wp-content/themes/tyndale-openresources/files/tyndale_open-studynotes.zip",
     "7b4d5ae088449d5a6925170c4b89b978acee2f78f73dc6b8a278fa948a7e8498"),
    ("kd", "KD.zip", "https://www.crosswire.org/ftpmirror/pub/sword/packages/rawzip/KD.zip",
     "ca3bdb6a04c0b717ee2faed71b432d58195db96f217f490ce6f7d9c36a2876f7"),
    # SWORD's own KJV versification (chapters per book, verses per chapter): where each verse sits in KD's index.
    ("kd", "canon.h", "https://www.crosswire.org/svn/sword/!svn/bc/3918/trunk/include/canon.h", None),
    ("rwp", "RWP.zip", "https://www.crosswire.org/ftpmirror/pub/sword/packages/rawzip/RWP.zip",
     "f036fbb0155840da5d18444130acea493538ca375d1ff1d163627d5010691cb5"),
    ("lightfoot", "Lightfoot.zip", "https://www.crosswire.org/ftpmirror/pub/sword/packages/rawzip/Lightfoot.zip",
     "bd33d7ca67cc4a829125e16282a6cd9898d41d13ec40f1e362692abbaa5f7d97"),
    ("jbl_col", "pg50857-h.zip", "https://www.gutenberg.org/cache/epub/50857/pg50857-h.zip", "pin"),
    ("vincent", "vws.cmt.mybible.gz", "https://mysword-bible.info/download/getfile.php?file=vws.cmt.mybible.gz",
     "e7a880d292a51baf78c671be91cab73cea423506c1a75453e301e0bab58ac4eb"),
]
SBLGNT_COMMIT = "d7f35adca9ec410e1d1499c63b4dd989d76c8d4d"   # LogosBible/SBLGNT, 2026-10-25
SBLGNT_BOOKS = ["Matt", "Mark", "Luke", "John", "Acts", "Rom", "1Cor", "2Cor", "Gal", "Eph", "Phil", "Col", "1Thess",
                "2Thess", "1Tim", "2Tim", "Titus", "Phlm", "Heb", "Jas", "1Pet", "2Pet", "1John", "2John", "3John",
                "Jude", "Rev"]
# The translations: eBible.org's USFM downloads (its URLs aren't versioned - the bytes pinned by hash, from 2026-11-02;
# eBible regenerates its files now and then, and a new copy is checked by hand before its hash is changed here).
TRANSLATIONS = {"web": "eng-web", "bsb": "engbsb", "kjv": "eng-kjv", "asv": "eng-asv", "ylt": "engylt",
                "darby": "engDBY", "lsv": "englsv", "net": "engnet", "brenton": "eng-Brenton", "emtv": "engemtv",
                "wyc": "engwyc2017", "tcent": "engtcent"}
for _id, _sha in [("web", "05b0440bd8994dd4da7cc53dd8167a759ed7c09617e4a562c64eb9b3343589c8"),
                  ("bsb", "75ca91d5a5c69ca4cbdeabdb03ea1a458db20cf3966abe15d86df086acf7fbc4"),
                  ("kjv", "206085ace5494f7eb46975990c0734fd8354e5ecce4d12cc74ce6f1aa8efd129"),
                  ("asv", "00b7b6c76cb1eb67b22ca51bd5ac13c2df526c13e1c38e78b862a7a2367f7071"),
                  ("ylt", "c526b4e362fef13916a14765a7e331267f6a1227db58549fc61d3288a930a12b"),
                  ("darby", "ebdd506c5cb8c2dccb3e94f834e012123e538ef294556a981f323bd855ab332e"),
                  ("lsv", "b5fd551d49086785430ca4d670e2914b53c63fd65cb84717b7b200466305861f"),
                  # (2026-11-03)
                  ("net", "f6541e3790f9fc47ec77cb6cb574e85a0555db1c19ed1e7f588724a0eae606c1"),
                  ("brenton", "9b1a4e09381885c658c1cc70ea56a64c125c85d8697a4f03cb6ad66a1bcd985c"),
                  ("emtv", "6780f45154968eb3b51ead874dc6bad5f2e6a57b31c32041ff7c2ca32919b343"),
                  ("wyc", "107912062138c2f17acc3866667602576ebe450ade78f9ec7a7605439b7ef55b"),
                  ("tcent", "37d08ca5078734dcfeef943e81d31c29a5ccf02e27e98e0d2877dfa33ef192b9")]:
    FILES.append((_id, TRANSLATIONS[_id] + "_usfm.zip",
                  f"https://ebible.org/Scriptures/{TRANSLATIONS[_id]}_usfm.zip", _sha))
for _b in SBLGNT_BOOKS:
    FILES.append(("sblgnt", _b + ".txt",
                  f"https://raw.githubusercontent.com/LogosBible/SBLGNT/{SBLGNT_COMMIT}/data/sblgntapp/text/{_b}.txt", None))

# (id, kind, name, testaments, credit) - the picker's order.
SOURCES = [
    ("tn", "commentary", "Translation Notes (unfoldingWord)", "OT NT",
     "unfoldingWord Translation Notes, CC BY-SA 4.0 - the original work by unfoldingWord is available from "
     "unfoldingword.org/utn. Adapted: reformatted, introductions left out."),
    ("tosn", "commentary", "Tyndale Open Study Notes", "OT NT",
     "Adapted from Tyndale Open Study Notes, (c) 2022 Tyndale House Publishers, CC BY-SA 4.0. The original work is "
     "available for free at tyndaleopenresources.com."),
    ("kd", "commentary", "Keil & Delitzsch (1864)", "OT",
     "Keil & Delitzsch, Biblical Commentary on the Old Testament: public domain (CrossWire's SWORD module, from Wikisource)."),
    ("vincent", "commentary", "Vincent's Word Studies (1887)", "NT",
     "Marvin R. Vincent, Word Studies in the New Testament: public domain (the MySword module)."),
    ("rwp", "commentary", "Robertson's Word Pictures (1930)", "NT",
     "A. T. Robertson, Word Pictures in the New Testament (1930-33): volumes 1-4 public domain; volumes 5-6 (John, "
     "Hebrews, the General Epistles, Revelation) (c) 1932, 1933, renewed 1960 Broadman Press, used by permission - "
     "free non-commercial distribution (CrossWire's SWORD module RWP 2.0, from www.bf.org)."),
    ("lightfoot", "commentary", "John Lightfoot, Talmud and Hebraica (1658)", "NT",
     "John Lightfoot, A Commentary on the New Testament from the Talmud and Hebraica (1658-74), on the Gospels: "
     "public domain (CrossWire's SWORD module Lightfoot 1.0, from philologos.org)."),
    ("jbl_col", "commentary", "J. B. Lightfoot, Colossians and Philemon (1875)", "NT",
     "J. B. Lightfoot, St Paul's Epistles to the Colossians and to Philemon (Macmillan, 1875): public domain "
     "(Project Gutenberg's transcription, eBook 50857; its notes only, the Greek text and readings left out)."),
    ("rashi", "commentary", "Rashi", "OT",
     "Rashi (Sefaria): on the Torah, M. Rosenbaum and A. M. Silbermann's translation (1929-34), public domain; on "
     "the Prophets and Writings, The Judaica Press Complete Tanach with Rashi, tr. A. J. Rosenberg, or Metsudah "
     "Publications' where it lacks a book, CC BY. Hebrew-numbered (the Hebrew's number shown where it differs)."),
    ("ibnezra", "commentary", "Ibn Ezra on the Torah", "OT",
     "Ibn Ezra's Commentary on the Pentateuch, tr. and annotated by H. Norman Strickman and Arthur M. Silver "
     "(Menorah, 1988-2004); Sefaria, CC BY-NC - non-commercial use."),
    ("ramban", "commentary", "Ramban on the Torah", "OT",
     "Ramban (Nachmanides), Commentary on the Torah, tr. and annotated by Charles B. Chavel (Shilo, 1971-76); "
     "Sefaria, CC BY."),
    ("stepbible", "apparatus", "Editions and variants (STEPBible)", "OT NT",
     "STEPBible Data (TAGNT, TAHOT), Tyndale House, Cambridge, CC BY 4.0."),
    ("sblgnt", "apparatus", "SBLGNT apparatus", "NT",
     "SBLGNT apparatus, Michael W. Holmes, ed. (Society of Biblical Literature and Logos Bible Software, 2010), CC BY 4.0."),
    ("hottp", "apparatus", "HOTTP (UBS text project)", "OT",
     "Preliminary and Interim Report on the Hebrew Old Testament Text Project, (c) United Bible Societies "
     "1973-1980, 2003-2023, CC BY-SA 4.0 (github.com/ubsicap/ubs-open-license). Adapted: its English only, "
     "reformatted. Ratings: A the reading quite certain, B some doubt, C considerable doubt, D a high degree of "
     "doubt. Factors: what weighed in the decision (its introduction numbers them)."),
    ("mam", "apparatus", "Miqra according to the Masorah", "OT",
     "Words in bold are where this edition, following the Aleppo Codex, differs from the text shown (the "
     "Leningrad Codex) - in letters or vowels, accents aside. Miqra according to the Masorah (ed. Avi Kadish; "
     "Sefaria), CC BY-SA."),
    ("minchatshai", "apparatus", "Minchat Shai (Masoretic notes)", "OT",
     "Yedidiah Norzi, Minchat Shai (1742): public domain (Sefaria). In Hebrew."),
    ("dss", "apparatus", "Dead Sea Scrolls", "OT",
     "The biblical Dead Sea Scrolls: Martin Abegg's transcriptions in ETCBC's dss (CACCHT: Jacobs, Naaijer, "
     "Roorda), CC BY-NC 4.0 - non-commercial use. [ ] restored by modern editors; Hebrew-numbered, mapped to this "
     "text's verses."),
    ("tcent", "apparatus", "Text-Critical English NT footnotes", "NT",
     "Text-Critical English New Testament, (c) 2022 Robert Adam Boyd, CC BY 4.0 (eBible.org): its footnotes, "
     "verbatim. ¦ the other readings, with the editions that have them (NA Nestle-Aland, SBL, TH Tyndale House, WH "
     "Westcott-Hort, CT all four; TR Textus Receptus, RP Robinson-Pierpont, HF Hodges-Farstad, PCK Pickering, ANT "
     "Antoniades; MSS manuscripts) and the share of manuscripts with each."),
    ("sinaiticus", "apparatus", "Codex Sinaiticus", "NT",
     "Codex Sinaiticus: the Codex Sinaiticus Project's transcription (codexsinaiticus.org, v1.04, 2014), "
     "CC BY-NC-SA 3.0 - non-commercial use. Adapted: the first hand's text, the correctors' readings in brackets; "
     "[ ] supplied where the leaf is damaged."),
    ("igntp", "apparatus", "Manuscripts (IGNTP)", "NT",
     "International Greek New Testament Project transcriptions (iohannes.com, epistulae.org; Codex Bezae for "
     "Cambridge University Library), CC BY 4.0. Adapted: each manuscript's text of the verse, manuscripts reading "
     "alike together; John, Galatians, Ephesians, Philippians, and Codex Bezae's Gospels and Acts."),
    ("bezae", "apparatus", "Codex Bezae", "NT",
     "Codex Bezae, the Greek pages: the IGNTP's transcription for Cambridge University Library (v1.03, 2016), "
     "CC BY-NC-SA 3.0 - non-commercial use. Adapted: the first hand's text, the correctors' readings in brackets; "
     "[ ] supplied. The Gospels and Acts."),
    ("web", "translation", "World English Bible", "OT NT", "World English Bible: public domain (eBible.org)."),
    ("bsb", "translation", "Berean Standard Bible", "OT NT", "Berean Standard Bible: public domain (eBible.org)."),
    ("kjv", "translation", "King James Version (1769)", "OT NT", "King James Version: public domain (eBible.org)."),
    ("asv", "translation", "American Standard Version (1901)", "OT NT",
     "American Standard Version: public domain (eBible.org)."),
    ("ylt", "translation", "Young's Literal Translation", "OT NT", "Young's Literal Translation: public domain (eBible.org)."),
    ("darby", "translation", "Darby Translation", "OT NT", "J. N. Darby's translation: public domain (eBible.org)."),
    ("lsv", "translation", "Literal Standard Version", "OT NT",
     "Literal Standard Version, (c) 2020 Covenant Press, CC BY-SA 4.0 (lsvbible.com; eBible.org's copy). Changed: "
     "footnotes and headings left out, line breaks kept."),
    ("net", "translation", "NET Bible", "OT NT",
     "Scripture quoted by permission. Quotations designated (NET) are from the NET Bible® copyright ©1996, 2019 by "
     "Biblical Studies Press, L.L.C. http://netbible.com All rights reserved. Quoted for non-commercial use, "
     "without its notes (eBible.org's copy)."),
    ("njps", "translation", "Tanakh (NJPS, 1985)", "OT",
     "Tanakh: The Holy Scriptures (NJPS), (c) 1985 The Jewish Publication Society; Sefaria, CC BY-NC - "
     "non-commercial use. Hebrew-numbered (the Hebrew's number shown where it differs)."),
    ("ct", "translation", "The Contemporary Torah (2006)", "OT",
     "The Contemporary Torah, (c) 2006 The Jewish Publication Society; Sefaria, CC BY-NC - non-commercial use."),
    ("koren", "translation", "The Koren Jerusalem Bible", "OT",
     "The Koren Jerusalem Bible, (c) Koren Publishers Jerusalem; Sefaria, CC BY-NC - non-commercial use. "
     "Hebrew-numbered (the Hebrew's number shown where it differs)."),
    ("brenton", "translation", "Brenton's Septuagint (1851)", "OT",
     "Sir Lancelot C. L. Brenton, The Septuagint Version of the Old Testament in English: public domain "
     "(eBible.org). The Septuagint's verses on this text's where they correspond (matched by their words); its own "
     "number shown where it differs, and verses it lacks left out."),
    ("emtv", "translation", "English Majority Text Version", "NT",
     "English Majority Text Version, (c) 2014 Dr. Paul W. Esposito, CC BY-NC-ND 4.0 - non-commercial use, "
     "verbatim (eBible.org); footnotes and headings not shown."),
    ("wyc", "translation", "Wycliffe (modern spelling)", "OT NT",
     "Wycliffe's Bible with Modern Spelling, (c) 2001-2015 Terry Noble, CC BY-NC-ND 4.0 - non-commercial use, "
     "verbatim (eBible.org); footnotes and headings not shown."),
    ("onkelos", "version", "Targum Onkelos", "OT",
     "Targum Onkelos (Sefaria): public domain. English (part of Genesis): J. W. Etheridge, The Targums of Onkelos "
     "and Jonathan ben Uzziel on the Pentateuch (1862), public domain."),
    ("tpj", "version", "Targum Pseudo-Jonathan", "OT",
     "Targum Pseudo-Jonathan on the Torah (Sefaria's Targum Jonathan): public domain. English: J. W. Etheridge, "
     "The Targums of Onkelos and Jonathan ben Uzziel on the Pentateuch (1862), public domain."),
    ("tj", "version", "Targum Jonathan (Prophets)", "OT",
     "Targum Jonathan on the Prophets (Mikraot Gedolot; Sefaria): public domain. English (Isaiah): The Chaldee "
     "Paraphrase on the Prophet Isaiah (C. W. H. Pauli, London, 1871), public domain."),
    ("diagram_ot", "syntax", "Sentence diagram", "OT",
     "MACULA Hebrew Linguistic Datasets, (c) 2022-2024 Biblica, Inc., CC BY 4.0 (github.com/Clear-Bible/macula-hebrew): "
     "its syntax trees (from the Westminster Hebrew Syntax, (c) 1991-2018 the J. Alan Groves Center, CC BY 4.0; Open "
     "Scriptures Hebrew Bible morphology and Cherith glosses, CC BY 4.0). Adapted: drawn as clauses and phrases; the "
     "words and glosses this text's where they match."),
    ("diagram_nt", "syntax", "Sentence diagram", "NT",
     "MACULA Greek Linguistic Datasets, (c) 2022-2024 Biblica, Inc., CC BY 4.0 (github.com/Clear-Bible/macula-greek): "
     "its syntax trees of the Nestle 1904 text. Adapted: drawn as clauses and phrases; the words and glosses this "
     "text's where they match, Nestle's own where they differ."),
]

USFM = ["GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT", "1SA", "2SA", "1KI", "2KI", "1CH", "2CH", "EZR", "NEH",
        "EST", "JOB", "PSA", "PRO", "ECC", "SNG", "ISA", "JER", "LAM", "EZK", "DAN", "HOS", "JOL", "AMO", "OBA", "JON",
        "MIC", "NAM", "HAB", "ZEP", "HAG", "ZEC", "MAL", "MAT", "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL",
        "EPH", "PHP", "COL", "1TH", "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAS", "1PE", "2PE", "1JN", "2JN", "3JN",
        "JUD", "REV"]   # (Book ids 1-66 in order: build_db's BOOKS)
TOSN_BOOKS = ["Gen", "Exod", "Lev", "Num", "Deut", "Josh", "Judg", "Ruth", "ISam", "IISam", "IKgs", "IIKgs", "IChr",
              "IIChr", "Ezra", "Neh", "Esth", "Job", "Ps", "Pr", "Eccl", "Song", "Isa", "Jer", "Lam", "Ezek", "Dan",
              "Hos", "Joel", "Amos", "Obad", "Jon", "Mic", "Nah", "Hab", "Zeph", "Hagg", "Zech", "Mal", "Matt",
              "Mark", "Luke", "John", "Acts", "Rom", "ICor", "IICor", "Gal", "Eph", "Phil", "Col", "IThes", "IIThes",
              "ITim", "IITim", "Titus", "Phlm", "Heb", "Jas", "IPet", "IIPet", "IJn", "IIJn", "IIIJn", "Jude", "Rev"]


def ref(c, v):
    return int(c) * 1000 + int(v)


# ---- Hebrew verse numbers: the Hebrew-numbered sources mapped to the text's ----

HEB_VERSES = {}     # (book, Hebrew chapter, verse) -> [the text's (chapter, verse)...], where they differ (hebrew_verses)


def hebrew_verses(book_id):
    """TAHOT gives a word's verse both ways where the Hebrew Bible numbers it otherwise (Psa.3.1(3.2): the text's
    3:1 is the Hebrew's 3:2; a Psalm title, the Hebrew's verse 1, the text's verse 0): HEB_VERSES filled with every
    Hebrew verse numbered otherwise - the text's verses its words are in, in order."""
    import fetch
    pairs = {}
    for i in range(1, 5):
        with open(fetch.DOWNLOADS / f"TAHOT{i}.txt", encoding="utf-8-sig") as f:
            for line in f:
                m = re.match(r"^(\w+)\.(\d+)\.(\d+)(?:\((\d+)\.(\d+)\))?#", line)
                if m and m.group(1) in book_id:
                    mine = (int(m.group(2)), int(m.group(3)))
                    heb = (int(m.group(4)), int(m.group(5))) if m.group(4) else mine
                    at = pairs.setdefault((book_id[m.group(1)], *heb), [])
                    if mine not in at:
                        at.append(mine)
    HEB_VERSES.clear()
    HEB_VERSES.update({k: v for k, v in pairs.items() if v != [k[1:]]})


def hebrew_target(b, c, v):
    """The text's verses a Hebrew-numbered verse is: [(chapter, verse)...]."""
    return HEB_VERSES.get((b, c, v), [(c, v)])


def hebrew_rows(b, c, v, k, body, quote=""):
    """A note on a Hebrew-numbered verse as rows on the text's verses (a run of them a range), its Hebrew number
    above it where the text's differs."""
    at = hebrew_target(b, c, v)
    label = "" if at == [(c, v)] else f"<p><small>({c}:{v} in the Hebrew)</small></p>"
    runs = [[at[0]]]
    for t in at[1:]:
        if t[0] == runs[-1][-1][0] and t[1] == runs[-1][-1][1] + 1:
            runs[-1].append(t)
        else:
            runs.append([t])
    return [(b, ref(*r[0]), ref(*r[-1]), k, quote, label + body) for r in runs]


# ---- Fetching ----

PINS = HERE / "notes_pins.json"     # "<source>/<file>" -> SHA-256: the files pinned "pin" (download)


def download(src, name, url, sha=None):
    """One file of a source's, fetched once into downloads/notes/<src>/<name>: its bytes. sha: its SHA-256 - checked;
    None: pinned by a commit in its URL; "pin": pinned in notes_pins.json - the first fetch records it, a later
    one must match (Sefaria's API, whose URLs aren't versioned)."""
    out = DL / src / name
    if out.exists():
        return out.read_bytes()
    out.parent.mkdir(parents=True, exist_ok=True)
    print("downloading", src, name)
    req = urllib.request.Request(url, headers={"User-Agent": "COTEXT-pipeline/0.1 (Bible study app build)"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=600) as r:
                data = r.read()
            break
        except OSError:
            if attempt == 3:
                raise
            time.sleep(5 * (attempt + 1))
    got = hashlib.sha256(data).hexdigest()
    if sha == "pin":
        pins = json.loads(PINS.read_text()) if PINS.exists() else {}
        key = f"{src}/{name}"
        if key in pins and pins[key] != got:
            raise SystemExit(f"{key}: not the pinned file (SHA-256 differs) - check the source, then update notes_pins.json")
        pins[key] = got
        PINS.write_text(json.dumps(pins, indent=0, sort_keys=True, ensure_ascii=False) + "\n")
    elif sha and got != sha:
        raise SystemExit(f"{name}: not the pinned file (SHA-256 differs) - check the source, then update notes.py")
    out.write_bytes(data)
    return data


def fetch():
    for src, name, url, sha in FILES:
        download(src, name, url, sha)


# ---- HTML: every source's markup reduced to the same few tags ----

HEB = r"[֑-״יִ-ﭏ]"
GRK = r"[Ͱ-Ͽἀ-῿]"
SCRIPT = re.compile(rf"({HEB}+(?:[\s־,]+{HEB}+)*)|({GRK}[Ͱ-Ͽἀ-῿̀-ͯ]*"
                    rf"(?:[\s,.·]+{GRK}[Ͱ-Ͽἀ-῿̀-ͯ]*)*)")


def script(text):
    """Escaped text with its Hebrew and Greek runs (several words together) in <span class=he|grc>: their fonts."""
    out, at = [], 0
    for m in SCRIPT.finditer(text):
        out.append(html.escape(text[at:m.start()], quote=False))
        out.append(f'<span class="{"he" if m.group(1) else "grc"}">{html.escape(m.group(0), quote=False)}</span>')
        at = m.end()
    out.append(html.escape(text[at:], quote=False))
    return "".join(out)


class Clean(html.parser.HTMLParser):
    """Markup to COTEXT's few tags. rule(tag, attrs) says what a tag becomes: 'b', 'i', 'small', 'table', 'tr', 'td',
    'p' (a paragraph break), 'br', 'h' (a heading: its own bold paragraph), 'drop' (left out, with its text) or None
    (the tag dropped, its text kept)."""

    def __init__(self, rule):
        super().__init__(convert_charrefs=True)
        self.rule, self.out, self.stack, self.dropping = rule, [], [], 0

    def handle_starttag(self, tag, attrs):
        r = self.rule(tag, dict(attrs))
        self.stack.append((tag, r))
        if self.dropping or r == "drop":
            self.dropping += r == "drop"
        elif r in ("p", "h"):
            self.out.append("\n\n" + ("<b>" if r == "h" else ""))
        elif r == "br":
            self.out.append("<br>")
        elif r:
            self.out.append(f"<{r}>")
        if tag in ("br", "img"):     # (Void tags: nothing to close)
            self.stack.pop()

    def handle_startendtag(self, tag, attrs):
        r = self.rule(tag, dict(attrs))
        if not self.dropping and r in ("p", "br"):
            self.out.append("\n\n" if r == "p" else "<br>")

    def handle_endtag(self, tag):
        if tag not in (t for t, _ in self.stack):
            return     # (A stray end tag)
        while self.stack:
            t, r = self.stack.pop()
            if r == "drop":
                self.dropping -= 1
            elif not self.dropping:
                if r == "h":
                    self.out.append("</b>\n\n")
                elif r == "p":
                    self.out.append("\n\n")
                elif r and r != "br":
                    self.out.append(f"</{r}>")
            if t == tag:
                break

    def handle_data(self, data):
        if not self.dropping:
            self.out.append(script(data))

    def result(self):
        self.close()
        return paragraphs("".join(self.out))


def paragraphs(s):
    """Text with \\n\\n between paragraphs -> <p>...</p> each, empty ones dropped."""
    s = s.replace("\xa0", " ")
    ps = [re.sub(r"\s+", " ", p).strip() for p in s.split("\n\n")]
    return "".join(f"<p>{p}</p>" for p in ps if re.sub(r"<[^>]*>", "", p).strip())


def clean(s, rule):
    c = Clean(rule)
    c.feed(s)
    return c.result()


# ---- Commentaries ----

def markdown(s):
    """en_tn's Markdown (its \\n written out): paragraphs, # headings and * lists, **bold**, *italic*, [links] as
    their text."""
    s = s.replace("\\n", "\n")
    out = []
    for block in re.split(r"\n\s*\n", s):
        lines = []
        for line in block.split("\n"):
            line = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", line)
            head = re.match(r"^#+\s*(.*)", line)
            item = re.match(r"^\s*[*-]\s+(.*)", line)
            t = script(head.group(1) if head else item.group(1) if item else line)
            t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
            t = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<i>\1</i>", t)
            lines.append(f"<b>{t}</b>" if head else ("• " + t) if item else t)
        out.append("<br>".join(x for x in lines if x.strip()))
    return "".join(f"<p>{p}</p>" for p in out if p.strip())


def tn_rows():
    """en_tn: (book, start, end, ord, quote, body) per verse note; '1:1-4' ranges kept, Psalms' 'front' verse 0."""
    with zipfile.ZipFile(DL / "tn" / "en_tn-bf60334.zip") as z:
        for b, code in enumerate(USFM, 1):
            name = next((n for n in z.namelist() if n.endswith(f"/tn_{code}.tsv")), None)
            if not name:
                continue
            rows = csv.reader(io.StringIO(z.read(name).decode("utf-8-sig")), delimiter="\t", quoting=csv.QUOTE_NONE)
            for k, r in enumerate(rows):
                if len(r) < 7 or k == 0:
                    continue
                m = re.match(r"^(\d+):(front|\d+)(?:-(\d+))?$", r[0])
                if not m:
                    continue     # (Book and chapter introductions)
                c, v1 = int(m.group(1)), 0 if m.group(2) == "front" else int(m.group(2))
                quote = script(r[4].replace("⁠", "").replace(" & ", " … ")) if r[4] else ""
                yield b, ref(c, v1), ref(c, int(m.group(3) or v1)), k, quote, markdown(r[6])


def tosn_rows():
    """Tyndale's StudyNotes.xml: each <item> a note on <refs> (Gen.1.1, Gen.1.3-5, Gen.1.1-2.3). The verse label
    (sn-ref) is left out: the panel gives its own; quoted Bible words (sn-excerpt) bold."""
    def rule(tag, a):
        cls = a.get("class", "")
        if tag == "p":
            return "p"
        if tag == "span":
            if cls.startswith("sn-ref"):
                return "drop"
            if cls.startswith("sn-excerpt") or cls.startswith("bold"):
                return "b"
            if cls.startswith("ital") or cls in ("hebrew", "greek", "aramaic", "latin"):
                return "i"
            if cls == "sup":
                return "small"
        return None
    with zipfile.ZipFile(DL / "tosn" / "tyndale_open-studynotes.zip") as z:
        name = next(n for n in z.namelist() if n.endswith("/StudyNotes.xml"))
        xml = z.read(name).decode("utf-8")
    for k, m in enumerate(re.finditer(r'<item name="[^"]*" typename="StudyNote"[^>]*>\s*<refs>([^<]*)</refs>\s*'
                                      r'<body>(.*?)</body>', xml, re.S)):
        r = re.match(r"^(\w+)\.(\d+)\.(\d+)(?:-(?:(\d+)\.)?(\d+))?$", m.group(1).strip())
        if not r or r.group(1) not in TOSN_BOOKS:
            continue
        c, v = int(r.group(2)), int(r.group(3))
        c2, v2 = (int(r.group(4) or c), int(r.group(5))) if r.group(5) else (c, v)
        yield TOSN_BOOKS.index(r.group(1)) + 1, ref(c, v), ref(c2, v2), k, "", clean(m.group(2), rule)


def kjv_versification():
    """SWORD's KJV versification from canon.h: [(book id 1-66, [verses in chapter 1, 2...])], OT then NT."""
    src = (DL / "kd" / "canon.h").read_text(encoding="utf-8", errors="replace")
    chapters = [int(n) for n in re.findall(r'\{"[^"]*", "[^"]*", "[^"]*", (\d+)\}', src)]
    chapters = [n for n in chapters if n]     # (Each list ends with an empty entry)
    vm = [int(n) for n in re.findall(r"\d+", re.sub(r"//[^\n]*", "", re.search(r"int vm\[\] = \{(.*?)\};", src, re.S).group(1)))]
    out, at = [], 0
    for b, n in enumerate(chapters, 1):
        out.append((b, vm[at:at + n]))
        at += n
    assert len(out) == 66 and at == len(vm) == 1189, "canon.h: not the KJV versification expected"
    return out


def sword_rows(zip_path, base, testament, rule, encoding="utf-8"):
    """A CrossWire SWORD commentary module's verses, one testament ('ot' / 'nt'): (book, start, end, 0, '', body)
    each. Its index (<testament>.?zv: zCom4's 12 bytes a verse slot - block / offset / size -, zCom's 10, its size two
    bytes) holds every slot in the KJV's order (the testament's two headings, then per book its heading, per chapter
    its heading and its verses); <testament>.?zs gives each zlib block's place in .?zz. Only verse slots are read (book
    and chapter introductions left out). Verses sharing one comment point at the same bytes: stored once, as a range.
    A comment's own leading reference ("Gen 1:2-5") is dropped: the panel shows the range. rule: Clean's, for the
    module's markup; <note> becomes "(...)" small."""
    with zipfile.ZipFile(zip_path) as z:
        names = {n.rsplit(".", 1)[1][-1]: n for n in z.namelist() if n.startswith(base + testament + ".")}
        bzs, bzv, bzz = (z.read(names[x]) for x in "svz")
    blocks = [struct.unpack_from("<III", bzs, i) for i in range(0, len(bzs), 12)]
    size = 12 if "/zcom4/" in base else 10
    fmt = "<IIH" if size == 10 else "<III"
    cache = {}

    def text(key):
        blk, off, n = key
        if blk not in cache:
            cache.clear()
            o, cs, _ = blocks[blk]
            cache[blk] = zlib.decompress(bzz[o:o + cs])
        return cache[blk][off:off + n].decode(encoding)

    books = kjv_versification()
    books = books[:39] if testament == "ot" else books[39:]
    slots = []
    i = 2
    for b, verses in books:
        i += 1                                                    # (The book's heading)
        for c, n in enumerate(verses, 1):
            i += 1                                                # (The chapter's heading)
            for v in range(1, n + 1):
                slots.append((b, ref(c, v), struct.unpack_from(fmt, bzv, i * size)))
                i += 1
    assert i * size == len(bzv), f"{zip_path.name}: its index isn't the KJV versification"
    k = 0
    while k < len(slots):
        b, start, key = slots[k]
        end = k
        while end + 1 < len(slots) and slots[end + 1][2] == key and slots[end + 1][0] == b:
            end += 1
        if key[2]:
            raw = re.sub(r"^\s*<reference[^>]*>[^<]*</reference>", "", text(key))
            body = clean(raw.replace("<note", " <note").replace("</note>", "</note> "), rule)
            body = body.replace("<small>", "<small>(").replace("</small>", ")</small>")
            if body:
                yield b, start, slots[end][1], 0, "", body
        k = end + 1


def kd_rows():
    """KD's zCom4 module (OSIS; OT only)."""
    def rule(tag, a):
        t = a.get("type", "")
        if tag == "hi":
            return "b" if t == "bold" else "i"
        if tag == "title":
            return "h"
        if tag in ("div", "l", "item", "lg") and (t == "x-p" or tag != "div"):
            return "p"
        if tag == "note":
            return "small"
        if tag in ("table", "row", "cell"):
            return {"table": "table", "row": "tr", "cell": "td"}[tag]
        if tag in ("chapter", "milestone"):
            return "drop"
        return None
    return sword_rows(DL / "kd" / "KD.zip", "modules/comments/zcom4/kd/", "ot", rule)


def rwp_rows():
    """Robertson's Word Pictures, CrossWire's RWP 2.0 (zCom, OSIS; NT): each comment's catchwords (the words it's
    about) bold, its paragraphs (milestone divs) as paragraphs; its Greek unaccented, as the module has it."""
    def rule(tag, a):
        t = a.get("type", "")
        if tag == "catchword":     # (HTMLParser lowercases tag names)
            return "b"
        if tag == "hi":
            return "b" if t == "bold" else "i"
        if tag == "title":
            return "h"
        if tag == "div" and t == "paragraph" or tag in ("l", "lg", "item"):
            return "p"
        if tag == "note":
            return "small"
        if tag in ("chapter", "milestone"):
            return "drop"
        return None
    return sword_rows(DL / "rwp" / "RWP.zip", "modules/comments/zcom/rwp/", "nt", rule)


def lightfoot_rows():
    """John Lightfoot's Horae Hebraicae, CrossWire's Lightfoot 1.0 (zCom, ThML in Windows-1252; the Gospels -
    Lightfoot's Acts, Romans and 1 Corinthians aren't in it). The philologos.org editor's own "please see" boxes (<blockquote>, links to
    other books) and its decorative images are left out."""
    def rule(tag, a):
        if tag in ("p", "div"):
            return "p"
        if tag in ("i", "em"):
            return "i"
        if tag in ("b", "strong"):
            return "b"
        if tag == "br":
            return "br"
        if tag in ("table", "tr"):
            return tag
        if tag in ("td", "th"):
            return "td"
        if tag == "blockquote":
            return "drop"
        return None     # (Images too: nothing to keep)
    return sword_rows(DL / "lightfoot" / "Lightfoot.zip", "modules/comments/zcom/lightfoot/", "nt", rule, "cp1252")


def vincent_rows():
    """Vincent's MySword module: book 40-66, chapter, fromverse - toverse, data (HTML; its Greek in spans)."""
    import gzip
    data = gzip.decompress((DL / "vincent" / "vws.cmt.mybible.gz").read_bytes())
    tmp = OUT / "vincent.src.tmp"
    tmp.write_bytes(data)
    try:
        src = sqlite3.connect(f"file:{tmp}?mode=ro", uri=True)
        rows = src.execute("SELECT id, book, chapter, fromverse, toverse, data FROM commentary ORDER BY id").fetchall()
        src.close()
    finally:
        tmp.unlink()

    def rule(tag, a):
        return {"p": "p", "b": "b", "i": "i", "br": "br"}.get(tag)
    for k, b, c, v1, v2, body in rows:
        if 40 <= b <= 66:
            yield b, ref(c, v1), ref(c, max(v1, v2 or v1)), k, "", clean(body, rule)


def jbl_col_rows():
    """Lightfoot's Colossians and Philemon from Project Gutenberg's HTML: the commentary after each epistle's Greek
    heading (ΠΡΟΣ ΚΟΛΑΣΣΑΕΙΣ, to the detached note on its readings; ΠΡΟΣ ΦΙΛΗΜΟΝΑ, to the Additions). Its notes
    (<p class=c033 / c034 / c036>) follow the Greek text they're on; one starting with a verse number ("9.", "1, 2.",
    "21–23.", "15 sq.") begins that verse's note (a range's first verse to its last), the lemma notes after it ("τὴν
    ἐπίγνωσιν] ...") belong to it too. The chapter: the latest of the Greek text's verse anchors (id="II_1") seen for
    that verse number - a note on i. 29 can follow text reaching into ii. Running heads, page numbers, the Greek
    text, its readings and the page links (← →) are left out."""
    with zipfile.ZipFile(DL / "jbl_col" / "pg50857-h.zip") as z:
        page = z.read(next(n for n in z.namelist() if n.endswith(".html"))).decode("utf-8")
    roman = {"I": 1, "II": 2, "III": 3, "IV": 4}

    def rule(tag, a):
        if tag in ("em", "cite"):
            return "i"
        if tag == "span" and a.get("class") == "pageno" or tag == "a" and a.get("href", "").startswith("#Page_"):
            return "drop"
        if tag == "sup":
            return "small"
        return None
    for book, head, stop in ((51, "ΠΡΟΣ ΚΟΛΑΣΣΑΕΙΣ.</h2>", "On some Various Readings"),
                             (57, "ΠΡΟΣ ΦΙΛΗΜΟΝΑ.</h2>", "ADDITIONS AND CORRECTIONS")):
        at = page.index(head)
        part = page[at:page.index(stop, at)]
        seen, notes, cur = {}, [], None      # (seen: verse -> its chapter, as the anchors so far say)
        for m in re.finditer(r'<a id="([IV]+)_(\d+)"></a>|<p class="(c03[346])">(.*?)</p>', part, re.S):
            if m.group(1):
                seen[int(m.group(2))] = roman[m.group(1)]
                continue
            body = clean(m.group(4), rule)
            text = re.sub(r"<[^>]*>", "", body)
            n = re.match(r"^<p>(\d+)(?:\s*(?:,|–|-)\s*(\d+))?(?:\.|\s+sq\.)\s*", body)
            if n:
                v1 = int(n.group(1))
                v2 = int(n.group(2) or v1)
                c = 1 if book == 57 else seen.get(v1, max(seen.values(), default=1))
                cur = [ref(c, v1), ref(c, v2), []]
                notes.append(cur)
            if cur and text.strip():
                cur[2].append(body)
        for k, (start, end, body) in enumerate(notes):
            yield book, start, end, k, "", "".join(body)


# ---- Apparatus ----

TAGNT_EDITIONS = ["NA28", "NA27", "Tyn", "SBL", "WH", "Treg", "TR", "Byz"]
EDITION_NAMES = {"NA28": "NA28", "NA27": "NA27", "Tyn": "Tyndale House", "SBL": "SBL", "WH": "Westcott-Hort",
                 "Treg": "Tregelles", "TR": "TR", "Byz": "Byzantine"}
HEB_SOURCES = {"L": "Leningrad", "Q": "Qere (read)", "K": "Ketiv (written)", "R": "restored", "X": "from the LXX",
               "A": "Aleppo", "B": "BHS", "C": "Cairensis", "D": "Dead Sea Scrolls", "E": "emendation",
               "F": "formatting", "H": "Ben Chaim", "P": "punctuation", "S": "scribal tradition",
               "V": "some manuscripts"}
REF = re.compile(r"^(\w+)\.(\d+)\.(\d+)[^#]*#(\d+)=(\S+)")


def editions(s):
    return ", ".join(EDITION_NAMES.get(e.strip(), e.strip()) for e in s.split("+") if e.strip())


def tagnt_rows(book_id):
    """TAGNT, per verse: its variant notes (in English), then each run of words not in every edition (with the
    editions that have them), then the meaning variants of its words - the other reading and its editions."""
    import fetch
    verses = {}
    for i in (1, 2):
        with open(fetch.DOWNLOADS / f"TAGNT{i}.txt", encoding="utf-8-sig") as f:
            for line in f:
                c = line.rstrip("\n").split("\t")
                m = REF.match(c[0])
                if m and len(c) > 5:
                    b, ch, v = book_id[m.group(1)], int(m.group(2)), int(m.group(3))
                    verses.setdefault((b, ch, v), []).append(c)
    for (b, ch, v), rows in verses.items():
        notes, runs, means = [], [], []
        for c in rows:
            greek = re.sub(r"\s*\(.*\)$", "", c[1].strip())
            gloss = c[2].strip()
            eds = c[5].strip()
            have = {e.strip() for e in eds.split("+")}
            if len(c) > 13 and c[13].strip():
                note = re.sub(r"^[v^]\s*", "", c[13].strip())
                notes.append(clean(note, lambda t, a: "i" if t == "i" else None))
            if not set(TAGNT_EDITIONS) <= have:
                if runs and runs[-1][0] == eds:
                    runs[-1][1].append((greek, gloss))
                else:
                    runs.append((eds, [(greek, gloss)]))
            if c[6].strip():
                for alt in c[6].split(";"):
                    am = re.match(r"^\s*(\S+)\s*\(([^)]*)\)\s*(.*?)\s*-\s*\S+\s+in:\s*(.*)$", alt)
                    if am:
                        means.append(f"{script(greek)} “{html.escape(gloss)}”: {script(am.group(1))} "
                                     f"“{html.escape(am.group(3))}” in {html.escape(editions(am.group(4)))}")
        parts = [f"<p>{n[3:-4] if n.startswith('<p>') else n}</p>" for n in notes]
        for eds, ws in runs:
            words = " ".join(w for w, _ in ws)
            gl = " ".join(g for _, g in ws)
            parts.append(f"<p><b>{script(words)}</b> “{html.escape(gl)}” - only in {html.escape(editions(eds))}</p>")
        parts += [f"<p>{m}</p>" for m in means]
        if parts:
            yield b, ref(ch, v), ref(ch, v), 0, "", "".join(parts)


def tahot_rows(book_id):
    """TAHOT, per verse: each word with a variant - its type's sources spelled out (Qere over Ketiv; Aleppo, BHS...),
    the other readings (its meaning and spelling variants: the Hebrew, with the English where given) - and the words
    restored (R) or added from the LXX (X)."""
    import fetch
    out = {}
    for i in range(1, 5):
        with open(fetch.DOWNLOADS / f"TAHOT{i}.txt", encoding="utf-8-sig") as f:
            for line in f:
                c = line.rstrip("\n").split("\t")
                m = REF.match(c[0])
                if not m or len(c) < 8 or not c[1]:
                    continue
                kind = m.group(5)
                if "(" not in kind and kind[0] not in "RX":
                    continue
                word = c[1].replace("/", "").replace("\\", "")
                gloss = re.sub(r"\s+", " ", c[3].replace("/", " ").replace("<", "").replace(">", "")).strip()
                lines = []
                if kind[0] in "RX":
                    lines.append("restored from a parallel passage" if kind[0] == "R" else
                                 "added from the Greek (LXX), as in the apparatus of BHS / BHK")
                if "(" in kind:
                    main, var = kind.split("(", 1)
                    var = var.rstrip(")")
                    follows = ", ".join(HEB_SOURCES.get(x, x) for x in main if x.isalpha())
                    lines.append(f"this text: {html.escape(follows)}")
                    seen = set()
                    for col, minor in ((c[6], False), (c[7], True)):
                        for alt in col.split(";"):
                            am = re.match(r"^\s*([A-Za-z]+)=\s*(.*)$", alt.replace("¦", ""))
                            if not am or not am.group(2).strip():
                                continue
                            heb = re.search(r"\(([^)]*[֐-׿][^)]*)\)", am.group(2))
                            heb = heb.group(1) if heb else am.group(2).split("(")[0]
                            heb = heb.replace("/", "").replace("\\", "").strip()
                            en = re.search(r'"([^"]*)"', am.group(2))
                            who = ", ".join(HEB_SOURCES.get(x.upper(), x) for x in am.group(1))
                            if (who, heb) in seen:
                                continue
                            seen.add((who, heb))
                            lines.append(f"{html.escape(who)}: {script(heb)}"
                                         + (f" “{html.escape(en.group(1).replace('/', ''))}”" if en else "")
                                         + (" (spelling only)" if minor and not en else ""))
                b, ch, v = book_id[m.group(1)], int(m.group(2)), int(m.group(3))
                out.setdefault((b, ch, v), []).append(f"<p><b>{script(word)}</b> “{html.escape(gloss)}” - "
                                                      + "; ".join(lines) + "</p>")
    for (b, ch, v), parts in out.items():
        yield b, ref(ch, v), ref(ch, v), 0, "", "".join(parts)


def sblgnt_rows():
    """The SBLGNT apparatus files: 'John 1:18' heads a verse, then its units - '18 μονογενὴς θεὸς WH Treg NA28 ]
    ὁ μονογενὴς υἱός RP', more after '•' - each a paragraph: the SBLGNT's reading bold, its editions, ] and the rest."""
    for b, name in enumerate(SBLGNT_BOOKS, 40):
        text = (DL / "sblgnt" / (name + ".txt")).read_text(encoding="utf-8-sig")
        for m in re.finditer(r"^\S+(?: \S+)?? (\d+):(\d+)\n(.*?)(?=\n\S+(?: \S+)?? \d+:\d+\n|\Z)", text, re.S | re.M):
            ch, v, body = int(m.group(1)), int(m.group(2)), m.group(3)
            units = [u.strip() for u in re.split(r"\n?\s*•\s*|\n", body) if u.strip()]
            parts = []
            for u in units:
                u = re.sub(r"^(\d+:)?\d+\s+", "", u)
                lemma, _, rest = u.partition("]")
                parts.append(f"<p><b>{script(lemma.strip())}</b> ] {script(rest.strip())}</p>")
            if parts:
                yield b, ref(ch, v), ref(ch, v), 0, "", "".join(parts)


# ---- Translations ----

USFM_SKIP = re.compile(r"^\\(id|ide|h|toc\d|mt\d?|ms\d?|mr|s\d?|sr|r|sp|cl|cp|qa|is\d?|ip|ipr|ili\d?|ib|imt\d?|io\d?|iot|ie|rem|sts)\b")
LINE = re.compile(r"^\\(q\d?|qc|qr|qm\d?|li\d?|pi\d?|p|m|mi|nb|pc|pmo|b)\b\s*")


def usfm_rows(src_id, text_v0, after=""):
    """One translation's USFM books -> a row per verse, its text: footnotes, cross-references, headings and word tags
    left out; a poetry line or paragraph inside a verse a <br>; words supplied by the translators (\\add: the KJV's
    italics) and \\it in italics, \\bd bold. A Psalm title (\\d) is verse 0, as the text numbers it; where the
    translation runs its title into verse 1 (Young's, the LSV), that verse is shown on verse 0 too (text_v0: the
    text's (book, chapter) with a verse 0). A combined verse (\\v 15-16) is a range. after: HTML put after each
    verse's text (the NET's "(NET)", linked as its terms ask)."""
    out = {}
    with zipfile.ZipFile(DL / src_id / (TRANSLATIONS[src_id] + "_usfm.zip")) as z:
        for name in z.namelist():
            if not name.endswith(".usfm"):
                continue
            s = z.read(name).decode("utf-8-sig")
            m = re.match(r"\\id (\w+)", s)
            if not m or m.group(1) not in USFM:
                continue     # (Front matter, the Apocrypha)
            b = USFM.index(m.group(1)) + 1
            s = re.sub(r"\\(f|fe|x)\s.*?\\\1\*", "", s, flags=re.S)
            s = re.sub(r"\\\+?w\s+([^|\\]*?)(?:\|[^\\]*)?\\\+?w\*", r"\1", s)
            c, v, cur, brk = 0, None, None, False
            for line in s.split("\n"):
                line = line.strip()
                if not line or USFM_SKIP.match(line):
                    continue
                if (cm := re.match(r"^\\c\s+(\d+)", line)):
                    c, v, cur = int(cm.group(1)), None, None
                    continue
                brk = brk or bool(LINE.match(line))
                line = LINE.sub("", line)
                if (dm := re.match(r"^\\d\b\s*", line)):
                    if v is not None:
                        continue     # (Not a title: a heading inside a psalm - Psalm 119's ALEPH, BETH...)
                    v, cur, brk = (0, 0), out.setdefault((b, c, 0, 0), []), False
                    line = line[dm.end():]
                for part in re.split(r"(\\v\s+\d+(?:-\d+)?\s*)", line):
                    if (vm := re.match(r"\\v\s+(\d+)(?:-(\d+))?", part)):
                        v1 = int(vm.group(1))
                        v, cur = (v1, int(vm.group(2) or v1)), out.setdefault((b, c, v1, int(vm.group(2) or v1)), [])
                        brk = False
                    elif cur is not None and part.strip():
                        if brk and cur:
                            cur.append("<br>")
                        brk = False
                        cur.append(usfm_text(part))
    rows = []
    for (b, c, v1, v2), parts in out.items():
        body = re.sub(r"\s+", " ", " ".join(parts)).replace(" <br> ", "<br>").strip()
        body = re.sub(r"^(<br>)+|(<br>)+$", "", body)
        if body:
            start = 0 if v1 == 1 and (b, c) in text_v0 and (b, c, 0, 0) not in out else v1
            rows.append((b, ref(c, start), ref(c, v2), 0, "", f"<p>{body}{after}</p>"))
    have = {(r[0], r[1]): r for r in rows if r[1] == r[2]}
    for (b, c, v), (c2, v2) in ELSEWHERE.items():
        if (b, ref(c, v)) not in have and (r := have.get((b, ref(c2, v2)))):
            rows.append((b, ref(c, v), ref(c, v), 0, "", f"<p><small>({c2}:{v2} in this translation)</small></p>" + r[5]))
    return rows


# The text's verses an English translation numbers otherwise: (book, chapter, verse) -> its (chapter, verse) there,
# shown under the text's number with that number above it. 3 John 1:15 is the end of the KJV's 1:14, Revelation 12:18
# the start of its 13:1 (the verse shown whole); the WEB keeps Romans 16:25-27 at 14:24-26. The rest of the text's
# verses are numbered alike in all seven (Malachi 4, Joel 2:28-3:21 as English Bibles have them); Psalm titles are
# verse 0 (above), the WEB's, BSB's, KJV's, ASV's and Darby's \\d, Young's and the LSV's verse 1 (shown on both).
ELSEWHERE = {(64, 1, 15): (1, 14), (66, 12, 18): (13, 1),
             (45, 16, 25): (14, 24), (45, 16, 26): (14, 25), (45, 16, 27): (14, 26)}


def usfm_text(s):
    """A verse's USFM text -> HTML: \\add / \\it italic, \\bd bold, other character marks dropped (their text kept);
    the LSV's || (a poetry line) a <br>; the KJV's ¶ (a paragraph mark) left out."""
    s = html.escape(s.replace("¶", ""), quote=False)
    s = re.sub(r"\\\+?(add|it)\s(.*?)\\\+?\1\*", r"<i>\2</i>", s)
    s = re.sub(r"\\\+?bd\s(.*?)\\\+?bd\*", r"<b>\1</b>", s)
    s = re.sub(r"\\\+?[a-z]+\d?\*", "", s)          # (A closing mark: the space after it is the text's)
    s = re.sub(r"\\\+?[a-z]+\d?\s?", "", s)
    return s.replace(" || ", "<br>").replace("||", "<br>")


STOP = set("the and of to in that for with unto upon his her him them they their thee thou thy shall will was were "
           "is be are not all from which this you your have has had but who when then said out into there by as".split())


def words(body):
    """A verse's content words, for matching one translation's verses with another's (lxx_rows)."""
    plain = re.sub(r"<[^>]*>", " ", body).lower()
    return {w for w in re.findall(r"[a-z]+", plain) if len(w) > 2 and w not in STOP}


def lxx_rows(text_v0):
    """Brenton's Septuagint on the text's (Hebrew-based, English-numbered) verses. The LXX numbers and orders much
    of the Old Testament otherwise (the Psalms one off, Jeremiah 25-51 in another order, Exodus 35-40, 3 Kingdoms,
    Proverbs 24-31, Esther's and Daniel's additions), so each verse of the text is matched to Brenton's by its words:
    the KJV's verse (the text's numbers) against each of Brenton's in the same book, rare words weighing most -
    Brenton's own number first when it matches about as well. A verse with no match good enough (a weighted
    overlap of 0.3; the LXX lacks it, or words it otherwise) is left out. Brenton's number shown where it differs."""
    import math
    lxx = usfm_rows("brenton", set())
    kjv = [r for r in usfm_rows("kjv", text_v0) if r[1] == r[2] and "in this translation)" not in r[5]]
    out = []
    for b in range(1, 40):
        theirs = [(r, words(r[5])) for r in lxx if r[0] == b]
        ours = [(r, words(r[5])) for r in kjv if r[0] == b]
        if not theirs:
            continue
        docs = len(theirs) + len(ours)
        df = {}
        for _, ws in theirs + ours:
            for w in ws:
                df[w] = df.get(w, 0) + 1
        idf = {w: math.log(docs / n) for w, n in df.items()}
        index = {}
        for i, (_, ws) in enumerate(theirs):
            for w in ws:
                index.setdefault(w, []).append(i)
        weight = [sum(idf[w] for w in ws) for _, ws in theirs]
        at = {r[1]: i for i, (r, _) in enumerate(theirs)}
        for r, ws in ours:
            shared = {}
            for w in ws:
                for i in index.get(w, ()):
                    shared[i] = shared.get(i, 0) + idf[w]
            mine = sum(idf[w] for w in ws)
            score = {i: 2 * x / (mine + weight[i]) for i, x in shared.items() if mine + weight[i]}
            if not score:
                continue
            best = max(score, key=score.get)
            same = at.get(r[1])
            if same is not None and score.get(same, 0) >= score[best] - 0.05:
                best = same
            if score[best] < 0.3:
                continue
            t = theirs[best][0]
            c2, v2 = divmod(t[1], 1000)
            label = "" if t[1] == r[1] else f"<p><small>({c2}:{v2} in this translation)</small></p>"
            out.append((b, r[1], r[1], 0, "", label + t[5]))
    return out


def tcent_rows():
    """The Text-Critical English NT's footnotes (USFM \\f ... \\f*), each on the verse its \\fr gives, verbatim: the
    English words it's about (\\fq) bold, then its note - the other readings and the editions with them."""
    rows = []
    with zipfile.ZipFile(DL / "tcent" / "engtcent_usfm.zip") as z:
        for name in z.namelist():
            s = z.read(name).decode("utf-8-sig")
            m = re.match(r"\\id (\w+)", s)
            if not m or m.group(1) not in USFM:
                continue
            b = USFM.index(m.group(1)) + 1
            for k, f in enumerate(re.finditer(r"\\f\s+\S+\s+(.*?)\\f\*", s, re.S)):
                inner = f.group(1)
                fr = re.match(r"\\fr\s+(\d+)[:.](\d+)\s*", inner)
                if not fr:
                    continue
                parts = []
                for mark, text in re.findall(r"\\(f[a-z]+)\*?\s*([^\\]*)", inner[fr.end():]):
                    text = usfm_text(text).strip()
                    if text:
                        parts.append(f"<b>{text}</b>" if mark in ("fq", "fqa") else text)
                body = " ".join(parts)
                if body:
                    rows.append((b, ref(fr.group(1), fr.group(2)), ref(fr.group(1), fr.group(2)), k, "", f"<p>{body}</p>"))
    return rows


# ---- Building ----

def write(src_id, rows):
    """One source's file: its notes table, ordered for the panel's lookup by book and first verse."""
    path = OUT / f"{src_id}.db"
    tmp = path.with_suffix(".tmp")
    tmp.unlink(missing_ok=True)
    db = sqlite3.connect(tmp)
    db.executescript("""
        PRAGMA page_size = 4096;
        CREATE TABLE notes (book INTEGER, start INTEGER, end INTEGER, ord INTEGER, quote TEXT, body TEXT);
    """)
    rows = sorted(rows, key=lambda r: (r[0], r[1], r[3]))
    db.executemany("INSERT INTO notes VALUES (?,?,?,?,?,?)", rows)
    db.execute("CREATE INDEX notes_at ON notes (book, start)")
    db.commit()
    db.execute("VACUUM")
    db.close()
    tmp.replace(path)
    return path, len(rows)


def build(main_db, book_codes, only=None):
    """Builds every source's file and lists them in the main database's note_sources (made afresh). book_codes: the
    text's book codes in id order (Gen, Exo... - the STEPBible files' own). only: the ids to build (the others'
    files kept as they are, if built before); None - all."""
    fetch()
    OUT.mkdir(parents=True, exist_ok=True)
    import notes_mss
    import notes_sefaria
    notes_mss.fetch()
    book_id = {code: i + 1 for i, code in enumerate(book_codes)}
    hebrew_verses(book_id)
    makers = {
        "tn": tn_rows, "tosn": tosn_rows, "kd": kd_rows, "vincent": vincent_rows,
        "rwp": rwp_rows, "lightfoot": lightfoot_rows, "jbl_col": jbl_col_rows,
        "stepbible": lambda: [*tagnt_rows(book_id), *tahot_rows(book_id)], "sblgnt": sblgnt_rows,
    }
    text_v0 = set(main_db.execute("SELECT DISTINCT book, chapter FROM words WHERE verse = 0"))
    for t in TRANSLATIONS:
        makers[t] = lambda t=t: usfm_rows(t, text_v0)
    makers["net"] = lambda: usfm_rows("net", text_v0, ' <a href="http://netbible.org">(NET)</a>')
    makers["brenton"] = lambda: lxx_rows(text_v0)
    makers["tcent"] = tcent_rows
    for sid in notes_sefaria.SOURCES:
        makers[sid] = lambda sid=sid: notes_sefaria.rows(sid, main_db)
    import diagram
    makers["diagram_ot"] = lambda: diagram.rows(main_db, set(range(1, 40)))
    makers["diagram_nt"] = lambda: diagram.rows(main_db, set(range(40, 67)))
    makers.update({"hottp": notes_mss.hottp_rows, "dss": notes_mss.dss_rows, "sinaiticus": notes_mss.sinaiticus_rows,
                   "igntp": notes_mss.igntp_rows, "bezae": notes_mss.bezae_rows})
    counts, listed = {}, []
    for sid, kind, name, testaments, credit in SOURCES:
        if only and sid not in only and (OUT / f"{sid}.db").exists():
            path, n = OUT / f"{sid}.db", None     # (Kept as built before)
        else:
            print("building", sid)
            path, n = write(sid, makers[sid]())
        data = path.read_bytes()
        listed.append((sid, kind, name, testaments, credit, f"data/notes/{sid}.db",
                       hashlib.sha256(data).hexdigest()[:12], len(data)))
        counts[sid] = (n, len(data))
    # (The list written last, in one go: the main database is written to only once every file is built. Rows another
    # module added that aren't in SOURCES - lxx.py's brenton_lxx - are kept, so a notes-only rebuild doesn't drop them.)
    ours = {row[0] for row in listed}
    try:
        listed += [tuple (r) for r in main_db.execute ("SELECT * FROM note_sources") if r[0] not in ours]
    except sqlite3.OperationalError:
        pass     # (No table yet: a fresh build)
    main_db.execute("DROP TABLE IF EXISTS note_sources")
    main_db.execute("CREATE TABLE note_sources (id TEXT PRIMARY KEY, kind TEXT, name TEXT, testaments TEXT, credit TEXT,"
                    " file TEXT, version TEXT, bytes INTEGER)")
    main_db.executemany("INSERT INTO note_sources VALUES (?,?,?,?,?,?,?,?)", listed)
    return counts


if __name__ == "__main__":
    # python3 pipeline/notes.py [id...]: rebuilds the sources named (all if none) and the note_sources of the
    # database already built (public/data/cotext.db), without rebuilding the rest of it.
    import sys
    sys.path.insert(0, str(HERE))
    import build_db
    import notes     # (This module by its own name: notes_sefaria and notes_mss share its state)
    db = sqlite3.connect(HERE.parent / "public" / "data" / "cotext.db")
    with db:
        counts = notes.build(db, [c for c, _ in build_db.BOOKS], set(sys.argv[1:]) or None)
    db.close()
    for sid, (n, size) in counts.items():
        print(f"{sid}: {'kept' if n is None else f'{n} notes'}, {size / 1e6:.1f} MB")
