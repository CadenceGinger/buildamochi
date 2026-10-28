// Doorway check: does a raised brain, living on its own, walk between the home and the garden?
// Usage: node sim/rooms.mjs --life web/brains/mochi-0.89.0-a/basic.life --days 1 --seeds 3
import { join } from "node:path";
import { BrainProcess, ROOT, args, round } from "./brain_proc.mjs";
import { makeCreature, live } from "./harness.mjs";
import { TICK } from "../web/js/world.js";
import { sense } from "../web/js/senses.js";
import { A, SPEC } from "../web/js/spec.js";
const o = args({ life: "web/brains/mochi-0.89.0-a/basic.life", days: 1, seeds: 3, seed: 100, owner: "yes" });
for (let s = 0; s < o.seeds; s++) {
  const seed = o.seed + s, c = makeCreature(seed, { owner: o.owner === "yes", scatter: false }), w = c.world;
  const brain = new BrainProcess();
  await brain.call({ op: "boot", spec: SPEC, path: join(ROOT, o.life) });
  const ticks = Math.round(o.days * w.daySeconds / TICK);
  const edge = {}; let crossings = [], garden = 0, eastWall = 0, bumps = 0, eaten = 0, start = Date.now();
  for (let t = 0; t < ticks; t++) {
    if (c.owner) c.owner.step(w);
    c.mother.act(w);
    sense(w, c.observation);
    const wake = c.arousal.update(c.outcome, w.novelty(), w.m.needs);
    const a = await brain.call({ op: "tick", obs: [round(c.observation)], reward: [c.outcome.reward], salience: [Math.abs(c.outcome.reward) + c.outcome.emphasis], aroused: wake });
    const room = w.room;
    live(c, a.refused ? A.rest : a.action[0]);
    if (w.room !== room) crossings.push({ tick: t, to: w.room, clock: w.clock() });
    if (w.room === "garden") garden++;
    if (w.m.x > 850) eastWall++;
    if (w.m.x > 880 || w.m.x < 80 || w.m.y < 80 || w.m.y > 520) { const k = (w.m.x > 880 ? "E" : w.m.x < 80 ? "W" : w.m.y < 80 ? "N" : "S") + Math.floor((w.m.x > 880 || w.m.x < 80 ? w.m.y : w.m.x) / 100); edge[k] = (edge[k] || 0) + 1; }
  }
  brain.close();
  console.log(JSON.stringify({ seed, ticks, worldSeconds: Math.round(ticks * TICK), crossings: crossings.length, list: crossings.slice(0, 12), gardenShare: +(garden / ticks).toFixed(3), eastShare: +(eastWall / ticks).toFixed(3), events: c.events, edge, secs: (Date.now() - start) / 1000 }));
}
