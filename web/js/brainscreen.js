// Brain view screen (TEST BUILD, community addition). A second screen beside the room that shows
// Mochi's Cadence brain computing while it lives and learns. Nothing here is animated from a
// script: every value drawn is either what the page sent the brain this decision (the senses)
// or what the brain answered (each neuron's activation, the settling steps it ran, the policy of
// the motor cortex, what its associative memory read for this moment, the reward prediction
// error of the last outcome, a lesson's before-and-after, and the private probe of each word).
// The screen only reads: it adds read-only fields to the brain's `want` while it is open and
// never changes a decision, a lesson or a reward. Rendering is throttled and stops while the
// screen is closed, scrolled away or the tab is hidden.

import { decodeArray } from "./brain_scan.js";
import { ACTIONS, A, OFFSETS, SOUNDS, WORDS, TRICKS, HUE_NAMES, NEEDS, PLACE_GRID } from "./spec.js";

const $ = id => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const NAMES = {
  rest: "rest", north: "walk ↑", northeast: "walk ↗", east: "walk →", southeast: "walk ↘", south: "walk ↓",
  southwest: "walk ↙", west: "walk ←", northwest: "walk ↖", eat: "eat / drink", sleep: "lie down",
  pounce: "pounce", call: "call", sit: "sit", spin: "spin", jump: "jump", paw: "paw",
};
const actName = i => (i >= 0 ? NAMES[ACTIONS[i]] || ACTIONS[i] : "nothing");
const MODE_TEXT = {
  routine: ["routine · answering from habit, not learning", "routine"],
  aroused: ["alert · exploring and learning from outcomes", "aroused"],
  guided: ["lesson · being shown a move", "guided"],
  asleep: ["asleep", "asleep"],
  refused: ["did not settle · holding still", "refused"],
};
// The order regions are drawn in, senses first. Regions the pack lacks are skipped.
const ORDER = ["Eyes", "Ears", "Nose and tongue", "Skin and body", "Needs", "Sense of place",
  "Sensory cortex", "Association hub", "Dentate", "Observer", "Working memory", "Motor cortex"];
const SHORT = { "Nose and tongue": "Nose", "Skin and body": "Skin", "Sense of place": "Place", "Association hub": "Association", "Working memory": "Working memory", "Motor cortex": "Motor" };
const TRICK_COLOURS = { sit: "#6ee7d8", spin: "#a999ff", jump: "#ffd27a", paw: "#ff8fb1", call: "#8fd3ff" };
const SENSE_ROWS = [
  ["Eyes · colour", "vision.hue", 96], ["Eyes · motion", "vision.motion", 8], ["Eyes · your hand", "vision.hand", 17],
  ["Nose", "smell", 11], ["Mouth", "mouth", 4], ["Ears", "hearing", 32], ["Skin", "touch", 10],
  ["Body", "proprio", 4], ["Needs", "needs", 15], ["Light", "light", 2], ["Place", "place", 24],
];

// Where each region sits in the side view (front to the left), its pastel colour and a short name.
const SPOTS = {
  "Working memory": { key: "memory", x: 0.22, y: 0.42, rx: 0.13, ry: 0.17, colour: "#b9a4ff", label: "Memory 💭", about: "Working memory: a fading trace of the last moments, so a word that just rang still counts." },
  "Motor cortex": { key: "motor", x: 0.42, y: 0.2, rx: 0.075, ry: 0.09, colour: "#ffe08a", label: "Choices 🎯", about: "One neuron per action. The strongest one after settling is what Mochi does." },
  "Skin and body": { key: "touch", x: 0.58, y: 0.19, rx: 0.07, ry: 0.08, colour: "#ffb3d1", label: "Touch ✋", about: "Strokes, boops, being held, walls, the bed, warm sun, and its own pose." },
  "Association hub": { key: "hub", x: 0.48, y: 0.47, rx: 0.15, ry: 0.16, colour: "#8fe6ef", label: "Thinking hub ✨", about: "Where all the senses meet and settle together into one picture of the moment." },
  "Eyes": { key: "eyes", x: 0.82, y: 0.43, rx: 0.08, ry: 0.13, colour: "#9ff0d0", label: "Eyes 👀", about: "Colours, things moving, and your hand: by direction and distance." },
  "Ears": { key: "ears", x: 0.53, y: 0.72, rx: 0.08, ry: 0.07, colour: "#c7b4ff", label: "Ears 👂", about: "A small cochlea: each word and sound lights its own six cells.", below: true },
  "Nose and tongue": { key: "nose", x: 0.18, y: 0.69, rx: 0.06, ry: 0.065, colour: "#ffc8a8", label: "Nose 👃", about: "Food smells by direction, and tastes at the mouth.", below: true },
  "Needs": { key: "needs", x: 0.35, y: 0.68, rx: 0.055, ry: 0.065, colour: "#ff9fae", label: "Needs 💗", about: "Hunger, thirst, tiredness, boredom, loneliness, and day or night.", below: true },
  "Sense of place": { key: "place", x: 0.7, y: 0.64, rx: 0.06, ry: 0.07, colour: "#a9d8ff", label: "Place 📍", about: "Place cells: where in the room Mochi is." , below: true },
  "Sensory cortex": { key: "sensory", x: 0.68, y: 0.36, rx: 0.08, ry: 0.09, colour: "#9ff0d0", label: "Senses", about: "All the senses in one region." },
  "Dentate": { key: "dentate", x: 0.62, y: 0.55, rx: 0.05, ry: 0.06, colour: "#d6b8ff", label: "Dentate", about: "Pattern separation for memory." },
  "Observer": { key: "observer", x: 0.32, y: 0.26, rx: 0.05, ry: 0.06, colour: "#8fe6ef", label: "Observer", about: "Watches the others." },
};
const PATHS = [["eyes", "hub"], ["ears", "hub"], ["nose", "hub"], ["touch", "hub"], ["needs", "hub"], ["place", "hub"], ["sensory", "hub"],
  ["hub", "memory"], ["hub", "motor"], ["memory", "motor"], ["dentate", "hub"]];
// the cerebrum as a union of soft circles: [x, y, radius as a share of the width]
const LOBES = [[0.5, 0.47, 0.38], [0.25, 0.42, 0.33], [0.36, 0.27, 0.3], [0.58, 0.24, 0.3], [0.76, 0.33, 0.3], [0.84, 0.48, 0.25],
  [0.17, 0.6, 0.25], [0.42, 0.62, 0.3], [0.66, 0.6, 0.28]];   // radius in shares of the height
const FOLDS = [[0.3, 0.12, 0.36, 0.3, 0.3, 0.5], [0.66, 0.1, 0.62, 0.3, 0.7, 0.5], [0.12, 0.56, 0.4, 0.58, 0.72, 0.56], [0.8, 0.2, 0.9, 0.34, 0.92, 0.5]];

function decodeLevels(b64, n, into) {
  const text = atob(b64), out = into || new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = (text.charCodeAt(i) / 255) * 1.1 - 0.1;
  return out;
}
const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;
const pct = v => `${Math.round(v * 100)}%`;
const signed = (v, d = 2) => (v >= 0 ? "+" : "") + v.toFixed(d);

export class BrainScreen {
  constructor({ page = () => ({ words: [] }) } = {}) {
    this.root = typeof document !== "undefined" ? $("brainScreen") : null;
    this.enabled = !!this.root;          // pages without the screen (the embed) get a no-op
    this.page = page;
    this.active = false;
    this.n = 0; this.groups = []; this.motor = null;
    this.act = null; this.heat = null; this.settled = null;
    this.queue = []; this.replay = null;
    this.prev = null; this.policy = null; this.prevPolicy = null; this.memory = null;
    this.obs = null; this.last = null;
    this.events = []; this.trace = []; this.probes = WORDS.map(() => []);
    this.pendingLesson = null;
    this.stats = { draws: 0, drawMs: 0, drawMax: 0, domMs: 0, decisions: 0, framesReplayed: 0, skippedHidden: 0, fps: 0 };
    this.lastDraw = 0; this.lastDom = 0; this.dirty = true; this.visible = true;
    const small = typeof matchMedia !== "undefined" && matchMedia("(max-width: 899px), (pointer: coarse)").matches;
    this.fps = small ? 12 : 20;            // the canvas never draws faster than this
    this.domEvery = small ? 300 : 200;      // panels update at most this often (ms)
    if (this.enabled) this.build();
  }

  // ---------------------------------------------------------------- page structure
  build() {
    const r = this.root;
    r.innerHTML = `
      <div class="bs-head">
        <div class="bs-title">🔬 Inside <span id="bsName">Mochi</span>'s brain</div>
        <div id="bsMode" class="chip">starting</div>
        <div class="spacer"></div>
        <div id="bsCount" class="fine"></div>
      </div>
      <div class="bs-teach" id="bsTeach" aria-label="Teach while you watch"><span class="label">Teach</span></div>
      <div class="bs-card bs-brain">
        <canvas id="bsBrain" height="320" aria-label="Mochi's brain: each region glows with its real activity; dots are neurons that spark when they fire"></canvas>
        <div id="bsRegion" class="bs-region" hidden></div>
        <div class="bs-simple">
          <div><div class="bs-mini">About to do</div><div id="bsTop"></div></div>
          <div><div class="bs-mini">Last lesson</div><div id="bsLesson" class="bs-lesson"></div></div>
        </div>
        <div class="bs-foot"><span class="fine" id="bsHint">Tap a part of the brain to see what it does.</span><button id="bsDetails" type="button" aria-expanded="false">Details ▾</button></div>
      </div>
      <div id="bsMore" class="bs-more" hidden>
      <div class="bs-card bs-flow">
        <div class="bs-cap"><b>The whole brain, neuron by neuron</b><span id="bsReplay" class="fine"></span></div>
        <canvas id="bsFlow" height="260"></canvas>
        <div class="fine bs-legend">Every square is one neuron; brightness is its activity (relative to the most active neuron in its region; the tag gives the region's mean), <span class="hot">gold glow</span> marks neurons changing as the brain settles. Sense neurons carry exactly what Mochi senses; the motor cortex has one neuron per action. One settlement of the whole connectome makes each decision.</div>
      </div>
      <div class="bs-grid">
        <div class="bs-card"><div class="bs-cap"><b>1 · What Mochi senses</b><span class="fine">the input sent this decision</span></div>
          <div id="bsSenseText" class="bs-chips"></div><canvas id="bsSenses" height="200"></canvas></div>
        <div class="bs-card"><div class="bs-cap"><b>2 · What Mochi is choosing</b><span class="fine">motor cortex after settling</span></div>
          <div class="bs-choice-head"><span></span><span>chance now</span><span title="Change since the last decision, in points">Δ</span><span title="What Mochi's associative memory reads for this moment: the drive it adds to each action">memory</span></div>
          <div id="bsChoice"></div><div id="bsValue" class="fine"></div></div>
        <div class="bs-card"><div class="bs-cap"><b>3 · How Mochi is learning</b><span class="fine">credit, lessons, memory</span></div>
          <canvas id="bsTrace" height="70"></canvas>
          <div class="fine bs-key"><i class="k-r"></i>reward felt <i class="k-d"></i>dopamine (surprise) <i class="k-m"></i>mode</div>
          <ol id="bsEvents" class="bs-events"></ol></div>
        <div class="bs-card"><div class="bs-cap"><b>4 · What the words mean so far</b><span class="fine">private probes, nothing learned</span></div>
          <div id="bsWords"></div>
          <div class="fine">Every few seconds the page asks the brain, in private imagination, what it would do if it heard each word now. The lines show how sure it is of each trick across those probes: teaching should make one line climb.</div></div>
      </div>
      <div class="fine bs-perf" id="bsPerf"></div>
      </div>`;
    this.flow = $("bsFlow"); this.flowCtx = this.flow.getContext("2d");
    this.brain = $("bsBrain"); this.brainCtx = this.brain.getContext("2d");
    this.details = false; try { this.details = localStorage.getItem("mochi-bs-details") === "1"; } catch (e) { /* private mode */ }
    const showDetails = on => { this.details = on; $("bsMore").hidden = !on; $("bsDetails").textContent = on ? "Details ▴" : "Details ▾"; $("bsDetails").setAttribute("aria-expanded", on); this.sized = false; this.dirty = true; try { localStorage.setItem("mochi-bs-details", on ? "1" : "0"); } catch (e) { /* none */ } };
    $("bsDetails").onclick = () => showDetails(!this.details);
    showDetails(this.details);
    this.brain.addEventListener("click", event => this.tapRegion(event));
    this.sensesCanvas = $("bsSenses"); this.traceCanvas = $("bsTrace");
    this.wordRows = WORDS.map((_, i) => {
      const row = el("div", "bs-word");
      row.innerHTML = `<span class="bs-wl"></span><canvas height="34"></canvas><span class="bs-wa"></span>`;
      $("bsWords").append(row);
      return { label: row.children[0], canvas: row.children[1], answer: row.children[2] };
    });
    this.buildTeach();
    if (typeof IntersectionObserver !== "undefined") {
      new IntersectionObserver(entries => { for (const e of entries) this.visible = e.isIntersecting; }).observe(this.brain);
    }
    addEventListener("resize", () => { this.sized = false; this.brainSized = false; this.dirty = true; });
  }

  // A strip of proxies for the real buttons under the room, so a phone can teach without
  // scrolling. Each proxy fires the same control the player would press.
  buildTeach() {
    const bar = $("bsTeach");
    const proxy = (label, title, target, hold = false) => {
      const b = el("button", "", label); b.title = title; b.type = "button";
      if (!hold) b.onclick = () => { const t = target(); if (t) t.click(); };
      else {
        b.addEventListener("pointerdown", ev => { ev.preventDefault(); const t = target(); if (t) { t.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true })); b.classList.add("held"); } });
        for (const name of ["pointerup", "pointerleave", "pointercancel"]) b.addEventListener(name, () => { const t = target(); if (t && b.classList.contains("held")) t.dispatchEvent(new PointerEvent("pointerup", { bubbles: true })); b.classList.remove("held"); });
      }
      bar.append(b); return b;
    };
    this.teachWords = WORDS.map((_, i) => proxy(`🗣 ${i + 1}`, "Say this word", () => document.querySelector(`#word${i} button`)));
    bar.append(el("span", "sep"));
    TRICKS.forEach((trick, i) => proxy(trick, `Hold to show "${trick}" while a word rings`, () => document.querySelectorAll("#shows button")[i], true));
    bar.append(el("span", "sep"));
    proxy("👍 Good!", "Good Mochi!", () => $("good")).classList.add("good");
    proxy("👎 No!", "No!", () => $("no")).classList.add("bad");
  }

  // ---------------------------------------------------------------- opening and closing
  toggle(on = !this.active) {
    if (!this.enabled) return;
    this.active = on;
    this.root.hidden = !on;
    document.body.classList.toggle("screen-brain", on);
    for (const b of document.querySelectorAll("[data-screen]")) { const mine = (b.dataset.screen === "brain") === on; b.classList.toggle("on", mine); b.setAttribute("aria-selected", mine); }
    // the side panel's 3D brain is hidden on this screen; stop drawing it (and restore it after)
    const sideBrain = $("brain"), sideToggle = $("brainToggle");
    if (on && sideBrain && sideBrain.classList.contains("open") && sideToggle) { this.reopenSide = true; sideToggle.click(); }
    else if (!on && this.reopenSide && sideBrain && !sideBrain.classList.contains("open") && sideToggle) { this.reopenSide = false; sideToggle.click(); }
    this.sized = false; this.brainSized = false; this.dirty = true;
    try { const url = new URL(location.href); if (on) url.searchParams.set("screen", "brain"); else url.searchParams.delete("screen"); history.replaceState(null, "", url); } catch (e) { /* file:// */ }
    if (typeof window !== "undefined" && window.mochiCount && on) window.mochiCount("brain-screen", "Brain view opened");
  }

  // How many settling steps to ask the brain to record while only this screen is open:
  // every decision that learns, and one routine decision in four, fewer on a slow machine.
  wantFrames(tick, wake, showing, latency) {
    if (!this.active) return 0;
    if (latency > 120) return wake || showing ? 8 : 0;
    return wake || showing || tick % 4 === 0 ? 10 : 0;
  }

  // ---------------------------------------------------------------- data in
  setAtlas(payload) {
    if (!this.enabled || !payload || !payload.atlas) return;
    const atlas = payload.atlas, n = atlas.n;
    const region = decodeArray(atlas.region);
    const members = atlas.regions.map(() => []);
    for (let i = 0; i < n; i++) members[region[i]].push(i);
    const byName = new Map(atlas.regions.map((r, k) => [r.name, { ...r, idx: Int32Array.from(members[k]) }]));
    const names = [...ORDER.filter(name => byName.has(name)), ...[...byName.keys()].filter(name => !ORDER.includes(name))];
    this.groups = names.map(name => byName.get(name)).filter(g => g.idx.length);
    this.motor = byName.get("Motor cortex") || null;
    this.n = n;
    this.act = new Float32Array(n); this.heat = new Float32Array(n); this.settled = new Float32Array(n);
    this.neurons = payload.neurons; this.synapses = payload.synapses;
    this.sized = false; this.brainSized = false; this.dirty = true;
  }

  push(d) {
    if (!this.enabled) return;
    const { answer, outcome, obs, wake, showing, body } = d;
    this.stats.decisions += 1;
    this.obs = obs; this.tick = d.tick; this.latency = d.latency; this.words = d.words || [];
    const mode = body.asleep && !answer.refused && answer.mode !== "guided" ? "asleep" : (answer.refused ? "refused" : answer.mode);
    const L = answer.learning || {};
    const prev = this.prev;
    const reward = outcome.reward || 0;
    const ringing = WORDS.map((w, i) => i).filter(i => SOUNDS[WORDS[i]].reduce((s, c) => s + (obs[OFFSETS.hearing + c] || 0), 0) / 6 > 0.3);
    const wordLabel = i => `“${this.words[i] || WORDS[i]}”`;
    let credit = null;

    // Who gets the credit for what just happened, as life.tick assigns it: an outcome after an
    // aroused decision updates the actor and critic for the action Mochi chose itself; after a
    // shown or routine move it is written to the associative store for that move.
    if (prev && !answer.refused) {
      if (prev.mode === "aroused") {
        credit = { to: prev.own, reward, dopamine: L.dopamine ?? null, td: L.td_error ?? null };
        if (Math.abs(reward) >= 0.05 || (credit.dopamine !== null && Math.abs(credit.dopamine) >= 0.2)) {
          const icon = reward > 0.3 ? "💛" : reward < -0.3 ? "💢" : "⚡";
          this.event("credit", `${icon} <b>${actName(prev.own)}</b> got the credit: reward ${signed(reward)}` +
            (credit.dopamine !== null ? `, dopamine ${signed(credit.dopamine)} (${credit.dopamine >= 0 ? "better" : "worse"} than expected)` : ""), reward >= 0 ? "pos" : "neg");
        }
      } else if ((prev.mode === "guided" || answer.mode === "guided" || wake) && Math.abs(reward) >= 0.05) {
        this.event("memory", `🧩 remembered: <b>${actName(prev.shown ?? prev.own)}</b> brought ${signed(reward)} here (associative memory)`, reward >= 0 ? "pos" : "neg");
      }
    }
    if (answer.mode === "guided" && answer.lesson) {
      const shown = showing ?? (answer.action ? answer.action[0] : -1);
      const sure = answer.lesson.sure ? answer.lesson.sure[0] : null;
      const words = ringing.length ? ` while ${ringing.map(wordLabel).join(" + ")} rang` : " (no word ringing)";
      const last = this.events[0];
      if (last && last.kind === "lesson" && last.shown === shown && d.tick - last.tick < 8) {
        last.times += 1; last.tick = d.tick; last.sureLast = sure; last.after = null;
        last.html = this.lessonHtml(last);
      } else {
        const ev = this.event("lesson", "", "lesson");
        Object.assign(ev, { shown, sure, sureLast: sure, words, times: 1, taught: answer.lesson.taught, after: null });
        ev.html = this.lessonHtml(ev);
      }
      this.pendingLesson = this.events[0];
    } else if (this.pendingLesson && !answer.refused && answer.policy) {
      // the brain's own answer right after the lesson, for the move that was shown
      const ev = this.pendingLesson; this.pendingLesson = null;
      ev.after = answer.policy[0][ev.shown]; ev.html = this.lessonHtml(ev);
    }
    if (answer.refused) this.event("refused", "⏸ the brain did not settle this time; Mochi holds still", "neg");
    if (prev && prev.mode !== "aroused" && mode === "aroused" && !this.events.length) this.event("mode", "⚡ something stood out: Mochi is alert and learning", "");

    this.trace.push({ reward, dopamine: credit && credit.dopamine !== null ? credit.dopamine : null, mode });
    if (this.trace.length > 160) this.trace.shift();

    this.prevPolicy = this.policy;
    this.policy = answer.policy ? answer.policy[0] : this.policy;
    this.value = answer.value ? answer.value[0] : this.value;
    this.chosen = answer.refused ? -1 : answer.action[0];
    this.own = answer.refused ? -1 : answer.own[0];
    this.shown = answer.mode === "guided" ? (showing ?? this.chosen) : null;
    this.mode = mode; this.sweeps = answer.sweeps || 0;
    this.arousal = body.arousal; this.threshold = body.threshold;
    if (answer.recall) {
      const drive = new Float32Array(ACTIONS.length);
      for (const store of Object.values(answer.recall)) for (const part of Object.values(store)) part[0].forEach((v, i) => { drive[i] += v; });
      this.memory = drive;
    }
    this.prev = { mode: answer.refused ? "refused" : answer.mode, own: this.own, shown: this.shown };

    if (this.active && this.n) {
      if (answer.activity) decodeLevels(answer.activity, this.n, this.settled);
      if (answer.frames && answer.frames.length) {
        const frames = [];
        for (const spec of answer.frames) {
          const text = atob(spec.data), count = Math.floor(text.length / this.n);
          for (let f = 0; f < count; f++) {
            const frame = new Float32Array(this.n);
            for (let i = 0; i < this.n; i++) frame[i] = (text.charCodeAt(f * this.n + i) / 255) * 1.1 - 0.1;
            frames.push(frame);
          }
        }
        const steps = answer.frames.reduce((s, f) => s + f.steps, 0);
        const kinds = answer.frames.map(f => (f.kind === "free" ? "own answer" : answer.mode === "guided" ? "lesson" : "learning")).join(" → ");
        const learning = answer.mode !== "routine";
        // keep replaying a decision that learned; a routine one only replaces an idle replay
        if (!this.replay || learning || !this.replay.learning || this.queue.length === 0) {
          this.queue = frames; this.replay = { steps, shown: frames.length, kinds, learning, mode, at: 0 };
        }
      }
      if (!answer.frames && answer.activity && !this.queue.length) this.queue = [Float32Array.from(this.settled)];
    }
    this.dirty = true;
  }

  lessonHtml(ev) {
    const before = ev.sure !== null ? ` Before the lesson its own answer gave ${actName(ev.shown)} <b>${pct(ev.sure)}</b>.` : "";
    const after = ev.after !== null && ev.after !== undefined ? ` Right after: <b>${pct(ev.after)}</b>.` : "";
    return `📚 shown <b>${actName(ev.shown)}</b>${ev.words}${ev.times > 1 ? ` ×${ev.times}` : ""}.${before}${after}`;
  }

  event(kind, html, tone) {
    const ev = { kind, html, tone, tick: this.tick || 0, times: 1 };
    this.events.unshift(ev);
    if (this.events.length > 40) this.events.pop();
    return ev;
  }

  note(kind, value) {
    if (!this.enabled) return;
    if (kind === "sleep") {
      const held = Object.values(value || {}).reduce((s, v) => s + v, 0);
      this.event("sleep", `💤 slept on the day: ${held.toFixed(2)} of fresh memory became lasting`, "lesson");
      this.dirty = true;
    }
  }

  probe(index, result) {
    if (!this.enabled || !result || !result.qualified) return;
    const tricks = [...TRICKS, "call"];
    const p = {}; for (const t of tricks) p[t] = result.policy[A[t]];
    const list = this.probes[index];
    list.push({ tick: this.tick || 0, p, top: result.action });
    if (list.length > 60) list.shift();
    this.dirty = true;
  }

  // ---------------------------------------------------------------- drawing
  frame(now) {
    if (!this.enabled || !this.active) return;
    if (document.hidden) { this.stats.skippedHidden += 1; return; }
    if (now - this.lastDraw < 1000 / this.fps) return;
    const gap = now - this.lastDraw; this.lastDraw = now;
    this.stats.fps += 0.1 * (1000 / Math.max(1, gap) - this.stats.fps);
    const t0 = performance.now();
    if (this.n && this.visible) {
      // advance the replay: one recorded settling step per drawn frame, then the settled state
      const next = this.queue.length ? this.queue.shift() : null;
      if (next) {
        for (let i = 0; i < this.n; i++) { const dv = Math.abs(next[i] - this.act[i]); this.heat[i] = this.heat[i] * 0.72 + dv; this.act[i] = next[i]; }
        if (this.replay) this.replay.at += 1;
        this.lastStepped = true;
        this.stats.framesReplayed += 1;
      } else {
        for (let i = 0; i < this.n; i++) this.heat[i] *= 0.8;
      }
      this.drawBrain();
      if (this.details) this.drawFlow();
    }
    const t1 = performance.now();
    if (this.dirty && now - this.lastDom >= this.domEvery) { this.lastDom = now; this.dirty = false; this.updatePanels(); }
    const t2 = performance.now();
    this.stats.draws += 1;
    this.stats.drawMs += 0.1 * ((t1 - t0) - this.stats.drawMs);
    this.stats.drawMax = Math.max(this.stats.drawMax * 0.995, t1 - t0);
    this.stats.domMs += 0.1 * ((t2 - t1) - this.stats.domMs);
  }

  fit(canvas, height) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(10, Math.round(rect.width * dpr)), h = Math.round(height * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; canvas.style.height = height + "px"; }
    return dpr;
  }

  layout() {
    const rect = this.flow.getBoundingClientRect(), W = Math.max(280, rect.width);
    const narrow = W < 620;
    let H = narrow ? 430 : 270;
    const boxes = [];
    const senses = this.groups.filter(g => g.role === "sensory");
    const middle = this.groups.filter(g => g.role !== "sensory" && g !== this.motor);
    const pad = 8, labelH = 15;
    if (!narrow) {
      // columns: senses | association, working memory | motor
      const colS = [pad, W * 0.25], colM = [W * 0.31, W * 0.79], colA = [W * 0.83, W - pad];
      const total = senses.reduce((s, g) => s + Math.sqrt(g.idx.length), 0);
      let y = pad;
      for (const g of senses) {
        const h = (H - pad * 2 - senses.length * 4) * Math.sqrt(g.idx.length) / total;
        boxes.push({ g, x: colS[0], y, w: colS[1] - colS[0], h }); y += h + 4;
      }
      const mh = (H - pad * 2 - (middle.length - 1) * 10) / Math.max(1, middle.length);
      middle.forEach((g, k) => boxes.push({ g, x: colM[0], y: pad + k * (mh + 10), w: colM[1] - colM[0], h: mh }));
      if (this.motor) boxes.push({ g: this.motor, x: colA[0], y: pad, w: colA[1] - colA[0], h: H - pad * 2, motor: true });
    } else {
      // rows: senses in a 3-wide grid | the middle regions | motor as one row
      const cols = 3, sh = 52, sw = (W - pad * 2 - (cols - 1) * 6) / cols;
      senses.forEach((g, k) => boxes.push({ g, x: pad + (k % cols) * (sw + 6), y: pad + Math.floor(k / cols) * (sh + 6), w: sw, h: sh }));
      let y = pad + Math.ceil(senses.length / cols) * (sh + 6) + 12;
      const mh = 92;
      middle.forEach(g => { boxes.push({ g, x: pad, y, w: W - pad * 2, h: mh }); y += mh + 12; });
      const cell = (W - pad * 2) / Math.max(1, this.motor ? this.motor.idx.length : 1);
      if (this.motor) boxes.push({ g: this.motor, x: pad, y, w: W - pad * 2, h: 15 + cell, motor: true, row: true });
      H = Math.round(y + 15 + cell + 22);
    }
    const dpr = this.fit(this.flow, H);
    for (const b of boxes) {
      const k = b.g.idx.length, cw = b.w, ch = b.h - labelH;
      if (b.motor) { b.cols = b.row ? k : 1; b.rows = b.row ? 1 : k; }
      else { b.cols = Math.max(1, Math.round(Math.sqrt(k * cw / Math.max(4, ch)))); b.rows = Math.ceil(k / b.cols); }
      b.cell = Math.max(1, Math.min(cw / b.cols, ch / b.rows));
      b.off = document.createElement("canvas"); b.off.width = b.cols; b.off.height = b.rows;
      b.offCtx = b.off.getContext("2d"); b.img = b.offCtx.createImageData(b.cols, b.rows);
    }
    this.boxes = boxes; this.W = W; this.H = H; this.dpr = dpr; this.narrow = narrow; this.sized = true;
  }

  drawFlow() {
    if (!this.sized) this.layout();
    const ctx = this.flowCtx, dpr = this.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.W, this.H);
    ctx.imageSmoothingEnabled = false;
    const act = this.act, heat = this.heat, labelH = 15;
    const means = new Map();
    // links between the stages, lit by the change in the regions they join
    const center = b => [b.x + b.w / 2, b.y + labelH + (b.rows * b.cell) / 2];
    for (const b of this.boxes) {
      let s = 0, hsum = 0, peak = 0.02; for (const i of b.g.idx) { s += act[i]; hsum += heat[i]; peak = Math.max(peak, Math.abs(act[i])); }
      means.set(b, { a: s / b.g.idx.length, h: hsum / b.g.idx.length / peak });
    }
    const assoc = this.boxes.find(b => b.g.name === "Association hub") || this.boxes.find(b => b.g.role === "association");
    const wm = this.boxes.find(b => b.g.name === "Working memory");
    const motor = this.boxes.find(b => b.motor);
    // links run from the edge of one region's tile to the edge of the next, never across labels
    const link = (a, b) => {
      if (!a || !b) return;
      const [ax, ay] = center(a), [bx, by] = center(b);
      let x1, y1, x2, y2;
      if (this.narrow) { x1 = ax; y1 = a.y + labelH + a.rows * a.cell; x2 = bx; y2 = b.y; if (y2 < y1) { y1 = a.y; y2 = b.y + labelH + b.rows * b.cell; } }
      else if (Math.abs(ax - bx) < 4) { x1 = a.x + a.cols * a.cell; y1 = ay; x2 = b.x + b.cols * b.cell; y2 = by; }
      else { x1 = a.x + a.cols * a.cell; y1 = ay; x2 = b.x - 2; y2 = by; }
      const glow = Math.min(1, (means.get(a).h + means.get(b).h) * 4);
      ctx.strokeStyle = `rgba(255,210,122,${0.08 + 0.6 * glow})`; ctx.lineWidth = 1 + 2 * glow;
      ctx.beginPath(); ctx.moveTo(x1, y1);
      if (this.narrow) ctx.bezierCurveTo(x1, (y1 + y2) / 2, x2, (y1 + y2) / 2, x2, y2);
      else if (Math.abs(ax - bx) < 4) ctx.bezierCurveTo(x1 + 24, y1, x2 + 24, y2, x2, y2);
      else ctx.bezierCurveTo((x1 + x2) / 2, y1, (x1 + x2) / 2, y2, x2, y2);
      ctx.stroke();
    };
    for (const b of this.boxes) if (b.g.role === "sensory") link(b, assoc);
    link(assoc, wm); link(assoc, motor); link(wm, motor);
    for (const b of this.boxes) {
      const col = b.g.color || [140, 160, 255], data = b.img.data;
      // brightness is relative to this region's most active neuron (activity in a deep region
      // is a hundred times smaller than in the senses); the region's real mean is in its tag
      let peak = 0.02; for (const i of b.g.idx) peak = Math.max(peak, Math.abs(act[i]));
      data.fill(0);
      b.g.idx.forEach((i, k) => {
        const a = Math.max(0, Math.min(1, act[i] / peak)), h = Math.min(1, 2 * heat[i] / peak), o = k * 4;
        const base = 0.12 + 0.88 * a;
        data[o] = Math.min(255, col[0] * base + 255 * h);
        data[o + 1] = Math.min(255, col[1] * base + 200 * h);
        data[o + 2] = Math.min(255, col[2] * base * (1 - 0.6 * h) + 60 * h);
        data[o + 3] = 255;
      });
      b.offCtx.putImageData(b.img, 0, 0);
      const gw = b.cols * b.cell, gh = b.rows * b.cell;
      ctx.fillStyle = "#05080f"; ctx.fillRect(b.x - 1, b.y + labelH - 1, gw + 2, gh + 2);
      ctx.drawImage(b.off, b.x, b.y + labelH, gw, gh);
      const m = means.get(b);
      ctx.fillStyle = rgb(col); ctx.font = "600 11px system-ui, sans-serif"; ctx.textBaseline = "top";
      const name = (this.narrow || b.w < 140) ? (SHORT[b.g.name] || b.g.name) : b.g.name;
      ctx.fillText(`${name}`, b.x, b.y + 1);
      ctx.fillStyle = "#8ea0d8"; ctx.font = "10px system-ui, sans-serif";
      const tag = `${b.g.idx.length} · mean ${m.a < 0.1 ? m.a.toFixed(3) : m.a.toFixed(2)}`;
      const tw = ctx.measureText(tag).width;
      if (!b.motor && tw + ctx.measureText(name).width + 18 < b.w) ctx.fillText(tag, b.x + b.w - tw, b.y + 2);
      if (b.motor) this.drawMotorLabels(ctx, b);
    }
  }

  drawMotorLabels(ctx, b) {
    ctx.font = "10px system-ui, sans-serif"; ctx.textBaseline = "middle";
    const k = b.g.idx.length;
    for (let j = 0; j < k; j++) {
      const isChosen = j === this.chosen, isShown = j === this.shown;
      if (b.row) {
        if (!(isChosen || isShown)) continue;
        const x = b.x + j * b.cell + b.cell / 2, y = b.y + 15 + b.cell + 9;
        ctx.fillStyle = isShown ? "#a999ff" : "#ffd27a"; ctx.textAlign = "center";
        ctx.fillText(`▲ ${actName(j)}`, Math.min(b.x + b.w - 30, Math.max(b.x + 30, x)), y); ctx.textAlign = "left";
        ctx.strokeStyle = ctx.fillStyle; ctx.strokeRect(b.x + j * b.cell + 0.5, b.y + 15.5, b.cell - 1, b.cell - 1);
      } else {
        const y = b.y + 15 + j * b.cell + b.cell / 2, x = b.x + b.cell + 4;
        ctx.fillStyle = isShown ? "#a999ff" : isChosen ? "#ffd27a" : "#7f8ab8";
        if (b.cell >= 9) ctx.fillText((isChosen ? "▶ " : "") + actName(j), x, y);
        if (isChosen || isShown) { ctx.strokeStyle = ctx.fillStyle; ctx.strokeRect(b.x + 0.5, b.y + 15 + j * b.cell + 0.5, b.cell - 1, b.cell - 1); }
      }
    }
    ctx.textBaseline = "top";
  }

  // ---------------------------------------------------------------- the clean brain
  // A soft side view of a brain (front to the left). Each region is a pastel area whose glow is
  // its real mean activity relative to its own recent peak; inside it every dot is a neuron (or,
  // in the two 512-neuron regions, a small group of neighbouring neurons drawn as one dot that
  // shows the strongest of them). A dot sparks when its activity, relative to the region's most
  // active neuron, rises past 55% during a replayed settling step, and its glow fades over the
  // next frames. Pulses run along the main pathways in time with the replayed settling steps,
  // as bright as the change in the regions they join. Nothing moves when the brain is settled.
  brainLayout() {
    const rect = this.brain.getBoundingClientRect(), W = Math.max(260, rect.width);
    const small = W < 560;
    const bw = Math.min(W - 16, small ? W - 16 : 760), bh = bw * 0.66;
    const H = Math.round(bh + (small ? 46 : 50));
    const dpr = this.fit(this.brain, H);
    const bx = (W - bw) / 2, by = small ? 36 : 40;
    const P = (x, y) => [bx + x * bw, by + y * bh];
    const cap = small ? 120 : 220;          // dots per region at most
    this.brainBox = { W, H, bx, by, bw, bh, dpr, small, P };
    this.areas = [];
    for (const g of this.groups) {
      const spot = SPOTS[g.name]; if (!spot) continue;
      const [cx, cy] = P(spot.x, spot.y), rx = spot.rx * bw, ry = spot.ry * bh;
      const count = g.idx.length, m = Math.min(count, cap);
      const dots = new Float32Array(m * 2), from = new Int32Array(m + 1);
      for (let k = 0; k < m; k++) {
        const r = Math.sqrt((k + 0.5) / m) * 0.86, t = k * 2.399963;
        dots[k * 2] = cx + Math.cos(t) * r * rx; dots[k * 2 + 1] = cy + Math.sin(t) * r * ry;
        from[k] = Math.floor(k * count / m);
      }
      from[m] = count;
      this.areas.push({ g, spot, cx, cy, rx, ry, m, dots, from, level: new Float32Array(m), spark: new Float32Array(m), peakMean: 0.02, glow: 0, change: 0 });
    }
    this.areaOf = Object.fromEntries(this.areas.map(a => [a.spot.key, a]));
    // the silhouette is drawn once per size on its own canvas
    const bg = document.createElement("canvas"); bg.width = this.brain.width; bg.height = this.brain.height;
    const c = bg.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const blob = (pad, fill) => {
      c.fillStyle = fill; c.beginPath();
      for (const [x, y, r] of LOBES) { const [px, py] = P(x, y); c.moveTo(px + r * bh + pad, py); c.arc(px, py, r * bh + pad, 0, Math.PI * 2); }
      c.fill();
    };
    // cerebellum and stem first, tucked behind the back of the cerebrum
    const [ex, ey] = P(0.8, 0.84), [sx, sy] = P(0.64, 0.8);
    c.fillStyle = "#5a4680"; c.beginPath(); if (c.roundRect) c.roundRect(sx, sy, 0.07 * bw, 0.26 * bh, 10); else c.rect(sx, sy, 0.07 * bw, 0.26 * bh); c.fill();
    c.fillStyle = "rgba(216,200,255,.45)"; c.beginPath(); c.ellipse(ex, ey, 0.12 * bw + 2, 0.13 * bh + 2, -0.15, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#614a86"; c.beginPath(); c.ellipse(ex, ey, 0.12 * bw, 0.13 * bh, -0.15, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "rgba(233,220,255,.22)"; c.lineWidth = 1.2;
    for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(ex, ey + 0.03 * bh, 0.1 * bw, (0.03 + k * 0.022) * bh, -0.15, 0.25, Math.PI - 0.25); c.stroke(); }
    blob(6, "rgba(232,214,255,.12)");                      // soft halo
    blob(1.8, "rgba(240,230,255,.92)");                    // a slightly crisper rim
    const grad = c.createLinearGradient(bx, by, bx + bw, by + bh);
    grad.addColorStop(0, "#4a3b80"); grad.addColorStop(1, "#5d3f78");
    blob(0, grad);
    // a soft highlight, top front
    const hl = c.createRadialGradient(...P(0.3, 0.2), 0, ...P(0.3, 0.2), 0.45 * bw);
    hl.addColorStop(0, "rgba(255,255,255,.10)"); hl.addColorStop(1, "rgba(255,255,255,0)");
    c.globalCompositeOperation = "source-atop"; c.fillStyle = hl; c.fillRect(bx, by - 30, bw, bh); c.globalCompositeOperation = "source-over";
    // a few gentle folds
    c.lineCap = "round";
    for (const [dy, col] of [[0, "rgba(30,18,60,.16)"], [1.4, "rgba(233,220,255,.10)"]]) {
      c.strokeStyle = col; c.lineWidth = 2;
      for (const [x1, y1, x2, y2, x3, y3] of FOLDS) { c.beginPath(); const [ax, ay] = P(x1, y1), [bx2, by2] = P(x2, y2), [cx2, cy2] = P(x3, y3); c.moveTo(ax, ay + dy); c.quadraticCurveTo(bx2, by2 + dy, cx2, cy2 + dy); c.stroke(); }
    }
    // each region's resting pastel area
    for (const a of this.areas) {
      const g2 = c.createRadialGradient(a.cx, a.cy, 0, a.cx, a.cy, Math.max(a.rx, a.ry));
      g2.addColorStop(0, a.spot.colour + "38"); g2.addColorStop(1, a.spot.colour + "00");
      c.fillStyle = g2; c.beginPath(); c.ellipse(a.cx, a.cy, a.rx * 1.12, a.ry * 1.12, 0, 0, Math.PI * 2); c.fill();
    }
    this.brainBg = bg;
    // a soft glow sprite per region colour for sparks
    this.sprites = {};
    for (const a of this.areas) {
      const sp = document.createElement("canvas"), R = 16; sp.width = sp.height = R * 2;
      const sc = sp.getContext("2d"), rg = sc.createRadialGradient(R, R, 0, R, R, R);
      rg.addColorStop(0, "rgba(255,255,255,1)"); rg.addColorStop(0.25, a.spot.colour + "cc"); rg.addColorStop(1, a.spot.colour + "00");
      sc.fillStyle = rg; sc.fillRect(0, 0, R * 2, R * 2); this.sprites[a.spot.key] = sp;
    }
    // a small round neuron dot per colour, drawn at device resolution
    this.dotSprites = {};
    const dr = (small ? 1.9 : 2.2) * dpr, ds = Math.ceil(dr * 2 + 2);
    for (const a of this.areas) {
      const sp = document.createElement("canvas"); sp.width = sp.height = ds;
      const sc = sp.getContext("2d"), rg = sc.createRadialGradient(ds / 2, ds / 2, 0, ds / 2, ds / 2, dr);
      rg.addColorStop(0, "#ffffff"); rg.addColorStop(0.3, a.spot.colour); rg.addColorStop(small ? 0.6 : 0.8, a.spot.colour); rg.addColorStop(1, a.spot.colour + "00");
      sc.fillStyle = rg; sc.beginPath(); sc.arc(ds / 2, ds / 2, dr, 0, Math.PI * 2); sc.fill(); this.dotSprites[a.spot.key] = sp;
    }
    this.dotSize = ds / dpr;
    this.brainSized = true;
  }

  drawBrain() {
    if (!this.areas || !this.brainSized) this.brainLayout();
    const B = this.brainBox, ctx = this.brainCtx, act = this.act, heat = this.heat;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, this.brain.width, this.brain.height);
    ctx.drawImage(this.brainBg, 0, 0);
    ctx.setTransform(B.dpr, 0, 0, B.dpr, 0, 0);
    const stepped = this.lastStepped; this.lastStepped = false;
    // region levels from the real activity
    for (const a of this.areas) {
      const idx = a.g.idx; let sum = 0, peak = 0.02, ch = 0;
      for (let k = 0; k < idx.length; k++) { const v = act[idx[k]]; sum += v; if (v > peak) peak = v; ch += heat[idx[k]]; }
      const mean = sum / idx.length;
      a.peakMean = Math.max(0.02, Math.max(a.peakMean * 0.995, mean));
      a.mean = mean; a.peak = peak;
      a.glow += 0.35 * (Math.max(0, Math.min(1, mean / a.peakMean)) - a.glow);
      a.change = Math.min(1, 2 * ch / idx.length / peak);
      let firing = 0;
      for (let j = 0; j < a.m; j++) {
        let v = -1; for (let i = a.from[j]; i < a.from[j + 1]; i++) if (act[idx[i]] > v) v = act[idx[i]];
        const level = Math.max(0, Math.min(1, v / peak));
        if (stepped && level > 0.55 && level - a.level[j] > 0.08) a.spark[j] = 1;
        else a.spark[j] *= 0.8;
        if (level > 0.55) firing += 1;
        a.level[j] = level;
      }
      a.firing = firing;
    }
    // pathways and the pulses that travel them while the brain settles
    const r = this.replay, settling = r && r.at < r.shown;
    const t = settling ? (r.at % 6) / 6 : 0;
    ctx.lineCap = "round";
    for (const [from, to] of PATHS) {
      const a = this.areaOf[from], b = this.areaOf[to]; if (!a || !b) continue;
      const mx = (a.cx + b.cx) / 2, my = (a.cy + b.cy) / 2 - 0.06 * B.bh;
      ctx.strokeStyle = "rgba(233,220,255,.10)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(a.cx, a.cy); ctx.quadraticCurveTo(mx, my, b.cx, b.cy); ctx.stroke();
      const strength = Math.min(1, (a.change + b.change) * 1.5);
      if (!settling || strength < 0.04) continue;
      for (let k = 0; k < 4; k++) {
        const u = t - k * 0.05; if (u < 0) continue;
        const x = (1 - u) * (1 - u) * a.cx + 2 * (1 - u) * u * mx + u * u * b.cx, y = (1 - u) * (1 - u) * a.cy + 2 * (1 - u) * u * my + u * u * b.cy;
        ctx.globalAlpha = strength * (1 - k * 0.25);
        const sz = (k ? 6 : 9) * (B.small ? 0.8 : 1);
        ctx.drawImage(this.sprites[from], x - sz, y - sz, sz * 2, sz * 2);
      }
      ctx.globalAlpha = 1;
    }
    // region glow, neuron dots and sparks
    const dsz = this.dotSize, dh = dsz / 2;
    for (const a of this.areas) {
      const col = a.spot.colour;
      const g = ctx.createRadialGradient(a.cx, a.cy, 0, a.cx, a.cy, Math.max(a.rx, a.ry) * 1.15);
      const alpha = Math.round(16 + 90 * a.glow).toString(16).padStart(2, "0");
      g.addColorStop(0, col + alpha); g.addColorStop(1, col + "00");
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(a.cx, a.cy, a.rx * 1.15, a.ry * 1.15, 0, 0, Math.PI * 2); ctx.fill();
      if (a.change > 0.05) { ctx.strokeStyle = col; ctx.globalAlpha = Math.min(0.7, a.change); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(a.cx, a.cy, a.rx * (1.05 + 0.15 * a.change), a.ry * (1.05 + 0.15 * a.change), 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
      const dot = this.dotSprites[a.spot.key];
      for (let j = 0; j < a.m; j++) {
        ctx.globalAlpha = 0.3 + 0.7 * a.level[j];
        ctx.drawImage(dot, a.dots[j * 2] - dh, a.dots[j * 2 + 1] - dh, dsz, dsz);
      }
      const sp = this.sprites[a.spot.key];
      for (let j = 0; j < a.m; j++) {
        const s = a.spark[j]; if (s < 0.06) continue;
        const sz = (5 + 11 * s) * (B.small ? 0.8 : 1);
        ctx.globalAlpha = s; ctx.drawImage(sp, a.dots[j * 2] - sz, a.dots[j * 2 + 1] - sz, sz * 2, sz * 2);
      }
      ctx.globalAlpha = 1;
      if (a === this.selectedArea) { ctx.strokeStyle = "#fff"; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(a.cx, a.cy, a.rx * 1.2, a.ry * 1.2, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    }
    // the chosen action, beside the motor cortex: one dot per action there
    const motor = this.areaOf.motor;
    if (motor && this.chosen !== undefined && this.chosen >= 0 && this.chosen < motor.m) {
      const x = motor.dots[this.chosen * 2], y = motor.dots[this.chosen * 2 + 1];
      ctx.strokeStyle = this.shown !== null ? "#c9beff" : "#ffe08a"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.stroke();
      const p = this.policy ? this.policy[this.chosen] : null;
      const text = `🎯 ${actName(this.chosen)}${p !== null ? " " + pct(p) : ""}${this.shown !== null ? " · shown" : ""}`;
      ctx.font = `600 ${B.small ? 11 : 12}px system-ui, sans-serif`;
      const tw = ctx.measureText(text).width, px = Math.max(2, motor.cx - motor.rx - tw - 22), py = Math.max(2, motor.cy - motor.ry - (B.small ? 44 : 48));
      ctx.beginPath(); ctx.moveTo(x - 3, y - 3); ctx.lineTo(px + tw + 6, py + 18); ctx.stroke();
      this.pill(ctx, px, py, text, this.shown !== null ? "#c9beff" : "#ffe08a", "#1a1030");
    }
    // friendly labels, nudged apart where they would touch
    ctx.font = `600 ${B.small ? 10 : 11}px system-ui, sans-serif`;
    const placed = [];
    for (const a of this.areas) {
      const text = a.spot.label, w = ctx.measureText(text).width + 12;
      let x = Math.max(2, Math.min(B.W - w - 2, a.cx - w / 2));
      let y = a.spot.key === "hub" ? a.cy - a.ry + 2 : a.spot.below ? a.cy + a.ry + 4 : a.cy - a.ry - 22;
      const hits = (px, py) => placed.find(r => px < r.x + r.w + 3 && px + w + 3 > r.x && Math.abs(py - r.y) < 20);
      for (let pass = 0, r; pass < 6 && (r = hits(x, y)); pass++) {
        const nx = Math.max(2, Math.min(B.W - w - 2, x >= r.x ? r.x + r.w + 3 : r.x - w - 3));
        if (hits(nx, y) && pass > 2) y = r.y - 21; else x = nx;
      }
      placed.push({ x, y, w });
      this.pill(ctx, x, y, text, "rgba(20,14,40,.72)", a.spot.colour);
    }
    if (this.selectedArea && this.regionTick++ % 4 === 0) this.renderRegion();
  }

  pill(ctx, x, y, text, bg, fg) {
    const tw = ctx.measureText(text).width, h = 18;
    ctx.fillStyle = bg; ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, tw + 12, h, 9); else ctx.rect(x, y, tw + 12, h);
    ctx.fill(); ctx.fillStyle = fg; ctx.textBaseline = "middle"; ctx.fillText(text, x + 6, y + h / 2 + 0.5);
  }

  tapRegion(event) {
    if (!this.areas) return;
    const rect = this.brain.getBoundingClientRect(), x = event.clientX - rect.left, y = event.clientY - rect.top;
    let hit = null, best = 1.25;
    for (const a of this.areas) { const d = Math.hypot((x - a.cx) / a.rx, (y - a.cy) / a.ry); if (d < best) { best = d; hit = a; } }
    this.selectedArea = hit === this.selectedArea ? null : hit; this.regionTick = 0;
    $("bsRegion").hidden = !this.selectedArea; $("bsHint").hidden = !!this.selectedArea;
    this.regionTick = 0; if (this.selectedArea) this.renderRegion();
  }

  renderRegion() {
    const a = this.selectedArea; if (!a) return;
    const grouped = a.m < a.g.idx.length ? ` Drawn as ${a.m} dots, each the strongest of ${Math.floor(a.g.idx.length / a.m)}–${Math.ceil(a.g.idx.length / a.m)} neighbouring neurons.` : " Every dot is one neuron.";
    $("bsRegion").innerHTML = `<b style="color:${a.spot.colour}">${a.spot.label}</b> · ${a.g.name} · ${a.g.idx.length} neurons<br>` +
      `<span>${a.spot.about}</span><br><span class="fine">Activity now: mean ${a.mean !== undefined ? a.mean.toFixed(3) : "–"}, strongest ${a.peak !== undefined ? a.peak.toFixed(3) : "–"}; ` +
      `${a.firing || 0} of ${a.m} dots above 55% of the strongest.${grouped}</span>`;
  }

  renderSimple() {
    const top = $("bsTop");
    if (this.policy) {
      const order = this.policy.map((v, i) => [v, i]).sort((x, y) => y[0] - x[0]).slice(0, 3);
      top.innerHTML = order.map(([v, i]) => `<div class="bs-topa${i === this.chosen ? " chosen" : ""}"><span>${i === this.chosen ? "▶ " : ""}${actName(i)}</span><div class="track"><i style="width:${(v * 100).toFixed(0)}%"></i></div><b>${pct(v)}</b></div>`).join("");
    } else top.textContent = "waiting for the first decision";
    const lesson = this.events.find(ev => ev.kind === "lesson");
    const credit = this.events.find(ev => ev.kind === "credit" || ev.kind === "memory");
    $("bsLesson").innerHTML = lesson
      ? (lesson.sure !== null ? `📚 <b>${actName(lesson.shown)}</b>${lesson.words}: <b>${pct(lesson.sure)}</b> → <b>${lesson.after !== null && lesson.after !== undefined ? pct(lesson.after) : "…"}</b>` : lesson.html)
      : `<span class="fine">None yet. Say a word, hold a move while it rings, then press Good!</span>`;
    if (credit && lesson && credit.tick >= lesson.tick) $("bsLesson").innerHTML += `<div class="fine">${credit.html}</div>`;
  }

  // ---------------------------------------------------------------- the panels
  updatePanels() {
    const page = this.page();
    $("bsName").textContent = page.name || "Mochi";
    const [text, cls] = MODE_TEXT[this.mode] || ["starting", ""];
    const chip = $("bsMode"); chip.textContent = text; chip.className = "chip " + cls;
    $("bsCount").textContent = this.tick ? `decision ${this.tick.toLocaleString()} · ${Math.round(this.latency || 0)} ms to think · ${this.sweeps} settling sweeps` : "";
    if (this.replay) {
      const r = this.replay;
      $("bsReplay").textContent = r.at < r.shown ? `replaying ${r.shown} of the ${r.steps} settling steps of a ${r.mode} decision (${r.kinds})` : `settled · last replay: ${r.steps} steps (${r.kinds})`;
    }
    this.renderSimple();
    if (this.details) {
      if (this.obs) { this.drawSenses(); this.senseText(); }
      this.renderChoice();
      this.drawTrace();
      this.renderEvents();
      this.renderWords(page);
    }
    const s = this.stats;
    $("bsPerf").textContent = `Brain view cost: ${s.drawMs.toFixed(2)} ms per drawn frame (peak ${s.drawMax.toFixed(1)} ms), panels ${s.domMs.toFixed(2)} ms, ` +
      `drawing at ≤${this.fps} fps (now ${s.fps.toFixed(0)}). Paused while hidden.` + (this.neurons ? ` ${this.neurons.toLocaleString()} neurons, ${this.synapses.toLocaleString()} synapses.` : "");
  }

  senseText() {
    const o = this.obs, at = OFFSETS, chips = [];
    const words = WORDS.map((w, i) => [i, SOUNDS[w].reduce((s, c) => s + o[at.hearing + c], 0) / 6]).filter(([, v]) => v > 0.3);
    for (const [i, v] of words) chips.push(["ear", `hears “${this.words[i] || WORDS[i]}” ${pct(v)}`]);
    for (const token of ["whistle", "clap", "squeak", "meow", "rattle"]) { const v = SOUNDS[token].reduce((s, c) => s + o[at.hearing + c], 0) / 6; if (v > 0.5 && !words.length) chips.push(["ear", `hears a ${token}`]); }
    const hues = HUE_NAMES.map((name, h) => { let s = 0; for (let k = 0; k < 16; k++) s += o[at["vision.hue"] + h * 16 + k]; return [name, s]; }).filter(([, s]) => s > 0.6).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (hues.length) chips.push(["eye", `sees ${hues.map(h => h[0]).join(", ")}`]);
    if (Math.max(...o.slice(at["vision.motion"], at["vision.motion"] + 8)) > 0.15) chips.push(["eye", "sees something moving"]);
    if (Math.max(...o.slice(at["vision.hand"], at["vision.hand"] + 16)) > 0.15) chips.push(["eye", o[at["vision.hand"] + 16] > 0.5 ? "your hand is over it" : "sees your hand"]);
    if (Math.max(...o.slice(at.smell, at.smell + 8)) > 0.2) chips.push(["nose", "smells food"]);
    if (o[at.mouth] > 0.5) chips.push(["nose", "food at its mouth"]); if (o[at.mouth + 1] > 0.5) chips.push(["nose", "water at its mouth"]);
    if (o[at.mouth + 2] > 0.2) chips.push(["nose", "tastes good"]); if (o[at.mouth + 3] > 0.2) chips.push(["nose", "tastes bad"]);
    const touch = ["being stroked", "booped", "held", "wall ↑", "wall →", "wall ↓", "wall ←", "touching a toy", "on the soft bed", "in warm sun"];
    touch.forEach((name, k) => { if (o[at.touch + k] > 0.3) chips.push(["skin", name]); });
    NEEDS.forEach((need, k) => { const lvl = o[at.needs + k * 3] + o[at.needs + k * 3 + 1] + o[at.needs + k * 3 + 2]; if (lvl >= 1.5) chips.push(["need", `${need} ${lvl >= 2.5 ? "!!" : "!"}`]); });
    chips.push(["need", o[at.light] > o[at.light + 1] ? "daytime" : "night"]);
    const host = $("bsSenseText");
    host.replaceChildren(...chips.map(([k, t]) => el("span", "bs-chip bs-k-" + k, t)));
  }

  drawSenses() {
    const c = this.sensesCanvas, rowH = 17, H = SENSE_ROWS.length * rowH + 4;
    const dpr = this.fit(c, H), W = c.width / dpr, ctx = c.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const labelW = Math.min(110, W * 0.34), o = this.obs;
    ctx.font = "10px system-ui, sans-serif"; ctx.textBaseline = "middle";
    SENSE_ROWS.forEach(([label, key, size], r) => {
      const y = 2 + r * rowH, cw = (W - labelW - 4) / size;
      ctx.fillStyle = "#9fb2ff"; ctx.fillText(label, 0, y + rowH / 2);
      for (let k = 0; k < size; k++) {
        const v = Math.max(0, Math.min(1, o[OFFSETS[key] + k]));
        let colour = [110, 231, 216];
        if (key === "hearing") { const wi = WORDS.findIndex(w => SOUNDS[w].includes(k)); colour = wi >= 0 ? [[110, 231, 216], [169, 153, 255], [255, 210, 122], [255, 143, 177]][wi] : [143, 211, 255]; }
        if (key === "vision.hue") colour = [[255, 90, 90], [255, 160, 70], [255, 230, 90], [110, 220, 120], [90, 150, 255], [190, 110, 255]][Math.floor(k / 16)];
        ctx.fillStyle = `rgba(${colour[0]},${colour[1]},${colour[2]},${0.08 + 0.92 * v})`;
        ctx.fillRect(labelW + k * cw, y + 2, Math.max(1, cw - (cw > 3 ? 1 : 0)), rowH - 5);
      }
    });
  }

  renderChoice() {
    const host = $("bsChoice");
    if (!this.policy) { host.textContent = "waiting for the first decision"; return; }
    const p = this.policy, q = this.prevPolicy, mem = this.memory;
    const order = p.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).map(x => x[1]);
    const pick = order.slice(0, 6);
    for (const extra of [this.chosen, this.shown]) if (extra !== null && extra >= 0 && !pick.includes(extra)) pick.push(extra);
    const memMax = mem ? Math.max(1e-6, ...Array.from(mem, Math.abs)) : 1;
    host.replaceChildren(...pick.map(i => {
      const row = el("div", "bs-act" + (i === this.chosen ? " chosen" : "") + (i === this.shown ? " shown" : ""));
      const dv = q ? p[i] - q[i] : 0;
      const m = mem ? mem[i] : null;
      row.innerHTML = `<span class="n"></span><div class="track"><i style="width:${(p[i] * 100).toFixed(1)}%"></i></div>` +
        `<b class="d ${dv > 0.005 ? "up" : dv < -0.005 ? "down" : ""}">${Math.abs(dv) < 0.005 ? "·" : (dv > 0 ? "▲" : "▼") + Math.round(Math.abs(dv) * 100)}</b>` +
        `<div class="track mem">${m === null ? "" : `<i style="left:${m >= 0 ? 50 : 50 - Math.abs(m) / memMax * 50}%;width:${Math.abs(m) / memMax * 50}%" class="${m >= 0 ? "p" : "n"}"></i>`}</div>`;
      row.firstChild.textContent = (i === this.chosen ? "▶ " : "") + actName(i) + (i === this.shown ? " (shown)" : "");
      row.title = `${actName(i)}: ${(p[i] * 100).toFixed(1)}% now` + (q ? `, ${signed((p[i] - q[i]) * 100, 1)} points since the last decision` : "") + (m !== null ? `; memory drive ${signed(m, 3)}` : "");
      return row;
    }));
    const v = this.value;
    $("bsValue").textContent = (v !== undefined && v !== null ? `The critic expects ${signed(v)} from here on. ` : "") +
      `Arousal ${(this.arousal || 0).toFixed(2)} (learns above ${(this.threshold || 0).toFixed(2)}).` +
      (this.chosen >= 0 && this.own >= 0 && this.chosen !== this.own ? ` Its own answer was ${actName(this.own)}; the body was moved through ${actName(this.chosen)}.` : "");
  }

  drawTrace() {
    const c = this.traceCanvas, H = 70, dpr = this.fit(c, H), W = c.width / dpr, ctx = c.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#05080f"; ctx.fillRect(0, 0, W, H);
    const n = 160, bw = W / n, mid = (H - 8) / 2;
    const colours = { routine: "#2c6f68", aroused: "#b8913f", guided: "#7466c4", asleep: "#3e4c94", refused: "#a3463f" };
    ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(W, mid); ctx.stroke();
    this.trace.forEach((t, k) => {
      const x = (n - this.trace.length + k) * bw;
      ctx.fillStyle = colours[t.mode] || "#2c6f68"; ctx.fillRect(x, H - 6, Math.max(1, bw - 0.5), 6);
      if (t.reward) { ctx.fillStyle = t.reward > 0 ? "rgba(63,208,138,.85)" : "rgba(255,125,114,.85)"; const h = Math.min(1, Math.abs(t.reward)) * mid; ctx.fillRect(x, t.reward > 0 ? mid - h : mid, Math.max(1, bw - 0.5), h); }
    });
    ctx.strokeStyle = "#ffd27a"; ctx.lineWidth = 1.5; ctx.beginPath(); let started = false;
    this.trace.forEach((t, k) => {
      if (t.dopamine === null) return;
      const x = (n - this.trace.length + k) * bw + bw / 2, y = mid - Math.max(-1, Math.min(1, t.dopamine)) * mid;
      if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      ctx.fillStyle = "#ffd27a"; ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    });
    ctx.stroke();
  }

  renderEvents() {
    const host = $("bsEvents");
    if (!this.events.length) { host.innerHTML = `<li class="fine">Nothing learned yet this visit. Say a word, show a move, or press Good!</li>`; return; }
    host.innerHTML = this.events.slice(0, 7).map(ev => `<li class="${ev.tone || ""}"><span class="t">#${ev.tick}</span> ${ev.html}</li>`).join("");
  }

  renderWords(page) {
    const tricks = [...TRICKS, "call"];
    this.wordRows.forEach((row, i) => {
      const label = (page.words && page.words[i] && page.words[i].label) || WORDS[i];
      row.label.textContent = `🗣 ${i + 1} “${label}”`;
      const list = this.probes[i];
      const c = row.canvas, H = 34, dpr = this.fit(c, H), W = c.width / dpr, ctx = c.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#05080f"; ctx.fillRect(0, 0, W, H);
      if (list.length) {
        for (const t of tricks) {
          ctx.strokeStyle = TRICK_COLOURS[t]; ctx.lineWidth = 1.4; ctx.beginPath();
          list.forEach((s, k) => { const x = list.length === 1 ? W - 2 : (k / (list.length - 1)) * (W - 4) + 2, y = H - 2 - s.p[t] * (H - 4); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
          ctx.stroke();
        }
        const lastP = list[list.length - 1].p, best = tricks.reduce((a, b) => (lastP[b] > lastP[a] ? b : a));
        const first = list[0].p[best];
        row.answer.innerHTML = `<span style="color:${TRICK_COLOURS[best]}">${best}</span> ${pct(lastP[best])}` + (list.length > 1 ? ` <span class="fine" title="change since the first of the last ${list.length} probes">(${signed((lastP[best] - first) * 100, 0)})</span>` : "");
      } else row.answer.innerHTML = `<span class="fine">not probed yet</span>`;
    });
  }
}
