import { DEFAULTS, STORAGE_KEY, STEP, clean, encode, loadCustom, applyCustom } from "../web/js/custom.js";
import { World } from "../web/js/world.js";
import { drawRoom } from "../web/js/render.js";

const $ = id => document.getElementById(id);
const COLORS = [["back", "Lower back"], ["mid", "Middle"], ["brow", "Brow"], ["earBack", "Back ear"], ["earFront", "Front ear"],
  ["ear", "Inner ear"], ["line", "Outline"], ["eye", "Eyes"], ["blush", "Blush"], ["mouth", "Mouth"]];
const TRAITS = [["appetite", "Appetite", ["picky", "light eater", "normal", "hungry", "bottomless"]],
  ["energy", "Energy", ["sleepy", "mellow", "normal", "lively", "hyper"]],
  ["playful", "Playfulness", ["calm", "easygoing", "normal", "playful", "wild"]],
  ["cuddly", "Cuddliness", ["independent", "aloof", "normal", "affectionate", "clingy"]],
  ["pace", "Pace", ["slowpoke", "ambler", "normal", "zippy", "rocket"]]];
const PRESETS = {
  Classic: DEFAULTS.coat,
  Strawberry: { back: "#ff4f8b", mid: "#ff8fb1", brow: "#ffd1dc", earBack: "#e0457a", earFront: "#ff9bbb", ear: "#fff0f4", line: "#2a0d17", eye: "#1a0710", blush: "#ff2d55", mouth: "#5a0f2a" },
  Matcha: { back: "#3f7d3a", mid: "#7fb069", brow: "#d6e8b0", earBack: "#4e8a43", earFront: "#a5cf7e", ear: "#f0f7e0", line: "#14200f", eye: "#0f160b", blush: "#ff8f8f", mouth: "#2b3a1a" },
  Sunset: { back: "#ff5e3a", mid: "#ff9a3c", brow: "#ffd36b", earBack: "#e0532f", earFront: "#ffb347", ear: "#fff3d6", line: "#2a1206", eye: "#1a0b04", blush: "#ff3d7f", mouth: "#5a1f0a" },
  Midnight: { back: "#1b1f5e", mid: "#3b4cc0", brow: "#8fa8ff", earBack: "#2a3290", earFront: "#5d72e6", ear: "#dfe5ff", line: "#05061a", eye: "#f4f6ff", blush: "#b05cff", mouth: "#0a0c2a" },
  Snow: { back: "#cfd8e3", mid: "#e8eef5", brow: "#ffffff", earBack: "#b8c4d2", earFront: "#dde5ee", ear: "#ffd6e0", line: "#2a3340", eye: "#1b222c", blush: "#ff9db5", mouth: "#4a3a48" },
};
const POSES = ["idle", "walk", "sit", "lie", "jump", "spin", "eat", "sleep"];

let cfg = (await loadCustom()).cfg;
const world = new World({ seed: 7, tod: 0.3 });
const view = { time: 0, emotes: [], look: [0, 0], alert: 0, blink: false, showSenses: false, rearrange: false, hideHand: true };
let pose = "idle";
const ctx = $("preview").getContext("2d");

function buildForm() {
  $("colors").replaceChildren(...COLORS.map(([k, label]) => {
    const l = document.createElement("label"); l.className = "f"; l.textContent = label;
    const i = document.createElement("input"); i.type = "color"; i.id = "c_" + k;
    i.oninput = () => { cfg.coat[k] = i.value; update(); }; l.append(i); return l;
  }));
  $("presets").replaceChildren(...Object.entries(PRESETS).map(([n, coat]) => {
    const b = document.createElement("button"); b.textContent = n;
    b.onclick = () => { cfg.coat = { ...coat }; fill(); update(); }; return b;
  }));
  $("traits").replaceChildren(...TRAITS.map(([k, label, words]) => {
    const l = document.createElement("label"); l.className = "f"; l.append(label);
    const r = document.createElement("input"); r.type = "range"; r.min = -2; r.max = 2; r.step = 1; r.id = "t_" + k;
    const v = document.createElement("span"); v.className = "lv"; v.id = "tv_" + k;
    r.oninput = () => { cfg.temperament[k] = Number(r.value); update(); }; l.append(r, v); return l;
  }));
  $("poses").replaceChildren(...POSES.map(p => {
    const b = document.createElement("button"); b.textContent = p; b.onclick = () => { pose = p; }; return b;
  }));
  $("name").oninput = e => { cfg.name = e.target.value; update(); };
  for (const id of ["autoCare", "skipNight"]) $(id).onchange = e => { cfg.start[id] = e.target.checked; update(); };
  $("daySeconds").onchange = e => { cfg.start.daySeconds = Number(e.target.value); update(); };
  $("pack").onchange = e => { cfg.start.pack = e.target.value; update(); };
}
function fill() {
  $("name").value = cfg.name;
  for (const [k] of COLORS) $("c_" + k).value = cfg.coat[k].toLowerCase();
  for (const [k] of TRAITS) $("t_" + k).value = cfg.temperament[k];
  $("autoCare").checked = cfg.start.autoCare; $("skipNight").checked = cfg.start.skipNight;
  $("daySeconds").value = String(cfg.start.daySeconds); $("pack").value = cfg.start.pack;
}
function shareUrl() {
  const u = new URL("../web/", location.href); u.searchParams.set("mochi", encode(cfg)); return u.href;
}
function update() {
  cfg = clean(cfg); applyCustom(cfg);
  for (const [k, , words] of TRAITS) $("tv_" + k).textContent = `${words[cfg.temperament[k] + 2]} ×${STEP[cfg.temperament[k] + 2]}`;
  $("share").value = shareUrl();
  document.title = `Build ${cfg.name} · Build your own Mochi`;
}
const say = t => { $("msg").textContent = t; setTimeout(() => { if ($("msg").textContent === t) $("msg").textContent = ""; }, 3500); };

function frame(now) {
  view.time = now / 1000;
  const m = world.m, t = view.time;
  m.x = 480 + (pose === "walk" ? Math.sin(t * 0.8) * 160 : 0); m.y = 330;
  m.vx = pose === "walk" ? Math.cos(t * 0.8) * 128 : 0; m.vy = 0;
  m.heading = m.vx < 0 ? Math.PI : 0;
  m.asleep = pose === "sleep";
  m.pose = pose === "sleep" ? "lie" : pose;
  m.actionT = (t % (pose === "spin" ? 0.6 : 0.9));
  view.blink = !m.asleep && (t % 4) < 0.12;
  view.look = [Math.cos(t * 0.7) * 0.6, Math.sin(t * 0.5) * 0.3];
  try { drawRoom(ctx, world, view); }
  catch (e) { console.error(e); return; }
  ctx.save(); ctx.font = "bold 22px system-ui"; ctx.textAlign = "center"; ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.strokeStyle = "rgba(0,0,0,.6)"; ctx.lineWidth = 4; ctx.strokeText(cfg.name, m.x, m.y - 62); ctx.fillText(cfg.name, m.x, m.y - 62); ctx.restore();
  requestAnimationFrame(frame);
}

buildForm();
try {
  const index = await (await fetch("../web/brains/index.json")).json();
  for (const p of index.packs) { const o = document.createElement("option"); o.value = p.id; o.textContent = `${p.name} · Cadence ${p.cadence}`; $("pack").append(o); }
} catch (e) { console.warn("brain list unavailable", e); }
fill(); update();
requestAnimationFrame(frame);

$("save").onclick = () => { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); say(`Saved. ${cfg.name} is now the default design in this browser.`); };
$("play").onclick = () => { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); location.href = shareUrl(); };
$("export").onclick = () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(cfg, null, 2)], { type: "application/json" }));
  a.download = `${(cfg.name || "mochi").replace(/[^\w-]+/g, "_")}.mochi.config.json`; a.click();
};
$("import").onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try { cfg = clean(JSON.parse(await f.text())); fill(); update(); say(`Imported ${cfg.name}.`); }
  catch (err) { say("That file is not a Mochi config."); }
  e.target.value = "";
};
$("forget").onclick = () => { localStorage.removeItem(STORAGE_KEY); say("Saved design removed from this browser."); };
$("reset").onclick = () => { cfg = clean(null); fill(); update(); say("Back to the classic Mochi."); };
$("copy").onclick = () => navigator.clipboard.writeText($("share").value).then(() => say("Link copied."), () => { $("share").select(); say("Select and copy the link."); });
