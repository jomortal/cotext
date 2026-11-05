// Numbers written in letters, as the texts and their readers number chapters and verses: Hebrew - 15 and 16 טו, טז,
// not the Name's letters (יה, יו); Greek - with a keraia (ʹ), 6 ϛ (stigma), 90 ϟ (koppa), 900 ϡ (sampi), thousands
// with a lower keraia (͵α 1000). The verse cards' references and verse numbers (versecards.ts) and Vocab's NUMBERS.

/** n (1-499) in Hebrew letters: 23 כג, 15 טו, 400 ת. */
export function hebrewNumber (n: number) {
  const H = ["", "ק", "ר", "ש", "ת"], T = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"], O = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  const h = Math.floor (n / 100), rest = n % 100;
  return (H[h] ?? "") + (rest === 15 ? "טו" : rest === 16 ? "טז" : T[Math.floor (rest / 10)] + O[rest % 10]);
}
/** n (1-9,999) in Greek letters: 16 ιϛʹ, 90 ϟʹ, 1000 ͵α. */
export function greekNumber (n: number) {
  const H = ["", "ρ", "σ", "τ", "υ", "φ", "χ", "ψ", "ω", "ϡ"], T = ["", "ι", "κ", "λ", "μ", "ν", "ξ", "ο", "π", "ϟ"], O = ["", "α", "β", "γ", "δ", "ε", "ϛ", "ζ", "η", "θ"];
  const k = Math.floor (n / 1000) % 10, rest = n % 1000;
  return (k ? "͵" + O[k] : "") + (rest ? H[Math.floor (rest / 100)] + T[Math.floor (rest / 10) % 10] + O[rest % 10] + "ʹ" : "");
}
