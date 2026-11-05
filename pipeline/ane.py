"""Ancient Near East parallels: texts and finds from the Bible's world - law codes, flood and creation stories, wisdom,
hymns, treaties, letters - each paired by hand with the passages it parallels, a line saying what the parallel is, and,
where a public-domain English translation exists as clean text, the parallel passage itself. Read by src/dictionary.ts
as the Archaeology finds are (the same file layout, kind 'dictionary'): by passage, "Ancient Near East parallels" in the
notes' picker (its DICTIONARY group) - the whole book's entries at once, each with its verses (notes.ts' BY_BOOK); and
searchable in the search pane. No word panel button: the parallels are topical, not tied to words.

The entries (ENTRIES, below) are COTEXT's own choice and wording: the title, what it is (place, date, what it holds),
a line for the lists, and its parallels - each a passage (English references, as finds.references() reads them), what
the parallel is, and the excerpts that show it (EXCERPTS: a stretch of a translation between two marker strings,
checked to be there - a changed source stops the build).

Sources (each pinned in ane_pins.json - written on the first run, kept after; delete an entry to fetch it anew):
  - Wikipedia (CC BY-SA 4.0): each entry's article - its lead (finds.lead()) as the description - pinned by revision.
  - Wikimedia Commons: the article's lead image (its page image, or the entry's own choice) when freely licensed, made
    by finds.pictures(): a 160 px thumbnail in the file (the lists show it offline) and the full picture, 1200 px,
    online only - public/data/images/ane/<id>.jpg, served, never in the download nor kept by the service worker.
  - The translations, all public domain (TRANSLATIONS): Wikisource pages (pinned by revision and the SHA-256 of their
    rendered HTML) - L. W. King's Code of Hammurabi, Budge's Hymn to the Aten (1923), George Smith's Sargon legend
    (The Chaldean Account of Genesis, 1876), the Tale of Two Brothers (Egyptian Literature, 1901), the Story of Ahikar
    (The Forgotten Books of Eden, 1926); and Project Gutenberg's plain texts (pinned by SHA-256) - Budge's Babylonian
    Story of the Deluge (1920) and Babylonian Legends of the Creation (1921), T. G. Pinches' The Old Testament in the
    Light of the Historical Records and Legends of Assyria and Babylonia (3rd ed., 1908).
  Not found as clean public-domain text (so those entries have no excerpt): R. W. Rogers' Cuneiform Parallels to the
  Old Testament (1912: scans and raw OCR only), L. W. King's Seven Tablets of Creation (Wikisource: scans only),
  Amenemope (Griffith 1926, Budge 1924: scans only); the Laws of Ur-Nammu and Eshnunna, Atrahasis, the Eridu Genesis,
  the Baal Cycle, Aqhat, Esarhaddon's and the Hittite treaties, the Babylonian Theodicy, the Middle Assyrian laws, the
  Mari prophecies (published or translated after 1929: no public-domain English).

Output: public/data/notes/ane.db - finds.write()'s tables (tyndale_dict's articles, lemmas - empty here -, refs, and
photos) - and its row in the main database's note_sources (id 'ane', kind 'dictionary', testaments 'OT NT'):
  articles  id (the Wikipedia article's title, as in its URL), title (COTEXT's), html (what it is, each parallel - its
            passages as links, what the parallel is, its excerpts and their translation -, Wikipedia's lead, the
            credits), line (the list's line, about 200 characters), verses (how many verses its parallels cite)
  refs      book, start, end (chapter * 1000 + verse), id - each parallel's passages as verse spans

Run on its own: python3 pipeline/ane.py (the main database already built; then source_books.py and split_db.py);
build_db.py runs build() after finds.
"""
import hashlib
import html
import json
import pathlib
import re
import shutil
import sqlite3
import sys
import urllib.request

HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE))
import finds  # noqa: E402
import tyndale_dict  # noqa: E402

DL = HERE / "downloads" / "notes" / "ane"
PINS = HERE / "ane_pins.json"
OUT = HERE.parent / "public" / "data" / "notes" / "ane.db"
WIKISOURCE = "https://en.wikisource.org/w/api.php"
SOURCE = ("ane", "dictionary", "Ancient Near East parallels", "OT NT",
          "Ancient Near Eastern texts paired by hand with the passages they parallel (COTEXT). Descriptions from "
          "Wikipedia (CC BY-SA 4.0; the revisions pinned in the build); photos from Wikimedia Commons, each credited "
          "under it. Translations public domain: L. W. King (Hammurabi); E. A. Wallis Budge (the Flood, Creation, the "
          "Aten hymn); T. G. Pinches (Amarna letters, Cyrus, Ludlul); George Smith (Sargon); Egyptian Literature "
          "(1901); The Forgotten Books of Eden (1926) - from Wikisource and Project Gutenberg.")

# ---- The translations ----
# key -> (kind, where, credit shown under its excerpts): kind "ws" a Wikisource page, "pg" a Project Gutenberg number.
TRANSLATIONS = {
    "king": ("ws", "Codex Hammurabi (King translation)", "Tr. L. W. King, The Code of Hammurabi (public domain; Wikisource)"),
    "aten": ("ws", "Great Hymn to Aten", "Tr. E. A. Wallis Budge, Tutankhamen: Amenism, Atenism and Egyptian Monotheism (1923; public domain; Wikisource)"),
    "sargon": ("ws", "The Chaldean Account of Genesis/Chapter 17", "Tr. George Smith, The Chaldean Account of Genesis (1876; public domain; Wikisource)"),
    "brothers": ("ws", "Egyptian Literature/Egyptian Tales/Anpu and Bata", "Egyptian Literature (1901; public domain; Wikisource)"),
    "ahikar": ("ws", "The Forgotten Books of Eden/The Story of Ahikar", "The Forgotten Books of Eden (1926; public domain; Wikisource)"),
    "deluge": ("pg", 7096, "Tr. E. A. Wallis Budge, The Babylonian Story of the Deluge (1920; public domain; Project Gutenberg)"),
    "creation": ("pg", 9914, "Tr. E. A. Wallis Budge, The Babylonian Legends of the Creation (1921; public domain; Project Gutenberg)"),
    "pinches": ("pg", 38732, "Tr. T. G. Pinches, The Old Testament in the Light of the Historical Records and Legends of Assyria and Babylonia (1908; public domain; Project Gutenberg)"),
}

# The excerpts: key -> (translation, first words, last words (kept; "<..." words it stops before), how it's set, label). How it's set: "lines" (verse: a
# line a numbered line or paragraph), "prose" (a paragraph each), "run" (one paragraph: a source that breaks
# paragraphs mid-sentence). The label says which part it is.
EXCERPTS = {
    "cH196": ("king", "196. If a man put out the eye", "his teeth shall be knocked out.", "prose", "Laws 196-200"),
    "cH117": ("king", "117. If any one fail to meet a claim for debt", "in the fourth year they shall be set free.", "prose", "Law 117"),
    "cH195": ("king", "195. If a son strike his father", "his hands shall be hewn off.", "prose", "Law 195"),
    "cH14": ("king", "14. If any one steal the minor son", "he shall be put to death.", "prose", "Law 14"),
    "cH209": ("king", "209. If a man strike a free-born woman", "his daughter shall be put to death.", "prose", "Laws 209-210"),
    "cH250": ("king", "250. If while an ox is passing", "the owner shall pay one-half a mina in money.", "prose", "Laws 250-251"),
    "cH8": ("king", "8. If any one steal cattle or sheep", "he shall be put to death.", "prose", "Law 8"),
    "cH129": ("king", "129. If a man's wife be surprised", "the king his slaves.", "prose", "Law 129"),
    "gPitch": ("deluge", "58. According to the plan its walls", "67. Three sar of pitch I poured into the inside.", "lines", "Tablet XI, lines 58-67"),
    "gBoard": ("deluge", "81. With everything that I possessed I loaded it", "94. I went into the ship and shut my door.", "lines", "Tablet XI, lines 81-94"),
    "gStorm": ("deluge", "128. For six days and nights", "<146. When the seventh day", "lines", "Tablet XI, lines 128-145"),
    "gBirds": ("deluge", "146. When the seventh day had come", "she croaked, she came not back.", "lines", "Tablet XI, lines 146-155"),
    "gSacrifice": ("deluge", "156. Then I brought out everything to the four winds", "like flies over him that sacrificed.", "lines", "Tablet XI, lines 156-162"),
    "eDeep": ("creation", "1. When the heavens above were yet unnamed", "9. The gods came into being in the midst of them.", "lines", "Tablet I, lines 1-9"),
    "eSea": ("creation", "128. He turned back to Tiamat", "132. He caused the North Wind to carry it away to a place underground.", "lines", "Tablet IV, lines 128-132"),
    "eWaters": ("creation", "137. He slit Tiamat open like a flat", "140. He ordered them not to let her water escape.", "lines", "Tablet IV, lines 137-140"),
    "eStars": ("creation", "1. He appointed the Stations for the great gods", "and committed the night to his care.", "lines", "Tablet V, lines 1-12"),
    "eMan": ("creation", "3. \"I will solidify blood, I will form bone.", "and I will set them\n(i.e., the gods) free.", "lines", "Tablet VI, lines 3-6"),
    "eKingu": ("creation", "26. From his blood he (i.e., Ea) fashioned mankind", "and he set the gods free.", "lines", "Tablet VI, line 26"),
    "sargon": ("sargon", "Sargina the powerful king the king of Akkad am I.", "Durankigal bowed, &c. &c.", "lines", "The legend of Sargon"),
    "aNight": ("aten", "Thou settest in the horizon of the west", "throughout the land they do their works.", "run", ""),
    "aSea": ("aten", "The boats drop down and sail up the river", "the Mediterranean and Red Seas).", "run", ""),
    "aMany": ("aten", "O how many are the things which thou hast made!", "Thou settest every person in his place.", "run", ""),
    "aLive": ("aten", "The earth came into being by thy hand", "thou settest, they die.", "run", ""),
    "eaJerusalem": ("pinches", "“(T)o the king my lord, (my) Sun, (say also) thus:", "but now the Ḫabiru have taken the cities of the king.", "prose", "Abdi-Heba of Jerusalem to Pharaoh (EA 288)"),
    "eaFather": ("pinches", "“Behold, I, neither my father nor my mother set me in this place.", "caused me to enter into the house of my\nfather.”", "prose", "Abdi-Heba of Jerusalem to Pharaoh"),
    "cyName": ("pinches", "He sought also\na just king", "(his) na(me) was proclaimed.", "prose", "The Cyrus Cylinder"),
    "cyBattle": ("pinches", "Without fighting and battle he caused him to enter\ninto Šu-anna.", "he delivered into his hand.", "prose", "The Cyrus Cylinder"),
    "cyReturn": ("pinches", "the gods dwelling within them I returned to their places", "returned to their dwellings.", "prose", "The Cyrus Cylinder"),
    "brTempt": ("brothers", "And the younger brother found the wife of his elder brother", "Say it not to me again.", "prose", "The Tale of Two Brothers"),
    "brAccuse": ("brothers", "And behold the wife of the elder brother was afraid", "he would have done this even in daylight.”", "prose", "The Tale of Two Brothers"),
    "ahEnemy": ("ahikar", "58 O my son! rejoice not in the death of thine enemy", "be beforehand with him in greeting.", "prose", "Saying 58"),
    "ahRod": ("ahikar", "61 O my son! let the wise man beat thee with a rod", "anoint thee with sweet salve.", "prose", "Saying 61"),
    "ahDog": ("ahikar", "51 O my son! a living dog", "better than a dead poor man.", "prose", "Saying 51"),
    "ahPig": ("ahikar", "27 O my son! thou hast been to me like the pig", "went down and wallowed in it.", "prose", "Ahikar to Nadan"),
    "ludlul": ("pinches", "“The time for the worship of the gods was my heart’s delight,", "profit and riches,”", "prose", "Ludlul bēl nēmeqi, Tablet II"),
}

# The entries: (Wikipedia article, title, image (None: the article's page image; "": none), what it is, the list's
# line, [(passages, what the parallel is, [excerpts])]).
ENTRIES = [
    ("Code of Hammurabi", "Code of Hammurabi", None,
     "Babylon, about 1755-1750 BC: King Hammurabi's 282 laws, carved on a basalt stele found at Susa in 1901 (now in the Louvre).",
     "Laws close to the Covenant Code's: an eye for an eye, the goring ox, the debt slave freed, the stolen man.",
     [("Exodus 21:23-25; Leviticus 24:19-20; Deuteronomy 19:21", "An eye for an eye: the punishment matched to the injury (lex talionis) - though the Code scales it by rank, and the Torah does not.", ["cH196"]),
      ("Exodus 21:2-6; Deuteronomy 15:12", "A debt slave works a set time and goes free - six years in the Torah, three in the Code.", ["cH117"]),
      ("Exodus 21:15", "A son who strikes his father.", ["cH195"]),
      ("Exodus 21:16; Deuteronomy 24:7", "Stealing a person is a capital crime.", ["cH14"]),
      ("Exodus 21:22-23", "A blow that makes a pregnant woman miscarry: a fine; her death, a life.", ["cH209"]),
      ("Exodus 21:28-32", "The ox known to gore, its owner careless, kills a man.", ["cH250"]),
      ("Exodus 22:1-4", "Stolen animals repaid many times over (thirtyfold or tenfold; in Exodus fivefold and fourfold).", ["cH8"]),
      ("Deuteronomy 22:22; Leviticus 20:10", "Adultery caught in the act: both put to death.", ["cH129"])]),
    ("Code of Ur-Nammu", "Laws of Ur-Nammu", None,
     "Ur, about 2100-2050 BC: the oldest law code known, in Sumerian.",
     "The oldest law code: the case-by-case \"if a man...\" form of Exodus 21-22, injuries paid for in silver.",
     [("Exodus 21:12-14", "Murder punished by death (its first law).", []),
      ("Exodus 21:18-19", "A man who injures another pays for the injury - the form of the Torah's laws on bodily harm.", [])]),
    ("Laws of Eshnunna", "Laws of Eshnunna", None,
     "Eshnunna, about 1800 BC: some 60 laws in Akkadian, found at Tell Harmal in 1945-1947.",
     "Its ox that gores an ox matches Exodus 21:35 almost word for word.",
     [("Exodus 21:35", "An ox gores another ox to death: the two owners divide the live ox's price and the dead one (law 53).", []),
      ("Exodus 21:28-29", "The goring ox whose owner was warned kills a man (laws 54-55).", []),
      ("Exodus 22:2-3", "A thief caught in a house by night may be killed; by day, not (laws 12-13).", [])]),
    ("Gilgamesh flood myth", "Gilgamesh, Tablet XI: the Flood", None,
     "Nineveh, 7th century BC copy of an older story: Tablet XI of the Epic of Gilgamesh, where Utnapishtim tells how he survived the Flood; found in Ashurbanipal's library, read by George Smith in 1872.",
     "The Flood: a ship sealed with pitch, every kind of beast, birds sent out, a sacrifice whose smell the gods smell.",
     [("Genesis 6:14-16", "The vessel's measured decks and compartments, sealed with pitch inside and out.", ["gPitch"]),
      ("Genesis 7:1-16", "Family, beasts and goods taken aboard at the appointed time; the door shut.", ["gBoard"]),
      ("Genesis 7:17-8:5", "The storm, the waters over the mountains, the ship grounded on a mountain (Nisir; Ararat in Genesis).", ["gStorm"]),
      ("Genesis 8:6-12", "Birds sent out to find dry land - a dove, a swallow, a raven (a raven and a dove in Genesis).", ["gBirds"]),
      ("Genesis 8:20-21", "The sacrifice on the mountain, and its sweet savor smelled by the gods (by the LORD in Genesis).", ["gSacrifice"])]),
    ("Atra-Hasis", "Atrahasis", "Bm-epic-g.jpg",
     "Old Babylonian epic, about 1700 BC: mankind made of clay and a slain god's blood to bear the gods' toil; the gods' attempts to curb its noise, ending in the Flood that Atrahasis survives in a boat.",
     "Man made from clay, then a flood that one man survives in a boat - Genesis 2 and 6-9 in one story.",
     [("Genesis 2:7", "Man formed from clay mixed with a god's flesh and blood - in Genesis, from dust and God's breath.", []),
      ("Genesis 6:5-8:22", "A flood sent to destroy mankind; one man warned, a boat built, a sacrifice after.", []),
      ("Genesis 9:1", "After the flood the gods limit mankind's numbers; in Genesis God blesses it: be fruitful and multiply.", [])]),
    ("Eridu Genesis", "Eridu Genesis", None,
     "Sumerian, about 1600 BC: the creation of man, the first cities and the Flood, survived by King Ziusudra in a great boat.",
     "The Sumerian Flood: a pious king warned by a god, saved in a boat, given lasting life.",
     [("Genesis 6:9-9:17", "A pious king warned of the gods' flood rides it out in a huge boat for seven days and nights, then sacrifices.", []),
      ("Genesis 4:17-22", "The first cities and their founders before the Flood.", [])]),
    ("Enūma Eliš", "Enuma Elish", None,
     "Babylonian creation epic, written by about 1100 BC (copies from Ashurbanipal's library): Marduk defeats Tiamat, the sea, and makes the world of her body.",
     "Creation from watery chaos: the deep (Tiamat; tehom), the waters split above and below, the stars set, man made.",
     [("Genesis 1:1-2", "Before the world had a name: the primeval waters, Apsu and Tiamat - in Genesis \"the deep\" (tehom, a word kin to Tiamat).", ["eDeep"]),
      ("Genesis 1:6-8", "The waters divided: half of Tiamat raised as the sky, barred so her waters cannot escape - the firmament dividing the waters.", ["eWaters"]),
      ("Genesis 1:14-18", "Stars and moon set in their stations to mark the year, the months and the night.", ["eStars"]),
      ("Genesis 1:26-27; 2:7", "Man made to serve the gods, from a rebel god's blood - in Genesis, in God's image, to rule.", ["eMan", "eKingu"]),
      ("Psalm 74:13-14; 89:9-10; Job 26:12-13; Isaiah 51:9", "God's victory over the sea and its monster (Rahab, Leviathan), as Marduk's over Tiamat.", ["eSea"])]),
    ("Adapa", "Adapa", "",
     "Babylonian myth (a copy among the Amarna letters, 14th century BC): Adapa, the wise man of Eridu, refuses the food and water of life Anu offers him, and so loses immortality.",
     "The food of life offered and refused: man losing immortality, as at the tree of life.",
     [("Genesis 3:22-24", "Life for ever within reach and lost: the tree of life barred.", [])]),
    ("Sumerian King List", "Sumerian King List", None,
     "Sumerian, about 2000 BC (the Weld-Blundell prism, about 1800 BC): the kings of Sumer since \"kingship descended from heaven\", with reigns of thousands of years before the Flood.",
     "Kings ruling thousands of years before the Flood, far shorter reigns after - as Genesis' ages before and after Noah.",
     [("Genesis 5:1-32", "A line of long-lived rulers before the Flood (eight to ten), as Genesis' ten generations from Adam to Noah.", []),
      ("Genesis 11:10-32", "After the Flood, lifespans much shorter.", [])]),
    ("Sargon of Akkad", "Legend of Sargon's birth", None,
     "A Neo-Assyrian tablet (7th century BC) telling the birth of Sargon of Akkad (about 2300 BC), founder of the first empire.",
     "A baby set in a basket of rushes sealed with bitumen, put on the river, drawn out and raised by another - as Moses.",
     [("Exodus 2:1-10", "The child hidden in an ark of rushes sealed with bitumen, set on the river, found and brought up by a stranger.", ["sargon"])]),
    ("Instruction of Amenemope", "Instruction of Amenemope", None,
     "Egyptian wisdom, about 1300-1075 BC: thirty chapters of a father's counsel to his son (a papyrus in the British Museum, published 1923).",
     "Its thirty chapters echoed in Proverbs' \"thirty sayings\" (22:17-24:22), often line for line.",
     [("Proverbs 22:17-21", "\"Incline thine ear\": the call to hear, and \"thirty\" sayings, as Amenemope's thirty chapters.", []),
      ("Proverbs 22:22", "Do not rob the poor.", []),
      ("Proverbs 22:28; 23:10", "Do not move the ancient boundary stone.", []),
      ("Proverbs 23:4-5", "Riches make themselves wings and fly away like an eagle (in Amenemope, like geese).", []),
      ("Proverbs 22:29", "The skilled scribe will stand before kings.", []),
      ("Proverbs 23:1-3", "Eating before a ruler: watch your appetite.", [])]),
    ("Great Hymn to the Aten", "Great Hymn to the Aten", None,
     "Egypt, about 1350 BC: the hymn to the sun disc (the Aten), from Ay's tomb at Amarna, attributed to Pharaoh Akhenaten.",
     "The sun god's care for every creature by night and day - close to Psalm 104.",
     [("Psalm 104:20-23", "Night: lions and creeping things come out; then dawn, and men go out to their work.", ["aNight"]),
      ("Psalm 104:24", "\"How manifold are thy works\" - \"O how many are the things which thou hast made!\"", ["aMany"]),
      ("Psalm 104:25-26", "The sea, its ships and its creatures.", ["aSea"]),
      ("Psalm 104:27-30", "All live by him: he gives breath and they live; he goes, and they die.", ["aLive"])]),
    ("Egyptian–Hittite peace treaty", "Hittite treaties: the Egyptian-Hittite treaty", None,
     "1259 BC, between Ramesses II and the Hittite king Hattusili III: a treaty in the Hittite form - who makes it, the history between the parties, the terms, the text kept and read, the gods as witnesses, curses and blessings.",
     "The Hittite treaty form - preamble, history, terms, deposit and reading, witnesses, blessings and curses - is the covenant form of Deuteronomy and Joshua 24.",
     [("Exodus 20:1-17", "The Ten Commandments open as a treaty: who speaks, what he has done (\"which brought thee out\"), then the terms.", []),
      ("Deuteronomy 1:1-5", "The preamble: who makes the covenant.", []),
      ("Deuteronomy 1:6-8", "The history: what the great king has done for his vassal (Deuteronomy 1-3).", []),
      ("Deuteronomy 12:1", "The terms (Deuteronomy 12-26).", []),
      ("Deuteronomy 31:9-13, 24-26", "The text kept beside the god (in the ark) and read aloud at set times.", []),
      ("Deuteronomy 30:19; 32:1", "Witnesses: heaven and earth called to witness (in the treaties the gods, mountains, rivers, heaven and earth).", []),
      ("Deuteronomy 28:1-68", "Blessings for keeping it and curses for breaking it.", []),
      ("Joshua 24:1-28", "A covenant made in the same order: preamble, history, terms, witnesses, the words written down.", [])]),
    ("Esarhaddon's Treaty with Ba'al of Tyre", "Assyrian vassal treaties: Esarhaddon and Ba'al of Tyre", None,
     "Nineveh, about 675 BC: Esarhaddon of Assyria binding Ba'al, king of Tyre, under oath and curses. The same king's Succession Treaty (672 BC), found at Nimrud and Tell Tayinat, is the closest known parallel to Deuteronomy.",
     "An Assyrian vassal's oath under curses - the form and wording behind Deuteronomy 13 and 28.",
     [("Deuteronomy 28:15-68", "Curses on the breaker: heaven as bronze and earth as iron (in the Succession Treaty), plague, siege, eating one's own children.", []),
      ("Deuteronomy 13:1-18", "Anyone urging disloyalty - a prophet, a brother, a friend - to be reported and put to death.", []),
      ("Deuteronomy 6:5", "Loyalty as love \"with all thine heart\", as the vassals swear to love the king's heir.", [])]),
    ("Ludlul bēl nēmeqi", "Ludlul bel nemeqi: the righteous sufferer", None,
     "Babylonian poem, about 1300-1000 BC: \"I will praise the lord of wisdom\" - a pious man's ruin, sickness and scorn, and Marduk's restoring him.",
     "The righteous sufferer: pious yet struck down, mocked by those around him, at last restored - Job's story.",
     [("Job 1:1-5", "A man devoted to his gods and their offerings.", ["ludlul"]),
      ("Job 2:7-8", "Struck with disease from head to foot.", []),
      ("Job 19:13-19", "Family and friends turn away.", []),
      ("Job 42:10-17", "Restored by his god.", []),
      ("Psalm 38:1-11", "A sick man's lament: his body wasted, his friends standing far off.", [])]),
    ("Babylonian Theodicy", "Babylonian Theodicy", None,
     "Babylonian, about 1000 BC: an acrostic dialogue of 27 stanzas between a sufferer and his friend about why the gods let the righteous suffer.",
     "A sufferer and a friend argue whether the gods are just - Job's debate in small.",
     [("Job 4:7-9", "The friend: the innocent do not perish.", []),
      ("Job 21:7-16", "The sufferer: why do the wicked prosper?", []),
      ("Jeremiah 12:1", "\"Wherefore doth the way of the wicked prosper?\"", [])]),
    ("Baal Cycle", "Baal Cycle", None,
     "Ugarit, about 1400-1200 BC: Baal, the storm god, defeats Yam (Sea) and Mot (Death) and is given a palace; found at Ras Shamra from 1929.",
     "The storm god riding the clouds, defeating the sea and Leviathan - language Israel's poets gave to the LORD; the Baal of Kings.",
     [("Psalm 29:3-9", "The god's voice in the thunder over the waters - Psalm 29 is often read as a hymn in Baal's style.", []),
      ("Psalm 68:4", "\"Rider on the clouds\" - Baal's title.", []),
      ("Isaiah 27:1", "Leviathan the fleeing, twisting serpent - the same words as of Lotan in the Baal Cycle.", []),
      ("Psalm 74:13-14", "The sea and its many-headed dragon crushed.", []),
      ("1 Kings 18:20-40", "Baal at Carmel: Elijah mocks the god who sleeps or travels, who should answer with fire and rain.", [])]),
    ("Amarna letters", "Amarna letters", None,
     "Akhetaten (Amarna), Egypt, about 1360-1332 BC: letters in Akkadian to Pharaoh from Canaan's city kings - Jerusalem's Abdi-Heba among them - complaining of one another and of the Habiru.",
     "Canaan before Israel: city-states under Egypt, Jerusalem's king writing to Pharaoh, the Habiru taking the land.",
     [("Joshua 10:1-5", "Jerusalem a city-state with its own king, leagued with its neighbors (Adoni-zedek in Joshua; Abdi-Heba in the letters).", ["eaJerusalem"]),
      ("Judges 1:21; 2 Samuel 5:6-9", "Jerusalem in Canaanite hands before David.", []),
      ("Genesis 14:18; Hebrews 7:3", "A king of (Jeru)salem: Abdi-Heba's \"neither my father nor my mother\" set beside Melchizedek \"without father, without mother\".", ["eaFather"])]),
    ("Gezer calendar", "Gezer calendar", None,
     "Gezer, 10th century BC: a limestone tablet listing the farming year month by month - one of the oldest Hebrew (or Phoenician) inscriptions.",
     "The farming year of the land, whose harvests set the times of the feasts.",
     [("Exodus 23:14-17", "Three feasts at the harvest seasons.", []),
      ("Deuteronomy 16:9-15", "Weeks after the grain harvest begins; Booths at the ingathering.", []),
      ("Ruth 1:22; 2:23", "The barley and wheat harvests.", []),
      ("1 Kings 9:15-17", "Gezer itself, rebuilt by Solomon.", [])]),
    ("Tale of Two Brothers", "Tale of Two Brothers", None,
     "Egypt, about 1200 BC (Papyrus d'Orbiney, 19th dynasty): a wife tries to seduce her husband's younger brother, is refused, and accuses him.",
     "A married woman's advances refused, then her false accusation - Joseph and Potiphar's wife.",
     [("Genesis 39:7-12", "The master's wife asks the young man to lie with her; he refuses: his master trusts him.", ["brTempt"]),
      ("Genesis 39:13-20", "She accuses him to her husband, who turns on him in anger.", ["brAccuse"])]),
    ("Story of Ahikar", "Story of Ahikar", None,
     "Aramaic, 5th century BC papyrus from Elephantine (the story older): Ahikar, Sennacherib's wise counselor, betrayed by his nephew Nadan, and his sayings.",
     "A sage's sayings close to Proverbs and Ecclesiastes; Ahikar is Tobit's kinsman.",
     [("Proverbs 24:17", "Do not rejoice when your enemy falls.", ["ahEnemy"]),
      ("Psalm 141:5; Proverbs 27:6", "Better a wise man's blows than a fool's anointing.", ["ahRod"]),
      ("Ecclesiastes 9:4", "A living dog is better than a dead lion.", ["ahDog"]),
      ("2 Peter 2:22", "The pig washed, back to wallow in the mire.", ["ahPig"])]),
    ("Cyrus Cylinder", "Cyrus Cylinder", None,
     "Babylon, after 539 BC: Cyrus' account of taking Babylon by Marduk's choice, returning the gods and peoples deported there to their homes.",
     "Cyrus chosen and led by a god, taking Babylon, sending exiles and their gods home - as in Isaiah 44-45 and Ezra 1.",
     [("Isaiah 45:1-4", "The god takes Cyrus by the hand and calls him by name.", ["cyName"]),
      ("Daniel 5:30-31", "Babylon taken without a battle.", ["cyBattle"]),
      ("Isaiah 44:28; Ezra 1:1-4; 2 Chronicles 36:22-23", "Peoples and their gods sent home, their shrines rebuilt - Cyrus' decree to rebuild the temple.", ["cyReturn"])]),
    ("Enmerkar and the Lord of Aratta", "Enmerkar and the Lord of Aratta", None,
     "Sumerian epic, about 2000 BC: Enmerkar of Uruk's contest with Aratta; in it the \"spell of Nudimmud\" looks back to when all mankind spoke one tongue, until the god Enki changed their speech.",
     "Once all people spoke one language, until a god confused it - the Tower of Babel.",
     [("Genesis 11:1-9", "One language for all mankind, then confused by a god.", [])]),
    ("Mari texts", "Mari tablets", None,
     "Mari on the Euphrates, about 1800-1760 BC: some 25,000 tablets from King Zimri-Lim's palace - among them letters passing on prophets' messages from the gods to the king.",
     "Prophets bringing a god's word to the king unasked - the closest older parallel to Israel's prophets.",
     [("2 Samuel 7:1-17", "A prophet's word to the king about his house and his dynasty.", []),
      ("1 Kings 22:5-28", "Prophets asked for a god's word before war.", []),
      ("Genesis 24:10", "The patriarchs' homeland: Nahor and Harran named in its letters.", [])]),
    ("Assyrian law", "Middle Assyrian laws", None,
     "Ashur, about 1075 BC (the laws older): tablets of laws on women, marriage, property and punishment.",
     "Marriage laws like Deuteronomy's: the levirate, the betrothed girl.",
     [("Deuteronomy 25:5-10", "A dead man's brother marrying his widow (the levirate).", []),
      ("Genesis 38:6-26", "The levirate, and a father-in-law in it (Judah and Tamar).", []),
      ("Deuteronomy 22:23-29", "A betrothed or unbetrothed girl violated - in the town or in the field.", [])]),
    ("Tale of Aqhat", "Tale of Aqhat", None,
     "Ugarit, about 1350 BC: Danel, a just king who judges the widow's and the orphan's cause, is granted a son, Aqhat, whom the goddess Anat has killed.",
     "Danel the righteous judge - the Daniel whom Ezekiel names with Noah and Job.",
     [("Ezekiel 14:14, 20", "Noah, Daniel and Job: Daniel a righteous man of old.", []),
      ("Ezekiel 28:3", "\"Wiser than Daniel.\"", []),
      ("Genesis 18:1-15", "A childless man promised a son; divine guests fed.", [])]),
]


# ---- Fetching ----

def wikisource(title, pins):
    """A Wikisource page's text (paragraphs separated by blank lines), its revision pinned (pins["wikisource"][title]:
    [revid, SHA-256 of its rendered HTML]); the rendering kept in DL."""
    ws = pins.setdefault("wikisource", {})
    if title not in ws:
        page = finds.get(WIKISOURCE, {"action": "query", "titles": title, "prop": "revisions", "rvprop": "ids"})["query"]["pages"][0]
        ws[title] = [page["revisions"][0]["revid"], None]
    rev = ws[title][0]
    path = DL / f"ws-{rev}.html"
    if not path.exists():
        path.write_text(finds.get(WIKISOURCE, {"action": "parse", "oldid": rev, "prop": "text"})["parse"]["text"], encoding="utf-8")
    h = path.read_text(encoding="utf-8")
    sha = hashlib.sha256(h.encode()).hexdigest()
    if (ws[title][1] or sha) != sha:
        raise SystemExit(f"{path}: not the pinned rendering (SHA-256 differs)")
    ws[title][1] = sha
    h = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", h, flags=re.S)
    h = re.sub(r"<sup[^>]*class=\"reference[^>]*>.*?</sup>", "", h, flags=re.S)
    h = re.sub(r"<br\s*/?>|</p>|</div>|</dd>|</li>|</h\d>", "\n\n", h)
    return html.unescape(re.sub(r"<[^>]+>", "", h))


def gutenberg(n, pins):
    """A Project Gutenberg book's plain text, pinned by SHA-256 (pins["gutenberg"][n]); kept in DL."""
    path = DL / f"pg{n}.txt"
    if not path.exists():
        path.write_bytes(finds.fetched(urllib.request.Request(f"https://www.gutenberg.org/cache/epub/{n}/pg{n}.txt", headers=finds.UA)))
    data = path.read_bytes()
    sha = hashlib.sha256(data).hexdigest()
    if pins.setdefault("gutenberg", {}).setdefault(str(n), sha) != sha:
        raise SystemExit(f"{path}: not the pinned text (SHA-256 differs)")
    return data.decode("utf-8").replace("\r\n", "\n")


def articles(titles, pins):
    """The Wikipedia articles: title -> (its title after redirects, wikitext, page image), pinned by revision
    (pins["articles"][title]: [title, revid])."""
    arts = pins.setdefault("articles", {})
    new = [t for t in titles if t not in arts]
    for i in range(0, len(new), 50):
        q = finds.get(finds.API, {"action": "query", "titles": "|".join(new[i:i + 50]), "redirects": 1,
                                  "prop": "revisions", "rvprop": "ids"})["query"]
        to = {r["from"]: r["to"] for r in q.get("normalized", []) + q.get("redirects", [])}
        pages = {p["title"]: p for p in q["pages"]}
        for t in new[i:i + 50]:
            r = t
            while r in to:
                r = to[r]
            if "revisions" not in pages.get(r, {}):
                raise SystemExit(f"No Wikipedia article: {t}")
            arts[t] = [r, pages[r]["revisions"][0]["revid"]]
    out = {}
    for t in titles:
        title, rev = arts[t]
        path = DL / f"art-{rev}.json"
        if not path.exists():
            p = finds.get(finds.API, {"action": "query", "revids": rev, "prop": "revisions|pageimages",
                                      "rvprop": "content", "rvslots": "main", "piprop": "name"})["query"]["pages"][0]
            path.write_text(json.dumps({"wikitext": p["revisions"][0]["slots"]["main"]["content"],
                                        "image": p.get("pageimage", "")}))
        a = json.loads(path.read_text())
        out[t] = (title, a["wikitext"], a["image"])
    return out


# ---- Excerpts ----

def excerpt(text, first, last, how):
    """The stretch of a translation from first to last (both kept - last "<words": up to them; first's first
    occurrence) as HTML: footnotes,
    illustrations and note marks dropped, _italics_ marks dropped; set as how says (EXCERPTS)."""
    i = text.find(first)
    j = text.find(last.lstrip("<"), i)
    if i < 0 or j < 0:
        raise SystemExit(f"Excerpt not found: {first!r} ... {last!r}")
    chunk = text[i:j if last.startswith("<") else j + len(last)].replace("​", "")
    paras = []
    for p in re.split(r"\n\s*\n", chunk):
        p = p.strip()
        if not p or p.startswith(("[Footnote", "[Illustration")) or re.fullmatch(r"\d+", p):
            continue
        p = re.sub(r"\[\d+\]|\((?:\d+)\)", "", p).replace("_", "")
        if how == "lines":     # (A numbered line starts a new line; a wrapped one joins the line before)
            lines = []
            for ln in p.split("\n"):
                ln = ln.strip()
                if lines and not re.match(r"\d+\.\s", ln):
                    lines[-1] += " " + ln
                else:
                    lines.append(ln)
            paras += lines
        else:
            paras.append(re.sub(r"\s+", " ", p))
    e = html.escape
    if how == "lines":
        return "<p>" + "<br>".join(f"<i>{e(x)}</i>" if x.startswith("[") else e(x) for x in paras) + "</p>"
    if how == "run":
        return f"<p>{e(' '.join(paras))}</p>"
    return "".join(f"<p>{e(x)}</p>" for x in paras)


# ---- The file ----

def link(osis, shown):
    """A passage as a link to its first verse (the dictionary's data-ref)."""
    b, ch, v = re.match(r"([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)", osis).groups()
    return f'<a data-ref="{tyndale_dict.BOOKS[b]}.{ch}.{v}">{html.escape(shown)}</a>'


def build(main_db):
    """Builds ane.db, its pictures and its note_sources row (replaced). Returns (entries, with excerpts, photos,
    verses linked)."""
    DL.mkdir(parents=True, exist_ok=True)
    finds.last_verses(main_db)
    pins = json.loads(PINS.read_text()) if PINS.exists() else {}
    texts = {k: (wikisource(w, pins) if kind == "ws" else gutenberg(w, pins)) for k, (kind, w, _) in TRANSLATIONS.items()}
    arts = articles([a[0] for a in ENTRIES], pins)
    images = {a[0]: (a[2] if a[2] is not None else arts[a[0]][2]) for a in ENTRIES}
    finds.commons(images.values(), DL)
    shutil.rmtree(finds.IMAGES / "ane", ignore_errors=True)     # (Written anew: no picture of an entry gone left behind)
    e = html.escape
    entries, photos, quoted = [], {}, 0
    for art, title, _, what, line, parallels in ENTRIES:
        wtitle, wikitext, _ = arts[art]
        eid = wtitle.replace(" ", "_")
        out = [f"<p>{e(what)}</p>"]
        spans, used = [], set()
        for passages, why, keys in parallels:
            refs = [r for part in re.split(r";\s*(?=(?:[1-3]\s)?[A-Z])", passages) for r in finds.references(part)]     # (A book at a time: "Judges 1:21; 2 Samuel 5:6" read whole would take "; 2" for a verse)
            if not refs:
                raise SystemExit(f"{title}: no passage read in {passages!r}")
            spans += [sp for _, osis, _ in refs for sp in tyndale_dict.verse_spans(osis)]
            out.append('<div class="gHead">' + "; ".join(link(osis, shown) for _, osis, shown in refs) + "</div>")
            out.append(f"<p>{e(why)}</p>")
            for k in keys:
                src, first, last, how, label = EXCERPTS[k]
                used.add(src)
                out.append(f"<blockquote>{excerpt(texts[src], first, last, how)}"
                           f"<p><small>{e(label + ' - ' if label else '')}{e(TRANSLATIONS[src][2])}</small></p></blockquote>")
        lead = [p for p in (re.sub(r"\[\[(?:File|Image):[^\[\]]*\]\]\s*", "", t).strip() for t in finds.lead(wikitext)) if p]     # (A picture's markup the lead left: gone)
        if lead:
            out.append('<div class="gHead">From Wikipedia</div>')
            out += [f"<p>{e(t)}</p>" for t in lead]
        out.append(f"<p><i>Text from Wikipedia: {e(wtitle)} (CC BY-SA 4.0).</i></p>")
        quoted += bool(used)
        pic = finds.pictures(images[art], pins, "ane", eid, DL)
        if pic:
            photos[eid] = pic
        entries.append((eid, title, "".join(out), line[:200], len(tyndale_dict.verses_in(spans)), spans))
    entries.sort(key=lambda a: a[1].lower())
    PINS.write_text(json.dumps(pins, indent=1, ensure_ascii=False) + "\n")
    data = finds.write(OUT, entries, {}, SOURCE, photos)
    finds.register(main_db, SOURCE, "data/notes/ane.db", data)
    linked = len(tyndale_dict.verses_in([sp for a in entries for sp in a[5]]))
    print(f"ane: {len(entries)} entries, {quoted} with excerpts, {len(photos)} photos, {linked} verses linked, "
          f"{len(data) / 1e6:.2f} MB")
    return len(entries), quoted, len(photos), linked


if __name__ == "__main__":
    con = sqlite3.connect(HERE.parent / "public" / "data" / "cotext.db")
    with con:
        build(con)
    con.close()
