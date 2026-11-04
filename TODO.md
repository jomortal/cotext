# COTEXT to do

COTEXT stays free (never sold), so non-commercial resources are fair to use; each one's credit is kept, and parts under
a non-commercial license are marked so in NOTICE.

## In progress

- [x] **Greek lexicons**: the full Abbott-Smith, Thayer's, the Middle Liddell and Dodson, in the word panel's LEXICON
      picker. Decide: Thayer's the Greek default?
- [ ] **Moulton & Milligan**: only an unlicensed, AI-OCR digitization exists (curran-gehring/moulton-milligan) - ask its
      author for a license, or wait.
- [x] **Non-commercial resources** surveyed: see Possible additions below.

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
