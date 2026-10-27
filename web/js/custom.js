// Build-a-Mochi customisation (community addition, buildamochi.com).
// A small JSON config changes what is safe to change without retraining the brain:
//  - the coat palette (drawing only; the brain never sees its own coat),
//  - the name,
//  - a mild temperament: how fast needs rise and how fast it moves (x0.7 .. x1.4),
//  - starting settings: dawn feeder, fast nights, day length, brain pack.
// Furniture/toy/food hues are NOT customisable: the brain sees them and learned them.
// Config sources, first wins: ?mochi=<base64url JSON> in the URL, localStorage "mochi-custom",
// the site's mochi.config.json, built-in defaults.
import { COAT } from "./render.js";
import { BODY } from "./world.js";

export const STORAGE_KEY = "mochi-custom";
export const DEFAULTS = Object.freeze({
  v: 1,
  name: "Mochi",
  coat: { back: "#9945FF", mid: "#5A8FE0", brow: "#14F195", earBack: "#4f9fd6", earFront: "#22e0a0",
          ear: "#c9ffe9", line: "#0d0a1a", eye: "#0b0714", blush: "#dc1fff", mouth: "#2a0f4a" },
  temperament: { appetite: 0, energy: 0, playful: 0, cuddly: 0, pace: 0 },   // each -2..2
  start: { autoCare: true, skipNight: true, daySeconds: 360, pack: "" },
});
export const STEP = [0.7, 0.85, 1, 1.18, 1.4];            // multiplier for -2..2
const HEX = /^#[0-9a-fA-F]{6}$/;
const BASE = { ...BODY };

export function clean(input) {
  const d = structuredClone(DEFAULTS), c = input && typeof input === "object" ? input : {};
  if (typeof c.name === "string" && c.name.trim()) d.name = c.name.trim().slice(0, 14);
  for (const k of Object.keys(d.coat)) if (c.coat && HEX.test(c.coat[k] || "")) d.coat[k] = c.coat[k];
  for (const k of Object.keys(d.temperament)) {
    const n = Math.round(Number(c.temperament && c.temperament[k]));
    if (Number.isFinite(n)) d.temperament[k] = Math.max(-2, Math.min(2, n));
  }
  const s = c.start || {};
  if (typeof s.autoCare === "boolean") d.start.autoCare = s.autoCare;
  if (typeof s.skipNight === "boolean") d.start.skipNight = s.skipNight;
  if ([240, 360, 600].includes(Number(s.daySeconds))) d.start.daySeconds = Number(s.daySeconds);
  if (typeof s.pack === "string" && /^[\w.-]{0,64}$/.test(s.pack)) d.start.pack = s.pack;
  return d;
}

export function encode(cfg) {
  const bytes = new TextEncoder().encode(JSON.stringify(clean(cfg)));
  let bin = ""; bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function decode(text) {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
  return clean(JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, ch => ch.charCodeAt(0)))));
}

// The site-wide default: mochi.config.json at the site root (the template's one file to edit).
export const SITE_CONFIG_URL = new URL("../../mochi.config.json", import.meta.url);
async function siteConfig() {
  try { const r = await fetch(SITE_CONFIG_URL, { cache: "no-cache" }); if (r.ok) return clean(await r.json()); } catch (e) { /* none */ }
  return null;
}

export async function loadCustom(search = typeof location !== "undefined" ? location.search : "") {
  const param = new URLSearchParams(search).get("mochi");
  if (param) { try { return { cfg: decode(param), source: "url" }; } catch (e) { console.warn("bad ?mochi= config", e); } }
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return { cfg: clean(JSON.parse(raw)), source: "local" }; } catch (e) { /* none */ }
  const site = await siteConfig();
  if (site) return { cfg: site, source: "site" };
  return { cfg: clean(null), source: "default" };
}

function blushRGB(hex) { const v = parseInt(hex.slice(1), 16); return `${(v >> 16) & 255},${(v >> 8) & 255},${v & 255}`; }

// Mutates the shared COAT and BODY objects in place.
export function applyCustom(cfg) {
  const c = cfg.coat, t = cfg.temperament;
  COAT.stops = [[0, c.back], [0.5, c.mid], [1, c.brow]];
  Object.assign(COAT, { line: c.line, ear: c.ear, earBack: c.earBack, earFront: c.earFront, eye: c.eye, mouth: c.mouth, blush: blushRGB(c.blush) });
  const m = k => STEP[t[k] + 2];
  BODY.hunger = BASE.hunger * m("appetite"); BODY.thirst = BASE.thirst * m("appetite");
  BODY.fatigue = BASE.fatigue / m("energy");
  BODY.boredom = BASE.boredom * m("playful");
  BODY.lonely = BASE.lonely * m("cuddly");
  BODY.speed = BASE.speed * m("pace");
  return cfg;
}

export const custom = await loadCustom();
