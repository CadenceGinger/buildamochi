// The room, Mochi's body and its needs. One implementation serves the page and the headless
// harness: fixed 1/60 s steps, its own random stream, no clock and no DOM. The world supplies
// problems (needs that rise, food that runs out, things that move) and one reward channel
// that carries relief and suffering. It never supplies an answer.

import { A, MOVES, SOUNDS } from "./spec.js";

export const DT = 1 / 60;
export const TICK_STEPS = 9;               // one decision every 0.15 s of world time
export const TICK = DT * TICK_STEPS;
export const ROOM = { w: 960, h: 600, wall: 28 };

const S = Math.SQRT1_2;
export const DIRS = [[0, -1], [S, -S], [1, 0], [S, S], [0, 1], [-S, S], [-1, 0], [-S, -S]];

// Body constants. Each is a gene of the body with this value as its founder and control.
export const BODY = {
  radius: 26, speed: 150, accel: 0.12,
  hunger: 1 / 200, thirst: 1 / 230, fatigue: 1 / 330, boredom: 1 / 75, lonely: 1 / 240,
  nightFatigue: 2.5,                        // sleep pressure in the dark
  meal: 0.36, sip: 0.40,                    // need relieved by one portion, one unit of water
  eatSeconds: 1.05, treatSeconds: 0.45,
  sleepOnset: 1.2, bedRecovery: 1 / 45, floorRecovery: 1 / 90,
  reach: 66,                                // pounce reach, centre to centre
  view: 420, near: 150,                     // sight: far limit and the near band
  smell: 260,                               // distance at which an odour is at half strength
  callEcho: 2.0, callRelief: 0.08,          // how long its own call lingers, and what calling relieves
  sated: 0.12,                              // below this need, food and water pay nothing
};

// The single reward channel, per event or per second. Relief scales with the need it relieves.
export const REWARD = {
  meal: 0.6, sip: 0.5, treat: 0.35, bitter: -0.6,
  sleep: 0.08, sun: 0.015, stroke: 0.25,
  pounce: 0.3, kick: 0.06, catch: 0.3,
  bump: -0.04, scold: -0.6, clap: -0.05, call: -0.004, starving: -0.03,
  praise: 0.8,
};

// How much an outcome stands out, added to the size of its reward: what the associative
// store consolidates fastest.
export const EMPHASIS = { praise: 4, scold: 4, bitter: 4, treat: 1 };

export const FURNITURE = {
  bed: { x: 150, y: 140, r: 56, hue: 285 },
  bowl: { x: 810, y: 130, r: 26, hue: 35 },
  water: { x: 830, y: 480, r: 24, hue: 215 },
  box: { x: 130, y: 480, r: 40, hue: 130 },
};
// The garden has its own layout. Food, water and the bed exist only at home; the garden has a
// hedge den of toys (green, the toy-box hue), a big open sun lawn, and two landmarks of its own
// built from hue blends no home object uses: chartreuse plant beds (between yellow and green)
// and a teal-leaved tree (between green and blue, mostly green). Bowl orange, water blue, bed
// purple and toy red/magenta never appear in the garden's furniture.
export const GARDEN = {
  den: { x: 760, y: 150, r: 44, hue: 130 },
  plants: { x: 470, y: 470, r: 46, hue: 95 },
  ferns: { x: 300, y: 130, r: 36, hue: 95 },
  tree: { x: 800, y: 430, r: 52, hue: 165 },
  water: { x: 140, y: 560 - 40, r: 22, hue: 215 },   // a small dish by the door: drinks only, no food
};
export const GARDEN_SUN = { from: [360, 260], to: [600, 320], rx: 110, ry: 74 };
export const gardenFurniture = () => { const g = JSON.parse(JSON.stringify(GARDEN)); g.water.level = WATER_UNITS; return g; };
// A doorway: the gap in the home's east wall opens onto the garden's west wall. Both rooms share
// ROOM's size and each has its own coordinate frame.
export const DOOR = { y: 460, half: 75 };
export const ROOMS = ["home", "garden", "learn"];
// The learn room, east of the garden through a second doorway: a quiet lesson mat, a water dish
// and the Motherboard, the coach panel on the north wall. No food, no toys turn up here, so the
// room brings no novelty and no reward of its own: only the owner's Show and Good! teach.
const LEARN = {
  mat: { x: 520, y: 340, r: 70, hue: 280 },
  motherboard: { x: 520, y: 70, r: 40, hue: 190 },
  water: { x: 820, y: 520, r: 22, hue: 215 },
};
export const learnFurniture = () => { const l = JSON.parse(JSON.stringify(LEARN)); l.water.level = WATER_UNITS; return l; };
export const BOWL_PORTIONS = 3;
export const WATER_UNITS = 4;
export const SUN = { from: [330, 200], to: [640, 400], rx: 74, ry: 50, hue: 60 };
export const TOY_KINDS = {
  ball: { r: 14, drag: 0.9, bounce: 0.8, hue: 0, sat: 1 },
  mouse: { r: 12, drag: 2.2, bounce: 0.4, hue: 0, sat: 0.55 },
  wand: { r: 10, drag: 5.0, bounce: 0.2, hue: 330, sat: 0.9 },
};
export const FLAVORS = {
  cookie: { hue: 35, taste: "sweet" },
  fish: { hue: 215, taste: "savoury" },
  lemon: { hue: 60, taste: "bitter" },
};

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const clamp01 = v => clamp(v, 0, 1);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export class World {
  constructor({ seed = 1, daySeconds = 360, tod = 0.05, autoCare = true } = {}) {
    this.rngState = (seed >>> 0) || 1;
    this.t = 0;
    this.daySeconds = daySeconds;
    this.tod0 = tod;
    this.day = 0;
    this.autoCare = autoCare;
    this.furniture = JSON.parse(JSON.stringify(FURNITURE));
    this.furniture.bowl.food = BOWL_PORTIONS;
    this.furniture.water.level = WATER_UNITS;
    this.toys = [];
    this.foods = [];
    this.room = "home";
    this.away = { furniture: gardenFurniture(), toys: [], foods: [] };
    // three rooms in a row, home | garden | learn: `away` is always home or the garden (whichever is
    // not here, the garden when Mochi is in the learn room), `annex` is the third room
    this.annex = { furniture: learnFurniture(), toys: [], foods: [] };
    this.doorCd = 0;
    this.stockGarden();
    this.hand = { present: false, x: 480, y: 300, petting: false, holding: null };
    this.sounds = {};
    this.events = [];
    this.nextId = 1;
    this.m = {
      x: this.furniture.bed.x, y: this.furniture.bed.y, vx: 0, vy: 0, heading: Math.PI / 2,
      action: A.rest, actionT: 0, pose: "stand",
      asleep: false, lieT: 0, held: false, eatT: 0, pounceCd: 0, callCd: 0, bumpCd: 0,
      needs: { hunger: 0.3, thirst: 0.25, fatigue: 0.1, boredom: 0.2, lonely: 0.2 },
      touch: { stroke: 0, boop: 0, toy: 0, wallN: 0, wallE: 0, wallS: 0, wallW: 0 },
      taste: { good: 0, bad: 0 },
      rewardAcc: 0, painAcc: 0, socialAcc: 0, emphasisAcc: 0,
    };
  }

  // ---------------------------------------------------------------- time
  random() {                                 // mulberry32
    let z = (this.rngState = (this.rngState + 0x6D2B79F5) >>> 0);
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  }
  uniform(lo, hi) { return lo + (hi - lo) * this.random(); }
  tod() { return (this.tod0 + this.t / this.daySeconds) % 1; }
  light(tod = this.tod()) {
    if (tod < 0.04) return tod / 0.04;
    if (tod < 0.70) return 1;
    if (tod < 0.76) return 1 - (tod - 0.70) / 0.06;
    return 0;
  }
  clock() {
    const hours = (6 + this.tod() * 24) % 24;
    const h = Math.floor(hours), min = Math.floor((hours - h) * 60);
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }
  sun() {
    const tod = this.tod(), light = this.light(tod);
    const f = clamp01((tod - 0.04) / 0.66);
    if (this.room === "garden") {
      const g = GARDEN_SUN;
      return { on: light > 0.5, x: g.from[0] + (g.to[0] - g.from[0]) * f, y: g.from[1] + (g.to[1] - g.from[1]) * f, rx: g.rx, ry: g.ry };
    }
    return {
      on: light > 0.5,
      x: SUN.from[0] + (SUN.to[0] - SUN.from[0]) * f,
      y: SUN.from[1] + (SUN.to[1] - SUN.from[1]) * f,
      rx: SUN.rx, ry: SUN.ry,
    };
  }
  onSun(sun = this.sun()) {
    if (!sun.on) return false;
    const dx = (this.m.x - sun.x) / sun.rx, dy = (this.m.y - sun.y) / sun.ry;
    return dx * dx + dy * dy < 1;
  }
  onBed() { const bed = this.furniture.bed; return !!bed && dist(this.m, bed) < bed.r; }
  // Each morning a ball and a mouse turn up by the garden's hedge den if the garden has none:
  // things to discover out there. Nothing moves Mochi; it only finds them if it goes.
  stockGarden() {
    const store = this.store("garden"), den = store.furniture.den;
    if (!den || store.toys.some(t => t.kind !== "wand")) return;
    for (const [kind, dx, dy] of [["ball", -90, 60], ["mouse", -40, 110]]) {
      const b = TOY_KINDS[kind];
      store.toys.push({ id: this.nextId++, kind, x: den.x + dx, y: den.y + dy, vx: 0, vy: 0, r: b.r, drag: b.drag, bounce: b.bounce,
        hue: b.hue, sat: b.sat, charge: 0, heading: 0, squeakT: 0, contactCd: 0, inHand: false, seen: 0 });
    }
  }
  // Home's furniture, wherever Mochi is: the bowl and water dish live only there.
  homeFurniture() { return this.store("home").furniture; }
  // A room's store wherever Mochi is: the live room is the world itself.
  store(name) {
    if (name === this.room) return this;
    if (name === "learn" || (this.room === "learn" && name === "home")) return this.annex;
    return this.away;
  }

  // ---------------------------------------------------------------- the body's interface
  setAction(action) {
    const m = this.m;
    if (action === m.action) return;
    m.action = action;
    m.actionT = 0;
    if (action >= A.sit) this.events.push({ type: "trick", name: ["sit", "spin", "jump", "paw"][action - A.sit] });
  }
  // Reward, pain and social stimulation since the last call; the brain's outcome of its last action.
  takeOutcome() {
    const m = this.m;
    const out = { reward: clamp(m.rewardAcc, -1, 1), pain: m.painAcc, social: m.socialAcc, emphasis: m.emphasisAcc };
    m.rewardAcc = 0; m.painAcc = 0; m.socialAcc = 0; m.emphasisAcc = 0;
    return out;
  }
  sound(token, level = 1) {
    if (!(token in SOUNDS)) throw new Error(`unknown sound ${token}`);
    this.sounds[token] = Math.max(this.sounds[token] || 0, level);
  }

  // ---------------------------------------------------------------- the player's interface
  moveHand(x, y, present = true) {
    this.hand.x = clamp(x, 0, ROOM.w); this.hand.y = clamp(y, 0, ROOM.h);
    this.hand.present = present;
    if (!present) { this.hand.petting = false; if (this.m.held) this.putDown(); }
  }
  handOver() { return this.hand.present && dist(this.hand, this.m) < BODY.radius + 20; }
  setPetting(on) { this.hand.petting = Boolean(on) && this.hand.present; }
  praise() {
    const m = this.m;
    m.rewardAcc += REWARD.praise; m.socialAcc += 1; m.emphasisAcc += EMPHASIS.praise;
    m.touch.stroke = Math.max(m.touch.stroke, 0.6);
    m.needs.lonely = Math.max(0, m.needs.lonely - 0.1);
    this.events.push({ type: "praise" });
  }
  scold() {
    const m = this.m;
    m.rewardAcc += REWARD.scold; m.painAcc += 0.6; m.socialAcc += 1; m.emphasisAcc += EMPHASIS.scold;
    m.touch.boop = 1;
    this.wake("scold");
    this.events.push({ type: "scold" });
  }
  // A word or a whistle is only a sound: what it leads to decides whether it matters.
  say(word) { this.sound(word); this.events.push({ type: "say", word }); }
  whistle() { this.sound("whistle"); this.events.push({ type: "whistle" }); }
  clap() {
    this.sound("clap");
    this.m.rewardAcc += REWARD.clap; this.m.painAcc += 0.15; this.m.socialAcc += 0.4;
    this.wake("clap");
    this.events.push({ type: "clap" });
  }
  pickUp() {
    if (!this.handOver()) return false;
    this.m.held = true; this.m.vx = this.m.vy = 0;
    this.wake("lifted");
    this.events.push({ type: "lifted" });
    return true;
  }
  putDown() {
    if (!this.m.held) return;
    this.m.held = false;
    this.events.push({ type: "set down" });
  }
  fillBowl() { this.homeFurniture().bowl.food = BOWL_PORTIONS; this.sound("rattle"); this.events.push({ type: "bowl filled" }); }
  fillWater() { for (const f of [this.furniture, this.away.furniture, this.annex.furniture]) if (f.water) f.water.level = WATER_UNITS; this.events.push({ type: "water filled" }); }
  dropTreat(x, y, flavor = "cookie") {
    const lo = ROOM.wall + 8;
    const food = { id: this.nextId++, x: clamp(x, lo, ROOM.w - lo), y: clamp(y, lo, ROOM.h - lo), r: 9, flavor, seen: 0 };
    this.foods.push(food);
    this.events.push({ type: "treat", flavor });
    return food;
  }
  holdTreat(flavor = "cookie") { this.hand.holding = { kind: "treat", flavor }; }
  holdNothing() {
    const held = this.hand.holding;
    if (held && held.kind === "toy") { const toy = this.toy(held.id); if (toy) toy.inHand = false; }
    this.hand.holding = null;
  }
  spawnToy(kind, x, y, options = {}) {
    const base = TOY_KINDS[kind];
    if (!base) throw new Error(`unknown toy ${kind}`);
    const lo = ROOM.wall + base.r;
    const toy = {
      id: this.nextId++, kind, x: clamp(x, lo, ROOM.w - lo), y: clamp(y, lo, ROOM.h - lo), vx: 0, vy: 0,
      r: base.r, drag: base.drag, bounce: base.bounce, hue: options.hue ?? base.hue, sat: options.sat ?? base.sat,
      charge: 0, heading: this.uniform(0, 2 * Math.PI), squeakT: 0, contactCd: 0, inHand: false, seen: 0,
    };
    this.toys.push(toy);
    this.events.push({ type: "toy", kind });
    return toy;
  }
  toy(id) { return this.toys.find(toy => toy.id === id); }
  removeToy(id) { this.toys = this.toys.filter(toy => toy.id !== id); }
  grabToy(id) {
    const toy = this.toy(id);
    if (!toy) return;
    this.holdNothing();
    toy.inHand = true; toy.charge = 0;
    this.hand.holding = { kind: "toy", id };
  }
  releaseToy(vx = 0, vy = 0) {
    const held = this.hand.holding;
    if (!held || held.kind !== "toy") return;
    const toy = this.toy(held.id);
    this.hand.holding = null;
    if (!toy) return;
    toy.inHand = false;
    const speed = Math.hypot(vx, vy), cap = 900;
    const k = speed > cap ? cap / speed : 1;
    toy.vx = vx * k; toy.vy = vy * k;
    if (toy.kind === "mouse") toy.charge = 8;
  }
  windMouse(id) { const toy = this.toy(id); if (toy && toy.kind === "mouse") toy.charge = 8; }
  moveFurniture(name, x, y) {
    const item = this.furniture[name];
    if (!item) throw new Error(`unknown furniture ${name}`);
    const lo = ROOM.wall + item.r;
    item.x = clamp(x, lo, ROOM.w - lo); item.y = clamp(y, lo, ROOM.h - lo);
  }
  wake(cause) {
    const m = this.m;
    if (m.asleep) this.events.push({ type: "woke", cause });
    m.asleep = false; m.lieT = 0;
  }

  // ---------------------------------------------------------------- food and water at the mouth
  foodSources() {
    const out = [];
    const bowl = this.furniture.bowl;
    if (bowl && bowl.food > 1e-6) out.push({ type: "bowl", x: bowl.x, y: bowl.y, r: bowl.r, taste: "savoury", strength: 1 });
    for (const food of this.foods) {
      out.push({ type: "treat", x: food.x, y: food.y, r: food.r, taste: FLAVORS[food.flavor].taste, strength: 0.8, food });
    }
    const held = this.hand.holding;
    if (this.hand.present && held && held.kind === "treat") {
      out.push({ type: "hand", x: this.hand.x, y: this.hand.y, r: 12, taste: FLAVORS[held.flavor].taste, strength: 0.8, flavor: held.flavor });
    }
    return out;
  }
  mouthSource() {
    const m = this.m;
    const reach = source => dist(m, source) < BODY.radius + source.r + 10;
    let best = null, bestGap = Infinity;
    for (const source of this.foodSources()) {
      if (source.type === "bowl" || !reach(source)) continue;
      const gap = dist(m, source);
      if (gap < bestGap) { best = source; bestGap = gap; }
    }
    if (best) return best;
    const bowl = this.furniture.bowl, water = this.furniture.water;
    const atBowl = !!bowl && bowl.food > 1e-6 && reach(bowl);
    const atWater = !!water && water.level > 1e-6 && reach(water);
    if (atBowl && atWater) return m.needs.hunger >= m.needs.thirst ? { type: "bowl" } : { type: "water" };
    if (atBowl) return { type: "bowl" };
    if (atWater) return { type: "water" };
    return null;
  }

  // ---------------------------------------------------------------- one physics step
  step() {
    const m = this.m, n = m.needs, dt = DT;
    const before = this.tod();
    this.t += dt;
    const tod = this.tod(), light = this.light(tod);
    if (tod < before) {                       // dawn
      this.day += 1;
      this.events.push({ type: "dawn", day: this.day });
      if (this.autoCare) { const f = this.homeFurniture(); f.bowl.food = BOWL_PORTIONS; this.fillWater(); this.sound("rattle", 0.7); }
      this.stockGarden();
    }

    // needs rise on their own clocks
    const awake = !m.asleep, slow = awake ? 1 : 0.5, idle = awake ? 1 : 0.15;
    const speedFrac = Math.hypot(m.vx, m.vy) / BODY.speed;
    n.hunger = clamp01(n.hunger + dt * BODY.hunger * slow);
    n.thirst = clamp01(n.thirst + dt * BODY.thirst * slow);
    if (awake) n.fatigue = clamp01(n.fatigue + dt * BODY.fatigue * (1 + 0.6 * speedFrac) * (1 + (BODY.nightFatigue - 1) * (1 - light)));
    n.boredom = clamp01(n.boredom + dt * BODY.boredom * idle);
    n.lonely = clamp01(n.lonely + dt * BODY.lonely * idle);
    if (n.hunger > 0.9 || n.thirst > 0.9) m.rewardAcc += dt * REWARD.starving;

    // the action's effect
    m.actionT += dt;
    m.pounceCd = Math.max(0, m.pounceCd - dt);
    m.callCd = Math.max(0, m.callCd - dt);
    m.bumpCd = Math.max(0, m.bumpCd - dt);
    let wantX = 0, wantY = 0;
    const action = m.held ? A.rest : m.action;
    if (action !== A.sleep && (m.asleep || m.lieT > 0)) this.wake("rose");
    if (action !== A.eat) m.eatT = 0;
    m.pose = m.held ? "held" : "stand";
    if (m.held) {
      m.x = clamp(this.hand.x, ROOM.wall + BODY.radius, ROOM.w - ROOM.wall - BODY.radius);
      m.y = clamp(this.hand.y, ROOM.wall + BODY.radius, ROOM.h - ROOM.wall - BODY.radius);
      m.vx = m.vy = 0;
      // carried through a doorway: the owner can bring Mochi to the next room (the hand comes along)
      this.doorCd = Math.max(0, this.doorCd - dt);
      if (Math.abs(this.hand.y - DOOR.y) < DOOR.half && this.doorCd <= 0) {
        const lo = ROOM.wall + BODY.radius;
        if (this.room !== "learn" && this.hand.x > ROOM.w - ROOM.wall) { this.crossDoor(lo + 2, "east"); this.hand.x = m.x; this.doorCd = 1.5; }
        else if (this.room !== "home" && this.hand.x < ROOM.wall) { this.crossDoor(ROOM.w - lo - 2, "west"); this.hand.x = m.x; this.doorCd = 1.5; }
      }
    } else if (action >= 1 && action <= MOVES) {
      wantX = DIRS[action - 1][0] * BODY.speed; wantY = DIRS[action - 1][1] * BODY.speed;
      m.pose = "walk";
    } else if (action === A.eat) this.consume(dt);
    else if (action === A.sleep) this.lie(dt, light);
    else if (action === A.pounce) this.pounce();
    else if (action === A.call) this.callOut();
    else if (action === A.sit) m.pose = "sit";
    else if (action === A.spin) m.pose = "spin";
    else if (action === A.jump) m.pose = "jump";
    else if (action === A.paw) m.pose = "paw";

    // movement and walls
    if (!m.held) {
      const rate = 1 - Math.exp(-dt / BODY.accel);
      m.vx += (wantX - m.vx) * rate; m.vy += (wantY - m.vy) * rate;
      m.x += m.vx * dt; m.y += m.vy * dt;
      const lo = ROOM.wall + BODY.radius, hiX = ROOM.w - lo, hiY = ROOM.h - lo;
      let hit = 0;
      // the doorway: no wall there, and walking right through it lands in the other room
      const inDoor = Math.abs(m.y - DOOR.y) < DOOR.half - BODY.radius * 0.5;
      const doorE = this.room !== "learn" && inDoor, doorW = this.room !== "home" && inDoor;
      this.doorCd = Math.max(0, this.doorCd - dt);
      if (doorE && m.x >= hiX && m.vx > 0 && this.doorCd <= 0) this.crossDoor(lo + 2, "east");
      else if (doorW && m.x <= lo && m.vx < 0 && this.doorCd <= 0) this.crossDoor(hiX - 2, "west");
      if (m.x < lo && !(doorW && this.doorCd <= 0)) { hit = Math.max(hit, -m.vx); m.x = lo; m.vx = 0; m.touch.wallW = 1; }
      if (m.x > hiX && !(doorE && this.doorCd <= 0)) { hit = Math.max(hit, m.vx); m.x = hiX; m.vx = 0; m.touch.wallE = 1; }
      if ((doorE || doorW) && (m.x < lo || m.x > hiX)) m.y = clamp(m.y, DOOR.y - DOOR.half + BODY.radius * 0.5, DOOR.y + DOOR.half - BODY.radius * 0.5);
      if (m.y < lo) { hit = Math.max(hit, -m.vy); m.y = lo; m.vy = 0; m.touch.wallN = 1; }
      if (m.y > hiY) { hit = Math.max(hit, m.vy); m.y = hiY; m.vy = 0; m.touch.wallS = 1; }
      if (hit > 40 && m.bumpCd <= 0) {
        m.bumpCd = 0.5; m.rewardAcc += REWARD.bump; m.painAcc += 0.05;
        this.events.push({ type: "bump" });
      }
      if (Math.hypot(m.vx, m.vy) > 15) m.heading = Math.atan2(m.vy, m.vx);
    }

    this.stepToys(dt);

    // the hand: company, strokes, a warm lap
    const hand = this.hand;
    if (hand.present && awake && dist(hand, m) < 130) n.lonely = Math.max(0, n.lonely - dt * 0.03);
    if (hand.petting && this.handOver()) {
      m.touch.stroke = 1;
      m.rewardAcc += dt * REWARD.stroke * (0.3 + 0.7 * clamp01(n.lonely / 0.3));
      m.socialAcc += dt * 2;
      n.lonely = Math.max(0, n.lonely - dt * 0.3);
      n.boredom = Math.max(0, n.boredom - dt * 0.05);
    }
    if (awake && this.onSun() && (action === A.rest || action === A.sit)) m.rewardAcc += dt * REWARD.sun;

    // what fades
    const fade = tau => Math.exp(-dt / tau);
    m.touch.stroke *= fade(0.4); m.touch.boop *= fade(0.3); m.touch.toy *= fade(0.3);
    for (const side of ["wallN", "wallE", "wallS", "wallW"]) m.touch[side] *= fade(0.15);
    m.taste.good *= fade(0.5); m.taste.bad *= fade(0.8);
    for (const token of Object.keys(this.sounds)) {
      this.sounds[token] *= fade(token === "meow" ? BODY.callEcho : 0.5);   // its own call rings on in its ears
      if (this.sounds[token] < 0.02) delete this.sounds[token];
    }

    // familiarity of what is in view: the body's habituation to objects
    if (awake) {
      for (const item of this.toys) if (dist(item, m) < BODY.view) item.seen += dt;
      for (const item of this.foods) if (dist(item, m) < BODY.view) item.seen += dt;
    }
  }

  consume(dt) {
    const m = this.m, n = m.needs;
    const source = this.mouthSource();
    if (!source) { m.pose = "sniff"; m.eatT = 0; return; }
    if (source.type === "water") {
      m.pose = "drink";
      const water = this.furniture.water;
      const amount = Math.min(dt / BODY.eatSeconds, water.level);
      const want = clamp01((n.thirst - BODY.sated) / 0.3);     // water is worth nothing to the sated
      if (m.eatT === 0) this.events.push({ type: "drink" });
      water.level -= amount;
      n.thirst = Math.max(0, n.thirst - BODY.sip * amount);
      m.rewardAcc += REWARD.sip * amount * want;
      m.eatT += dt;
      return;
    }
    m.pose = "eat";
    if (source.type === "bowl") {
      const bowl = this.furniture.bowl;
      const amount = Math.min(dt / BODY.eatSeconds, bowl.food);
      const want = clamp01((n.hunger - BODY.sated) / 0.3);
      if (m.eatT === 0) this.events.push({ type: "eat", what: "kibble" });
      bowl.food -= amount;
      n.hunger = Math.max(0, n.hunger - BODY.meal * amount);
      m.rewardAcc += REWARD.meal * amount * want;
      m.taste.good = Math.max(m.taste.good, 0.5 * want);
      m.eatT += dt;
      return;
    }
    m.eatT += dt;
    if (m.eatT < BODY.treatSeconds) return;
    m.eatT = 0;
    const flavor = source.type === "hand" ? source.flavor : source.food.flavor;
    const taste = FLAVORS[flavor].taste;
    if (source.type === "hand") this.hand.holding = null;
    else this.foods = this.foods.filter(food => food !== source.food);
    if (taste === "bitter") {
      m.rewardAcc += REWARD.bitter; m.painAcc += 0.4; m.taste.bad = 1; m.emphasisAcc += EMPHASIS.bitter;
      n.hunger = Math.max(0, n.hunger - 0.04);
    } else {
      const want = clamp01(n.hunger / 0.3);
      m.rewardAcc += REWARD.treat + 0.2 * want; m.taste.good = 1; m.emphasisAcc += EMPHASIS.treat;
      n.hunger = Math.max(0, n.hunger - (taste === "savoury" ? 0.15 : 0.08));
    }
    this.events.push({ type: "eat", what: flavor, taste, fromHand: source.type === "hand" });
  }

  lie(dt, light) {
    const m = this.m, n = m.needs;
    m.pose = "lie";
    m.lieT += dt;
    if (!m.asleep && m.lieT > BODY.sleepOnset && (n.fatigue > 0.25 || light < 0.4)) {
      m.asleep = true;
      this.events.push({ type: "asleep", onBed: this.onBed() });
    }
    if (!m.asleep) return;
    const onBed = this.onBed();
    const tired = clamp01(n.fatigue / 0.3);
    n.fatigue = Math.max(0, n.fatigue - dt * (onBed ? BODY.bedRecovery : BODY.floorRecovery));
    m.rewardAcc += dt * REWARD.sleep * tired * (onBed ? 1 : 0.35);
  }

  pounce() {
    const m = this.m;
    m.pose = "pounce";
    if (m.pounceCd > 0) return;
    m.pounceCd = 0.45;
    let target = null, gap = BODY.reach;
    for (const toy of this.toys) {
      if (toy.inHand && toy.kind !== "wand") continue;
      const d = dist(m, toy);
      if (d < gap) { target = toy; gap = d; }
    }
    if (!target) { this.events.push({ type: "pounce", hit: false }); return; }
    const d = Math.max(1e-6, gap);
    const ux = (target.x - m.x) / d, uy = (target.y - m.y) / d;
    if (!target.inHand) { target.vx = ux * 430; target.vy = uy * 430; }
    if (target.kind === "mouse") target.charge = 0;
    m.heading = Math.atan2(uy, ux);
    this.play("pounce");
    this.events.push({ type: "pounce", hit: true, toy: target.kind });
  }

  callOut() {
    const m = this.m;
    m.pose = "call";
    if (m.callCd > 0) return;
    m.callCd = 1.2;
    this.sound("meow");
    m.rewardAcc += REWARD.call;
    m.needs.lonely = Math.max(0, m.needs.lonely - BODY.callRelief);     // calling eases the wait a little
    this.events.push({ type: "call" });
  }

  play(kind) {
    const m = this.m, n = m.needs;
    const want = clamp(n.boredom / 0.4, 0.15, 1);
    m.rewardAcc += REWARD[kind] * want;
    n.boredom = Math.max(0, n.boredom - { pounce: 0.08, kick: 0.03, catch: 0.14 }[kind]);
  }

  stepToys(dt) {
    const m = this.m, hand = this.hand;
    for (const toy of this.toys) {
      toy.contactCd = Math.max(0, toy.contactCd - dt);
      if (toy.kind === "wand") {
        if (!hand.present) { toy.vx *= Math.exp(-toy.drag * dt); toy.vy *= Math.exp(-toy.drag * dt); }
        else {                                // a feather on a string: it lags the hand
          // the laser dot (community addition) is the same toy held tighter, right under the pointer
          const k = toy.laser ? 160 : 60, damp = toy.laser ? 22 : 9, off = toy.laser ? 0 : 26;
          toy.vx += ((hand.x - toy.x) * k - toy.vx * damp) * dt;
          toy.vy += ((hand.y + off - toy.y) * k - toy.vy * damp) * dt;
        }
      } else if (toy.inHand) {
        toy.vx = (hand.x - toy.x) / dt * 0.25; toy.vy = (hand.y - toy.y) / dt * 0.25;
        toy.x = hand.x; toy.y = hand.y;
        continue;
      } else if (toy.kind === "mouse" && toy.charge > 0) {
        toy.heading += this.uniform(-4, 4) * dt;
        toy.vx = 105 * Math.cos(toy.heading); toy.vy = 105 * Math.sin(toy.heading);
        toy.charge = Math.max(0, toy.charge - dt);
        toy.squeakT -= dt;
        if (toy.squeakT <= 0) { toy.squeakT = 1.4; this.sound("squeak", 0.8); }
      } else {
        const drag = Math.exp(-toy.drag * dt);
        toy.vx *= drag; toy.vy *= drag;
      }
      toy.x += toy.vx * dt; toy.y += toy.vy * dt;
      const lo = ROOM.wall + toy.r, hiX = ROOM.w - lo, hiY = ROOM.h - lo;
      if (toy.x < lo) { toy.x = lo; toy.vx = Math.abs(toy.vx) * toy.bounce; toy.heading = Math.PI - toy.heading; }
      if (toy.x > hiX) { toy.x = hiX; toy.vx = -Math.abs(toy.vx) * toy.bounce; toy.heading = Math.PI - toy.heading; }
      if (toy.y < lo) { toy.y = lo; toy.vy = Math.abs(toy.vy) * toy.bounce; toy.heading = -toy.heading; }
      if (toy.y > hiY) { toy.y = hiY; toy.vy = -Math.abs(toy.vy) * toy.bounce; toy.heading = -toy.heading; }
      if (m.held) continue;
      const d = dist(m, toy), reach = BODY.radius + toy.r;
      if (d >= reach || d < 1e-6) continue;
      const ux = (toy.x - m.x) / d, uy = (toy.y - m.y) / d;
      m.touch.toy = 1;
      const closing = (m.vx - toy.vx) * ux + (m.vy - toy.vy) * uy;
      if (toy.kind !== "wand") { toy.x = m.x + ux * reach; toy.y = m.y + uy * reach; }
      if (toy.kind === "mouse" && toy.charge > 0) {
        toy.charge = 0; toy.vx = toy.vy = 0;
        if (!m.asleep) { this.play("catch"); this.events.push({ type: "caught", toy: "mouse" }); }
      } else if (toy.kind === "wand") {
        if (toy.contactCd <= 0 && !m.asleep && Math.hypot(toy.vx, toy.vy) > 30) {
          toy.contactCd = 0.7; this.play("catch"); this.events.push({ type: "caught", toy: "wand" });
        }
      } else if (closing > 50) {
        toy.vx += ux * (closing * 1.2 + 40); toy.vy += uy * (closing * 1.2 + 40);
        if (toy.contactCd <= 0 && !m.asleep) { toy.contactCd = 0.5; this.play("kick"); this.events.push({ type: "kick", toy: toy.kind }); }
      }
    }
  }

  // The newest thing in view, 1 for never seen, fading as the body gets used to it.
  novelty() {
    if (this.m.asleep) return 0;
    let best = 0;
    for (const item of [...this.toys, ...this.foods]) {
      if (dist(item, this.m) < BODY.view) best = Math.max(best, Math.exp(-item.seen / 12));
    }
    return best;
  }

  // Swap rooms: what Mochi carries (a held toy, the wand or laser on the hand) comes along.
  crossDoor(x, way = this.room === "home" ? "east" : "west") {
    const m = this.m, from = this.room;
    const comes = toy => toy.kind === "wand" || toy.inHand;
    const carried = this.toys.filter(comes);
    const here = { furniture: this.furniture, toys: this.toys.filter(t => !comes(t)), foods: this.foods };
    const to = ROOMS[ROOMS.indexOf(from) + (way === "east" ? 1 : -1)];
    if (!to) return;
    const next = this.store(to);
    if (from === "garden" && to === "learn") { const home = this.away; this.away = here; this.annex = home; }
    else if (from === "learn") { this.away = this.annex; this.annex = here; }
    else this.away = here;                                    // home <-> garden, as before
    this.furniture = next.furniture; this.toys = next.toys.concat(carried); this.foods = next.foods;
    this.room = to;
    m.x = x; this.doorCd = 1.0;
    this.events.push({ type: "room", from, to: this.room });
  }

  // ---------------------------------------------------------------- saving
  snapshot() {
    return JSON.parse(JSON.stringify({
      schema: "mochi-world/1", rngState: this.rngState, t: this.t, daySeconds: this.daySeconds,
      tod0: this.tod0, day: this.day, autoCare: this.autoCare, furniture: this.furniture, room: this.room, away: this.away, annex: this.annex,
      toys: this.toys, foods: this.foods, sounds: this.sounds, nextId: this.nextId, m: this.m,
    }));
  }
  static restore(saved) {
    if (!saved || saved.schema !== "mochi-world/1") throw new Error("not a mochi-world/1 snapshot");
    const world = new World();
    const copy = JSON.parse(JSON.stringify(saved));
    for (const key of ["rngState", "t", "daySeconds", "tod0", "day", "autoCare", "furniture", "toys", "foods", "sounds", "nextId", "m"]) {
      world[key] = copy[key];
    }
    if (copy.room && copy.away) { world.room = copy.room; world.away = copy.away; for (const t of world.away.toys) t.inHand = false; }
    // older saves had a copy of home in the garden: give it the garden's own layout (its toys stay)
    if (copy.annex) { world.annex = copy.annex; for (const t of world.annex.toys) t.inHand = false; }   // saves from before the learn room get a fresh one
    const gardenStore = world.store("garden");
    if (gardenStore.furniture.bowl || gardenStore.furniture.bed || !gardenStore.furniture.den) {
      gardenStore.furniture = gardenFurniture(); gardenStore.foods = [];
    }
    if (!gardenStore.furniture.water) gardenStore.furniture.water = gardenFurniture().water;   // saves from before the garden dish
    for (const toy of world.toys) toy.inHand = false;
    world.m.held = false;
    return world;
  }
}
