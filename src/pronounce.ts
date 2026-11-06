// The Pronunciation guide (☰ > Pronunciation): a picker at its top - HEBREW, GREEK - MODERN or GREEK - ERASMIAN (at
// first the testament shown's: Hebrew for the OT, modern Greek otherwise; then the last picked, kept on the device).
// GREEK - ERASMIAN: the pronunciation most Bible schools teach (after Erasmus, 1528) - each letter its own sound, the
// diphthongs and the nasal γ, then the breathings - with no speaker (the device's voices speak modern Greek only).
// Each guide its tables alone, no explanation over them.
// GREEK - MODERN (and before the picker, the NT's): the alphabet as modern Greek says
// it - the sound COTEXT reads aloud in (audio.ts: el-GR) - each letter upper and lower case, its name, its sound (IPA)
// and an English example; then the letter pairs that make one sound (αι, ει, ου, αυ, μπ, ντ...). Hebrew (OT): the
// consonants as modern Israeli Hebrew says them - again what COTEXT reads aloud in (he-IL) - each with its final form,
// its dot (dagesh) form where that changes the sound, its name, IPA and an English example; then the vowel signs, each
// on a letter, with its name and sound. Each row's speaker says the letter's name, the pair in a word or the vowel's
// syllable (sheva in a word, בְּרִית, as on its own a voice gives it a full vowel), in the device's Greek or Hebrew voice.

import { ICONS } from "./icons";
import { onScreen, currentTestament } from "./study";
import { sayText } from "./audio";

/** [upper, lower, name (Greek), name (English), IPA, how it sounds] */
const LETTERS: [string, string, string, string, string, string][] = [
  ["Α", "α", "άλφα", "alpha", "a", "a as in father"],
  ["Β", "β", "βήτα", "vita", "v", "v as in very"],
  ["Γ", "γ", "γάμμα", "gamma", "ɣ / ʝ", "a soft throaty g; before ε, ι, η, υ like y in yes"],
  ["Δ", "δ", "δέλτα", "delta", "ð", "th as in this"],
  ["Ε", "ε", "έψιλον", "epsilon", "e", "e as in bet"],
  ["Ζ", "ζ", "ζήτα", "zita", "z", "z as in zoo"],
  ["Η", "η", "ήτα", "ita", "i", "ee as in see"],
  ["Θ", "θ", "θήτα", "thita", "θ", "th as in think"],
  ["Ι", "ι", "ιώτα", "iota", "i", "ee as in see"],
  ["Κ", "κ", "κάππα", "kappa", "k / c", "k as in skip (unaspirated)"],
  ["Λ", "λ", "λάμδα", "lamda", "l", "l as in lamp"],
  ["Μ", "μ", "μι", "mi", "m", "m as in man"],
  ["Ν", "ν", "νι", "ni", "n", "n as in net"],
  ["Ξ", "ξ", "ξι", "xi", "ks", "x as in box"],
  ["Ο", "ο", "όμικρον", "omikron", "o", "o as in more (short)"],
  ["Π", "π", "πι", "pi", "p", "p as in spin (unaspirated)"],
  ["Ρ", "ρ", "ρο", "ro", "r", "a tapped r, as in Spanish pero"],
  ["Σ", "σ / ς", "σίγμα", "sigma", "s", "s as in sit (ς at the end of a word)"],
  ["Τ", "τ", "ταυ", "taf", "t", "t as in stop (unaspirated)"],
  ["Υ", "υ", "ύψιλον", "ipsilon", "i", "ee as in see"],
  ["Φ", "φ", "φι", "fi", "f", "f as in fun"],
  ["Χ", "χ", "χι", "chi", "x / ç", "ch as in Scottish loch; before ε, ι, η, υ as in German ich"],
  ["Ψ", "ψ", "ψι", "psi", "ps", "ps as in lips"],
  ["Ω", "ω", "ωμέγα", "omega", "o", "o as in more - the same as ο"],
];

/** Erasmian Greek: [upper, lower, name (English), IPA, how it sounds] */
const ERASMIAN: [string, string, string, string, string][] = [
  ["Α", "α", "alpha", "a / aː", "a as in father"],
  ["Β", "β", "beta", "b", "b as in boy"],
  ["Γ", "γ", "gamma", "g / ŋ", "g as in go; before γ, κ, ξ or χ, ng as in sing"],
  ["Δ", "δ", "delta", "d", "d as in dog"],
  ["Ε", "ε", "epsilon", "e", "e as in bet"],
  ["Ζ", "ζ", "zeta", "zd / dz", "dz as in adze (often taught as z in zoo)"],
  ["Η", "η", "eta", "ɛː", "e as in they - a long e"],
  ["Θ", "θ", "theta", "θ", "th as in think"],
  ["Ι", "ι", "iota", "i / iː", "i as in sit when short, ee as in machine when long"],
  ["Κ", "κ", "kappa", "k", "k as in kite"],
  ["Λ", "λ", "lambda", "l", "l as in lamp"],
  ["Μ", "μ", "mu", "m", "m as in man"],
  ["Ν", "ν", "nu", "n", "n as in net"],
  ["Ξ", "ξ", "xi", "ks", "x as in box"],
  ["Ο", "ο", "omicron", "o", "o as in obey - a short o"],
  ["Π", "π", "pi", "p", "p as in pen"],
  ["Ρ", "ρ", "rho", "r", "a rolled r"],
  ["Σ", "σ / ς", "sigma", "s", "s as in sit (ς at the end of a word)"],
  ["Τ", "τ", "tau", "t", "t as in top"],
  ["Υ", "υ", "upsilon", "y", "u as in French tu, ü in German (often taught as oo in food)"],
  ["Φ", "φ", "phi", "f", "ph as in phone"],
  ["Χ", "χ", "chi", "x", "ch as in Scottish loch"],
  ["Ψ", "ψ", "psi", "ps", "ps as in lips"],
  ["Ω", "ω", "omega", "ɔː", "o as in tone - a long o"],
];
/** Erasmian Greek's letters said together: [pair, IPA, how it sounds] */
const ERASMIAN_PAIRS: [string, string, string][] = [
  ["αι", "ai", "ai as in aisle"],
  ["ει", "ei", "ei as in eight"],
  ["οι", "oi", "oi as in oil"],
  ["υι", "yi", "wee as in queen"],
  ["ου", "uː", "ou as in soup"],
  ["αυ", "au", "ow as in cow"],
  ["ευ, ηυ", "eu", "eu as in feud"],
  ["γγ", "ŋg", "ng as in finger"],
  ["γκ", "ŋk", "nk as in ink"],
  ["γχ", "ŋx", "nkh: ng then ch as in loch"],
  ["ἁ (rough breathing)", "h", "h before the vowel: ἁμαρτία hamartia"],
  ["ἀ (smooth breathing)", "–", "nothing: the vowel alone"],
  ["ᾳ ῃ ῳ (iota under)", "–", "the iota not pronounced"],
];

/** [pair, a word with it, IPA, how it sounds] */
const PAIRS: [string, string, string, string][] = [
  ["αι", "και", "e", "e as in bet - the same as ε"],
  ["ει", "είναι", "i", "ee as in see"],
  ["οι", "οίκος", "i", "ee as in see"],
  ["υι", "υιός", "i", "ee as in see"],
  ["ου", "ουρανός", "u", "oo as in food"],
  ["αυ", "αυτός", "av / af", "av; af before θ, κ, ξ, π, σ, τ, φ, χ, ψ"],
  ["ευ", "ευλογία", "ev / ef", "ev; ef before θ, κ, ξ, π, σ, τ, φ, χ, ψ"],
  ["μπ", "μπορώ", "b / mb", "b at the start of a word, mb inside one"],
  ["ντ", "ντύνω", "d / nd", "d at the start of a word, nd inside one"],
  ["γκ", "γκρεμός", "g / ŋg", "g at the start of a word, ng inside one"],
  ["γγ", "άγγελος", "ŋg", "ng as in finger"],
  ["τσ", "τσάι", "ts", "ts as in cats"],
  ["τζ", "τζάμι", "dz", "ds as in kids"],
];

/** [letter forms, name (Hebrew), name (English), IPA, how it sounds] */
const HEB_LETTERS: [string, string, string, string, string][] = [
  ["א", "אָלֶף", "alef", "ʔ / –", "silent, or a catch in the throat as in uh-oh: it carries a vowel"],
  ["בּ ב", "בֵּית", "bet / vet", "b / v", "b as in boy with the dot (בּ), v as in very without"],
  ["ג", "גִּימֶל", "gimel", "g", "g as in go"],
  ["ד", "דָּלֶת", "dalet", "d", "d as in dog"],
  ["ה", "הֵא", "he", "h", "h as in hat; silent at the end of a word"],
  ["ו", "וָו", "vav", "v", "v as in very; also a vowel: וֹ o, וּ u"],
  ["ז", "זַיִן", "zayin", "z", "z as in zoo"],
  ["ח", "חֵית", "chet", "χ", "ch as in Scottish loch"],
  ["ט", "טֵית", "tet", "t", "t as in top"],
  ["י", "יוֹד", "yod", "j", "y as in yes; also part of a vowel (ִי ee, ֵי ei)"],
  ["כּ כ ך", "כַּף", "kaf / khaf", "k / χ", "k as in kite with the dot (כּ), ch as in loch without; ך at the end of a word"],
  ["ל", "לָמֶד", "lamed", "l", "l as in lamp"],
  ["מ ם", "מֵם", "mem", "m", "m as in man; ם at the end of a word"],
  ["נ ן", "נוּן", "nun", "n", "n as in net; ן at the end of a word"],
  ["ס", "סָמֶךְ", "samekh", "s", "s as in sit"],
  ["ע", "עַיִן", "ayin", "ʔ / –", "silent, like alef, today; in older Hebrew a sound deep in the throat"],
  ["פּ פ ף", "פֵּא", "pe / fe", "p / f", "p as in pen with the dot (פּ), f as in fun without; ף at the end of a word"],
  ["צ ץ", "צָדִי", "tsadi", "ts", "ts as in cats; ץ at the end of a word"],
  ["ק", "קוֹף", "qof", "k", "k as in kite - today the same as כּ"],
  ["ר", "רֵישׁ", "resh", "ʁ", "r from the throat, as in French"],
  ["שׁ שׂ", "שִׁין", "shin / sin", "ʃ / s", "sh as in shop with the dot on the right (שׁ), s as in sit with it on the left (שׂ)"],
  ["ת", "תָּו", "tav", "t", "t as in top - today with or without the dot"],
];

/** [vowel on a letter, name (English), IPA, how it sounds, what its speaker says (the vowel on its letter if none)] */
const HEB_VOWELS: [string, string, string, string, string?][] = [
  ["בָּ", "qamets", "a", "a as in father (in a few closed syllables o, as in more)"],
  ["בַּ", "patach", "a", "a as in father"],
  ["בֵּ", "tsere", "e", "e as in bet (ey as in they before י)"],
  ["בֶּ", "segol", "e", "e as in bet"],
  ["בִּ", "hireq", "i", "ee as in see"],
  ["בֹּ", "holam", "o", "o as in more (also written וֹ)"],
  ["בֻּ", "qibbuts", "u", "oo as in food (also written וּ, shureq)"],
  ["בְּ", "sheva", "ə / –", "barely a vowel: a quick e as in the a of about, often silent - בְּרִית brit", "בְּרִית"],     // (Said in a word: on its own a voice gives it a full e)
  ["חֲ", "hateph patach", "a", "a short a, as in father"],
  ["חֱ", "hateph segol", "e", "a short e, as in bet"],
  ["חֳ", "hateph qamets", "o", "a short o, as in more"],
];

/** Hebrew inside English text: each run in the Hebrew font, isolated so it doesn't reorder the sentence around it. */
const heIn = (t: string) => t.replace (/[\u0590-\u05FF]+/g, (m) => `<bdi class="heWord">${m}</bdi>`);
const say = (t: string) => {
  if (! ("speechSynthesis" in window)) return;
  speechSynthesis.cancel ();
  setTimeout (() => { const u = new SpeechSynthesisUtterance (t); u.lang = "el-GR"; speechSynthesis.speak (u); }, 60);     // (A breath after cancel: iOS)
};

export type Kind = "he" | "modern" | "erasmian";
const KEY = "cotext.pronounce";     // (The last picked)
const KINDS: [Kind, string][] = [["he", "Hebrew"], ["modern", "Greek - Modern"], ["erasmian", "Greek - Erasmian"]];

function draw (body: HTMLElement) {
  let kind: Kind = currentTestament () === "OT" ? "he" : "modern";
  try { const k = localStorage.getItem (KEY); if (KINDS.some (([v]) => v === k)) kind = k as Kind; } catch { /* private mode */ }
  const row = document.createElement ("label"), pick = document.createElement ("select"), guide = document.createElement ("div");
  row.className = "field"; row.textContent = "Language"; pick.className = "choose";
  pick.append (...KINDS.map (([v, t]) => new Option (t, v)));
  pick.value = kind;
  pick.addEventListener ("change", () => { try { localStorage.setItem (KEY, pick.value); } catch { /* private mode */ } drawGuide (guide, pick.value as Kind); });
  row.append (pick);
  body.replaceChildren (row, guide);
  drawGuide (guide, kind);
}

/** The Greek letters as a guide gives them (kind: modern or Erasmian): each its cell (upper and lower case, as its
 *  row shows them), its name, IPA and how it sounds - ☰ Learn's letters lessons ask them (learn.ts), in its own PRONUNCIATION's
 *  kind, not this screen's pick. */
export function greekLetters (kind: Kind): { cell: string; name: string; ipa: string; how: string }[] {
  return kind === "erasmian" ? ERASMIAN.map (([up, lo, en, ipa, how]) => ({ cell: `${up} ${lo}`, name: en, ipa, how }))
                             : LETTERS.map (([up, lo, , en, ipa, how]) => ({ cell: `${up} ${lo}`, name: en, ipa, how }));
}

/** The letters said together as a guide gives them (kind: modern or Erasmian) - modern's pairs, Erasmian's diphthongs
 *  and nasal γ, without its breathings and iota subscript (marks, not letters) -: each its cell (as its row shows it),
 *  IPA and how it sounds - ☰ Learn's LETTERS TOGETHER asks them (learn.ts). */
export function greekPairs (kind: Kind): { cell: string; ipa: string; how: string }[] {
  return kind === "erasmian" ? ERASMIAN_PAIRS.filter (([pair]) => ! pair.includes ("(")).map (([cell, ipa, how]) => ({ cell, ipa, how }))
                             : PAIRS.map (([cell, , ipa, how]) => ({ cell, ipa, how }));
}

/** A guide's tables (kind) drawn into body, their speakers live - here, and in ☰ Learn's letters lessons (READ THE GUIDE,
 *  its kind Learn's own PRONUNCIATION). */
export function drawGuide (body: HTMLElement, kind: Kind) {
  const btn = (t: string) => `<button class="pill icon" data-say="${t}" aria-label="Say ${t}">${ICONS.speak}</button>`;
  if (kind === "erasmian") {
    body.innerHTML = `      <div class="ref">The alphabet</div>
      ${ERASMIAN.map (([up, lo, en, ipa, how]) => `<div class="sayRow"><span class="grWord sayLetter">${up} ${lo}</span>
        <span><b>${en}</b><br><span class="ipa">[${ipa}]</span> ${how}</span></div>`).join ("")}
      <div class="ref">Letters said together, and the marks</div>
      ${ERASMIAN_PAIRS.map (([pair, ipa, how]) => `<div class="sayRow"><span class="grWord sayLetter">${pair}</span>
        <span><span class="ipa">[${ipa}]</span> ${how}</span></div>`).join ("")}`;
    return;
  }
  if (kind === "he") {
    body.innerHTML = `      <div class="ref">The letters</div>
      ${HEB_LETTERS.map (([forms, he, en, ipa, how]) => `<div class="sayRow"><span class="heWord sayLetter">${forms}</span>
        <span><b>${en}</b> <span class="heWord">${he}</span><br><span class="ipa">[${ipa}]</span> ${heIn (how)}</span>${btn (he)}</div>`).join ("")}
      <div class="ref">The vowels (shown on ב, or ח)</div>
      ${HEB_VOWELS.map (([v, en, ipa, how, said]) => `<div class="sayRow"><span class="heWord sayLetter">${v}</span>
        <span><b>${en}</b><br><span class="ipa">[${ipa}]</span> ${heIn (how)}</span>${btn (said ?? v)}</div>`).join ("")}`;
    for (const b of body.querySelectorAll<HTMLElement> ("[data-say]")) b.addEventListener ("click", () => sayText (b.dataset.say!));
    return;
  }
  body.innerHTML = `    <div class="ref">The alphabet</div>
    ${LETTERS.map (([up, lo, gr, en, ipa, how]) => `<div class="sayRow"><span class="grWord sayLetter">${up} ${lo}</span>
      <span><b>${en}</b> <span class="grWord">${gr}</span><br><span class="ipa">[${ipa}]</span> ${how}</span>${btn (gr)}</div>`).join ("")}
    <div class="ref">Letters said together</div>
    ${PAIRS.map (([pair, word, ipa, how]) => `<div class="sayRow"><span class="grWord sayLetter">${pair}</span>
      <span><span class="grWord">${word}</span><br><span class="ipa">[${ipa}]</span> ${how}</span>${btn (word)}</div>`).join ("")}`;
  for (const b of body.querySelectorAll<HTMLElement> ("[data-say]")) b.addEventListener ("click", () => say (b.dataset.say!));
}

onScreen ("Pronunciation", draw);
