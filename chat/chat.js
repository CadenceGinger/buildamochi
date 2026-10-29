// Live chat (community addition, buildamochi.com). Same transport as the plaza: Trystero over
// WebRTC with public nostr relays for signalling. No server, no accounts, no stored history.
// Every client enforces filters + rate limits on what it RECEIVES, so a modified sender is dropped
// by honest clients. Moderator removals are ECDSA-signed; honest clients verify and obey them.
import { joinRoom, selfId } from "../web/js/vendor/trystero-nostr-0.26.0.mjs";
import { checkText, checkName, cleanName, LIMITS } from "./filter.js?v=1";

const APP_ID = "buildamochi.com/chat/v1", ROOM = "buildamochi-chat";
const MOD_PUB = {"kty":"EC","crv":"P-256","x":"bHFZEemzAq8njZ2hYzg0feRb6tWdC370x4axI3Vr5Tk","y":"kRHFV3_-DTJIF1SuPZ-YPkfAWyNgqwTS2FKkHmb38nk"};
const $ = id => document.getElementById(id);
const log = $("log"), note = $("note");
const msgs = new Map();                         // msgId -> {el, peer, name, text}
const peerStat = new Map();                     // peer -> {last, times[], texts[]}
const kicked = new Set();
const muted = new Set(JSON.parse(localStorage.getItem("chatMuted") || "[]"));
let lastSent = 0, sentTimes = [], recentMine = [];
const algo = { name: "ECDSA", hash: "SHA-256" }, enc = new TextEncoder();
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const pubKey = crypto.subtle.importKey("jwk", MOD_PUB, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
let modKey = null;

$("name").value = localStorage.getItem("chatName") || "";
$("name").onchange = () => { const e = checkName($("name").value); if (e) say(e, true); else { $("name").value = cleanName($("name").value); localStorage.setItem("chatName", $("name").value); say(""); } };
function say(t, bad) { note.textContent = t; note.className = bad ? "err" : ""; }
function sys(t) { const d = document.createElement("div"); d.className = "sys"; d.textContent = t; log.append(d); log.scrollTop = 1e9; }
function showMuted() { $("muted").textContent = muted.size ? `Hidden: ${muted.size} ` : ""; if (muted.size) { const b = document.createElement("button"); b.textContent = "unhide all"; b.onclick = () => { muted.clear(); saveMuted(); for (const m of msgs.values()) m.el.hidden = false; showMuted(); }; $("muted").append(b); } }
function saveMuted() { localStorage.setItem("chatMuted", JSON.stringify([...muted])); }

const room = joinRoom({ appId: APP_ID }, ROOM);
const A = n => room.makeAction(n);
const msgA = A("msg"), rmA = A("rm"), repA = A("rep");
const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(APP_ID) : null;
const send = (k, a, d) => { a.send(d); if (bc) bc.postMessage({ k, id: selfId, d }); };
const peers = new Set();
const showPeers = () => $("peers").textContent = `${peers.size} other${peers.size === 1 ? "" : "s"} here`;
room.onPeerJoin = id => { peers.add(id); showPeers(); };
room.onPeerLeave = id => { peers.delete(id); showPeers(); };
showPeers();

function add(m, peer, mine) {
  if (msgs.has(m.id)) return;
  const d = document.createElement("div"); d.className = "m" + (mine ? " me" : "");
  const acts = document.createElement("span"); acts.className = "acts";
  const n = document.createElement("span"); n.className = "n"; n.textContent = m.n;
  const t = document.createElement("span"); t.className = "t"; t.textContent = new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const body = document.createElement("div"); body.textContent = m.t;          // textContent only: never HTML, never auto-linked
  if (!mine) {
    const hide = document.createElement("button"); hide.textContent = "hide user"; hide.onclick = () => { muted.add(peer); muted.add("name:" + m.n); saveMuted(); for (const x of msgs.values()) if (x.peer === peer || x.name === m.n) x.el.hidden = true; showMuted(); };
    const rep = document.createElement("button"); rep.textContent = "report"; rep.onclick = () => { send("rep", repA, { id: m.id }); rep.disabled = true; rep.textContent = "reported"; if (window.mochiCount) window.mochiCount("chat-report", "Chat report"); };
    acts.append(hide, rep);
  }
  if (modKey) { const rm = document.createElement("button"); rm.textContent = "remove"; rm.onclick = () => modRemove(m.id, peer); acts.append(rm); }
  d.append(acts, n, t, body); d.dataset.id = m.id;
  if (muted.has(peer) || muted.has("name:" + m.n)) d.hidden = true;
  msgs.set(m.id, { el: d, peer, name: m.n, text: m.t, reports: 0 });
  log.append(d); while (log.children.length > 300) { const f = log.firstChild; msgs.delete(f.dataset.id); f.remove(); }
  log.scrollTop = 1e9;
}

function gotMsg(raw, peer) {
  if (!peer || kicked.has(peer) || !raw || typeof raw !== "object") return;
  const text = String(raw.t ?? ""), name = cleanName(raw.n), id = String(raw.id ?? "").slice(0, 40);
  if (!id || checkName(name) || checkText(text)) return;                 // receiver-side filter
  const now = Date.now(); let s = peerStat.get(peer);
  if (!s) peerStat.set(peer, s = { last: 0, times: [], texts: [] });
  s.times = s.times.filter(x => now - x < LIMITS.burstWindowMs);
  if (now - s.last < LIMITS.minGapMs - 500 || s.times.length >= LIMITS.burst * 2) return;  // receiver-side rate limit (lenient)
  const norm = text.toLowerCase().replace(/\s+/g, " ");
  if (s.texts.includes(norm)) return;                                    // repeated identical message
  s.last = now; s.times.push(now); s.texts = [...s.texts.slice(-9), norm];
  add({ id, n: name, t: text.trim(), ts: now }, peer, false);
}
async function gotRm(raw) {
  if (!raw || typeof raw.id !== "string" || typeof raw.sig !== "string") return;
  try {
    const ok = await crypto.subtle.verify(algo, await pubKey, unb64(raw.sig), enc.encode("rm:" + raw.id + ":" + (raw.p || "")));
    if (!ok) return;
  } catch { return; }
  const m = msgs.get(raw.id); if (m) { m.el.remove(); msgs.delete(raw.id); }
  if (raw.p) { kicked.add(raw.p); for (const [k, x] of msgs) if (x.peer === raw.p) { x.el.remove(); msgs.delete(k); } }
}
function gotRep(raw, peer) {
  if (!modKey || !raw) return; const m = msgs.get(raw.id); if (!m) return;
  m.reports++; m.el.style.outline = "1px solid var(--bad)"; m.el.title = `${m.reports} report(s)`;
}
msgA.onMessage = (d, meta) => gotMsg(d, meta && meta.peerId);
rmA.onMessage = d => gotRm(d);
repA.onMessage = (d, meta) => gotRep(d, meta && meta.peerId);
if (bc) bc.onmessage = ({ data }) => {
  if (!data || typeof data.id !== "string" || data.id === selfId) return;
  if (data.k === "msg") gotMsg(data.d, data.id); else if (data.k === "rm") gotRm(data.d); else if (data.k === "rep") gotRep(data.d, data.id);
};

$("f").onsubmit = e => {
  e.preventDefault();
  const nameErr = checkName($("name").value); if (nameErr) { say(nameErr, true); $("name").focus(); return; }
  const name = cleanName($("name").value); localStorage.setItem("chatName", name);
  const text = $("text").value, now = Date.now();
  const err = checkText(text); if (err) { say(err, true); return; }
  if (now - lastSent < LIMITS.minGapMs) { say("Slow down a little (one message every 3 seconds).", true); return; }
  sentTimes = sentTimes.filter(x => now - x < LIMITS.burstWindowMs);
  if (sentTimes.length >= LIMITS.burst) { say("You're sending a lot, wait a minute.", true); return; }
  const norm = text.trim().toLowerCase().replace(/\s+/g, " ");
  if (recentMine.includes(norm)) { say("You already sent that.", true); return; }
  const m = { id: selfId.slice(0, 8) + "-" + now.toString(36), n: name, t: text.trim(), ts: now };
  send("msg", msgA, { id: m.id, n: m.n, t: m.t });
  lastSent = now; sentTimes.push(now); recentMine = [...recentMine.slice(-9), norm];
  add(m, selfId, true); $("text").value = ""; say("");
  if (window.mochiCount) window.mochiCount("chat-message", "Chat message");
};
$("text").onkeydown = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("f").requestSubmit(); } };

// Moderator: ?mod in the URL shows the key box. The private key never leaves this browser.
async function loadMod() {
  const raw = localStorage.getItem("chatModKey"); if (!raw) return;
  try { modKey = await crypto.subtle.importKey("jwk", JSON.parse(raw), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]); $("modstate").textContent = "✓ moderator"; }
  catch { $("modstate").textContent = "key invalid"; }
}
async function modRemove(id, peer) {
  if (!modKey) return; const p = peer && peer !== selfId ? peer : "";
  const sig = b64(await crypto.subtle.sign(algo, modKey, enc.encode("rm:" + id + ":" + p)));
  const d = { id, p, sig }; send("rm", rmA, d); gotRm(d);
}
if (new URLSearchParams(location.search).has("mod")) {
  $("modbox").style.display = "block";
  $("modsave").onclick = () => { localStorage.setItem("chatModKey", $("modkey").value.trim()); $("modkey").value = ""; loadMod(); };
  loadMod();
}
sys("You joined the chat. Messages are public and live only.");
addEventListener("pagehide", () => room.leave());
window.__chat = { selfId, msgs, kicked };
