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

/** Each book's USFM code, three letters in capitals (GEN, 1SA, MRK) - the one abbreviation everywhere a book is
 *  shortened: the heading's place when the full name would wrap (main.ts), a reading plan's readings and the book
 *  pickers' short form. The Hebrew Bible's and the NT's codes are USFM's already (Gen, 1Sa, Mrk); the Septuagint's
 *  (LXX...) mapped to USFM's - its two texts of a book (Old Greek, Theodotion) both one code, marked OG / TH. */
export function usfm (code: string): string {
  const c = code.startsWith ("LXX") ? LXX_USFM[code.slice (3)] ?? code.slice (3) : code;
  return c.toUpperCase ();
}
const LXX_USFM: Record<string, string> = { "1Es": "1ES", Sol: "SNG", Sip: "SIR", Est: "ESG", Tbs: "TOB", Joe: "JOL", Nah: "NAM",
  Epj: "LJE", Eze: "EZK", Dan: "DAG OG", Dat: "DAG TH", Sus: "SUS OG", Sut: "SUS TH", Bel: "BEL OG", Bet: "BEL TH", "1En": "ENO", Ode: "ODA" };
