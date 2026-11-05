"""The Atlas' ROUTES (atlas.py builds them into atlas.db; src/atlas.ts draws them): journeys the Bible's text itself
traces, each an ordered list of stops, written here by hand from the verses.

ROUTES: (id, the books it's offered in (the app's book codes), its name, its stops). A stop is (place, verse): the
place as OpenBible names it (a name its translations give it, or its friendly id: "Antioch 2"), the verse (book code,
chapter, verse: "Act.13.14") that names it there - atlas.py takes the OpenBible place with that name listing that
verse (several: the most cited; none: the most cited of that name, else the build stops and says which). A stop the
verse only implies (Paul's going up to Jerusalem, Acts 18:22) cites the verse telling of it. Only places the text
names in order: a region crossed on the way (Galatia and Phrygia, Acts 18:23) left out unless it's where the
journey goes (Macedonia, Acts 20:1). The verse a stop names is a link under the map; its site, sure or not, comes from
OpenBible (atlas.ts draws the uncertain ones hollow, the lines to them dashed).
"""

ROUTES = [
    # ---- Genesis ----
    ("abraham", ["Gen"], "Abraham's travels (Genesis 11-23)", [
        ("Ur", "Gen.11.31"), ("Haran", "Gen.11.31"), ("Shechem", "Gen.12.6"), ("Bethel", "Gen.12.8"),
        ("Egypt", "Gen.12.10"), ("Bethel", "Gen.13.3"), ("Hebron", "Gen.13.18"), ("Dan", "Gen.14.14"),
        ("Hobah", "Gen.14.15"), ("Salem", "Gen.14.18"), ("Mamre", "Gen.18.1"), ("Gerar", "Gen.20.1"),
        ("Beersheba", "Gen.21.31"), ("Moriah", "Gen.22.2"), ("Beersheba", "Gen.22.19"), ("Hebron", "Gen.23.2"),
    ]),
    # ---- Exodus, Numbers, Deuteronomy ----
    ("exodus", ["Exo"], "The Exodus: Egypt to Sinai (Exodus 12-19)", [
        ("Rameses", "Exo.12.37"), ("Succoth", "Exo.12.37"), ("Etham", "Exo.13.20"), ("Pi-hahiroth", "Exo.14.2"),
        ("Marah", "Exo.15.23"), ("Elim", "Exo.15.27"), ("Wilderness of Sin", "Exo.16.1"), ("Rephidim", "Exo.17.1"),
        ("Mount Sinai", "Exo.19.20"),
    ]),
    ("num33", ["Num"], "The wilderness stops (Numbers 33)", [
        ("Rameses", "Num.33.5"), ("Succoth", "Num.33.5"), ("Etham", "Num.33.6"), ("Pi-hahiroth", "Num.33.7"),
        ("Marah", "Num.33.8"), ("Elim", "Num.33.9"), ("Red Sea", "Num.33.10"), ("Wilderness of Sin", "Num.33.11"),
        ("Dophkah", "Num.33.12"), ("Alush", "Num.33.13"), ("Rephidim", "Num.33.14"),
        ("Wilderness of Sinai", "Num.33.15"), ("Kibroth-hattaavah", "Num.33.16"), ("Hazeroth", "Num.33.17"),
        ("Rithmah", "Num.33.18"), ("Rimmon-perez", "Num.33.19"), ("Libnah", "Num.33.20"), ("Rissah", "Num.33.21"),
        ("Kehelathah", "Num.33.22"), ("Mount Shepher", "Num.33.23"), ("Haradah", "Num.33.24"),
        ("Makheloth", "Num.33.25"), ("Tahath", "Num.33.26"), ("Terah", "Num.33.27"), ("Mithkah", "Num.33.28"),
        ("Hashmonah", "Num.33.29"), ("Moseroth", "Num.33.30"), ("Bene-jaakan", "Num.33.31"),
        ("Hor-haggidgad", "Num.33.32"), ("Jotbathah", "Num.33.33"), ("Abronah", "Num.33.34"),
        ("Ezion-geber", "Num.33.35"), ("Kadesh", "Num.33.36"), ("Mount Hor", "Num.33.37"), ("Zalmonah", "Num.33.41"),
        ("Punon", "Num.33.42"), ("Oboth", "Num.33.43"), ("Iye-abarim", "Num.33.44"), ("Dibon-gad", "Num.33.45"),
        ("Almon-diblathaim", "Num.33.46"), ("Nebo", "Num.33.47"), ("Jericho", "Num.33.48"),
    ]),
    ("deut1", ["Deu"], "Horeb to the plains of Moab (Deuteronomy 1-3)", [
        ("Horeb", "Deu.1.6"), ("Kadesh-barnea", "Deu.1.19"), ("Mount Seir", "Deu.2.1"), ("Elath", "Deu.2.8"),
        ("Ezion-geber", "Deu.2.8"), ("Zered", "Deu.2.13"), ("Arnon", "Deu.2.24"), ("Jahaz", "Deu.2.32"),
        ("Heshbon", "Deu.2.30"), ("Edrei", "Deu.3.1"), ("Beth-peor", "Deu.3.29"),
    ]),
    # ---- Joshua ----
    ("joshua1", ["Jos"], "Joshua's central and southern campaigns (Joshua 2-10)", [
        ("Shittim", "Jos.2.1"), ("Gilgal", "Jos.4.19"), ("Jericho", "Jos.6.2"), ("Ai", "Jos.8.1"),
        ("Mount Ebal", "Jos.8.30"), ("Gilgal", "Jos.9.6"), ("Gibeon", "Jos.10.10"), ("Beth-horon", "Jos.10.10"),
        ("Azekah", "Jos.10.10"), ("Makkedah", "Jos.10.28"), ("Libnah", "Jos.10.29"), ("Lachish", "Jos.10.31"),
        ("Eglon", "Jos.10.34"), ("Hebron", "Jos.10.36"), ("Debir", "Jos.10.38"), ("Gilgal", "Jos.10.43"),
    ]),
    ("joshua2", ["Jos"], "Joshua's northern campaign (Joshua 11)", [
        ("Gilgal", "Jos.10.43"), ("Waters of Merom", "Jos.11.7"), ("Sidon", "Jos.11.8"),
        ("Misrephoth-maim", "Jos.11.8"), ("Hazor", "Jos.11.10"),
    ]),
    # ---- Kings, Chronicles, Jeremiah: the deportations ----
    ("galilee", ["2Ki"], "Galilee and Gilead taken to Assyria (2 Kings 15:29)", [
        ("Ijon", "2Ki.15.29"), ("Abel-beth-maacah", "2Ki.15.29"), ("Janoah", "2Ki.15.29"), ("Kedesh", "2Ki.15.29"),
        ("Hazor", "2Ki.15.29"), ("Gilead", "2Ki.15.29"), ("Galilee", "2Ki.15.29"), ("Assyria", "2Ki.15.29"),
    ]),
    ("samaria", ["2Ki"], "Israel deported to Assyria (2 Kings 17)", [
        ("Samaria", "2Ki.17.5"), ("Assyria", "2Ki.17.6"), ("Gozan", "2Ki.17.6"), ("Habor", "2Ki.17.6"),
        ("Halah", "2Ki.17.6"), ("Media", "2Ki.17.6"),
    ]),
    ("babylon_ki", ["2Ki"], "Judah taken to Babylon (2 Kings 24-25)", [
        ("Jerusalem", "2Ki.24.10"), ("Babylon", "2Ki.24.15"), ("Jerusalem", "2Ki.25.1"), ("Jericho", "2Ki.25.5"),
        ("Riblah", "2Ki.25.6"), ("Babylon", "2Ki.25.7"), ("Mizpah", "2Ki.25.23"), ("Egypt", "2Ki.25.26"),
    ]),
    ("assyria_ch", ["1Ch"], "The tribes east of the Jordan taken to Assyria (1 Chronicles 5:26)", [
        ("Gilead", "1Ch.5.16"), ("Halah", "1Ch.5.26"), ("Habor", "1Ch.5.26"), ("Gozan", "1Ch.5.26"),
    ]),
    ("babylon_ch", ["2Ch"], "Judah taken to Babylon (2 Chronicles 36)", [
        ("Jerusalem", "2Ch.36.5"), ("Babylon", "2Ch.36.6"), ("Jerusalem", "2Ch.36.19"), ("Babylon", "2Ch.36.20"),
    ]),
    ("babylon_jer", ["Jer"], "Jerusalem's fall, Babylon and Egypt (Jeremiah 39-43)", [
        ("Jerusalem", "Jer.39.1"), ("Jericho", "Jer.39.5"), ("Riblah", "Jer.39.5"), ("Babylon", "Jer.39.7"),
        ("Ramah", "Jer.40.1"), ("Mizpah", "Jer.40.6"), ("Gibeon", "Jer.41.12"), ("Bethlehem", "Jer.41.17"),
        ("Tahpanhes", "Jer.43.7"),
    ]),
    # ---- Ezra, Nehemiah: the return ----
    ("return1", ["Ezr"], "The first return (Ezra 1-2)", [
        ("Babylon", "Ezr.1.11"), ("Jerusalem", "Ezr.1.11"),
    ]),
    ("return2", ["Ezr"], "Ezra's return (Ezra 7-8)", [
        ("Babylon", "Ezr.7.9"), ("Ahava", "Ezr.8.15"), ("Jerusalem", "Ezr.8.32"),
    ]),
    ("nehemiah", ["Neh"], "Nehemiah's journey (Nehemiah 1-2)", [
        ("Susa", "Neh.1.1"), ("Jerusalem", "Neh.2.11"),
    ]),
    # ---- Acts ----
    ("paul1", ["Act"], "Paul's first journey (Acts 13-14)", [
        ("Antioch 1", "Act.13.1"), ("Seleucia", "Act.13.4"), ("Salamis", "Act.13.5"), ("Paphos", "Act.13.6"),
        ("Perga", "Act.13.13"), ("Antioch 2", "Act.13.14"), ("Iconium", "Act.13.51"), ("Lystra", "Act.14.8"),
        ("Derbe", "Act.14.20"), ("Lystra", "Act.14.21"), ("Iconium", "Act.14.21"), ("Antioch 2", "Act.14.21"),
        ("Perga", "Act.14.25"), ("Attalia", "Act.14.25"), ("Antioch 1", "Act.14.26"),
    ]),
    ("paul2", ["Act"], "Paul's second journey (Acts 15:36-18:22)", [
        ("Antioch 1", "Act.15.35"), ("Derbe", "Act.16.1"), ("Lystra", "Act.16.1"), ("Troas", "Act.16.8"),
        ("Samothrace", "Act.16.11"), ("Neapolis", "Act.16.11"), ("Philippi", "Act.16.12"),
        ("Amphipolis", "Act.17.1"), ("Apollonia", "Act.17.1"), ("Thessalonica", "Act.17.1"), ("Berea", "Act.17.10"),
        ("Athens", "Act.17.15"), ("Corinth", "Act.18.1"), ("Cenchreae", "Act.18.18"), ("Ephesus", "Act.18.19"),
        ("Caesarea", "Act.18.22"), ("Jerusalem", "Act.18.22"), ("Antioch 1", "Act.18.22"),
    ]),
    ("paul3", ["Act"], "Paul's third journey (Acts 18:23-21:17)", [
        ("Antioch 1", "Act.18.22"), ("Ephesus", "Act.19.1"), ("Macedonia", "Act.20.1"), ("Greece", "Act.20.2"),
        ("Philippi", "Act.20.6"), ("Troas", "Act.20.6"), ("Assos", "Act.20.13"), ("Mitylene", "Act.20.14"),
        ("Chios", "Act.20.15"), ("Samos", "Act.20.15"), ("Miletus", "Act.20.15"), ("Cos", "Act.21.1"),
        ("Rhodes", "Act.21.1"), ("Patara", "Act.21.1"), ("Tyre", "Act.21.3"), ("Ptolemais", "Act.21.7"),
        ("Caesarea", "Act.21.8"), ("Jerusalem", "Act.21.17"),
    ]),
    ("rome", ["Act"], "The voyage to Rome (Acts 27-28)", [
        ("Caesarea", "Act.25.13"), ("Sidon", "Act.27.3"), ("Myra", "Act.27.5"), ("Cnidus", "Act.27.7"),
        ("Salmone", "Act.27.7"), ("Fair Havens", "Act.27.8"), ("Cauda", "Act.27.16"), ("Malta", "Act.28.1"),
        ("Syracuse", "Act.28.12"), ("Rhegium", "Act.28.13"), ("Puteoli", "Act.28.13"),
        ("Forum of Appius", "Act.28.15"), ("Three Taverns", "Act.28.15"), ("Rome", "Act.28.16"),
    ]),
]
