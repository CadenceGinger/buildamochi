// The plaza (community addition, buildamochi.com): Mochis from other browsers visit your room.
// Peer-to-peer over WebRTC (Trystero, nostr relays for signalling); no server, no accounts.
// Every pet is driven by its own owner's local Cadence brain; peers exchange only a small state
// record (~8 Hz). By default visitors are drawn only. If this owner opts in ("Mochi notices
// visitors"), visitors in the same room reach the brain as capped motion only (see senses.js);
// that setting and its marker hue live on this side and are never sent or accepted from peers.
import { joinRoom, selfId } from "./vendor/trystero-nostr-0.26.0.mjs";
import { COAT, drawMochi, drawLaser } from "./render.js?v=10";
import { clean } from "./custom.js?v=5";

export const ROOM_ID = "buildamochi-plaza";
const APP_ID = "buildamochi.com/plaza/v1";
export const MAX_PEERS = 30;
const POSES = new Set(["call", "drink", "eat", "held", "jump", "lie", "paw", "pounce", "sit", "sniff", "spin", "stand", "walk"]);
const EMOTES = { wave: "👋", heart: "❤️", hi: "Hi!", star: "✨", zzz: "💤", laugh: "😂" };
const STALE_MS = 6000;

const num = (v, lo, hi, d = 0) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
export function cleanName(v) {
  const s = String(v ?? "").normalize("NFKC").replace(/[^\p{L}\p{N} _.'-]/gu, "").trim().slice(0, 14);
  return s || "Mochi";
}
function cleanState(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    name: cleanName(raw.n),
    coat: clean({ coat: raw.c }).coat,                  // only "#rrggbb" survives, else defaults
    x: num(raw.x, 0, 960, 480), y: num(raw.y, 0, 600, 300),
    vx: num(raw.vx, -400, 400), vy: num(raw.vy, -400, 400),
    heading: num(raw.h, -7, 7), actionT: num(raw.t, 0, 30),
    pose: POSES.has(raw.p) ? raw.p : "stand", asleep: !!raw.s,
    room: raw.r === "garden" || raw.r === "learn" ? raw.r : "home",   // older clients send none: home
    laser: Array.isArray(raw.l) ? { x: num(raw.l[0], 0, 960, -1), y: num(raw.l[1], 0, 600, -1) } : null,
  };
}

function withCoat(coat, fn) {
  const saved = { ...COAT, stops: COAT.stops };
  const v = parseInt(coat.blush.slice(1), 16);
  Object.assign(COAT, { stops: [[0, coat.back], [0.5, coat.mid], [1, coat.brow]], line: coat.line, ear: coat.ear,
    earBack: coat.earBack, earFront: coat.earFront, eye: coat.eye, mouth: coat.mouth,
    blush: `${(v >> 16) & 255},${(v >> 8) & 255},${v & 255}` });
  try { fn(); } finally { Object.assign(COAT, saved); }
}

export class Plaza {
  constructor({ getState, onChange = () => {} }) {
    this.getState = getState; this.onChange = onChange;
    this.peers = new Map();          // id -> {state, shown {x,y}, seen, emote}
    this.ignored = new Set();
    this.room = null; this.timer = null;
  }
  get count() { return this.peers.size; }
  join() {
    if (this.room) return;
    this.room = joinRoom({ appId: APP_ID }, ROOM_ID);
    if (window.mochiCount) window.mochiCount("plaza-joined", "Plaza joined");
    // Trystero 0.26 API: makeAction returns {send, onMessage}; handlers get (data, {peerId}).
    const stAction = this.room.makeAction("st"), emAction = this.room.makeAction("em");
    const sendState = data => stAction.send(data);
    this.sendEmoteRaw = data => emAction.send(data);
    this.room.onPeerJoin = id => { if (this.peers.size >= MAX_PEERS) { this.ignored.add(id); this.onChange(); } };
    this.room.onPeerLeave = id => { this.peers.delete(id); this.ignored.delete(id); this.onChange(); };
    stAction.onMessage = (raw, meta) => this.gotState(raw, meta && meta.peerId);
    emAction.onMessage = (raw, meta) => this.gotEmote(raw, meta && meta.peerId);
    // Same-browser tabs also meet over a BroadcastChannel (no network needed). Ids are Trystero's
    // selfId on both paths, so a peer reached both ways is shown once.
    if (typeof BroadcastChannel !== "undefined") {
      this.bc = new BroadcastChannel(APP_ID);
      this.bc.onmessage = ({ data }) => {
        if (!data || typeof data.id !== "string" || data.id === selfId || data.id.length > 64) return;
        if (data.k === "st") this.gotState(data.d, data.id);
        else if (data.k === "em") this.gotEmote(data.d, data.id);
        else if (data.k === "bye") { this.peers.delete(data.id); this.onChange(); }
      };
    }
    this.timer = setInterval(() => {
      const s = this.getState();
      if (s) { sendState(s); if (this.bc) this.bc.postMessage({ k: "st", id: selfId, d: s }); }
      const now = performance.now();
      for (const [id, p] of this.peers) if (now - p.seen > STALE_MS) { this.peers.delete(id); this.onChange(); }
    }, 125);
    this.onChange();
  }
  gotState(raw, id) {
      if (!id) return;
      if (this.ignored.has(id)) return;
      const state = cleanState(raw); if (!state) return;
      let peer = this.peers.get(id);
      if (!peer) {
        if (this.peers.size >= MAX_PEERS) { this.ignored.add(id); return; }
        peer = { shown: { x: state.x, y: state.y }, emote: null }; this.peers.set(id, peer);
      }
      const changed = !peer.state || peer.state.name !== state.name;
      peer.state = state; peer.seen = performance.now();
      if (changed) this.onChange();
  }
  gotEmote(raw, id) {
      const peer = this.peers.get(id); const key = raw && raw.e;
      if (peer && Object.hasOwn(EMOTES, key)) peer.emote = { text: EMOTES[key], at: performance.now() };
  }
  leave() {
    clearInterval(this.timer); this.timer = null;
    if (this.bc) { this.bc.postMessage({ k: "bye", id: selfId }); this.bc.close(); this.bc = null; }
    if (this.room) this.room.leave();
    this.room = null; this.peers.clear(); this.ignored.clear(); this.onChange();
  }
  emote(key) {
    if (!this.room || !Object.hasOwn(EMOTES, key)) return null;
    this.sendEmoteRaw({ e: key }); if (this.bc) this.bc.postMessage({ k: "em", id: selfId, d: { e: key } });
    return EMOTES[key];
  }
  // Visitors in `room` as plain moving points for the motion sense: position and velocity only.
  visitorsIn(room) {
    const now = performance.now(), out = [];
    for (const peer of this.peers.values()) {
      const s = peer.state;
      if (!s || s.room !== room || now - peer.seen > STALE_MS) continue;
      out.push({ x: peer.shown.x, y: peer.shown.y, vx: s.vx, vy: s.vy });
    }
    return out;
  }
  names() { return [...this.peers.values()].filter(p => p.state).map(p => p.state.name); }

  // Draws every visitor into the room; call after drawRoom.
  draw(ctx, view, room = "home", ringHue = null) {
    const now = performance.now();
    for (const peer of this.peers.values()) {
      const s = peer.state; if (!s) continue;
      if (s.room !== room) { peer.shown.x = s.x; peer.shown.y = s.y; continue; }   // only visitors in the same room
      peer.shown.x += (s.x - peer.shown.x) * 0.25; peer.shown.y += (s.y - peer.shown.y) * 0.25;
      const m = { ...s, x: peer.shown.x, y: peer.shown.y, needs: { hunger: 0, thirst: 0, fatigue: 0, boredom: 0, lonely: 0 }, touch: { stroke: 0, boop: 0 }, taste: { good: 0, bad: 0 } };
      if (ringHue !== null) { ctx.save(); ctx.strokeStyle = `hsla(${ringHue},70%,62%,.85)`; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.ellipse(m.x, m.y + 8, 40, 30, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
      if (s.laser) { ctx.save(); ctx.globalAlpha = 0.6; drawLaser(ctx, s.laser, view.time); ctx.restore(); }
      ctx.save(); ctx.globalAlpha = 0.92;
      withCoat(s.coat, () => drawMochi(ctx, { m, hand: { present: false } }, { ...view, emotes: [], look: [Math.cos(s.heading), Math.sin(s.heading)], alert: 0, blink: false }));
      ctx.restore();
      ctx.save(); ctx.font = "bold 13px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(13,10,26,.7)"; ctx.fillStyle = "#fff";
      ctx.strokeText(s.name, m.x, m.y - 50); ctx.fillText(s.name, m.x, m.y - 50);   // canvas text: no HTML
      if (peer.emote) {
        const age = (now - peer.emote.at) / 1600;
        if (age > 1) peer.emote = null;
        else { ctx.globalAlpha = 1 - age * age; ctx.font = "22px system-ui"; ctx.fillText(peer.emote.text, m.x, m.y - 72 - age * 30); }
      }
      ctx.restore();
    }
  }
}
export { selfId, EMOTES };
