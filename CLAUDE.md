# COTEXT

A Bible study app for students learning Biblical Greek and Hebrew.

## The plan (2026-11-01, not started)

- **Core:** an interlinear (original text with English beneath each word) and parsing information for every word - each switched on and off by the reader.
- **Parsing as shown:** compact, readable without tapping, no spaces - all caps, Stem-Form-PGN with hyphens, e.g. Q-P-3MS (Qal perfect 3ms), QP-P-3MS (Qal passive), HI-W-3MS (Hiphil wayyiqtol), N-MP, a prefix joined with + (ART+N-MP, CONJ+OBJ); verbs coloured by stem. Converted once, when the database is built, from the source's codes.
- **A word tapped:** its fuller definition from BDB (Hebrew; public domain - Open Scriptures' digital BDB, linked by STEPBible's extended Strong's, which TAHOT says are "extended for BDB"), and its parsing spelled out (Qal perfect, 3rd masculine singular). Greek's fuller lexicon to choose (Abbott-Smith, public domain, likely).
- **Verb stems highlighted:** pick stems (Hebrew binyanim - Qal, Niphal, Piel...; Greek tense / voice / mood) and see them marked through the text.
- **Vocab:** flashcards for any range (a book, a chapter, any span) and by frequency.
- **Reader's version:** a selective interlinear - glosses shown only for words rarer than a frequency the reader sets; a button shows everything when unsure. A way to quiz yourself on reading.
- **Loftier goal:** Bible translation tools - translating from the interlinear into a new version.
- **Also:** generate PDFs (a print stylesheet first; Typst on the server for book-quality typesetting).

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
