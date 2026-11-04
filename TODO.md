# COTEXT to do

COTEXT stays free (never sold), so non-commercial resources are fair to use; each one's credit is kept, and parts under
a non-commercial license are marked so in NOTICE.

## Next up (queued 2026-11-04)

- [x] **Tyndale Bible Dictionary, linked both ways** (done 2026-11-04): by word through the UBS
      semantic domains as well as the exact English (flock, lamb -> Sheep); by passage, a resources choice listing the
      articles citing the verses shown (and those its words lead to), most relevant first; searchable in the search
      dropdown, each hit linked back by word or verse.
- [ ] **☰ Grammars**: pick a grammar (Gesenius, Machen, Smyth, unfoldingWord), its contents, read any section, search.
- [ ] **☰ Bible Dictionary**: browse the Tyndale articles A-Z with a filter, each with its linked verses.
- [x] **Atlas, by word and by passage** (built 2026-11-04 - pick a base map to keep) (try a few to compare): OpenBible.info geocoding (CC BY) + TIPNR places;
      base maps from Natural Earth (public domain), the Ancient World Mapping Center (CC BY), the Digital Atlas of the
      Roman Empire (CC BY); a place name tapped shows its map, a resources choice maps the chapter's places.
- [x] **Archaeology** (trial, 2026-11-04 - try them out):
  - [x] **Archaeology finds** (Wikipedia's list of inscribed finds, CC BY-SA; photos from Wikimedia Commons): 68 finds,
        each its date, find spot, museum, writing, what it bears on, its article's lead and a photo (45); by passage
        (notes' Archaeology finds), by word (a word panel's Finds) and searchable.
  - [ ] ~~Barton, Archaeology and the Bible (1916)~~ - skipped: only scans and raw OCR (archive.org); no clean text.
- [ ] Before the public beta: slim the resources down (the user's pick).

## In progress

- [x] **Greek lexicons**: the full Abbott-Smith, Thayer's, the Middle Liddell and Dodson, in the word panel's LEXICON
      picker. Decide: Thayer's the Greek default?
- [ ] **Moulton & Milligan**: only an unlicensed, AI-OCR digitization exists (curran-gehring/moulton-milligan) - ask its
      author for a license, or wait.
- [x] **Non-commercial resources** surveyed: see Possible additions below.

## Picked to add (2026-11-03)

Round 1 (done 2026-11-03): UBS Hebrew and Greek dictionaries, Jastrow, Klein (LEXICON); NJPS, NET, Brenton,
eBible EMTV / Wycliffe (translations); Ibn Ezra, Rashi, Ramban (commentaries); HOTTP, Dead Sea Scrolls, Miqra / Minchat
Shai, Sinaiticus, IGNTP (apparatus; TCENT, Miqra and Minchat Shai added, then removed 2026-11-04); Targums Onkelos and Jonathan (a new ANCIENT VERSIONS group);
unfoldingWord Hebrew and Greek grammars (GRAMMAR); Shmuelof's recorded Tanakh (a voice for reading aloud).

Round 2 (after round 1):
- [x] Sentence diagrams (MACULA, both testaments) in the notes panel's SYNTAX - to tune by trying them.
- [ ] BHSA as a second OT diagram; ETCBC add-ons (phono, parallels, valence), PROIEL, OpenText.org, OpenGNT - not yet.
- [x] Septuagint (Swete text, lxx-morph tags) with HEBREW / GREEK in the ☰ menu.
- [ ] Next (after the NT commentaries job, which owns notes.ts): a HEBREW OT notes source for LXX books - the matching
      Hebrew verse as COTEXT's own interlinear (words, glosses, parsing, verb colors; tap a word for its info), no
      panel or top bar of its own; LXX verses mapped to the Hebrew's. (The reverse - the LXX beside the Hebrew - only if asked.)
- [ ] Septuagint gaps: 2,098 untagged words, 5,398 LXX-only lemmas without a gloss (LSJ filled 1,463); deponents (πορεύομαι, φοβέομαι) get their own keys instead of the NT's active heads; diagrams / UBS "used here" for it.
- [ ] Decide: LXX-Swete-1930's digitization is GPL-3.0 - redistributing its text may put COTEXT's data under the GPL.

## Possible additions (from the survey, 2026-11-03 - to pick from; nothing added until chosen)

Non-commercial, no permission needed (each license quoted in the survey; NC parts to be marked in NOTICE):
- [ ] ETCBC BHSA - the Hebrew Bible's clause and phrase structure (subject, object, clause types, narrative / speech): a syntax layer (CC BY-NC 4.0)
- [ ] ETCBC add-ons - phonological transcription, parallel passages, verb valence and senses
- [ ] Sefaria NJPS Tanakh (1985), The Contemporary Torah, Koren Jerusalem Bible - translations (CC BY-NC)
- [ ] Sefaria Ibn Ezra on the Torah (English), Targum Onkelos with English - commentary, ancient version (CC BY-NC)
- [ ] PROIEL treebank - the Greek NT's dependency syntax, with the Vulgate, Gothic, Armenian, Old Church Slavonic aligned (CC BY-NC-SA)
- [ ] ETCBC Dead Sea Scrolls - biblical scrolls' readings for an OT verse (CC BY-NC 4.0)
- [ ] ETCBC Peshitta - the Syriac OT (CC BY-NC)
- [ ] Samaritan Pentateuch (DT-UCPH) - for Genesis-Deuteronomy (CC BY-NC 4.0, work in progress)
- [ ] Codex Sinaiticus transcription - its readings for NT / LXX verses (CC BY-NC-SA 3.0; license not checked first-hand)
- [ ] Ewald's Elementary NT Greek - a grammar choice (CC BY-NC-SA; PDF only, sections by hand)
- [ ] Audio, human voices: Shmuelof's Hebrew Tanakh (BY-NC-ND), Phemister's Greek NT (Erasmian, BY-NC), Andy Martin's Nestle 1904 (63% of the NT, BY-NC-ND)
- [ ] eBible NC texts: English Majority Text Version, Greek NT Family 35, Wycliffe modern spelling (BY-NC-ND)

Open licenses (CC BY / BY-SA / public domain), also not yet in:
- [ ] UBS Dictionary of Biblical Hebrew (SDBH, 99% of OT words, keyed by Strong's) and the UBS Dictionary of the Greek NT (Louw-Nida) - LEXICON choices by meaning; each sense lists every verse it's used in, so the panel could show the sense used right here (CC BY-SA 4.0)
- [ ] UBS HOTTP - OT text-critical analysis with A-D ratings: an apparatus source; UBS parallel passages (incl. OT quotes in the NT)
- [ ] Sefaria: Miqra according to the Masorah, Minchat Shai, Targums Onkelos and Jonathan with Etheridge's English, Rashi (Judaica Press / Metsudah, CC BY), Ramban (Chavel, CC BY), Jastrow
- [ ] NET Bible text (quotable with credit, no permission) - a translation
- [ ] OpenText.org NT clause annotation (CC BY-SA 4.0); OpenGNT clause-by-clause English (check its license)
- [ ] NT text-critical: the Text-Critical English NT (Boyd 2022, CC BY 4.0 - footnotes on the editions' differences: the nearest open thing to Metzger; changed, it can't keep its name), IGNTP transcriptions (CC BY), Greek with manuscript notes
- (Westcott & Hort's Notes on Select Readings, 1882: public domain, but no clean text - Wikisource has the Introduction, not the Appendix)
- [ ] Tagged Septuagint: LXX-Swete-1930 (Tauber's morphology, GPL-3.0); Brenton's English (public domain)
- [ ] Rabbi Dan Be'eri's Hebrew Tanakh audio (CC BY-SA; about a third missing)
- [ ] unfoldingWord Hebrew and Greek grammars (CC BY-SA; license not checked)
- [ ] Jastrow (1903, public domain) - Aramaic and rabbinic Hebrew lexicon, via Sefaria's API (by headword): for Daniel and Ezra's Aramaic, or with Targums
- [ ] Klein's Etymological Dictionary (CC BY-NC, Sefaria) - an etymology note beside BDB
- (Not available as clean text: Gesenius' Hebrew and Chaldee Lexicon (Tregelles) - OCR in progress at machshev/gesenius-lexicon; Davidson's Analytical Lexicon - scans only)

Needs permission (later): Willker's Textual Commentary on the Greek Gospels (free PDFs, a Metzger-like verse-by-verse commentary), CATSS LXX morphology and its Hebrew-Greek alignment, NET notes, Analytic Septuagint, NETS, CAL Targum data; the Lexham English Bible's license has conditions.

## Smaller downloads (back burner: not yet)

- [x] Updates without waiting (2026-11-04): the main database split into parts (core, lexicon, grammar, ot, nt, lxx),
      each versioned on its own; an update opens the copy on the device at once and fetches only the changed parts in
      the background, used from the next start.

- [ ] Split the 48 MB first download: each book's text when first opened, each grammar on its first link, each
      testament's lexicon on its first word; the Bible-wide counts (frequency, Vocab's lists) stay in the first, small
      download. Each piece kept once fetched (offline for what's been read), plus DOWNLOAD FOR OFFLINE: everything at
      once. After the Greek lexicons job (both change how files are fetched).

## Major translations (online, by publishers' free APIs)

- [ ] **ESV** - Crossway's ESV API: the user signs up for a key (free, non-commercial terms).
- [ ] **NLT** - Tyndale's NLT API: likewise.
- [ ] **API.Bible** (American Bible Society) - see which versions it offers free for non-commercial use.
- [ ] Build: a notes-panel source kind "online translation" - fetched per passage (not stored beyond what each API's
      terms allow), its copyright line shown, hidden when offline. Each API's limits (verses per request, requests per
      day, caching) read first.

## Ask permission (once the app is polished - all at once, the user's plan; Claude drafts the requests)

To prepare first (trust as much as polish):
- [ ] Written references - Bible school professors (Greek, Hebrew, Septuagint) vouching for the user and the app;
      better still one named as an advisor, or who'd use it with students.
- [ ] A short project page: what COTEXT is, who's behind it, free with no ads, how each source is credited.
- [ ] A demo (the beta link, or a short video) showing their resource in use, credited.
- [ ] Clear commitments: non-commercial, their attribution wording, their text unchanged, the data hard to extract
      (inside the app's database, never offered as a file); willing to sign their agreement; errors found sent back;
      what happens to their data if the project stops.


- [ ] **CATSS LXX morphology** (Rahlfs, tagged) - CCAT / the Kraft-Tov team.
- [ ] **NET Bible** and its translators' notes - bible.org.
- [ ] **Analytic Septuagint** - its author and the LXXM rights holders.
- [ ] **CSNTM** - its NT manuscript photographs, shipped or shown in COTEXT (as BibleWorks 10 and Accordance had them).

## Accounts and cloud storage

- [ ] **Cloudflare, free tier**: a Worker and a D1 database holding each person's data (vocab, known words, settings,
      choices: a few kB each), in the user's own Cloudflare account.
- [ ] Sign-in: pick how (Sign in with Google, an emailed link, or a passkey).
- [ ] Sync: the device's copy first (works offline), merged with the account's on sign-in and after each change.
- [ ] A privacy page (what's stored, how to delete it) and a "delete my data" button.
- [ ] Optional fallback: export / import a file, no account.

## Other open items

- [ ] **Manuscripts** (further down the list): a resources choice listing the manuscripts with the verse shown (oldest
      first, date, a page thumbnail), COTEXT's own viewer (zoom, drag, next / previous page, the verse marked where the
      transcription knows it), the images live from their holders (online only) - the Virtual Manuscript Room (INTF:
      which manuscripts have a verse, on which page) and the Codex Sinaiticus Project first; each holder's terms for
      showing images in an app checked first. Later, with permission: CSNTM's photographs (as BibleWorks and Accordance
      had), the IAA's Dead Sea Scrolls, the British Library, the Vatican (Vaticanus), the Leningrad Codex.

- [ ] Search: an index on words.strong, so a common root (אָמַר, 4,339 verses: ~0.9 s) is as fast as a rare one (~50 ms) - adds
      19 MB to the database (82 -> 102 MB) and needs a full rebuild (pipeline/build_db.py, ~8 minutes). Not now.

- [ ] Targum Onkelos' English (later): Etheridge's 1862 translation covers the whole Torah, but only as scans
      (archive.org) - recognized, checked and matched by verse (our copy has it for part of Genesis only). Then
      Onkelos comes back (removed 2026-11-04: notes_sefaria.py built it, Aramaic with that partial English).

- [ ] Read-aloud with an online voice (Google Cloud TTS): the API key saved at `~/.config/cotext/google-tts-key.txt`,
      then sample chapters (John 1, Genesis 1) to choose a voice before making the whole Bible.
- [ ] Start the COTEXT servers (ports 8090 dev, 8091 beta) by themselves at login.
- [ ] Show the logo inside the app.
- [ ] Compress the notes panel's files.
- [ ] Remove the stray DNS record `dev.cotext.org.numerator.studio`.
- [ ] Vider: native speech.
