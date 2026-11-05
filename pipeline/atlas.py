"""The Atlas: the Bible's places on a map, by word and by passage (src/atlas.ts). By word: a place's name tapped (either
word panel) shows "Map" - the place marked on a small map, its name, how sure the identification is and the other
sites proposed. By passage: "Atlas" in the notes' picker (its own MAPS group) - the places named in the verses the
notes show, each a point with its name, a list under the map going to the verses. Three base maps to compare, picked
under the map (kept on the device): Natural Earth, Ancient World (AWMC) and Roman Empire (DARE).

Places - OpenBible.info's Bible Geocoding Data (CC BY 4.0; github.com/openbibleinfo/Bible-Geocoding-Data at COMMIT):
  data/ancient.jsonl, a place a line - every place the Bible names, its identifications with modern sites, each site's
  score (modern_associations: 0-1000, the current scholarship's confidence, a place's summing to at most 1000) and
  coordinates (identifications' resolutions: lonlat at modern_basis_id), and its linked data - among them STEPBible's
  TIPNR name ("Bethlehem@Gen.35.16", source s3b25cf).
Words - STEPBible's TIPNR (CC BY 4.0; the file tyndale_dict.py fetches, at fetch.py's pinned commit): each PLACE
  record ("Bethlehem@Gen.35.16-Jhn=H1035G") with the Strong's keys it's written with - its "– Named", "– Greek",
  "– Spelled", "– Group" lines: key (H1035G, G0965, the gentilic H1022), the verses it's in there (TIPNR's book
  codes are the main database's). A TIPNR name is OpenBible's with the range's end ("-Jhn") dropped.
Matching the text's words (the main database's words) to places, word by word:
  - OT and NT (books 1-66): the records written with the word's exact key; none - the text's key a letter apart from
    TIPNR's (Ephrathah H0672G, TIPNR's H0672H) - those whose key has the same number. Of those, the ones TIPNR lists
    in this verse for that key (none: not a place here - Acts 13:10's "straight" isn't Straight Street); several, the
    one with the most verses.
  - The Septuagint (67 on: its own numbering, Greek keys): the exact key's record with the most verses.
  - A Greek key counts only when its lemma is capitalized (a proper name: εὐθύς is no place).
  - The record's OpenBible places: by TIPNR name - or, for a name TIPNR has changed since (Jerusalem@Gen.14.18,
    OpenBible's Jerusalem@Jos.10.1), the place sharing one of its English names that's in the most of its verses.
    Several (one record for Bethlehem, Lehem and Ephrathah; Bethel and Luz): the one listing this verse, then the
    one the translations call by the name TIPNR gives the word here, then the most cited.
  Each word that names a place is a row (book, chapter, verse, word, place) - בֵּית לֶחֶם both its words.
Places as shown: the name the translations use most (translation_name_counts), OpenBible's comment's first clause as a line
under it when short ("in Pisidia"), the type (settlement, region, river...); the most likely site's point and score as the confidence
(score / 10 %, "100%" for no dispute); the other proposed sites (score > 0, at most ALTS) as points too. A place
OpenBible can't locate (the Garden of Eden: a "special" resolution) has no point and says why (note).

Base maps - each its own file, data/notes/atlas_<id>.db, downloaded when first shown:
  ne    Natural Earth (public domain; naturalearthdata.com): 10m land, lakes and rivers (nvkelso/natural-earth-vector
        at NE_COMMIT) and the 1:50m shaded relief (SR_50M, naciscdn.org, pinned by hash) - the modern coastlines.
  awmc  Ancient World Mapping Center (ODbL 1.0 - its README and LICENSE.txt; derived from the Barrington Atlas and
        OpenStreetMap; github.com/AWMC/geodata at AWMC_COMMIT): the ancient open water (the seas as the Barrington Atlas
        draws them), inland water (lakes, marshes), roads, and the Roman provinces' borders of 200 CE.
  dare  Digital Atlas of the Roman Empire (Johan Åhlfeldt; CC BY-SA 3.0 - its atlas page, imperium.ahlfeldt.se;
        GeoJSON from its vector map, github.com/klokantech/roman-empire at DARE_COMMIT): the provinces, shaded and
        named, and the roads; Natural Earth's land and lakes under them. Offered only in the Roman eras.
  AWMC's roads are kept by the Barrington Atlas' periods (its timeperiod letters: A archaic, C classical, H
  hellenistic, R Roman, L late antique), so the page draws only the era's (atlas_eras.ERAS).
  Every layer clipped to BOX (Spain to Persia, Ethiopia to Scythia), simplified for each zoom level (Douglas-Peucker
  at LEVELS' tolerances, in degrees: the page draws the coarsest level finer than one screen pixel, so nothing is
  drawn finer than the screen shows) and stored as paths (encode: points at 1/1000 degree, delta and zigzag varints).
  The relief as 8-bit grey PNGs at two sizes, 128 the flat ground (the page lays it over the land in soft-light).
Output:
  public/data/notes/atlas.db
    places  id (OpenBible's: a112427), name, sub (the comment as text), type, lon, lat (null: not located), score
            (0-1000), alts (JSON [[name, lon, lat, score], ...]), note (why not located)
    words   book, chapter, verse, word -> place
    maps    id, name, credit, file, version, bytes, eras (the base maps, in the picker's order: their rowid; eras
            the ones it's offered in, '' every book - MAPS)
    eras, era_regions, era_books   POLITICAL BOUNDARIES (pipeline/atlas_eras.py, drawn by hand: its docstring) - each
            era (id, name, roads: the AWMC road periods drawn in it, roman, credit), its regions in drawing order
            (era, name, color, lon, lat: where the name's written, data: its rings as encode's paths) and the chapters
            it's for (book, first, last chapter, era)
    routes, route_stops   ROUTES (pipeline/atlas_routes.py, written from the text) - each route (id, books: the
            book ids it's offered in, name) and its stops in order (route, n, place, book, chapter, verse: the verse
            naming it); a stop's place is in places even when no word is matched to it
  public/data/notes/atlas_<map>.db
    shapes  layer (land, lake, river, water, road, border, province), level (0 coarsest - LEVELS), name (a
            province's; an AWMC road's periods, "HR" - "" undated), data (encode's paths)
    labels  layer, name, lon, lat (a province's name, where it's written)
    relief  level (0 coarse, 1 fine), west, south, east, north (degrees: the image's outer edges), png
  and the main database's note_sources row (kind 'atlas', testaments 'OT NT LXX': the notes' picker lists it as
  "Atlas"; notes.py keeps it on a notes-only rebuild).

Run on its own: python3 pipeline/atlas.py (the main database already built: its words read, its note_sources row
written); build_db.py runs build() after tyndale_dict (whose TIPNR file it reads).
"""
import hashlib
import json
import pathlib
import re
import sqlite3
import struct
import sys
import urllib.request
import zipfile
import zlib

HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE))
import tyndale_dict  # noqa: E402
import atlas_eras  # noqa: E402
import atlas_routes  # noqa: E402

DL = HERE / "downloads" / "atlas"
OUT = HERE.parent / "public" / "data" / "notes"
COMMIT = "7eb18a5ee62f27b9b93bd6689ea272d76dd23b8f"            # OpenBible's Bible Geocoding Data, 2021-11-01
NE_COMMIT = "ca96624a56bd078437bca8184e78163e5039ad19"         # nvkelso/natural-earth-vector, 2026-11-04
AWMC_COMMIT = "7ecf8bccea2efe1e1e9df2daf6001942de73fb87"       # AWMC/geodata, 2024-04-22
DARE_COMMIT = "a140f13cd65f8ba7e2275de813bfa0aa2049b786"       # klokantech/roman-empire, 2020-10-23
GH = "https://raw.githubusercontent.com/"
# Each download: its file under DL, its URL and its SHA-256 (a changed file stops the build: checked by hand before
# its hash is changed here).
FILES = {
    "obgeo/ancient.jsonl": (f"{GH}openbibleinfo/Bible-Geocoding-Data/{COMMIT}/data/ancient.jsonl",
                            "b8187aa4737e8517ccc090f765d2be11da4c548cd2a59d3cdcb62e952cb8c0f2"),
    "ne/ne_10m_land.geojson": (f"{GH}nvkelso/natural-earth-vector/{NE_COMMIT}/geojson/ne_10m_land.geojson",
                               "1ac90796408bc6ad6911d69448485d3c4dbf2190370080368a09976e1c9f7416"),
    "ne/ne_10m_lakes.geojson": (f"{GH}nvkelso/natural-earth-vector/{NE_COMMIT}/geojson/ne_10m_lakes.geojson",
                                "2d036f53dedec578001c5c30c2959ee7d4eebc1306900fa4367c49929ec8f2d9"),
    "ne/ne_10m_rivers_lake_centerlines.geojson": (
        f"{GH}nvkelso/natural-earth-vector/{NE_COMMIT}/geojson/ne_10m_rivers_lake_centerlines.geojson",
        "bb854a900ecbd3b408df46d5e16e3e0f974ba55993f9d8b5c26e855273c0905a"),
    "ne/SR_50M.zip": ("https://naciscdn.org/naturalearth/50m/raster/SR_50M.zip",
                      "ff810f5f2747463fd8ffa612b23e5f5e5d593a345218976872b6749610976ab7"),
    "awmc/open_water_base.shp": (f"{GH}AWMC/geodata/{AWMC_COMMIT}/Physical%20Data/open_water_awmc_work/openwater_base/open_water_base.shp",
                                 "4078e06970ed2df7fb5a134a2fd767ace42f9a8b1e4ce10f9a02ca1c53b74458"),
    "awmc/inland_water.geojson": (f"{GH}AWMC/geodata/{AWMC_COMMIT}/Physical%20Data/inland_water/inland-water-OSM.geojson",
                                  "a6228834c7149277da8619efa6ce0c042ff54d5eb5d14c7e1b79f36d361205e5"),
    "awmc/roads.geojson": (f"{GH}AWMC/geodata/{AWMC_COMMIT}/Cultural-Data/roads/roads.geojson",
                           "d28e5a1675a59df0037a84e6a8dc5f6b8efc75dbbd74a76ace59dd8285604516"),
    "awmc/provinces.geojson": (f"{GH}AWMC/geodata/{AWMC_COMMIT}/Cultural-Data/political_shading/roman_empire_ce_200_provinces/roman_empire_ce_200_provinces.geojson",
                               "62789827619f774997aa494c0f3b0b985e761b0308786e02bcc35e5644bab11b"),
    "dare/provinces.geojson": (f"{GH}klokantech/roman-empire/{DARE_COMMIT}/data/provinces.geojson",
                               "f148ca97f708b2a074112ff4ad6471526b0d683d948d940f27a71fb9114abcc7"),
    "dare/provinces_label.geojson": (f"{GH}klokantech/roman-empire/{DARE_COMMIT}/data/provinces_label.geojson",
                                     "16f260976469e840883fb57c04a964704d22633fdd5b078fa8882be613701a71"),
    "dare/roads_low.geojson": (f"{GH}klokantech/roman-empire/{DARE_COMMIT}/data/roads_low.geojson",
                               "3b464fb5c26dbf6797e46d5be753582b950c6350f7a105520af35cf2b3238ee3"),
}

SOURCE = ("atlas", "atlas", "Atlas", "OT NT LXX",
          "Places: OpenBible.info's Bible Geocoding Data (CC BY 4.0), tied to the text's words through STEPBible's "
          "TIPNR (Tyndale House, CC BY 4.0). Base maps as credited under each.")
# The base maps, in the picker's order: id, name, credit, the eras it's offered in ('' every book, even one with no
# era; else atlas_eras' era ids). AWMC's ancient seas fit every era, its roads drawn only in the eras the Barrington
# Atlas dates them to (atlas_eras.ERAS' letters) and its 200 CE borders only in the Roman ones; DARE's provinces and
# roads are Rome's alone.
MAPS = [
    ("ne", "Natural Earth", "Base map: Natural Earth (public domain) - land, lakes, rivers and shaded relief; today's coastlines.", ""),
    ("awmc", "Ancient World", "Base map: Ancient World Mapping Center, awmc.unc.edu (ODbL 1.0; from the Barrington Atlas and "
             "OpenStreetMap) - ancient seas, inland water, the era's roads, the Roman provinces of 200 CE.", ""),
    ("dare", "Roman Empire", "Base map: Digital Atlas of the Roman Empire, Johan Åhlfeldt, imperium.ahlfeldt.se (CC BY-SA 3.0) - "
             "provinces and roads; land and lakes from Natural Earth (public domain).",
     " ".join(e[0] for e in atlas_eras.ERAS if e[3])),
]
BOX = (-12.0, 4.0, 64.0, 50.0)     # west, south, east, north (degrees): every base map clipped to it
LEVELS = (0.05, 0.015, 0.004, 0.001)     # Each level's simplification tolerance, in degrees (the page picks by zoom)
Q = 1000                           # Points stored at 1/Q degree (about 100 m: under a pixel at the finest level drawn)
ALTS = 5                           # At most this many other proposed sites a place


def download():
    """Every file, once, each checked against its pinned SHA-256."""
    for name, (url, sha) in FILES.items():
        path = DL / name
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists():
            print("downloading", name)
            with urllib.request.urlopen(url) as r:
                path.write_bytes(r.read())
        if hashlib.sha256(path.read_bytes()).hexdigest() != sha:
            raise SystemExit(f"{path}: not the pinned file (SHA-256 differs)")


# ---- Places ----

def openbible():
    """OpenBible's places: {id: place row (places' columns)}; {id: (the names the translations give it, lowercase;
    the verses it's in - (book id, chapter, verse), from its verses' sort keys, BBCCCVVV)}; {TIPNR name: [ids]} (one
    TIPNR record may stand for several of OpenBible's places: Bethlehem's has Lehem and Ephrathah under it)."""
    places, found, by_tipnr = {}, {}, {}
    for line in (DL / "obgeo" / "ancient.jsonl").read_text(encoding="utf-8").splitlines():
        d = json.loads(line)
        names = d.get("translation_name_counts") or {}
        name = max(names, key=lambda n: (names[n], n)) if names else re.sub(r"\s+\d+$", "", d["friendly_id"])
        # Each modern site's point: the resolution based on it (the first met)
        point, special = {}, ""
        for ident in d.get("identifications", []):
            for r in ident.get("resolutions", []):
                if r.get("lonlat") and r.get("modern_basis_id"):
                    point.setdefault(r["modern_basis_id"], tuple(map(float, r["lonlat"].split(","))))
                elif r.get("type") == "special" or r.get("special"):
                    special = special or r.get("special") or r.get("description", "")
        sites = sorted(((a.get("score", 0), a["name"], point[m]) for m, a in (d.get("modern_associations") or {}).items()
                        if m in point), key=lambda s: -s[0])
        best = sites[0] if sites else None
        alts = [[n, round(p[0], 4), round(p[1], 4), s] for s, n, p in sites[1:] if s > 0][:ALTS]
        note = "" if best else {"unknown_place": "Location unknown", "nonspecific_place": "Not a specific place",
                                "multiple_locations": "Several places", "not_a_place": "Not a place"}.get(special, "Location unknown")
        # (Its comment as a line under the name only when it's short - "in Pisidia" -, its first clause; longer ones are
        # the compiler's notes on the data)
        sub = re.sub(r"<[^>]+>", "", d.get("comment") or "").split(";")[0].strip()
        sub = sub if len(sub) <= 40 else ""
        places[d["id"]] = (d["id"], name, sub, (d.get("types") or [""])[0],
                           round(best[2][0], 4) if best else None, round(best[2][1], 4) if best else None,
                           best[0] if best else 0, json.dumps(alts, ensure_ascii=False) if alts else "", note)
        found[d["id"]] = ({n.lower() for n in names},
                          {(int(s[:2]), int(s[2:5]), int(s[5:])) for s in (x.get("sort", "") for x in d.get("verses", [])) if len(s) == 8})
        for v in (d.get("linked_data") or {}).values():
            for tid in [v.get("id")] + list(v.get("ids") or []):
                if tid and "@" in str(tid):
                    by_tipnr.setdefault(tid, []).append(d["id"])
    return places, found, by_tipnr


def tipnr_places():
    """TIPNR's places: key (the Strong's it's written with) -> [(TIPNR name, the verses it's in for that key, the
    English names it's given there, lowercase)], each verse (book code, chapter, verse). The name is the record's
    without its range's end (OpenBible's form)."""
    out, kind = {}, None
    for line in (tyndale_dict.DL / tyndale_dict.TIPNR[0]).read_text(encoding="utf-8").splitlines():
        if line.startswith("$=========="):
            kind = line[11:].split("\t")[0].strip()
            continue
        if not kind or not kind.startswith("PLACE") or not line.startswith("– "):
            continue
        f = line.split("\t")
        if len(f) < 5 or "«" not in f[2] or f[0] == "– Total":
            continue
        uid = f[1].split("|")[-1]
        if "@" not in uid:     # (The section's own heading row)
            continue
        name, ref = uid.split("@", 1)
        uid = name + "@" + ref.split("-")[0]
        verses = set()
        for r in f[4].split(";"):
            m = re.match(r"\s*([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)", r)
            if m:
                verses.add((m.group(1), int(m.group(2)), int(m.group(3))))
        names = {n.split("=")[0].strip().lower() for n in f[3].split(";")} | {f[1].split("|")[0].split("@")[0].replace("_", " ").lower()}
        out.setdefault(f[2].split("«")[0].strip(), []).append((uid, verses, names - {""}))
    return out


def match_words(main_db, keys, found, by_tipnr):
    """The text's words naming places: [(book, chapter, verse, word, place id)] (the module's docstring gives the rules)."""
    codes = dict(main_db.execute("SELECT id, code FROM books WHERE id <= 66"))
    proper = {s for s, l in main_db.execute("SELECT strong, lemma FROM lexicon") if l and (s[0] == "H" or l[:1].isupper())}
    ids = {code: i for i, code in codes.items()}
    # A TIPNR name OpenBible doesn't give (renamed since: Jerusalem@Gen.14.18, OpenBible's Jerusalem@Jos.10.1): the
    # places it names whose names share one of the record's and that are in the most of its verses (at least one)
    records = {}
    for recs in keys.values():
        for uid, vs, ns in recs:
            r = records.setdefault(uid, (set(), set()))
            r[0].update((ids[bk], c, v) for bk, c, v in vs if bk in ids); r[1].update(ns)
    by_name = {}
    for i, (ns, _) in found.items():
        for n in ns:
            by_name.setdefault(n, set()).add(i)
    by_tipnr = dict(by_tipnr)
    for uid, (vs, ns) in records.items():
        if uid not in by_tipnr:
            near = {i for n in ns for i in by_name.get(n, ())}
            best = max(near, key=lambda i: len(found[i][1] & vs), default=None)
            if best and found[best][1] & vs:
                by_tipnr[uid] = [best]
    base = {}
    for k in keys:
        base.setdefault(re.sub(r"[A-Z]$", "", k), []).append(k)
    linked = lambda recs: [r for r in recs if r[0] in by_tipnr]
    rows = []
    for b, c, v, w, strong in main_db.execute("SELECT book, chapter, verse, word, strong FROM words"):
        if not strong or strong not in proper and strong in keys:
            continue
        exact = linked(keys.get(strong, []))
        if b > 66:
            recs = exact
        else:
            near = exact or linked([r for k in base.get(re.sub(r"[A-Z]$", "", strong), []) for r in keys[k]])
            recs = [r for r in near if (codes[b], c, v) in r[1]]
        if not recs:
            continue
        rec = max(recs, key=lambda r: len(r[1]))
        # (The record's OpenBible place: the one naming this verse, by the name the word is given here, the most cited)
        ids = by_tipnr[rec[0]]
        place = max(ids, key=lambda i: ((b, c, v) in found[i][1], bool(found[i][0] & rec[2]), len(found[i][1])))
        rows.append((b, c, v, w, place))
    return rows


# ---- Geometry ----

def simplify(pts, tol):
    """Douglas-Peucker: the fewest of pts (a list of (x, y)) that stay within tol of the line through them."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    t2 = tol * tol
    while stack:
        a, b = stack.pop()
        (ax, ay), (bx, by) = pts[a], pts[b]
        dx, dy = bx - ax, by - ay
        d2 = dx * dx + dy * dy
        far, at = -1.0, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            if d2:
                t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / d2))
                ex, ey = ax + t * dx - px, ay + t * dy - py
            else:
                ex, ey = ax - px, ay - py
            e = ex * ex + ey * ey
            if e > far:
                far, at = e, i
        if far > t2:
            keep[at] = True
            stack += [(a, at), (at, b)]
    return [p for p, k in zip(pts, keep) if k]


def clip_ring(ring, box):
    """A polygon's ring cut to the box (Sutherland-Hodgman): its part inside, the box's edge closing it."""
    w, s, e, n = box
    edges = [(lambda p: p[0] >= w, lambda p, q: (w, p[1] + (q[1] - p[1]) * (w - p[0]) / (q[0] - p[0]))),
             (lambda p: p[0] <= e, lambda p, q: (e, p[1] + (q[1] - p[1]) * (e - p[0]) / (q[0] - p[0]))),
             (lambda p: p[1] >= s, lambda p, q: (p[0] + (q[0] - p[0]) * (s - p[1]) / (q[1] - p[1]), s)),
             (lambda p: p[1] <= n, lambda p, q: (p[0] + (q[0] - p[0]) * (n - p[1]) / (q[1] - p[1]), n))]
    out = ring
    for inside, cut in edges:
        pts, out = out, []
        for i, q in enumerate(pts):
            p = pts[i - 1]
            if inside(q):
                if not inside(p):
                    out.append(cut(p, q))
                out.append(q)
            elif inside(p):
                out.append(cut(p, q))
        if not out:
            break
    return out


def clip_line(line, box):
    """A line cut to the box: its runs of points inside (with the point either side, so a run reaches the edge)."""
    w, s, e, n = box
    inside = [w <= x <= e and s <= y <= n for x, y in line]
    runs, run = [], []
    for i, p in enumerate(line):
        if inside[i] or (i and inside[i - 1]) or (i + 1 < len(line) and inside[i + 1]):
            run.append(p)
        elif run:
            runs.append(run); run = []
    if run:
        runs.append(run)
    return [r for r in runs if len(r) > 1]


def varint(n, out):
    n = (n << 1) ^ (n >> 63)     # (zigzag: small negatives small too)
    while n >= 0x80:
        out.append((n & 0x7F) | 0x80)
        n >>= 7
    out.append(n)


def encode(paths):
    """Paths as bytes: each its point count, then its points' x and y at 1/Q degree, each the change from the one
    before (the first from 0), as zigzag varints - src/atlas.ts' decode."""
    out = bytearray()
    for p in paths:
        q = []
        for x, y in p:
            pt = (round(x * Q), round(y * Q))
            if not q or pt != q[-1]:
                q.append(pt)
        if len(q) < 2:
            continue
        varint(len(q), out)
        px = py = 0
        for x, y in q:
            varint(x - px, out); varint(y - py, out)
            px, py = x, y
    return bytes(out)


def parts(geom):
    """A GeoJSON geometry's rings or lines, as lists of (x, y): (polygon rings, lines)."""
    t, c = geom["type"], geom["coordinates"]
    if t == "Polygon":
        return [[tuple(p[:2]) for p in r] for r in c], []
    if t == "MultiPolygon":
        return [[tuple(p[:2]) for p in r] for poly in c for r in poly], []
    if t == "LineString":
        return [], [[tuple(p[:2]) for p in c]]
    if t == "MultiLineString":
        return [], [[tuple(p[:2]) for p in l] for l in c]
    return [], []


def features(path):
    """A GeoJSON file's features (with a geometry)."""
    return [f for f in json.loads((DL / path).read_text(encoding="utf-8"))["features"] if f.get("geometry")]


def shapefile_rings(path):
    """A polygon shapefile's rings (the .shp alone: its records' parts), as lists of (x, y)."""
    b = (DL / path).read_bytes()
    rings, at = [], 100
    while at + 8 <= len(b):
        length = struct.unpack(">i", b[at + 4:at + 8])[0] * 2
        rec = b[at + 8:at + 8 + length]
        at += 8 + length
        if struct.unpack("<i", rec[:4])[0] != 5:
            continue
        nparts, npts = struct.unpack("<ii", rec[36:44])
        starts = list(struct.unpack(f"<{nparts}i", rec[44:44 + 4 * nparts])) + [npts]
        xy = struct.unpack(f"<{2 * npts}d", rec[44 + 4 * nparts:44 + 4 * nparts + 16 * npts])
        for i in range(nparts):
            rings.append([(xy[2 * j], xy[2 * j + 1]) for j in range(starts[i], starts[i + 1])])
    return rings


def bbox_hits(pts, box):
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return min(xs) <= box[2] and max(xs) >= box[0] and min(ys) <= box[3] and max(ys) >= box[1]


def layer_rows(layer, rings=(), lines=(), name="", min_level=0):
    """A layer's shapes rows at every level from min_level: rings clipped to BOX, lines cut to it; each simplified
    at the level's tolerance (a ring smaller than it dropped)."""
    rings = [r for r in (clip_ring(r, BOX) for r in rings if len(r) > 2 and bbox_hits(r, BOX)) if len(r) > 2]
    lines = [p for l in lines if len(l) > 1 and bbox_hits(l, BOX) for p in clip_line(l, BOX)]
    rows = []
    for level, tol in enumerate(LEVELS):
        if level < min_level:
            continue
        paths = []
        for r in rings:
            xs, ys = [p[0] for p in r], [p[1] for p in r]
            if max(xs) - min(xs) < tol and max(ys) - min(ys) < tol:
                continue
            s = simplify(r, tol)
            if len(s) > 3:
                paths.append(s)
        paths += [s for s in (simplify(l, tol) for l in lines) if len(s) > 1]
        data = encode(paths)
        if data:
            rows.append((layer, level, name, data))
    return rows


# ---- Relief ----

def png_grey(width, height, rows):
    """An 8-bit grey PNG of rows (bytes, each width long), each row filtered by its difference from the one above."""
    raw, prev = bytearray(), bytes(width)
    for r in rows:
        raw.append(2)
        raw += bytes((a - b) & 0xFF for a, b in zip(r, prev))
        prev = r
    chunk = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 0, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b""))


def relief():
    """Natural Earth's 1:50m shaded relief cut to BOX: [(level, west, south, east, north, png)] - level 1 at its own
    1/30 degree a pixel, level 0 at half that. Its flat ground (205 in the source: plains and sea alike) made 128, the
    rest 1.6 times as far from it as they were, so laid over the land in soft-light only the slopes show."""
    with zipfile.ZipFile(DL / "ne" / "SR_50M.zip") as z:
        b = z.read("SR_50M.tif")
    e = "<" if b[:2] == b"II" else ">"
    ifd = struct.unpack(e + "I", b[4:8])[0]
    tags = {}
    for i in range(struct.unpack(e + "H", b[ifd:ifd + 2])[0]):
        t, ty, c, v = struct.unpack(e + "HHII", b[ifd + 2 + 12 * i:ifd + 14 + 12 * i])
        if ty == 3 and c == 1:
            v = struct.unpack(e + "H", b[ifd + 10 + 12 * i:ifd + 12 + 12 * i])[0]
        tags[t] = (c, v)
    width, height = tags[256][1], tags[257][1]
    assert tags[259][1] == 1 and tags[258][1] == 8, "SR_50M: expected uncompressed 8-bit grey"
    count, at = tags[273]
    strips = struct.unpack(f"{e}{count}I", b[at:at + 4 * count])     # (One a row)
    per = 30                       # (Pixels a degree; the image's top left corner at -180, 90)
    c0, c1 = round((BOX[0] + 180) * per), round((BOX[2] + 180) * per)
    r0, r1 = round((90 - BOX[3]) * per), round((90 - BOX[1]) * per)
    lut = bytes(max(0, min(255, round(128 + 1.6 * (v - 205)))) for v in range(256))     # (The slopes a little stronger)
    rows = [b[strips[r] + c0:strips[r] + c1].translate(lut) for r in range(r0, r1)]
    half = [bytes((a[2 * i] + a[2 * i + 1] + c[2 * i] + c[2 * i + 1]) // 4 for i in range(len(a) // 2))
            for a, c in zip(rows[0::2], rows[1::2])]
    edges = (c0 / per - 180, 90 - r1 / per, c1 / per - 180, 90 - r0 / per)
    return [(0, *edges, png_grey(len(half[0]), len(half), half)), (1, *edges, png_grey(c1 - c0, r1 - r0, rows))]


# ---- The base maps ----

def ne_land():
    return [r for f in features("ne/ne_10m_land.geojson") for r in parts(f["geometry"])[0]]


def ne_lakes():
    return [r for f in features("ne/ne_10m_lakes.geojson") for r in parts(f["geometry"])[0]]


def base_map(mid):
    """A base map's (shapes, labels, relief) rows."""
    shapes, labels, images = [], [], []
    if mid == "ne":
        shapes += layer_rows("land", ne_land()) + layer_rows("lake", ne_lakes())
        # (Rivers by Natural Earth's rank: the great ones at every level, the smaller from the closer levels)
        for f in features("ne/ne_10m_rivers_lake_centerlines.geojson"):
            rank = f["properties"].get("scalerank") or 10
            shapes += layer_rows("river", lines=parts(f["geometry"])[1], min_level=0 if rank <= 5 else 1 if rank <= 7 else 2)
        images = relief()
    elif mid == "awmc":
        shapes += layer_rows("water", shapefile_rings("awmc/open_water_base.shp"))
        shapes += layer_rows("lake", [r for f in features("awmc/inland_water.geojson") for r in parts(f["geometry"])[0]], min_level=1)
        # (Its roads grouped by the periods the Barrington Atlas dates them to, the group's letters as its name - "HR",
        # "" undated: the page draws those of the era shown)
        periods = {}
        for f in features("awmc/roads.geojson"):
            pr = f["properties"]
            name = "".join(sorted(set(re.sub(r"[^ACHRL]", "", (pr.get("timeperiod") or "") + (pr.get("timeperi_1") or "")))))
            periods.setdefault(name, []).extend(parts(f["geometry"])[1])
        for name, lines in sorted(periods.items()):
            shapes += layer_rows("road", lines=lines, name=name, min_level=1)
        shapes += layer_rows("border", lines=[l for f in features("awmc/provinces.geojson") for l in parts(f["geometry"])[1]])
    elif mid == "dare":
        shapes += layer_rows("land", ne_land()) + layer_rows("lake", ne_lakes())
        for f in features("dare/provinces.geojson"):
            shapes += layer_rows("province", parts(f["geometry"])[0], name=f["properties"].get("name") or "")
        shapes += layer_rows("road", lines=[l for f in features("dare/roads_low.geojson") for l in parts(f["geometry"])[1]], min_level=1)
        for f in features("dare/provinces_label.geojson"):
            x, y = f["geometry"]["coordinates"][:2]
            labels.append(("province", f["properties"].get("name") or "", round(x, 3), round(y, 3)))
    return shapes, labels, images


# ---- Eras and routes ----

def centroid(ring):
    """A ring's centroid (the shoelace formula; its points' mean for a degenerate one)."""
    a = cx = cy = 0.0
    for (x0, y0), (x1, y1) in zip(ring, ring[1:] + ring[:1]):
        c = x0 * y1 - x1 * y0
        a += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c
    if abs(a) < 1e-9:
        return sum(p[0] for p in ring) / len(ring), sum(p[1] for p in ring) / len(ring)
    return cx / (3 * a), cy / (3 * a)


def era_rows(main_db):
    """atlas_eras' data as rows: eras (id, name, roads, roman, credit); era_regions (era, name, color, label lon, lat,
    the rings encoded - closed - as the base maps' paths), in drawing order (their rowid); era_books (book id, first
    chapter, last, era) - a Septuagint book with a Hebrew counterpart given that book's."""
    eras = [(i, n, roads, int(roman), atlas_eras.CREDIT) for i, n, roads, roman in atlas_eras.ERAS]
    regions = []
    for era, *_ in atlas_eras.ERAS:
        for name, color, rings, label in atlas_eras.REGIONS[era]:
            if not label:
                big = max(rings, key=lambda r: abs(sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(r, r[1:] + r[:1]))))
                label = centroid(big)
            regions.append((era, name, color, round(label[0], 3), round(label[1], 3), encode([r + r[:1] for r in rings])))
    ids = {c: (i, h) for i, c, h in main_db.execute("SELECT id, code, heb FROM books")}
    code_of = {i: c for c, (i, _) in ids.items()}
    era_books = []
    for code, (bid, heb) in ids.items():
        spans = atlas_eras.BOOKS.get(code) or atlas_eras.LXX_ONLY.get(code) or (atlas_eras.BOOKS.get(code_of.get(heb), []) if heb else [])
        era_books += [(bid, a, b, e) for a, b, e in spans]
    return eras, regions, era_books


def route_rows(main_db):
    """atlas_routes' data as rows: routes (id, its books' ids space-separated, name), route_stops (route, n from 1,
    OpenBible place id, book, chapter, verse). Each stop's place: OpenBible's with that name (a translation's name or
    its friendly id, case ignored) listing the verse; several, the most cited; none listing it, the most cited of the
    name. A name OpenBible hasn't stops the build."""
    ids = {c: i for i, c in main_db.execute("SELECT id, code FROM books WHERE id <= 66")}
    named = {}
    for line in (DL / "obgeo" / "ancient.jsonl").read_text(encoding="utf-8").splitlines():
        d = json.loads(line)
        verses = {(int(s[:2]), int(s[2:5]), int(s[5:])) for s in (x.get("sort", "") for x in d.get("verses", [])) if len(s) == 8}
        names = {n.lower() for n in d.get("translation_name_counts") or {}} | {d["friendly_id"].lower()}
        for n in names:
            named.setdefault(n, []).append((d["id"], verses))
    routes, stops = [], []
    for rid, books, name, route in atlas_routes.ROUTES:
        routes.append((rid, " ".join(str(ids[b]) for b in books), name))
        for n, (place, ref) in enumerate(route, 1):
            code, c, v = ref.split(".")
            at = (ids[code], int(c), int(v))
            cands = named.get(place.lower())
            if not cands:
                raise SystemExit(f"atlas_routes {rid}: OpenBible has no place named {place!r}")
            pid = max(cands, key=lambda x: (at in x[1], len(x[1])))[0]
            stops.append((rid, n, pid, *at))
    return routes, stops


def write(path, script, tables):
    """A file made afresh from its tables' rows: {table: rows}."""
    tmp = path.with_suffix(".tmp")
    tmp.unlink(missing_ok=True)
    db = sqlite3.connect(tmp)
    db.executescript("PRAGMA page_size = 4096;" + script)
    for t, rows in tables.items():
        if rows:
            db.executemany(f"INSERT INTO {t} VALUES ({','.join('?' * len(rows[0]))})", rows)
    db.commit()
    db.execute("VACUUM")
    db.close()
    tmp.replace(path)
    data = path.read_bytes()
    return hashlib.sha256(data).hexdigest()[:12], len(data)


def build(main_db, maps=True):
    """Builds atlas.db (and, with maps, every base map's file) and lists it in note_sources. Returns (places, words
    matched, {file: bytes}); prints the counts."""
    download()
    places, found, by_tipnr = openbible()
    rows = match_words(main_db, tipnr_places(), found, by_tipnr)
    sizes, listed = {}, []
    for mid, name, credit, offered in MAPS:
        path = OUT / f"atlas_{mid}.db"
        if maps or not path.exists():
            shapes, labels, images = base_map(mid)
            version, size = write(path, """
                CREATE TABLE shapes (layer TEXT, level INTEGER, name TEXT, data BLOB);
                CREATE TABLE labels (layer TEXT, name TEXT, lon REAL, lat REAL);
                CREATE TABLE relief (level INTEGER PRIMARY KEY, west REAL, south REAL, east REAL, north REAL, png BLOB);
            """, {"shapes": shapes, "labels": labels, "relief": images})
        else:
            data = path.read_bytes()
            version, size = hashlib.sha256(data).hexdigest()[:12], len(data)
        sizes[path.name] = size
        listed.append((mid, name, credit, f"data/notes/{path.name}", version, size, offered))
    eras, regions, era_books = era_rows(main_db)
    routes, stops = route_rows(main_db)
    used = {p for *_, p in rows} | {s[2] for s in stops}
    version, size = write(OUT / "atlas.db", """
        CREATE TABLE places (id TEXT PRIMARY KEY, name TEXT, sub TEXT, type TEXT, lon REAL, lat REAL, score INTEGER,
                             alts TEXT, note TEXT) WITHOUT ROWID;
        CREATE TABLE words (book INTEGER, chapter INTEGER, verse INTEGER, word INTEGER, place TEXT,
                            PRIMARY KEY (book, chapter, verse, word)) WITHOUT ROWID;
        CREATE TABLE maps (id TEXT PRIMARY KEY, name TEXT, credit TEXT, file TEXT, version TEXT, bytes INTEGER, eras TEXT);
        CREATE TABLE eras (id TEXT PRIMARY KEY, name TEXT, roads TEXT, roman INTEGER, credit TEXT);
        CREATE TABLE era_regions (era TEXT, name TEXT, color INTEGER, lon REAL, lat REAL, data BLOB);
        CREATE TABLE era_books (book INTEGER, first INTEGER, last INTEGER, era TEXT);
        CREATE TABLE routes (id TEXT PRIMARY KEY, books TEXT, name TEXT);
        CREATE TABLE route_stops (route TEXT, n INTEGER, place TEXT, book INTEGER, chapter INTEGER, verse INTEGER,
                                  PRIMARY KEY (route, n)) WITHOUT ROWID;
    """, {"places": [p for i, p in places.items() if i in used], "words": rows, "maps": listed, "eras": eras,
          "era_regions": regions, "era_books": era_books, "routes": routes, "route_stops": stops})
    sizes["atlas.db"] = size
    main_db.execute("CREATE TABLE IF NOT EXISTS note_sources (id TEXT PRIMARY KEY, kind TEXT, name TEXT, testaments TEXT,"
                    " credit TEXT, file TEXT, version TEXT, bytes INTEGER)")
    main_db.execute("INSERT OR REPLACE INTO note_sources (id, kind, name, testaments, credit, file, version, bytes)"
                    " VALUES (?,?,?,?,?,?,?,?)", (*SOURCE, "data/notes/atlas.db", version, size))     # (books: '' - every book)
    located = sum(1 for i in used if places[i][4] is not None)
    print(f"atlas: {len(eras)} eras ({len(regions)} regions), {len(routes)} routes ({len(stops)} stops); "
          f"{len(rows)} words name {len(used)} places ({located} located) of OpenBible's {len(places)}; "
          + ", ".join(f"{f} {b / 1e6:.2f} MB" for f, b in sizes.items()))
    return len(used), len(rows), sizes


if __name__ == "__main__":
    # python3 pipeline/atlas.py [--places]: everything, or (--places) the places only, the base maps' files kept
    con = sqlite3.connect(HERE.parent / "public" / "data" / "cotext.db")
    with con:
        build(con, maps="--places" not in sys.argv)
    con.close()
