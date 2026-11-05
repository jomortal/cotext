"""Pictures for the Tyndale Open Bible Dictionary's articles (tyndale_dict.py's tobd.db; drawn by src/dictionary.ts):
a photo of a place's site, a photo of a plant, animal or object, a public-domain artwork of a person or event - and,
for a place, the atlas' map of it at the top of the opened article. Matched conservatively: no picture rather than a
wrong one.

  Places - an article whose words TIPNR names as a place (tyndale_dict's lemmas: its Strong's keys) and whose
    headword (headword_keys; not a "(Person)" one) is the name of one of the atlas' places those words name (atlas.db's
    words; the name the atlas shows or any OpenBible gives it in a translation) - the one the most of its words name.
    An inverted headword only as read straight ("Galilee, Sea of": the Sea of Galilee, not Galilee; "Jerusalem, New"
    none). The atlas' own name before a translation's (Rhodes the island, not Dedan, which a translation calls Rhodes).
    An article on several places (its text opening "1."), one whose headword has a "(Place)" article of its own (Iron
    the metal), NOT_PLACES, on a person too (a name TIPNR has as both, unless its
    headword says "(Place)") or qualified otherwise ("Adar (Month)") is left out. Its map: that place as atlas.db has it (maps).
    Its photo: OpenBible's own for the place (ancient.jsonl's media.thumbnail, a Commons file picked by OpenBible.info
    for it), else the one OpenBible gives its most likely modern site (modern.jsonl) when that site's score is 500 or
    more (half of scholarship or better) - OpenBible's line on what it shows ("Ruins at Tell es Sultan") before the
    credit. (OpenBible's choice over Wikidata's image: picked for the Bible's place, not the modern town.)
  Plants, animals and objects - THINGS, matched (generated): an article -> the English Wikipedia article on what it is
    (Ibex -> Nubian ibex, Hyssop -> Origanum syriacum); its Wikidata item's image (P18). Names whose identity is
    uncertain (Behemoth, Lily, Antelope...) or whose modern form misleads (Harp, Sword) are left out.
  People and events - ARTWORK, matched (generated): an article -> a Commons file of Gustave Doré's Bible engravings (1866,
    public domain: "Doré's English Bible" and his New Testament plates). An article on several people only when the
    picture is of its first ("1.").
Every picture from Wikimedia Commons under a free licence only (finds.pictures: CC0, public domain, CC BY, CC BY-SA),
its Commons thumbnail pinned by SHA-256 and the Wikidata resolutions (THINGS) by item and file in
tobd_pictures_pins.json - written on the first run, kept after (delete an entry to resolve it again).

Pictures are online only: files on the server, never in the downloaded tobd.db - public/data/images/tobd/<id>.jpg
(1200 px on the long side, quality 60) and <id>.t.jpg (160 px, quality 55: the lists' thumbnail).
Output, added to public/data/notes/tobd.db (tyndale_dict.build writes it anew: run this after it):
  photos  id -> src (the thumbnail's path under public/: data/images/tobd/<id>.t.jpg), credit (what it shows for a
          place; author, licence, "Wikimedia Commons"), full (the full picture's path)
  maps    id -> place (JSON: atlas.db's places row - id, name, sub, type, lon, lat, score, alts, note - for atlas.ts'
          wordMap)
and tobd's note_sources row's version and bytes updated.

Run on its own: python3 pipeline/tobd_pictures.py (tobd.db and atlas.db built, the main database's words read; then
split_db.py - npm run build does it); build_db.py runs build() after atlas. --list prints the matches without
fetching a picture.
"""
import json
import pathlib
import re
import shutil
import sqlite3
import sys
import urllib.parse
import urllib.request
from collections import Counter, defaultdict

HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE))
import atlas  # noqa: E402
import finds  # noqa: E402
import tyndale_dict  # noqa: E402

DL = HERE / "downloads" / "notes" / "tobd_pictures"
PINS = HERE / "tobd_pictures_pins.json"
OBGEO = atlas.DL / "obgeo"
WIKIDATA = "https://www.wikidata.org/w/api.php"
# Articles the rules match that aren't on a place: the Egyptian of Acts 21:38, the cherubim (the place Kerub), Jaar
# ("forest"), the tabernacle's Holy Place and Most Holy Place
NOT_PLACES = {"Egyptianthe", "CherubCherubim", "Jaar", "HolyPlace", "MostHolyPlace"}
SITE_MIN = 500     # A modern site's photo only when its score (0-1000) is at least this

# ---- Plants, animals and objects: article id -> English Wikipedia article ----
THINGS = {
    # Plants
    "Acacia": "Vachellia tortilis", "ShittahTree": "Vachellia tortilis", "ShittimWood": "Vachellia tortilis",
    "Almond": "Almond", "Hazel": "Almond", "Anemone": "Anemone coronaria", "Anise": "Dill", "Dill": "Dill",
    "Barley": "Barley", "BayTree": "Laurus nobilis", "Broom": "Retama raetam", "Juniper": "Retama raetam",
    "Camphire": "Lawsonia inermis", "Henna": "Lawsonia inermis", "CaperPlant": "Capparis spinosa",
    "CarobTree": "Ceratonia siliqua", "Cassia": "Cinnamomum cassia", "Cedar": "Cedrus libani",
    "Chestnut": "Platanus orientalis", "PlaneTree": "Platanus orientalis", "Cinnamon": "Cinnamon",
    "Coriander": "Coriander", "Cotton": "Cotton", "Cucumber": "Cucumber", "Cummin": "Cumin",
    "Cypress": "Cupressus sempervirens", "DateDatePalm": "Date palm", "Palm": "Date palm",
    "Ebony": "Diospyros ebenum", "FigFigTree": "Common fig", "Flax": "Flax", "Galbanum": "Galbanum",
    "Garlic": "Garlic", "Grape": "Grape", "Hyssop": "Origanum syriacum", "Leek": "Leek", "Lentils": "Lentil",
    "Mandrake": "Mandragora autumnalis", "Marjoram": "Origanum syriacum", "Mastic": "Pistacia lentiscus",
    "Melon": "Melon", "Millet": "Proso millet", "Pannag": "Proso millet", "Mint": "Mentha",
    "Mulberry": "Morus nigra", "Sycamine": "Morus nigra", "Mustard": "Brassica nigra",
    "Myrrh": "Commiphora myrrha", "Myrtle": "Myrtus communis", "NarcissusPlant": "Narcissus tazetta",
    "Nard": "Nardostachys jatamansi", "Spikenard": "Nardostachys jatamansi", "Oak": "Quercus calliprinos",
    "OliveOliveTree": "Olive", "Onion": "Onion", "Papyrus": "Cyperus papyrus", "Pistachio": "Pistacia vera",
    "Pomegranate": "Pomegranate", "Rue": "Ruta chalepensis", "Saffron": "Crocus sativus", "Spelt": "Spelt",
    "Rie": "Spelt", "StoraxTree": "Styrax officinalis", "SweetStorax": "Styrax officinalis",
    "Sycamore": "Ficus sycomorus", "Tamarisk": "Tamarix aphylla", "Terebinth": "Pistacia palaestina",
    "Teil": "Pistacia palaestina", "Elm": "Pistacia palaestina", "Walnut": "Juglans regia", "Wheat": "Wheat",
    # Animals and birds
    "Ant": "Ant", "Asp": "Egyptian cobra", "Ass": "Donkey", "Donkey": "Donkey", "Bat": "Bat",
    "BearAnimal": "Syrian brown bear", "Bee": "Western honey bee", "Boar": "Wild boar", "Camel": "Dromedary",
    "Dromedary": "Dromedary", "Cattle": "Cattle", "Cow": "Cattle", "Kine": "Cattle", "Ox": "Ox",
    "Chameleon": "Common chameleon", "Chicken": "Chicken", "Cock": "Rooster",
    "Coney": "Rock hyrax", "RockBadger": "Rock hyrax", "Cormorant": "Great cormorant",
    "Crocodile": "Nile crocodile", "Dog": "Dog", "Dove": "Rock dove", "Pigeon": "Rock dove",
    "Turtledove": "European turtle dove", "Eagle": "Golden eagle", "CarrionVulture": "Egyptian vulture",
    "GierEagle": "Egyptian vulture", "Falcon": "Peregrine falcon", "Flea": "Flea", "Fly": "Housefly",
    "Fox": "Red fox", "Frog": "Frog", "Gazelle": "Mountain gazelle", "Gecko": "Mediterranean house gecko",
    "Ferret": "Mediterranean house gecko", "Goat": "Goat", "Grasshopper": "Grasshopper", "Gull": "Gull",
    "Seagull": "Gull", "Cuckow": "Gull", "Hare": "Hare", "Hedgehog": "Hedgehog", "Heron": "Grey heron",
    "Hippopotamus": "Hippopotamus", "Hoopoe": "Eurasian hoopoe", "Lapwing": "Eurasian hoopoe",
    "Hornet": "Oriental hornet", "Horse": "Horse", "Hyena": "Striped hyena", "Ibex": "Nubian ibex",
    "Ibis": "African sacred ibis", "Jackal": "Golden jackal", "Kite": "Black kite", "Leech": "Leech",
    "Leopard": "Leopard", "Panther": "Leopard", "Lion": "Asiatic lion", "Locusts": "Desert locust",
    "BaldLocust": "Desert locust", "Mouse": "House mouse", "Mule": "Mule", "Ossifrage": "Bearded vulture",
    "Ostrich": "Common ostrich", "Partridge": "Sand partridge", "Peacock": "Indian peafowl",
    "Pelican": "Great white pelican", "Pig": "Pig", "Swine": "Pig", "Porcupine": "Indian crested porcupine",
    "Quail": "Common quail", "Raven": "Common raven", "Scorpion": "Scorpion", "Sheep": "Sheep",
    "Sparrow": "House sparrow", "Stork": "White stork", "Swallow": "Barn swallow", "Vulture": "Griffon vulture",
    "WildOx": "Aurochs", "Unicorn": "Aurochs", "Wolf": "Wolf",
    # Stones and metals
    "Agate": "Agate", "Alabaster": "Alabaster", "Amethyst": "Amethyst", "Asphalt": "Bitumen",
    "Bitumen": "Bitumen", "Beryl": "Beryl", "Brimstone": "Sulfur", "Sulfur": "Sulfur", "Bronze": "Bronze",
    "Chalcedony": "Chalcedony", "ChrysopraseChrysoprasus": "Chrysoprase", "Copper": "Copper",
    "Coral": "Corallium rubrum", "Flint": "Flint", "Gold": "Gold", "Iron": "Iron", "LapisLazuli": "Lapis lazuli",
    "Lead": "Lead", "Marble": "Marble", "Silver": "Silver", "Tin": "Tin",
    # Objects
    "BatteringRam": "Battering ram", "Lyre": "Lyre",
    "RamsHorn": "Shofar", "Shophar": "Shofar", "Sistrum": "Sistrum", "SlingSlinger": "Sling (weapon)",
    "Mill": "Millstone", 
}

# ---- People and events: article id -> a Commons file of Doré's Bible engravings ----
ARTWORK = {
    "Creation": "001.The Creation of Light.jpg", "Eve": "002.The Creation of Eve.jpg",
    "AdamPerson": "003.Adam and Eve Are Driven out of Eden.jpg", "AbelPerson": "004.Cain and Abel Offer Their Sacrifices.jpg",
    "CainPerson": "005.Cain Slays Abel.jpg", "Floodthe": "007.The Great Flood.jpg",
    "Noah": "008.A Dove Is Sent Forth from the Ark.jpg", "Babel": "010.The Tower of Babel.jpg",
    "TowerofBabel": "010.The Tower of Babel.jpg", "Abraham": "012.Abraham and the Three Angels.jpg",
    "Ishmael": "014.Abraham Sends Hagar and Ishmael Away.jpg", "Hagar": "015.Hagar and Ishmael in the Wilderness.jpg",
    "Sarah": "017.The Burial of Sarah.jpg", "Eliezer": "018.Eliezer and Rebekah at the Well.jpg",
    "Isaac": "020.Isaac Blesses Jacob.jpg", "JacobsLadder": "021.Jacob's Dream.jpg",
    "Rachel": "022.Jacob Tends Laban's Flocks and Meets Rachel.jpg", "Jacob": "024.Jacob Wrestles with the Angel.jpg",
    "Esau": "025.Jacob and Esau Meet.jpg", "Joseph": "028.Joseph Reveals Himself to His Brothers.jpg",
    "Aaron": "032.Moses and Aaron Appear before Pharaoh.jpg", "PlaguesuponEgypt": "034.The Ninth Plague. Darkness.jpg",
    "Exodusthe": "037.The Egyptians Drown in the Sea.jpg", "Moses": "039.Moses Comes Down from Mount Sinai.jpg",
    "CalfGolden": "041A.Moses Breaks the Tables of the Law.jpg", "BronzeSerpentBronzeSnake": "042.The Bronze Serpent.jpg",
    "Balaam": "043.An Angel Appears to Balaam.jpg", "RahabPerson": "047.Joshua Spares Rahab.jpg",
    "AchanAchar": "048.Achan Is Stoned to Death.jpg", "JoshuaPerson": "051.Joshua Commands the Sun to Stand Still.jpg",
    "Jael": "052.Jael Kills Sisera.jpg", "Sisera": "052.Jael Kills Sisera.jpg",
    "Gideon": "054.Gideon Chooses 300 Soldiers.jpg", "Jephthah": "058.Jephthah's Daughter Comes to Meet Her Father.jpg",
    "Samson": "064.The Death of Samson.jpg", "Delilah": "063.Samson and Delilah.jpg",
    "Naomi": "068.Naomi and Her Daughters-in-Law.jpg", "RuthPerson": "069.Ruth and Boaz.jpg",
    "BoazPerson": "069.Ruth and Boaz.jpg", "SamuelPerson": "070A.Samuel Blesses Saul.jpg",
    "Agag": "071.The Death of Agag.jpg", "Goliath": "071A.David Slays Goliath.jpg", "David": "071A.David Slays Goliath.jpg",
    "Absalom": "080.The Death of Absalom.jpg", "Rizpah": "082.Rizpah’s Kindness toward the Dead.jpg",
    "Abishai": "083.Abishai Saves David's Life.jpg", "SolomonPerson": "084.The Judgment of Solomon.jpg",
    "Elijah": "095.Elijah Ascends to Heaven in a Chariot of Fire.jpg", "Ahab": "093.The Death of Ahab.jpg",
    "Jezebel": "097.The Death of Jezebel.jpg", "Athaliah": "099.The Death of Athaliah.jpg",
    "Sennacherib": "101.Sennacherib's Army Is Destroyed.jpg",
    "Zedekiah": "102.Zedekiah's Sons Are Slaughtered before His Eyes.jpg",
    "CyrustheGreat": "104.Cyrus Restores the Vessels of the Temple.jpg",
    "Artaxerxes": "106.Artaxerxes Grants Freedom to the Jews.jpg", "EzraPerson": "109.Ezra Reads the Law to the People.jpg",
    "NehemiahPerson": "108.Nehemiah Views the Ruins of Jerusalem's Walls.jpg",
    "Tobias": "110.Tobias and the Angel.jpg", "Vashti": "114.Queen Vashti Refuses to Obey Ahasuerus' Command.jpg",
    "EstherPerson": "115.Esther Before the King.jpg", "Mordecai": "116.The Triumph of Mordecai.jpg",
    "Haman": "117.Esther Accuses Haman.jpg", "JobPerson": "118.Job Hears of His Misfortunes.jpg",
    "IsaiahPerson": "120.The Prophet Isaiah.jpg", "Leviathan": "122.The Destruction of Leviathan.jpg",
    "Baruch": "123.Baruch Writes Jeremiah's Prophecies.jpg", "JeremiahPerson": "123.The Prophet Jeremiah.jpg",
    "EzekielPerson": "126.The Prophet Ezekiel.jpg", "DanielPerson": "131.Daniel in the Lions' Den.jpg",
    "ShadrachMeshachandAbednego": "129.Shadrach, Meshach and Abednego in the Furnace.jpg",
    "Belshazzar": "130.Daniel Interprets the Writing on the Wall.jpg", "AmosPerson": "136.The Prophet Amos.jpg",
    "JonahPerson": "137.Jonah Is Spewed Forth by the Whale.jpg", "Mattathias": "141.Mattathias and the Apostate.jpg",
    "Heliodorus": "147.Heliodorus Is Cast Down.jpg",
    # The New Testament
    "Mary": "Gustave Dore - The Annunciation.jpg", "Annunciation": "Gustave Dore - The Annunciation.jpg",
    "JesusChrist": "Dore Bible Sermon on the Mount.jpg",
    "JohntheBaptist": "DoreJohntheBaptistPreachingintheWilderness.jpg",
    "BaptismofJesus": "Gustave Dore - John the Baptist baptizes Jesus.jpg",
    "Transfiguration": "Gustave Dore - The Transfiguration.jpg",
    "TriumphalEntry": "Gustave Dore - Jesus rides into Jerusalem on a donkey on Palm Sunday.jpg",
    "LordsSupperthe": "Jesus and the disciples at the Last Supper.jpg",
    "Judas": "Gustave Dore - Judas betrays Jesus with a kiss.jpg", "Crucifixion": "Crucifixion-dore.jpg",
    "AscensionofChrist": "Gusta Dore - The Ascension.jpg", "Lazarus": "Gustave Dore Lazarus and the Rich Man.jpg",
    "Martha": "Jesus talks with Mary and Martha in their house.jpg",
    "PilatePontius": "Christ Presented to the PeopleDore.jpg", "Ananias": "DoreDeathofAnanias.jpg",
    "Stephen": "The Death of Stephen by Gustave Doré.jpg", "Cornelius": "StPeterattheHouseofCornelius.jpg",
    "PetertheApostle": "Gustave Doré, St Peter Denying Christ.jpg",
    "PaultheApostle": "DoreStPaulPreachingtotheThessalonians.jpg",
}


def get(url, params):
    """A Wikimedia API call's JSON (finds.fetched: one at a time, waiting when throttled)."""
    return json.loads(finds.fetched(urllib.request.Request(
        url + "?" + urllib.parse.urlencode(params | {"format": "json", "formatversion": 2}), headers=finds.UA)))


def commons_file(url):
    """A Commons page URL's file name (https://commons.wikimedia.org/wiki/File:Jerycho11.jpg -> Jerycho11.jpg)."""
    return urllib.parse.unquote(url.split("/wiki/File:", 1)[1]).replace("_", " ") if url and "/wiki/File:" in url else ""


def shown(desc):
    """OpenBible's line on what a photo shows, as a sentence ("ruins at <modern ...>Tell es Sultan</modern>" ->
    "Ruins at Tell es Sultan.")."""
    d = re.sub(r"<[^>]+>", "", desc or "").strip().rstrip(".")
    return d[:1].upper() + d[1:] + ". " if d else ""


# ---- Places ----

def places(tobd, main_db):
    """The place articles: {article id: (atlas place row as a dict, Commons file or '', what it shows)} (the module's
    docstring gives the rules)."""
    tip = tyndale_dict.tipnr()
    adb = sqlite3.connect(atlas.OUT / "atlas.db")
    cols = [c[1] for c in adb.execute("PRAGMA table_info(places)")]
    rows = {r[0]: dict(zip(cols, r)) for r in adb.execute("SELECT * FROM places")}
    at = {(b, c, v, w): p for b, c, v, w, p in adb.execute("SELECT book, chapter, verse, word, place FROM words")}
    adb.close()
    named = defaultdict(Counter)     # (strong -> place -> how many of its words name it)
    for b, c, v, w, s in main_db.execute("SELECT book, chapter, verse, word, strong FROM words WHERE book <= 66"):
        p = at.get((b, c, v, w))
        if p:
            named[s][p] += 1
    ancient = {}
    for line in (OBGEO / "ancient.jsonl").read_text(encoding="utf-8").splitlines():
        d = json.loads(line)
        ancient[d["id"]] = d
    modern = {}
    for line in (OBGEO / "modern.jsonl").read_text(encoding="utf-8").splitlines():
        d = json.loads(line)
        modern[d["id"]] = d
    names = {i: {n.lower() for n in (d.get("translation_name_counts") or {})} for i, d in ancient.items()}
    keys = defaultdict(set)
    for s, ids in tobd.execute("SELECT strong, ids FROM lemmas"):
        for i in ids.split():
            keys[i].add(s)
    arts = tobd.execute("SELECT id, title, line FROM articles").fetchall()
    placed = {tuple(tyndale_dict.headword_keys(t)[0]) for _, t, _ in arts if tyndale_dict.headword_keys(t)[1] == "place"}
    out = {}
    for aid, title, line in arts:
        heads, qual = tyndale_dict.headword_keys(title)
        if len(heads) == 2 and heads[1].endswith(" " + heads[0]):     # (Galilee, Sea of: only the Sea of Galilee)
            heads = heads[1:]
        if aid in NOT_PLACES or (qual == "" and tuple(heads) in placed):     # (Iron the metal: Iron (Place) is the place)
            continue
        kinds = {tip[s][0] for s in keys.get(aid, ()) if s in tip}
        ks = [s for s in keys.get(aid, ()) if tip.get(s, ("",))[0] == "place"]
        if qual not in ("", "place") or not ks or ("person" in kinds and qual != "place") or re.match(r"1\.", line):
            continue
        found = Counter()
        for s in ks:
            found.update(named.get(s, {}))
        fit = [p for p, _ in found.most_common() if rows[p]["name"].lower() in heads] or \
              [p for p, _ in found.most_common() if names.get(p, set()) & set(heads)]
        if not fit:
            continue
        p = fit[0]
        d = ancient.get(p, {})
        thumb = (d.get("media") or {}).get("thumbnail") or {}
        if not thumb:
            sites = sorted((d.get("modern_associations") or {}).items(), key=lambda x: -x[1].get("score", 0))
            if sites and sites[0][1].get("score", 0) >= SITE_MIN:
                thumb = (modern.get(sites[0][0], {}).get("media") or {}).get("thumbnail") or {}
        out[aid] = (rows[p], commons_file(thumb.get("credit_url")), shown(thumb.get("description")))
    return out


# ---- Plants, animals and objects ----

def things(pins):
    """THINGS resolved: {article id: Commons file} - each English Wikipedia article's Wikidata item and its image
    (P18), pinned in pins["things"][article id] = [title, item, file] (re-resolved when THINGS gives another title)."""
    done = pins.setdefault("things", {})
    todo = sorted({t for a, t in THINGS.items() if done.get(a, [None])[0] != t})
    item = {}
    for i in range(0, len(todo), 50):
        q = get(finds.API, {"action": "query", "titles": "|".join(todo[i:i + 50]), "redirects": 1, "prop": "pageprops",
                            "ppprop": "wikibase_item"})["query"]
        to = {r["from"]: r["to"] for r in q.get("normalized", []) + q.get("redirects", [])}
        pages = {p["title"]: p for p in q["pages"]}
        for t in todo[i:i + 50]:
            u = t
            while u in to:
                u = to[u]
            item[t] = pages.get(u, {}).get("pageprops", {}).get("wikibase_item", "")
    qids = sorted({q for q in item.values() if q})
    image = {}
    for i in range(0, len(qids), 50):
        ents = get(WIKIDATA, {"action": "wbgetentities", "ids": "|".join(qids[i:i + 50]), "props": "claims"})["entities"]
        for q, e in ents.items():
            p18 = (e.get("claims") or {}).get("P18") or []
            image[q] = p18[0]["mainsnak"].get("datavalue", {}).get("value", "") if p18 else ""
    for a, t in THINGS.items():
        if done.get(a, [None])[0] != t:
            done[a] = [t, item.get(t, ""), image.get(item.get(t, ""), "")]
    for a in list(done):
        if a not in THINGS:
            del done[a]
    return {a: f for a, (_, _, f) in done.items() if f}


# ---- Writing ----

def build(main_db, listing=False):
    """Adds the photos and maps tables to tobd.db (replaced) and updates its note_sources row. Returns (place
    photos, thing photos, artworks, maps, bytes on the server)."""
    tobd = sqlite3.connect(tyndale_dict.OUT)
    titles = dict(tobd.execute("SELECT id, title FROM articles"))
    for a in list(THINGS) + list(ARTWORK):
        if a not in titles:
            raise SystemExit(f"tobd_pictures: no article {a}")
    DL.mkdir(parents=True, exist_ok=True)
    pins = json.loads(PINS.read_text()) if PINS.exists() else {}
    place = places(tobd, main_db)
    thing = things(pins)
    if listing:
        for a, (p, f, what) in sorted(place.items()):
            print(f"PLACE {titles[a]} -> {p['name']} ({p['id']}, {p['score']}) | {what}{f}")
        for a, f in sorted(thing.items()):
            print(f"THING {titles[a]} -> {pins['things'][a][0]} | {f}")
        for a, f in sorted(ARTWORK.items()):
            print(f"ART {titles[a]} -> {f}")
        PINS.write_text(json.dumps(pins, indent=1, ensure_ascii=False, sort_keys=True) + "\n")
        return
    want = {a: (f, what) for a, (_, f, what) in place.items() if f}
    want |= {a: (f, "") for a, f in thing.items()} | {a: (f, "") for a, f in ARTWORK.items()}
    finds.commons({f for f, _ in want.values()}, DL)
    shutil.rmtree(finds.IMAGES / "tobd", ignore_errors=True)     # (Written anew: no picture of an article gone left behind)
    photos, counts = {}, Counter()
    for a, (f, what) in sorted(want.items()):
        pic = finds.pictures(f, pins, "tobd", a, DL, thumb_file=True)
        if pic:
            kind = "art" if a in ARTWORK else "thing" if a in thing else "place"
            credit = pic[1].replace("Photo:", "Engraving:", 1) if kind == "art" else what + pic[1]
            photos[a] = (pic[0], credit, pic[2])
            counts[kind] += 1
    pins.get("images", {}).pop("", None)
    PINS.write_text(json.dumps(pins, indent=1, ensure_ascii=False, sort_keys=True) + "\n")
    maps = {a: json.dumps({k: p[k] for k in ("id", "name", "sub", "type", "lon", "lat", "score", "alts", "note")},
                          ensure_ascii=False) for a, (p, _, _) in place.items() if p["lon"] is not None}
    tobd.executescript("DROP TABLE IF EXISTS photos; DROP TABLE IF EXISTS maps;"
                       "CREATE TABLE photos (id TEXT PRIMARY KEY, src TEXT, credit TEXT, full TEXT) WITHOUT ROWID;"
                       "CREATE TABLE maps (id TEXT PRIMARY KEY, place TEXT) WITHOUT ROWID;")
    tobd.executemany("INSERT INTO photos VALUES (?,?,?,?)", [(i, *p) for i, p in sorted(photos.items())])
    tobd.executemany("INSERT INTO maps VALUES (?,?)", sorted(maps.items()))
    tobd.commit()
    tobd.execute("VACUUM")
    tobd.close()
    finds.register(main_db, tyndale_dict.SOURCE, "data/notes/tobd.db", tyndale_dict.OUT.read_bytes())
    size = sum(f.stat().st_size for f in (finds.IMAGES / "tobd").iterdir())
    print(f"tobd pictures: {counts['place']} places, {counts['thing']} plants, animals and objects, {counts['art']} "
          f"artworks; {len(maps)} maps; {size / 1e6:.1f} MB on the server")
    return counts["place"], counts["thing"], counts["art"], len(maps), size


if __name__ == "__main__":
    con = sqlite3.connect(HERE.parent / "public" / "data" / "cotext.db")
    with con:
        build(con, listing="--list" in sys.argv)
    con.close()
