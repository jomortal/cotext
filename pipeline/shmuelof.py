"""Abraham Shmuelof's recorded reading of the Hebrew Bible, for reading the OT aloud with a human voice (src/audio.ts'
VOICE: Abraham Shmuelof (recorded)). Run: python3 pipeline/shmuelof.py  (about 1.9 GB downloaded, a few minutes).

Source: ebible.org/multimedia/hbo - the Tanakh read in Israeli Hebrew by Abraham Shmuelof, fluently and slowed by
20% ("slower"), published only as Audio ePubs (EPUB 3 with media overlays: one MP3 per chapter, a SMIL file of
timings per chapter), one per book and version; Creative Commons BY-NC-ND 4.0 (credit, non-commercial, verbatim
copies only). The ePubs are pinned by SHA-256 in shmuelof_pins.json (python3 pipeline/shmuelof.py --pin writes it
from what's downloaded), fetched into pipeline/downloads/shmuelof/ and deleted once extracted.

The audio is copied out verbatim (ND: the MP3 files byte for byte, nothing cut or re-encoded). The timings are the
SMIL's clips: each verse read in two parts - "a" up to the atnach (the verse's main pause), "b" after it - or one
("" - a verse without atnach), each a clip of the chapter's MP3 (clipBegin - clipEnd, seconds). The recordings number
chapters and verses as the Hebrew does; COTEXT as TAHOT's English references do (Mal 3:19 is Mal 4:1, a Psalm's title
verse 0) - each Hebrew verse goes to the English verse of its first word in TAHOT (Psa.3.1(3.2): Hebrew 3:2 is 3:1),
the same numbers where TAHOT gives none. A chapter of COTEXT can so play clips of two MP3s (Joel 2:28-32 is Joel 3).
Where the ePub's markup slips, a verse's third part ("17c") is the next verse, which has no clip of its own
(Judges 1:17c is 1:18): given to it (third_parts; 17 verses). 63 verses more have no clip: the clips run on without a
gap, so they're heard within a neighbor's (lit with it).

Output, public/data/audio/shmuelof/ (gitignored with public/data):
  <version>/<CODE>-<chapter>.mp3  version fluent or slower; CODE the ePub's book code (GEN), chapter its Hebrew one
                                  (GEN-001.mp3)
  <version>/<Book>.json           Book COTEXT's book code (Gen, as #Gen.1): {"<chapter>": [[verse, part, file, begin, end], ...]}
                                  - chapter and verse COTEXT's, part "a" / "b" / "", file the MP3's name without
                                  .mp3, begin and end in seconds - in reading order
"""
import hashlib
import json
import pathlib
import re
import sys
import urllib.parse
import urllib.request
import zipfile

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from build_db import BOOK_ID, BOOKS, DL as TAHOT_DL, REF  # noqa: E402

HERE = pathlib.Path(__file__).parent
DL = HERE / "downloads" / "shmuelof"
OUT = HERE.parent / "public" / "data" / "audio" / "shmuelof"
PINS = HERE / "shmuelof_pins.json"
BASE = "https://ebible.org/multimedia/hbo/"
VERSIONS = ("fluent", "slower")
# The ePubs' names (as ebible.org lists them): "Tanakh <version> <nn>-<English> <Hebrew>.epub", nn the book in the
# English order - COTEXT's book number.
NAMES = ["01-Genesis בראשית", "02-Exodus שמות", "03-Leviticus ויקרא", "04-Numbers במדבר", "05-Deuteronomy דברים",
         "06-Joshua יהושע", "07-Judges שפטים", "08-Ruth רות", "09-First Samuel שמואל א", "10-Second Samuel שמואל ב",
         "11-First Kings מלכים א", "12-Second Kings מלכים ב", "13-First Chronicles דברי הימים א",
         "14-Second Chronicles דברי הימים ב", "15-Ezra עזרא", "16-Nehemiah נחמיה", "17-Esther אסתר", "18-Job איוב",
         "19-Psalms תהלים", "20-Proverbs משלי", "21-Ecclesiastes קהלת", "22-Song of Songs שיר השירים",
         "23-Isaiah ישעיהו", "24-Jeremiah ירמיהו", "25-Lamentations איכה", "26-Ezekiel יחזקאל", "27-Daniel דניאל",
         "28-Hosea הושע", "29-Joel יואל", "30-Amos עמוס", "31-Obadiah עבדיה", "32-Jonah יונה", "33-Micah מיכה",
         "34-Nahum נחום", "35-Habakkuk חבקוק", "36-Zephaniah צפניה", "37-Haggai חגי", "38-Zechariah זכריה",
         "39-Malachi מלאכי"]
PAR = re.compile(r'<text src="[^"#]*#(\d+)([a-z]?)"\s*/>\s*<audio clipBegin="([\d.]+)" clipEnd="([\d.]+)" '
                 r'src="\.\./Audio/(?:\d+-)?([^"/]+)\.mp3"\s*/>')
SMIL = re.compile(r"Text/(?:\d+-)?([A-Z0-9]+)-(\d+)\.xhtml\.smil$")


def hebrew_to_english():
    """{(book, Hebrew chapter, verse): (chapter, verse)} from TAHOT's references (Psa.3.1(3.2): Hebrew 3:2 -> 3:1),
    each Hebrew verse the English one of its first word; only where they differ."""
    out = {}
    for i in range(1, 5):
        with open(TAHOT_DL / f"TAHOT{i}.txt", encoding="utf-8-sig") as f:
            for line in f:
                m = REF.match(line)
                h = re.match(r"^\w+\.\d+\.\d+\((\d+)\.(\d+)\)", line)
                if m and h:
                    out.setdefault((BOOK_ID[m.group(1)], int(h.group(1)), int(h.group(2))),
                                   (int(m.group(2)), int(m.group(3))))
    return out


def fetch(version, n, pins, pin):
    """The book's ePub, downloaded (checked against its pin) into DL; its path."""
    name = f"Tanakh {version} {NAMES[n - 1]}.epub"
    out = DL / name
    if not out.exists():
        DL.mkdir(parents=True, exist_ok=True)
        print("downloading", name)
        req = urllib.request.Request(BASE + urllib.parse.quote(name),
                                     headers={"User-Agent": "COTEXT-pipeline/0.1 (Bible study app build)"})
        with urllib.request.urlopen(req, timeout=600) as r:
            data = r.read()
        sha = hashlib.sha256(data).hexdigest()
        if pin:
            pins[name] = sha
        elif pins.get(name) != sha:
            raise SystemExit(f"{name}: not the pinned file (SHA-256 differs) - check the source, then "
                             "python3 pipeline/shmuelof.py --pin")
        out.write_bytes(data)
    return out


def extract(epub, version, book, heb_eng):
    """The ePub's MP3s copied out verbatim and its chapters' timings written as <Book>.json."""
    folder = OUT / version
    folder.mkdir(parents=True, exist_ok=True)
    chapters = {}
    with zipfile.ZipFile(epub) as z:
        for info in z.infolist():
            if info.filename.startswith("Audio/") and info.filename.endswith(".mp3"):
                (folder / re.sub(r"^\d+-", "", info.filename[6:])).write_bytes(z.read(info))     # (Byte for byte)
        smils = sorted((m.group(2), f) for f in z.namelist() if (m := SMIL.search(f)))
        for hch, f in smils:
            for v, part, begin, end, mp3 in PAR.findall(z.read(f).decode("utf-8")):
                ch, ev = heb_eng.get((book, int(hch), int(v)), (int(hch), int(v)))
                chapters.setdefault(str(ch), []).append([ev, part, mp3, float(begin), float(end)])
    third_parts(chapters)
    if not chapters:
        raise SystemExit(f"{epub.name}: no timings found")
    (folder / f"{BOOKS[book - 1][0]}.json").write_text(json.dumps(chapters, ensure_ascii=False, separators=(",", ":")))


def third_parts(chapters):
    """A verse's part "c" given to the next verse (as its whole, part ""), where that verse has no clip of its own."""
    for segs in chapters.values():
        have = {s[0] for s in segs}
        for s in segs:
            if s[1] == "c" and s[0] + 1 not in have:
                s[0], s[1] = s[0] + 1, ""


def main():
    pin = "--pin" in sys.argv
    pins = json.loads(PINS.read_text()) if PINS.exists() else {}
    heb_eng = hebrew_to_english()
    for version in VERSIONS:
        for n in range(1, 40):
            if (OUT / version / f"{BOOKS[n - 1][0]}.json").exists():
                continue     # (Extracted already)
            epub = fetch(version, n, pins, pin)
            extract(epub, version, n, heb_eng)
            epub.unlink()     # (Its audio is now in public/data/audio: the ePub isn't kept)
            if pin:
                PINS.write_text(json.dumps(pins, ensure_ascii=False, indent=1) + "\n")
    size = sum(f.stat().st_size for f in OUT.rglob("*") if f.is_file())
    print(f"{OUT}: {size / 1e9:.2f} GB")


if __name__ == "__main__":
    main()
