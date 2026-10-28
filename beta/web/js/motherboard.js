// The Motherboard: the learn room's coach. It never moves Mochi, never teaches, never rewards:
// the owner teaches with Show and Good! in the learn room. Twice a day (dawn, after the night's
// sleep, and dusk) it tests each word in private imagination ("probe": nothing is lived or learned)
// and keeps a skills card per word: how often Mochi would answer the word's trick when it hears
// the word, against silence and against the other words, and whether that survived the night.
export const COACHED = 3;                       // words 1..3: sit, spin, hop
export const DEFAULT_TRICKS = ["sit", "spin", "jump"];
const DAILY_LESSONS = 8;                       // past this, the coach says sleep on it
export const TOO_NEEDY = 0.8;                  // hunger or thirst above this: no lessons, feed first
export const tooNeedy = needs => !!needs && (needs.hunger > TOO_NEEDY || needs.thirst > TOO_NEEDY);

export class Motherboard {
  constructor(saved) {
    const s = saved && saved.schema === "motherboard/1" ? saved : null;
    this.words = [];
    for (let i = 0; i < COACHED; i++) {
      const w = s && s.words[i];
      this.words.push({ trick: (w && w.trick) || DEFAULT_TRICKS[i], shown: (w && w.shown) || {}, lessons: (w && w.lessons) || {}, tests: (w && w.tests) || [] });
    }
    this.done = (s && s.done) || {};           // "day:dawn" -> true
  }
  snapshot() { return JSON.parse(JSON.stringify({ schema: "motherboard/1", words: this.words, done: this.done })); }

  // the owner held Show for `trick` while word i rang (in the learn room): one lesson
  lesson(i, trick, day) {
    const w = this.words[i]; if (!w) return;
    w.shown[trick] = (w.shown[trick] || 0) + 1;
    w.trick = Object.entries(w.shown).sort((a, b) => b[1] - a[1])[0][0];    // the trick shown most with this word
    w.lessons[day] = (w.lessons[day] || 0) + 1;
  }
  // which test is due now, if any: dawn once Mochi is up after the night, dusk before dark
  due(world) {
    if (world.m.asleep) return null;
    const tod = world.tod(), day = world.day;
    if (tod > 0.06 && tod < 0.4 && !this.done[`${day}:dawn`]) return "dawn";
    if (tod > 0.6 && tod < 0.7 && !this.done[`${day}:dusk`]) return "dusk";
    return null;
  }
  // results[i] = {word, silence, others} for each word's trick, from probes; room is where it ran
  record(when, world, results) {
    this.done[`${world.day}:${when}`] = true;
    results.forEach((r, i) => {
      if (!r) return;
      const tests = this.words[i].tests;
      tests.push({ day: world.day, when, room: world.room, word: +r.word.toFixed(2), silence: +r.silence.toFixed(2), others: +r.others.toFixed(2) });
      if (tests.length > 24) tests.shift();
    });
    const keys = Object.keys(this.done); if (keys.length > 40) delete this.done[keys[0]];
  }
  // did the word survive the last night? the dawn test against the dusk test before it
  retained(i) {
    const t = this.words[i].tests, k = t.map(x => x.when).lastIndexOf("dawn");
    if (k < 1 || t[k - 1].when !== "dusk") return null;
    const dawn = t[k], dusk = t[k - 1];
    if (dusk.word - dusk.silence < 0.2) return null;          // nothing learned yet to remember
    return dawn.word >= 0.7 * dusk.word && dawn.word - dawn.silence >= 0.2;
  }
  last(i) { const t = this.words[i].tests; return t.length ? t[t.length - 1] : null; }
  // the coach's line: only from counted lessons and the tests above
  line(labels, day, needs, room) {
    if (tooNeedy(needs)) return room === "learn" ? "Mochi is hungry or thirsty. No lessons now: carry it home to the bowl." : "Mochi is hungry or thirsty. Feed first, then lessons.";
    const name = i => `“${labels[i] || "word " + (i + 1)}”`;
    for (let i = 0; i < COACHED; i++) if ((this.words[i].lessons[day] || 0) >= DAILY_LESSONS) return `That's plenty of ${name(i)} today. Let Mochi sleep on it.`;
    for (let i = 0; i < COACHED; i++) { const t = this.last(i); if (t && t.silence > 0.4) return `Mochi offers ${this.words[i].trick} without ${name(i)}. Rest that word; teach another.`; }
    for (let i = 0; i < COACHED; i++) { const t = this.last(i); if (t && t.word > 0.3 && t.others > 0.6 * t.word) return `${name(i)} and another word blur together. Teach them on different days.`; }
    for (let i = 0; i < COACHED; i++) if (this.retained(i)) return `${name(i)} survived the night ✓`;
    if (!this.words.some(w => w.tests.length)) return "I'm the Motherboard. Say a word, hold Show while it rings, then Good! I test at dawn and dusk.";
    return "Say a word, hold Show while it rings, then Good! Short lessons, then sleep.";
  }
}
