# COTEXT to do

COTEXT stays free (never sold), so non-commercial resources are fair to use; each one's credit is kept, and parts under
a non-commercial license are marked so in NOTICE.

## In progress

- [x] **Greek lexicons**: the full Abbott-Smith, Thayer's, the Middle Liddell and Dodson, in the word panel's LEXICON
      picker. Decide: Thayer's the Greek default?
- [ ] **Moulton & Milligan**: only an unlicensed, AI-OCR digitization exists (curran-gehring/moulton-milligan) - ask its
      author for a license, or wait.
- [x] **Non-commercial resources** surveyed: see Possible additions below.

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
- [ ] UBS Semantic Dictionary of Biblical Hebrew and the UBS Greek NT dictionary - LEXICON choices by meaning (CC BY-SA 4.0)
- [ ] UBS HOTTP - OT text-critical analysis with A-D ratings: an apparatus source; UBS parallel passages (incl. OT quotes in the NT)
- [ ] Sefaria: Miqra according to the Masorah, Minchat Shai, Targums Onkelos and Jonathan with Etheridge's English, Rashi (Judaica Press / Metsudah, CC BY), Ramban (Chavel, CC BY), Jastrow
- [ ] NET Bible text (quotable with credit, no permission) - a translation
- [ ] OpenText.org NT clause annotation (CC BY-SA 4.0); OpenGNT clause-by-clause English (check its license)
- [ ] NT text-critical: IGNTP transcriptions (CC BY), the Text-Critical English NT, Greek with manuscript notes
- [ ] Tagged Septuagint: LXX-Swete-1930 (Tauber's morphology, GPL-3.0); Brenton's English (public domain)
- [ ] Rabbi Dan Be'eri's Hebrew Tanakh audio (CC BY-SA; about a third missing)
- [ ] unfoldingWord Hebrew and Greek grammars (CC BY-SA; license not checked)
- [ ] Still being checked: Gesenius' Hebrew and Chaldee Lexicon (Tregelles), Davidson's Analytical Lexicon, Klein's Etymological Dictionary

Needs permission (later): CATSS LXX morphology and its Hebrew-Greek alignment, NET notes, Analytic Septuagint, NETS, CAL Targum data; the Lexham English Bible's license has conditions.

## Smaller downloads (back burner: not yet)

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

## Ask permission (once the app is polished)

- [ ] **CATSS LXX morphology** (Rahlfs, tagged) - CCAT / the Kraft-Tov team.
- [ ] **NET Bible** and its translators' notes - bible.org.
- [ ] **Analytic Septuagint** - its author and the LXXM rights holders.

## Accounts and cloud storage

- [ ] **Cloudflare, free tier**: a Worker and a D1 database holding each person's data (vocab, known words, settings,
      choices: a few kB each), in the user's own Cloudflare account.
- [ ] Sign-in: pick how (Sign in with Google, an emailed link, or a passkey).
- [ ] Sync: the device's copy first (works offline), merged with the account's on sign-in and after each change.
- [ ] A privacy page (what's stored, how to delete it) and a "delete my data" button.
- [ ] Optional fallback: export / import a file, no account.

## Other open items

- [ ] Read-aloud with an online voice (Google Cloud TTS): the API key saved at `~/.config/cotext/google-tts-key.txt`,
      then sample chapters (John 1, Genesis 1) to choose a voice before making the whole Bible.
- [ ] Start the COTEXT servers (ports 8090 dev, 8091 beta) by themselves at login.
- [ ] Show the logo inside the app.
- [ ] Compress the notes panel's files.
- [ ] Remove the stray DNS record `dev.cotext.org.numerator.studio`.
- [ ] Vider: native speech.
