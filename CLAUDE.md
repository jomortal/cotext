# COTEXT

A Bible study app for students learning Biblical Greek and Hebrew.

## The plan (2026-11-01; first build 2026-11-02 - see Done below)

- **Core:** an interlinear (original text with English beneath each word) and parsing information for every word - each switched on and off by the reader.
- **Parsing as shown:** compact, readable without tapping, no spaces - all caps, Stem-Form-PGN with hyphens, e.g. Q-P-3MS (Qal perfect 3ms), QP-P-3MS (Qal passive), HI-W-3MS (Hiphil wayyiqtol), N-MP, a prefix joined with + (ART+N-MP, CONJ+OBJ); verbs coloured by stem. Converted once, when the database is built, from the source's codes.
- **A word tapped:** its concise lexicon entry (STEPBible's brief lexicons, TBESH / TBESG - the same extended Strong's keys as the text) - or, as a setting, the fuller entry (BDB for Hebrew, Abbott-Smith likely for Greek; public domain) - and its parsing spelled out (Qal perfect, 3rd masculine singular).
- **Helps controls** (behind a HELPS button): a frequency slider - helps hidden for words occurring N+ times, showing how many words (by frequency) you'd need to know to read them; frequency counted over the whole OT (or NT) or this book alone (book-specific vocab); SHOW HELPS (everything, faded); MY SELECTIONS (on / off). A word's panel flips that word by hand ("I know this word" / "Show helps"), every form of it, on top of the slider.
- **Grammar from the word's panel:** each part of the spelled-out parsing tappable (Qal, perfect, 3ms...) - opens that part's explanation, under the word's info, from a grammar picked in a setting (several to try, then one chosen): Hebrew - Gesenius (Kautzsch-Cowley 1910, public domain); Greek - Smyth (1920; Perseus CC BY-SA, classical), Robertson (1914, the fullest NT grammar; scans only - topics mapped to pages, text built section by section), Ewald's Elementary New Testament Greek (2022, digital text, CC BY-NC-SA - non-commercial only), Moulton, Nunn, Goodwin; linked by section or page.
- **Verb stems highlighted:** pick stems (Hebrew binyanim - Qal, Niphal, Piel...; Greek tense / voice / mood) and see them marked through the text.
- **Vocab:** flashcards for any range (a book, a chapter, any span) and by frequency.
- **Verb paradigm flashcards:** a form's pattern - the root's letters as empty dotted squares with their vowels, the form's own letters (prefixes, endings) written - and, turned over, its parsing with its meaning on "do": Q-P-3MS, "he did" (and the pattern on a model root).
- **Spoken answers:** on a vocab flashcard, say the English meaning instead of tapping - the browser's own speech recognition (Safari on iPhone / iPad included; audio goes to Apple), matched leniently against the word's glosses and lexicon senses ("create" / "created" / "to create"), showing what it heard; the reader can still mark it right or wrong.
- **Audio:** modern pronunciation for both (modern Greek, modern Israeli Hebrew - the user's choice, and what they teach): the device's built-in voices read words and verses, and reading aloud can be recognised and followed word by word.
- **My vocab:** each person's own list - words added from a word's panel are being learned; a flashcard marked GOT IT (or "I know this word") is known, its helps then hidden. Counts of learning / known; the learning words as a deck. Kept per person (and synced, once there are accounts).
- **Reader's version:** a selective interlinear - glosses shown only for words rarer than a frequency the reader sets; a button shows everything when unsure. A way to quiz yourself on reading.
- **Loftier goal:** Bible translation tools - translating from the interlinear into a new version.
- **Also:** generate PDFs (a print stylesheet first; Typst on the server for book-quality typesetting).

## Done (first build, 2026-11-02)

- **Data:** STEPBible-Data (TAHOT, TAGNT, TBESH, TBESG) built into one SQLite database - words, COTEXT parsing codes and their spelled-out parsing, lexicon, per-lemma frequencies (whole OT / NT and per book). MACULA isn't used yet.
- **Reader:** pick a book and chapter (‹ › step through); the interlinear as in the mock-ups - original, gloss, parsing code, verbs coloured by stem; a word tapped opens the panel: dictionary form, parsing spelled out, brief lexicon entry.
- **App:** a PWA, offline after the first load (the database is kept by the service worker).
- **Helps menu (⋯):** SHOW HELPS, MY SELECTIONS, FREQUENCY (whole OT / NT or the book shown), the frequency slider with its exact words-to-learn count from the freq table; "I know this word" / "Show helps" in a word's panel. Kept on the device (localStorage).
- **Study menu (☰):** the drawer - the text (HEBREW OT / GREEK NT), My vocab, Verb paradigms, Verb chart, Parsing guide; the last four open placeholder screens ("Coming soon").
- **Reading aloud:** the device's voices (he-IL for the OT, el-GR for the NT): ▶ at the bottom of the screen (above the word's panel while it's open) reads the chapter from the verse at the top of the view, a verse number reads that verse, each word lit as it's spoken, tapped again stops; 🔊 in the word's panel says the word, its ▶ reads on from the word. Hebrew without accents (vowels kept), Greek made monotonic, a Greek one-letter word spoken with the next. A verse is one utterance lit by the voice's word boundaries, word by word for a voice without them. READING SPEED (0.1x - 1x) and SPACE BETWEEN WORDS (0 - 2 s; 0 reads normally, any space reads a word at a time with that pause) in ⋯, kept on the device; the voice the device's one for the language (no choice offered).
- **Not yet:** everything else above - vocab and flashcards, paradigms, verb chart, parsing guide (their screens), grammar links, stem highlighting, following the reader's own reading aloud (recognition), search, fuller lexicons (BDB, Abbott-Smith in full).

## Map

- `pipeline/` - Python (standard library only), run ahead of time. `fetch.py` downloads STEPBible-Data at a pinned commit into `pipeline/downloads/` (gitignored); `build_db.py` builds `public/data/cotext.db` (gitignored; its docstring lists the tables); `morph.py` turns the source's morphology codes into COTEXT's codes and spelled-out parsing (its docstring gives the scheme).
- `src/` - the app, TypeScript, no framework: `main.ts` (start, the heading, going to a chapter, #Gen.1 links), `db.ts` (the database in SQLite WASM, cached for offline), `reader.ts` (the chapter's interlinear), `panel.ts` (the word's panel), `picker.ts` (books and chapters), `helps.ts` (the ⋯ menu: which words' helps are hidden), `study.ts` (the ☰ drawer and its screens), `audio.ts` (reading aloud: ▶, verse numbers, the panel's 🔊, VOICE and READING SPEED).
- `public/` - copied into `dist/` as it is: `index.html`, `style.css` (the look and its colour tokens), `sw.js` (the service worker), `manifest.webmanifest`, `icons/` (placeholders), `fonts/` (Ezra SIL, Gentium - OFL), `sqlite/` (the official SQLite WASM build, 3.54.1, vendored).
- `design/` - the approved mock-ups, the reference for the look.
- `build.mjs` - the build (esbuild, the one npm dependency, pinned in `package.json` / `package-lock.json`). `serve.py` - a local server for `dist/`. `NOTICE` - the credits (STEPBible CC BY, fonts, SQLite).

## Build and run

1. `python3 pipeline/build_db.py` - downloads the data (once, about 100 MB) and builds the database (about 15 s).
2. `npm install` (once), then `npm run build` - into `dist/`.
3. `python3 serve.py` - http://127.0.0.1:8090/ (another port: `python3 serve.py 8095`). Ports 8000-8002 belong to Numerator's server: never use them.

## How (proposed, to confirm)

- **Phone and iPad first:** an installable web app (PWA), offline; Capacitor later for the app stores, Tauri for desktop.
- **TypeScript, minimal dependencies:** no framework (plain DOM / Web Components), one build tool (esbuild or Deno); every outside piece pinned and kept in the repo. The user was put off Node by its many libraries going out of date - keep the list to a handful.
- **Data:** a word-level database (each word: surface form, lemma, parsing, gloss, lexicon entry, position) in the official SQLite WebAssembly build, with full-text search. Built ahead of time by Python scripts from the source data; the app only downloads the result.
- **Sources (open, credit required - confirm each LICENSE file):** MACULA Greek and Hebrew (Clear Bible / Biblica, CC BY 4.0: parsing, syntax trees, glosses, semantic domains; Nestle 1904 and SBLGNT, Westminster Leningrad Codex) as the core; STEPBible Data (Tyndale House, CC BY 4.0: TAGNT's textual variants across NA / TR, TAHOT, brief lexicons); public-domain lexicons (BDB, Abbott-Smith, Dodson). Not without a licence: Nestle-Aland / UBS texts, BDAG, HALOT, ETCBC BHSA (non-commercial), the CATSS LXX morphology. A tagged Septuagint isn't openly available yet (STEPBible's TAGOT is coming).
- **Fonts:** Ezra SIL (Hebrew), Gentium Plus (Greek) - OFL, embeddable.

## Working with the user

The user often works from the iPad or iPhone via Remote Control; the Mac is the build host (its screen is broken: anything needing the Mac itself - a password, a dialog, Xcode - is marked "At the Mac:").

- **Requests:** say the expected wait at the start, work without step-by-step updates, end with one concise report.
- **Scope:** do only what's asked. Anything beyond the direct ask that takes more than about a minute is asked first, with an estimate in minutes.
- **Checking:** the one check is that it works; ask before any thorough testing.
- **Git:** commit each finished change with a short message; push only when asked.
- **Old versions:** when something is replaced, delete the old version - try things out and move on.

## Writing

Comments, this file and reports: clear and concise yet comprehensive - as much as is needed, in the clearest and fewest words. Comments say what code is for and why; a change updates the comments it affects.
