"""Writes each notes source's books into the main database's note_sources (a column, books): the book ids its file has
notes for, space-separated ('' for a source whose file isn't a notes table - the Dictionary, the Atlas -, offered in
every book of its testaments). The notes' picker (src/notes.ts) lists a source only in the books it covers, so Rashi
or Ibn Ezra appear only in the Torah, a single-letter commentary only in its letter.

Run: python3 pipeline/source_books.py   (a second or two; build_db.py runs it after every source is listed, before
split_db.py)
"""
import pathlib
import sqlite3

ROOT = pathlib.Path(__file__).parent.parent
PUBLIC = ROOT / "public"


def add(main_db):
    """Fills note_sources.books (the column added if it's missing) from each source's file."""
    if "books" not in [r[1] for r in main_db.execute("PRAGMA table_info(note_sources)")]:
        main_db.execute("ALTER TABLE note_sources ADD COLUMN books TEXT NOT NULL DEFAULT ''")
    for sid, file in main_db.execute("SELECT id, file FROM note_sources").fetchall():
        path = PUBLIC / file
        books = ""
        if path.exists():
            src = sqlite3.connect(path)
            if src.execute("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'notes'").fetchone():
                books = " ".join(str(b) for (b,) in src.execute("SELECT DISTINCT book FROM notes ORDER BY book"))
            src.close()
        main_db.execute("UPDATE note_sources SET books = ? WHERE id = ?", (books, sid))
    main_db.commit()


if __name__ == "__main__":
    db = sqlite3.connect(PUBLIC / "data" / "cotext.db")
    add(db)
    db.close()
