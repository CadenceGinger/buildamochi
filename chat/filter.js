// Chat filters (community addition, buildamochi.com). Curated local lists, GPL-3.0 like the site (see NOTICE.md).
// Runs on the sender (blocks before sending) AND on every receiver (drops what a modified client sends).
const fold = s => String(s).normalize("NFKC").toLowerCase()
  .replace(/[0@]/g, "o").replace(/[1!|]/g, "i").replace(/3/g, "e").replace(/4/g, "a").replace(/[5$]/g, "s").replace(/7/g, "t");
// Slurs/profanity: stems matched inside folded, de-spaced text. Kept short and curated; extend here.
const SLURS = ["nigger","nigga","faggot","fagot","retard","tranny","kike","spic","chink","wetback","coon","gook","dyke","beaner","raghead","towelhead"];
const PROFANE = ["fuck","shit","cunt","bitch","asshole","motherfucker","dickhead","whore","slut","porn","nude","pussy"];
const SCAM = [/air ?drop/, /give ?away/, /\bdm (me|us)\b/, /(message|text|inbox|contact) me/, /seed ?phrase/, /recovery ?phrase/,
  /private ?key/, /secret ?phrase/, /mnemonic/, /wallet ?connect/, /connect (your )?wallet/, /validate (your )?wallet/, /sync (your )?wallet/,
  /claim (your |now|free)/, /free (sol|eth|btc|token|nft|crypto|mint)/, /presale|pre-sale|whitelist spot|wl spot/,
  /send (me )?[\di]+(\.\d+)? ?\w* .{0,20}(get|receive|return)/, /send (me )?(some |your )?(sol|eth|btc|usdt|usdc|crypto|tokens?)\b/, /\b2x\b|double your/, /guaranteed (profit|return)/,
  /(official |customer |tech )?support (team|desk|agent)/, /(helpdesk|help desk)/, /raise a ticket|open a ticket/,
  /(\bpump\b|100x|1000x)/, /investment (plan|opportunit)/, /whats ?app|telegram|t\.me|signal me/];
const SHORT = /\b(bit\.ly|tinyurl|t\.co|goo\.gl|is\.gd|cutt\.ly|ow\.ly|rb\.gy|shorturl|tiny\.cc|linktr\.ee)\b/;
const LINK = [/[a-z]+:\/\//i, /\bwww\b/i, /[a-z0-9-]{2,}(\.|\s*(\[\.\]|\(\.\)|\{\.\}|\[dot\]|\(dot\))\s*)[a-z]{2,}\b/i, /\b[a-z0-9-]{2,}\s+\.\s*(com|net|org|io|gg|xyz|me|co|app|ly|link|site|online|fun)\b/i, /\b[a-z0-9-]{2,}\s+dot\s+(com|net|org|io|gg|xyz|me|co|app|ly|link|site|online|fun|sol|eth)\b/i,
  /discord(app)?\s*(\.|dot)?\s*(gg|com)|discord invite|invite code|\bgg\s*\/\s*\w+/i, /\/[a-z0-9]{4,}\b.*\//i];
const CONTACT = [/[a-z0-9._%+-]+\s*(@|\(at\)|\[at\]| at )\s*[a-z0-9-]+\s*(\.|dot)\s*[a-z]{2,}/i, /(\+?\d[\s().-]*){8,}/];
const IMPERSONATE = /(admin|moderat|\bmod\b|buildamochi|build ?a ?mochi|official|support|staff|bernhard|mueller|pragma|cadence)/;

export const LIMITS = { maxChars: 500, minGapMs: 3000, burst: 5, burstWindowMs: 60000 };

export function cleanName(v) {
  const s = String(v ?? "").normalize("NFKC").replace(/[^\p{L}\p{N} _.'-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 16);
  return s;
}
export function checkName(v) {
  const s = cleanName(v); if (s.length < 2) return "Pick a name with at least 2 letters.";
  const f = fold(s).replace(/[\s_.'-]/g, "");
  if (IMPERSONATE.test(f)) return "That name looks like staff or the project. Pick another.";
  if (SLURS.some(w => f.includes(w)) || PROFANE.some(w => f.includes(w))) return "Pick a friendlier name.";
  if (LINK.some(r => r.test(s))) return "Names can't contain links.";
  return null;
}
// Returns null if fine, else a short reason shown to the sender.
export function checkText(t) {
  const s = String(t ?? "").normalize("NFKC").trim();
  if (!s) return "Empty message.";
  if (s.length > LIMITS.maxChars) return `Keep it under ${LIMITS.maxChars} characters.`;
  if (/[\u200B-\u200F\u202A-\u202E\u2060-\u2064]/.test(s)) return "Hidden characters aren't allowed.";
  const f = fold(s), squash = f.replace(/[^a-z]/g, "");
  if (LINK.some(r => r.test(s)) || SHORT.test(f)) return "Links aren't allowed in chat.";
  if (CONTACT.some(r => r.test(s))) return "Please don't share emails or phone numbers.";
  if (SLURS.some(w => squash.includes(w))) return "That language isn't allowed.";
  const spaced = f.replace(/\b([a-z]) (?=[a-z]\b)/g, "$1");          // "f u c k" -> "fuck"
  if (PROFANE.some(w => new RegExp(`\\b${w}`).test(f) || new RegExp(`\\b${w}`).test(spaced))) return "Please keep it friendly, no swearing.";
  if (SCAM.some(r => r.test(f))) return "That looks like a scam pattern (airdrops, wallets, DMs, giveaways), so it was blocked.";
  if ((s.match(/@\w+/g) || []).length > 2) return "Too many @mentions.";
  const letters = s.replace(/[^A-Za-z]/g, "");
  if (letters.length >= 12 && letters.replace(/[^A-Z]/g, "").length / letters.length > 0.7) return "Easy on the caps.";
  if ((s.match(/\p{Extended_Pictographic}/gu) || []).length > 8) return "Too many emoji.";
  if (/(.)\1{7,}/u.test(s)) return "Too many repeated characters.";
  return null;
}
export const _fold = fold;
