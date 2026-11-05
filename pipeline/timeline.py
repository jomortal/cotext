"""The ☰ Timeline (src/timeline.ts) and the word panel's person line: the Bible's people and events on one time line,
in six lanes, each item going to its verses; a word naming a person with dates gets "Hezekiah: king of Judah, c.
726-697 BC" in its panel, with a Timeline button opening the timeline at that person.

Source - Theographic Bible Metadata (Robert Rouse; CC BY-SA 4.0 - its LICENSE file; github.com/robertrouse/
theographic-bible-metadata at COMMIT): json/events.json (450 events, each a start year, a duration, its verses and
participants), json/people.json (each person's name and verses), json/verses.json (each verse's record id, BBCCCVVV
verseID and yearNum). Its dates follow Floyd Nolen Jones's chronology (after Ussher: creation 4004 BC, the Exodus
1491 BC, Hezekiah 726-697 BC; its docs/chronology-and-dates.md) - years in ISO astronomical numbering (-725 = 726 BC),
kept so here; a verse's yearNum is Ussher's (Torrey's margins), used only to place a chapter.

Lanes (LANES, the page's order): 0 patriarchs and judges - the lifetimes, judgeships, deliverances and oppressions, and
the other events before Saul (births and deaths left out: the lifetimes show them); 1 the kings of Israel - Saul,
David and Solomon, then the northern kingdom's (and the united kingdom's other events); 2 the kings of Judah
(JUDAH: the reigns after Solomon in Jerusalem); 3 the prophets - "Prophecies of ..." and Elijah taken up; 4 the
empires - the Atlas' eras (pipeline/atlas_eras.py's ERAS, the same tags), each spanning its chapters' years (below);
5 Jesus and the apostles - the New Testament's events, with Jesus' life (his birth to the crucifixion) as a bar.
Theographic's "United Kingdom", "Northern Kingdom" and "Southern Kingdom" spans are left out (the lanes are them).

An era's span: from the 2nd percentile of the years of the chapters atlas_eras.BOOKS tags it on (each chapter's median
verse year) - the histories only (not the prophets, the Psalms and wisdom, Job or Chronicles' genealogies, whose verse
years don't follow their tag) -, each era running to the next one's start; the Hellenistic era (no Theographic
verses) from Alexander, 332 BC, the last to its chapters' last year; each at least a year long.

A person: an item's participant whose name its title gives (Reign of Hezekiah: Hezekiah) - a reign, judgeship,
deliverance, prophecies or lifetime (that order when one has several: David's reign over his life) and Jesus. Their
words: the Strong's keys (the text's, as extended - H2396G is Hezekiah the king) TIPNR writes the person's name with
that have a word in the person's own Theographic verses; every word of the text (the Septuagint too) with one of those
keys names that person, in a testament the person's verses are in (the Septuagint's Ἰησοῦς is Joshua, not Jesus) -
a key several persons claim (Jeroboam I and II) the one whose verses list the word's verse, else none.

"You are here" (here): each chapter's year - its verses' median yearNum, moved into the span of the item with the
most of its verses (a reign, a prophet's ministry: so the marker sits on it), that item's start when the chapter has
no yearNum - and the items with a verse in it (picked out). A Septuagint book takes its Hebrew counterpart's.

Output: public/data/notes/timeline.db (its note_sources row, kind 'timeline', testaments 'OT NT LXX' - offered in the
notes' picker, BIBLE BACKGROUND, in every book; not in the search):
  lanes  id, name
  items  id, lane, label (as the bar is named), title (in full), start, end (years, ISO astronomical, fractional;
         end = start for a day), book, chapter, verse (where a tap goes: its first verse), person (the word panel's
         line for its person, '' none)
  words  book, chapter, verse, word -> item (the person's)
  here   book, chapter -> year, items (space-separated ids)

Run alone: python3 pipeline/timeline.py (reads and updates public/data/cotext.db's note_sources); build_db.py runs
build() after tyndale_dict (whose TIPNR it reads).
"""
import collections
import hashlib
import json
import pathlib
import re
import sqlite3
import statistics
import sys
import urllib.request

HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE))
import atlas_eras  # noqa: E402
import tyndale_dict  # noqa: E402

DL = HERE / "downloads" / "theographic"
OUT = HERE.parent / "public" / "data" / "notes" / "timeline.db"
COMMIT = "3f461f2f3cf8939f2b79430ae238a36528024ed3"
BASE = f"https://raw.githubusercontent.com/robertrouse/theographic-bible-metadata/{COMMIT}/json/"
FILES = {
    "events.json": "b0a84a4d310b3e81d2fbc43a86a84ee70b888b933c4e9b79c315c0405618e691",
    "people.json": "12dc359f0892d1a706a9d0b597c82d6cb8e7bde2137d729459804b8fd33ce450",
    "verses.json": "b6be3dbcab9f6a6c5fffbfd67dc3092b754d500616d6c36618e5c586d7d97942",
}
SOURCE = ("timeline", "timeline", "Timeline", "OT NT LXX",
          "Dates, events and people: Theographic Bible Metadata, Robert Rouse (CC BY-SA 4.0), after Floyd Nolen "
          "Jones's chronology; names matched through STEPBible's TIPNR (CC BY 4.0). Empires: the Atlas' eras.")
LANES = ["Patriarchs and judges", "Kings of Israel", "Kings of Judah", "Prophets", "Empires", "Jesus and the apostles"]
JUDAH = {"Rehoboam", "Abijam", "Asa", "Jehoshaphat", "Jehoram", "Ahaziah (Jehoahaz)", "Athaliah", "Joash", "Amaziah",
         "Uzziah", "Jotham", "Ahaz", "Hezekiah", "Manasseh", "Amon", "Josiah", "Johoahaz (Shallum)", "Jehoiakim",
         "Jeconiah", "Zedekiah"}     # (Reign of X: the kings of Judah, as Theographic titles them; the other reigns Israel's)
SAUL = -1093.0                       # (The first king's reign starts after this: before it, lane 0)
LEFT_OUT = {"United Kingdom", "Northern Kingdom (Israel)", "Southern Kingdom (Judah)"}
SPELLING = {"Johoahaz": "Jehoahaz", "Jehoahash": "Jehoash", "Sampson": "Samson", "Annuciation": "Annunciation",
            "Transfiguation": "Transfiguration", "Winseskins": "Wineskins", "Saducees": "Sadducees",
            "Zebulon": "Zebulun", "And": "and"}     # (Theographic's titles' typos, put right as shown)
ROLES = [("Reign of ", None), ("Judgeship of ", "judge"), ("Deliverance by ", "judge"), ("Prophecies of ", "prophet"),
         ("Lifetime of ", "")]       # (Title prefix -> the person's role: None a king, by lane; in this order of choice)
NOT_SPANS = {"Job", "Psa", "Pro", "Ecc", "Sng", "1Ch", "Isa", "Jer", "Lam", "Ezk", "Hos", "Jol", "Amo", "Oba", "Jon",
             "Mic", "Nam", "Hab", "Zep", "Hag", "Zec", "Mal"}     # (Books not used for an era's span: see the docstring)
ALEXANDER = -331.0                   # (The Hellenistic era's start: 332 BC)


def download():
    """The three files, once, each checked against its pinned SHA-256."""
    DL.mkdir(parents=True, exist_ok=True)
    for name, sha in FILES.items():
        path = DL / name
        if not path.exists():
            print("downloading", name)
            with urllib.request.urlopen(BASE + name) as r:
                path.write_bytes(r.read())
        if hashlib.sha256(path.read_bytes()).hexdigest() != sha:
            raise SystemExit(f"{path}: not the pinned file (SHA-256 differs)")


def year_of(date):
    """A Theographic startDate ("-725", "0030-04-04", "0030") as a fractional ISO year."""
    m = re.fullmatch(r"(-?\d+)(?:-(\d\d)-(\d\d))?", date.strip())
    y = float(int(m.group(1)))
    if m.group(2):
        y += ((int(m.group(2)) - 1) * 30.4 + int(m.group(3)) - 1) / 365.25
    return y


def years(duration):
    """A duration ("29Y", "3M10D", "7D") in years."""
    per = {"Y": 1, "M": 1 / 12, "W": 7 / 365.25, "D": 1 / 365.25}
    return sum(float(n) * per[u] for n, u in re.findall(r"(\d+(?:\.\d+)?)([YMWD])", duration or ""))


def fix(text):
    return " ".join(SPELLING.get(w, w) for w in text.split(" "))


def bc(y):
    """A year as said: 726 BC, AD 30 (ISO astronomical in)."""
    y = int(y // 1)
    return f"{1 - y} BC" if y <= 0 else f"AD {y}"


def span(a, b):
    """A span as the panel says it: c. 726-697 BC, c. 4 BC-AD 30, c. AD 46-49, c. 1491 BC."""
    a, b = int(a // 1), int(b // 1)
    if a == b:
        return "c. " + bc(a)
    if b <= 0:
        return f"c. {1 - a}-{1 - b} BC"
    if a > 0:
        return f"c. AD {a}-{b}"
    return f"c. {bc(a)}-{bc(b)}"


def build(main_db):
    """Builds timeline.db and its note_sources row. Prints the counts; returns the items' count."""
    download()
    tyndale_dict.download()     # (TIPNR)
    load = lambda n: [r["fields"] | {"_id": r["id"]} for r in json.loads((DL / n).read_text(encoding="utf-8"))]
    events, people, verses = load("events.json"), load("people.json"), load("verses.json")
    verse = {}       # record id -> (book, chapter, verse)
    year_num = {}    # (book, chapter) -> [yearNum of its verses]
    for v in verses:
        vid = v.get("verseID", "")
        if len(vid) != 8:
            continue
        where = (int(vid[:2]), int(vid[2:5]), int(vid[5:]))
        verse[v["_id"]] = where
        if v.get("yearNum") is not None:
            year_num.setdefault(where[:2], []).append(float(v["yearNum"]))
    person = {p["_id"]: p for p in people}
    codes = {code: bid for bid, code in main_db.execute("SELECT id, code FROM books")}

    # ---- The items ----
    items = []       # dicts: lane, label, title, start, end, where, chapters {(b, c): n}, person (record id), role
    for e in sorted(events, key=lambda e: e.get("sortKey", 0)):
        title = fix(e["title"].strip())
        start = year_of(e["startDate"])
        end = start + years(e.get("duration"))
        nt = start > -10
        if title in LEFT_OUT or (not nt and re.fullmatch(r"(Birth|Death) of \S+", title)):
            continue
        name, role = "", None
        for prefix, r in ROLES:
            if title.startswith(prefix):
                name, role = title[len(prefix):], r
                break
        if title.startswith("Reign of "):
            lane = 1 if name not in {fix(j) for j in JUDAH} or start < -975 else 2
            role = "king of Judah" if lane == 2 else "king of Israel"
        elif title.startswith("Prophecies of ") or title == "Elijah Translated":
            lane = 3
        elif nt:
            lane = 5
        else:
            lane = 0 if start < SAUL else 1
        where = sorted(verse[v] for v in e.get("verses", []) if v in verse)
        if not where:
            continue
        chapters = collections.Counter(w[:2] for w in where)
        label = name or title
        who = ""
        if role is not None:
            first = re.sub(r" I+$", "", label.split(" (")[0].split(" and ")[0])     # (Jeroboam II: Jeroboam)
            for pid in e.get("participants", []):
                p = person.get(pid)
                if p and fix(p.get("name", "")) == first:
                    who = pid
                    break
        items.append(dict(lane=lane, label=label, title=title, start=start, end=end, where=where[0],
                          chapters=chapters, person=who, role=role))
    # Jesus' life, his birth to the crucifixion: a bar of its own
    birth = next(i for i in items if i["title"] == "Birth of Jesus")
    death = next(i for i in items if i["title"] == "Crucifixion and Burial")
    jesus = next(p["_id"] for p in people if p.get("name") == "Jesus" and p.get("verseCount", 0) > 500)
    items.append(dict(lane=5, label="Jesus", title="The life of Jesus", start=birth["start"], end=death["start"],
                      where=birth["where"], chapters=collections.Counter(), person=jesus, role=""))

    # ---- The empires: the Atlas' eras over their chapters' years ----
    chapter_year = {k: statistics.median(v) for k, v in year_num.items()}
    starts, lasts, firsts = {}, {}, {}
    for code, ranges in atlas_eras.BOOKS.items():
        bid = codes.get(code)
        for first, last, era in ranges:
            firsts.setdefault(era, (bid, first))
            if firsts[era] > (bid, first):
                firsts[era] = (bid, first)
            if code in NOT_SPANS:
                continue
            ys = sorted(y for (b, c), y in chapter_year.items() if b == bid and first <= c <= last)
            starts.setdefault(era, []).extend(ys)
    for code, ranges in atlas_eras.LXX_ONLY.items():
        for first, last, era in ranges:
            firsts.setdefault(era, (codes[code], first))
    era_start = {}
    for era, *_ in atlas_eras.ERAS:
        ys = sorted(starts.get(era, []))
        era_start[era] = ALEXANDER if era == "hellenistic" else ys[len(ys) // 50] if ys else None
        if ys:
            lasts[era] = ys[-1]
    ids = [e[0] for e in atlas_eras.ERAS]
    for n, era in enumerate(ids[1:], 1):     # (Each at least a year: Babylon's fall, one chapter, pushes Persia on)
        era_start[era] = max(era_start[era], era_start[ids[n - 1]] + 1)
    for n, (era, name, *_) in enumerate(atlas_eras.ERAS):
        start = era_start[era]
        end = era_start[ids[n + 1]] if n + 1 < len(ids) else lasts[era]
        b, c = firsts[era]
        items.append(dict(lane=4, label=re.sub(r"\s*\(.*\)$", "", name), title=re.sub(r"\s*\(.*\)$", "", name),
                          start=start, end=max(end, start), where=(b, c, 1), chapters=collections.Counter(),
                          person="", role=None))
    items.sort(key=lambda i: (i["lane"], i["start"], -i["end"]))

    # ---- The persons and their lines ----
    best = {}        # person -> item index (the most telling item: ROLES' order)
    for n, it in enumerate(items):
        pid = it["person"]
        if not pid:
            continue
        kind = next((k for k, (p, _) in enumerate(ROLES) if it["title"].startswith(p)), len(ROLES))
        if pid not in best or kind < best[pid][0]:
            best[pid] = (kind, n)
    lines = {}
    for pid, (_, n) in best.items():
        it = items[n]
        name = it["label"].split(" (")[0].split(" and ")[0]     # (As the bar names him: Jeroboam II, not Jeroboam)
        role = it["role"] or ""
        lines[n] = f"{name}: {role + ', ' if role else ''}{span(it['start'], it['end'])}"

    # ---- Their words: the keys TIPNR names them with, in their own verses ----
    names = {}
    for strong, (kind, ns) in tyndale_dict.tipnr().items():
        if kind == "person":
            for nm in ns:
                names.setdefault(nm.lower(), set()).add(strong)
    claims = {}      # key -> [(item, the person's verses, the testaments they're in: True the OT)]
    for pid, (_, n) in best.items():
        p = person[pid]
        own = {verse[v] for v in p.get("verses", []) if v in verse}
        wanted = set()
        wanted = names.get(fix(p.get("name", "")).lower(), set())     # (Not its alsoCalled: Jesus' lists Israel)
        if not wanted or not own:
            continue
        hits = collections.Counter()
        for b, c, v in own:
            for (s,) in main_db.execute("SELECT strong FROM words WHERE book = ? AND chapter = ? AND verse = ?", (b, c, v)):
                if s in wanted:
                    hits[s] += 1
        for s in hits:
            claims.setdefault(s, []).append((n, own, {b <= 39 for b, c, v in own}))
    heb = dict(main_db.execute("SELECT id, heb FROM books"))
    word_rows = []
    for s, who in claims.items():
        for b, c, v, w in main_db.execute("SELECT book, chapter, verse, word FROM words WHERE strong = ?", (s,)):
            at = (heb.get(b) or b, c, v)
            ot = at[0] <= 39 or b >= 67
            mine = [n for n, own, tm in who if ot in tm and (len(who) == 1 or at in own)]
            if len(mine) == 1:
                word_rows.append((b, c, v, w, mine[0]))

    # ---- You are here: each chapter's year and items ----
    here = {}
    in_chapter = {}
    for n, it in enumerate(items):
        for bc_, k in it["chapters"].items():
            in_chapter.setdefault(bc_, []).append((k, n))
    for key in set(chapter_year) | set(in_chapter):
        found = sorted(in_chapter.get(key, []), key=lambda kn: (-kn[0], items[kn[1]]["end"] - items[kn[1]]["start"]))
        y = chapter_year.get(key)
        if found:
            it = items[found[0][1]]
            y = it["start"] if y is None else min(max(y, it["start"]), it["end"])
        here[key] = (y, " ".join(str(n) for _, n in sorted(found, key=lambda kn: kn[1])))
    for bid, hb in heb.items():
        if hb:
            for (b, c), row in list(here.items()):
                if b == hb:
                    here[(bid, c)] = row

    OUT.parent.mkdir(parents=True, exist_ok=True)
    tmp = OUT.with_suffix(".tmp")
    tmp.unlink(missing_ok=True)
    db = sqlite3.connect(tmp)
    db.executescript("""
        PRAGMA page_size = 4096;
        CREATE TABLE lanes (id INTEGER PRIMARY KEY, name TEXT);
        CREATE TABLE items (id INTEGER PRIMARY KEY, lane INTEGER, label TEXT, title TEXT, start REAL, "end" REAL,
                            book INTEGER, chapter INTEGER, verse INTEGER, person TEXT);
        CREATE TABLE words (book INTEGER, chapter INTEGER, verse INTEGER, word INTEGER, item INTEGER,
                            PRIMARY KEY (book, chapter, verse, word)) WITHOUT ROWID;
        CREATE TABLE here (book INTEGER, chapter INTEGER, year REAL, items TEXT, PRIMARY KEY (book, chapter)) WITHOUT ROWID;
    """)
    db.executemany("INSERT INTO lanes VALUES (?,?)", list(enumerate(LANES)))
    db.executemany("INSERT INTO items VALUES (?,?,?,?,?,?,?,?,?,?)",
                   [(n, i["lane"], i["label"], i["title"], round(i["start"], 3), round(i["end"], 3), *i["where"],
                     lines.get(n, "")) for n, i in enumerate(items)])
    db.executemany("INSERT OR IGNORE INTO words VALUES (?,?,?,?,?)", word_rows)
    db.executemany("INSERT INTO here VALUES (?,?,?,?)", [(b, c, y, it) for (b, c), (y, it) in sorted(here.items())])
    db.commit()
    db.execute("VACUUM")
    db.close()
    tmp.replace(OUT)
    data = OUT.read_bytes()
    main_db.execute("INSERT OR REPLACE INTO note_sources (id, kind, name, testaments, credit, file, version, bytes)"
                    " VALUES (?,?,?,?,?,?,?,?)",
                    (*SOURCE, "data/notes/timeline.db", hashlib.sha256(data).hexdigest()[:12], len(data)))
    per_lane = collections.Counter(i["lane"] for i in items)
    print(f"timeline: {len(items)} items ({', '.join(f'{LANES[k]} {per_lane[k]}' for k in range(len(LANES)))}); "
          f"{len(lines)} persons, {len(word_rows)} words naming them; {len(here)} chapters placed; "
          f"{len(data) / 1e6:.2f} MB")
    return len(items)


if __name__ == "__main__":
    con = sqlite3.connect(HERE.parent / "public" / "data" / "cotext.db")
    with con:
        build(con)
    con.close()
