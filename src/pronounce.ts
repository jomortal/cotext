// The Pronunciation guide (☰ > Pronunciation): the Greek alphabet as modern Greek says it - the sound COTEXT reads
// aloud in (audio.ts: el-GR) - each letter upper and lower case, its name, its sound (IPA) and an English example;
// then the letter pairs that make one sound (αι, ει, ου, αυ, μπ, ντ...). Each row's speaker says the letter's name, or
// the pair in a word, in the device's Greek voice.

import { onScreen } from "./study";

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

const SPEAKER = document.getElementById ("speakRoot")!.innerHTML;     // (The word panel's speaker icon)
const say = (t: string) => {
  if (! ("speechSynthesis" in window)) return;
  speechSynthesis.cancel ();
  setTimeout (() => { const u = new SpeechSynthesisUtterance (t); u.lang = "el-GR"; speechSynthesis.speak (u); }, 60);     // (A breath after cancel: iOS)
};

function draw (body: HTMLElement) {
  const btn = (t: string) => `<button class="pill icon" data-say="${t}" aria-label="Say ${t}">${SPEAKER}</button>`;
  body.innerHTML = `<p>Greek as it's spoken today - the pronunciation COTEXT reads aloud in. Stress falls on the syllable with the accent mark. Breathings (ἁ, ἀ) and the iota under a vowel (ᾳ) are not pronounced.</p>
    <div class="ref">The alphabet</div>
    ${LETTERS.map (([up, lo, gr, en, ipa, how]) => `<div class="sayRow"><span class="grWord sayLetter">${up} ${lo}</span>
      <span><b>${en}</b> <span class="grWord">${gr}</span><br><span class="ipa">[${ipa}]</span> ${how}</span>${btn (gr)}</div>`).join ("")}
    <div class="ref">Letters said together</div>
    ${PAIRS.map (([pair, word, ipa, how]) => `<div class="sayRow"><span class="grWord sayLetter">${pair}</span>
      <span><span class="grWord">${word}</span><br><span class="ipa">[${ipa}]</span> ${how}</span>${btn (word)}</div>`).join ("")}`;
  for (const b of body.querySelectorAll<HTMLElement> ("[data-say]")) b.addEventListener ("click", () => say (b.dataset.say!));
}

onScreen ("Pronunciation", draw);
