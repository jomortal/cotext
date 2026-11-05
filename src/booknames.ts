// Each book's name in its own language, shown beside the English in the book list (picker.ts): the Hebrew Bible's
// traditional Hebrew titles (most from the book's first words: בְּרֵאשִׁית "in the beginning"), the Septuagint's Greek
// titles, and the New Testament's Greek superscriptions (Κατὰ Μαθθαῖον). By COTEXT's book codes (build_db.py; the
// Septuagint's "LXX" + its code: lxx.py).

const HE: Record<string, string> = {
  Gen: "בְּרֵאשִׁית", Exo: "שְׁמוֹת", Lev: "וַיִּקְרָא", Num: "בְּמִדְבַּר", Deu: "דְּבָרִים", Jos: "יְהוֹשֻׁעַ", Jdg: "שֹׁפְטִים",
  Rut: "רוּת", "1Sa": "שְׁמוּאֵל א", "2Sa": "שְׁמוּאֵל ב", "1Ki": "מְלָכִים א", "2Ki": "מְלָכִים ב",
  "1Ch": "דִּבְרֵי הַיָּמִים א", "2Ch": "דִּבְרֵי הַיָּמִים ב", Ezr: "עֶזְרָא", Neh: "נְחֶמְיָה", Est: "אֶסְתֵּר", Job: "אִיּוֹב",
  Psa: "תְּהִלִּים", Pro: "מִשְׁלֵי", Ecc: "קֹהֶלֶת", Sng: "שִׁיר הַשִּׁירִים", Isa: "יְשַׁעְיָהוּ", Jer: "יִרְמְיָהוּ",
  Lam: "אֵיכָה", Ezk: "יְחֶזְקֵאל", Dan: "דָּנִיֵּאל", Hos: "הוֹשֵׁעַ", Jol: "יוֹאֵל", Amo: "עָמוֹס", Oba: "עֹבַדְיָה",
  Jon: "יוֹנָה", Mic: "מִיכָה", Nam: "נַחוּם", Hab: "חֲבַקּוּק", Zep: "צְפַנְיָה", Hag: "חַגַּי", Zec: "זְכַרְיָה", Mal: "מַלְאָכִי",
};

const GR: Record<string, string> = {
  // The New Testament
  Mat: "Κατὰ Μαθθαῖον", Mrk: "Κατὰ Μᾶρκον", Luk: "Κατὰ Λουκᾶν", Jhn: "Κατὰ Ἰωάννην", Act: "Πράξεις", Rom: "Πρὸς Ῥωμαίους",
  "1Co": "Πρὸς Κορινθίους Α΄", "2Co": "Πρὸς Κορινθίους Β΄", Gal: "Πρὸς Γαλάτας", Eph: "Πρὸς Ἐφεσίους",
  Php: "Πρὸς Φιλιππησίους", Col: "Πρὸς Κολοσσαεῖς", "1Th": "Πρὸς Θεσσαλονικεῖς Α΄", "2Th": "Πρὸς Θεσσαλονικεῖς Β΄",
  "1Ti": "Πρὸς Τιμόθεον Α΄", "2Ti": "Πρὸς Τιμόθεον Β΄", Tit: "Πρὸς Τίτον", Phm: "Πρὸς Φιλήμονα", Heb: "Πρὸς Ἑβραίους",
  Jas: "Ἰακώβου", "1Pe": "Πέτρου Α΄", "2Pe": "Πέτρου Β΄", "1Jn": "Ἰωάννου Α΄", "2Jn": "Ἰωάννου Β΄", "3Jn": "Ἰωάννου Γ΄",
  Jud: "Ἰούδα", Rev: "Ἀποκάλυψις",
  // The Septuagint
  LXXGen: "Γένεσις", LXXExo: "Ἔξοδος", LXXLev: "Λευιτικόν", LXXNum: "Ἀριθμοί", LXXDeu: "Δευτερονόμιον",
  LXXJos: "Ἰησοῦς", LXXJdg: "Κριταί", LXXRut: "Ῥούθ", LXX1Sa: "Βασιλειῶν Α΄", LXX2Sa: "Βασιλειῶν Β΄",
  LXX1Ki: "Βασιλειῶν Γ΄", LXX2Ki: "Βασιλειῶν Δ΄", LXX1Ch: "Παραλειπομένων Α΄", LXX2Ch: "Παραλειπομένων Β΄",
  LXX1Es: "Ἔσδρας Α΄", LXXEzr: "Ἔσδρας Β΄", LXXNeh: "Ἔσδρας Β΄", LXXEst: "Ἐσθήρ", LXXJob: "Ἰώβ", LXXPsa: "Ψαλμοί",
  LXXPro: "Παροιμίαι", LXXEcc: "Ἐκκλησιαστής", LXXSol: "Ἆισμα", LXXIsa: "Ἠσαΐας", LXXJer: "Ἱερεμίας",
  LXXLam: "Θρῆνοι", LXXEze: "Ἰεζεκιήλ", LXXDan: "Δανιήλ", LXXDat: "Δανιήλ", LXXHos: "Ὡσηέ", LXXJoe: "Ἰωήλ",
  LXXAmo: "Ἀμώς", LXXOba: "Ἀβδιού", LXXJon: "Ἰωνᾶς", LXXMic: "Μιχαίας", LXXNah: "Ναούμ", LXXHab: "Ἀμβακούμ",
  LXXZep: "Σοφονίας", LXXHag: "Ἀγγαῖος", LXXZec: "Ζαχαρίας", LXXMal: "Μαλαχίας",
  LXXTob: "Τωβίτ", LXXTbs: "Τωβίτ", LXXJdt: "Ἰουδίθ", LXXWis: "Σοφία Σαλωμῶνος", LXXSip: "Πρόλογος Σιράχ",
  LXXSir: "Σοφία Σιράχ", LXXBar: "Βαρούχ", LXXEpj: "Ἐπιστολὴ Ἰερεμίου", LXXSus: "Σουσάννα", LXXSut: "Σουσάννα",
  LXXBel: "Βὴλ καὶ Δράκων", LXXBet: "Βὴλ καὶ Δράκων", LXX1Ma: "Μακκαβαίων Α΄", LXX2Ma: "Μακκαβαίων Β΄",
  LXX3Ma: "Μακκαβαίων Γ΄", LXX4Ma: "Μακκαβαίων Δ΄", LXXPss: "Ψαλμοὶ Σολομῶντος", LXX1En: "Ἐνώχ", LXXOde: "ᾨδαί",
};

/** A book's name in its own language ([text, "he" | "gr"]), or null where there's none. */
export function nativeName (code: string): [string, "he" | "gr"] | null {
  return HE[code] ? [HE[code], "he"] : GR[code] ? [GR[code], "gr"] : null;
}

/** Each book's SBL abbreviation, by its English name: the heading's place when the full name would wrap (main.ts),
 *  and a reference typed on a verse card (versecards.ts: "Rom 8:28"). */
export const ABBR: Record<string, string> = { Genesis: "Gen", Exodus: "Exod", Leviticus: "Lev", Numbers: "Num", Deuteronomy: "Deut",
  Joshua: "Josh", Judges: "Judg", "1 Samuel": "1 Sam", "2 Samuel": "2 Sam", "1 Kings": "1 Kgs", "2 Kings": "2 Kgs",
  "1 Chronicles": "1 Chr", "2 Chronicles": "2 Chr", Nehemiah: "Neh", Esther: "Esth", Psalms: "Ps", Proverbs: "Prov",
  Ecclesiastes: "Eccl", "Song of Songs": "Song", Isaiah: "Isa", Jeremiah: "Jer", Lamentations: "Lam", Ezekiel: "Ezek",
  Daniel: "Dan", Hosea: "Hos", Obadiah: "Obad", Micah: "Mic", Nahum: "Nah", Habakkuk: "Hab", Zephaniah: "Zeph",
  Haggai: "Hag", Zechariah: "Zech", Malachi: "Mal", Matthew: "Matt", Romans: "Rom", "1 Corinthians": "1 Cor",
  "2 Corinthians": "2 Cor", Galatians: "Gal", Ephesians: "Eph", Philippians: "Phil", Colossians: "Col",
  "1 Thessalonians": "1 Thess", "2 Thessalonians": "2 Thess", "1 Timothy": "1 Tim", "2 Timothy": "2 Tim",
  Philemon: "Phlm", Hebrews: "Heb", James: "Jas", "1 Peter": "1 Pet", "2 Peter": "2 Pet", Revelation: "Rev",
  // (The Septuagint's: SBL's, its two texts of a book marked OG / Th)
  "1 Kingdoms": "1 Kgdms", "2 Kingdoms": "2 Kgdms", "3 Kingdoms": "3 Kgdms", "4 Kingdoms": "4 Kgdms", "1 Esdras": "1 Esd",
  "2 Esdras (Ezra)": "2 Esd", "2 Esdras (Nehemiah)": "Neh", "Wisdom of Solomon": "Wis", "Sirach (Prologue)": "Sir Prol",
  "Tobit (Sinaiticus)": "Tob S", "Letter of Jeremiah": "Ep Jer", "Daniel (Old Greek)": "Dan OG", "Daniel (Theodotion)": "Dan Th",
  "Susanna (Old Greek)": "Sus OG", "Susanna (Theodotion)": "Sus Th", "Bel and the Dragon (Old Greek)": "Bel OG",
  "Bel and the Dragon (Theodotion)": "Bel Th", "1 Maccabees": "1 Macc", "2 Maccabees": "2 Macc", "3 Maccabees": "3 Macc",
  "4 Maccabees": "4 Macc", "Psalms of Solomon": "Pss Sol" };
