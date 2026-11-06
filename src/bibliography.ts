// The Study printout's bibliography (chapterstudy.ts): every work the printout uses, alphabetized and written in the
// style its printout picks - SBL (the default), Chicago, Turabian, MLA or APA - then a short "Licenses" note with the
// notices the works' licenses ask for (attribution, the license and its link, what was changed).
// - THE WORKS: COTEXT keeps no author / title / year fields for its sources, only each one's credit line (note_sources'
//   credit, the atlas' base maps and eras, the lexicons' and texts' credits, the pipeline's own notes on what it read).
//   WORKS below are those credit lines taken apart into their fields - nothing added that a credit or the pipeline
//   doesn't say (a first name a credit leaves out stays out; a work with no year has none). A URL is the one the credit
//   or the pipeline names. A work generated for COTEXT (the Ancient Parallels, the Ancient Historians' pairings, the
//   atlas' political boundaries) is said to be generated, never made by hand.
// - WHICH ARE CITED: each resource's source id (or "text:OT" / "text:NT" / "text:LXX" for an original text, "lex:..."
//   for the word list's lexicon) names its works (CITES); a work with `seen` is cited only where its words appear in
//   the printout itself - an article's own credit line (an ancient text's translation, a historian's), a map's base map
//   and political boundaries as their credit lines under the map say.
// - THE STYLES: SBL (SBL Handbook of Style, 2nd ed.), Chicago (17th ed., notes-bibliography) and Turabian (9th ed.,
//   which follows Chicago) write these kinds of works alike: Last, First. Title. Edited by... Translated by... Place:
//   Publisher, Year. Site. URL. MLA (9th ed.): Last, First. Title. Edited by..., translated by..., Publisher, Year. Site,
//   url (no https://). APA (7th ed.): Last, F. (Year). Title (F. Last, Ed.; F. Last, Trans.). Publisher. Site. URL - "n.d."
//   for no year. The heading: Bibliography (SBL, Chicago, Turabian), Works Cited (MLA), References (APA). Entries sorted
//   by their first words (a leading "The" or "A" ignored), titles in italics, each with a hanging indent (style.css'
//   .csBib).

export type BibStyle = "sbl" | "chicago" | "turabian" | "mla" | "apa";
export const BIB_STYLES: [BibStyle, string][] = [["sbl", "SBL"], ["chicago", "Chicago"], ["turabian", "Turabian"], ["mla", "MLA"], ["apa", "APA"]];
export const isBibStyle = (x: unknown): x is BibStyle => BIB_STYLES.some (([k]) => k === x);

/** A work as its credit gives it. Names "Last, First" (First left out where the credit has none); org: a body as
 *  author (none of people); editors / translators the same way; version: its release; year: as the credit has it
 *  ("1909–1930"); site: where COTEXT took it from (Sefaria, eBible.org...); note: what it is where the title doesn't
 *  say (generated for COTEXT); license: its license ("public domain" needs no notice); notice: the words the license
 *  asks to carry (what was changed, a required line); seen: cite it only where this text is in the printout. */
interface Work {
  authors?: string[]; org?: string; title: string; editors?: string[]; translators?: string[]; version?: string;
  note?: string; publisher?: string; place?: string; year?: string; site?: string; url?: string;
  license?: string; notice?: string; seen?: string;
}

const PD = "public domain";
const STEP = "https://github.com/STEPBible/STEPBible-Data";
const SEFARIA = "https://www.sefaria.org";
const EBIBLE = "https://ebible.org";
const COTEXT = "https://github.com/jomortal/cotext";
const step = (title: string): Work => ({ org: "STEPBible", title, site: "STEPBible Data", publisher: "Tyndale House", place: "Cambridge", url: STEP, license: "CC BY 4.0" });
const ebible = (title: string, more: Partial<Work> = {}): Work => ({ title, site: "eBible.org", url: EBIBLE, license: PD, ...more });

/** Every work a printout can cite, by id (each from its credit line: notes.py's, tyndale_dict.py's, atlas.py's...). */
const WORKS: Record<string, Work> = {
  // ---- The original texts and their lexicons (STEPBible Data: fetch.py; the Septuagint: lxx.py) ----
  tahot: step ("TAHOT: Translators Amalgamated Hebrew OT"),
  tagnt: step ("TAGNT: Translators Amalgamated Greek NT"),
  tbesh: step ("TBESH: Translators Brief Lexicon of Extended Strongs for Hebrew"),
  tbesg: step ("TBESG: Translators Brief Lexicon of Extended Strongs for Greek"),
  tipnr: step ("TIPNR: Translators Individualised Proper Names with All References"),
  swete: { authors: ["Swete"], title: "The Old Testament in Greek according to the Septuagint", year: "1909–1930", license: PD },
  lxxswete: { authors: ["Wong, Eliran"], title: "LXX-Swete-1930", note: "Database of Swete's text, from Pasquale Amicarelli's BibleWorks module", year: "2017",
              url: "https://github.com/eliranwong/LXX-Swete-1930", license: "GPL-3.0" },
  lxxmorph: { authors: ["Kushniryk, Seth"], title: "lxx-morph", note: "Rahlfs' Septuagint (1935), tagged word by word", url: "https://github.com/OpenScriptorium/lxx-morph",
              license: "CC BY 4.0", notice: "Its lemmas and parsings matched to Swete's text and turned into COTEXT's codes." },
  // ---- Commentaries ----
  tn: { org: "unfoldingWord", title: "unfoldingWord Translation Notes", url: "https://unfoldingword.org/utn", license: "CC BY-SA 4.0",
        notice: "unfoldingWord Translation Notes: the original work by unfoldingWord is available from unfoldingword.org/utn. Adapted: reformatted, introductions left out." },
  tosn: { org: "Tyndale House Publishers", title: "Tyndale Open Study Notes", publisher: "Tyndale House Publishers", year: "2022", url: "https://tyndaleopenresources.com", license: "CC BY-SA 4.0",
          notice: "Adapted from Tyndale Open Study Notes, (c) 2022 Tyndale House Publishers. The original work is available for free at tyndaleopenresources.com." },
  kd: { authors: ["Keil", "Delitzsch"], title: "Biblical Commentary on the Old Testament", year: "1864", site: "CrossWire's SWORD module, from Wikisource", license: PD },
  vincent: { authors: ["Vincent, Marvin R."], title: "Word Studies in the New Testament", year: "1887", site: "the MySword module", license: PD },
  rwp: { authors: ["Robertson, A. T."], title: "Word Pictures in the New Testament", year: "1930–1933", publisher: "Broadman Press", site: "CrossWire's SWORD module RWP 2.0", url: "http://www.bf.org",
         license: "volumes 1–4 public domain; volumes 5–6 used by permission",
         notice: "Robertson's Word Pictures volumes 5-6 (John, Hebrews, the General Epistles, Revelation) (c) 1932, 1933, renewed 1960 Broadman Press, used by permission - free non-commercial distribution." },
  lightfoot: { authors: ["Lightfoot, John"], title: "A Commentary on the New Testament from the Talmud and Hebraica", year: "1658–1674", site: "CrossWire's SWORD module Lightfoot 1.0, from philologos.org", license: PD },
  jbl_col: { authors: ["Lightfoot, J. B."], title: "St Paul's Epistles to the Colossians and to Philemon", publisher: "Macmillan", year: "1875", site: "Project Gutenberg, eBook 50857",
             url: "https://www.gutenberg.org/ebooks/50857", license: PD },
  rashi_torah: { authors: ["Rashi"], title: "Rashi on the Torah", translators: ["Rosenbaum, M.", "Silbermann, A. M."], year: "1929–1934", site: "Sefaria", url: SEFARIA, license: PD },
  rashi_judaica: { title: "The Judaica Press Complete Tanach with Rashi", translators: ["Rosenberg, A. J."], publisher: "Judaica Press", site: "Sefaria", url: SEFARIA, license: "CC BY" },
  rashi_metsudah: { authors: ["Rashi"], title: "Rashi on the Prophets and Writings", publisher: "Metsudah Publications", site: "Sefaria", url: SEFARIA, license: "CC BY" },
  ibnezra: { authors: ["Ibn Ezra"], title: "Ibn Ezra's Commentary on the Pentateuch", translators: ["Strickman, H. Norman", "Silver, Arthur M."], publisher: "Menorah", year: "1988–2004",
             site: "Sefaria", url: SEFARIA, license: "CC BY-NC" },
  ramban: { authors: ["Ramban (Nachmanides)"], title: "Commentary on the Torah", translators: ["Chavel, Charles B."], publisher: "Shilo", year: "1971–1976", site: "Sefaria", url: SEFARIA, license: "CC BY" },
  catena: { authors: ["Aquinas, Thomas"], title: "Catena Aurea: Commentary on the Four Gospels, Collected out of the Works of the Fathers", editors: ["Newman, J. H."], publisher: "J. H. Parker",
            year: "1841–1845", site: "Historical Christian Faith Writings-Database", url: "https://github.com/HistoricalChristianFaith/Writings-Database", license: PD },
  fathers: { org: "Historical Christian Faith", title: "Historical Christian Faith Commentaries Database", url: "https://github.com/HistoricalChristianFaith/Commentaries-Database",
             license: "public-domain dedication" },
  // ---- Apparatus and manuscripts ----
  sblgnt: { editors: ["Holmes, Michael W."], title: "SBLGNT Apparatus", publisher: "Society of Biblical Literature and Logos Bible Software", year: "2010", license: "CC BY 4.0" },
  hottp: { org: "United Bible Societies", title: "Preliminary and Interim Report on the Hebrew Old Testament Text Project", publisher: "United Bible Societies", year: "1973–1980, 2003–2023",
           url: "https://github.com/ubsicap/ubs-open-license", license: "CC BY-SA 4.0", notice: "HOTTP adapted: its English only, reformatted." },
  dss: { authors: ["Abegg, Martin"], title: "The Biblical Dead Sea Scrolls", note: "Transcriptions", site: "ETCBC's dss (CACCHT: Jacobs, Naaijer, Roorda)", url: "https://github.com/ETCBC/dss",
         license: "CC BY-NC 4.0", notice: "Dead Sea Scrolls readings mapped to this text's verses." },
  sinaiticus: { org: "Codex Sinaiticus Project", title: "Codex Sinaiticus", note: "Transcription", version: "1.04", year: "2014", url: "https://codexsinaiticus.org", license: "CC BY-NC-SA 3.0",
                notice: "Codex Sinaiticus adapted: the first hand's text, the correctors' readings in brackets." },
  igntp: { org: "International Greek New Testament Project", title: "IGNTP Transcriptions", url: "https://iohannes.com", site: "iohannes.com, epistulae.org", license: "CC BY 4.0",
           notice: "IGNTP transcriptions adapted: each manuscript's text of the verse, manuscripts reading alike together." },
  bezae: { org: "International Greek New Testament Project", title: "Codex Bezae: The Greek Pages", note: "Transcription for Cambridge University Library", version: "1.03", year: "2016",
           license: "CC BY-NC-SA 3.0", notice: "Codex Bezae adapted: the first hand's text, the correctors' readings in brackets." },
  // ---- Translations ----
  web: ebible ("World English Bible"),
  bsb: ebible ("Berean Standard Bible"),
  kjv: ebible ("King James Version", { year: "1769" }),
  asv: ebible ("American Standard Version", { year: "1901" }),
  ylt: ebible ("Young's Literal Translation"),
  darby: ebible ("Darby Translation", { authors: ["Darby, J. N."] }),
  lsv: { title: "Literal Standard Version", publisher: "Covenant Press", year: "2020", url: "https://lsvbible.com", license: "CC BY-SA 4.0",
         notice: "Literal Standard Version changed: footnotes and headings left out, line breaks kept." },
  net: { title: "NET Bible", publisher: "Biblical Studies Press", year: "1996, 2019", url: "http://netbible.com", license: "used by permission, non-commercial",
         notice: "Scripture quoted by permission. Quotations designated (NET) are from the NET Bible® copyright ©1996, 2019 by Biblical Studies Press, L.L.C. http://netbible.com All rights reserved." },
  njps: { title: "Tanakh: The Holy Scriptures (NJPS)", publisher: "The Jewish Publication Society", year: "1985", site: "Sefaria", url: SEFARIA, license: "CC BY-NC" },
  ct: { title: "The Contemporary Torah", publisher: "The Jewish Publication Society", year: "2006", site: "Sefaria", url: SEFARIA, license: "CC BY-NC" },
  koren: { title: "The Koren Jerusalem Bible", publisher: "Koren Publishers Jerusalem", site: "Sefaria", url: SEFARIA, license: "CC BY-NC" },
  brenton: ebible ("The Septuagint Version of the Old Testament in English", { authors: ["Brenton, Sir Lancelot C. L."], year: "1851" }),
  brenton_lxx: ebible ("The Septuagint Version of the Old Testament in English, with the Apocrypha", { authors: ["Brenton, Sir Lancelot C. L."], year: "1851" }),
  emtv: ebible ("English Majority Text Version", { authors: ["Esposito, Paul W."], year: "2014", license: "CC BY-NC-ND 4.0" }),
  wyc: ebible ("Wycliffe's Bible with Modern Spelling", { authors: ["Noble, Terry"], year: "2001–2015", license: "CC BY-NC-ND 4.0" }),
  // ---- Ancient versions ----
  tpj: { title: "Targum Pseudo-Jonathan on the Torah", site: "Sefaria", url: SEFARIA, license: PD },
  etheridge: { authors: ["Etheridge, J. W."], title: "The Targums of Onkelos and Jonathan ben Uzziel on the Pentateuch", year: "1862", license: PD },
  tj: { title: "Targum Jonathan on the Prophets", note: "Mikraot Gedolot", site: "Sefaria", url: SEFARIA, license: PD },
  pauli: { authors: ["Pauli, C. W. H."], title: "The Chaldee Paraphrase on the Prophet Isaiah", place: "London", year: "1871", license: PD },
  // ---- Syntax ----
  macula_he: { org: "Biblica, Inc.", title: "MACULA Hebrew Linguistic Datasets", year: "2022–2024", url: "https://github.com/Clear-Bible/macula-hebrew", license: "CC BY 4.0",
               notice: "MACULA Hebrew adapted: its syntax trees drawn as clauses and phrases; the words and glosses this text's where they match." },
  whs: { org: "J. Alan Groves Center", title: "Westminster Hebrew Syntax", year: "1991–2018", license: "CC BY 4.0" },
  oshb: { org: "Open Scriptures", title: "Open Scriptures Hebrew Bible", note: "Morphology and Cherith glosses", license: "CC BY 4.0" },
  macula_gk: { org: "Biblica, Inc.", title: "MACULA Greek Linguistic Datasets", year: "2022–2024", url: "https://github.com/Clear-Bible/macula-greek", license: "CC BY 4.0",
               notice: "MACULA Greek adapted: its syntax trees of the Nestle 1904 text drawn as clauses and phrases; the words and glosses this text's where they match." },
  // ---- Dictionaries and articles ----
  tobd: { org: "Tyndale House Publishers", title: "Tyndale Open Bible Dictionary", publisher: "Tyndale House Publishers", year: "2023", url: "https://tyndaleopenresources.com", license: "CC BY-SA 4.0",
          notice: "Adapted from Tyndale Open Bible Dictionary, (c) 2023 Tyndale House Publishers. The original work is available for free at tyndaleopenresources.com." },
  ubs_he: { org: "United Bible Societies", title: "UBS Dictionary of Biblical Hebrew", publisher: "United Bible Societies", year: "2026", license: "CC BY-SA 4.0",
            notice: "UBS dictionaries: their semantic domains used to match the Tyndale Bible Dictionary's subjects." },
  ubs_gk: { org: "United Bible Societies", title: "UBS Dictionary of New Testament Greek", publisher: "United Bible Societies", year: "2023", license: "CC BY-SA 4.0" },
  wp_finds: { org: "Wikipedia", title: "List of inscriptions in biblical archaeology", note: "And each find's own article; the revisions pinned in COTEXT's build",
              url: "https://en.wikipedia.org/wiki/List_of_inscriptions_in_biblical_archaeology", license: "CC BY-SA 4.0",
              notice: "Archaeology finds adapted from Wikipedia, with finds and passages added by COTEXT." },
  commons: { org: "Wikimedia Commons", title: "Wikimedia Commons", note: "Photos, each credited under it", url: "https://commons.wikimedia.org", license: "as credited under each photo" },
  ane: { org: "COTEXT", title: "Ancient Parallels", note: "Texts from the Bible's world paired with the passages they parallel, generated for COTEXT; descriptions from Wikipedia (CC BY-SA 4.0)",
         url: COTEXT, license: "CC BY-SA 4.0" },
  historians: { org: "COTEXT", title: "Ancient Historians", note: "Ancient historians paired with the passages they bear on, generated for COTEXT", url: COTEXT },
  // (The ancient texts' translations - ane.py's TRANSLATIONS -, cited where an article prints its credit line)
  king: { translators: ["King, L. W."], title: "The Code of Hammurabi", site: "Wikisource", license: PD, seen: "The Code of Hammurabi" },
  budge_aten: { translators: ["Budge, E. A. Wallis"], title: "Tutankhamen: Amenism, Atenism and Egyptian Monotheism", year: "1923", site: "Wikisource", license: PD, seen: "Tutankhamen: Amenism" },
  smith: { translators: ["Smith, George"], title: "The Chaldean Account of Genesis", year: "1876", site: "Wikisource", license: PD, seen: "The Chaldean Account of Genesis" },
  egyptian: { title: "Egyptian Literature", year: "1901", site: "Wikisource", license: PD, seen: "Egyptian Literature (1901" },
  eden: { title: "The Forgotten Books of Eden", year: "1926", site: "Wikisource", license: PD, seen: "The Forgotten Books of Eden" },
  budge_deluge: { translators: ["Budge, E. A. Wallis"], title: "The Babylonian Story of the Deluge", year: "1920", site: "Project Gutenberg", url: "https://www.gutenberg.org/ebooks/7096", license: PD, seen: "The Babylonian Story of the Deluge" },
  budge_creation: { translators: ["Budge, E. A. Wallis"], title: "The Babylonian Legends of the Creation", year: "1921", site: "Project Gutenberg", url: "https://www.gutenberg.org/ebooks/9914", license: PD, seen: "The Babylonian Legends of the Creation" },
  pinches: { translators: ["Pinches, T. G."], title: "The Old Testament in the Light of the Historical Records and Legends of Assyria and Babylonia", year: "1908", site: "Project Gutenberg",
             url: "https://www.gutenberg.org/ebooks/38732", license: PD, seen: "Pinches" },
  rogers: { translators: ["Rogers, R. W."], title: "Cuneiform Parallels to the Old Testament", year: "1912", site: "the Internet Archive's scan, its text recognized and checked, generated for COTEXT",
            url: "https://archive.org/details/cu31924026822175", license: PD, seen: "Cuneiform Parallels to the Old Testament" },
  clay: { translators: ["Clay, A. T."], title: "A Hebrew Deluge Story in Cuneiform", year: "1922", site: "the Internet Archive's scan, its text recognized and checked, generated for COTEXT",
          url: "https://archive.org/details/cu31924026803001", license: PD, seen: "A Hebrew Deluge Story in Cuneiform" },
  // (The historians' translations - historians.py's WORKS -, cited the same way)
  jos_ant: { authors: ["Josephus"], title: "Jewish Antiquities", translators: ["Whiston, William"], year: "1737", site: "Project Gutenberg", url: "https://www.gutenberg.org/ebooks/2848", license: PD, seen: "Jewish Antiquities" },
  jos_war: { authors: ["Josephus"], title: "The Jewish War", translators: ["Whiston, William"], year: "1737", site: "Project Gutenberg", url: "https://www.gutenberg.org/ebooks/2850", license: PD, seen: "The Jewish War" },
  suetonius: { authors: ["Suetonius"], title: "The Lives of the Twelve Caesars", translators: ["Thomson, Alexander", "Forester, T."], site: "Project Gutenberg", url: "https://www.gutenberg.org/ebooks/6400", license: PD, seen: "Twelve Caesars" },
  pliny: { authors: ["Pliny the Younger"], title: "Letters", translators: ["Melmoth, William", "Bosanquet, F. C. T."], site: "Project Gutenberg", url: "https://www.gutenberg.org/ebooks/2811", license: PD, seen: "Pliny the Younger" },
  lucian: { authors: ["Lucian"], title: "The Death of Peregrine", translators: ["Fowler, H. W.", "Fowler, F. G."], year: "1905", site: "Project Gutenberg", url: "https://www.gutenberg.org/ebooks/47242", license: PD, seen: "The Death of Peregrine" },
  herodotus: { authors: ["Herodotus"], title: "The Histories", translators: ["Macaulay, G. C."], year: "1890", site: "Project Gutenberg", license: PD, seen: "Macaulay" },
  xenophon: { authors: ["Xenophon"], title: "Cyropaedia", translators: ["Dakyns, H. G."], site: "Project Gutenberg", url: "https://www.gutenberg.org/ebooks/2085", license: PD, seen: "Cyropaedia" },
  polybius: { authors: ["Polybius"], title: "The Histories", translators: ["Shuckburgh, E. S."], year: "1889", site: "Project Gutenberg", url: "https://www.gutenberg.org/ebooks/44126", license: PD, seen: "Shuckburgh" },
  tacitus: { authors: ["Tacitus"], title: "Annals", translators: ["Church, A. J.", "Brodribb, W. J."], year: "1876", site: "Wikisource", license: PD, seen: "Brodribb" },
  philo_flaccus: { authors: ["Philo"], title: "Against Flaccus", translators: ["Yonge, C. D."], year: "1855", site: "Wikisource", license: PD, seen: "Against Flaccus" },
  philo_embassy: { authors: ["Philo"], title: "On the Embassy to Gaius", translators: ["Yonge, C. D."], year: "1855", site: "Wikisource", license: PD, seen: "Embassy to Gaius" },
  philo_cherubim: { authors: ["Philo"], title: "On the Cherubim", translators: ["Yonge, C. D."], year: "1854", site: "Wikisource", license: PD, seen: "On the Cherubim" },
  eusebius: { authors: ["Eusebius"], title: "Church History", translators: ["McGiffert, A. C."], note: "Nicene and Post-Nicene Fathers", year: "1890", site: "Wikisource", license: PD, seen: "McGiffert" },
  // ---- The atlas and the timeline ----
  openbible: { org: "OpenBible.info", title: "Bible Geocoding Data", url: "https://github.com/openbibleinfo/Bible-Geocoding-Data", license: "CC BY 4.0",
               notice: "Bible Geocoding Data: places tied to the text's words through STEPBible's TIPNR." },
  ne: { org: "Natural Earth", title: "Natural Earth", note: "Land, lakes, rivers and shaded relief", license: PD, seen: "Base map: Natural Earth" },
  awmc: { org: "Ancient World Mapping Center", title: "Ancient World Mapping Center Geodata", note: "From the Barrington Atlas and OpenStreetMap", url: "https://awmc.unc.edu", license: "ODbL 1.0",
          notice: "Ancient World Mapping Center data: ancient seas, inland water, the era's roads, the Roman provinces of 200 CE.", seen: "Ancient World Mapping Center" },
  dare: { authors: ["Åhlfeldt, Johan"], title: "Digital Atlas of the Roman Empire", url: "https://imperium.ahlfeldt.se", license: "CC BY-SA 3.0",
          notice: "Digital Atlas of the Roman Empire: its provinces and roads.", seen: "Digital Atlas of the Roman Empire" },
  eras: { org: "COTEXT", title: "Political Boundaries", note: "Generated for COTEXT after public-domain historical atlases (Shepherd, 1911; G. A. Smith, 1915); approximate", url: COTEXT,
          seen: "Political boundaries: generated" },
  theographic: { authors: ["Rouse, Robert"], title: "Theographic Bible Metadata", url: "https://github.com/robertrouse/theographic-bible-metadata", license: "CC BY-SA 4.0",
                 notice: "Theographic Bible Metadata: its dates, events and people drawn as the timeline's bars." },
};

/** What each thing in a printout cites, by its key: a text ("text:" + its testament), the word list's lexicon ("lex:"
 *  + testament), a resource by its source id. (The Atlas' base maps, political boundaries and the ancient texts'
 *  translations are cited by `seen`, as the printout shows them.) */
const CITES: Record<string, string[]> = {
  "text:OT": ["tahot"], "text:NT": ["tagnt"], "text:LXX": ["swete", "lxxswete", "lxxmorph", "tbesg"],
  "lex:OT": ["tbesh"], "lex:NT": ["tbesg"], "lex:LXX": ["tbesg", "lxxmorph"],
  stepbible: ["tagnt", "tahot"],
  rashi: ["rashi_torah", "rashi_judaica", "rashi_metsudah"],
  tpj: ["tpj", "etheridge"], tj: ["tj", "pauli"],
  diagram_ot: ["macula_he", "whs", "oshb"], diagram_nt: ["macula_gk"],
  tobd: ["tobd", "tipnr", "ubs_he", "ubs_gk"],
  finds: ["wp_finds", "commons", "tipnr"],
  ane: ["ane", "commons"],
  historians: ["historians", "brenton_lxx"],
  atlas: ["openbible", "tipnr"],
  timeline: ["theographic", "tipnr"],
};

/** The works cited: each key's (CITES, else the work of that id), and every work whose `seen` text is in shown (the
 *  printout's own text). */
export function citedWorks (keys: Iterable<string>, shown: string): string[] {
  const ids = new Set<string> ();
  for (const k of keys) for (const id of CITES[k] ?? [k]) if (WORKS[id]) ids.add (id);
  for (const [id, w] of Object.entries (WORKS)) if (w.seen && shown.includes (w.seen)) ids.add (id);
  return [...ids];
}

// ---- Writing an entry ----
/** A piece of an entry: its text, in italics or not. */
export type Seg = { text: string; i?: boolean };

const first = (n: string) => { const [l, f] = n.split (/,\s*/, 2); return f ? `${f} ${l}` : l; };     // ("Vincent, Marvin R." -> "Marvin R. Vincent")
/** APA's name: Last, F. M. (initials of each given name; "Sir" and a lone body name kept as they are). */
const apaName = (n: string) => {
  const [l, f] = n.split (/,\s*/, 2);
  if (! f) return l;
  return `${l}, ${f.replace (/^Sir\s+/, "").split (/[\s.]+/).filter (Boolean).map ((x) => `${x[0]}.`).join (" ")}`;
};
/** Names joined: the first as given (inverted where it's the entry's lead), the rest First Last; "and" before the last
 *  (MLA: three or more, the first and "et al."; APA: "&", each inverted with initials). */
function names (ns: string[], style: BibStyle, lead: boolean): string {
  if (style === "apa") {
    const xs = ns.map ((n) => lead ? apaName (n) : apaName (n).replace (/^([^,]+), (.+)$/, "$2 $1"));
    return xs.length < 2 ? xs[0] : xs.length === 2 ? `${xs[0]}${lead && ns[0].includes (",") ? "," : ""} & ${xs[1]}` : `${xs.slice (0, -1).join (", ")}, & ${xs[xs.length - 1]}`;
  }
  if (style === "mla" && lead && ns.length > 2) return `${ns[0]}, et al.`;
  const xs = ns.map ((n, i) => lead && ! i ? n : first (n));
  return xs.length < 2 ? xs[0] : xs.length === 2 ? `${xs[0]}${lead && ns[0].includes (",") ? "," : ""} and ${xs[1]}` : `${xs.slice (0, -1).join (", ")}, and ${xs[xs.length - 1]}`;
}
const dot = (s: string) => /[.?!]$/.test (s) ? s : s + ".";
const bare = (u: string) => u.replace (/^https?:\/\//, "");
/** Where a work was taken from, as it starts a sentence ("the MySword module" -> "The MySword module"). */
const siteOf = (w: Work) => (w.site ?? "").replace (/^the /, "The ");

/** A work's entry in a style, as pieces (the title in italics). */
function entry (w: Work, style: BibStyle): Seg[] {
  const out: Seg[] = [];
  const put = (text: string, i = false) => { if (text) out.push ({ text, i }); };
  const eds = w.editors?.length ? w.editors : [], trs = w.translators?.length ? w.translators : [];
  // The lead: authors, else a body, else editors (ed.), else translators (trans.), else the title itself
  const lead = w.authors?.length ? names (w.authors, style, true) : w.org && w.org !== w.title ? w.org : "";
  const byEds = ! lead && eds.length, byTrs = ! lead && ! eds.length && trs.length;
  if (style === "apa") {
    const who = lead ? (w.authors?.length ? lead : w.org!) : byEds ? `${names (eds, style, true)} (${eds.length > 1 ? "Eds." : "Ed."})` : byTrs ? `${names (trs, style, true)} (Trans.)` : "";
    const year = `(${w.year ?? "n.d."}).`;
    if (who) put (`${dot (who)} ${year} `);
    put (w.title, true);
    const inner = [w.version ? `Version ${w.version}` : "", ! byEds && eds.length ? `${names (eds, style, false)}, ${eds.length > 1 ? "Eds." : "Ed."}` : "",
                   ! byTrs && trs.length ? `${names (trs, style, false)}, Trans.` : ""].filter (Boolean).join ("; ");
    put (inner ? ` (${inner}).` : ".");
    if (! who) put (` ${year}`);
    if (w.note) put (` [${w.note}].`);
    if (w.publisher && w.publisher !== (w.authors?.length ? "" : w.org)) put (` ${dot (w.publisher)}`);
    if (w.site) put (` ${dot (siteOf (w))}`);
    if (w.url) put (` ${w.url}`);
    return out;
  }
  if (style === "mla") {
    if (lead) put (`${dot (lead)} `);
    else if (byEds) put (`${names (eds, style, true)}, ${eds.length > 1 ? "editors" : "editor"}. `);
    else if (byTrs) put (`${names (trs, style, true)}, ${trs.length > 1 ? "translators" : "translator"}. `);
    put (w.title, true);
    put (".");
    if (w.note) put (` ${dot (w.note)}`);
    const parts = [! byEds && eds.length ? `Edited by ${names (eds, style, false)}` : "", ! byTrs && trs.length ? `${eds.length && ! byEds ? "translated" : "Translated"} by ${names (trs, style, false)}` : "",
                   w.version ? `version ${w.version}` : "", w.publisher && w.publisher !== w.org ? w.publisher : "", w.year ?? ""].filter (Boolean);
    if (parts.length) put (` ${parts.join (", ")}.`);
    if (w.site || w.url) {
      put (" ");
      if (w.site) { put (siteOf (w), true); put (w.url ? ", " : "."); }
      if (w.url) put (`${bare (w.url)}.`);
    }
    return out;
  }
  // SBL, Chicago, Turabian
  if (lead) put (`${dot (lead)} `);
  else if (byEds) put (`${names (eds, style, true)}, ${eds.length > 1 ? "eds" : "ed"}. `);
  else if (byTrs) put (`${names (trs, style, true)}, trans. `);
  put (w.title, true);
  put (".");
  if (w.note) put (` ${dot (w.note)}`);
  if (! byEds && eds.length) put (` Edited by ${names (eds, style, false)}.`);
  if (! byTrs && trs.length) put (` Translated by ${names (trs, style, false)}.`);
  if (w.version) put (` Version ${w.version}.`);
  const pub = w.publisher && w.publisher !== w.org ? w.publisher : w.publisher && ! lead ? w.publisher : "";
  const pubLine = [w.place && pub ? `${w.place}: ${pub}` : w.place || pub, w.year ?? ""].filter (Boolean).join (", ");
  if (pubLine) put (` ${pubLine}.`);
  if (w.site) put (` ${dot (siteOf (w))}`);
  if (w.url) put (` ${w.url}.`);
  return out;
}

/** The plain words an entry sorts by: its text, a leading "The" or "A" dropped, without case. */
const sortKey = (segs: Seg[]) => segs.map ((s) => s.text).join ("").replace (/^(The|A|An)\s+/i, "").toLowerCase ();

/** The bibliography's heading in a style. */
export const bibHeading = (style: BibStyle) => style === "mla" ? "Works Cited" : style === "apa" ? "References" : "Bibliography";

/** The works' entries in a style, alphabetized. */
export function bibliography (ids: string[], style: BibStyle): Seg[][] {
  return ids.map ((id) => entry (WORKS[id], style)).sort ((a, b) => sortKey (a).localeCompare (sortKey (b)));
}

/** A license's own address (none for one a credit names without its version: Sefaria's "CC BY-NC"). */
const LICENSE_URLS: Record<string, string> = {
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/", "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
  "CC BY-SA 3.0": "https://creativecommons.org/licenses/by-sa/3.0/", "CC BY-NC 4.0": "https://creativecommons.org/licenses/by-nc/4.0/",
  "CC BY-NC-SA 3.0": "https://creativecommons.org/licenses/by-nc-sa/3.0/", "CC BY-NC-ND 4.0": "https://creativecommons.org/licenses/by-nc-nd/4.0/",
  "ODbL 1.0": "https://opendatacommons.org/licenses/odbl/1-0/", "GPL-3.0": "https://www.gnu.org/licenses/gpl-3.0.html",
};

/** The Licenses note: a line per license (but public domain) naming its works and its address, then each work's own
 *  notice (what was changed, a required line). */
export function licenses (ids: string[]): string[] {
  const by = new Map<string, string[]> ();
  for (const id of ids) {
    const w = WORKS[id];
    if (! w.license || w.license === PD) continue;
    (by.get (w.license) ?? by.set (w.license, []).get (w.license)!).push (w.title);
  }
  const lines = [...by].sort (([a], [b]) => a.localeCompare (b))
    .map (([l, ts]) => `${l}${LICENSE_URLS[l] ? ` (${LICENSE_URLS[l]})` : ""}: ${[...new Set (ts)].sort ().join ("; ")}.`);
  return [...lines, ...ids.map ((id) => WORKS[id].notice ?? "").filter (Boolean).sort ()];
}
