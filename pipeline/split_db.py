"""Splits the main database (public/data/cotext.db, as build_db.py and the run-alone scripts leave it) into the files
the app downloads, public/data/db/<part>.db, by what changes together and how big it is - so a change re-downloads
only the file it's in (build.mjs gives each its own version, a hash of its bytes; src/dbserver.ts opens them as one).

  core     every table not listed below (books, parsings, freq, guide, grammars, grammar_terms, note_sources,
           lxx_heb, the full lexicons' bdb / greek_lex / ubs_lex / sefaria_lex keys and their files...): the small
           tables, the ones edited most (a notes source's row) - a new table lands here by itself
  lexicon  lexicon (the brief lexicons' entries)
  grammar  grammar_sections (the grammars' text)
  ot, nt, lxx  words: the Hebrew OT's, the NT's and the Septuagint's (by books.testament), each its own words table

The app opens core as its main database and attaches the others under their part's name (ot.words...); a temporary
view, words, joins the three testaments' again so every query reads as it did (dbserver.ts). cotext.db's views
(words_full) aren't copied: the app uses none.

The same cotext.db always gives the same bytes (the rows copied in key order into a fresh file, then VACUUMed): an
unchanged part keeps its version. A part is written only when its bytes changed.

Run: python3 pipeline/split_db.py   (a few seconds; build_db.py runs it at its end, and npm run build whenever
cotext.db is newer than the split files)
"""
import pathlib
import sqlite3
import sys

ROOT = pathlib.Path(__file__).parent.parent
SRC = ROOT / "public" / "data" / "cotext.db"
OUT = ROOT / "public" / "data" / "db"

# Each part but core: its tables, and for words the testament its rows are (None: the whole table)
PARTS = {
    "lexicon": [("lexicon", None)],
    "grammar": [("grammar_sections", None)],
    "ot": [("words", "OT")],
    "nt": [("words", "NT")],
    "lxx": [("words", "LXX")],
}


def copy(src, dest, tables):
    """Writes the tables ((name, testament or None) - words only that testament's books' rows) from src into a new
    file dest, with their indexes; returns its bytes."""
    tmp = dest.with_suffix(".tmp")
    tmp.unlink(missing_ok=True)
    db = sqlite3.connect(tmp)
    db.execute("PRAGMA page_size = 4096")
    db.execute("ATTACH ? AS src", (str(src),))
    for name, testament in tables:
        sql, = db.execute("SELECT sql FROM src.sqlite_master WHERE type = 'table' AND name = ?", (name,)).fetchone()
        db.execute(sql)
        cols = [r[1] for r in db.execute(f"PRAGMA src.table_info({name})")]
        pk = [r[1] for r in sorted(db.execute(f"PRAGMA src.table_info({name})"), key=lambda r: r[5]) if r[5]]
        order = f" ORDER BY {', '.join(pk)}" if pk else " ORDER BY rowid"
        where = "" if testament is None else " WHERE book IN (SELECT id FROM src.books WHERE testament = ?)"
        db.execute(f"INSERT INTO main.{name} SELECT {', '.join(cols)} FROM src.{name}{where}{order}",
                   () if testament is None else (testament,))
        for (isql,) in db.execute("SELECT sql FROM src.sqlite_master WHERE type = 'index' AND tbl_name = ? AND sql IS NOT NULL",
                                  (name,)).fetchall():
            db.execute(isql)
    db.commit()
    db.execute("DETACH src")
    db.execute("VACUUM")
    db.close()
    data = tmp.read_bytes()
    tmp.unlink()
    return data


def split(src=SRC, out=OUT):
    """Writes every part from src into out (each only if its bytes changed); returns {part: bytes}."""
    out.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(f"file:{src}?mode=ro", uri=True)
    every = [r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")]
    con.close()
    elsewhere = {t for tables in PARTS.values() for t, _ in tables}
    parts = {"core": [(t, None) for t in every if t not in elsewhere], **PARTS}
    sizes = {}
    for part, tables in parts.items():
        dest = out / f"{part}.db"
        data = copy(src, dest, tables)
        if not dest.exists() or dest.read_bytes() != data:
            dest.write_bytes(data)
        sizes[part] = len(data)
    for f in out.glob("*.db"):     # (A part no longer made)
        if f.stem not in parts:
            f.unlink()
    return sizes


if __name__ == "__main__":
    sizes = split(pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else SRC)
    print(", ".join(f"{p} {n / 1e6:.1f} MB" for p, n in sizes.items()))
