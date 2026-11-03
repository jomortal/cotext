// FONT in the ☰ drawer's settings: the typeface of the original text (and everywhere else Hebrew or Greek is shown -
// the word's panel, the grammar's sections), one choice per language, the list the text shown's (Hebrew for the OT,
// Greek for the NT). A choice sets the --heb or --grk token (style.css) at once, and is kept on the device. Each font
// here shows the text in full - Hebrew with its vowel points and cantillation marks, Greek polytonic - and is in
// public/fonts/ with its licence (NOTICE). The first of each list is the default.

type Lang = "H" | "G";
const FONTS: Record<Lang, { id: string; name: string; stack: string }[]> = {
  H: [
    { id: "ezra", name: "Ezra SIL", stack: `"Ezra SIL", "SBL Hebrew", serif` },
    { id: "notohe", name: "Noto Serif Hebrew", stack: `"Noto Serif Hebrew", serif` },
    { id: "cardo", name: "Cardo", stack: `"Cardo", serif` },
    { id: "keter", name: "Keter YG", stack: `"Keter YG", serif` },
  ],
  G: [
    { id: "gentium", name: "Gentium", stack: `"Gentium", "Gentium Plus", serif` },
    { id: "cardo", name: "Cardo", stack: `"Cardo", serif` },
    { id: "didot", name: "GFS Didot", stack: `"GFS Didot", serif` },
    { id: "garamond", name: "EB Garamond", stack: `"EB Garamond", serif` },
    { id: "notogr", name: "Noto Serif", stack: `"Noto Serif", serif` },
  ],
};
const TOKEN: Record<Lang, string> = { H: "--heb", G: "--grk" };
const KEY = "cotext.font";
const picked: Partial<Record<Lang, string>> = {};
try { Object.assign (picked, JSON.parse (localStorage.getItem (KEY) ?? "{}")); } catch { /* none kept, or private mode */ }

const pick = document.getElementById ("fontPick") as HTMLSelectElement;
let lang: Lang = "H";

const current = (l: Lang) => FONTS[l].find ((f) => f.id === picked[l]) ?? FONTS[l][0];
function apply (l: Lang) { document.documentElement.style.setProperty (TOKEN[l], current (l).stack); }
apply ("H");
apply ("G");

pick.addEventListener ("change", () => {
  picked[lang] = pick.value;
  try { localStorage.setItem (KEY, JSON.stringify (picked)); } catch { /* private mode: not kept */ }
  apply (lang);
});

/** The list follows the text: Hebrew fonts for the OT, Greek for the NT. */
export function setFontTestament (t: "OT" | "NT") {
  lang = t === "OT" ? "H" : "G";
  pick.replaceChildren (...FONTS[lang].map ((f) => new Option (f.name, f.id)));
  pick.value = current (lang).id;
}
