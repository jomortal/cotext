"""Downloads the STEPBible-Data files COTEXT's database is built from, at one pinned commit.

STEPBible-Data (Tyndale House, Cambridge; CC BY 4.0): github.com/STEPBible/STEPBible-Data
  TAHOT - the Hebrew OT, word by word (4 files); TAGNT - the Greek NT (2 files);
  TBESH / TBESG - the brief lexicons of extended Strong's numbers.
Files land in pipeline/downloads/ (gitignored); a file already there is kept. Run: python3 pipeline/fetch.py
"""
import pathlib
import urllib.parse
import urllib.request

# The commit the database is built from: change it to take a newer release of the data (then rebuild).
COMMIT = "be4191f0082aeedddb0eff0c02c966292b2bd641"   # 2026-10-24
BASE = f"https://raw.githubusercontent.com/STEPBible/STEPBible-Data/{COMMIT}/"
AMALGAMATED = "Translators Amalgamated OT+NT/"

# (path in the repo, local name)
FILES = [
    (AMALGAMATED + "TAHOT Gen-Deu - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt", "TAHOT1.txt"),
    (AMALGAMATED + "TAHOT Jos-Est - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt", "TAHOT2.txt"),
    (AMALGAMATED + "TAHOT Job-Sng - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt", "TAHOT3.txt"),
    (AMALGAMATED + "TAHOT Isa-Mal - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt", "TAHOT4.txt"),
    (AMALGAMATED + "TAGNT Mat-Jhn - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt", "TAGNT1.txt"),
    (AMALGAMATED + "TAGNT Act-Rev - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt", "TAGNT2.txt"),
    ("Lexicons/TBESH - Translators Brief lexicon of Extended Strongs for Hebrew - STEPBible.org CC BY.txt", "TBESH.txt"),
    ("Lexicons/TBESG - Translators Brief lexicon of Extended Strongs for Greek - STEPBible.org CC BY.txt", "TBESG.txt"),
]

DOWNLOADS = pathlib.Path(__file__).parent / "downloads"


def fetch():
    DOWNLOADS.mkdir(exist_ok=True)
    for path, name in FILES:
        out = DOWNLOADS / name
        if out.exists():
            continue
        print("downloading", name)
        with urllib.request.urlopen(BASE + urllib.parse.quote(path)) as r:
            data = r.read()
        out.write_bytes(data)


if __name__ == "__main__":
    fetch()
